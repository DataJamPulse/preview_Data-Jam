// Installer Authentication via DataJam Portal API
// v3.0.0 - HTTP-only cookie sessions with JWT tokens
// - Added Pulse Reports access gate before DataJam API validation
// - JWT-based sessions stored in HTTP-only cookies (not localStorage)
// - Server-side role determination (admin vs installer)
// - CSRF token generation for form protection

const https = require('https');
const crypto = require('crypto');

// ============================================
// JWT & Session Configuration
// ============================================
const SESSION_CONFIG = {
  COOKIE_NAME: 'dj_session',
  EXPIRY_HOURS: 8,
  COOKIE_PATH: '/'  // Must be / to include /.netlify/functions/ paths
};

// Get session secret from environment variable
function getSessionSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    console.error('[AUTH] WARNING: SESSION_SECRET not configured, using fallback');
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

// Generate CSRF token
function generateCsrfToken() {
  return crypto.randomBytes(32).toString('hex');
}

// Determine role server-side (cannot be spoofed)
function determineRole(username) {
  const lowerUsername = (username || '').toLowerCase();
  if (lowerUsername.endsWith('@data-jam.com') || lowerUsername === 'admin') {
    return 'admin';
  }
  return 'installer';
}

// Create HTTP-only session cookie
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

  if (isProduction) {
    cookieOptions.push('Secure');
  }

  return cookieOptions.join('; ');
}

// Extract projects array from API response (handles nested structure)
function extractProjects(apiResponse) {
  if (Array.isArray(apiResponse)) {
    return apiResponse;
  }
  if (apiResponse && Array.isArray(apiResponse.projects)) {
    return apiResponse.projects;
  }
  if (apiResponse && typeof apiResponse === 'object') {
    const possibleArrays = Object.values(apiResponse).filter(v => Array.isArray(v));
    if (possibleArrays.length > 0) {
      return possibleArrays[0];
    }
  }
  return [];
}

// Pulse Reports API URL for installer access check
const PULSE_REPORTS_API = 'https://datajamreports.com/.netlify/functions/user-management-api';

// In-memory storage for failed login attempts (IP-based tracking)
const loginAttempts = new Map();

// Rate limiting configuration
const RATE_LIMIT = {
  MAX_ATTEMPTS: 5,
  LOCKOUT_DURATION: 15 * 60 * 1000  // 15 minutes
};

// Check if IP is rate limited
function checkRateLimit(ip) {
  const now = Date.now();
  const attempts = loginAttempts.get(ip);

  if (!attempts) {
    return { blocked: false };
  }

  if (now < attempts.lockoutUntil) {
    const remainingMs = attempts.lockoutUntil - now;
    const remainingMinutes = Math.ceil(remainingMs / 60000);
    return {
      blocked: true,
      remainingMs,
      message: `Too many failed login attempts. Please try again in ${remainingMinutes} minute${remainingMinutes > 1 ? 's' : ''}.`
    };
  }

  if (now >= attempts.lockoutUntil && attempts.count >= RATE_LIMIT.MAX_ATTEMPTS) {
    loginAttempts.delete(ip);
    return { blocked: false };
  }

  return { blocked: false };
}

// Record a failed login attempt
function recordFailedAttempt(ip) {
  const now = Date.now();
  const attempts = loginAttempts.get(ip) || { count: 0, lockoutUntil: 0 };

  attempts.count += 1;

  if (attempts.count >= RATE_LIMIT.MAX_ATTEMPTS) {
    attempts.lockoutUntil = now + RATE_LIMIT.LOCKOUT_DURATION;
    console.log(`[SECURITY] IP ${ip} locked out for 15 minutes after ${attempts.count} failed attempts`);
  }

  loginAttempts.set(ip, attempts);
}

// Reset attempts on successful login
function resetAttempts(ip) {
  loginAttempts.delete(ip);
}

/**
 * Check installer access via Pulse Reports API
 * This is the "gate" that must be passed before calling DataJam API
 */
