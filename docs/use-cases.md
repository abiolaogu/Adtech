# Use Cases — Adtech Platform
> Version: 1.0 | Last Updated: 2026-02-18 | Status: Draft
> Classification: Internal | Author: AIDD System

---

## 1. Overview

This document catalogs the primary use cases for the Adtech Platform organized by actor type: Advertiser, Publisher, Platform Admin, and Developer. Each use case includes an identifier, description, preconditions, flow, postconditions, and alternate/error flows.

---

## 2. Advertiser Use Cases

### UC-A01: Create Campaign

| Attribute | Description |
|-----------|-------------|
| **Actor** | Advertiser |
| **Description** | Advertiser creates a new advertising campaign with budget, schedule, and targeting parameters. |
| **Preconditions** | Advertiser is authenticated; has ADVERTISER or ACCOUNT_MANAGER role. |
| **Main Flow** | 1. Advertiser navigates to Campaigns page. 2. Clicks "New Campaign." 3. Enters name, objective (conversions/awareness/traffic). 4. Defines audience targeting. 5. Sets total budget and optional daily budget. 6. Sets start and end dates. 7. Associates creatives and line items. 8. Clicks "Save as Draft." |
| **Postconditions** | Campaign is created in DRAFT status. Line items and creative associations are persisted. |
| **Alternate Flows** | A1: Advertiser uses a template to pre-fill fields. A2: Advertiser uses the no-code drag-and-drop builder. |
| **Error Flows** | E1: Validation fails (missing name, zero budget) -- error message displayed. E2: Daily budget exceeds total budget -- error message displayed. |

### UC-A02: Monitor Campaign Performance

| Attribute | Description |
|-----------|-------------|
| **Actor** | Advertiser |
| **Description** | Advertiser views real-time and historical performance metrics for an active campaign. |
| **Preconditions** | Campaign exists and is in ACTIVE or COMPLETED status. |
| **Main Flow** | 1. Navigate to Campaign detail page. 2. View impressions, clicks, CTR, conversions, CPA, spend. 3. Filter by date range. 4. View breakdown by device, country, creative. |
| **Postconditions** | None (read-only). |
| **Alternate Flows** | A1: Export report as CSV. A2: View predictive forecast for next 7/30 days. |

### UC-A03: Manage Creatives

| Attribute | Description |
|-----------|-------------|
| **Actor** | Advertiser |
| **Description** | Advertiser uploads, edits, and manages ad creative assets. |
| **Preconditions** | Advertiser is authenticated with appropriate role. |
| **Main Flow** | 1. Navigate to Creative Library. 2. Click "Upload Creative." 3. Select format (display/video/native). 4. Upload content (image, HTML5, VAST XML). 5. Enter creative name and click-through URL. 6. Save creative. |
| **Postconditions** | Creative is persisted and available for association with line items. |
| **Error Flows** | E1: Unsupported file format -- error message. E2: File exceeds size limit -- error message. |

### UC-A04: Define Audience Segment

| Attribute | Description |
|-----------|-------------|
| **Actor** | Advertiser |
| **Description** | Advertiser creates a custom audience segment for campaign targeting. |
| **Preconditions** | CDP has tracked customer data. |
| **Main Flow** | 1. Navigate to Audiences page. 2. Click "Create Audience." 3. Define rules: behavioral events, demographics, custom properties. 4. Preview estimated audience size. 5. Save audience. 6. Build segment (evaluate rules against profiles). |
| **Postconditions** | Audience is created with evaluated member count. |

### UC-A05: Run A/B Test on Creatives

| Attribute | Description |
|-----------|-------------|
| **Actor** | Advertiser |
| **Description** | Advertiser configures an A/B test comparing multiple creative variants. |
| **Preconditions** | At least 2 creatives exist for the campaign. |
| **Main Flow** | 1. Navigate to campaign settings. 2. Enable A/B testing. 3. Select variant creatives. 4. Choose optimization algorithm (Thompson Sampling or even split). 5. Set minimum sample size. 6. Activate test. |
| **Postconditions** | Traffic is split across variants; performance data is collected per variant. |

### UC-A06: Track Conversions

| Attribute | Description |
|-----------|-------------|
| **Actor** | Advertiser |
| **Description** | Advertiser configures conversion tracking on their website. |
| **Preconditions** | Campaign is active with click tracking. |
| **Main Flow** | 1. Navigate to Conversions settings. 2. Copy tracking pixel code. 3. Install pixel on conversion page. 4. Alternatively, configure server-side conversion API endpoint. 5. Verify test conversion fires correctly. |
| **Postconditions** | Conversions are attributed to campaigns and visible in reports. |

