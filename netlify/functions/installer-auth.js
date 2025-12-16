// Installer Authentication via DataJam Portal API
// v2.0.0 - Added Pulse Reports access gate before DataJam API validation
// Authenticates installer users against the DataJam Portal
// BUT first checks Pulse Reports for installer_access permission

const https = require('https');

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
 */
function validateDataJamCredentials(auth, corsHeaders, clientIP) {
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
    }, 15000); // 15 second timeout

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

          // Parse response to get user info
          let userProjects = [];
          try {
            userProjects = JSON.parse(data);
          } catch (e) {
            userProjects = [];
          }

          resolve({
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({
              success: true,
              message: 'Authentication successful',
              projects: userProjects
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
      console.error('[INSTALLER-AUTH] DataJam connection error:', error.message);
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
    console.log(`[INSTALLER-AUTH] Access GRANTED, validating credentials against DataJam Portal`);
    return await validateDataJamCredentials(auth, corsHeaders, clientIP);

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
