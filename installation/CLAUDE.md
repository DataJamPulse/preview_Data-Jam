# Data Jam Install Tracker - Project Context

## Project Overview

**App Name:** Data Jam Install Tracker
**Purpose:** Internal tool to track JamBox sensor installations across Out of Home advertising client sites
**Owner:** Data Jam UK (managed by Rhea and Alex)
**Primary User:** Alex (head installer/technician)
**Version:** 1.0 (MVP)
**Status:** Local prototype - testing phase before production deployment

## Recent Updates

**2025-12-15 - DataJam Portal Authentication & Project Access Control:**
- ✅ **LOGIN NOW USES DATAJAM PORTAL CREDENTIALS**
  - No more separate installer account - use your DataJam Portal login
  - Same username/password as datajamreports.com
  - Authentication via Netlify function (`installer-auth.js`)
  - Rate limiting: 5 failed attempts = 15 minute lockout
  - Session stored in localStorage (persists across refreshes)
  - Two-gate authentication: Pulse Reports access check → DataJam Portal validation
- ✅ **PROJECT-BASED ACCESS CONTROL**
  - Users only see projects they have access to (from DataJam Portal API)
  - Project dropdown on new install form shows only authorized projects
  - Projects page filters to only show authorized projects
  - Installations view filters to only show installations for authorized projects
  - Shipment destination dropdown uses authorized projects
  - All dropdowns have "Other (Manual Entry)" fallback option
  - SessionManager methods: getProjects(), getProjectNames(), hasProjectAccess()
- ✅ **DESIGN IMPROVEMENTS**
  - Removed watermark logo background (was too distracting)
  - Premium dark theme with Abeat headline font
  - Floating particles animation on login page
  - Noise texture overlay for premium feel
  - Enhanced button hover effects with glow
- ✅ **UI CONSISTENCY FIXES**
  - Added sidebar-footer with user profile to ALL pages
  - User name and role now displayed in sidebar on every page
  - Logout button available from any page
  - Fixed session error handling (try-catch in getSession)
  - Disabled Supabase realtime subscriptions (not needed, was causing WebSocket errors)

**2025-12-12 - Multi-User System, Enhancements & Project Tracking (Session 3):**
- ✅ **MULTI-USER LOGIN SYSTEM** - Complete authentication
  - New login.html page with professional DataJam branding
  - ~~Default admin account: username `alex`, password `datajam2025`~~ **(NOW USES DATAJAM PORTAL CREDENTIALS)**
  - Session management with localStorage
  - SessionManager utility in app.js for authentication
  - All pages protected - auto-redirect to login if not authenticated
  - User profile section in sidebar with avatar, name, and role
  - Logout button in sidebar footer
  - Session persistence across page refreshes
- ✅ **PROJECT DROPDOWN ON SHIPMENTS** - Organized selection
  - Shipment destination now uses dropdown with all 139 DataJam projects
  - Organized by category: Shopping Centers, Outdoor Media, Gyms, Sports, Pubs, Retail, etc.
  - "Other (Custom)" option for non-listed destinations
  - Shows custom text input when "Other" selected
- ✅ **SHIPMENT-TO-PROJECT TRACKING** - Allocated stock visibility
  - Projects page now shows allocated stock per project
  - "📦 Allocated Stock" section on project cards
  - Displays JamBoxes and Cables shipped to each project
  - Shows number of shipments sent to project
  - Pink-highlighted allocation box on project cards
  - calculateProjectAllocations() method in ProjectManager
  - Links shipments to projects automatically by name matching
- ✅ **LOW STOCK ALERTS** - Proactive inventory management
  - Threshold set at 10 units (LOW_STOCK_THRESHOLD constant)
  - Red text on stock numbers when below threshold
  - Pulsing warning banner at top of Inventory page
  - Shows which items are low (JamBoxes and/or Cables)
  - Dismissible alert with close button
  - Visual animation (@keyframes pulseWarning)
  - Automatic check on every stats update
- ✅ **INSTALLATION CALENDAR VIEW** - Visual scheduling
  - New calendar view toggle on View Installs page
  - Switch between Grid and Calendar views with buttons
  - Full month calendar with color-coded installation dots
  - Status colors: Blue (Scheduled), Orange (In Progress), Teal (Completed), Pink (Issue)
  - Shows installation count per day
  - Month navigation: Prev, Today, Next buttons
  - Today's date highlighted with pink border
  - Click any date to filter installations from that day
  - Responsive calendar grid layout (7 columns for days)
  - Installation dots show up to 3 per day with counts
- ✅ **CSS ENHANCEMENTS**
  - .low-stock-badge styles with pulse animation
  - .view-btn toggle button styles (Grid/Calendar)
  - .install-calendar comprehensive calendar styling
  - .calendar-day with hover effects and status indicators
  - .sidebar-footer user profile section
  - .user-profile, .user-avatar, .logout-btn styling

**2025-12-12 - Print/PDF & Inventory Management Update (Session 2):**
- ✅ **PRINT PREVIEW PAGE** - Dedicated report viewing
  - New print-preview.html for clean installation reports
  - Opens in new window with print-optimized layout
  - Professional formatting with all installation details
  - Print button triggers browser print dialog
