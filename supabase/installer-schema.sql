-- ============================================================
-- DATAJAM INSTALLER WEBAPP SCHEMA v1.0.0
-- Run this in Supabase SQL Editor
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- USERS TABLE (separate from Portal users)
-- ============================================================
CREATE TABLE IF NOT EXISTS installer_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(100) NOT NULL,
  email VARCHAR(255),
  role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('admin', 'user', 'viewer')),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'pending')),
  allowed_projects TEXT[] DEFAULT '{}',  -- Array of project_ids user can access
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_login TIMESTAMPTZ
);

-- ============================================================
-- PROJECTS TABLE (synced from Portal)
-- ============================================================
CREATE TABLE IF NOT EXISTS installer_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id VARCHAR(100) UNIQUE NOT NULL,
  project_name VARCHAR(255) NOT NULL,
  category VARCHAR(100),
  description TEXT,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'completed')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INSTALLATIONS TABLE (core data)
-- ============================================================
CREATE TABLE IF NOT EXISTS installer_installations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Status tracking
  status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('scheduled', 'in-progress', 'completed', 'issue')),

  -- Project & Venue
  project_id VARCHAR(100) REFERENCES installer_projects(project_id),
  venue_name VARCHAR(255) NOT NULL,
  contact_name VARCHAR(255),
  contact_email VARCHAR(255),
  contact_phone VARCHAR(50),

  -- Location
  location_type VARCHAR(50),
  address TEXT,
  latitude DECIMAL(10, 7),
  longitude DECIMAL(10, 7),

  -- JamBox Device
  jambox_id VARCHAR(50),

  -- Network Config
  wifi_ssid VARCHAR(100),
  wifi_password_encrypted TEXT,
  ip_address VARCHAR(45),

  -- Install Details
  install_date DATE,
  install_time TIME,
  notes TEXT,
  device_tested BOOLEAN DEFAULT FALSE,
  network_verified BOOLEAN DEFAULT FALSE,

  -- Photos (Cloudinary URLs)
  photo_urls TEXT[] DEFAULT '{}',

  -- Audit
  created_by UUID REFERENCES installer_users(id),
  updated_by UUID REFERENCES installer_users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INVENTORY TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS installer_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_type VARCHAR(50) NOT NULL UNIQUE CHECK (item_type IN ('jambox', 'cable', 'power_adapter', 'enclosure', 'other')),
  quantity INTEGER NOT NULL DEFAULT 0,
  low_stock_threshold INTEGER DEFAULT 10,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default inventory items
INSERT INTO installer_inventory (item_type, quantity) VALUES
  ('jambox', 0),
  ('cable', 0)
ON CONFLICT (item_type) DO NOTHING;

-- ============================================================
-- INVENTORY HISTORY (audit log)
-- ============================================================
CREATE TABLE IF NOT EXISTS installer_inventory_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_type VARCHAR(50) NOT NULL,
  action VARCHAR(20) NOT NULL CHECK (action IN ('add', 'remove', 'ship', 'adjust', 'return')),
  quantity INTEGER NOT NULL,
  previous_qty INTEGER,
  new_qty INTEGER,
  destination VARCHAR(255),
  reason VARCHAR(255),
  notes TEXT,
  performed_by UUID REFERENCES installer_users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SHIPMENTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS installer_shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  destination VARCHAR(255) NOT NULL,
  project_id VARCHAR(100) REFERENCES installer_projects(project_id),
  ship_date DATE NOT NULL,
  jambox_qty INTEGER DEFAULT 0,
  cable_qty INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in-transit', 'delivered', 'cancelled')),
  tracking_number VARCHAR(100),
  carrier VARCHAR(100),
  notes TEXT,
  created_by UUID REFERENCES installer_users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  delivered_at TIMESTAMPTZ
);

