/**
 * DataJam Installer - Supabase Client
 * Handles all database operations with offline support
 */

// Import Supabase from CDN (loaded in HTML)
// <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>

class SupabaseClient {
  constructor() {
    this.client = null;
    this.isOnline = navigator.onLine;
    this.syncQueue = [];
    this.initialized = false;

    // Listen for online/offline events
    window.addEventListener('online', () => this.handleOnline());
    window.addEventListener('offline', () => this.handleOffline());
  }

  async init() {
    if (this.initialized) return;

    // Initialize Supabase client
    this.client = supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);

    // Load sync queue from IndexedDB
    await this.loadSyncQueue();

    // Subscribe to realtime updates
    this.setupRealtimeSubscriptions();

    this.initialized = true;
    console.log('[Supabase] Client initialized');

    // Sync any pending changes
    if (this.isOnline) {
      await this.processSyncQueue();
    }
  }

  handleOnline() {
    console.log('[Supabase] Back online - syncing...');
    this.isOnline = true;
    this.processSyncQueue();
  }

  handleOffline() {
    console.log('[Supabase] Went offline - queuing changes');
    this.isOnline = false;
  }

  // ========================================
  // AUTHENTICATION
  // ========================================

  async login(username, password) {
    try {
      const { data, error } = await this.client
        .from('installer_users')
        .select('*')
        .eq('username', username)
        .single();

      if (error || !data) {
        return { success: false, error: 'Invalid username or password' };
      }

      // Verify password using database function
      const { data: verified, error: verifyError } = await this.client
        .rpc('verify_password', { password: password, hash: data.password_hash });

      if (verifyError || !verified) {
        return { success: false, error: 'Invalid username or password' };
      }

      // Update last login
      await this.client
        .from('installer_users')
        .update({ last_login: new Date().toISOString() })
        .eq('id', data.id);

      // Create session
      const session = {
        userId: data.id,
        username: data.username,
        fullName: data.full_name,
        role: data.role,
        allowedProjects: data.allowed_projects || [],
        loginTime: new Date().toISOString()
      };

      // Store session locally
      localStorage.setItem('datajam_session', JSON.stringify(session));

      return { success: true, user: session };
    } catch (err) {
      console.error('[Supabase] Login error:', err);
      return { success: false, error: 'Connection error. Please try again.' };
    }
  }

  async createUser(userData) {
    try {
      // Hash password using database function
      const { data: hashedPassword, error: hashError } = await this.client
        .rpc('hash_password', { password: userData.password });

      if (hashError) throw hashError;

      const { data, error } = await this.client
        .from('installer_users')
        .insert({
          username: userData.username,
          password_hash: hashedPassword,
          full_name: userData.fullName,
          email: userData.email,
          role: userData.role || 'user',
          allowed_projects: userData.allowedProjects || [],
          created_by: userData.createdBy
        })
        .select()
        .single();

      if (error) throw error;
      return { success: true, user: data };
    } catch (err) {
      console.error('[Supabase] Create user error:', err);
      return { success: false, error: err.message };
    }
  }

  async getUsers() {
    try {
      const { data, error } = await this.client
        .from('installer_users')
        .select('id, username, full_name, email, role, status, allowed_projects, created_at, last_login')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('[Supabase] Get users error:', err);
      return [];
    }
  }

  // ========================================
  // INSTALLATIONS
  // ========================================

  async getInstallations(filters = {}) {
    try {
      let query = this.client
        .from('installer_installations')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters.projectId) {
        query = query.eq('project_id', filters.projectId);
      }
      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('[Supabase] Get installations error:', err);
      // Return cached data if offline
      return this.getCachedData('installations') || [];
    }
  }

  async getInstallation(id) {
    try {
      const { data, error } = await this.client
        .from('installer_installations')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    } catch (err) {
      console.error('[Supabase] Get installation error:', err);
      return null;
    }
  }

  async saveInstallation(installation) {
    const isNew = !installation.id;

    try {
      if (!this.isOnline) {
        // Queue for later sync
        await this.queueOperation(isNew ? 'create' : 'update', 'installer_installations', installation);
        return { success: true, offline: true };
      }

      if (isNew) {
        // Get current user
        const session = JSON.parse(localStorage.getItem('datajam_session'));

        const { data, error } = await this.client
          .from('installer_installations')
          .insert({
            ...installation,
            created_by: session?.userId
          })
          .select()
          .single();

        if (error) throw error;
        return { success: true, data };
      } else {
        const { data, error } = await this.client
          .from('installer_installations')
          .update(installation)
          .eq('id', installation.id)
          .select()
          .single();

        if (error) throw error;
        return { success: true, data };
      }
    } catch (err) {
      console.error('[Supabase] Save installation error:', err);
      // Queue for retry
      await this.queueOperation(isNew ? 'create' : 'update', 'installer_installations', installation);
      return { success: false, error: err.message, queued: true };
    }
  }

  async deleteInstallation(id) {
    try {
      if (!this.isOnline) {
        await this.queueOperation('delete', 'installer_installations', { id });
        return { success: true, offline: true };
      }

      const { error } = await this.client
        .from('installer_installations')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { success: true };
    } catch (err) {
      console.error('[Supabase] Delete installation error:', err);
      return { success: false, error: err.message };
    }
  }

  // ========================================
  // PROJECTS
  // ========================================

  async getProjects() {
    try {
      const { data, error } = await this.client
        .from('installer_projects')
        .select('*')
        .order('project_name');

      if (error) throw error;

      // Cache for offline use
      this.cacheData('projects', data);
      return data || [];
    } catch (err) {
      console.error('[Supabase] Get projects error:', err);
      return this.getCachedData('projects') || [];
    }
  }

  // ========================================
  // INVENTORY
  // ========================================

  async getInventory() {
    try {
      const { data, error } = await this.client
        .from('installer_inventory')
        .select('*');

      if (error) throw error;

      // Convert to object format
      const inventory = {};
      (data || []).forEach(item => {
        inventory[item.item_type] = item.quantity;
      });

      this.cacheData('inventory', inventory);
      return inventory;
    } catch (err) {
      console.error('[Supabase] Get inventory error:', err);
      return this.getCachedData('inventory') || { jambox: 0, cable: 0 };
    }
  }

  async updateInventory(itemType, quantity, action, details = {}) {
    try {
      const session = JSON.parse(localStorage.getItem('datajam_session'));

      // Get current quantity
      const { data: current } = await this.client
        .from('installer_inventory')
        .select('quantity')
        .eq('item_type', itemType)
        .single();

      const previousQty = current?.quantity || 0;
      let newQty = previousQty;

      if (action === 'add') {
        newQty = previousQty + quantity;
      } else if (action === 'remove' || action === 'ship') {
        newQty = Math.max(0, previousQty - quantity);
      } else if (action === 'adjust') {
        newQty = quantity;
      }

      // Update inventory
      const { error: updateError } = await this.client
        .from('installer_inventory')
        .update({ quantity: newQty })
        .eq('item_type', itemType);

      if (updateError) throw updateError;

      // Log to history
      await this.client
        .from('installer_inventory_history')
        .insert({
          item_type: itemType,
          action: action,
          quantity: quantity,
          previous_qty: previousQty,
          new_qty: newQty,
          destination: details.destination,
          reason: details.reason,
          notes: details.notes,
          performed_by: session?.userId
        });

      return { success: true, newQty };
    } catch (err) {
      console.error('[Supabase] Update inventory error:', err);
      return { success: false, error: err.message };
    }
  }

  async getInventoryHistory() {
    try {
      const { data, error } = await this.client
        .from('installer_inventory_history')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('[Supabase] Get inventory history error:', err);
      return [];
    }
  }

  // ========================================
  // SHIPMENTS
  // ========================================

  async getShipments(status = null) {
    try {
      let query = this.client
        .from('installer_shipments')
        .select('*')
        .order('created_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('[Supabase] Get shipments error:', err);
      return [];
    }
  }

  async createShipment(shipment) {
    try {
      const session = JSON.parse(localStorage.getItem('datajam_session'));

      const { data, error } = await this.client
        .from('installer_shipments')
        .insert({
          ...shipment,
          created_by: session?.userId
        })
        .select()
        .single();

      if (error) throw error;

      // Deduct from inventory
      if (shipment.jambox_qty > 0) {
        await this.updateInventory('jambox', shipment.jambox_qty, 'ship', {
          destination: shipment.destination,
          notes: `Shipment #${data.id}`
        });
      }
      if (shipment.cable_qty > 0) {
        await this.updateInventory('cable', shipment.cable_qty, 'ship', {
          destination: shipment.destination,
          notes: `Shipment #${data.id}`
        });
      }

      return { success: true, data };
    } catch (err) {
      console.error('[Supabase] Create shipment error:', err);
      return { success: false, error: err.message };
    }
  }

  async updateShipmentStatus(id, status) {
    try {
      const updateData = { status };
      if (status === 'delivered') {
        updateData.delivered_at = new Date().toISOString();
      }

      const { data, error } = await this.client
        .from('installer_shipments')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (err) {
      console.error('[Supabase] Update shipment error:', err);
      return { success: false, error: err.message };
    }
  }

  // ========================================
  // OFFLINE SYNC QUEUE
  // ========================================

  async queueOperation(action, table, data) {
    const operation = {
      id: Date.now().toString(),
      action,
      table,
      data,
      timestamp: new Date().toISOString()
    };

    this.syncQueue.push(operation);
    await this.saveSyncQueue();
    console.log('[Supabase] Queued operation:', action, table);
  }

  async processSyncQueue() {
    if (this.syncQueue.length === 0) return;

    console.log(`[Supabase] Processing ${this.syncQueue.length} queued operations...`);

    const processed = [];

    for (const op of this.syncQueue) {
      try {
        let result;

        switch (op.action) {
          case 'create':
            result = await this.client.from(op.table).insert(op.data);
            break;
          case 'update':
            result = await this.client.from(op.table).update(op.data).eq('id', op.data.id);
            break;
          case 'delete':
            result = await this.client.from(op.table).delete().eq('id', op.data.id);
            break;
        }

        if (!result.error) {
          processed.push(op.id);
          console.log('[Supabase] Synced:', op.action, op.table);
        }
      } catch (err) {
        console.error('[Supabase] Sync error:', err);
      }
    }

    // Remove processed operations
    this.syncQueue = this.syncQueue.filter(op => !processed.includes(op.id));
    await this.saveSyncQueue();
  }

  async loadSyncQueue() {
    try {
      const stored = localStorage.getItem('datajam_sync_queue');
      this.syncQueue = stored ? JSON.parse(stored) : [];
    } catch (err) {
      this.syncQueue = [];
    }
  }

  async saveSyncQueue() {
    localStorage.setItem('datajam_sync_queue', JSON.stringify(this.syncQueue));
  }

  // ========================================
  // CACHING
  // ========================================

  cacheData(key, data) {
    try {
      localStorage.setItem(`datajam_cache_${key}`, JSON.stringify({
        data,
        timestamp: Date.now()
      }));
    } catch (err) {
      console.warn('[Supabase] Cache write failed:', err);
    }
  }

  getCachedData(key, maxAge = 3600000) {
    try {
      const cached = localStorage.getItem(`datajam_cache_${key}`);
      if (!cached) return null;

      const { data, timestamp } = JSON.parse(cached);

      // Check if cache is still valid
      if (Date.now() - timestamp > maxAge) {
        return null;
      }

      return data;
    } catch (err) {
      return null;
    }
  }

  // ========================================
  // REALTIME SUBSCRIPTIONS
  // ========================================

  setupRealtimeSubscriptions() {
    // Subscribe to installation changes
    this.client
      .channel('installer_installations')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'installer_installations' }, (payload) => {
        console.log('[Realtime] Installation change:', payload.eventType);
        window.dispatchEvent(new CustomEvent('installationsUpdated', { detail: payload }));
      })
      .subscribe();

    // Subscribe to inventory changes
    this.client
      .channel('installer_inventory')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'installer_inventory' }, (payload) => {
        console.log('[Realtime] Inventory change:', payload.eventType);
        window.dispatchEvent(new CustomEvent('inventoryUpdated', { detail: payload }));
      })
      .subscribe();

    // Subscribe to shipment changes
    this.client
      .channel('installer_shipments')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'installer_shipments' }, (payload) => {
        console.log('[Realtime] Shipment change:', payload.eventType);
        window.dispatchEvent(new CustomEvent('shipmentsUpdated', { detail: payload }));
      })
      .subscribe();
  }
}

