# Workflows — Adtech Platform
> Version: 1.0 | Last Updated: 2026-02-18 | Status: Draft
> Classification: Internal | Author: AIDD System

---

## 1. Overview

This document describes the key operational workflows within the Adtech Platform, covering campaign lifecycle, ad serving, inventory management, audience building, and reporting processes.

---

## 2. Campaign Creation Workflow

### 2.1 Flow Diagram

```
Advertiser                 Frontend               Backend                  Database
    |                         |                      |                        |
    |-- Open Campaign Page -->|                      |                        |
    |                         |-- GET /campaigns --->|--- SELECT campaigns -->|
    |                         |<-- Campaign list ----|<-- Result set ---------|
    |                         |                      |                        |
    |-- Click "New Campaign"->|                      |                        |
    |                         |-- Show Builder UI -->|                        |
    |                         |                      |                        |
    |-- Fill campaign form -->|                      |                        |
    |   (name, objective,     |                      |                        |
    |    budget, dates,       |                      |                        |
    |    targeting)           |                      |                        |
    |                         |                      |                        |
    |-- Submit --------------->-- POST /campaigns -->|--- Validate input --->|
    |                         |                      |--- INSERT campaign --->|
    |                         |                      |<-- Campaign record ----|
    |                         |<-- 201 Created ------|                        |
    |<-- Confirmation --------|                      |                        |
```

### 2.2 Steps
1. Advertiser navigates to Campaigns page
2. Clicks "Create Campaign" to open the no-code builder
3. Selects campaign objective (conversions, awareness, traffic)
4. Defines audience targeting (demographics, behaviors, locations)
5. Sets budget (total and daily caps) and schedule (start/end dates)
6. Uploads or selects creatives and associates them with line items
7. Reviews campaign summary
8. Submits campaign (created in DRAFT status)
9. Admin approves campaign (status changes to ACTIVE)
10. RTB engine includes campaign in auctions

### 2.3 Status Transitions

```
DRAFT --> ACTIVE --> PAUSED --> ACTIVE (resume)
  |                    |
  |                    v
  +---------> COMPLETED (budget exhausted or end date reached)
```

---

## 3. Real-Time Bidding Workflow

### 3.1 Flow Diagram

```
Publisher Site       Ad Server        Fraud Engine      RTB Engine        Budget Pacer
     |                  |                  |                |                  |
     |-- Ad request --->|                  |                |                  |
     |                  |-- Check fraud -->|                |                  |
     |                  |<-- Score: OK ----|                |                  |
     |                  |                                   |                  |
     |                  |-- Run auction ------------------>|                  |
     |                  |                                   |-- Load campaigns |
     |                  |                                   |   from cache     |
     |                  |                                   |                  |
     |                  |                                   |-- AI predict bid |
     |                  |                                   |   per campaign   |
     |                  |                                   |                  |
     |                  |                                   |-- 2nd price      |
     |                  |                                   |   auction        |
     |                  |                                   |                  |
     |                  |                                   |-- Deduct spend ->|
     |                  |                                   |<-- Budget OK ----|
     |                  |                                   |                  |
     |                  |<-- Winning creative + price ------|                  |
     |<-- Ad markup ----|                                                     |
     |                  |                                                     |
     |-- Render ad ---->|                                                     |
     |-- Impression px->|-- Log to Redis Streams                             |
```

### 3.2 Timing Budget
| Step | Target Latency |
|------|---------------|
| Request parsing | <0.1ms |
| Fraud detection | <1ms |
| Campaign loading (cache) | <0.5ms |
| AI bid prediction | <5ms |
| Auction execution | <0.1ms |
| Budget deduction | <0.1ms |
| Response serialization | <0.2ms |
| **Total** | **<10ms** |

---

## 4. Impression Tracking Workflow

```
Browser                Backend              Stream Processor       Database
   |                      |                       |                   |
   |-- Load impression -->|                       |                   |
   |   pixel (GET)        |                       |                   |
   |                      |-- Publish event ------>|                   |
   |                      |   (Redis Streams)     |                   |
   |<-- 1x1 pixel --------|                       |                   |
   |                      |                       |-- Aggregate in    |
   |                      |                       |   1-min window    |
   |                      |                       |                   |
   |                      |                       |-- Batch insert -->|
   |                      |                       |   (every 5 sec)   |
   |                      |                       |                   |
```

---

## 5. Click Tracking Workflow

```
User                  Backend                Stream Processor      Database
  |                      |                        |                   |
  |-- Click ad link ---->|                        |                   |
  |   (GET /track/click) |                        |                   |
  |                      |-- Update impression -->|                   |
  |                      |   (clicked=true)       |                   |
  |                      |-- Publish click event->|                   |
  |<-- 302 Redirect -----|                        |                   |
  |   (to clickUrl)      |                        |-- Batch write -->|
  |                      |                        |                   |
```

---

## 6. Conversion Tracking Workflow