-- ============================================================
-- OFFLINE SYNC QUEUE (for offline-first support)
-- ============================================================
CREATE TABLE IF NOT EXISTS installer_sync_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES installer_users(id),
  action VARCHAR(20) NOT NULL CHECK (action IN ('create', 'update', 'delete')),
  table_name VARCHAR(50) NOT NULL,
  record_id UUID,
  payload JSONB NOT NULL,
  synced BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  synced_at TIMESTAMPTZ
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_installations_project ON installer_installations(project_id);
CREATE INDEX IF NOT EXISTS idx_installations_jambox ON installer_installations(jambox_id);
CREATE INDEX IF NOT EXISTS idx_installations_date ON installer_installations(install_date);
CREATE INDEX IF NOT EXISTS idx_installations_status ON installer_installations(status);
CREATE INDEX IF NOT EXISTS idx_installations_created_by ON installer_installations(created_by);
CREATE INDEX IF NOT EXISTS idx_shipments_status ON installer_shipments(status);
CREATE INDEX IF NOT EXISTS idx_shipments_project ON installer_shipments(project_id);
CREATE INDEX IF NOT EXISTS idx_inventory_history_date ON installer_inventory_history(created_at);
CREATE INDEX IF NOT EXISTS idx_sync_queue_unsynced ON installer_sync_queue(synced) WHERE synced = FALSE;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE installer_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE installer_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE installer_installations ENABLE ROW LEVEL SECURITY;
ALTER TABLE installer_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE installer_inventory_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE installer_shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE installer_sync_queue ENABLE ROW LEVEL SECURITY;