---

## 3. Publisher Use Cases

### UC-P01: Register Site and Ad Units

| Attribute | Description |
|-----------|-------------|
| **Actor** | Publisher |
| **Description** | Publisher registers a website and defines ad unit placements. |
| **Preconditions** | Publisher is authenticated with PUBLISHER role. |
| **Main Flow** | 1. Navigate to Publishers section. 2. Add publisher profile. 3. Register site with domain name. 4. Create ad units with name, accepted sizes, and floor price. |
| **Postconditions** | Site and ad units are available for programmatic auction. |

### UC-P02: Manage Inventory

| Attribute | Description |
|-----------|-------------|
| **Actor** | Publisher |
| **Description** | Publisher creates and manages ad inventory across types. |
| **Preconditions** | Publisher profile exists. |
| **Main Flow** | 1. Navigate to Inventory page. 2. Select inventory type (EMAIL, MOVIE, DISPLAY, NATIVE, CUSTOM). 3. Enter details: name, total slots, floor price, segments/genres. 4. Save inventory. |
| **Postconditions** | Inventory is available for reservation and auction. |
| **Alternate Flows** | A1: Update floor price. A2: Deactivate inventory item. |

### UC-P03: View Revenue Analytics

| Attribute | Description |
|-----------|-------------|
| **Actor** | Publisher |
| **Description** | Publisher reviews revenue performance across sites and inventory. |
| **Preconditions** | Publisher has active inventory with served impressions. |
| **Main Flow** | 1. Navigate to Analytics. 2. View revenue dashboard (total earnings, fill rate, eCPM). 3. Filter by site, ad unit, date range. 4. View yield optimization recommendations. |
| **Postconditions** | None (read-only). |

### UC-P04: View Inventory Forecast

| Attribute | Description |
|-----------|-------------|
| **Actor** | Publisher |
| **Description** | Publisher checks predicted inventory availability for future dates. |
| **Preconditions** | Inventory has historical traffic data. |
| **Main Flow** | 1. Navigate to Inventory detail page. 2. Click "Forecast." 3. View 30-day predicted available impressions. 4. Compare reserved vs. available slots. |
| **Postconditions** | None (read-only). |

---

## 4. Platform Admin Use Cases

### UC-AD01: Monitor Platform Health

| Attribute | Description |
|-----------|-------------|
| **Actor** | Platform Admin |
| **Description** | Admin views overall platform health and operational metrics. |
| **Preconditions** | Admin is authenticated with SUPER_ADMIN or ADMIN role. |
| **Main Flow** | 1. Navigate to Admin Dashboard. 2. View total impressions, revenue, active campaigns, fill rate. 3. View system health (error rate, latency, pod count). 4. Review fraud detection alerts. |
| **Postconditions** | None (read-only). |

### UC-AD02: Manage Users and Organizations

| Attribute | Description |
|-----------|-------------|
| **Actor** | Platform Admin |
| **Description** | Admin creates, edits, and deactivates user accounts and organizations. |
| **Preconditions** | Admin has SUPER_ADMIN role. |
| **Main Flow** | 1. Navigate to User Management. 2. View user list with roles and organizations. 3. Create new user or organization. 4. Assign role (SUPER_ADMIN, ADMIN, ACCOUNT_MANAGER, TRAFFICKER, ANALYST, USER). 5. Save changes. |
| **Postconditions** | User/organization record is created or updated. |

### UC-AD03: Review Fraud Alerts

| Attribute | Description |
|-----------|-------------|
| **Actor** | Platform Admin |
| **Description** | Admin investigates fraud detection alerts and takes action. |
| **Preconditions** | Fraud detection engine has flagged suspicious activity. |
| **Main Flow** | 1. Navigate to Fraud Alerts. 2. Review flagged requests with fraud scores. 3. Examine IP addresses, user agents, and session patterns. 4. Block IP address or user agent pattern. 5. Mark alert as resolved or false positive. |
| **Postconditions** | Blocked entities are excluded from future ad serving. |

### UC-AD04: Configure Platform Settings

| Attribute | Description |
|-----------|-------------|
| **Actor** | Platform Admin |
| **Description** | Admin configures global platform settings. |
| **Preconditions** | Admin has SUPER_ADMIN role. |
| **Main Flow** | 1. Navigate to Settings. 2. Configure: rate limits, default revenue share, auction rules, fraud thresholds, data retention periods. 3. Save configuration. |
| **Postconditions** | Configuration changes take effect immediately or on next deployment. |

### UC-AD05: Audit Log Review

