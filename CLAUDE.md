# Data Jam Website - Claude Context

## Project Overview
Premium marketing website for Data Jam, a privacy-first OOH (Out-of-Home) audience measurement company operating in the UK and US.

**Live Site:** https://preview.data-jam.com (Netlify auto-deploys from GitHub)
**Repo:** https://github.com/DataJamPulse/preview_Data-Jam

## Company Info
- **UK Phone:** +44 7827 813388
- **US Phone:** (747) 243-3513
- **Email:** arran@data-jam.com
- **Tagline:** "REAL DATA. REAL TIME."

## Core Products
1. **JamBox** - Walnut-sized device that counts mobile devices within 300m/950ft range. Privacy-first (no cameras), GDPR compliant, real-time data.
2. **Data Jam Portal** - Dashboard for viewing audience data
3. **Data Jam PULSE** - AI platform for human movement insights (see datajamreports-production folder)

## Current Clients
- Sports Revolution
- Next-Gen Media
- Native
- eighteen24
- ACMS
- Capitol Outdoor (US)
- Heritage Outdoor (US)

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
- Video hero background (Mixkit stock)
- Client logo marquee

## AI Search Optimization
Site includes Schema.org structured data and custom meta tags for AI discoverability:
- `ai-content-type`, `ai-industry`, `ai-technology`
- Targets queries around OOH measurement, footfall counting, billboard analytics

## Related Folders (READ ONLY)
- `/Users/jav/Desktop/datajamreports-production/` - PULSE portal production code. Contains logos, Jammed visuals (neon aesthetic). DO NOT MODIFY - only copy assets if needed.

## Development Notes
- Mobile menu currently only on index.html - needs adding to other pages
- Currency defaults to £ GBP in ROI calculator
- Contact form posts to Netlify Forms
- Splash screen auto-dismisses after 5.5 seconds

## Deployment
Push to `main` branch triggers automatic Netlify deploy. No manual steps needed.

```bash
git add .
git commit -m "Your message"
git push origin main
```