- ✅ **PDF GENERATION** - Actual PDF downloads
  - Save as PDF button now generates real PDF files
  - Uses html2pdf.js library (loaded dynamically when needed)
  - Professional table-based layout with DataJam branding
  - Automatic filename: DataJam-Installation-[VenueName]-[Date].pdf
  - Includes all installation data and decrypted WiFi passwords
- ✅ **INVENTORY MANAGEMENT SYSTEM** - Stock tracking & shipments
  - New inventory.html page with full stock management
  - Track JamBox devices and cables separately
  - 4 stat cards: JamBox Stock, Cable Stock, Active Shipments, Total Deployed
  - Three tabs: Stock Management, Shipments, History
  - Add/Remove stock with quantity tracking and notes
  - Remove reasons: Damaged, Lost, Returned to Supplier, Other
  - Full audit history of all stock movements
- ✅ **SHIPPING/ALLOCATION TRACKING** - Where JamBoxes are going
  - Create shipments with destination (e.g., "Sports Revolution")
  - Track JamBox and cable quantities per shipment
  - Shipment dates and notes (tracking numbers, carrier, etc.)
  - Mark shipments as Delivered
  - Active vs Delivered shipment status
  - Automatic inventory deduction when shipment created
  - History shows all shipments with destinations
- ✅ **NAVIGATION UPDATES**
  - Added Inventory tab to all pages (Dashboard, New Install, View Installs, Inventory, Projects)
  - Consistent 5-item navigation across entire app
  - Inventory icon: Package/toolbox SVG

**2025-12-12 - Major Feature Update (4 New Features):**
- ✅ **INSTALLATION STATUS TRACKING** - Complete workflow management
  - Added status field to form: Scheduled, In Progress, Completed, Issue/Problem
  - Color-coded status badges on installation cards
  - Status filter on View Installs page
  - Status included in CSV export and detail views
  - Backward compatible (old installs default to "completed")
- ✅ **SEARCH & FILTER FUNCTIONALITY** - Find installations quickly
  - Real-time search across venues, JamBox IDs, addresses, projects, and notes
  - Status filter dropdown (All Status, Scheduled, In Progress, Completed, Issue)
  - Clear Filters button
  - Result count display: "Showing X of Y installations"
- ✅ **DASHBOARD/HOMEPAGE** - Central hub for overview
  - New dashboard.html as landing page
  - 4 stat cards: Total Installations, JamBoxes Deployed, Active Projects, This Week
  - Recent installations list (last 5) with status badges
  - Quick action buttons (New Install, View All, View Projects)
  - Storage usage indicator with visual progress bar and 80% warning
  - Updated navigation across all pages with Dashboard as first item
- ✅ **PRINT & PDF FUNCTIONALITY** - Professional installation reports
  - Print Report and Save as PDF buttons on each installation card (teal styling)
  - Print-friendly layout with organized sections
  - Professional formatting with DataJam branding
  - Includes all installation data, photos, and metadata
  - Print CSS (@media print) for clean output
  - Browser print-to-PDF support
- ✅ **SECURITY & PERFORMANCE IMPROVEMENTS** (from previous session)
  - WiFi password encryption using Web Crypto API (AES-256-GCM)
  - Photo compression before localStorage storage
  - localStorage error handling with quota warnings
  - Fixed CSV quote escaping bug

**2025-12-10 - Edit Feature & Logo Updates:**
- ✅ **EDIT FUNCTIONALITY ADDED** - Can now edit saved installations
  - Edit button added to each installation card (orange styling)
  - Form auto-populates with existing data when editing
  - Updates preserve original timestamp
  - Success modal shows "Installation Updated!" for edits
  - Smart navigation: returns to installations list after editing
- ✅ **Logo enhancements:**
  - Added pulsing animation to header logo (3s cycle, subtle scale & opacity)
  - Added screen blend mode for logo integration with dark background
  - Updated to logo2.jpeg across all pages and watermark
- ✅ Full CRUD operations now complete (Create, Read, Update, Delete)

**2025-12-10 - UX Enhancements (earlier):**
- ✅ Added project dropdown to Location Details section (pre-populated with current clients)
- ~~✅ Implemented logo watermark background blend~~ **(REMOVED - was too distracting)**
- ✅ Added new location types: Leisure Centre, Nightlife, Pubs
- ✅ Implemented WiFi SSID autocomplete with smart history (remembers last 20 networks)
- ✅ Updated data model to include projectName field
- ✅ Updated CSV export to include project column
- ✅ Enhanced UX with autocomplete suggestions for faster data entry

**2025-12-08 - Latest Changes:**
- ✅ Added actual DataJam logo (logo.jpg) to replace SVG placeholder
- ✅ Fixed critical SVG gradient bug (defs placement)
- ✅ Comprehensive QA testing completed - 35 issues identified
- ⚠️ 6 Critical issues found (security, XSS, localStorage errors)
- 📋 Production readiness: Estimated 2-3 days of fixes needed

## Business Context

### What Data Jam Does
Data Jam provides movement analytics for Out of Home (OOH) advertising. They measure real-time foot traffic and impressions using privacy-compliant technology.

### The JamBox Device
- **Hardware:** M5 Atom S3 Lite devices
- **Technology:** Counts mobile phones via 802.11 probe requests
- **Deployment:** Installed at OOH advertising locations (billboards, digital screens, transit stations, shopping centers)
- **Privacy:** GDPR compliant - no cameras or personal data collection

