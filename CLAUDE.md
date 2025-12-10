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
- Netlify hosting with Netlify Forms
- GitHub CI/CD auto-deployment
- No build step required

## Key Files
```
/index.html          - Homepage (main marketing page)
/about.html          - About page
/jambox.html         - Product page
/blog.html           - Blog listing
/contact.html        - Contact form (Netlify Forms)
/contact-success.html - Form submission success page
/css/styles.css      - All styles (dark theme, premium feel)
/js/main.js          - Interactions (splash, cursor, animations, ROI calc)
/images/clients/     - Client logos
/images/pulse-jammed.png - Neon turntable visual for PULSE
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
- Splash screen (shows every visit)
- Custom cursor with hover effects (desktop only)
- Floating particles background
- Scroll progress indicator
- Scroll-triggered animations
- Magnetic button effects
- 3D tilt cards
- Live impressions counter
- ROI Calculator with UK/US currency toggle
- Mobile hamburger menu
- Video hero background (needs updating - currently shows billboards, should show pedestrian traffic)
- Client logo marquee

## AI Search Optimization
Site includes Schema.org structured data and custom meta tags for AI discoverability:
- `ai-content-type`, `ai-industry`, `ai-technology`
- Targets queries around: footfall counting, pedestrian traffic measurement, OOH audience data, movement analytics

## Recent Updates (Dec 2024)
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
