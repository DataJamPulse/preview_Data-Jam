// Session Manager - HTTP-only Cookie Sessions with JWT
// v1.0.0 - Server-side session validation to prevent localStorage spoofing
// Uses signed JWT tokens in HTTP-only cookies for security

const crypto = require('crypto');

// Session configuration
const SESSION_CONFIG = {
  COOKIE_NAME: 'dj_session',
  EXPIRY_HOURS: 8,
  COOKIE_PATH: '/'  // Must be / to include /.netlify/functions/ paths
};

// Get session secret from environment variable
function getSessionSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    console.error('[SESSION] WARNING: SESSION_SECRET not configured, using fallback');
    // Fallback for development - MUST set SESSION_SECRET in production
    return 'datajam-dev-secret-change-in-production-2024';
  }
  return secret;
}

// Base64URL encode (JWT-safe base64)
function base64UrlEncode(str) {
  return Buffer.from(str)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

// Base64URL decode
function base64UrlDecode(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  return Buffer.from(str, 'base64').toString('utf-8');
}

// Create HMAC-SHA256 signature
function createSignature(data, secret) {
  return crypto
    .createHmac('sha256', secret)
    .update(data)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

// Generate JWT token
function createJWT(payload, secret) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = createSignature(`${encodedHeader}.${encodedPayload}`, secret);
  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

// Verify and decode JWT token
function verifyJWT(token, secret) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return { valid: false, error: 'Invalid token format' };
    }

    const [encodedHeader, encodedPayload, signature] = parts;

    // Verify signature
    const expectedSignature = createSignature(`${encodedHeader}.${encodedPayload}`, secret);
    if (signature !== expectedSignature) {
      return { valid: false, error: 'Invalid signature' };
    }

    // Decode payload
    const payload = JSON.parse(base64UrlDecode(encodedPayload));

    // Check expiry
    if (payload.exp && Date.now() > payload.exp) {
      return { valid: false, error: 'Token expired' };
    }

    return { valid: true, payload };
  } catch (e) {
    return { valid: false, error: 'Token decode failed' };
  }
}

// Generate CSRF token
function generateCsrfToken() {
  return crypto.randomBytes(32).toString('hex');
}

// Parse cookies from header
function parseCookies(cookieHeader) {
  const cookies = {};
  if (!cookieHeader) return cookies;

  cookieHeader.split(';').forEach(cookie => {
    const [name, ...rest] = cookie.trim().split('=');
    if (name && rest.length) {
      cookies[name] = rest.join('=');
    }
  });

  return cookies;
}

// Create session cookie header
function createSessionCookie(token, maxAge) {
  const isProduction = process.env.NODE_ENV === 'production' ||
                       process.env.CONTEXT === 'production' ||
                       !process.env.NETLIFY_DEV;

  const cookieOptions = [
    `${SESSION_CONFIG.COOKIE_NAME}=${token}`,
    `Path=${SESSION_CONFIG.COOKIE_PATH}`,
    `Max-Age=${maxAge}`,
    'HttpOnly',
    'SameSite=Strict'
  ];

  // Only add Secure flag in production (HTTPS)
  if (isProduction) {
    cookieOptions.push('Secure');
  }

  return cookieOptions.join('; ');
}

// Create logout cookie (expires immediately)
function createLogoutCookie() {
  return `${SESSION_CONFIG.COOKIE_NAME}=; Path=${SESSION_CONFIG.COOKIE_PATH}; Max-Age=0; HttpOnly; SameSite=Strict`;
}

// Determine if user is admin based on username/email
function determineRole(username) {
  const lowerUsername = (username || '').toLowerCase();
  if (lowerUsername.endsWith('@data-jam.com') || lowerUsername === 'admin') {
    return 'admin';
  }
  return 'installer';
}

// CORS configuration
function getCorsHeaders(event) {
  const allowedOrigins = [
    'https://preview.data-jam.com',
    'https://data-jam.com',
    'https://www.data-jam.com',
    'http://localhost:8888',
    'http://localhost:3000'
  ];

  const requestOrigin = event.headers.origin || event.headers.Origin || '';
  const corsOrigin = allowedOrigins.includes(requestOrigin) ? requestOrigin : 'https://preview.data-jam.com';

  return {
    'Access-Control-Allow-Origin': corsOrigin,
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
    'Vary': 'Origin',
    'Content-Type': 'application/json'
  };
}