### Client Portfolio
- Bauer Media Outdoor
- Smart Outdoor
- Limited Space
- KBH
- Sports Revolution
- Next Gen Media
- Tesco (potential large deployment: 6,000+ screens)

### Installation Process
Alex travels to OOH advertising locations throughout the UK to install JamBox devices. Each installation requires:
1. Physical device mounting
2. Network configuration (WiFi setup)
3. Testing and verification
4. Documentation with photos
5. Recording all details for support and maintenance

## Data We Capture Per Install

### Currently Implemented (v1.0)
- ✅ Installation status (Scheduled, In Progress, Completed, Issue/Problem)
- ✅ Project name (optional dropdown from DataJam Portal clients - 139 projects)
- ✅ Venue name (formerly "Client name")
- ✅ Location/site address
- ✅ Location type (billboard, digital screen, bus shelter, shopping center, transit station, street furniture, leisure centre, nightlife, pubs, other)
- ✅ WiFi SSID (with autocomplete from history - last 20 networks)
- ✅ WiFi password ✅ **NOW ENCRYPTED** - AES-256-GCM encryption implemented
- ✅ JamBox ID (device serial number)
- ✅ IP address (optional)
- ✅ Contact person, email, phone
- ✅ Installation date and time
- ✅ Photos of installation (multiple, with preview, compressed before storage)
- ✅ Notes and observations
- ✅ Device tested checkbox
- ✅ Network verified checkbox

### To Be Added (Future Phases)
- [ ] Installer name (currently assumes Alex, but may have team growth)
- [ ] Date scheduled vs date completed tracking
- [ ] Issue tracking and resolution notes
- [ ] Multi-user support with authentication

## Tech Stack

### Current Implementation (Phase 1 - MVP)
**Framework:** Vanilla JavaScript
**Why:** Zero dependencies, works offline immediately, simple to deploy and maintain

**Storage:** Browser localStorage
**Why:** No backend needed, works completely offline, perfect for field use

**Styling:** Custom CSS with DataJam brand guidelines
**Why:** Full control over mobile-first responsive design

**Photo Handling:** Base64 encoding
**Why:** Self-contained, works offline, no external storage needed

**Deployment:** Static files
**Why:** Can run from any device, no server required, just double-click to open

### Tech Decisions Rationale
- **No build process:** Alex can use immediately without npm/node setup
- **No frameworks:** Avoid complexity, faster loading, easier debugging
- **Offline-first:** Many installation sites have poor/no internet
- **Mobile-optimized:** Alex uses phone/tablet on-site

### Future Tech Considerations [TBD]
- [ ] Backend for cloud sync (Node.js + PostgreSQL recommended)
- [ ] Authentication system (Auth0 or similar)
- [ ] Encrypted storage for WiFi passwords (crypto-js or Web Crypto API)
- [ ] Progressive Web App (PWA) for better mobile experience
- [ ] Cloud photo storage (AWS S3 or similar)
- [ ] Real-time sync across team members

## Security Considerations

### Current State ⚠️
- **WiFi passwords:** Stored in plain text in localStorage - **MUST BE ENCRYPTED before production use**
- **Photos:** Stored as base64 in localStorage - may contain sensitive location info
- **Auth:** None - anyone with access to device can view all data
- **Data export:** Unencrypted JSON/CSV downloads

### Required Before Production
1. **Encrypt WiFi passwords at rest** using Web Crypto API or crypto-js
2. **Add authentication** - only authorized installers can access
3. **Secure photo storage** - consider cloud storage with access controls
4. **HTTPS required** when deployed to web server
5. **Environment variables** for any API keys or secrets
6. **Data retention policy** - how long to keep installation records

### Compliance Notes
- GDPR: Installation records may contain client contact info
- No PII from end-users captured (devices count phones anonymously)
- Photos may show public spaces and need appropriate handling

## File Structure

```
installation_web_app/
├── CLAUDE.md              # This file - project context
├── README.md              # User-facing documentation
├── dashboard.html         # Dashboard/homepage with stats and recent activity
├── index.html             # New installation form page
├── installations.html     # View all installations with search/filter
├── inventory.html         # Inventory management with stock tracking and shipments
├── print-preview.html     # Print-friendly installation report view
├── projects.html          # All DataJam Portal projects (139 projects)
├── style.css              # All styling with DataJam branding
├── app.js                 # All JavaScript functionality
├── logo.jpg               # DataJam official logo
└── .git/                  # Git repository
```

### File Purposes

**dashboard.html**
- Landing page / homepage
- 4 stat cards (Total Installations, JamBoxes, Active Projects, This Week)
- Recent installations list (last 5)
- Quick action buttons
- Storage usage indicator

**index.html**
- New installation form
- All form fields including status dropdown
- Photo upload interface with compression
- Success modal after save
- Edit mode support via URL parameters

**installations.html**
- Grid view of all saved installations
- Real-time search and filter functionality
- Status filter dropdown
- Detail view modal for each install
- Print Report and Save as PDF buttons on each card
- Export buttons (JSON, CSV)
- Edit and delete functionality
- Data management tools

**inventory.html**
- Inventory management and stock tracking
- 4 stat cards (JamBox Stock, Cable Stock, Active Shipments, Total Deployed)
- Three tabs: Stock Management, Shipments, History
- Add/Remove stock forms with quantity and notes
- Create shipments with destination and item quantities
- Track active vs delivered shipments
- Full audit history of all stock movements
- Export inventory history to CSV

