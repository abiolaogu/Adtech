# User Manual: Advertiser & Publisher — Adtech Platform
> Version: 1.0 | Last Updated: 2026-02-18 | Status: Draft
> Classification: Internal | Author: AIDD System

---

## 1. Introduction

This manual guides advertisers and publishers through the Adtech Platform's core features. Advertisers will learn how to create campaigns, manage creatives, define audiences, and analyze performance. Publishers will learn how to register inventory, set floor prices, and track revenue.

---

## 2. Getting Started

### 2.1 Creating an Account
1. Navigate to the platform login page (e.g., `https://app.adtech.com/login`).
2. Click **"Create Account."**
3. Enter your email address, name, password, and organization name.
4. Click **"Register."**
5. You will be logged in and redirected to the Dashboard.

### 2.2 Navigating the Dashboard
The main navigation sidebar includes:
- **Dashboard**: Overview of key metrics
- **Campaigns**: Create and manage ad campaigns
- **Inventory**: Manage ad inventory
- **Customers**: View customer profiles (CDP)
- **Audiences**: Build audience segments
- **Analytics**: View performance reports

---

## 3. For Advertisers

### 3.1 Creating a Campaign

#### Step 1: Start a New Campaign
1. Navigate to **Campaigns** from the sidebar.
2. Click **"New Campaign."**

#### Step 2: Define Campaign Details
1. **Name**: Enter a descriptive campaign name (e.g., "Summer Sale - Display Ads").
2. **Objective**: Select one of:
   - **Conversions**: Optimize for conversion events
   - **Awareness**: Maximize impressions
   - **Traffic**: Maximize clicks
3. **Budget**:
   - **Total Budget**: The maximum amount to spend over the campaign lifetime.
   - **Daily Budget** (optional): Maximum daily spend to pace delivery.
4. **Schedule**:
   - **Start Date**: When the campaign begins.
   - **End Date** (optional): When the campaign stops.
5. Click **"Next."**

#### Step 3: Add Line Items
1. Click **"Add Line Item."**
2. Enter line item name and budget allocation.
3. Set the CPM (cost per mille) bid price.
4. Repeat for multiple line items if needed.
5. Click **"Next."**

#### Step 4: Upload Creatives
1. Click **"Add Creative."**
2. Select format: Display, Video, Native, or Email.
3. Upload the creative content (image, HTML5, VAST XML, or JSON).
4. Enter the click-through URL.
5. Associate the creative with one or more line items.
6. Click **"Next."**

#### Step 5: Review and Save
1. Review the campaign summary: name, budget, schedule, line items, creatives.
2. Click **"Save as Draft"** to save without activating.
3. Or click **"Submit for Approval"** to request activation.

### 3.2 Using the No-Code Campaign Builder
For a simpler experience:
1. Click **"No-Code Builder"** when creating a campaign.
2. Drag and drop campaign components:
   - **Goal** block: Select objective
   - **Audience** block: Define targeting
   - **Creative** block: Upload or select from library
   - **Budget** block: Set spending parameters
3. The builder validates your configuration in real-time.
4. Click **"Launch"** when ready.

### 3.3 Monitoring Campaign Performance
1. Navigate to **Campaigns** and click on an active campaign.
2. The performance dashboard shows:
   - **Impressions**: Total ad views
   - **Clicks**: Total ad clicks
   - **CTR**: Click-through rate (clicks / impressions)
   - **Conversions**: Tracked conversion events
   - **CPA**: Cost per acquisition (spend / conversions)
   - **Spend**: Total amount spent
   - **Remaining Budget**: Amount left to spend
3. Use the date range selector to filter by time period.
4. View breakdowns by device type, country, or creative variant.

### 3.4 Managing Creatives
1. Navigate to **Campaigns > Creative Library**.
2. View all uploaded creatives with preview thumbnails.
3. Click on a creative to edit its name, click URL, or content.
4. Delete creatives that are no longer needed (only if not associated with active line items).

### 3.5 Building Audience Segments
1. Navigate to **Audiences**.
2. Click **"Create Audience."**
3. Define rules:
   - **Behavioral**: Track events (e.g., users who purchased in last 30 days)
   - **Demographic**: Age, country, gender
   - **Custom Properties**: Any tracked attribute (e.g., account type = premium)
4. Click **"Preview"** to see estimated audience size.
5. Click **"Save"** to create the audience.
6. Click **"Build Segment"** to evaluate rules and populate the audience.

### 3.6 Setting Up Conversion Tracking

