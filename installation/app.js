// ========================================
// SESSION MANAGEMENT & AUTHENTICATION
// ========================================
console.log('[APP.JS] Loading, pathname:', window.location.pathname);

const SessionManager = {
    getSession() {
        try {
            const data = localStorage.getItem('datajam_session');
            return data ? JSON.parse(data) : null;
        } catch (e) {
            console.error('[Session] Error parsing session:', e);
            return null;
        }
    },

    isAuthenticated() {
        return this.getSession() !== null;
    },

    requireAuth() {
        const isAuth = this.isAuthenticated();
        console.log('[SESSION] requireAuth check:', isAuth);
        if (!isAuth) {
            console.log('[SESSION] Not authenticated, redirecting to login');
            window.location.href = 'login.html';
            return false;
        }
        return true;
    },

    logout() {
        if (confirm('Are you sure you want to log out?')) {
            localStorage.removeItem('datajam_session');
            window.location.href = 'login.html';
        }
    },

    getCurrentUser() {
        const session = this.getSession();
        return session ? session.fullName || session.username : 'User';
    },

    getUserRole() {
        const session = this.getSession();
        return session ? session.role : null;
    }
};

// Auth check function - called from DOMContentLoaded to avoid race conditions
function checkAuthOnLoad() {
    if (window.location.pathname.includes('login.html')) {
        console.log('[APP.JS] On login page, skipping auth check');
        return;
    }

    console.log('[APP.JS] Checking auth...');
    const session = SessionManager.getSession();
    console.log('[APP.JS] Session data:', session ? 'exists' : 'null', session?.username || 'no username');

    if (!session || !session.username) {
        console.log('[APP.JS] No valid session, redirecting to login');
        window.location.href = 'login.html';
        return;
    }

    console.log('[APP.JS] Auth passed for user:', session.username);
}

// ========================================
// ENCRYPTION UTILITIES (Web Crypto API)
// ========================================
const EncryptionUtil = {
    // Encryption key (stored in localStorage, generated once per browser)
    async getEncryptionKey() {
        let keyData = localStorage.getItem('datajam_encryption_key');

        if (!keyData) {
            // Generate new key
            const key = await window.crypto.subtle.generateKey(
                { name: 'AES-GCM', length: 256 },
                true,
                ['encrypt', 'decrypt']
            );

            // Export and store key
            const exported = await window.crypto.subtle.exportKey('raw', key);
            keyData = btoa(String.fromCharCode(...new Uint8Array(exported)));
            localStorage.setItem('datajam_encryption_key', keyData);
            return key;
        }

        // Import existing key
        const keyBuffer = Uint8Array.from(atob(keyData), c => c.charCodeAt(0));
        return await window.crypto.subtle.importKey(
            'raw',
            keyBuffer,
            { name: 'AES-GCM', length: 256 },
            true,
            ['encrypt', 'decrypt']
        );
    },

    async encrypt(text) {
        if (!text || text.trim() === '') return '';

        try {
            const key = await this.getEncryptionKey();
            const iv = window.crypto.getRandomValues(new Uint8Array(12));
            const encoded = new TextEncoder().encode(text);

            const encrypted = await window.crypto.subtle.encrypt(
                { name: 'AES-GCM', iv: iv },
                key,
                encoded
            );

            // Combine IV and encrypted data
            const combined = new Uint8Array(iv.length + encrypted.byteLength);
            combined.set(iv, 0);
            combined.set(new Uint8Array(encrypted), iv.length);

            // Return as base64 with prefix to identify encrypted data
            return 'ENC:' + btoa(String.fromCharCode(...combined));
        } catch (error) {
            console.error('Encryption error:', error);
            return text; // Fallback to unencrypted
        }
    },

    async decrypt(encryptedText) {
        if (!encryptedText || encryptedText.trim() === '') return '';

        // Check if data is encrypted
        if (!encryptedText.startsWith('ENC:')) {
            return encryptedText; // Return as-is if not encrypted (legacy data)
        }

        try {
            const key = await this.getEncryptionKey();
            const combined = Uint8Array.from(atob(encryptedText.substring(4)), c => c.charCodeAt(0));

            // Extract IV and encrypted data
            const iv = combined.slice(0, 12);
            const encrypted = combined.slice(12);

            const decrypted = await window.crypto.subtle.decrypt(
                { name: 'AES-GCM', iv: iv },
                key,
                encrypted
            );

            return new TextDecoder().decode(decrypted);
        } catch (error) {
            console.error('Decryption error:', error);
            return '[Decryption Failed]';
        }
    }
};

// ========================================
// PHOTO COMPRESSION UTILITIES
// ========================================
const PhotoUtil = {
    async compressImage(file, maxWidth = 800, maxHeight = 800, quality = 0.7) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (e) => {
                const img = new Image();

                img.onload = () => {
                    // Calculate new dimensions
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > maxWidth) {
                            height *= maxWidth / width;
                            width = maxWidth;
                        }
                    } else {
                        if (height > maxHeight) {
                            width *= maxHeight / height;
                            height = maxHeight;
                        }
                    }

                    // Create canvas and compress
                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;

                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    // Convert to compressed data URL
                    const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);

                    resolve({
                        data: compressedDataUrl,
                        name: file.name,
                        type: 'image/jpeg',
                        originalSize: file.size,
                        compressedSize: Math.round((compressedDataUrl.length * 3) / 4) // Approximate size
                    });
                };

                img.onerror = reject;
                img.src = e.target.result;
            };

            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }
};

// ========================================
// LOCALSTORAGE UTILITIES WITH ERROR HANDLING
// ========================================
const StorageUtil = {
    // Get current localStorage usage
    getStorageUsage() {
        let total = 0;
        for (let key in localStorage) {
            if (localStorage.hasOwnProperty(key)) {
                total += localStorage[key].length + key.length;
            }
        }
        return total;
    },

    // Get storage quota (approximate - most browsers use 5-10MB)
    getStorageQuota() {
        return 5 * 1024 * 1024; // 5MB estimate
    },

    // Check if storage is nearly full
    isStorageNearlyFull() {
        const usage = this.getStorageUsage();
        const quota = this.getStorageQuota();
        return (usage / quota) > 0.8; // 80% threshold
    },

    // Safe localStorage set with error handling
    safeSet(key, value) {
        try {
            // Check storage before saving
            if (this.isStorageNearlyFull()) {
                const usage = (this.getStorageUsage() / (1024 * 1024)).toFixed(2);
                const quota = (this.getStorageQuota() / (1024 * 1024)).toFixed(2);

                const shouldContinue = confirm(
                    `⚠️ Storage Warning\n\n` +
                    `Your browser storage is ${usage}MB / ${quota}MB (80% full).\n\n` +
                    `Consider exporting your data and deleting old installations.\n\n` +
                    `Continue saving anyway?`
                );

                if (!shouldContinue) {
                    return false;
                }
            }

            localStorage.setItem(key, value);
            return true;
        } catch (error) {
            if (error.name === 'QuotaExceededError' || error.code === 22) {
                alert(
                    '❌ Storage Full\n\n' +
                    'Your browser storage is full and cannot save more data.\n\n' +
                    'Please:\n' +
                    '1. Export your installations (JSON or CSV)\n' +
                    '2. Delete old installations you no longer need\n' +
                    '3. Try saving again'
                );
            } else {
                alert(
                    '❌ Save Error\n\n' +
                    'Failed to save data to browser storage.\n\n' +
                    `Error: ${error.message}\n\n` +
                    'Please export your data as a backup.'
                );
            }
            return false;
        }
    },

    // Safe localStorage get with error handling
    safeGet(key, defaultValue = null) {
        try {
            const value = localStorage.getItem(key);
            return value !== null ? value : defaultValue;
        } catch (error) {
            console.error('localStorage get error:', error);
            return defaultValue;
        }
    },

    // Safe JSON parse with error handling
    safeParse(jsonString, defaultValue = []) {
        try {
            return jsonString ? JSON.parse(jsonString) : defaultValue;
        } catch (error) {
            console.error('JSON parse error:', error);
            alert(
                '⚠️ Data Corruption Warning\n\n' +
                'Some stored data could not be loaded due to corruption.\n\n' +
                'This may result in missing installations.'
            );
            return defaultValue;
        }
    }
};

// Installation Manager
class InstallationManager {
    constructor() {
        this.installations = this.loadInstallations();
        this.photos = [];
        this.editMode = false;
        this.editId = null;
        this.init();
    }

    init() {
        // Check if we're in edit mode
        const urlParams = new URLSearchParams(window.location.search);
        const editId = urlParams.get('edit');

        if (editId) {
            this.editMode = true;
            this.editId = parseInt(editId);
            this.loadInstallationForEdit(this.editId);
        } else {
            // Set default date to today
            const today = new Date().toISOString().split('T')[0];
            const dateInput = document.getElementById('installDate');
            if (dateInput) {
                dateInput.value = today;
            }

            // Set default time to now
            const now = new Date();
            const timeInput = document.getElementById('installTime');
            if (timeInput) {
                timeInput.value = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
            }
        }

        // Load and populate SSID history
        this.populateSSIDHistory();

        // Set up JamBox autocomplete from registry
        this.setupJamboxAutocomplete();

        this.setupEventListeners();
        this.updateFormTitle();
    }

    updateFormTitle() {
        const h1 = document.querySelector('main h1');
        const subtitle = document.querySelector('main .subtitle');
        const submitBtn = document.querySelector('.btn-primary[type="submit"]');

        if (this.editMode) {
            if (h1) h1.textContent = 'Edit Installation';
            if (subtitle) subtitle.textContent = 'Update installation details and photos';
            if (submitBtn) submitBtn.textContent = 'Update Installation';
        }
    }

    async loadInstallationForEdit(id) {
        const installation = this.installations.find(i => i.id === id);
        if (!installation) {
            alert('Installation not found');
            window.location.href = 'installations.html';
            return;
        }

        // Decrypt password for editing
        const decryptedPassword = await EncryptionUtil.decrypt(installation.password || '');

        // Populate form fields
        document.getElementById('status').value = installation.status || 'completed';
        document.getElementById('projectName').value = installation.projectName || '';
        document.getElementById('clientName').value = installation.clientName || '';
        document.getElementById('clientContact').value = installation.clientContact || '';
        document.getElementById('clientEmail').value = installation.clientEmail || '';
        document.getElementById('clientPhone').value = installation.clientPhone || '';
        document.getElementById('locationType').value = installation.locationType || '';
        document.getElementById('installAddress').value = installation.installAddress || '';
        document.getElementById('jamboxId').value = installation.jamboxId || '';
        document.getElementById('ssid').value = installation.ssid || '';
        document.getElementById('password').value = decryptedPassword;
        document.getElementById('ipAddress').value = installation.ipAddress || '';
        document.getElementById('installDate').value = installation.installDate || '';
        document.getElementById('installTime').value = installation.installTime || '';
        document.getElementById('notes').value = installation.notes || '';
        document.getElementById('deviceTested').checked = installation.deviceTested || false;
        document.getElementById('networkVerified').checked = installation.networkVerified || false;

        // Load photos
        if (installation.photos && installation.photos.length > 0) {
            this.photos = [...installation.photos];
            this.renderPhotoPreview();
        }
    }

    setupEventListeners() {
        const form = document.getElementById('installForm');
        if (form) {
            form.addEventListener('submit', (e) => this.handleSubmit(e));
            form.addEventListener('reset', () => this.handleReset());
        }

        const photoInput = document.getElementById('photoInput');
        if (photoInput) {
            photoInput.addEventListener('change', (e) => this.handlePhotoUpload(e));
        }

        const newInstallBtn = document.getElementById('newInstallBtn');
        if (newInstallBtn) {
            newInstallBtn.addEventListener('click', () => {
                this.closeModal();
                if (this.editMode) {
                    // After editing, go back to installations list
                    window.location.href = 'installations.html';
                } else {
                    // For new installation, fully reset state and reload from storage
                    this.editMode = false;
                    this.editId = null;
                    this.installations = this.loadInstallations(); // Reload from localStorage
                    this.resetForm();

                    // Clear any URL params (in case of stale edit param)
                    if (window.location.search) {
                        window.history.replaceState({}, '', window.location.pathname);
                    }
                }
            });
        }

        const viewInstallsBtn = document.getElementById('viewInstallsBtn');
        if (viewInstallsBtn) {
            viewInstallsBtn.addEventListener('click', () => {
                window.location.href = 'installations.html';
            });
        }
    }