**print-preview.html**
- Print-friendly installation report view
- Opens in new window from Print Report button
- Clean, professional layout optimized for printing
- Includes all installation data, photos, and metadata
- Print button triggers browser print dialog
- Decrypts and displays WiFi passwords in report

**projects.html**
- All 139 DataJam Portal projects
- Organized by category (Shopping Centers, Outdoor Media, Gyms, etc.)
- Filter by All Projects / With Installations / No Installations
- Shows stats per project (Installations, JamBoxes, Venues)

**style.css**
- DataJam brand colors and typography
- Mobile-first responsive design
- Dark theme (black background, pink/orange accents)
- Form styling
- Card layouts
- Modal components
- Reusable button styles

**app.js**
- `EncryptionUtil` - WiFi password encryption/decryption (AES-256-GCM)
- `PhotoUtil` - Image compression before storage
- `StorageUtil` - Safe localStorage operations with quota checking
- `InstallationManager` class - handles form page
  - Form submission and validation with status field
  - Photo upload, preview, and compression
  - localStorage save with encryption
  - Edit mode support (loads existing data via URL params)
  - SSID autocomplete history (last 20 networks)
  - Modal display
- `InstallationListManager` class - handles installations page
  - Load and render installation cards with status badges
  - Real-time search and filter functionality
  - Detail view modals
  - Print report functionality (opens print-preview.html in new window)
  - PDF generation with html2pdf.js (dynamically loaded)
  - Edit functionality (redirects to form with ID)
  - Delete functionality
  - Export to JSON/CSV with encrypted password handling
  - Clear all data
- `DashboardManager` class - handles dashboard page
  - Calculate and display statistics
  - Render recent installations
  - Storage usage calculation
- `InventoryManager` class - handles inventory page
  - Load and manage inventory stock (JamBox and cables)
  - Add/Remove stock with quantity tracking
  - Create and manage shipments with destinations
  - Mark shipments as delivered
  - Render shipment cards with active/delivered status
  - Full audit history of all stock movements
  - Export inventory history to CSV
  - Tab switching for Stock/Shipments/History views
- No external dependencies except html2pdf.js (loaded on-demand for PDF generation)

## Design System (DataJam Brand Guidelines)

### Colors
```css
--datajam-pink: #E62F6E      /* Primary accent */
--datajam-orange: #E94B52    /* Primary accent */
--datajam-black: #0A0C11     /* Background */
--datajam-white: #FEFAF9     /* Text on dark */
--datajam-gradient: linear-gradient(135deg, #E62F6E 0%, #E94B52 100%)
```

### Typography
- **Font:** Poppins (via Google Fonts)
- **Weights:** 300 (Light) for body, 500 (Medium) for headings
- **Style:** Clean, contemporary, geometric
- **Letter spacing:** Generous for modern feel

### Design Principles
- Geometric shapes with rounded corners
- Pink-to-orange gradients for emphasis
- Clean, minimalist interfaces
- High contrast for readability
- Mobile-first responsive breakpoints

## Coding Conventions

### JavaScript
- **ES6+ syntax:** Classes, arrow functions, template literals, destructuring
- **Class-based architecture:** `InstallationManager` and `InstallationListManager`
- **Event delegation:** Event listeners set up in `init()` methods
- **Data storage:** JSON serialization to localStorage
- **Photo handling:** FileReader API for base64 conversion
- **No globals except:** `installManager` and `listManager` instances

### HTML
- **Semantic markup:** `<header>`, `<main>`, `<footer>`, `<nav>`
- **Form structure:** Grouped in `.form-section` containers with `<h2>` headings
- **Accessibility:** Labels for all inputs, proper form attributes
- **Required fields:** Marked with `required` attribute and `*` in label

### CSS
- **CSS variables:** All colors and fonts in `:root`
- **Mobile-first:** Base styles for mobile, `@media` for larger screens
- **BEM-like naming:** `.install-card`, `.install-card-header`, `.install-card-body`
- **Flexbox & Grid:** Modern layout techniques
- **Transitions:** 0.3s ease for all interactive elements

### Data Model
```javascript
{
  id: timestamp,                    // Unique ID
  timestamp: ISO string,            // When record created
  status: string,                   // "scheduled" | "in-progress" | "completed" | "issue" (defaults to "completed")
  projectName: string,              // optional - from DataJam Portal (139 projects)
  clientName: string,               // aka "Venue Name"
  clientContact: string,
  clientEmail: string,
  clientPhone: string,
  locationType: string,             // dropdown value (expanded: leisure centre, nightlife, pubs)
  installAddress: string,           // multi-line
  jamboxId: string,                 // device serial
  ssid: string,                     // autocomplete from history (last 20)
  password: string,                 // ✅ NOW ENCRYPTED with AES-256-GCM (prefix: "ENC:")
  ipAddress: string,
  installDate: date string,
  installTime: time string,
  notes: string,
  deviceTested: boolean,
  networkVerified: boolean,
  photos: [                         // array of photo objects (compressed before storage)
    {
      data: base64 string,          // full base64 data URL (compressed)
      name: string,                 // original filename
      type: string                  // MIME type
    }
  ]
}
```