#### Option A: Pixel Tracking
1. Navigate to **Campaign Settings > Conversions**.
2. Copy the tracking pixel code.
3. Paste the pixel code on your conversion confirmation page.
4. The pixel will fire on page load, recording the conversion.

#### Option B: Server-Side Tracking
1. On your server, capture the `requestId` from the ad click redirect URL.
2. When a conversion occurs, send a POST request:
   ```
   POST /api/v1/track/conversion/{requestId}
   Content-Type: application/json
   { "conversionType": "purchase", "value": 49.99 }
   ```
3. The conversion will be attributed to the originating campaign.

---

## 4. For Publishers

### 4.1 Registering a Publisher Profile
1. Navigate to **Publishers** (if available in your role).
2. Click **"Add Publisher."**
3. Enter publisher name and domain.
4. Set the default revenue share percentage.
5. Click **"Create."**

### 4.2 Adding a Site
1. Within your publisher profile, click **"Add Site."**
2. Enter the site name and domain (e.g., `news.example.com`).
3. Click **"Create Site."**

### 4.3 Creating Ad Units
1. Within a site, click **"Add Ad Unit."**
2. Enter:
   - **Name**: Descriptive name (e.g., "Homepage Leaderboard").
   - **Sizes**: Select accepted dimensions (e.g., 728x90, 300x250).
   - **Floor Price**: Minimum CPM you will accept.
3. Click **"Create Ad Unit."**

### 4.4 Creating Inventory

#### Email Inventory
1. Navigate to **Inventory > Create**.
2. Select type **EMAIL**.
3. Enter:
   - **Name**: Newsletter name
   - **Email List Size**: Number of subscribers
   - **Email Segments**: Tags (e.g., "tech," "business")
   - **Total Slots**: Number of available sponsorship slots
   - **Floor Price**: Minimum CPM
4. Click **"Create Inventory."**

#### Video Inventory
1. Select type **MOVIE**.
2. Enter:
   - **Name**: Content description
   - **Content Type**: Pre-roll, mid-roll, or post-roll
   - **Content Genre**: Genres (e.g., "action," "comedy")
   - **Total Slots**: Number of ad slots
   - **Floor Price**: Minimum CPM
3. Click **"Create Inventory."**

#### Display/Native Inventory
1. Select the appropriate type (DISPLAY or NATIVE).
2. Fill in name, slot count, and floor price.
3. Click **"Create Inventory."**

### 4.5 Viewing Revenue Analytics
1. Navigate to **Analytics**.
2. The revenue dashboard shows:
   - **Total Earnings**: Revenue for the selected period
   - **Fill Rate**: Percentage of inventory filled with ads
   - **eCPM**: Effective CPM (revenue / impressions * 1000)
   - **Impressions**: Total served impressions
3. Filter by site, ad unit, or date range.

### 4.6 Inventory Forecasting
1. Navigate to an inventory item's detail page.
2. Click **"Forecast."**
3. View predicted available impressions for the next 30 days.
4. Use this data to plan direct sales or adjust floor prices.

### 4.7 Yield Optimization
1. Navigate to an inventory item's detail page.
2. Click **"Optimize Yield."**
3. The system will provide recommendations:
   - Suggested floor price adjustments
   - Optimal time-of-day pricing
   - Demand trends for your inventory type

---

## 5. Account Settings

### 5.1 Updating Profile
1. Click your name in the top-right corner.
2. Select **"Profile."**
3. Update name, email, or password.
4. Click **"Save."**

### 5.2 Managing API Keys
1. Navigate to **Profile > API Keys**.
2. Click **"Generate New Key."**
3. Enter a name for the key.
4. Copy the generated key (it will only be shown once).
5. Use the key in the `Authorization` header for API requests.

---

## 6. Frequently Asked Questions

**Q: How long before my campaign starts serving?**
A: Once approved and in ACTIVE status, campaigns begin participating in auctions immediately.

**Q: Why is my campaign not spending its budget?**
A: Common reasons include narrow targeting, low bid price (below floor prices), or campaign schedule not yet started.

**Q: How is my revenue calculated as a publisher?**
A: Revenue = Clearing Price * Revenue Share Percentage. The default split is 70% publisher / 30% platform.

**Q: Can I export my data?**
A: Yes. Navigate to Profile > Data Export to download your data in JSON format.

**Q: How do I request data deletion (GDPR)?**
A: Navigate to Profile > Privacy > Request Data Deletion. This will permanently remove all your personal data.

---

## 7. Related Documents
- [Training Manual - End User](training-manual-enduser.md)
- [User Manual - Developer](user-manual-developer.md)
- [User Manual - Admin](user-manual-admin.md)