    async handlePhotoUpload(event) {
        const files = Array.from(event.target.files);

        for (const file of files) {
            if (file.type.startsWith('image/')) {
                try {
                    // Compress image before storing
                    const compressed = await PhotoUtil.compressImage(file);

                    // Log compression savings
                    const savings = ((1 - compressed.compressedSize / compressed.originalSize) * 100).toFixed(1);
                    console.log(`Photo compressed: ${file.name} - Saved ${savings}%`);

                    this.photos.push({
                        data: compressed.data,
                        name: compressed.name,
                        type: compressed.type
                    });
                    this.renderPhotoPreview();
                } catch (error) {
                    console.error('Photo compression error:', error);
                    alert(`Failed to process photo: ${file.name}`);
                }
            }
        }

        // Clear input so same file can be selected again
        event.target.value = '';
    }

    renderPhotoPreview() {
        const preview = document.getElementById('photoPreview');
        if (!preview) return;

        preview.innerHTML = '';

        this.photos.forEach((photo, index) => {
            const photoItem = document.createElement('div');
            photoItem.className = 'photo-item';

            photoItem.innerHTML = `
                <img src="${photo.data}" alt="${photo.name}">
                <button type="button" class="photo-remove" onclick="installManager.removePhoto(${index})">×</button>
            `;

            preview.appendChild(photoItem);
        });
    }

    removePhoto(index) {
        this.photos.splice(index, 1);
        this.renderPhotoPreview();
    }

    async handleSubmit(event) {
        event.preventDefault();

        const formData = new FormData(event.target);

        // Encrypt password before storing
        const encryptedPassword = await EncryptionUtil.encrypt(formData.get('password') || '');

        const installation = {
            id: this.editMode ? this.editId : Date.now(),
            timestamp: this.editMode ? this.installations.find(i => i.id === this.editId)?.timestamp : new Date().toISOString(),
            status: formData.get('status') || 'completed',
            projectName: formData.get('projectName'),
            clientName: formData.get('clientName'),
            clientContact: formData.get('clientContact'),
            clientEmail: formData.get('clientEmail'),
            clientPhone: formData.get('clientPhone'),
            locationType: formData.get('locationType'),
            installAddress: formData.get('installAddress'),
            jamboxId: formData.get('jamboxId'),
            ssid: formData.get('ssid'),
            password: encryptedPassword, // Store encrypted password
            ipAddress: formData.get('ipAddress'),
            installDate: formData.get('installDate'),
            installTime: formData.get('installTime'),
            notes: formData.get('notes'),
            deviceTested: formData.get('deviceTested') === 'on',
            networkVerified: formData.get('networkVerified') === 'on',
            photos: this.photos
        };

        // Save SSID to history for autocomplete
        this.saveSSIDToHistory(installation.ssid);

        try {
            await this.saveInstallation(installation);
            console.log('[Install] Saved successfully. Total installations:', this.installations.length);

            // Update JamBox status to "installed" if a JamBox ID was provided
            if (installation.jamboxId && installation.jamboxId.trim()) {
                const updated = this.updateJamboxStatusOnInstall(installation.jamboxId.trim(), installation.id);
                if (updated) {
                    console.log('[Install] JamBox status updated to installed:', installation.jamboxId);
                }
            }

            this.showModal();
        } catch (error) {
            console.error('[Install] Save failed:', error);
            alert('Failed to save installation. Please try again.');
        }
    }

    handleReset() {
        this.photos = [];
        this.renderPhotoPreview();

        // Reset date and time to current values
        setTimeout(() => {
            const today = new Date().toISOString().split('T')[0];
            const now = new Date();
            document.getElementById('installDate').value = today;
            document.getElementById('installTime').value = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        }, 0);
    }

    resetForm() {
        const form = document.getElementById('installForm');
        if (form) {
            form.reset();
            this.handleReset();
        }
    }

    async saveInstallation(installation) {
        console.log('[Install] Saving installation:', installation.id, '- Edit mode:', this.editMode);

        if (this.editMode) {
            // Update existing installation
            const index = this.installations.findIndex(i => i.id === this.editId);
            if (index !== -1) {
                this.installations[index] = installation;
                console.log('[Install] Updated existing at index:', index);
            }
        } else {
            // Create new installation
            this.installations.push(installation);
            console.log('[Install] Added new. Array length:', this.installations.length);
        }

        // Use safe storage with error handling
        const success = StorageUtil.safeSet('datajam_installations', JSON.stringify(this.installations));
        console.log('[Install] LocalStorage save result:', success);

        if (!success) {
            // Revert changes if save failed
            if (this.editMode) {
                this.installations = this.loadInstallations(); // Reload from storage
            } else {
                this.installations.pop(); // Remove the installation we just added
            }
            throw new Error('Failed to save installation');
        }

        // Sync to Supabase database
        await this.syncToSupabase(installation);
    }

