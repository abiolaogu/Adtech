# Training Manual: Advertiser & Publisher — Adtech Platform
> Version: 1.0 | Last Updated: 2026-02-18 | Status: Draft
> Classification: Internal | Author: AIDD System

---

## 1. Training Overview

### 1.1 Objective
Train advertisers and publishers to effectively use the Adtech Platform for campaign management, inventory monetization, audience building, and performance analysis.

### 1.2 Target Audience
- Advertisers new to the platform
- Publishers onboarding their inventory
- Agency account managers
- Marketing professionals

### 1.3 Prerequisites
- Basic understanding of digital advertising concepts
- Active platform account
- Access to the training environment

### 1.4 Duration
Estimated total training time: 6 hours (split across 2 days)

---

## 2. Training Curriculum for Advertisers

### Module A1: Getting Started (45 minutes)

**Learning Objectives:**
- Navigate the platform dashboard
- Understand key advertising metrics
- Locate campaign management tools

**Topics:**
1. Account registration and login
2. Dashboard overview: impressions, clicks, spend, conversions
3. Navigation sidebar walkthrough
4. Profile settings and API key generation

**Hands-on Exercise:**
- Register a new account on the training environment
- Navigate to each section of the dashboard
- Update profile information

---

### Module A2: Campaign Creation (1 hour)

**Learning Objectives:**
- Create a campaign from scratch
- Use the no-code campaign builder
- Configure budgets and schedules

**Topics:**
1. Campaign objectives: conversions, awareness, traffic
2. Budget configuration: total budget, daily budget, pacing
3. Schedule configuration: start date, end date
4. Line item creation and CPM bidding
5. No-code drag-and-drop builder walkthrough

**Hands-on Exercise:**
- Create a campaign with $1,000 total budget and $100 daily cap
- Add 2 line items with different CPM bids
- Schedule the campaign for 7 days starting tomorrow
- Save as draft

---

### Module A3: Creative Management (45 minutes)

**Learning Objectives:**
- Upload and manage ad creatives
- Associate creatives with line items
- Understand supported ad formats

**Topics:**
1. Creative formats: display (image/HTML5), video (VAST), native (JSON)
2. Uploading creatives
3. Setting click-through URLs
4. Associating creatives with line items
5. Creative preview

**Hands-on Exercise:**
- Upload a display banner creative (300x250)
- Upload a native ad creative
- Associate both with the previously created campaign's line items

---

### Module A4: Audience Building (45 minutes)

**Learning Objectives:**
- Create audience segments using rules
- Understand behavioral, demographic, and custom targeting
- Preview audience size

**Topics:**
1. Audience types: behavioral, demographic, custom properties
2. Rule builder interface
3. Operators: equals, greater than, contains, in list
4. Combining multiple rules (AND/OR logic)
5. Audience size estimation

**Hands-on Exercise:**
- Create a "High-Value Customers" audience (3+ purchases in 30 days)
- Create a "Tech Enthusiasts" audience (visited tech pages)
- Build both segments and compare sizes

---

### Module A5: Performance Monitoring (45 minutes)

**Learning Objectives:**
- Read campaign performance dashboards
- Interpret key metrics (CTR, CPA, ROAS)
- Use date and dimension filters

**Topics:**
1. Campaign performance metrics explained
2. Impressions, clicks, CTR, conversions, CPA, ROAS, spend
3. Date range filtering
4. Breakdown by device, country, creative
5. Budget pacing visualization

**Hands-on Exercise:**
- View performance of the training campaign
- Filter by last 7 days
- Export a CSV report of campaign metrics
- Identify the best-performing creative variant

---

### Module A6: Conversion Tracking (45 minutes)

**Learning Objectives:**
- Install the tracking pixel
- Configure server-side conversion tracking
- Verify conversion attribution

**Topics:**
1. Pixel-based tracking: copy and install
2. Server-side tracking: API endpoint
3. Conversion types: purchase, signup, download
4. Attribution model: last-click
5. Verification and debugging

**Hands-on Exercise:**
- Copy the tracking pixel code
- Install it on a test page
- Fire a test conversion
- Verify it appears in the campaign report

---

## 3. Training Curriculum for Publishers

### Module P1: Publisher Setup (45 minutes)

**Learning Objectives:**
- Register as a publisher
- Add sites and ad units
- Configure floor prices

**Topics:**
1. Publisher profile creation
2. Site registration (domain verification)
3. Ad unit creation (name, sizes, floor price)
4. Revenue share understanding

**Hands-on Exercise:**
- Create a publisher profile
- Add a test website
- Create 3 ad units with different sizes and floor prices

---

### Module P2: Inventory Management (45 minutes)

**Learning Objectives:**
- Create different inventory types
- Manage inventory availability
- Reserve inventory slots

**Topics:**
1. Inventory types: EMAIL, MOVIE, DISPLAY, NATIVE, CUSTOM
2. Creating email inventory (newsletter sponsorships)
3. Creating video inventory (pre-roll, mid-roll, post-roll)
4. Floor price strategy
5. Inventory reservation workflow

**Hands-on Exercise:**
- Create an email inventory item (10,000 subscribers, $5 CPM floor)
- Create a video inventory item (pre-roll, action genre, $8 CPM floor)
- Reserve 5 slots of the email inventory

---

### Module P3: Revenue Analytics (45 minutes)

**Learning Objectives:**
- Read revenue dashboards
- Analyze fill rate and eCPM
- Use yield optimization recommendations

**Topics:**
1. Revenue metrics: total earnings, fill rate, eCPM
2. Filtering by site, ad unit, and date range
3. Inventory forecasting (30-day predictions)
4. Yield optimization recommendations
5. Floor price adjustment strategies

**Hands-on Exercise:**
- Review revenue for the training publisher
- Identify the highest-performing ad unit
- Run the yield optimization tool
- Adjust floor prices based on recommendations

---

## 4. Assessment

### 4.1 Advertiser Assessment
- Create a complete campaign from scratch (objective, budget, line items, creatives, schedule)
- Build an audience segment with behavioral rules
- Install conversion tracking and verify attribution
- Generate a campaign performance report

### 4.2 Publisher Assessment
- Register a site with 3 ad units
- Create email and video inventory
- Interpret revenue analytics dashboard
- Apply yield optimization recommendations

---

## 5. Quick Reference Card

### Advertiser Quick Actions
| Task | Path |
|------|------|
| Create campaign | Sidebar > Campaigns > New Campaign |
| Upload creative | Sidebar > Campaigns > Creative Library |
| Build audience | Sidebar > Audiences > Create Audience |
| View performance | Sidebar > Analytics > Select Campaign |
| Track conversions | Campaign Settings > Conversions |

### Publisher Quick Actions
| Task | Path |
|------|------|
| Add site | Sidebar > Publishers > Add Site |
| Create ad unit | Site Detail > Add Ad Unit |
| Create inventory | Sidebar > Inventory > Create |
| View revenue | Sidebar > Analytics > Revenue |
| Forecast inventory | Inventory Detail > Forecast |

---

## 6. Related Documents
- [User Manual - End User](user-manual-enduser.md)
- [User Manual - Developer](user-manual-developer.md)
- [Training Video Scripts](training-video-scripts.md)