async function checkInstallerAccess(email) {
  return new Promise((resolve) => {
    const url = new URL(`${PULSE_REPORTS_API}/installer-check/${encodeURIComponent(email)}`);

    const options = {
      hostname: url.hostname,
      path: url.pathname,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          console.log(`[INSTALLER-AUTH] Access check for ${email}: ${result.hasAccess ? 'GRANTED' : 'DENIED'} (${result.reason})`);
          resolve(result);
        } catch (e) {
          console.error('[INSTALLER-AUTH] Failed to parse access check response:', e.message);
          resolve({ hasAccess: false, reason: 'parse_error', message: 'Failed to verify access permissions' });
        }
      });
    });

    req.on('error', (error) => {
      console.error('[INSTALLER-AUTH] Access check error:', error.message);
      // If Pulse Reports is down, deny access (fail secure)
      resolve({ hasAccess: false, reason: 'service_unavailable', message: 'Access verification service unavailable' });
    });

    // Timeout after 10 seconds
    req.setTimeout(10000, () => {
      req.destroy();
      console.error('[INSTALLER-AUTH] Access check timeout');
      resolve({ hasAccess: false, reason: 'timeout', message: 'Access verification timed out' });
    });

    req.end();
  });
}

/**
 * Validate credentials against DataJam Portal API
 * On success: generates JWT and sets HTTP-only cookie
 */
function validateDataJamCredentials(auth, corsHeaders, clientIP, username) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'datajamportal.com',
      path: '/CustomerAPI/GetUserProjects/',
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
        'Content-Length': 2
      },
      rejectUnauthorized: false  // Required for DataJam Portal's self-signed cert
    };

    const timeout = setTimeout(() => {
      req.destroy();
      resolve({
        statusCode: 408,
        headers: corsHeaders,
        body: JSON.stringify({
          error: 'API_TIMEOUT',
          message: 'Authentication server timeout. Please try again.'
        })
      });
    }, 25000); // 25 second timeout (DataJam Portal can be slow)

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        clearTimeout(timeout);

        if (res.statusCode === 200) {
          // Successful authentication
          resetAttempts(clientIP);

          // Parse response to get user projects
          let apiResponse = {};
          try {
            apiResponse = JSON.parse(data);
          } catch (e) {
            apiResponse = {};
          }

          // Extract projects array (handles nested structure)
          const projects = extractProjects(apiResponse);

          // Determine role server-side (CRITICAL: cannot be spoofed)
          const role = determineRole(username);

          // Generate CSRF token for form protection
          const csrfToken = generateCsrfToken();

          // Calculate expiry
          const expiryMs = SESSION_CONFIG.EXPIRY_HOURS * 60 * 60 * 1000;
          const maxAgeSeconds = SESSION_CONFIG.EXPIRY_HOURS * 60 * 60;

          // Create JWT payload with all session data
          const jwtPayload = {
            sub: username,
            role: role,
            projects: projects,
            csrf: csrfToken,
            iat: Date.now(),
            exp: Date.now() + expiryMs
          };

          // Generate signed JWT token
          const secret = getSessionSecret();
          const token = createJWT(jwtPayload, secret);

          // Create HTTP-only cookie
          const sessionCookie = createSessionCookie(token, maxAgeSeconds);

          console.log(`[AUTH] Session created for ${username} (role: ${role}, projects: ${projects.length})`);

          resolve({
            statusCode: 200,
            headers: {
              ...corsHeaders,
              'Set-Cookie': sessionCookie
            },
            body: JSON.stringify({
              success: true,
              message: 'Authentication successful',
              user: {
                username: username,
                role: role,
                projects: projects
              },
              csrfToken: csrfToken,
              expiresAt: new Date(Date.now() + expiryMs).toISOString()
            })
          });
        } else if (res.statusCode === 401 || res.statusCode === 403) {
          // Failed authentication
          recordFailedAttempt(clientIP);
          resolve({
            statusCode: 401,
            headers: corsHeaders,
            body: JSON.stringify({
              error: 'AUTH_FAILED',
              message: 'Invalid username or password'
            })
          });
        } else {
          resolve({
            statusCode: res.statusCode,
            headers: corsHeaders,
            body: JSON.stringify({
              error: 'API_ERROR',
              message: 'Authentication service error. Please try again.'
            })
          });
        }
      });
    });

    req.on('error', (error) => {
      clearTimeout(timeout);
      console.error('[AUTH] DataJam connection error:', error.message);
      resolve({
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({
          error: 'CONNECTION_ERROR',
          message: 'Failed to connect to authentication service. Please try again.'
        })
      });
    });

    req.write('{}');
    req.end();
  });
}