// ========================================
// CLOUDINARY UPLOAD
// ========================================

class CloudinaryUploader {
  constructor() {
    this.cloudName = CONFIG.CLOUDINARY_CLOUD_NAME;
    this.uploadPreset = CONFIG.CLOUDINARY_UPLOAD_PRESET;
  }

  async uploadPhoto(file) {
    if (!this.cloudName || !this.uploadPreset) {
      console.warn('[Cloudinary] Not configured - storing locally');
      return this.storeLocally(file);
    }

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', this.uploadPreset);
      formData.append('folder', 'datajam-installations');

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${this.cloudName}/image/upload`,
        { method: 'POST', body: formData }
      );

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      return {
        url: data.secure_url,
        publicId: data.public_id,
        width: data.width,
        height: data.height
      };
    } catch (err) {
      console.error('[Cloudinary] Upload error:', err);
      // Fallback to local storage
      return this.storeLocally(file);
    }
  }

  async storeLocally(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        resolve({
          url: e.target.result, // base64
          isLocal: true
        });
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async uploadMultiple(files) {
    const results = [];
    for (const file of files) {
      const result = await this.uploadPhoto(file);
      results.push(result);
    }
    return results;
  }
}

// ========================================
// INITIALIZE GLOBAL INSTANCES
// ========================================

const db = new SupabaseClient();
const photoUploader = new CloudinaryUploader();

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
  await db.init();
});