## Local Development

### Running the App
```bash
# Navigate to project
cd "C:/Users/Alex Con/Desktop/datajam-installer-webapp/installation_web_app"

# Open in browser (Windows)
start index.html

# Or just double-click index.html in file explorer
```

### Testing
- Manual testing in browser
- Test on mobile device by accessing file directly
- No automated tests yet [TBD]

### Data Management
- **View data:** Browser DevTools → Application → Local Storage → `datajam_installations`
- **Clear data:** Use "Clear All Data" button or clear localStorage manually
- **Backup data:** Use "Export JSON" before making changes

### Known Limitations
- **Storage size:** localStorage limited to ~5-10MB (varies by browser) - now tracked with visual indicator
- **Photo size:** Now compressed before storage (60-90% reduction)
- **Single device:** Data not synced across devices
- **No backup:** If localStorage cleared, data is lost (export regularly!)
- **No multi-user:** Currently single-user app (Alex only)
- **No authentication:** Anyone with device access can view data

## Known Issues & QA Findings

**QA Testing Completed:** 2025-12-08
**Security & Performance Updates:** 2025-12-12
**Total Issues Found:** 35 (6 Critical, 4 High, 9 Medium, 16 Low)
**Issues Resolved:** 10 Critical/High priority issues fixed

### ✅ Critical Issues FIXED (2025-12-12)

1. ✅ **WiFi Passwords Unencrypted** - NOW FIXED
   - **Solution:** Implemented AES-256-GCM encryption via Web Crypto API
   - Passwords stored with "ENC:" prefix
   - Backward compatible with unencrypted legacy data

2. ✅ **localStorage Quota Not Handled** - NOW FIXED
   - **Solution:** StorageUtil with try-catch and quota warnings
   - Visual storage indicator on dashboard
   - Warning at 80% capacity

3. ✅ **JSON.parse() Errors Not Handled** - NOW FIXED
   - **Solution:** Try-catch blocks with fallback to empty array

4. ✅ **CSV Export Quote Escaping** - NOW FIXED
   - **Solution:** Properly escape double quotes: `replace(/"/g, '""')`

5. ✅ **No photo compression** - NOW FIXED
   - **Solution:** PhotoUtil compresses images before storage (60-90% reduction)
   - Max dimension: 1920px, quality: 0.85

### ⚠️ Critical Issues REMAINING

1. **XSS Vulnerabilities** - User input escaping implemented but needs full audit
   - **Status:** Partial fix with escapeHtml() method
   - **Remaining:** Full security audit needed

2. **Inline onclick Handlers** - Still present in modal content
   - **Impact:** CSP violations, global scope pollution
   - **Fix Required:** Replace with event delegation

### 🟠 High Priority Issues REMAINING

3. No authentication (unauthorized access possible) - PENDING
4. Export files contain encrypted passwords but still downloadable - PARTIAL FIX

### Production Readiness

**Status:** IMPROVED - Major security fixes implemented
**Remaining Fix Time:** 1-2 days
**Safe for Field Testing:** YES (much safer with encryption and compression)

**Remaining Fixes for Production:**
1. Complete XSS vulnerability audit - 2 hours
2. Replace inline onclick handlers - 1 hour
3. Add basic authentication - 2-4 hours
4. Security testing and penetration testing - 1 day

## Future Roadmap

### Phase 2 Enhancements
- [x] ✅ Encrypt WiFi passwords before storage - COMPLETED (AES-256-GCM)
- [x] ✅ Add search and filter to installations page - COMPLETED
- [x] ✅ Better photo management (compression, thumbnails) - COMPLETED
- [x] ✅ Installation status workflow - COMPLETED (Scheduled/In Progress/Completed/Issue)
- [x] ✅ Dashboard with statistics - COMPLETED
- [x] ✅ PDF/Print reports - COMPLETED
- [ ] Scheduled vs completed date tracking
- [ ] Team installer selection
- [ ] Bulk operations (multi-select, bulk delete, bulk status update)

### Phase 3 - Production Ready
- [ ] Backend API (Node.js + PostgreSQL)
- [ ] User authentication (Auth0)
- [ ] Cloud sync across devices
- [ ] Cloud photo storage (S3)
- [ ] PWA for offline support
- [ ] Real-time collaboration
- [ ] Analytics and reporting
- [ ] QR code generation for JamBox IDs
- [ ] Email reports and notifications

### Integration Opportunities
- [ ] Integration with Data Jam main platform
- [ ] Client portal for viewing their installations
- [ ] Automated device testing/monitoring
- [ ] Support ticket integration

## Deployment Strategy

### Current (Development)
- Run locally from file system
- Alex accesses on laptop/tablet
- Manual backup via export

### Next Step (Team Testing)
- Host on internal web server (HTTPS required)
- Add basic auth
- Test with team

### Production [TBD]
- Cloud hosting (AWS/Vercel/Netlify)
- Custom domain
- CDN for global access
- Monitoring and logging
- Automated backups

## Important Notes for Claude

- **Alex is non-technical** - keep solutions simple and well-documented
- **Field use is primary** - prioritize offline capability and mobile UX
- **WiFi passwords are sensitive** - encryption is critical before production
- **Photos are proof of work** - important for client billing and verification
- **Storage limits are real** - warn if approaching localStorage limits
- **Brand consistency matters** - always use DataJam colors and fonts
- **No breaking changes** - Alex is actively using this tool

