# Software Architecture — Adtech Platform
> Version: 1.0 | Last Updated: 2026-02-18 | Status: Draft
> Classification: Internal | Author: AIDD System

---

## 1. Introduction

This document describes the software architecture of the Adtech Platform, detailing the component design, module decomposition, real-time bidding internals, data flow patterns, and integration interfaces. The platform follows a modular monolith pattern with well-defined service boundaries that enable future microservice extraction.

---

## 2. Architectural Style

### 2.1 Modular Monolith
The backend is a single deployable Node.js/Express application composed of isolated service modules. Each module encapsulates its own business logic, routes, and data access layer while sharing the same process and database connection pool.

**Benefits:**
- Simple deployment and debugging during early-stage development
- Low inter-service latency (in-process function calls)
- Clear module boundaries that map to future microservice extraction

### 2.2 Event-Driven Processing
High-throughput event streams (impressions, clicks, conversions) are processed asynchronously via Redis Streams, decoupling the ad-serving hot path from analytics persistence.

### 2.3 CQRS-Lite
Campaign management uses standard CRUD, while analytics reads are optimized through pre-aggregated Redis counters and batch-written database summaries.

---

## 3. Module Decomposition

```
backend/src/
  routes/
    index.ts          -- Route aggregator
    auth.ts           -- Authentication routes
    adtech.ts         -- Campaign, RTB, ad serving routes
    martech.ts        -- CDP, segmentation routes
    inventory.ts      -- Inventory management routes
    analytics.ts      -- Reporting and analytics routes
  services/
    adtech/
      rtb/
        RTBEngine.ts           -- Auction orchestrator (singleton)
        BidOptimizer.ts        -- TensorFlow.js AI bid prediction
        BudgetPacer.ts         -- Daily/total budget pacing
      adserver/
        AdServer.ts            -- Ad selection and serving (singleton)
        CreativeSelector.ts    -- Creative rotation and frequency capping
      fraud/
        FraudDetection.ts      -- 7-layer fraud pipeline
        IPReputationService.ts -- IP scoring
        BotDetector.ts         -- User-agent and behavior analysis
    martech/
      CDP.ts                   -- Customer identification and event tracking
      SegmentationEngine.ts    -- Audience rules evaluation
      ProfileMerger.ts         -- Customer deduplication
    inventory/
      InventoryManager.ts      -- CRUD, reservation, forecasting
      YieldOptimizer.ts        -- Floor price recommendation
    analytics/
      AnalyticsService.ts      -- Aggregation and reporting queries
      PredictiveAnalytics.ts   -- Time-series forecasting
      ABTesting.ts             -- Thompson Sampling experiments
    streaming/
      StreamProcessor.ts       -- Redis Streams consumer/producer
      Aggregator.ts            -- Time-window batch aggregation
    cache/
      MultiLayerCache.ts       -- L1 (LRU) + L2 (Redis) + L3 (DB)
      CacheWarmer.ts           -- Startup prefetching
  middleware/
    auth.ts                    -- JWT verification middleware
    rateLimit.ts               -- Rate limiting middleware
    validation.ts              -- Zod schema validation
    errorHandler.ts            -- Centralized error handling
  prisma/
    schema.prisma              -- Database schema definition
    schema-complete.prisma     -- Full production schema
```

---

## 4. Real-Time Bidding Architecture

### 4.1 Auction Flow

```
Bid Request
     |
     v
+--------------------+
| Fraud Detection    |  <1ms
| (7-layer check)    |
+----+---------------+
     | PASS
     v
+--------------------+
| Campaign Loader    |  <0.5ms (from L1/L2 cache)
| (eligible campaigns)|
+----+---------------+
     |
     v
+--------------------+
| AI Bid Optimizer   |  <5ms
| (TensorFlow.js)    |
| Features:          |
| - Device type      |
| - Country/geo      |
| - Hour of day      |
| - Floor price      |
| - Campaign history |
| - User signals     |
+----+---------------+
     |
     v
+--------------------+
| Second-Price       |  <0.1ms
| Auction            |
| winner = highest   |
| price = 2nd + $0.01|
+----+---------------+
     |
     v
+--------------------+
| Budget Pacer       |  <0.1ms
| (deduct spend,     |
|  check caps)       |
+----+---------------+
     |
     v
  Response (winning creative + tracking URLs)
```

### 4.2 RTBEngine Singleton

```typescript
class RTBEngine {
  private static instance: RTBEngine;
  private bidOptimizer: BidOptimizer;
  private budgetPacer: BudgetPacer;

  static getInstance(): RTBEngine { ... }

  async runAuction(request: AuctionRequest): Promise<AuctionResult> {
    const campaigns = await this.loadEligibleCampaigns(request);
    const bids = await this.bidOptimizer.predictBids(campaigns, request);
    const winner = this.executeSecondPriceAuction(bids, request.floorPrice);
    await this.budgetPacer.deductSpend(winner);
    return winner;
  }
}
```

### 4.3 AI Bid Optimizer
- **Model**: TensorFlow.js neural network (5-layer dense network)
- **Input features**: 15+ contextual signals (device, geo, hour, day, campaign history, floor price, etc.)
- **Output**: Predicted optimal bid price (regression)
- **Training**: Online learning with continuous feedback from auction outcomes
- **Latency**: <5ms inference time

---

## 5. Ad Server Architecture

### 5.1 Serving Pipeline

