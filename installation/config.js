/**
 * DataJam Installer Configuration
 * Environment-specific settings
 */

const CONFIG = {
  // Supabase Configuration
  SUPABASE_URL: 'https://ysavdqiiilslrigtpacu.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzYXZkcWlpaWxzbHJpZ3RwYWN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjUzNzgyNTgsImV4cCI6MjA0MDk1NDI1OH0.4PK1M4kCgAdT4DLMN6UIbI5OR5HFMwQQJN1XBXKL1eE',

  // Cloudinary Configuration (user needs to fill these in)
  CLOUDINARY_CLOUD_NAME: '', // e.g., 'dxxxxx'
  CLOUDINARY_UPLOAD_PRESET: 'datajam_installer', // unsigned preset name

  // App Settings
  APP_NAME: 'DataJam Installer',
  APP_VERSION: '2.0.0',

  // Inventory thresholds
  LOW_STOCK_THRESHOLD: 10,

  // Photo settings
  MAX_PHOTO_SIZE_MB: 5,
  PHOTO_QUALITY: 0.8,

  // Offline settings
  SYNC_INTERVAL_MS: 30000, // Try to sync every 30 seconds when online

  // Debug mode
  DEBUG: false
};

// Freeze config to prevent accidental modification
Object.freeze(CONFIG);