exports.handler = async function(event, context) {
  // CORS configuration for installer app
  const allowedOrigins = [
    'https://preview.data-jam.com',
    'https://data-jam.com',
    'https://www.data-jam.com',
    'http://localhost:8888',
    'http://localhost:3000'
  ];

  const requestOrigin = event.headers.origin || event.headers.Origin || '';
  const corsOrigin = allowedOrigins.includes(requestOrigin) ? requestOrigin : 'https://preview.data-jam.com';

  const corsHeaders = {
    'Access-Control-Allow-Origin': corsOrigin,
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
    'Vary': 'Origin',
    'Content-Type': 'application/json'
  };

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: corsHeaders,
      body: ''
    };
  }

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'METHOD_NOT_ALLOWED', message: 'Method not allowed' })
    };
  }

  // Get client IP for rate limiting
  const clientIP = event.headers['x-forwarded-for'] ||
                   event.headers['x-real-ip'] ||
                   event.requestContext?.identity?.sourceIp ||
                   'unknown';

  // Check rate limiting
  const rateLimitCheck = checkRateLimit(clientIP);
  if (rateLimitCheck.blocked) {
    return {
      statusCode: 429,
      headers: {
        ...corsHeaders,
        'Retry-After': Math.ceil(rateLimitCheck.remainingMs / 1000)
      },
      body: JSON.stringify({
        error: 'RATE_LIMITED',
        message: rateLimitCheck.message,
        remainingMs: rateLimitCheck.remainingMs
      })
    };
  }

  try {
    const requestData = JSON.parse(event.body);
    const { auth } = requestData;

    if (!auth) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'MISSING_AUTH', message: 'Authentication credentials required' })
      };
    }

    // Extract username/email from auth header
    let email;
    try {
      const decoded = Buffer.from(auth, 'base64').toString('utf-8');
      email = decoded.split(':')[0];
    } catch (e) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'INVALID_AUTH', message: 'Invalid authentication format' })
      };
    }

    // ============================================
    // GATE 1: Check Pulse Reports for installer access
    // This happens BEFORE calling DataJam API
    // ============================================
    console.log(`[INSTALLER-AUTH] Checking Pulse Reports access for: ${email}`);
    const accessCheck = await checkInstallerAccess(email);

    if (!accessCheck.hasAccess) {
      // Access denied - DO NOT call DataJam API
      console.log(`[INSTALLER-AUTH] Access DENIED for ${email}: ${accessCheck.reason}`);
      recordFailedAttempt(clientIP);
      return {
        statusCode: 403,
        headers: corsHeaders,
        body: JSON.stringify({
          error: 'ACCESS_DENIED',
          reason: accessCheck.reason,
          message: accessCheck.message || 'You do not have permission to access the Installer Portal. Please contact your administrator.'
        })
      };
    }

    // ============================================
    // GATE 2: Validate credentials against DataJam Portal API
    // Only reached if Pulse Reports access is granted
    // ============================================
    console.log(`[AUTH] Access GRANTED for ${email}, validating credentials against DataJam Portal`);
    return await validateDataJamCredentials(auth, corsHeaders, clientIP, email);

  } catch (error) {
    console.error('[INSTALLER-AUTH] Error:', error.message);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        error: 'SERVER_ERROR',
        message: 'An error occurred. Please try again.'
      })
    };
  }
};