    async syncToSupabase(installation) {
        try {
            // Direct Supabase sync using fetch (simpler than the client wrapper)
            const SUPABASE_URL = 'https://ysavdqiiilslrigtpacu.supabase.co';
            const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzYXZkcWlpaWxzbHJpZ3RwYWN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUzMTU0NTYsImV4cCI6MjA4MDg5MTQ1Nn0.DrsEv_e_7M8qL1PmGpTMluGtV8C1qRfzLccK6y3L9RI';

            // Prepare data for Supabase with correct column names
            const dbInstallation = {
                status: installation.status || 'completed',
                venue_name: installation.clientName || 'Unknown Venue',
                contact_name: installation.clientContact || null,
                contact_email: installation.clientEmail || null,
                contact_phone: installation.clientPhone || null,
                location_type: installation.locationType || null,
                address: installation.installAddress || null,
                jambox_id: installation.jamboxId || null,
                wifi_ssid: installation.ssid || null,
                ip_address: installation.ipAddress || null,
                install_date: installation.installDate || null,
                install_time: installation.installTime || null,
                notes: installation.notes || null,
                device_tested: installation.deviceTested || false,
                network_verified: installation.networkVerified || false
            };

            const response = await fetch(`${SUPABASE_URL}/rest/v1/installer_installations`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${SUPABASE_KEY}`,
                    'Prefer': 'return=minimal'
                },
                body: JSON.stringify(dbInstallation)
            });

            if (response.ok) {
                console.log('[Install] Supabase sync successful');
            } else {
                const error = await response.text();
                console.error('[Install] Supabase sync failed:', error);
            }
        } catch (error) {
            console.error('[Install] Supabase sync error:', error);
            // Don't throw - localStorage save was successful, Supabase sync is best-effort
        }
    }

    loadInstallations() {
        const stored = StorageUtil.safeGet('datajam_installations');
        return StorageUtil.safeParse(stored, []);
    }

    showModal() {
        const modal = document.getElementById('successModal');
        if (modal) {
            // Update modal text based on mode
            const modalTitle = modal.querySelector('h2');
            const modalText = modal.querySelector('p');
            const newInstallBtn = document.getElementById('newInstallBtn');

            if (this.editMode) {
                if (modalTitle) modalTitle.textContent = 'Installation Updated!';
                if (modalText) modalText.textContent = 'Installation record has been updated successfully.';
                if (newInstallBtn) newInstallBtn.textContent = 'Back to Installations';
            } else {
                if (modalTitle) modalTitle.textContent = 'Installation Saved!';
                if (modalText) modalText.textContent = 'Installation record has been saved successfully.';
                if (newInstallBtn) newInstallBtn.textContent = 'New Installation';
            }

            modal.classList.add('active');
        }
    }

    closeModal() {
        const modal = document.getElementById('successModal');
        if (modal) {
            modal.classList.remove('active');
        }
    }

    loadSSIDHistory() {
        const stored = StorageUtil.safeGet('datajam_ssid_history');
        return StorageUtil.safeParse(stored, []);
    }

    saveSSIDToHistory(ssid) {
        if (!ssid || ssid.trim() === '') return;

        let history = this.loadSSIDHistory();

        // Add to history if not already present
        if (!history.includes(ssid)) {
            history.unshift(ssid); // Add to beginning

            // Keep only last 20 SSIDs
            if (history.length > 20) {
                history = history.slice(0, 20);
            }

            StorageUtil.safeSet('datajam_ssid_history', JSON.stringify(history));
            this.populateSSIDHistory();
        }
    }

    populateSSIDHistory() {
        const datalist = document.getElementById('ssidHistory');
        if (!datalist) return;

        const history = this.loadSSIDHistory();
        datalist.innerHTML = '';

        history.forEach(ssid => {
            const option = document.createElement('option');
            option.value = ssid;
            datalist.appendChild(option);
        });
    }

    // ========================================
    // JAMBOX AUTOCOMPLETE FOR INSTALLATIONS
    // ========================================

    loadJamboxRegistry() {
        const data = localStorage.getItem('datajam_jambox_registry');
        return data ? JSON.parse(data) : [];
    }

    setupJamboxAutocomplete() {
        const projectSelect = document.getElementById('projectName');
        const jamboxInput = document.getElementById('jamboxId');
        const hintEl = document.getElementById('jamboxHint');

        if (!jamboxInput) return;

        // Initial population of JamBox suggestions
        this.populateJamboxSuggestions();

        // Update suggestions when project changes
        if (projectSelect) {
            projectSelect.addEventListener('change', () => {
                this.populateJamboxSuggestions();
            });
        }

        // Update hint when input changes
        if (jamboxInput && hintEl) {
            jamboxInput.addEventListener('input', () => {
                const value = jamboxInput.value.trim();
                const registry = this.loadJamboxRegistry();
                const jambox = registry.find(jb => jb.id.toLowerCase() === value.toLowerCase());

                if (jambox) {
                    const statusLabels = {
                        'in_stock': 'In Stock',
                        'shipped': 'Shipped to ' + (jambox.shippedTo || 'unknown'),
                        'installed': 'Already Installed',
                        'active': 'Active',
                        'faulty': 'Marked as Faulty'
                    };
                    hintEl.innerHTML = `<span style="color: ${jambox.status === 'shipped' ? '#14B8A6' : jambox.status === 'installed' ? '#F59E0B' : '#6B7280'};">Found: ${statusLabels[jambox.status] || jambox.status}</span>`;
                } else if (value) {
                    hintEl.innerHTML = '<span style="color: var(--text-secondary);">New JamBox ID (not in registry)</span>';
                } else {
                    hintEl.textContent = 'Select a project to see shipped JamBoxes, or enter any ID';
                }
            });
        }
    }

    populateJamboxSuggestions() {
        const datalist = document.getElementById('jamboxSuggestions');
        const projectSelect = document.getElementById('projectName');
        const hintEl = document.getElementById('jamboxHint');

        if (!datalist) return;

        const registry = this.loadJamboxRegistry();
        const selectedProject = projectSelect?.value || '';

        // Get JamBoxes that are "shipped" (available for installation)
        let shippedJamboxes = registry.filter(jb => jb.status === 'shipped');

        // If a project is selected, prioritize JamBoxes shipped to that project
        if (selectedProject) {
            // Get the display text of the selected option
            const selectedOption = projectSelect.options[projectSelect.selectedIndex];
            const projectName = selectedOption?.text || selectedProject;

            // Filter to show JamBoxes shipped to this project first
            const forThisProject = shippedJamboxes.filter(jb =>
                jb.shippedTo && (
                    jb.shippedTo.toLowerCase().includes(projectName.toLowerCase()) ||
                    projectName.toLowerCase().includes(jb.shippedTo.toLowerCase())
                )
            );

            // Also include other shipped JamBoxes
            const otherShipped = shippedJamboxes.filter(jb =>
                !forThisProject.includes(jb)
            );

            // Sort: project matches first, then others
            shippedJamboxes = [...forThisProject, ...otherShipped];

            if (forThisProject.length > 0 && hintEl) {
                hintEl.innerHTML = `<span style="color: #14B8A6;">${forThisProject.length} JamBox(es) shipped to ${projectName}</span>`;
            } else if (hintEl) {
                hintEl.textContent = shippedJamboxes.length > 0
                    ? `${shippedJamboxes.length} shipped JamBox(es) available`
                    : 'No shipped JamBoxes available - check inventory';
            }
        }

        // Clear and populate datalist
        datalist.innerHTML = '';

        shippedJamboxes.forEach(jb => {
            const option = document.createElement('option');
            option.value = jb.id;
            option.label = jb.shippedTo ? `${jb.id} (shipped to ${jb.shippedTo})` : jb.id;
            datalist.appendChild(option);
        });

        // Also add "in_stock" JamBoxes as secondary options
        const inStockJamboxes = registry.filter(jb => jb.status === 'in_stock');
        inStockJamboxes.forEach(jb => {
            const option = document.createElement('option');
            option.value = jb.id;
            option.label = `${jb.id} (in stock - not shipped)`;
            datalist.appendChild(option);
        });
    }

    updateJamboxStatusOnInstall(jamboxId, installationId) {
        // Load registry directly and update
        const registryData = localStorage.getItem('datajam_jambox_registry');
        const registry = registryData ? JSON.parse(registryData) : [];

        const jambox = registry.find(jb => jb.id.toLowerCase() === jamboxId.toLowerCase());
        if (!jambox) {
            console.log('[Install] JamBox not found in registry:', jamboxId);
            return false;
        }

        // Update status to installed
        jambox.status = 'installed';
        jambox.installedAt = installationId;
        jambox.installedDate = new Date().toISOString().split('T')[0];
        jambox.lastUpdated = new Date().toISOString();

        // Save registry
        StorageUtil.safeSet('datajam_jambox_registry', JSON.stringify(registry));

        // Add to inventory history
        const historyData = localStorage.getItem('datajam_inventory_history');
        const history = historyData ? JSON.parse(historyData) : [];

        history.unshift({
            id: Date.now(),
            timestamp: new Date().toISOString(),
            type: 'jambox',
            action: 'install',
            quantity: 1,
            jamboxId: jamboxId,
            notes: `JamBox ${jamboxId} marked as installed`,
            user: SessionManager.getCurrentUser() || 'Alex'
        });

        StorageUtil.safeSet('datajam_inventory_history', JSON.stringify(history));

        console.log('[Install] Updated JamBox status to installed:', jamboxId);
        return true;
    }
}

// Installation List Manager
class InstallationListManager {
    constructor() {
        this.installations = this.loadInstallations();
        this.searchQuery = '';
        this.statusFilter = '';
        this.currentView = 'grid'; // 'grid' or 'calendar'
        this.calendarDate = new Date(); // Current month being viewed
        this.init();
    }

    init() {
        // Initial render with localStorage data (for instant display)
        this.renderInstallations();
        this.setupEventListeners();

        // Load from Supabase in background (will update UI when data arrives)
        this.loadFromSupabase().then(loaded => {
            if (loaded) {
                // Re-render UI with cloud data
                this.renderInstallations();
                console.log('[Installations] UI refreshed with Supabase data');
            }
        });
    }

    switchView(view) {
        this.currentView = view;

        // Update button states
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === view);
        });

        // Show/hide views
        const gridView = document.getElementById('installGrid');
        const calendarView = document.getElementById('installCalendar');

        if (view === 'calendar') {
            gridView.style.display = 'none';
            calendarView.style.display = 'block';
            this.renderCalendar();
        } else {
            gridView.style.display = 'grid';
            calendarView.style.display = 'none';
        }
    }

    renderCalendar() {
        const container = document.getElementById('installCalendar');
        if (!container) return;

        const year = this.calendarDate.getFullYear();
        const month = this.calendarDate.getMonth();

        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                           'July', 'August', 'September', 'October', 'November', 'December'];

        // Get first day of month and number of days
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay();

        const statusColors = {
            'scheduled': '#3B82F6',
            'in-progress': '#F59E0B',
            'completed': '#14B8A6',
            'issue': '#E62F6E'
        };

        // Group installations by date
        const installsByDate = {};
        this.installations.forEach(install => {
            if (!install.installDate) return;
            const date = install.installDate;
            if (!installsByDate[date]) {
                installsByDate[date] = [];
            }
            installsByDate[date].push(install);
        });

        let html = `
            <div class="calendar-header">
                <div class="calendar-nav">
                    <button class="calendar-nav-btn" onclick="listManager.changeMonth(-1)">← Prev</button>
                    <button class="calendar-nav-btn" onclick="listManager.changeMonth(0)">Today</button>
                    <button class="calendar-nav-btn" onclick="listManager.changeMonth(1)">Next →</button>
                </div>
                <div class="calendar-title">${monthNames[month]} ${year}</div>
            </div>
            <div class="calendar-grid">
                <div class="calendar-day-header">Sun</div>
                <div class="calendar-day-header">Mon</div>
                <div class="calendar-day-header">Tue</div>
                <div class="calendar-day-header">Wed</div>
                <div class="calendar-day-header">Thu</div>
                <div class="calendar-day-header">Fri</div>
                <div class="calendar-day-header">Sat</div>
        `;

        // Add empty cells for days before month starts
        for (let i = 0; i < startingDayOfWeek; i++) {
            html += '<div class="calendar-day other-month"></div>';
        }

        // Add days of month
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];

        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            const dateStr = date.toISOString().split('T')[0];
            const isToday = dateStr === todayStr;
            const dayInstalls = installsByDate[dateStr] || [];

            html += `
                <div class="calendar-day ${isToday ? 'today' : ''}" onclick="listManager.filterByDate('${dateStr}')">
                    <div class="calendar-day-number">${day}</div>
                    <div class="calendar-installations">
                        ${dayInstalls.slice(0, 3).map(install => {
                            const status = install.status || 'completed';
                            const color = statusColors[status] || '#666';
                            return `<div class="calendar-install-dot" style="background: ${color};" title="${install.clientName}"></div>`;
                        }).join('')}
                    </div>
                    ${dayInstalls.length > 0 ? `<div class="calendar-install-count">${dayInstalls.length} install${dayInstalls.length !== 1 ? 's' : ''}</div>` : ''}
                </div>
            `;
        }

        html += '</div>';
        container.innerHTML = html;
    }

    changeMonth(delta) {
        if (delta === 0) {
            this.calendarDate = new Date(); // Go to today
        } else {
            this.calendarDate.setMonth(this.calendarDate.getMonth() + delta);
        }
        this.renderCalendar();
    }

    filterByDate(dateStr) {
        // Switch back to grid view and filter by date
        this.switchView('grid');
        document.getElementById('searchInput').value = dateStr;
        this.searchQuery = dateStr;
        this.renderInstallations();
    }

    setupEventListeners() {
        const exportBtn = document.getElementById('exportBtn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportData());
        }

        const exportCSVBtn = document.getElementById('exportCSVBtn');
        if (exportCSVBtn) {
            exportCSVBtn.addEventListener('click', () => this.exportCSV());
        }

        // Search and filter listeners
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchQuery = e.target.value.toLowerCase();
                this.renderInstallations();
            });
        }

        const statusFilter = document.getElementById('statusFilter');
        if (statusFilter) {
            statusFilter.addEventListener('change', (e) => {
                this.statusFilter = e.target.value;
                this.renderInstallations();
            });
        }

        const clearFilters = document.getElementById('clearFilters');
        if (clearFilters) {
            clearFilters.addEventListener('click', () => {
                this.searchQuery = '';
                this.statusFilter = '';
                if (searchInput) searchInput.value = '';
                if (statusFilter) statusFilter.value = '';
                this.renderInstallations();
            });
        }

        const clearAllBtn = document.getElementById('clearAllBtn');
        if (clearAllBtn) {
            clearAllBtn.addEventListener('click', () => this.clearAll());
        }
    }

    loadInstallations() {
        const stored = StorageUtil.safeGet('datajam_installations');
        return StorageUtil.safeParse(stored, []);
    }

    async loadFromSupabase() {
        if (typeof db === 'undefined') {
            console.log('[Installations] Supabase not available, using localStorage');
            return false;
        }

        try {
            // Wait for db to be initialized
            if (!db.initialized) {
                await db.init();
            }

            console.log('[Installations] Loading data from Supabase...');
            const cloudInstallations = await db.getInstallations();

            if (cloudInstallations && cloudInstallations.length > 0) {
                // Normalize field names from Supabase (snake_case to camelCase)
                this.installations = cloudInstallations.map(install => ({
                    id: install.id,
                    timestamp: install.created_at || install.timestamp,
                    status: install.status || 'completed',
                    projectName: install.project_name || install.projectName || '',
                    clientName: install.venue_name || install.clientName || '',
                    clientContact: install.contact_name || install.clientContact || '',
                    clientEmail: install.contact_email || install.clientEmail || '',
                    clientPhone: install.contact_phone || install.clientPhone || '',
                    locationType: install.location_type || install.locationType || '',
                    installAddress: install.address || install.installAddress || '',
                    jamboxId: install.jambox_id || install.jamboxId || '',
                    ssid: install.wifi_ssid || install.ssid || '',
                    password: install.wifi_password || install.password || '',
                    ipAddress: install.ip_address || install.ipAddress || '',
                    installDate: install.install_date || install.installDate || '',
                    installTime: install.install_time || install.installTime || '',
                    notes: install.notes || '',
                    deviceTested: install.device_tested ?? install.deviceTested ?? false,
                    networkVerified: install.network_verified ?? install.networkVerified ?? false,
                    photos: install.photos || []
                }));

                // Update localStorage cache
                StorageUtil.safeSet('datajam_installations', JSON.stringify(this.installations));
                console.log('[Installations] Loaded', this.installations.length, 'installations from Supabase');
                return true;
            }
        } catch (err) {
            console.error('[Installations] Failed to load from Supabase:', err);
        }

        return false;
    }

    renderInstallations() {
        const grid = document.getElementById('installGrid');
        if (!grid) return;

        if (this.installations.length === 0) {
            grid.innerHTML = `
                <div class="empty-state">
                    <h2>No Installations Yet</h2>
                    <p>Start by creating your first installation record.</p>
                    <a href="index.html" class="btn-primary" style="display: inline-block; margin-top: 20px; text-decoration: none;">New Installation</a>
                </div>
            `;
            return;
        }

        // Filter installations
        let filtered = [...this.installations];

        // Apply search filter
        if (this.searchQuery) {
            filtered = filtered.filter(install => {
                const searchableText = [
                    install.clientName || '',
                    install.jamboxId || '',
                    install.installAddress || '',
                    install.projectName || '',
                    install.notes || ''
                ].join(' ').toLowerCase();
                return searchableText.includes(this.searchQuery);
            });
        }

        // Apply status filter
        if (this.statusFilter) {
            filtered = filtered.filter(install =>
                (install.status || 'completed') === this.statusFilter
            );
        }

        // Update result count
        const resultCount = document.getElementById('resultCount');
        if (resultCount) {
            resultCount.textContent = `Showing ${filtered.length} of ${this.installations.length} installations`;
        }

        if (filtered.length === 0) {
            grid.innerHTML = `
                <div class="empty-state">
                    <h2>No Matching Installations</h2>
                    <p>Try adjusting your search or filters.</p>
                </div>
            `;
            return;
        }

        // Sort by most recent first
        const sorted = filtered.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

        grid.innerHTML = sorted.map(install => this.renderInstallCard(install)).join('');
    }

    renderInstallCard(install) {
        const date = new Date(install.installDate);
        const formattedDate = date.toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });

        const photoCount = install.photos?.length || 0;
        const photoHTML = install.photos?.length > 0
            ? `<div class="install-photos">
                ${install.photos.slice(0, 4).map(photo =>
                    `<img src="${photo.data}" alt="Installation photo">`
                ).join('')}
                ${photoCount > 4 ? `<span style="color: var(--text-secondary); font-size: 12px;">+${photoCount - 4} more</span>` : ''}
               </div>`
            : '';

        return `
            <div class="install-card" data-id="${install.id}">
                <div class="install-card-header">
                    <h3>${install.clientName}</h3>
                    <span class="install-badge">${install.locationType || 'N/A'}</span>
                </div>
                <div class="install-card-body">
                    ${install.projectName ? `<div class="install-info"><strong>Project:</strong> ${install.projectName}</div>` : ''}
                    <div class="install-info">
                        <strong>Date:</strong> ${formattedDate} ${install.installTime ? `at ${install.installTime}` : ''}
                    </div>
                    <div class="install-info">
                        <strong>Location:</strong> ${install.installAddress}
                    </div>
                    ${install.jamboxId ? `<div class="install-info"><strong>JamBox ID:</strong> ${install.jamboxId}</div>` : ''}
                    <div class="install-info">
                        <strong>SSID:</strong> ${install.ssid}
                    </div>
                    ${install.deviceTested ? '<div class="install-info" style="color: var(--datajam-pink);">✓ Device tested</div>' : ''}
                    ${install.networkVerified ? '<div class="install-info" style="color: var(--datajam-pink);">✓ Network verified</div>' : ''}
                    ${photoHTML}
                </div>
                <div class="install-card-actions">
                    <button class="btn-small btn-view" onclick="listManager.viewDetails(${install.id})">View Details</button>
                    <button class="btn-small btn-print" onclick="listManager.printReport(${install.id})">Print Report</button>
                    <button class="btn-small btn-print" onclick="listManager.savePDF(${install.id})">Save as PDF</button>
                    <button class="btn-small btn-edit" onclick="listManager.editInstallation(${install.id})">Edit</button>
                    <button class="btn-small btn-delete" onclick="listManager.deleteInstallation(${install.id})">Delete</button>
                </div>
            </div>
        `;
    }

    async viewDetails(id) {
        const install = this.installations.find(i => i.id === id);
        if (!install) return;

        // Decrypt password for viewing
        const decryptedPassword = await EncryptionUtil.decrypt(install.password || '');

        const photoGallery = install.photos?.length > 0
            ? `<div style="margin-top: 20px;">
                <h3 style="color: var(--datajam-pink); margin-bottom: 12px;">Photos (${install.photos.length})</h3>
                <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 12px;">
                    ${install.photos.map(photo =>
                        `<img src="${photo.data}" alt="Installation photo" style="width: 100%; height: 150px; object-fit: cover; border-radius: 8px; border: 1px solid var(--border-color);">`
                    ).join('')}
                </div>
               </div>`
            : '';

        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 700px; max-height: 90vh; overflow-y: auto;">
                <h2>${install.clientName}</h2>
                <div style="text-align: left; margin-top: 24px; color: var(--text-secondary);">
                    <div style="display: grid; gap: 16px;">
                        ${install.projectName ? `<div><strong style="color: var(--text-primary);">Project:</strong> ${install.projectName}</div>` : ''}
                        <div><strong style="color: var(--text-primary);">Location Type:</strong> ${install.locationType}</div>
                        <div><strong style="color: var(--text-primary);">Address:</strong> ${install.installAddress}</div>
                        ${install.jamboxId ? `<div><strong style="color: var(--text-primary);">JamBox ID:</strong> ${install.jamboxId}</div>` : ''}
                        <div><strong style="color: var(--text-primary);">Date:</strong> ${new Date(install.installDate).toLocaleDateString('en-GB')} ${install.installTime ? `at ${install.installTime}` : ''}</div>

                        <div style="border-top: 1px solid var(--border-color); padding-top: 16px; margin-top: 8px;">
                            <h3 style="color: var(--datajam-pink); margin-bottom: 12px;">Network Details</h3>
                            <div style="display: grid; gap: 12px;">
                                <div><strong style="color: var(--text-primary);">SSID:</strong> ${install.ssid}</div>
                                <div><strong style="color: var(--text-primary);">Password:</strong> ${decryptedPassword}</div>
                                ${install.ipAddress ? `<div><strong style="color: var(--text-primary);">IP Address:</strong> ${install.ipAddress}</div>` : ''}
                            </div>
                        </div>

                        ${install.clientContact || install.clientEmail || install.clientPhone ? `
                            <div style="border-top: 1px solid var(--border-color); padding-top: 16px;">
                                <h3 style="color: var(--datajam-pink); margin-bottom: 12px;">Contact Information</h3>
                                <div style="display: grid; gap: 12px;">
                                    ${install.clientContact ? `<div><strong style="color: var(--text-primary);">Contact:</strong> ${install.clientContact}</div>` : ''}
                                    ${install.clientEmail ? `<div><strong style="color: var(--text-primary);">Email:</strong> ${install.clientEmail}</div>` : ''}
                                    ${install.clientPhone ? `<div><strong style="color: var(--text-primary);">Phone:</strong> ${install.clientPhone}</div>` : ''}
                                </div>
                            </div>
                        ` : ''}

                        ${install.notes ? `
                            <div style="border-top: 1px solid var(--border-color); padding-top: 16px;">
                                <h3 style="color: var(--datajam-pink); margin-bottom: 12px;">Notes</h3>
                                <p>${install.notes}</p>
                            </div>
                        ` : ''}

                        <div style="border-top: 1px solid var(--border-color); padding-top: 16px;">
                            ${install.deviceTested ? '<div style="color: var(--datajam-pink);">✓ Device tested and operational</div>' : ''}
                            ${install.networkVerified ? '<div style="color: var(--datajam-pink);">✓ Network connection verified</div>' : ''}
                        </div>

                        ${photoGallery}
                    </div>
                </div>
                <div class="modal-actions" style="margin-top: 32px;">
                    <button class="btn-secondary" onclick="listManager.printReport(${install.id})">Print Report / Save as PDF</button>
                    <button class="btn-primary" onclick="this.closest('.modal').remove()">Close</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    printReport(id) {
        // Open print preview page in new window
        const printWindow = window.open(`print-preview.html?id=${id}`, '_blank', 'width=1200,height=800');
        if (!printWindow) {
            alert('Please allow popups to view the print preview');
        }
    }

    savePDF(id) {
        // Open print preview window - user can save as PDF from browser
        const printWindow = window.open(`print-preview.html?id=${id}`, '_blank', 'width=800,height=600');

        if (!printWindow) {
            alert('Please allow popups to save as PDF.\n\nAfter allowing popups, a new window will open where you can:\n1. Click Print\n2. Select "Save as PDF" from your printer options\n3. Save the file');
        } else {
            // Show helpful message
            setTimeout(() => {
                alert('Print window opened!\n\nTo save as PDF:\n1. Click the Print button\n2. Select "Save as PDF" or "Microsoft Print to PDF"\n3. Choose where to save');
            }, 500);
        }
    }

    async generatePDF(install) {
        console.log('generatePDF started');

        // Decrypt password
        let decryptedPassword = '';
        try {
            decryptedPassword = await EncryptionUtil.decrypt(install.password || '');
            console.log('Password decrypted successfully');
        } catch (error) {
            console.error('Error decrypting password:', error);
            decryptedPassword = 'Error decrypting';
        }

        const status = install.status || 'completed';
        const statusColors = {
            'scheduled': '#3B82F6',
            'in-progress': '#F59E0B',
            'completed': '#14B8A6',
            'issue': '#E62F6E'
        };
        const statusLabels = {
            'scheduled': 'Scheduled',
            'in-progress': 'In Progress',
            'completed': 'Completed',
            'issue': 'Issue/Problem'
        };

        // Create temporary element with report content
        const element = document.createElement('div');
        element.style.padding = '20px';
        element.style.fontFamily = 'Arial, sans-serif';
        element.style.fontSize = '12px';
        element.style.color = '#333';
        element.innerHTML = `
            <div style="text-align: center; border-bottom: 3px solid #E62F6E; padding-bottom: 15px; margin-bottom: 20px;">
                <h1 style="color: #E62F6E; margin: 0 0 8px 0; font-size: 28px;">Installation Report</h1>
                <h2 style="color: #333; margin: 0; font-size: 20px;">${this.escapeHtml(install.clientName || 'N/A')}</h2>
                <div style="margin-top: 8px;">
                    <span style="background: ${statusColors[status]}; color: white; padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: 500;">
                        ${statusLabels[status]}
                    </span>
                </div>
            </div>

            <div style="margin-bottom: 20px;">
                <h3 style="color: #E94B52; font-size: 16px; margin-bottom: 10px; border-bottom: 2px solid #f0f0f0; padding-bottom: 5px;">General Information</h3>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 6px; background: #f8f8f8; width: 30%; font-weight: 500;">Installation Date</td>
                        <td style="padding: 6px; background: #f8f8f8;">${install.installDate || 'N/A'} ${install.installTime || ''}</td>
                    </tr>
                    ${install.projectName ? `
                    <tr>
                        <td style="padding: 6px; width: 30%; font-weight: 500;">Project</td>
                        <td style="padding: 6px;">${this.escapeHtml(install.projectName)}</td>
                    </tr>
                    ` : ''}
                    <tr>
                        <td style="padding: 6px; background: #f8f8f8; width: 30%; font-weight: 500;">Venue Name</td>
                        <td style="padding: 6px; background: #f8f8f8;">${this.escapeHtml(install.clientName || 'N/A')}</td>
                    </tr>
                    <tr>
                        <td style="padding: 6px; width: 30%; font-weight: 500;">Location Type</td>
                        <td style="padding: 6px;">${this.escapeHtml(install.locationType || 'N/A')}</td>
                    </tr>
                    <tr>
                        <td style="padding: 6px; background: #f8f8f8; width: 30%; font-weight: 500;">Address</td>
                        <td style="padding: 6px; background: #f8f8f8;">${this.escapeHtml(install.installAddress || 'N/A')}</td>
                    </tr>
                </table>
            </div>

            <div style="margin-bottom: 20px;">
                <h3 style="color: #E94B52; font-size: 16px; margin-bottom: 10px; border-bottom: 2px solid #f0f0f0; padding-bottom: 5px;">JamBox Device</h3>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 6px; background: #f8f8f8; width: 30%; font-weight: 500;">JamBox ID</td>
                        <td style="padding: 6px; background: #f8f8f8;">${this.escapeHtml(install.jamboxId || 'N/A')}</td>
                    </tr>
                    ${install.ipAddress ? `
                    <tr>
                        <td style="padding: 6px; width: 30%; font-weight: 500;">IP Address</td>
                        <td style="padding: 6px;">${this.escapeHtml(install.ipAddress)}</td>
                    </tr>
                    ` : ''}
                    <tr>
                        <td style="padding: 6px; ${install.ipAddress ? 'background: #f8f8f8;' : ''} width: 30%; font-weight: 500;">Device Tested</td>
                        <td style="padding: 6px; ${install.ipAddress ? 'background: #f8f8f8;' : ''}">${install.deviceTested ? '✓ Yes' : '✗ No'}</td>
                    </tr>
                </table>
            </div>

            <div style="margin-bottom: 20px;">
                <h3 style="color: #E94B52; font-size: 16px; margin-bottom: 10px; border-bottom: 2px solid #f0f0f0; padding-bottom: 5px;">Network Configuration</h3>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 6px; background: #f8f8f8; width: 30%; font-weight: 500;">WiFi SSID</td>
                        <td style="padding: 6px; background: #f8f8f8;">${this.escapeHtml(install.ssid || 'N/A')}</td>
                    </tr>
                    <tr>
                        <td style="padding: 6px; width: 30%; font-weight: 500;">WiFi Password</td>
                        <td style="padding: 6px;">${this.escapeHtml(decryptedPassword || 'N/A')}</td>
                    </tr>
                    <tr>
                        <td style="padding: 6px; background: #f8f8f8; width: 30%; font-weight: 500;">Network Verified</td>
                        <td style="padding: 6px; background: #f8f8f8;">${install.networkVerified ? '✓ Yes' : '✗ No'}</td>
                    </tr>
                </table>
            </div>

            ${install.clientContact || install.clientEmail || install.clientPhone ? `
            <div style="margin-bottom: 20px;">
                <h3 style="color: #E94B52; font-size: 16px; margin-bottom: 10px; border-bottom: 2px solid #f0f0f0; padding-bottom: 5px;">Contact Information</h3>
                <table style="width: 100%; border-collapse: collapse;">
                    ${install.clientContact ? `
                    <tr>
                        <td style="padding: 6px; background: #f8f8f8; width: 30%; font-weight: 500;">Contact Person</td>
                        <td style="padding: 6px; background: #f8f8f8;">${this.escapeHtml(install.clientContact)}</td>
                    </tr>
                    ` : ''}
                    ${install.clientEmail ? `
                    <tr>
                        <td style="padding: 6px; ${install.clientContact ? '' : 'background: #f8f8f8;'} width: 30%; font-weight: 500;">Email</td>
                        <td style="padding: 6px; ${install.clientContact ? '' : 'background: #f8f8f8;'}">${this.escapeHtml(install.clientEmail)}</td>
                    </tr>
                    ` : ''}
                    ${install.clientPhone ? `
                    <tr>
                        <td style="padding: 6px; ${(install.clientContact && install.clientEmail) || (!install.clientContact && !install.clientEmail) ? 'background: #f8f8f8;' : ''} width: 30%; font-weight: 500;">Phone</td>
                        <td style="padding: 6px; ${(install.clientContact && install.clientEmail) || (!install.clientContact && !install.clientEmail) ? 'background: #f8f8f8;' : ''}">${this.escapeHtml(install.clientPhone)}</td>
                    </tr>
                    ` : ''}
                </table>
            </div>
            ` : ''}

            ${install.notes ? `
            <div style="margin-bottom: 20px;">
                <h3 style="color: #E94B52; font-size: 16px; margin-bottom: 10px; border-bottom: 2px solid #f0f0f0; padding-bottom: 5px;">Installation Notes</h3>
                <div style="padding: 10px; background: #f8f8f8; border-radius: 4px; white-space: pre-wrap;">
                    ${this.escapeHtml(install.notes)}
                </div>
            </div>
            ` : ''}

            <div style="text-align: center; margin-top: 30px; padding-top: 15px; border-top: 2px solid #f0f0f0; color: #666; font-size: 10px;">
                <p style="margin: 3px 0;">DataJam Installation Report - Generated ${new Date().toLocaleString('en-GB')}</p>
                <p style="margin: 3px 0;">Report ID: ${install.id}</p>
            </div>
        `;

        // PDF options
        const opt = {
            margin: 10,
            filename: `DataJam-Installation-${install.clientName?.replace(/[^a-z0-9]/gi, '-') || install.id}-${new Date().toISOString().split('T')[0]}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, logging: false },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        // Generate PDF
        try {
            console.log('Starting PDF generation with options:', opt);
            console.log('Using html2pdf version:', typeof html2pdf);
            await html2pdf().set(opt).from(element).save();
            console.log('PDF generated successfully!');
        } catch (error) {
            console.error('PDF generation error:', error);
            alert('Error generating PDF: ' + error.message + '\n\nCheck browser console for details.');
        }
    }

    editInstallation(id) {
        // Redirect to form page with edit mode parameter
        window.location.href = `index.html?edit=${id}`;
    }

    deleteInstallation(id) {
        if (!confirm('Are you sure you want to delete this installation record?')) {
            return;
        }

        this.installations = this.installations.filter(i => i.id !== id);
        StorageUtil.safeSet('datajam_installations', JSON.stringify(this.installations));
        this.renderInstallations();
    }

    exportData() {
        const dataStr = JSON.stringify(this.installations, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `datajam-installations-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        URL.revokeObjectURL(url);
    }

    async exportCSV() {
        if (this.installations.length === 0) {
            alert('No installations to export');
            return;
        }

        const headers = [
            'Status', 'Date', 'Time', 'Project', 'Venue', 'Contact', 'Email', 'Phone',
            'Location Type', 'Address', 'JamBox ID', 'SSID', 'Password',
            'IP Address', 'Device Tested', 'Network Verified', 'Notes', 'Photo Count'
        ];

        // Decrypt passwords for export
        const rows = await Promise.all(this.installations.map(async install => {
            const decryptedPassword = await EncryptionUtil.decrypt(install.password || '');

            return [
                install.status || 'completed',
                install.installDate,
                install.installTime || '',
                install.projectName || '',
                install.clientName,
                install.clientContact || '',
                install.clientEmail || '',
                install.clientPhone || '',
                install.locationType,
                install.installAddress.replace(/\n/g, ' '),
                install.jamboxId || '',
                install.ssid,
                decryptedPassword,
                install.ipAddress || '',
                install.deviceTested ? 'Yes' : 'No',
                install.networkVerified ? 'Yes' : 'No',
                (install.notes || '').replace(/\n/g, ' '),
                install.photos?.length || 0
            ];
        }));

        // Properly escape CSV cells (fix quote escaping bug)
        const escapeCsvCell = (cell) => {
            const cellStr = String(cell);
            // Escape double quotes by doubling them
            const escaped = cellStr.replace(/"/g, '""');
            // Wrap in quotes if contains comma, quote, or newline
            if (escaped.includes(',') || escaped.includes('"') || escaped.includes('\n')) {
                return `"${escaped}"`;
            }
            return escaped;
        };

        const csvContent = [
            headers.map(escapeCsvCell).join(','),
            ...rows.map(row => row.map(escapeCsvCell).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `datajam-installations-${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    }

    clearAll() {
        if (!confirm('Are you sure you want to delete ALL installation records? This cannot be undone.')) {
            return;
        }

        if (!confirm('This will permanently delete all data. Are you absolutely sure?')) {
            return;
        }

        localStorage.removeItem('datajam_installations');
        this.installations = [];
        this.renderInstallations();
    }
}

// ========================================
// INVENTORY MANAGER
// ========================================
class InventoryManager {
    constructor() {
        this.inventory = this.loadInventory();
        this.shipments = this.loadShipments();
        this.history = this.loadHistory();
        this.jamboxRegistry = this.loadJamboxRegistry();
        this.init();
    }

    loadInventory() {
        const data = localStorage.getItem('datajam_inventory');
        return data ? JSON.parse(data) : { jambox: 0, cable: 0 };
    }

    loadShipments() {
        const data = localStorage.getItem('datajam_shipments');
        return data ? JSON.parse(data) : [];
    }

    loadHistory() {
        const data = localStorage.getItem('datajam_inventory_history');
        return data ? JSON.parse(data) : [];
    }

    loadJamboxRegistry() {
        const data = localStorage.getItem('datajam_jambox_registry');
        return data ? JSON.parse(data) : [];
    }

    saveInventory() {
        StorageUtil.safeSet('datajam_inventory', JSON.stringify(this.inventory));
        // Sync cable stock to Supabase
        this.syncCableStockToSupabase();
    }

    saveShipments() {
        StorageUtil.safeSet('datajam_shipments', JSON.stringify(this.shipments));
        // Sync shipments to Supabase
        this.syncShipmentsToSupabase();
    }

    saveHistory() {
        StorageUtil.safeSet('datajam_inventory_history', JSON.stringify(this.history));
        // Note: History syncs individually when entries are added
    }

    saveJamboxRegistry() {
        StorageUtil.safeSet('datajam_jambox_registry', JSON.stringify(this.jamboxRegistry));
        // Sync JamBox registry to Supabase
        this.syncJamboxRegistryToSupabase();
    }

    // ========================================
    // SUPABASE SYNC METHODS
    // ========================================

    async syncCableStockToSupabase() {
        if (typeof db === 'undefined' || !db.initialized) return;
        try {
            await db.updateCableStock(this.inventory.cable);
            console.log('[Inventory] Cable stock synced to Supabase');
        } catch (err) {
            console.error('[Inventory] Cable stock sync failed:', err);
        }
    }

    async syncShipmentsToSupabase() {
        if (typeof db === 'undefined' || !db.initialized) return;
        try {
            // Sync all shipments
            for (const shipment of this.shipments) {
                await db.saveInventoryShipment(shipment);
            }
            console.log('[Inventory] Shipments synced to Supabase');
        } catch (err) {
            console.error('[Inventory] Shipments sync failed:', err);
        }
    }

    async syncJamboxRegistryToSupabase() {
        if (typeof db === 'undefined' || !db.initialized) return;
        try {
            await db.saveJamboxRegistry(this.jamboxRegistry);
            console.log('[Inventory] JamBox registry synced to Supabase');
        } catch (err) {
            console.error('[Inventory] JamBox registry sync failed:', err);
        }
    }

    async syncHistoryEntryToSupabase(entry) {
        if (typeof db === 'undefined' || !db.initialized) return;
        try {
            await db.addInventoryHistoryEntry(entry);
            console.log('[Inventory] History entry synced to Supabase');
        } catch (err) {
            console.error('[Inventory] History entry sync failed:', err);
        }
    }

    async loadFromSupabase() {
        if (typeof db === 'undefined') {
            console.log('[Inventory] Supabase not available, using localStorage');
            return false;
        }

        try {
            // Wait for db to be initialized
            if (!db.initialized) {
                await db.init();
            }

            console.log('[Inventory] Loading data from Supabase...');
            const cloudData = await db.loadInventoryFromSupabase();

            if (cloudData) {
                // Merge cloud data with local - cloud takes priority if newer
                if (cloudData.jamboxRegistry && cloudData.jamboxRegistry.length > 0) {
                    this.jamboxRegistry = cloudData.jamboxRegistry;
                    StorageUtil.safeSet('datajam_jambox_registry', JSON.stringify(this.jamboxRegistry));
                    console.log('[Inventory] Loaded', this.jamboxRegistry.length, 'JamBoxes from Supabase');
                }

                if (cloudData.cableStock !== undefined && cloudData.cableStock > 0) {
                    this.inventory.cable = cloudData.cableStock;
                    StorageUtil.safeSet('datajam_inventory', JSON.stringify(this.inventory));
                    console.log('[Inventory] Loaded cable stock from Supabase:', cloudData.cableStock);
                }

                if (cloudData.shipments && cloudData.shipments.length > 0) {
                    this.shipments = cloudData.shipments;
                    StorageUtil.safeSet('datajam_shipments', JSON.stringify(this.shipments));
                    console.log('[Inventory] Loaded', this.shipments.length, 'shipments from Supabase');
                }

                if (cloudData.history && cloudData.history.length > 0) {
                    this.history = cloudData.history;
                    StorageUtil.safeSet('datajam_inventory_history', JSON.stringify(this.history));
                    console.log('[Inventory] Loaded', this.history.length, 'history entries from Supabase');
                }

                return true;
            }
        } catch (err) {
            console.error('[Inventory] Failed to load from Supabase:', err);
        }

        return false;
    }

    init() {
        // Initial render with localStorage data
        this.updateStats();
        this.setupTabSwitching();
        this.setupForms();
        this.setupJamboxRegistry();
        this.renderShipments();
        this.renderHistory();
        this.renderJamboxRegistry();

        // Load from Supabase in background (will update UI when data arrives)
        this.loadFromSupabase().then(loaded => {
            if (loaded) {
                // Re-render UI with cloud data
                this.updateStats();
                this.renderShipments();
                this.renderHistory();
                this.renderJamboxRegistry();
                console.log('[Inventory] UI refreshed with Supabase data');
            }
        });
    }

    updateStats() {
        // Calculate JamBox stats from registry (not old inventory)
        const inStockCount = this.getJamboxesByStatus('in_stock').length;
        const shippedCount = this.getJamboxesByStatus('shipped').length;
        const installedCount = this.jamboxRegistry.filter(jb => jb.status === 'installed' || jb.status === 'active').length;

        // Calculate total deployed from installations
        const installations = JSON.parse(localStorage.getItem('datajam_installations') || '[]');
        const deployed = installations.length;

        // Update stat cards
        const jamboxStock = document.getElementById('jamboxStock');
        const cableStock = document.getElementById('cableStock');
        const activeShipments = document.getElementById('activeShipments');
        const totalDeployed = document.getElementById('totalDeployed');

        // Low stock thresholds
        const LOW_STOCK_THRESHOLD = 10;
        const jamboxLow = inStockCount < LOW_STOCK_THRESHOLD;
        const cableLow = this.inventory.cable < LOW_STOCK_THRESHOLD;

        if (jamboxStock) {
            // Show In Stock count with breakdown if registry has data
            if (this.jamboxRegistry.length > 0) {
                jamboxStock.innerHTML = `${inStockCount} <span style="font-size: 12px; font-weight: normal; opacity: 0.8;">in stock</span>`;
            } else {
                // Fall back to old inventory if registry is empty (backwards compatibility)
                jamboxStock.textContent = this.inventory.jambox;
            }
            jamboxStock.style.color = jamboxLow ? '#E62F6E' : '';
        }
        if (cableStock) {
            cableStock.textContent = this.inventory.cable;
            cableStock.style.color = cableLow ? '#E62F6E' : '';
        }
        if (activeShipments) activeShipments.textContent = this.shipments.filter(s => s.status === 'active').length;
        if (totalDeployed) totalDeployed.textContent = deployed;

        // Also update registry stats if on registry tab
        this.updateRegistryStats();

        // Show low stock warning
        this.showLowStockWarning(jamboxLow, cableLow);
    }

    showLowStockWarning(jamboxLow, cableLow) {
        // Remove existing warning
        const existingWarning = document.querySelector('.low-stock-warning');
        if (existingWarning) existingWarning.remove();

        if (!jamboxLow && !cableLow) return;

        // Create warning banner
        const warning = document.createElement('div');
        warning.className = 'low-stock-warning';
        warning.style.cssText = `
            background: linear-gradient(135deg, rgba(230, 47, 110, 0.1) 0%, rgba(233, 75, 82, 0.1) 100%);
            border: 2px solid var(--datajam-pink);
            border-radius: 8px;
            padding: 16px 20px;
            margin-bottom: 24px;
            display: flex;
            align-items: center;
            gap: 12px;
            animation: pulseWarning 2s ease-in-out infinite;
        `;

        let warningText = '⚠️ Low Stock Alert: ';
        const items = [];
        if (jamboxLow) items.push(`JamBox stock is low (${this.inventory.jambox} remaining)`);
        if (cableLow) items.push(`Cable stock is low (${this.inventory.cable} remaining)`);
        warningText += items.join(' and ');

        warning.innerHTML = `
            <div style="flex: 1;">
                <div style="font-weight: 500; color: var(--datajam-pink); font-size: 16px;">${warningText}</div>
                <div style="font-size: 14px; color: var(--text-secondary); margin-top: 4px;">Please reorder stock to avoid installation delays.</div>
            </div>
            <button onclick="this.closest('.low-stock-warning').remove()" style="background: none; border: none; color: var(--text-secondary); cursor: pointer; font-size: 24px; padding: 0; line-height: 1;">&times;</button>
        `;

        // Insert at top of main content
        const mainContent = document.querySelector('.main-content');
        if (mainContent && mainContent.firstChild) {
            mainContent.insertBefore(warning, mainContent.firstChild);
        }
    }

    setupTabSwitching() {
        const tabs = document.querySelectorAll('.inventory-tab');
        const contents = document.querySelectorAll('.tab-content');

        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                // Remove active class from all tabs and contents
                tabs.forEach(t => t.classList.remove('active'));
                contents.forEach(c => c.classList.remove('active'));

                // Add active class to clicked tab
                tab.classList.add('active');

                // Show corresponding content
                const targetTab = tab.getAttribute('data-tab');
                const targetContent = document.getElementById(`${targetTab}Tab`);
                if (targetContent) {
                    targetContent.classList.add('active');
                }

                // Refresh JamBox selector when switching to Shipments tab
                if (targetTab === 'shipments') {
                    this.renderJamboxSelector();
                }
            });
        });
    }

    setupForms() {
        // Add stock form
        const addStockForm = document.getElementById('addStockForm');
        if (addStockForm) {
            addStockForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleAddStock();
            });
        }

        // Remove stock form
        const removeStockForm = document.getElementById('removeStockForm');
        if (removeStockForm) {
            removeStockForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleRemoveStock();
            });
        }

        // Shipment form
        const shipmentForm = document.getElementById('shipmentForm');
        if (shipmentForm) {
            shipmentForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleCreateShipment();
            });
        }

        // Destination dropdown change handler
        const shipDestination = document.getElementById('shipDestination');
        const customDestinationGroup = document.getElementById('customDestinationGroup');
        if (shipDestination && customDestinationGroup) {
            shipDestination.addEventListener('change', (e) => {
                if (e.target.value === '__custom__') {
                    customDestinationGroup.style.display = 'block';
                    document.getElementById('customDestination').required = true;
                } else {
                    customDestinationGroup.style.display = 'none';
                    document.getElementById('customDestination').required = false;
                    document.getElementById('customDestination').value = '';
                }
            });
        }

        // JamBox selector for shipments
        this.setupJamboxSelector();

        // Export CSV button
        const exportBtn = document.getElementById('exportInventoryCSV');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportCSV());
        }

        // Clear history button
        const clearBtn = document.getElementById('clearInventoryHistory');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearHistory());
        }
    }

    handleAddStock() {
        const type = document.getElementById('stockType').value;
        const quantity = parseInt(document.getElementById('stockQuantity').value);
        const notes = document.getElementById('stockNotes').value;

        if (!type || !quantity || quantity < 1) {
            alert('Please fill in all required fields');
            return;
        }

        // Update inventory
        this.inventory[type] += quantity;
        this.saveInventory();

        // Add to history
        const historyEntry = {
            id: Date.now(),
            timestamp: new Date().toISOString(),
            type: type,
            action: 'add',
            quantity: quantity,
            notes: notes,
            user: SessionManager.getCurrentUser() || 'Alex'
        };
        this.history.unshift(historyEntry);
        this.saveHistory();
        this.syncHistoryEntryToSupabase(historyEntry);

        // Update UI
        this.updateStats();
        this.renderHistory();

        // Reset form
        document.getElementById('addStockForm').reset();

        alert(`Successfully added ${quantity} ${type === 'jambox' ? 'JamBox device(s)' : 'cable(s)'} to stock`);
    }

    handleRemoveStock() {
        const type = document.getElementById('removeType').value;
        const quantity = parseInt(document.getElementById('removeQuantity').value);
        const reason = document.getElementById('removeReason').value;
        const notes = document.getElementById('removeNotes').value;

        if (!type || !quantity || quantity < 1 || !reason) {
            alert('Please fill in all required fields');
            return;
        }

        // Check if enough stock available
        if (this.inventory[type] < quantity) {
            alert(`Not enough stock. Current ${type} stock: ${this.inventory[type]}`);
            return;
        }

        // Update inventory
        this.inventory[type] -= quantity;
        this.saveInventory();

        // Add to history
        const historyEntry = {
            id: Date.now(),
            timestamp: new Date().toISOString(),
            type: type,
            action: 'remove',
            quantity: quantity,
            reason: reason,
            notes: notes,
            user: SessionManager.getCurrentUser() || 'Alex'
        };
        this.history.unshift(historyEntry);
        this.saveHistory();
        this.syncHistoryEntryToSupabase(historyEntry);

        // Update UI
        this.updateStats();
        this.renderHistory();

        // Reset form
        document.getElementById('removeStockForm').reset();

        alert(`Successfully removed ${quantity} ${type === 'jambox' ? 'JamBox device(s)' : 'cable(s)'} from stock`);
    }

    handleCreateShipment() {
        let destination = document.getElementById('shipDestination').value;
        const date = document.getElementById('shipDate').value;
        const selectedJamboxIds = this.getSelectedJamboxIds();
        const jamboxQty = selectedJamboxIds.length;
        const cableQty = parseInt(document.getElementById('shipCableQty').value) || 0;
        const notes = document.getElementById('shipNotes').value;

        // Use custom destination if "Other" is selected
        if (destination === '__custom__') {
            const customDestination = document.getElementById('customDestination').value.trim();
            if (!customDestination) {
                alert('Please enter a custom destination');
                return;
            }
            destination = customDestination;
        }

        if (!destination || !date) {
            alert('Please fill in destination and date');
            return;
        }

        if (jamboxQty === 0 && cableQty === 0) {
            alert('Please select at least one JamBox or specify cables to ship');
            return;
        }

        // Check cable stock availability
        if (this.inventory.cable < cableQty) {
            alert(`Not enough cable stock. Available: ${this.inventory.cable}`);
            return;
        }

        // Deduct cables from inventory (JamBoxes are tracked individually)
        this.inventory.cable -= cableQty;
        this.saveInventory();

        // Update each selected JamBox status to "shipped"
        selectedJamboxIds.forEach(jamboxId => {
            this.updateJamboxStatus(jamboxId, 'shipped', {
                destination: destination,
                date: date
            });
        });

        // Create shipment with JamBox IDs
        const shipment = {
            id: Date.now(),
            destination: destination,
            date: date,
            jamboxIds: selectedJamboxIds,  // Array of specific IDs
            jamboxQty: jamboxQty,          // Keep for backwards compatibility
            cableQty: cableQty,
            notes: notes,
            status: 'active',
            createdAt: new Date().toISOString()
        };
        this.shipments.unshift(shipment);
        this.saveShipments();

        // Add to history
        if (jamboxQty > 0) {
            const jamboxHistoryEntry = {
                id: Date.now(),
                timestamp: new Date().toISOString(),
                type: 'jambox',
                action: 'ship',
                quantity: jamboxQty,
                jamboxIds: selectedJamboxIds,
                destination: destination,
                notes: `Shipped JamBoxes: ${selectedJamboxIds.join(', ')}${notes ? ' - ' + notes : ''}`,
                user: SessionManager.getCurrentUser() || 'Alex'
            };
            this.history.unshift(jamboxHistoryEntry);
            this.syncHistoryEntryToSupabase(jamboxHistoryEntry);
        }
        if (cableQty > 0) {
            const cableHistoryEntry = {
                id: Date.now() + 1,
                timestamp: new Date().toISOString(),
                type: 'cable',
                action: 'ship',
                quantity: cableQty,
                destination: destination,
                notes: notes,
                user: SessionManager.getCurrentUser() || 'Alex'
            };
            this.history.unshift(cableHistoryEntry);
            this.syncHistoryEntryToSupabase(cableHistoryEntry);
        }
        this.saveHistory();

        // Update UI
        this.updateStats();
        this.renderShipments();
        this.renderHistory();
        this.renderJamboxRegistry();
        this.renderJamboxSelector();  // Refresh selector to remove shipped items

        // Reset form
        document.getElementById('shipmentForm').reset();
        this.updateSelectedJamboxCount();

        // Reset select all button text
        const selectAllBtn = document.getElementById('selectAllJamboxes');
        if (selectAllBtn) selectAllBtn.textContent = 'Select All';

        const jamboxList = jamboxQty > 0 ? `\nJamBoxes: ${selectedJamboxIds.join(', ')}` : '';
        alert(`Shipment created successfully!\n${jamboxQty} JamBox(es) and ${cableQty} cable(s) shipped to ${destination}${jamboxList}`);
    }

    renderShipments() {
        const grid = document.getElementById('shipmentsGrid');
        if (!grid) return;

        const activeShipments = this.shipments.filter(s => s.status === 'active');

        if (activeShipments.length === 0) {
            grid.innerHTML = '<p style="color: var(--text-secondary); text-align: center; padding: 40px;">No active shipments</p>';
            return;
        }

        grid.innerHTML = activeShipments.map(shipment => {
            const jamboxIdsList = shipment.jamboxIds && shipment.jamboxIds.length > 0
                ? shipment.jamboxIds.join(', ')
                : `${shipment.jamboxQty} unit(s)`;
            return `
            <div class="install-card">
                <div class="install-card-header">
                    <h3>${this.escapeHtml(shipment.destination)}</h3>
                    <span class="status-badge" style="background: #14B8A6; color: white;">
                        Active
                    </span>
                </div>
                <div class="install-card-body">
                    <div class="install-info">📅 ${shipment.date}</div>
                    <div class="install-info">📦 <strong>${shipment.jamboxQty || (shipment.jamboxIds ? shipment.jamboxIds.length : 0)}</strong> JamBox(es)${shipment.jamboxIds && shipment.jamboxIds.length > 0 ? `<br><span style="font-size: 12px; color: var(--text-secondary); margin-left: 20px;">${this.escapeHtml(jamboxIdsList)}</span>` : ''}</div>
                    <div class="install-info">🔌 ${shipment.cableQty} Cable(s)</div>
                    ${shipment.notes ? `<div class="install-info">📝 ${this.escapeHtml(shipment.notes)}</div>` : ''}
                </div>
                <div class="install-card-actions">
                    <button class="btn-small btn-primary" onclick="inventoryManager.markDelivered(${shipment.id})">Mark as Delivered</button>
                    <button class="btn-small btn-delete" onclick="inventoryManager.deleteShipment(${shipment.id})">Delete</button>
                </div>
            </div>
        `}).join('');

        // Also render delivered shipments
        this.renderDeliveredShipments();
    }

    renderDeliveredShipments() {
        const grid = document.getElementById('deliveredGrid');
        if (!grid) return;

        const deliveredShipments = this.shipments.filter(s => s.status === 'delivered');

        if (deliveredShipments.length === 0) {
            grid.innerHTML = '<p style="color: var(--text-secondary); text-align: center; padding: 40px;">No delivered shipments</p>';
            return;
        }

        grid.innerHTML = deliveredShipments.map(shipment => {
            const jamboxIdsList = shipment.jamboxIds && shipment.jamboxIds.length > 0
                ? shipment.jamboxIds.join(', ')
                : `${shipment.jamboxQty} unit(s)`;
            return `
            <div class="install-card">
                <div class="install-card-header">
                    <h3>${this.escapeHtml(shipment.destination)}</h3>
                    <span class="status-badge" style="background: #4ECDC4; color: white;">
                        Delivered
                    </span>
                </div>
                <div class="install-card-body">
                    <div class="install-info">📅 Shipped: ${shipment.date}</div>
                    ${shipment.deliveredAt ? `<div class="install-info">✅ Delivered: ${new Date(shipment.deliveredAt).toLocaleDateString('en-GB')}</div>` : ''}
                    <div class="install-info">📦 <strong>${shipment.jamboxQty || (shipment.jamboxIds ? shipment.jamboxIds.length : 0)}</strong> JamBox(es)${shipment.jamboxIds && shipment.jamboxIds.length > 0 ? `<br><span style="font-size: 12px; color: var(--text-secondary); margin-left: 20px;">${this.escapeHtml(jamboxIdsList)}</span>` : ''}</div>
                    <div class="install-info">🔌 ${shipment.cableQty} Cable(s)</div>
                    ${shipment.notes ? `<div class="install-info">📝 ${this.escapeHtml(shipment.notes)}</div>` : ''}
                </div>
                <div class="install-card-actions">
                    <button class="btn-small btn-delete" onclick="inventoryManager.deleteShipment(${shipment.id})">Delete</button>
                </div>
            </div>
        `}).join('');
    }

    markDelivered(id) {
        const shipment = this.shipments.find(s => s.id === id);
        if (shipment) {
            shipment.status = 'delivered';
            shipment.deliveredAt = new Date().toISOString();
            this.saveShipments();
            this.updateStats();
            this.renderShipments();
            alert('Shipment marked as delivered');
        }
    }

    deleteShipment(id) {
        if (!confirm('Delete this shipment record?')) return;

        this.shipments = this.shipments.filter(s => s.id !== id);
        this.saveShipments();
        this.updateStats();
        this.renderShipments();
    }

    renderHistory() {
        const list = document.getElementById('historyList');
        if (!list) return;

        if (this.history.length === 0) {
            list.innerHTML = '<p style="color: var(--text-secondary); text-align: center; padding: 40px;">No history yet</p>';
            return;
        }

        list.innerHTML = `
            <table style="width: 100%; border-collapse: collapse; background: var(--bg-secondary); border-radius: 8px; overflow: hidden;">
                <thead style="background: var(--bg-primary); border-bottom: 2px solid var(--border-color);">
                    <tr>
                        <th style="padding: 12px; text-align: left;">Date</th>
                        <th style="padding: 12px; text-align: left;">Action</th>
                        <th style="padding: 12px; text-align: left;">Item</th>
                        <th style="padding: 12px; text-align: right;">Quantity</th>
                        <th style="padding: 12px; text-align: left;">Details</th>
                        <th style="padding: 12px; text-align: left;">User</th>
                    </tr>
                </thead>
                <tbody>
                    ${this.history.map((entry, idx) => `
                        <tr style="border-bottom: 1px solid var(--border-color); ${idx % 2 === 0 ? 'background: var(--bg-primary);' : ''}">
                            <td style="padding: 12px;">${new Date(entry.timestamp).toLocaleString('en-GB')}</td>
                            <td style="padding: 12px;">
                                <span style="padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 500;
                                    background: ${entry.action === 'add' ? '#14B8A6' : entry.action === 'remove' ? '#E62F6E' : '#F59E0B'};
                                    color: white;">
                                    ${entry.action.toUpperCase()}
                                </span>
                            </td>
                            <td style="padding: 12px;">${entry.type === 'jambox' ? '📦 JamBox' : '🔌 Cable'}</td>
                            <td style="padding: 12px; text-align: right; font-weight: 500;">${entry.quantity}</td>
                            <td style="padding: 12px;">
                                ${entry.destination ? `🚚 ${this.escapeHtml(entry.destination)}` : ''}
                                ${entry.reason ? `${this.escapeHtml(entry.reason)}` : ''}
                                ${entry.notes ? `<br><small style="color: var(--text-secondary);">${this.escapeHtml(entry.notes)}</small>` : ''}
                            </td>
                            <td style="padding: 12px;">${entry.user}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    exportCSV() {
        const headers = ['Date', 'Action', 'Item Type', 'Quantity', 'Destination', 'Reason', 'Notes', 'User'];
        const rows = this.history.map(entry => [
            new Date(entry.timestamp).toLocaleString('en-GB'),
            entry.action,
            entry.type,
            entry.quantity,
            entry.destination || '',
            entry.reason || '',
            entry.notes || '',
            entry.user
        ]);

        const escapeCsvCell = (cellStr) => {
            if (cellStr === null || cellStr === undefined) return '';
            cellStr = String(cellStr);
            const escaped = cellStr.replace(/"/g, '""');
            if (escaped.includes(',') || escaped.includes('"') || escaped.includes('\n')) {
                return `"${escaped}"`;
            }
            return escaped;
        };

        const csvContent = [
            headers.map(escapeCsvCell).join(','),
            ...rows.map(row => row.map(escapeCsvCell).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `datajam-inventory-history-${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    }

    clearHistory() {
        if (!confirm('Clear all inventory history? This cannot be undone.')) return;

        this.history = [];
        this.saveHistory();
        this.renderHistory();
        alert('History cleared');
    }

    // ========================================
    // JAMBOX SELECTOR FOR SHIPMENTS
    // ========================================

    setupJamboxSelector() {
        const selectAllBtn = document.getElementById('selectAllJamboxes');
        if (selectAllBtn) {
            selectAllBtn.addEventListener('click', () => this.toggleSelectAllJamboxes());
        }

        // Initial render of selector
        this.renderJamboxSelector();
    }

    renderJamboxSelector() {
        const container = document.getElementById('jamboxSelectorList');
        const noJamboxesMsg = document.getElementById('noJamboxesAvailable');
        if (!container) return;

        const inStockJamboxes = this.getJamboxesByStatus('in_stock');

        if (inStockJamboxes.length === 0) {
            container.innerHTML = '';
            if (noJamboxesMsg) noJamboxesMsg.style.display = 'block';
            this.updateSelectedJamboxCount();
            return;
        }

        if (noJamboxesMsg) noJamboxesMsg.style.display = 'none';

        container.innerHTML = inStockJamboxes.map(jb => `
            <label style="display: flex; align-items: center; gap: 10px; padding: 8px; margin: 4px 0; background: var(--bg-secondary); border-radius: 6px; cursor: pointer; transition: background 0.2s;">
                <input type="checkbox" class="jambox-ship-checkbox" value="${this.escapeHtml(jb.id)}" style="width: 18px; height: 18px; accent-color: #E62F6E;">
                <span style="font-weight: 500;">${this.escapeHtml(jb.id)}</span>
                <span style="color: var(--text-secondary); font-size: 12px; margin-left: auto;">
                    Added ${jb.addedDate}${jb.notes ? ` - ${this.escapeHtml(jb.notes.substring(0, 30))}${jb.notes.length > 30 ? '...' : ''}` : ''}
                </span>
            </label>
        `).join('');

        // Add change listeners to update count
        container.querySelectorAll('.jambox-ship-checkbox').forEach(cb => {
            cb.addEventListener('change', () => this.updateSelectedJamboxCount());
        });
    }

    updateSelectedJamboxCount() {
        const checkboxes = document.querySelectorAll('.jambox-ship-checkbox:checked');
        const countEl = document.getElementById('selectedJamboxCount');
        const hiddenQty = document.getElementById('shipJamboxQty');

        if (countEl) countEl.textContent = checkboxes.length;
        if (hiddenQty) hiddenQty.value = checkboxes.length;
    }

    toggleSelectAllJamboxes() {
        const checkboxes = document.querySelectorAll('.jambox-ship-checkbox');
        const allChecked = Array.from(checkboxes).every(cb => cb.checked);

        checkboxes.forEach(cb => {
            cb.checked = !allChecked;
        });

        this.updateSelectedJamboxCount();

        // Update button text
        const btn = document.getElementById('selectAllJamboxes');
        if (btn) {
            btn.textContent = allChecked ? 'Select All' : 'Deselect All';
        }
    }

    getSelectedJamboxIds() {
        const checkboxes = document.querySelectorAll('.jambox-ship-checkbox:checked');
        return Array.from(checkboxes).map(cb => cb.value);
    }

    // ========================================
    // JAMBOX REGISTRY METHODS
    // ========================================

    setupJamboxRegistry() {
        // Add JamBox button
        const addBtn = document.getElementById('addJamboxBtn');
        const addForm = document.getElementById('addJamboxForm');
        const cancelBtn = document.getElementById('cancelAddJambox');
        const jamboxForm = document.getElementById('jamboxForm');

        // Bulk Add button
        const bulkAddBtn = document.getElementById('bulkAddJamboxBtn');
        const bulkAddForm = document.getElementById('bulkAddJamboxForm');
        const cancelBulkBtn = document.getElementById('cancelBulkAddJambox');
        const bulkJamboxForm = document.getElementById('bulkJamboxForm');
        const bulkIdsTextarea = document.getElementById('bulkJamboxIds');

        if (addBtn && addForm) {
            addBtn.addEventListener('click', () => {
                addForm.style.display = 'block';
                addBtn.style.display = 'none';
                if (bulkAddBtn) bulkAddBtn.style.display = 'none';
                if (bulkAddForm) bulkAddForm.style.display = 'none';
                document.getElementById('jamboxId').focus();
            });
        }

        if (cancelBtn && addForm && addBtn) {
            cancelBtn.addEventListener('click', () => {
                addForm.style.display = 'none';
                addBtn.style.display = 'inline-flex';
                if (bulkAddBtn) bulkAddBtn.style.display = 'inline-flex';
                jamboxForm.reset();
            });
        }

        if (jamboxForm) {
            jamboxForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleAddJambox();
            });
        }

        // Bulk Add handlers
        if (bulkAddBtn && bulkAddForm) {
            bulkAddBtn.addEventListener('click', () => {
                bulkAddForm.style.display = 'block';
                bulkAddBtn.style.display = 'none';
                if (addBtn) addBtn.style.display = 'none';
                if (addForm) addForm.style.display = 'none';
                bulkIdsTextarea?.focus();
            });
        }

        if (cancelBulkBtn && bulkAddForm) {
            cancelBulkBtn.addEventListener('click', () => {
                bulkAddForm.style.display = 'none';
                if (bulkAddBtn) bulkAddBtn.style.display = 'inline-flex';
                if (addBtn) addBtn.style.display = 'inline-flex';
                bulkJamboxForm?.reset();
                this.updateBulkIdCount();
            });
        }

        if (bulkJamboxForm) {
            bulkJamboxForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleBulkAddJambox();
            });
        }

        // Live count of IDs in bulk textarea
        if (bulkIdsTextarea) {
            bulkIdsTextarea.addEventListener('input', () => this.updateBulkIdCount());
        }

        // Filter and search
        const filterSelect = document.getElementById('registryFilter');
        const searchInput = document.getElementById('registrySearch');

        if (filterSelect) {
            filterSelect.addEventListener('change', () => this.renderJamboxRegistry());
        }

        if (searchInput) {
            searchInput.addEventListener('input', () => this.renderJamboxRegistry());
        }
    }

    updateBulkIdCount() {
        const textarea = document.getElementById('bulkJamboxIds');
        const countEl = document.getElementById('bulkIdCount');
        if (!textarea || !countEl) return;

        const ids = textarea.value.split('\n').map(id => id.trim()).filter(id => id.length > 0);
        const count = ids.length;

        if (count > 500) {
            countEl.innerHTML = `<span style="color: #E62F6E;">${count} IDs entered - Maximum 500 allowed!</span>`;
        } else if (count > 0) {
            countEl.innerHTML = `<span style="color: #14B8A6;">${count} ID${count !== 1 ? 's' : ''} entered</span>`;
        } else {
            countEl.textContent = '0 IDs entered';
        }
    }

    handleBulkAddJambox() {
        const idsText = document.getElementById('bulkJamboxIds').value;
        const status = document.getElementById('bulkJamboxStatus').value;
        const notes = document.getElementById('bulkJamboxNotes').value.trim();

        // Parse IDs - one per line, trim whitespace, filter empty
        const ids = idsText.split('\n')
            .map(id => id.trim())
            .filter(id => id.length > 0);

        if (ids.length === 0) {
            alert('Please enter at least one JamBox ID');
            return;
        }

        if (ids.length > 500) {
            alert(`Too many IDs (${ids.length}). Maximum is 500 at a time.`);
            return;
        }

        // Check for duplicates in input
        const uniqueIds = [...new Set(ids)];
        const duplicatesInInput = ids.length - uniqueIds.length;

        // Check for existing IDs in registry
        const existingIds = uniqueIds.filter(id =>
            this.jamboxRegistry.some(jb => jb.id.toLowerCase() === id.toLowerCase())
        );

        if (existingIds.length > 0) {
            const proceed = confirm(
                `${existingIds.length} ID(s) already exist in the registry:\n${existingIds.slice(0, 10).join(', ')}${existingIds.length > 10 ? '...' : ''}\n\nDo you want to skip these and add the rest?`
            );
            if (!proceed) return;
        }

        // Filter to only new IDs
        const newIds = uniqueIds.filter(id =>
            !this.jamboxRegistry.some(jb => jb.id.toLowerCase() === id.toLowerCase())
        );

        if (newIds.length === 0) {
            alert('All IDs already exist in the registry. No new devices added.');
            return;
        }

        // Add all new JamBoxes
        const today = new Date().toISOString().split('T')[0];
        const now = new Date().toISOString();

        newIds.forEach(id => {
            this.jamboxRegistry.push({
                id: id,
                status: status,
                addedDate: today,
                shippedTo: null,
                shippedDate: null,
                installedAt: null,
                installedDate: null,
                notes: notes,
                lastUpdated: now
            });
        });

        this.saveJamboxRegistry();

        // Add to history
        this.history.unshift({
            id: Date.now(),
            timestamp: now,
            type: 'jambox',
            action: 'add',
            quantity: newIds.length,
            notes: `Bulk added ${newIds.length} JamBox(es)${notes ? ': ' + notes : ''}`,
            user: SessionManager.getCurrentUser() || 'Alex'
        });
        this.saveHistory();

        // Update UI
        this.renderJamboxRegistry();
        this.updateStats();

        // Reset and hide form
        document.getElementById('bulkJamboxForm').reset();
        document.getElementById('bulkAddJamboxForm').style.display = 'none';
        document.getElementById('addJamboxBtn').style.display = 'inline-flex';
        document.getElementById('bulkAddJamboxBtn').style.display = 'inline-flex';
        this.updateBulkIdCount();

        // Show summary
        let message = `Successfully added ${newIds.length} JamBox(es) to registry!`;
        if (duplicatesInInput > 0) {
            message += `\n\nNote: ${duplicatesInInput} duplicate(s) in your input were ignored.`;
        }
        if (existingIds.length > 0) {
            message += `\n${existingIds.length} existing ID(s) were skipped.`;
        }
        alert(message);
    }

    handleAddJambox() {
        const id = document.getElementById('jamboxId').value.trim();
        const status = document.getElementById('jamboxStatus').value;
        const notes = document.getElementById('jamboxNotes').value.trim();

        if (!id) {
            alert('Please enter a JamBox ID');
            return;
        }

        // Check for duplicate ID
        if (this.jamboxRegistry.some(jb => jb.id.toLowerCase() === id.toLowerCase())) {
            alert(`JamBox ${id} already exists in the registry`);
            return;
        }

        // Create new JamBox entry
        const jambox = {
            id: id,
            status: status,
            addedDate: new Date().toISOString().split('T')[0],
            shippedTo: null,
            shippedDate: null,
            installedAt: null,
            installedDate: null,
            notes: notes,
            lastUpdated: new Date().toISOString()
        };

        this.jamboxRegistry.push(jambox);
        this.saveJamboxRegistry();

        // Add to history
        this.history.unshift({
            id: Date.now(),
            timestamp: new Date().toISOString(),
            type: 'jambox',
            action: 'add',
            quantity: 1,
            jamboxId: id,
            notes: `Added JamBox ${id} to registry (${status})`,
            user: SessionManager.getCurrentUser() || 'Alex'
        });
        this.saveHistory();

        // Update UI
        this.renderJamboxRegistry();
        this.renderHistory();
        this.updateStats();

        // Reset and hide form
        document.getElementById('jamboxForm').reset();
        document.getElementById('addJamboxForm').style.display = 'none';
        document.getElementById('addJamboxBtn').style.display = 'inline-flex';

        alert(`JamBox ${id} added to registry`);
    }

    updateJamboxStatus(jamboxId, newStatus, details = {}) {
        const jambox = this.jamboxRegistry.find(jb => jb.id === jamboxId);
        if (!jambox) return false;

        const oldStatus = jambox.status;
        jambox.status = newStatus;
        jambox.lastUpdated = new Date().toISOString();

        // Update additional fields based on status
        if (newStatus === 'shipped' && details.destination) {
            jambox.shippedTo = details.destination;
            jambox.shippedDate = details.date || new Date().toISOString().split('T')[0];
        } else if (newStatus === 'installed' && details.installationId) {
            jambox.installedAt = details.installationId;
            jambox.installedDate = details.date || new Date().toISOString().split('T')[0];
        } else if (newStatus === 'in_stock') {
            // Reset shipping/installation data when returned to stock
            jambox.shippedTo = null;
            jambox.shippedDate = null;
            jambox.installedAt = null;
            jambox.installedDate = null;
        }

        if (details.notes) {
            jambox.notes = details.notes;
        }

        this.saveJamboxRegistry();

        // Add to history
        this.history.unshift({
            id: Date.now(),
            timestamp: new Date().toISOString(),
            type: 'jambox',
            action: 'status_change',
            quantity: 1,
            jamboxId: jamboxId,
            notes: `Status changed: ${oldStatus} → ${newStatus}${details.destination ? ` (${details.destination})` : ''}`,
            user: SessionManager.getCurrentUser() || 'Alex'
        });
        this.saveHistory();

        this.renderJamboxRegistry();
        this.renderHistory();
        return true;
    }

    getJamboxesByStatus(status) {
        if (status === 'all') return this.jamboxRegistry;
        return this.jamboxRegistry.filter(jb => jb.status === status);
    }

    getJamboxById(id) {
        return this.jamboxRegistry.find(jb => jb.id === id);
    }

    renderJamboxRegistry() {
        const tbody = document.getElementById('registryTableBody');
        const emptyMsg = document.getElementById('emptyRegistryMessage');
        if (!tbody) return;

        // Get filter and search values
        const filterValue = document.getElementById('registryFilter')?.value || 'all';
        const searchValue = document.getElementById('registrySearch')?.value.toLowerCase() || '';

        // Filter jamboxes
        let filtered = this.getJamboxesByStatus(filterValue);
        if (searchValue) {
            filtered = filtered.filter(jb =>
                jb.id.toLowerCase().includes(searchValue) ||
                (jb.shippedTo && jb.shippedTo.toLowerCase().includes(searchValue)) ||
                (jb.notes && jb.notes.toLowerCase().includes(searchValue))
            );
        }

        // Update registry stats
        this.updateRegistryStats();

        // Show/hide empty message
        if (emptyMsg) {
            emptyMsg.style.display = filtered.length === 0 ? 'block' : 'none';
        }

        if (filtered.length === 0) {
            tbody.innerHTML = '';
            return;
        }

        // Sort by last updated (most recent first)
        filtered.sort((a, b) => new Date(b.lastUpdated) - new Date(a.lastUpdated));

        tbody.innerHTML = filtered.map(jb => {
            const statusColors = {
                'in_stock': { bg: '#6B728020', color: '#6B7280', label: 'In Stock' },
                'shipped': { bg: '#F59E0B20', color: '#F59E0B', label: 'Shipped' },
                'installed': { bg: '#3B82F620', color: '#3B82F6', label: 'Installed' },
                'active': { bg: '#10B98120', color: '#10B981', label: 'Active' },
                'faulty': { bg: '#E62F6E20', color: '#E62F6E', label: 'Faulty' }
            };
            const status = statusColors[jb.status] || statusColors['in_stock'];
            const location = jb.shippedTo || 'Warehouse';
            const lastUpdated = new Date(jb.lastUpdated).toLocaleDateString('en-GB', {
                day: '2-digit', month: 'short', year: 'numeric'
            });

            return `
                <tr style="border-bottom: 1px solid var(--border-color);">
                    <td style="padding: 12px 16px; font-weight: 500;">${this.escapeHtml(jb.id)}</td>
                    <td style="padding: 12px 16px;">
                        <span style="padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 500; background: ${status.bg}; color: ${status.color};">
                            ${status.label}
                        </span>
                    </td>
                    <td style="padding: 12px 16px; color: var(--text-secondary);">${this.escapeHtml(location)}</td>
                    <td style="padding: 12px 16px; color: var(--text-secondary); font-size: 13px;">${lastUpdated}</td>
                    <td style="padding: 12px 16px; text-align: right;">
                        <button onclick="inventoryManager.showJamboxEditModal('${jb.id}')"
                                style="padding: 6px 12px; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 6px; color: var(--text-primary); cursor: pointer; font-size: 13px;">
                            Edit
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    updateRegistryStats() {
        const total = this.jamboxRegistry.length;
        const inStock = this.jamboxRegistry.filter(jb => jb.status === 'in_stock').length;
        const shipped = this.jamboxRegistry.filter(jb => jb.status === 'shipped').length;
        const installed = this.jamboxRegistry.filter(jb => jb.status === 'installed' || jb.status === 'active').length;
        const faulty = this.jamboxRegistry.filter(jb => jb.status === 'faulty').length;

        const els = {
            totalJamboxes: document.getElementById('totalJamboxes'),
            inStockJamboxes: document.getElementById('inStockJamboxes'),
            shippedJamboxes: document.getElementById('shippedJamboxes'),
            installedJamboxes: document.getElementById('installedJamboxes'),
            faultyJamboxes: document.getElementById('faultyJamboxes')
        };

        if (els.totalJamboxes) els.totalJamboxes.textContent = total;
        if (els.inStockJamboxes) els.inStockJamboxes.textContent = inStock;
        if (els.shippedJamboxes) els.shippedJamboxes.textContent = shipped;
        if (els.installedJamboxes) els.installedJamboxes.textContent = installed;
        if (els.faultyJamboxes) els.faultyJamboxes.textContent = faulty;

        // Also update the main stat card
        const jamboxStock = document.getElementById('jamboxStock');
        if (jamboxStock) {
            jamboxStock.textContent = inStock;
        }
    }

    showJamboxEditModal(jamboxId) {
        const jb = this.getJamboxById(jamboxId);
        if (!jb) return;

        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.8); display: flex; align-items: center;
            justify-content: center; z-index: 1000;
        `;

        modal.innerHTML = `
            <div style="background: var(--bg-secondary); border-radius: 16px; padding: 32px; max-width: 500px; width: 90%; max-height: 90vh; overflow-y: auto;">
                <h2 style="margin-bottom: 24px; color: var(--datajam-pink);">Edit JamBox: ${this.escapeHtml(jb.id)}</h2>
                <form id="editJamboxForm">
                    <div class="form-group" style="margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 8px; color: var(--text-secondary);">Status</label>
                        <select id="editJamboxStatus" style="width: 100%; padding: 12px; border-radius: 8px; background: var(--bg-card); border: 1px solid var(--border-color); color: var(--text-primary);">
                            <option value="in_stock" ${jb.status === 'in_stock' ? 'selected' : ''}>In Stock</option>
                            <option value="shipped" ${jb.status === 'shipped' ? 'selected' : ''}>Shipped</option>
                            <option value="installed" ${jb.status === 'installed' ? 'selected' : ''}>Installed</option>
                            <option value="active" ${jb.status === 'active' ? 'selected' : ''}>Active</option>
                            <option value="faulty" ${jb.status === 'faulty' ? 'selected' : ''}>Faulty</option>
                        </select>
                    </div>
                    <div class="form-group" style="margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 8px; color: var(--text-secondary);">Location / Shipped To</label>
                        <input type="text" id="editJamboxLocation" value="${this.escapeHtml(jb.shippedTo || '')}"
                               placeholder="Project or client name"
                               style="width: 100%; padding: 12px; border-radius: 8px; background: var(--bg-card); border: 1px solid var(--border-color); color: var(--text-primary);">
                    </div>
                    <div class="form-group" style="margin-bottom: 24px;">
                        <label style="display: block; margin-bottom: 8px; color: var(--text-secondary);">Notes</label>
                        <textarea id="editJamboxNotes" rows="3"
                                  style="width: 100%; padding: 12px; border-radius: 8px; background: var(--bg-card); border: 1px solid var(--border-color); color: var(--text-primary); resize: vertical;">${this.escapeHtml(jb.notes || '')}</textarea>
                    </div>
                    <div style="display: flex; gap: 12px;">
                        <button type="submit" class="btn-primary" style="flex: 1;">Save Changes</button>
                        <button type="button" class="btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
                        <button type="button" class="btn-delete" onclick="inventoryManager.deleteJambox('${jb.id}')">Delete</button>
                    </div>
                </form>
            </div>
        `;

        document.body.appendChild(modal);

        // Close on backdrop click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });

        // Handle form submit
        document.getElementById('editJamboxForm').addEventListener('submit', (e) => {
            e.preventDefault();
            const newStatus = document.getElementById('editJamboxStatus').value;
            const location = document.getElementById('editJamboxLocation').value.trim();
            const notes = document.getElementById('editJamboxNotes').value.trim();

            this.updateJamboxStatus(jamboxId, newStatus, {
                destination: location,
                notes: notes
            });

            modal.remove();
            alert('JamBox updated successfully');
        });
    }

    deleteJambox(jamboxId) {
        if (!confirm(`Are you sure you want to delete JamBox ${jamboxId}? This cannot be undone.`)) return;

        const index = this.jamboxRegistry.findIndex(jb => jb.id === jamboxId);
        if (index === -1) return;

        this.jamboxRegistry.splice(index, 1);
        this.saveJamboxRegistry();

        // Add to history
        this.history.unshift({
            id: Date.now(),
            timestamp: new Date().toISOString(),
            type: 'jambox',
            action: 'remove',
            quantity: 1,
            jamboxId: jamboxId,
            notes: `Deleted JamBox ${jamboxId} from registry`,
            user: SessionManager.getCurrentUser() || 'Alex'
        });
        this.saveHistory();

        // Close modal if open
        const modal = document.querySelector('.modal-overlay');
        if (modal) modal.remove();

        this.renderJamboxRegistry();
        this.renderHistory();
        this.updateStats();

        alert(`JamBox ${jamboxId} has been deleted`);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize appropriate manager based on page
let installManager;
let listManager;
let inventoryManager;

document.addEventListener('DOMContentLoaded', () => {
    // Check authentication first (except on login page)
    checkAuthOnLoad();

    if (document.getElementById('installForm')) {
        installManager = new InstallationManager();
    }

    if (document.getElementById('installGrid')) {
        listManager = new InstallationListManager();
    }

    if (document.getElementById('jamboxStock')) {
        inventoryManager = new InventoryManager();
    }

    // Global fix: Ensure sidebar "New Install" links work on all pages
    // Use absolute path to bypass Netlify's Pretty URLs transformation
    document.querySelectorAll('.sidebar a[href*="index.html"]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('[Nav] Navigating to /installation/index.html');
            window.location.href = '/installation/index.html';
        });
    });
});