## Questions to Resolve [TBD]

1. Should we add multi-user support now or later?
2. What's the encryption approach for WiFi passwords? (Web Crypto API recommended)
3. Should photos be compressed before storage?
4. What's the data retention policy?
5. Should we add offline sync queue for when connectivity returns?
6. Export format preferences for clients?
7. Integration points with existing Data Jam systems?

---

**Last Updated:** 2025-12-12 (Session 3: Multi-user login, project tracking, low stock alerts, calendar view)
**Document Owner:** Claude (AI Assistant)
**Human Contact:** Alex (installer) & Rhea (management)

## Change Log

**2025-12-12 - Multi-User System & UX Enhancements (Session 3):**
- **MULTI-USER LOGIN SYSTEM:**
  - Created login.html with professional authentication UI
  - SessionManager utility added to top of app.js with methods:
    - getSession() - retrieve current session from localStorage
    - isAuthenticated() - check if user is logged in
    - requireAuth() - redirect to login if not authenticated
    - logout() - clear session and redirect to login
    - getCurrentUser() - get current user's full name
    - getUserRole() - get current user's role
  - Default admin account: username "alex", password "datajam2025"
  - localStorage key: datajam_session (stores userId, username, fullName, role, loginTime)
  - All pages (except login.html) protected with SessionManager.requireAuth() on load
  - Created LoginManager class for handling login form submission
  - User profile section added to sidebar on all pages (dashboard.html, index.html, installations.html, inventory.html, projects.html)
  - User avatar with gradient background (pink-orange)
  - Displays current user name and role in sidebar
  - Logout button in sidebar footer
  - Session persists across page refreshes
- **PROJECT DROPDOWN ON SHIPMENTS:**
  - Modified inventory.html shipment form
  - Replaced text input with organized <select> dropdown
  - All 139 DataJam projects organized by category in <optgroup> elements:
    - Shopping Centers & Malls
    - Outdoor Media
    - Gyms & Fitness
    - Sports Facilities
    - Pubs & Nightlife
    - Retail Stores
    - Transport & Transit
    - Digital & Entertainment
    - Education
    - Other Venues
  - Added "Other (Custom)..." option with value="__custom__"
  - Conditional custom destination text input (shows/hides based on selection)
  - Modified InventoryManager.handleCreateShipment() to check for __custom__ value
  - Uses custom destination value when "Other" selected
- **SHIPMENT-TO-PROJECT TRACKING:**
  - Modified projects.html ProjectManager class
  - Added loadShipments() method to retrieve all shipments from localStorage
  - Added calculateProjectAllocations() method to aggregate shipments by destination:
    - Returns object with project names as keys
    - Each value contains: { jamboxes, cables, shipmentCount }
  - Modified buildProjectDirectory() to include allocation data in project objects
  - Added allocation fields to project data: allocatedJamboxes, allocatedCables, shipmentCount, hasAllocations
  - Modified renderProjectCard() to display allocated stock section:
    - Pink-highlighted box with "📦 Allocated Stock" header
    - Shows number of shipments sent to project
    - Displays JamBox and Cable quantities
    - Only shows if project has allocations (hasAllocations = true)
  - Automatic linking by name matching (shipment.destination === project.name)
- **LOW STOCK ALERTS:**
  - Modified InventoryManager.updateStats() in app.js
  - Added LOW_STOCK_THRESHOLD constant = 10 units
  - Stock numbers turn red when below threshold (inline style.color = '#E62F6E')
  - Created showLowStockWarning(jamboxLow, cableLow) method:
    - Dismissible warning banner at top of page
    - Pink gradient background with pulsing animation
    - Shows which items are low: "⚠️ Low Stock Alert: JamBoxes and Cables are below 10 units"
    - Close button removes banner
    - Auto-removes if stock returns above threshold
  - Added @keyframes pulseWarning animation to style.css (2s infinite ease-in-out)
  - Warning checks on every inventory update
- **INSTALLATION CALENDAR VIEW:**
  - Modified installations.html to add view toggle section
  - Added Grid/Calendar toggle buttons with SVG icons
  - Added <div id="installCalendar"> container (initially hidden)
  - Modified InstallationListManager class in app.js:
    - Added currentView property (default: 'grid')
    - Added calendarDate property (default: new Date())
    - Added switchView(view) method:
      - Toggles active class on buttons
      - Shows/hides grid vs calendar containers
      - Calls renderCalendar() when switching to calendar
    - Added renderCalendar() method (~80 lines):
      - Generates full month calendar with days of week header
      - Creates 7-column grid (Sunday-Saturday)
      - Groups installations by date using installsByDate object
      - Color-codes installation dots by status:
        - Scheduled: #3B82F6 (blue)
        - In Progress: #F59E0B (orange)
        - Completed: #14B8A6 (teal)
        - Issue: #E62F6E (pink)
      - Shows up to 3 dots per day with "+X more" count
      - Highlights today's date with pink border
      - Click day to filter installations from that date
    - Added changeMonth(delta) method:
      - delta = -1: previous month
      - delta = 0: go to today
      - delta = 1: next month
      - Calls renderCalendar() after changing month
    - Added filterByDate(dateStr) method:
      - Switches to grid view
      - Populates search input with date
      - Triggers filter to show only installations from that date
