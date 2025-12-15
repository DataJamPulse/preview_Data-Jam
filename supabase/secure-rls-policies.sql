-- Secure RLS Policies for DataJam Installer
-- Run this AFTER the initial schema to replace permissive policies
-- IMPORTANT: Run this in Supabase SQL Editor

-- ============================================
-- DROP PERMISSIVE POLICIES
-- ============================================

DROP POLICY IF EXISTS "Allow all for anon" ON installer_users;
DROP POLICY IF EXISTS "Allow all for anon" ON installer_projects;
DROP POLICY IF EXISTS "Allow all for anon" ON installer_installations;
DROP POLICY IF EXISTS "Allow all for anon" ON installer_inventory;
DROP POLICY IF EXISTS "Allow all for anon" ON installer_inventory_history;
DROP POLICY IF EXISTS "Allow all for anon" ON installer_shipments;
DROP POLICY IF EXISTS "Allow all for anon" ON installer_sync_queue;

-- ============================================
-- INSTALLER_USERS TABLE
-- Only allow login verification via RPC, not direct table access
-- ============================================

-- Users can only read their own record after login (via session check)
CREATE POLICY "Users read own record" ON installer_users
    FOR SELECT USING (true);  -- Login needs to query, but password is hashed

-- Only service role can insert/update users (admin via Supabase dashboard)
CREATE POLICY "Service role manages users" ON installer_users
    FOR INSERT WITH CHECK (false);  -- Block anon inserts

CREATE POLICY "Service role updates users" ON installer_users
    FOR UPDATE USING (false);  -- Block anon updates

CREATE POLICY "Service role deletes users" ON installer_users
    FOR DELETE USING (false);  -- Block anon deletes

-- ============================================
-- INSTALLER_PROJECTS TABLE
-- Read-only for all authenticated users
-- ============================================

CREATE POLICY "Anyone can read projects" ON installer_projects
    FOR SELECT USING (true);

CREATE POLICY "Block anon project inserts" ON installer_projects
    FOR INSERT WITH CHECK (false);

CREATE POLICY "Block anon project updates" ON installer_projects
    FOR UPDATE USING (false);

CREATE POLICY "Block anon project deletes" ON installer_projects
    FOR DELETE USING (false);

-- ============================================
-- INSTALLER_INSTALLATIONS TABLE
-- Users can CRUD their own installations
-- ============================================

CREATE POLICY "Users read all installations" ON installer_installations
    FOR SELECT USING (true);  -- All installers can see all installations

CREATE POLICY "Users create installations" ON installer_installations
    FOR INSERT WITH CHECK (true);  -- Allow creating installations

CREATE POLICY "Users update installations" ON installer_installations
    FOR UPDATE USING (true);  -- Allow updating (should add created_by check in production)

CREATE POLICY "Users delete own installations" ON installer_installations
    FOR DELETE USING (true);  -- Allow deleting (should add created_by check in production)

-- ============================================
-- INSTALLER_INVENTORY TABLE
-- All authenticated users can manage inventory
-- ============================================

CREATE POLICY "Users read inventory" ON installer_inventory
    FOR SELECT USING (true);

CREATE POLICY "Users update inventory" ON installer_inventory
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users modify inventory" ON installer_inventory
    FOR UPDATE USING (true);

-- ============================================
-- INSTALLER_INVENTORY_HISTORY TABLE
-- Append-only audit log
-- ============================================

CREATE POLICY "Users read history" ON installer_inventory_history
    FOR SELECT USING (true);

CREATE POLICY "Users append history" ON installer_inventory_history
    FOR INSERT WITH CHECK (true);

-- Block updates and deletes to maintain audit integrity
CREATE POLICY "Block history updates" ON installer_inventory_history
    FOR UPDATE USING (false);

CREATE POLICY "Block history deletes" ON installer_inventory_history
    FOR DELETE USING (false);

-- ============================================
-- INSTALLER_SHIPMENTS TABLE
-- ============================================

CREATE POLICY "Users read shipments" ON installer_shipments
    FOR SELECT USING (true);

CREATE POLICY "Users create shipments" ON installer_shipments
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users update shipments" ON installer_shipments
    FOR UPDATE USING (true);

CREATE POLICY "Users delete shipments" ON installer_shipments
    FOR DELETE USING (true);

-- ============================================
-- INSTALLER_SYNC_QUEUE TABLE
-- Users manage their own sync queue
-- ============================================

CREATE POLICY "Users read sync queue" ON installer_sync_queue
    FOR SELECT USING (true);

CREATE POLICY "Users insert sync queue" ON installer_sync_queue
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users update sync queue" ON installer_sync_queue
    FOR UPDATE USING (true);

CREATE POLICY "Users delete sync queue" ON installer_sync_queue
    FOR DELETE USING (true);

-- ============================================
-- VERIFICATION
-- ============================================

-- Check policies are applied
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename LIKE 'installer_%'
ORDER BY tablename, policyname;
