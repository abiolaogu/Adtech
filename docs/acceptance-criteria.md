# Acceptance Criteria — Adtech Platform
> Version: 1.0 | Last Updated: 2026-02-18 | Status: Draft
> Classification: Internal | Author: AIDD System

---

## 1. Overview

This document defines the acceptance criteria for each major feature of the Adtech Platform. Acceptance criteria are written in Given-When-Then (GWT) format and serve as the basis for QA validation and stakeholder acceptance.

---

## 2. Authentication & Authorization

### AC-AUTH-01: User Registration
```
GIVEN a new user with a valid email, password, name, and organization name
WHEN the user submits the registration form
THEN a new user account is created with role USER
AND a new organization is created
AND a JWT token is returned
AND the user can access protected endpoints with the token
```

### AC-AUTH-02: User Login
```
GIVEN a registered user with valid credentials
WHEN the user submits email and password to the login endpoint
THEN a JWT token is returned with user details
AND the token is valid for 7 days
```

### AC-AUTH-03: Invalid Login
```
GIVEN an invalid email or incorrect password
WHEN the user submits login credentials
THEN a 401 Unauthorized error is returned
AND no token is issued
```

### AC-AUTH-04: Role-Based Access
```
GIVEN a user with role USER
WHEN the user attempts to access admin-only endpoints (e.g., user management)
THEN a 403 Forbidden error is returned
```

### AC-AUTH-05: Rate Limiting
```
GIVEN a client making requests to the auth endpoint
WHEN more than 10 requests are made within 15 minutes from the same IP
THEN subsequent requests return 429 Too Many Requests
AND the X-RateLimit-Reset header indicates when the limit resets
```

---

## 3. Campaign Management

### AC-CAMP-01: Create Campaign
```
GIVEN an authenticated advertiser
WHEN a POST request is made to /adtech/campaigns with name, objective, totalBudget, and startDate
THEN a new campaign is created with status DRAFT
AND the campaign ID is returned in the response
AND the spent field is initialized to 0
```

### AC-CAMP-02: Campaign Validation
```
GIVEN a campaign creation request with totalBudget = 0 or negative
WHEN the request is submitted
THEN a 400 Bad Request error is returned
AND the error details specify the invalid field
```

### AC-CAMP-03: Campaign Status Transitions
```
GIVEN a campaign in DRAFT status
WHEN an admin approves the campaign
THEN the status changes to ACTIVE
AND the campaign begins participating in RTB auctions

GIVEN a campaign in ACTIVE status
WHEN an admin pauses the campaign
THEN the status changes to PAUSED
AND the campaign stops participating in auctions immediately

GIVEN a campaign where spent >= totalBudget
WHEN the budget check runs
THEN the status automatically changes to COMPLETED
```

### AC-CAMP-04: Daily Budget Enforcement
```
GIVEN a campaign with dailyBudget = $100
WHEN the campaign's daily spend reaches $100
THEN no further bids are placed for that campaign for the remainder of the day
AND the campaign resumes bidding the next day
```

### AC-CAMP-05: Campaign Deletion
```
GIVEN a campaign in DRAFT status
WHEN a DELETE request is made
THEN the campaign and associated line items are deleted
AND a 204 No Content response is returned

GIVEN a campaign in ACTIVE status
WHEN a DELETE request is made
THEN a 400 error is returned (active campaigns cannot be deleted)
```

---

## 4. Real-Time Bidding

### AC-RTB-01: Auction Execution
```
GIVEN at least 2 active campaigns eligible for a placement
WHEN an ad request is received for that placement
THEN a second-price auction is executed
AND the highest bidder wins
AND the clearing price equals the second-highest bid + $0.01
AND the total auction time is < 100ms
```

### AC-RTB-02: Floor Price Enforcement
```
GIVEN a placement with floor price = $2.00 CPM
WHEN all bids are below $2.00
THEN no ad is served (blank response)
AND no impression is logged

WHEN the highest bid is $3.00 and the second bid is $1.50
THEN the clearing price is $2.01 (floor + $0.01, since floor > second bid)
```

### AC-RTB-03: AI Bid Optimization
```
GIVEN the AI bid optimizer is active
WHEN an auction request is processed
THEN the optimizer generates bid predictions for each eligible campaign
AND the prediction latency is < 5ms
AND the predicted bid considers device type, country, hour, and campaign history
```

### AC-RTB-04: Fraud Detection
```
GIVEN a request from a known bot user-agent
WHEN the fraud detection engine processes the request
THEN the fraud score exceeds the threshold (0.7)
AND the request is blocked
AND no auction is run
AND the blocking is logged for admin review
```

---

## 5. Ad Serving & Tracking

### AC-SERVE-01: Serve Ad
```
GIVEN an active campaign with a creative
WHEN GET /serve/ad is called with a valid placementId
THEN an ad response is returned with markup, format, dimensions, and tracking pixel URL
AND the response time is < 50ms (p99)
AND no authentication is required
```

