# Data Jam Website - Claude Context

## Project Overview
Premium marketing website for Data Jam, an **AI-powered movement intelligence platform** transforming how OOH media is measured and valued. Operating in UK and US.

**Live Site:** https://preview.data-jam.com (Netlify auto-deploys from GitHub)
**Repo:** https://github.com/DataJamPulse/preview_Data-Jam

## Company Info
- **UK Phone:** +44 7827 813388
- **US Phone:** (747) 243-3513
- **Email:** arran@data-jam.com
- **Tagline:** "REAL DATA. REAL TIME."

## Core Value Proposition
**IMPORTANT: Focus on IMPRESSIONS and MOVEMENT DATA, not billboards**
- Measures **people movement**, dwell time, and impressions anonymously
- Tracks real-time **impressions** and movement data
- "Movement intelligence platform" - NOT just billboard measurement
- Privacy-first: no cameras, GDPR compliant

## Business Model
- SaaS: $25/device/month (moving to $15 at scale)
- 12-month auto-renew contracts
- Hardware cost: ~$7.50/unit (85%+ gross margin)
- 1,000+ screens live in UK
- £10,000+ MRR (as of May 2025)
- Target: 10,000 devices, $3M+ ARR

## Core Products
1. **JamBox** - Low-cost sensor that counts mobile devices within 300m/950ft range. Plug-and-play, requires only power + WiFi.
2. **Data Jam Portal** - Dashboard with live metrics & API access
3. **Data Jam PULSE** - Next-gen AI platform for human movement insights (Coming 2025)

## Founder
**Arran Javed** - Founder/CEO (California)
- Nearly 2 decades in media and analytics
- Ran OOH for WPP's MediaCom, spending £100m+/year in UK
- Built Data Jam to solve OOH's lack of real-time, transparent data

## Team
- Alex Constantinou - Head Technician (London)
- Rhea Con - Account Director (London)
- Dev Team: Sandeep Mahajan, Harshit Varshenny, Aadarsh Ranjan

## Clients & Partners
**UK:**
- Clear Channel, Ocean, Limited Space, Atmosphere, Smart Outdoor, SDN
- Sports Revolution, Next-Gen Media, eighteen24, ACMS
- Venues: ODEON, Bluewater, Power League, Fitness First, Moto, Morley's, Network Rail, Mercedes

**US:**
- Capitol Outdoor, Heritage Outdoor
- KBH Group, Mass Media Outdoor

## Real Testimonials (from PDF)
1. **Adam Moy, CRO at KBH Group:** "Partnering with Data Jam and integrating the JamBox technology into our cinema inventory will provide us with unprecedented insights into our audience."

2. **Nick Bedford, Co-Managing Director at Limited Space:** "This cutting-edge technology allows us to deliver up-to-the-minute insights into audience behaviour, format performance and retail trends."

3. **Mass Lambresa, CEO at Mass Media Outdoor:** "Our partnership with Data Jam represents a significant step forward in our commitment to delivering innovative and impactful advertising solutions."

4. **Julian Carter, Commercial Director at SDN:** "This partnership enables agencies and clients to include our digital OOH screens into their media mix, reaching huge, verified audiences."

## Tech Stack
- Static HTML/CSS/JS
- Netlify hosting with Netlify Functions
- Supabase for lead capture (shared project with PULSE portal)
- Resend for transactional emails
- GitHub CI/CD auto-deployment
- No build step required

## Key Files
```
/index.html              - Homepage (main marketing page)
/about.html              - About page
/jambox.html             - Product page
/blog.html               - Blog listing
/contact.html            - Contact form (Supabase + email notification)
/contact-success.html    - Form submission success page
/installation.html       - Installer portal placeholder ("A to the Con...")
/privacy.html            - Privacy policy
/css/styles.css          - All styles (dark theme, premium feel)
/js/main.js              - Interactions (splash, cursor, animations, ROI calc)
/netlify.toml            - Security headers (CSP), redirects, caching
/netlify/functions/notify-lead.js - Email notification on new leads
/netlify/functions/installer-auth.js - Installer login via DataJam Portal API
/images/clients/         - Client logos
```