exports.handler = async function(event, context) {
  const corsHeaders = getCorsHeaders(event);

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: corsHeaders,
      body: ''
    };
  }

  // Route based on path
  const path = event.path.replace('/.netlify/functions/session-manager', '') || '/';

  // ============================================
  // POST /create - Create new session
  // Called by installer-auth after successful authentication
  // ============================================
  if (event.httpMethod === 'POST' && (path === '/create' || path === '/' || path === '')) {
    try {
      const { username, projects } = JSON.parse(event.body);

      if (!username) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({ error: 'Username required' })
        };
      }

      const secret = getSessionSecret();
      const role = determineRole(username);
      const csrfToken = generateCsrfToken();
      const expiryMs = SESSION_CONFIG.EXPIRY_HOURS * 60 * 60 * 1000;

      // Create JWT payload
      const payload = {
        sub: username,
        role: role,
        projects: projects || [],
        csrf: csrfToken,
        iat: Date.now(),
        exp: Date.now() + expiryMs
      };

      const token = createJWT(payload, secret);
      const maxAgeSeconds = SESSION_CONFIG.EXPIRY_HOURS * 60 * 60;

      console.log(`[SESSION] Created session for ${username} (${role})`);

      return {
        statusCode: 200,
        headers: {
          ...corsHeaders,
          'Set-Cookie': createSessionCookie(token, maxAgeSeconds)
        },
        body: JSON.stringify({
          success: true,
          user: {
            username: username,
            role: role,
            projects: projects || []
          },
          csrfToken: csrfToken,
          expiresAt: new Date(Date.now() + expiryMs).toISOString()
        })
      };
    } catch (error) {
      console.error('[SESSION] Create error:', error.message);
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Failed to create session' })
      };
    }
  }

  // ============================================
  // GET /validate - Validate existing session
  // Called on every page load to verify session
  // ============================================
  if (event.httpMethod === 'GET' && (path === '/validate' || path === '/' || path === '')) {
    try {
      const cookies = parseCookies(event.headers.cookie);
      const token = cookies[SESSION_CONFIG.COOKIE_NAME];

      if (!token) {
        return {
          statusCode: 401,
          headers: corsHeaders,
          body: JSON.stringify({
            valid: false,
            error: 'No session found'
          })
        };
      }

      const secret = getSessionSecret();
      const result = verifyJWT(token, secret);

      if (!result.valid) {
        console.log(`[SESSION] Invalid token: ${result.error}`);
        return {
          statusCode: 401,
          headers: {
            ...corsHeaders,
            'Set-Cookie': createLogoutCookie() // Clear invalid cookie
          },
          body: JSON.stringify({
            valid: false,
            error: result.error
          })
        };
      }

      // Token is valid - return user data
      const { sub, role, projects, csrf, exp } = result.payload;

      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          valid: true,
          user: {
            username: sub,
            role: role,
            projects: projects || []
          },
          csrfToken: csrf,
          expiresAt: new Date(exp).toISOString()
        })
      };
    } catch (error) {
      console.error('[SESSION] Validate error:', error.message);
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({ valid: false, error: 'Validation failed' })
      };
    }
  }

  // ============================================
  // POST /logout - Destroy session
  // ============================================
  if (event.httpMethod === 'POST' && path === '/logout') {
    console.log('[SESSION] Logout requested');
    return {
      statusCode: 200,
      headers: {
        ...corsHeaders,
        'Set-Cookie': createLogoutCookie()
      },
      body: JSON.stringify({ success: true, message: 'Logged out' })
    };
  }

  // ============================================
  // POST /verify-csrf - Verify CSRF token
  // Called before sensitive operations
  // ============================================
  if (event.httpMethod === 'POST' && path === '/verify-csrf') {
    try {
      const cookies = parseCookies(event.headers.cookie);
      const token = cookies[SESSION_CONFIG.COOKIE_NAME];
      const { csrfToken } = JSON.parse(event.body);

      if (!token || !csrfToken) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({ valid: false, error: 'Missing token or CSRF' })
        };
      }

      const secret = getSessionSecret();
      const result = verifyJWT(token, secret);

      if (!result.valid) {
        return {
          statusCode: 401,
          headers: corsHeaders,
          body: JSON.stringify({ valid: false, error: 'Invalid session' })
        };
      }

      if (result.payload.csrf !== csrfToken) {
        console.log('[SESSION] CSRF token mismatch');
        return {
          statusCode: 403,
          headers: corsHeaders,
          body: JSON.stringify({ valid: false, error: 'CSRF token mismatch' })
        };
      }

      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({ valid: true })
      };
    } catch (error) {
      console.error('[SESSION] CSRF verify error:', error.message);
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({ valid: false, error: 'Verification failed' })
      };
    }
  }

  // Unknown route
  return {
    statusCode: 404,
    headers: corsHeaders,
    body: JSON.stringify({ error: 'Not found' })
  };
};