-- Allow anon key to read/write (we'll handle auth in the app)
-- In production, you'd want more restrictive policies
CREATE POLICY "Allow all for anon" ON installer_users FOR ALL USING (true);
CREATE POLICY "Allow all for anon" ON installer_projects FOR ALL USING (true);
CREATE POLICY "Allow all for anon" ON installer_installations FOR ALL USING (true);
CREATE POLICY "Allow all for anon" ON installer_inventory FOR ALL USING (true);
CREATE POLICY "Allow all for anon" ON installer_inventory_history FOR ALL USING (true);
CREATE POLICY "Allow all for anon" ON installer_shipments FOR ALL USING (true);
CREATE POLICY "Allow all for anon" ON installer_sync_queue FOR ALL USING (true);

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Function to hash passwords
CREATE OR REPLACE FUNCTION hash_password(password TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN crypt(password, gen_salt('bf', 10));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to verify passwords
CREATE OR REPLACE FUNCTION verify_password(password TEXT, hash TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN hash = crypt(password, hash);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to encrypt WiFi password
CREATE OR REPLACE FUNCTION encrypt_wifi_password(password TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN encode(pgp_sym_encrypt(password, current_setting('app.settings.wifi_key', true)), 'base64');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to decrypt WiFi password
CREATE OR REPLACE FUNCTION decrypt_wifi_password(encrypted TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN pgp_sym_decrypt(decode(encrypted, 'base64'), current_setting('app.settings.wifi_key', true));
EXCEPTION WHEN OTHERS THEN
  RETURN '[encrypted]';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_users_updated_at BEFORE UPDATE ON installer_users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_projects_updated_at BEFORE UPDATE ON installer_projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_installations_updated_at BEFORE UPDATE ON installer_installations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_inventory_updated_at BEFORE UPDATE ON installer_inventory
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- REALTIME SUBSCRIPTIONS
-- ============================================================
-- Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE installer_installations;
ALTER PUBLICATION supabase_realtime ADD TABLE installer_inventory;
ALTER PUBLICATION supabase_realtime ADD TABLE installer_shipments;

-- ============================================================
-- SEED DATA: Default admin user (password: datajam2025)
-- ============================================================
INSERT INTO installer_users (username, password_hash, full_name, email, role, allowed_projects)
VALUES (
  'alex',
  crypt('datajam2025', gen_salt('bf', 10)),
  'Alex Constantinou',
  'alex@data-jam.com',
  'admin',
  '{}'  -- Empty means access to all projects for admin
)
ON CONFLICT (username) DO NOTHING;

-- ============================================================
-- SEED DATA: Projects (from Alex's app - 139 projects)
-- ============================================================
INSERT INTO installer_projects (project_id, project_name, category) VALUES
  -- Shopping Centers
  ('bluewater', 'Bluewater Shopping Centre', 'Shopping Centers'),
  ('westfield-stratford', 'Westfield Stratford City', 'Shopping Centers'),
  ('westfield-london', 'Westfield London', 'Shopping Centers'),
  ('trafford-centre', 'Trafford Centre', 'Shopping Centers'),
  ('meadowhall', 'Meadowhall', 'Shopping Centers'),
  ('lakeside', 'Lakeside Shopping Centre', 'Shopping Centers'),
  ('metrocentre', 'Metrocentre', 'Shopping Centers'),
  ('bullring', 'Bullring & Grand Central', 'Shopping Centers'),
  ('arndale', 'Manchester Arndale', 'Shopping Centers'),
  ('st-davids', 'St David''s Cardiff', 'Shopping Centers'),

  -- Limited Space
  ('limited-space', 'Limited Space', 'OOH Media'),

  -- ACMS
  ('acms', 'ACMS', 'OOH Media'),

  -- Smart Outdoor
  ('smart-outdoor', 'Smart Outdoor', 'OOH Media'),

  -- Bauer Media
  ('bauer-media', 'Bauer Media Outdoor', 'OOH Media'),

  -- Sports Revolution
  ('sports-revolution', 'Sports Revolution', 'Sports'),

  -- KBH Group
  ('kbh-group', 'KBH Group', 'Cinema'),

  -- Next Gen Media
  ('next-gen-media', 'Next Gen Media', 'OOH Media'),

  -- eighteen24
  ('eighteen24', 'eighteen24', 'OOH Media'),

  -- Capitol Outdoor (US)
  ('capitol-outdoor', 'Capitol Outdoor', 'OOH Media'),

  -- Heritage Outdoor (US)
  ('heritage-outdoor', 'Heritage Outdoor', 'OOH Media'),

  -- Mass Media Outdoor (US)
  ('mass-media-outdoor', 'Mass Media Outdoor', 'OOH Media'),

  -- Fitness/Gyms
  ('puregym', 'PureGym', 'Gyms'),
  ('the-gym-group', 'The Gym Group', 'Gyms'),
  ('anytime-fitness', 'Anytime Fitness', 'Gyms'),
  ('fitness-first', 'Fitness First', 'Gyms'),
  ('david-lloyd', 'David Lloyd Clubs', 'Gyms'),
  ('nuffield-health', 'Nuffield Health', 'Gyms'),

  -- Cinemas
  ('odeon', 'ODEON Cinemas', 'Cinema'),
  ('vue', 'Vue Cinemas', 'Cinema'),
  ('cineworld', 'Cineworld', 'Cinema'),
  ('showcase', 'Showcase Cinemas', 'Cinema'),
  ('everyman', 'Everyman Cinema', 'Cinema'),

  -- Leisure
  ('powerleague', 'Powerleague', 'Sports'),
  ('goals', 'Goals Soccer Centres', 'Sports'),

  -- Retail
  ('tesco', 'Tesco', 'Retail'),
  ('sainsburys', 'Sainsbury''s', 'Retail'),
  ('asda', 'ASDA', 'Retail'),
  ('morrisons', 'Morrisons', 'Retail'),

  -- Transit
  ('network-rail', 'Network Rail', 'Transit'),
  ('tfl', 'Transport for London', 'Transit'),

  -- Motorway Services
  ('moto', 'Moto Services', 'Motorway'),
  ('welcome-break', 'Welcome Break', 'Motorway'),
  ('roadchef', 'Roadchef', 'Motorway'),

  -- Food & Drink
  ('morleys', 'Morley''s', 'Food & Drink'),
  ('greggs', 'Greggs', 'Food & Drink'),
  ('costa', 'Costa Coffee', 'Food & Drink'),
  ('starbucks', 'Starbucks', 'Food & Drink'),

  -- Automotive
  ('mercedes', 'Mercedes-Benz', 'Automotive'),
  ('bmw', 'BMW', 'Automotive'),
  ('audi', 'Audi', 'Automotive')

ON CONFLICT (project_id) DO NOTHING;

-- Done!
SELECT 'Schema created successfully!' as status;