- **CSS ENHANCEMENTS:**
  - Added .sidebar-footer styles (margin-top: auto, padding, border-top)
  - Added .user-profile styles (flexbox layout, padding, background, border-radius)
  - Added .user-avatar styles (40px circle, pink-orange gradient, centered SVG)
  - Added .user-info styles (text layout for name and role)
  - Added .user-name styles (font-weight 500, text-primary color)
  - Added .user-role styles (font-size 12px, text-secondary, uppercase, letter-spacing)
  - Added .logout-btn styles (full width, pink tint, border, hover effects)
  - Added .low-stock-badge styles (absolute position, pink background, white text, 18px circle, pulse animation)
  - Added .view-btn styles (toggle button appearance, transparent/active states)
  - Added .view-btn.active styles (pink background, white text)
  - Added .install-calendar styles (secondary background, border-radius, padding)
  - Added .calendar-header styles (flexbox, space-between, margin-bottom)
  - Added .calendar-title styles (font-size 18px, font-weight 500)
  - Added .calendar-nav styles (flexbox gap, button styles)
  - Added .calendar-grid styles (7-column grid, gap 8px)
  - Added .calendar-weekday styles (text-center, text-secondary, padding, font-weight 500)
  - Added .calendar-day styles (min-height 100px, padding, background, border, border-radius, cursor)
  - Added .calendar-day.today styles (2px pink border)
  - Added .calendar-day.other-month styles (opacity 0.3)
  - Added .calendar-day-number styles (font-weight 500, margin-bottom)
  - Added .calendar-installs styles (flex column, gap 2px)
  - Added .calendar-install-dot styles (full width, 6px height, 3px border-radius, margin 1px)
  - Added .calendar-install-count styles (font-size 11px, text-secondary, margin-top 4px)
  - Added @keyframes pulseWarning (box-shadow animation)

**2025-12-12 - Print/PDF Enhancement & Inventory System (Session 2):**
- **PRINT PREVIEW PAGE:**
  - Created print-preview.html dedicated print view page
  - Modified printReport() method in InstallationListManager to open new window with print-preview.html?id=[installId]
  - Print preview loads installation data from localStorage via URL parameter
  - Professional layout with print-optimized CSS (@media print)
  - Includes decrypted WiFi password in print output
  - Print button triggers window.print()
- **PDF GENERATION:**
  - Added savePDF() method in InstallationListManager
  - Dynamically loads html2pdf.js library (CDN) when Save as PDF is clicked
  - generatePDF() method creates professional table-based PDF layout
  - Filename format: DataJam-Installation-[VenueName]-[Date].pdf
  - Includes all installation data, decrypted passwords, and metadata
  - Uses html2pdf options: A4, portrait, 10mm margins, scale 2
- **INVENTORY MANAGEMENT SYSTEM:**
  - Created inventory.html with three-tab interface (Stock, Shipments, History)
  - Created InventoryManager class in app.js (445 lines)
  - localStorage keys: datajam_inventory, datajam_shipments, datajam_inventory_history
  - Inventory data model: { jambox: number, cable: number }
  - Shipment data model: { id, destination, date, jamboxQty, cableQty, notes, status, createdAt }
  - History entry model: { id, timestamp, type, action, quantity, destination/reason, notes, user }
- **INVENTORY FEATURES:**
  - Add Stock form: type, quantity, notes
  - Remove Stock form: type, quantity, reason (damaged/lost/returned/other), notes
  - Create Shipment form: destination, date, jamboxQty, cableQty, notes
  - Stock validation: prevents removing more than available
  - Automatic inventory deduction when shipment created
  - Mark shipments as delivered
  - Delete shipment records
  - Export inventory history to CSV
  - Clear all history function
- **4 STAT CARDS ON INVENTORY PAGE:**
  - JamBox Stock (current inventory)
  - Cable Stock (current inventory)
  - Active Shipments (status === 'active')
  - Total Deployed (count of installations from datajam_installations)
- **NAVIGATION UPDATES:**
  - Added Inventory tab to all pages: index.html, installations.html, dashboard.html, projects.html
  - Consistent 5-item navigation: Dashboard, New Install, View Installs, Inventory, Projects
  - Inventory icon: Package/toolbox SVG
- **CSS UPDATES:**
  - Added inventory page styles to style.css
  - .inventory-tabs, .inventory-tab, .tab-content styles
  - Tab switching animation (fadeIn)
  - Active tab styling with pink underline
- **DOCUMENTATION:**
  - Updated CLAUDE.md File Structure section
  - Added file descriptions for inventory.html and print-preview.html
  - Updated app.js description with InventoryManager class methods
  - Added this change log entry

**2025-12-12 - Major Feature Update:**
- **INSTALLATION STATUS TRACKING:**
  - Added status field to data model and form (Scheduled, In Progress, Completed, Issue/Problem)
  - Added status dropdown to index.html in form section
  - Updated handleSubmit() in InstallationManager to save status
  - Updated loadInstallationForEdit() to populate status field when editing
  - Added color-coded status badges to installation cards
  - Status colors: Scheduled (blue), In Progress (orange), Completed (teal), Issue (pink)
  - Added status to CSV export as first column
  - Backward compatible - old installations default to "completed" status