## Brand Colors
- **White:** #FEFAF9
- **Black:** #0A0C11
- **Pink:** #E62F6E
- **Orange:** #E94B52
- **Gradient:** linear-gradient(135deg, #E62F6E, #E94B52)

## Typography
- Headlines: Abeat Regular (logo font only)
- Subheadings: Poppins Medium
- Body: Poppins Light

## Premium Features Implemented
- Splash screen (shows once per session, skippable)
- Custom cursor with hover effects (desktop only)
- Floating particles background
- Scroll progress indicator
- Scroll-triggered animations
- Magnetic button effects
- 3D tilt cards
- Live impressions counter
- ROI Calculator with UK/US currency toggle
- Mobile hamburger menu
- Video hero background
- Client logo marquee
- Cookie consent banner

## AI Search Optimization
Site includes Schema.org structured data and custom meta tags for AI discoverability:
- `ai-content-type`, `ai-industry`, `ai-technology`
- Targets queries around: footfall counting, pedestrian traffic measurement, OOH audience data, movement analytics

## Lead Capture System (Dec 2024)

### Flow
```
Contact Form → Supabase (website_leads) → Netlify Function → Email + HubSpot
```

### Supabase
- **Project:** DataJamPulse (shared with PULSE portal)
- **URL:** https://ysavdqiiilslrigtpacu.supabase.co
- **Table:** `website_leads`
- **RLS Policy:** Anonymous INSERT only (website can add, not read)
- Anon key is in contact.html (safe - RLS restricts access)

### Email Notifications
- **Service:** Resend (resend.com)
- **From:** leads@data-jam.com (avoids spam filters vs hello@)
- **Domain:** data-jam.com (verified with DKIM)
- **Recipients:** arran@data-jam.com, rhea@data-jam.com
- **Function:** `/netlify/functions/notify-lead.js`

### HubSpot Integration (Direct API)
- **Method:** Direct API push via Netlify function (not legacy sync)
- **API Key:** Private App token in Netlify env vars
- **Creates/updates:** Contact with name, email, company, lifecycle stage
- **Custom property:** `marketing_opt_in` (Yes/No) - tracks consent
- Leads appear immediately in HubSpot after form submission

### Marketing Opt-in
- Checkbox on contact form (pre-checked by default)
- Captured in: Supabase, email notification, HubSpot
- HubSpot property: `marketing_opt_in` (custom, single checkbox)

## Installer Portal (Dec 2024)

- **URL:** https://preview.data-jam.com/installation
- **Nav Link:** "Installer" added to main site navigation (JamBox | About | Blog | Contact | **Installer**)
- **Purpose:** Internal tool for Alex to track JamBox sensor installations
- **Login:** DataJam Portal API authentication (same credentials as datajamreports.com)
- **Auth Function:** `/netlify/functions/installer-auth.js` - validates against datajamportal.com
- **Backend:** Supabase PostgreSQL with installer_* tables (for data storage only)
- **Storage:** Supabase Storage bucket `installer-photos` for installation photos
- **Features:** Dashboard, new install form, view/edit/delete installs, inventory management, shipments, projects, user management, settings, calendar view with .ics export and Google Calendar sync
- **Offline:** Sync queue for offline operation (Alex works in basements with poor signal)
- **Note:** Page has `noindex` meta tag - not for public/SEO
- **Design:** Premium dark theme with Abeat font, floating particles, noise texture
- **UI:** Consistent sidebar on all pages with user profile display and logout button

### Installer Authentication (v3.0.0 - Dec 2025)
**Secure HTTP-only cookie sessions with server-side validation:**

**Session Security:**
- JWT tokens stored in HTTP-only cookies (not localStorage - prevents XSS theft)
- Server-side session validation on every page load
- 8-hour session expiry with automatic logout
- SameSite=Strict cookies prevent CSRF attacks
- CSRF tokens embedded in sessions for future server-side operations

**Two-gate authentication system:**
1. **Gate 1 (Pulse Reports):** Checks `installer_access` flag via datajamreports.com API
2. **Gate 2 (DataJam Portal):** Validates credentials against datajamportal.com
3. **Gate 3 (Session):** Server creates signed JWT, sets HTTP-only cookie

**Flow:**
```
User Login → Extract email from auth
           → Call Pulse Reports /installer-check/:email
           → If hasAccess=false → DENY (never calls DataJam API)
           → If hasAccess=true → Validate credentials against DataJam Portal
           → Create JWT with role + projects → Set HTTP-only cookie
           → Return success/failure
```

**Access Control:**
- Managed via Pulse Reports Admin Panel (datajamreports.com)
- Admin Panel → Users → Edit User → "Installer Portal Access" checkbox
- DataJam team (@data-jam.com) auto-granted installer access
- Rate limiting: 5 failed attempts = 15 minute lockout

**Project-Based Access Control (Dec 2025):**
- Users only see projects they have access to (from DataJam Portal API)
- On login, authorized projects stored in session (`session.projects`)
- Project dropdown on new install form shows only authorized projects
- Projects page filters to only show authorized projects
- Installations view filters to only show installations for authorized projects
- Shipment destination dropdown uses authorized projects
- All dropdowns have "Other (Manual Entry)" fallback for flexibility
- SessionManager methods: `getProjects()`, `getProjectNames()`, `hasProjectAccess()`, `isAdmin()`
- **Flexible matching:** partial/contains matching for project names (e.g., "Public" matches "Dallas - Public")
- **Admin-only pages:** Inventory and Users restricted to @data-jam.com emails or 'admin' username
- API response handling: extracts nested `result.projects.projects` array from DataJam Portal

**Technical:**
- Auth function: `/netlify/functions/installer-auth.js` v3.0.0
- Session function: `/netlify/functions/session-manager.js` - JWT creation/validation
- Client auth: `/installation/auth-client.js` - Secure client-side wrapper
- Event handlers: `/installation/event-handlers.js` - Event delegation (replaces inline onclick)
- Pulse Reports endpoint: `GET /user-management-api/installer-check/:email`
- Fails secure: If Pulse Reports is down, access is denied

**XSS Prevention:**
- All 45+ inline onclick handlers replaced with event delegation
- Single event listener routes actions via data-action attributes
- Eliminates major XSS attack vector
- Enables stricter CSP (working toward removing 'unsafe-inline')

### Installer Database Schema
```
installer_users          - App users (separate from Portal users)
installer_projects       - Project list synced from Portal
installer_installations  - Installation records with photos
installer_inventory      - JamBox and cable stock levels
installer_inventory_history - Audit trail of stock changes
installer_shipments      - Shipments to project locations
installer_sync_queue     - Offline sync queue
```

### Synology Folder (KEEP IN SYNC)
**IMPORTANT:** Alex's original development folder must be kept in sync with the deployed version:
```
/Users/jav/Desktop/DATAJAM/SynologyDrive/Alex installer/datajam-installer-webapp/installation_web_app/
```
When making changes to `/installation/` in this repo, copy updated files back to the Synology folder so Alex can continue iterating. Key files:
- `config.js` - Supabase configuration
- `supabase-client.js` - Database client
- All HTML pages with Supabase integration
- `supabase/` folder with SQL schemas

## Environment Variables (Netlify)
```
RESEND_API_KEY=re_xxxxx (for email notifications)
HUBSPOT_API_KEY=pat-xxxxx (Private App token for CRM integration)
SESSION_SECRET=xxxxxx (64-char hex for JWT signing - generate with: openssl rand -hex 32)
```

## Security Headers (netlify.toml)
- Content Security Policy (CSP) - allows Supabase connection
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- XSS Protection enabled
- Referrer-Policy: strict-origin-when-cross-origin

## Security Hardening (Dec 2024)

### Form Security
- **HTML sanitization:** All user inputs escaped before email rendering
- **Input length limits:** Name/company (100), email (254), message (2000)
- **Bot protection:** Forms submitted in <3 seconds silently rejected
- **Honeypot field:** Hidden field catches basic bots
- **Server-side validation:** Netlify function enforces limits as backup

### API Security
- Supabase anon key is public (by design) - RLS restricts to INSERT only
- Resend/HubSpot keys stored in Netlify environment variables (never client-side)
- No debug logging in production functions

## Recent Updates (Dec 2024 - Dec 2025)

### Dec 2025
- **SECURITY HARDENING ATTEMPTED & ROLLED BACK**
  - JWT/HTTP-only cookie implementation caused 502 errors in Netlify functions
  - Reverted to localStorage-based auth (working)
  - Security files created but not in use: session-manager.js, auth-client.js, event-handlers.js
  - Known vulnerabilities to be fixed incrementally (localStorage sessions, client-side role, inline onclick)
- **Installer Portal - Calendar Sync** - .ics export and Google Calendar integration for installation scheduling
- **Flexible project matching** - partial/contains matching for project names (handles API variations)
- **API response fix** - nested project array extraction from DataJam Portal API
- **Client logos sync** - 19 logos in homepage marquee (added c-screens, dunnhumby, gc-media, publicart-white, tesco, vendi-tech)
- **Admin-only access control** - Inventory and Users pages restricted to @data-jam.com emails and 'admin' username
- **Installer Portal - Project Access Control** - users only see projects they're authorized for
- **Two-gate installer auth** - Pulse Reports access check → DataJam Portal validation
- **Installer nav link** - "Installer" added to main site navigation on all pages
- **CSP updates** - added cdnjs.cloudflare.com for html2pdf source maps
- **Dashboard navigation fix** - "New Install" links now use explicit JS click handlers to force navigation (workaround for interference from scripts/extensions)

### Dec 2024
- **HubSpot direct integration** - leads push to CRM immediately via API
- **Marketing opt-in checkbox** - pre-checked, captured in email + HubSpot
- **Security hardening** - HTML sanitization, input limits, bot protection
- **Email sender changed** - now from leads@data-jam.com (better deliverability)
- Splash screen changed to once-per-session (was every visit)
- Installer Login link added to footer on all pages
- Installer placeholder page created (/installation.html)
- Supabase lead capture replaces Netlify Forms as primary
- Email notifications via Resend on new leads
- Security headers added (CSP, etc.)
- Hero video updated to show pedestrian crossing (Mixkit 4401)
- Real testimonials section added (4 quotes from KBH, Limited Space, Mass Media Outdoor, SDN)
- Client logos expanded (Ocean, Limited Space, Atmosphere, Smart Outdoor, KBH, etc.)
- Mobile menu added to all pages
- Messaging updated to focus on "impressions and movement data"

## Related Folders (READ ONLY)
- `/Users/jav/Desktop/datajamreports-production/` - PULSE portal production code. Contains logos, Jammed visuals (neon aesthetic). DO NOT MODIFY - only copy assets if needed.
- `/Users/jav/Downloads/Data Jam  update .pdf` - Business marketing strategy deck with testimonials, stats, team info

## Deployment
Push to `main` branch triggers automatic Netlify deploy. No manual steps needed.

```bash
git add .
git commit -m "Your message"
git push origin main
```