```
GET /api/v1/serve/ad?placementId=X&...
     |
     v
+-------------------+
| Request Parsing   |
| (validate params) |
+---+---------------+
    |
    v
+-------------------+
| Fraud Check       |
+---+---------------+
    | PASS
    v
+-------------------+
| Run Auction       |
| (RTBEngine)       |
+---+---------------+
    |
    v
+-------------------+
| Creative Render   |
| (HTML/VAST/JSON)  |
+---+---------------+
    |
    v
+-------------------+
| Emit Impression   |
| (Redis Streams)   |
+---+---------------+
    |
    v
  HTTP Response (ad markup + tracking pixel)
```

### 5.2 Supported Ad Formats
| Format | Content Type | Delivery |
|--------|-------------|----------|
| Display Banner | HTML5 / Image | Inline markup |
| Video (VAST) | VAST XML | VAST tag URL |
| Native | JSON | Structured data |
| Email Sponsorship | HTML | Embedded in newsletter |

---

## 6. Event Stream Processing

### 6.1 Stream Architecture

```
Events: impression | click | conversion | custom
          |
          v
+--------------------+
| Redis Streams      |
| (10M events/sec)   |
+----+---------------+
     |
     v
+--------------------+
| Stream Processor   |
| Consumer Group     |
+----+---------------+
     |
     v
+--------------------+
| Time-Window        |
| Aggregator         |
| (1-min buckets)    |
+----+---------------+
     |
     v
+--------------------+
| Batch Writer       |
| (flush to PG every |
|  5 seconds)        |
+----+---------------+
     |
     v
  PostgreSQL (ImpressionLog table)
```

### 6.2 Consumer Group Processing
Multiple consumer instances share the stream workload. Each instance claims a partition of events, aggregates in memory, and flushes to the database in batches for write efficiency.

---

## 7. Frontend Architecture

### 7.1 Component Structure
```
frontend/src/
  main.tsx              -- Application entry point
  App.tsx               -- Router and layout
  store/
    authStore.ts        -- Zustand auth state
  pages/
    Dashboard.tsx       -- Overview analytics
    Campaigns.tsx       -- Campaign management
    Inventory.tsx       -- Inventory management
    Customers.tsx       -- CDP customer profiles
    Audiences.tsx       -- Segment builder
    Analytics.tsx       -- Reporting
    Login.tsx           -- Authentication
  components/
    Layout.tsx          -- Sidebar + header layout
    campaigns/
      NoCodeCampaignBuilder.tsx  -- Drag-and-drop builder
```

### 7.2 State Management
- **Zustand**: Lightweight client state (auth token, user info, UI preferences)
- **TanStack Query**: Server state caching, background refetching, optimistic updates
- **WebSocket (Socket.io)**: Real-time dashboard counters and auction notifications

### 7.3 Data Fetching Pattern
```typescript
// TanStack Query hook pattern
const { data, isLoading } = useQuery({
  queryKey: ['campaigns'],
  queryFn: () => api.get('/adtech/campaigns'),
  staleTime: 30_000,
  refetchInterval: 60_000,
});
```

---

## 8. Integration Points

| Integration | Protocol | Direction | Purpose |
|-------------|----------|-----------|---------|
| Ad exchanges (OpenRTB) | HTTPS/REST | Bidirectional | Programmatic buying/selling |
| Tracking pixels | HTTP GET | Inbound | Impression/click/conversion events |
| WebSocket clients | WSS | Outbound | Real-time dashboard updates |
| CRM systems | REST API | Outbound | Customer data sync (planned) |
| Data providers | REST API | Inbound | Third-party audience data (planned) |
| Billing (Stripe) | REST API | Outbound | Payment processing (planned) |

---

## 9. Error Handling Strategy

### 9.1 Application Errors
- Centralized error handler middleware catches all unhandled errors
- Errors are classified: ValidationError, AuthenticationError, NotFoundError, InternalError
- All errors return consistent JSON format: `{ error: { code, message, details } }`

### 9.2 Ad Serving Resilience
- Auction failures return a blank/default ad (graceful degradation)
- Database connection failures fall back to cached data
- Redis failures fall back to in-memory cache
- Circuit breaker pattern for external integrations (planned)

---

## 10. Testing Architecture

| Level | Framework | Coverage Target |
|-------|----------|-----------------|
| Unit tests | Jest | 80% business logic |
| Integration tests | Jest + Supertest | API endpoint contracts |
| E2E tests | Playwright | Critical user flows |
| Load tests | k6 / Artillery | 10K concurrent requests |

---

## 11. Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Runtime | Node.js + TypeScript | Non-blocking I/O ideal for ad serving; type safety reduces bugs |
| Database | PostgreSQL + Prisma | Relational integrity for campaigns; Prisma provides type-safe queries |
| Cache | Redis + in-memory LRU | Redis Streams for event processing; LRU for sub-millisecond hot path |
| AI/ML | TensorFlow.js | Runs natively in Node.js; no Python microservice required for inference |
| Frontend | React + Vite | Fast HMR development; large ecosystem; Vite 10x faster than Webpack |
| State | Zustand + TanStack Query | Minimal boilerplate; automatic cache management |

---

## 12. Related Documents
- [Architecture](architecture.md)
- [Low-Level Design](lld.md)
- [Database Schema](database-schema.md)
- [Technical Specifications](technical-specifications.md)