```
Advertiser Site        Backend               Stream Processor      Database
     |                    |                        |                   |
     |-- POST /track/ --->|                        |                   |
     |   conversion       |                        |                   |
     |   {requestId,      |-- Validate request -->|                   |
     |    conversionType,  |-- Publish conversion->|                   |
     |    value}           |                        |                   |
     |<-- 200 OK ---------|                        |-- Attribute to   |
     |                    |                        |   campaign        |
     |                    |                        |-- Batch write -->|
     |                    |                        |                   |
```

---

## 7. Inventory Management Workflow

### 7.1 Create Inventory

```
Publisher             Frontend              Backend               Database
    |                    |                     |                      |
    |-- Navigate to ---->|                     |                      |
    |   Inventory page   |                     |                      |
    |                    |                     |                      |
    |-- Select type ---->|                     |                      |
    |   (EMAIL/MOVIE/    |                     |                      |
    |    DISPLAY/NATIVE) |                     |                      |
    |                    |                     |                      |
    |-- Fill details --->|                     |                      |
    |   (name, slots,    |                     |                      |
    |    floor price,    |                     |                      |
    |    segments)       |                     |                      |
    |                    |-- POST /inventory ->|-- Validate -------->|
    |                    |                     |-- INSERT inventory ->|
    |                    |<-- 201 Created -----|<-- Record ----------|
    |<-- Success --------|                     |                      |
```

### 7.2 Inventory Reservation

```
Advertiser/System      Backend               Database
      |                    |                     |
      |-- POST /reserve -->|                     |
      |   {inventoryId,    |-- Check avail. ---->|
      |    slots,           |<-- Available: Y ----|
      |    startDate}      |                     |
      |                    |-- Reserve slots ---->|
      |                    |<-- Confirmation -----|
      |<-- 200 Reserved ---|                     |
```

---

## 8. Audience Building Workflow

```
User                  Frontend              Backend               Database
  |                      |                     |                      |
  |-- Open Audiences --->|                     |                      |
  |-- Create segment --->|                     |                      |
  |   Define rules:      |                     |                      |
  |   - Behavioral       |                     |                      |
  |   - Demographic      |                     |                      |
  |   - Custom props     |                     |                      |
  |                      |-- POST /audiences ->|-- Save rules ------>|
  |                      |                     |                      |
  |-- Build segment ---->|                     |                      |
  |                      |-- POST /build ----->|-- Evaluate rules -->|
  |                      |                     |   against profiles  |
  |                      |                     |-- Update userCount->|
  |                      |<-- Members list ----|<-- Result set ------|
  |<-- Audience ready ---|                     |                      |
```

---

## 9. Reporting Workflow

```
User                  Frontend              Backend               Database
  |                      |                     |                      |
  |-- Open Analytics --->|                     |                      |
  |                      |-- GET /analytics -->|-- Query aggregates->|
  |                      |   /overview         |<-- Stats ----------|
  |                      |<-- Dashboard data --|                      |
  |<-- View dashboard ---|                     |                      |
  |                      |                     |                      |
  |-- Select campaign -->|                     |                      |
  |                      |-- GET /analytics -->|-- Join impression   |
  |                      |   /campaigns/:id   |   logs + campaign   |
  |                      |   /performance     |<-- Performance -----|
  |                      |<-- Metrics ---------|                      |
  |<-- View report ------|                     |                      |
```

---

## 10. User Onboarding Workflow

```
New User              Frontend              Backend               Database
    |                    |                     |                      |
    |-- Visit /login --->|                     |                      |
    |-- Register ------->|                     |                      |
    |   {email, password,|-- POST /register -->|-- Hash password --->|
    |    name, orgName}  |                     |-- Create org ------>|
    |                    |                     |-- Create user ----->|
    |                    |<-- JWT token --------|<-- Records ---------|
    |<-- Redirect to ----|                     |                      |
    |   Dashboard        |                     |                      |
    |                    |                     |                      |
    |-- Create publisher->|-- POST /publishers->|-- INSERT --------->|
    |-- Add inventory --->|-- POST /inventory ->|-- INSERT --------->|
    |-- Create campaign ->|-- POST /campaigns ->|-- INSERT --------->|
    |                    |                     |                      |
    |<-- Platform ready --|                     |                      |
```

---

## 11. CI/CD Deployment Workflow

```
Developer             GitHub               Jenkins/Tekton        Kubernetes
    |                    |                      |                     |
    |-- git push ------->|                      |                     |
    |                    |-- Webhook trigger --->|                     |
    |                    |                      |-- Checkout code     |
    |                    |                      |-- Run lint + tests  |
    |                    |                      |-- Security scan     |
    |                    |                      |-- Build Docker img  |
    |                    |                      |-- Push to registry  |
    |                    |                      |-- Deploy to staging |
    |                    |                      |-- Run E2E tests     |
    |                    |                      |-- Deploy to prod -->|
    |                    |                      |                     |-- Rolling update
    |                    |                      |                     |-- Health checks
    |                    |                      |<-- Deploy success --|
    |                    |<-- Status update -----|                     |
    |<-- Notification ---|                      |                     |
```

---

## 12. Related Documents
- [Architecture](architecture.md)
- [Use Cases](use-cases.md)
- [Deployment](deployment.md)
- [Acceptance Criteria](acceptance-criteria.md)
