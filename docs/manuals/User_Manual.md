# AdTech Platform User Manual

## Introduction
Welcome to the AdTech Platform. This manual provides comprehensive guides for Advertisers, Publishers, and Administrators to effectively use the platform.

---

## 1. Advertiser Guide

### 1.1 Getting Started
- **Registration**: Sign up at `/register` as an Advertiser.
- **Dashboard Overview**: View key metrics like Impressions, Clicks, CTR, and Spend on the main dashboard.

### 1.2 Managing Campaigns
#### Creating a Campaign
1. Navigate to the **Campaigns** tab.
2. Click **Create Campaign**.
3. Fill in the details:
   - **Name**: Unique name for your campaign.
   - **Budget**: Total budget limit.
   - **Bid Strategy**: Choose CPM (Cost Per Mille) or CPC (Cost Per Click).
   - **Targeting**: Select countries, device types, and other demographics.
4. Upload **Creatives** (Banner images, Video assets).
5. Click **Launch**.

#### Monitoring Performance
- Go to the **Analytics** tab.
- Filter by Date Range, Campaign, or Creative.
- **Key Metrics**:
  - **Impressions**: Number of times your ad was shown.
  - **Clicks**: Number of user interactions.
  - **CTR (Click-Through Rate)**: (Clicks / Impressions) * 100.
  - **Spend**: Total cost incurred.

---

## 2. Publisher Guide

### 2.1 Getting Started
- **Registration**: Sign up at `/register` as a Publisher.
- **Site Integration**: Add your website/app details in the **Inventory** section.

### 2.2 Managing Inventory
#### Creating Ad Units
1. Navigate to **Inventory**.
2. Click **New Ad Unit**.
3. Select format: **Banner**, **Interstitial**, or **Video**.
4. Copy the generated **Integration Code** (SDK or Tag).
5. Paste the code into your website or app.

### 2.3 Payouts & Revenue
- View your **Earnings** in the Dashboard.
- Configure **Payout Methods** (Bank Transfer, PayPal) in Settings.
- Payouts are processed monthly for earnings exceeding the threshold ($100).

---

## 3. Administrator Guide

### 3.1 User Management
- View all registered Advertisers and Publishers.
- **Approve/Reject** new accounts if manual verification is enabled.
- **Suspend** users for policy violations.

### 3.2 Platform Configuration
- **Fee Settings**: Adjust the platform revenue share percentage.
- **Fraud Settings**: Configure thresholds for IP blocking and click velocity checks (via kdb+ integration).

### 3.3 System Monitoring
- Monitor **System Health** (CPU, Memory, Database Latency).
- View **Audit Logs** for critical system actions.