### AC-SERVE-02: Impression Tracking
```
GIVEN an ad was served with requestId = "req_123"
WHEN GET /track/impression/req_123 is called
THEN a 1x1 transparent pixel is returned
AND an impression event is published to Redis Streams
AND the event is persisted to the ImpressionLog table within 10 seconds
```

### AC-SERVE-03: Click Tracking
```
GIVEN an ad with requestId = "req_123" and clickUrl = "https://example.com"
WHEN GET /track/click/req_123 is called
THEN a 302 redirect is returned to the clickUrl
AND the ImpressionLog entry is updated with clicked = true
```

### AC-SERVE-04: Conversion Tracking
```
GIVEN a click was tracked for requestId = "req_123"
WHEN POST /track/conversion/req_123 is called with conversionType and value
THEN a 200 OK is returned
AND the conversion is attributed to the originating campaign
AND the conversion appears in the campaign performance report
```

---

## 6. Inventory Management

### AC-INV-01: Create Inventory
```
GIVEN an authenticated publisher
WHEN POST /inventory is called with type EMAIL, name, totalSlots, emailListSize, and floorPrice
THEN a new inventory item is created
AND the inventory is available for reservation
```

### AC-INV-02: Inventory Reservation
```
GIVEN inventory with 30 total slots and 10 already reserved
WHEN a reservation request for 5 slots is submitted
THEN 5 slots are reserved (15 remaining)
AND a confirmation is returned

WHEN a reservation request for 25 slots is submitted
THEN a 400 error is returned (insufficient availability)
```

### AC-INV-03: Inventory Forecast
```
GIVEN inventory with at least 30 days of historical data
WHEN GET /inventory/:id/forecast is called
THEN a 30-day forecast of available impressions is returned
AND each day includes predicted impressions and confidence interval
```

---

## 7. Customer Data Platform

### AC-CDP-01: Customer Identification
```
GIVEN a valid email address and customer properties
WHEN POST /martech/identify is called
THEN a customer profile is created or updated
AND the profile contains all provided properties
AND the response includes the customer ID
```

### AC-CDP-02: Event Tracking
```
GIVEN an identified customer
WHEN POST /martech/track is called with eventType, eventName, and properties
THEN the event is recorded and associated with the customer profile
AND the event is published to the martech:events stream
```

### AC-CDP-03: GDPR Data Export
```
GIVEN a customer with tracked data
WHEN GET /martech/customers/:id/export is called
THEN a JSON file is returned containing all customer data
AND the export includes: profile, events, audience memberships
AND the response includes appropriate Content-Disposition headers
```

### AC-CDP-04: GDPR Data Deletion
```
GIVEN a customer with tracked data
WHEN DELETE /martech/customers/:id is called
THEN all customer PII is permanently removed from all tables
AND a 200 OK confirmation is returned
AND subsequent profile queries return 404
```

---

## 8. Audience Segmentation

### AC-AUD-01: Create Audience
```
GIVEN valid audience rules (behavioral events, demographics, or custom properties)
WHEN POST /martech/audiences is called
THEN an audience is created with the specified rules
AND the userCount is initialized to 0
```

### AC-AUD-02: Build Segment
```
GIVEN an audience with rules "purchase count >= 3 in last 30 days"
AND 100 customers have made 3+ purchases in the last 30 days
WHEN POST /martech/audiences/:id/build is called
THEN the audience userCount is updated to 100
AND the audience members are queryable via /audiences/:id/members
```

---

## 9. Analytics & Reporting

### AC-ANA-01: Platform Overview
```
GIVEN active campaigns and served impressions
WHEN GET /analytics/overview is called
THEN the response includes: total impressions, total clicks, total revenue, active campaigns, fill rate
AND data is current within the last 5 minutes
```

### AC-ANA-02: Campaign Performance
```
GIVEN a campaign with served impressions
WHEN GET /analytics/campaigns/:id/performance is called
THEN the response includes: impressions, clicks, CTR, conversions, CPA, spend
AND data can be filtered by date range
AND data can be broken down by device type, country, and creative
```

---

## 10. Non-Functional Acceptance Criteria

### AC-NFR-01: Performance
```
GIVEN production load conditions
THEN ad serving response time p99 < 50ms
AND RTB auction execution p99 < 100ms
AND API endpoint response time p95 < 200ms
AND cache hit rate > 99%
```

### AC-NFR-02: Availability
```
GIVEN the production deployment with 3+ backend pods
THEN platform uptime >= 99.99% over a 30-day period
AND rolling updates cause zero downtime
AND PDB ensures at least 2 pods are available during disruptions
```

### AC-NFR-03: Security
```
GIVEN the production deployment
THEN all external traffic is encrypted with TLS 1.3
AND passwords are hashed with bcrypt (12 rounds)
AND JWT tokens expire after 7 days
AND rate limiting prevents brute-force attacks
AND Zod validation rejects malformed input
```

---

## 11. Related Documents
- [Product Requirements](prd.md)
- [Use Cases](use-cases.md)
- [Testing Requirements](testing-requirements-aidd.md)
- [Technical Specifications](technical-specifications.md)