| Attribute | Description |
|-----------|-------------|
| **Actor** | Platform Admin |
| **Description** | Admin reviews audit trail of system changes for compliance. |
| **Preconditions** | Audit logging is enabled. |
| **Main Flow** | 1. Navigate to Audit Logs. 2. Filter by user, action type, date range. 3. View log entries (who, what, when, from where). 4. Export logs for compliance review. |
| **Postconditions** | None (read-only). |

---

## 5. Developer Use Cases

### UC-D01: Authenticate via API

| Attribute | Description |
|-----------|-------------|
| **Actor** | Developer |
| **Description** | Developer obtains an authentication token for API access. |
| **Preconditions** | Developer has registered an account. |
| **Main Flow** | 1. POST /api/v1/auth/login with email and password. 2. Receive JWT token. 3. Include token in Authorization header for subsequent requests. |
| **Alternate Flows** | A1: Use API key instead of JWT for server-to-server integration. |

### UC-D02: Manage Campaigns via API

| Attribute | Description |
|-----------|-------------|
| **Actor** | Developer |
| **Description** | Developer creates and manages campaigns programmatically. |
| **Preconditions** | Valid authentication token or API key. |
| **Main Flow** | 1. POST /api/v1/adtech/campaigns with campaign data. 2. GET /api/v1/adtech/campaigns to list campaigns. 3. PUT /api/v1/adtech/campaigns/:id to update. 4. DELETE /api/v1/adtech/campaigns/:id to remove. |
| **Postconditions** | Campaign state is modified in the database. |

### UC-D03: Integrate Ad Serving

| Attribute | Description |
|-----------|-------------|
| **Actor** | Developer |
| **Description** | Developer integrates ad serving on a publisher website. |
| **Preconditions** | Publisher and ad units are registered. |
| **Main Flow** | 1. Call GET /api/v1/serve/ad with placement, device, and country parameters. 2. Receive ad markup (HTML/VAST/JSON). 3. Render ad in the designated ad unit on the page. 4. Impression pixel fires automatically on ad load. 5. Click events redirect through tracking URL. |
| **Postconditions** | Ad is displayed; impression and click events are tracked. |

### UC-D04: Implement Conversion Tracking

| Attribute | Description |
|-----------|-------------|
| **Actor** | Developer |
| **Description** | Developer implements server-side conversion tracking. |
| **Preconditions** | Active campaigns with click tracking. |
| **Main Flow** | 1. Capture requestId from ad click redirect. 2. On conversion event, POST /api/v1/track/conversion/:requestId with conversion type and value. 3. Platform attributes conversion to originating campaign. |
| **Postconditions** | Conversion is logged and attributed in campaign reports. |

### UC-D05: Export Customer Data (GDPR)

| Attribute | Description |
|-----------|-------------|
| **Actor** | Developer |
| **Description** | Developer exports or deletes customer data for GDPR compliance. |
| **Preconditions** | Valid authentication with appropriate permissions. |
| **Main Flow** | 1. GET /api/v1/martech/customers/:id/export to download all customer data as JSON. 2. DELETE /api/v1/martech/customers/:id to permanently erase all customer data. |
| **Postconditions** | Export: JSON file returned. Delete: all PII removed from all tables. |

---

## 6. Use Case Priority Matrix

| ID | Use Case | Actor | Priority | Complexity |
|----|----------|-------|----------|------------|
| UC-A01 | Create Campaign | Advertiser | P0 | Medium |
| UC-A02 | Monitor Performance | Advertiser | P0 | Low |
| UC-P01 | Register Site | Publisher | P0 | Low |
| UC-P02 | Manage Inventory | Publisher | P0 | Medium |
| UC-AD01 | Monitor Health | Admin | P0 | Low |
| UC-D01 | API Authentication | Developer | P0 | Low |
| UC-D03 | Ad Serving Integration | Developer | P0 | Medium |
| UC-A03 | Manage Creatives | Advertiser | P1 | Medium |
| UC-A04 | Define Audience | Advertiser | P1 | High |
| UC-P03 | Revenue Analytics | Publisher | P1 | Medium |
| UC-AD02 | Manage Users | Admin | P1 | Medium |
| UC-A05 | A/B Testing | Advertiser | P2 | High |
| UC-A06 | Conversion Tracking | Advertiser | P1 | Medium |
| UC-P04 | Inventory Forecast | Publisher | P2 | High |
| UC-AD03 | Fraud Alerts | Admin | P1 | Medium |
| UC-D05 | GDPR Export/Delete | Developer | P0 | Medium |

---

## 7. Related Documents
- [Product Requirements](prd.md)
- [Acceptance Criteria](acceptance-criteria.md)
- [Workflows](workflows.md)
- [User Manual - End User](user-manual-enduser.md)