- **SEARCH & FILTER FUNCTIONALITY:**
  - Added search input field to installations.html
  - Added status filter dropdown with all status options
  - Added "Clear Filters" button
  - Implemented real-time search in InstallationListManager
  - Search across: venue name, JamBox ID, address, project name, notes
  - Added result count display: "Showing X of Y installations"
  - Both filters work together (search + status)
  - Updated renderInstallations() to apply filters before rendering

- **DASHBOARD/HOMEPAGE:**
  - Created new dashboard.html file as landing page
  - Created DashboardManager class in app.js
  - 4 stat cards with icons and gradient backgrounds:
    - Total Installations (house icon, pink-orange gradient)
    - JamBoxes Deployed (device icon, orange-red gradient)
    - Active Projects (clock icon, red-yellow gradient)
    - This Week installations (activity icon, teal-green gradient)
  - Recent installations list showing last 5 with status badges
  - Quick action buttons (New Installation, View All Installs, View Projects)
  - Storage usage section with visual progress bar and percentage
  - Warning displayed when storage exceeds 80%
  - Updated navigation on all pages (index.html, installations.html, projects.html)
  - Dashboard is first navigation item, icon changed to grid for Dashboard and clock for Projects

- **PRINT & PDF FUNCTIONALITY:**
  - Added printReport() method to InstallationListManager
  - Added "Print Report" and "Save as PDF" buttons to each installation card (teal .btn-print styling)
  - Buttons placed between View Details and Edit buttons
  - Print-friendly modal with professional layout
  - Print CSS (@media print) for clean output:
    - Hides navigation, buttons, and non-essential UI
    - Professional header with venue name and status badge
    - Organized sections: General Info, JamBox Device, Network Config, Contact Info, Notes, Photos
    - Two-column grid layout for data fields
    - Photos displayed in 2-column grid
    - Footer with generation timestamp and DataJam branding
  - Print button in modal triggers window.print()
  - Users can save as PDF via browser's print-to-PDF feature
  - Includes decrypted WiFi passwords in print output

- **SECURITY & PERFORMANCE (Previous Session):**
  - Implemented EncryptionUtil with Web Crypto API (AES-256-GCM)
  - WiFi passwords encrypted with "ENC:" prefix
  - Backward compatible decryption for legacy unencrypted passwords
  - PhotoUtil for image compression (canvas resize, 1920px max, 0.85 quality)
  - StorageUtil for safe localStorage operations with quota checking
  - Fixed CSV quote escaping bug: `replace(/"/g, '""')`
  - Added try-catch blocks for localStorage operations

- **CSS UPDATES:**
  - Added dashboard stat card styles (.stats-grid, .stat-card, .stat-icon, .stat-content)
  - Added recent installations styles (.recent-install-item, .recent-install-venue, .status-badge)
  - Added print button styling (.btn-print with teal color theme)
  - Added comprehensive @media print styles for professional reports
  - Added flex-wrap to .install-card-actions for better responsive layout

- **NAVIGATION UPDATES:**
  - Added Dashboard as first navigation item on all pages
  - Changed Projects icon from grid to clock icon for better differentiation
  - Dashboard uses grid icon
  - All pages now have consistent 4-item navigation: Dashboard, New Install, View Installs, Projects

## Change Log (Previous Sessions)

**2025-12-10 (Session 2 - Edit Feature & Logo Updates):**
- **EDIT FUNCTIONALITY IMPLEMENTED:**
  - Added Edit button to installation cards in renderInstallCard() - orange themed
  - Created editInstallation() method in InstallationListManager
  - Updated InstallationManager to detect edit mode via URL parameters (?edit=id)
  - Added loadInstallationForEdit() to populate form with existing installation data
  - Modified saveInstallation() to handle both CREATE and UPDATE operations
  - Updated form title/subtitle/button text dynamically based on mode
  - Modified success modal to show different messages for create vs update
  - Smart navigation: redirects to installations list after editing
  - Added .btn-edit CSS styling (orange theme matching DataJam brand)
- **Logo enhancements:**
  - Added CSS @keyframes logoPulse animation (3s infinite cycle)
  - Logo scales 1.0 → 1.05 and opacity pulses 0.85 → 1.0
  - Added mix-blend-mode: screen for logo integration with dark background
  - Updated all logo references from logo.jpg to logo2.jpeg (index.html, installations.html, style.css)
- **App now supports full CRUD operations:** Create, Read, Update, Delete

**2025-12-10 (Session 1 - UX Enhancements):**
- Added project dropdown to Location Details section with current client list
- Implemented logo watermark background blend (subtle 3% opacity)
- Expanded location types: added Leisure Centre, Nightlife, Pubs
- Implemented WiFi SSID autocomplete with smart history (stores last 20 networks)
- Updated data model to include projectName field
- Updated InstallationManager to save/load SSID history from localStorage
- Updated CSV export to include Project column
- Enhanced installations display to show project name in cards and detail views
- Updated documentation with new features and data model changes

**2025-12-08:**
- Initial CLAUDE.md creation with full project context
- Added actual DataJam logo (logo.jpg) from official brand assets
- Fixed SVG gradient bug in header
- Completed comprehensive QA testing (35 issues documented)
- Identified 6 critical security issues requiring fixes before production
- Updated file structure documentation
- Documented known limitations and production readiness status
