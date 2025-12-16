/**
 * AuthClient - Secure Client-Side Authentication
 * v1.0.0 - HTTP-only cookie sessions with server validation
 *
 * SECURITY: This client validates sessions server-side on every page load.
 * Session data is stored in memory only (not localStorage) and cannot be spoofed.
 *
 * Usage:
 *   await AuthClient.init();  // Call on page load
 *   if (AuthClient.isAuthenticated()) { ... }
 *   if (AuthClient.isAdmin()) { ... }
 *   const user = AuthClient.getUser();
 *   AuthClient.logout();
 */

const AuthClient = (function() {
  // Private state - stored in memory only (not localStorage)
  let _user = null;
  let _csrfToken = null;
  let _expiresAt = null;
  let _initialized = false;
  let _initPromise = null;

  // API endpoints
  const SESSION_API = '/.netlify/functions/session-manager';
  const AUTH_API = '/.netlify/functions/installer-auth';

  /**
   * Initialize authentication - validates session with server
   * Call this on every page load before accessing protected content
   * @returns {Promise<boolean>} true if authenticated, false otherwise
   */
  async function init() {
    // If already initializing, return existing promise
    if (_initPromise) {
      return _initPromise;
    }

    _initPromise = _validateSession();
    const result = await _initPromise;
    _initPromise = null;
    return result;
  }

  /**
   * Validate session with server
   * @private
   */
  async function _validateSession() {
    try {
      const response = await fetch(`${SESSION_API}/validate`, {
        method: 'GET',
        credentials: 'include', // Include HTTP-only cookies
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.valid && data.user) {
          _user = data.user;
          _csrfToken = data.csrfToken;
          _expiresAt = data.expiresAt;
          _initialized = true;
          console.log('[AuthClient] Session validated:', _user.username, '(', _user.role, ')');
          return true;
        }
      }

      // Session invalid or expired
      _clearState();
      console.log('[AuthClient] No valid session');
      return false;
    } catch (error) {
      console.error('[AuthClient] Session validation error:', error.message);
      _clearState();
      return false;
    }
  }

  /**
   * Clear all authentication state
   * @private
   */
  function _clearState() {
    _user = null;
    _csrfToken = null;
    _expiresAt = null;
    _initialized = true; // Mark as initialized even if not authenticated
  }

  /**
   * Check if user is authenticated
   * @returns {boolean}
   */
  function isAuthenticated() {
    return _user !== null;
  }

  /**
   * Check if user is admin (server-validated, cannot be spoofed)
   * @returns {boolean}
   */
  function isAdmin() {
    return _user !== null && _user.role === 'admin';
  }

  /**
   * Get current user object
   * @returns {Object|null} User object with username, role, projects
   */
  function getUser() {
    return _user;
  }

  /**
   * Get username
   * @returns {string|null}
   */
  function getUsername() {
    return _user ? _user.username : null;
  }

  /**
   * Get user role
   * @returns {string|null} 'admin' or 'installer'
   */
  function getRole() {
    return _user ? _user.role : null;
  }

  /**
   * Get user's authorized projects
   * @returns {Array}
   */
  function getProjects() {
    return _user && _user.projects ? _user.projects : [];
  }

  /**
   * Get project names as array of strings
   * @returns {Array<string>}
   */
  function getProjectNames() {
    const projects = getProjects();
    return projects.map(p => {
      if (typeof p === 'string') return p;
      if (p && p.name) return p.name;
      if (p && p.projectName) return p.projectName;
      if (p && p.Name) return p.Name;
      return '';
    }).filter(n => n);
  }

  /**
   * Check if user has access to a specific project
   * Uses flexible matching (exact, contains, partial)
   * @param {string} projectName
   * @returns {boolean}
   */
  function hasProjectAccess(projectName) {
    // Admins have access to all projects
    if (isAdmin()) return true;

    // If no project specified, allow access
    if (!projectName) return true;

    const authorizedNames = getProjectNames();

    // If no authorized projects, deny access
    if (authorizedNames.length === 0) return false;

    // Flexible matching (exact, contains, partial)
    const projectLower = projectName.toLowerCase();
    return authorizedNames.some(name => {
      const authLower = name.toLowerCase();
      if (authLower === projectLower) return true;
      if (authLower.includes(projectLower) || projectLower.includes(authLower)) return true;
      return false;
    });
  }

  /**
   * Get CSRF token for form submissions
   * @returns {string|null}
   */
  function getCsrfToken() {
    return _csrfToken;
  }

  /**
   * Get session expiry time
   * @returns {string|null} ISO date string
   */
  function getExpiresAt() {
    return _expiresAt;
  }

  /**
   * Login with username and password
   * @param {string} username
   * @param {string} password
   * @returns {Promise<Object>} Result object with success, user, or error
   */
  async function login(username, password) {
    try {
      const auth = btoa(`${username}:${password}`);

      const response = await fetch(AUTH_API, {
        method: 'POST',
        credentials: 'include', // Allow server to set cookie
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ auth })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Session cookie is automatically set by browser
        // Store user data in memory
        _user = data.user;
        _csrfToken = data.csrfToken;
        _expiresAt = data.expiresAt;
        _initialized = true;

        console.log('[AuthClient] Login successful:', _user.username);

        return {
          success: true,
          user: _user,
          message: data.message
        };
      } else {
        console.log('[AuthClient] Login failed:', data.message || data.error);
        return {
          success: false,
          error: data.error,
          message: data.message || 'Authentication failed'
        };
      }
    } catch (error) {
      console.error('[AuthClient] Login error:', error.message);
      return {
        success: false,
        error: 'CONNECTION_ERROR',
        message: 'Connection error. Please try again.'
      };
    }
  }

  /**
   * Logout - clears session on server and redirects to login
   * @param {boolean} redirect - Whether to redirect to login page (default: true)
   */
  async function logout(redirect = true) {
    try {
      await fetch(`${SESSION_API}/logout`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });
    } catch (error) {
      console.error('[AuthClient] Logout error:', error.message);
    }

    // Clear local state
    _clearState();

    // Also clear legacy localStorage session if it exists
    try {
      localStorage.removeItem('datajam_session');
    } catch (e) {}

    // Redirect to login page
    if (redirect) {
      window.location.href = 'login.html';
    }
  }

  /**
   * Require authentication - redirects to login if not authenticated
   * Call this at the start of protected pages
   * @returns {Promise<boolean>}
   */
  async function requireAuth() {
    const authenticated = await init();
    if (!authenticated) {
      console.log('[AuthClient] Not authenticated, redirecting to login');
      window.location.href = 'login.html';
      return false;
    }
    return true;
  }

  /**
   * Require admin role - redirects to dashboard if not admin
   * Call this at the start of admin-only pages
   * @returns {Promise<boolean>}
   */
  async function requireAdmin() {
    const authenticated = await requireAuth();
    if (!authenticated) return false;

    if (!isAdmin()) {
      console.log('[AuthClient] Not admin, redirecting to dashboard');
      window.location.href = 'dashboard.html';
      return false;
    }
    return true;
  }

  /**
   * Verify CSRF token before sensitive operation
   * @param {string} token
   * @returns {Promise<boolean>}
   */
  async function verifyCsrf(token) {
    try {
      const response = await fetch(`${SESSION_API}/verify-csrf`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ csrfToken: token })
      });

      const data = await response.json();
      return data.valid === true;
    } catch (error) {
      console.error('[AuthClient] CSRF verify error:', error.message);
      return false;
    }
  }

  /**
   * Check if AuthClient has been initialized
   * @returns {boolean}
   */
  function isInitialized() {
    return _initialized;
  }

  // Public API
  return {
    init,
    isAuthenticated,
    isAdmin,
    getUser,
    getUsername,
    getRole,
    getProjects,
    getProjectNames,
    hasProjectAccess,
    getCsrfToken,
    getExpiresAt,
    login,
    logout,
    requireAuth,
    requireAdmin,
    verifyCsrf,
    isInitialized
  };
})();

// Make available globally
window.AuthClient = AuthClient;
