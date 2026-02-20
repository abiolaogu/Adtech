# System Architecture — Adtech Platform
> Version: 1.0 | Last Updated: 2026-02-18 | Status: Draft
> Classification: Internal | Author: AIDD System

---

## 1. Overview

The Adtech Platform is a full-stack advertising technology system composed of a React frontend, Node.js/Express backend, PostgreSQL database, and Redis cache. The architecture follows a monolithic-modular design with clear service boundaries that can be decomposed into microservices as scale demands.

---

## 2. Architecture Diagram

```
+------------------------------------------------------------------+
|                        CLIENT LAYER                                |
|  React 18 SPA    |  Mobile Apps (RN)  |  Third-party API clients  |
+--------+---------+--------+-----------+----------+----------------+
         |                  |                      |
         | HTTPS/WSS        | HTTPS                | HTTPS
         v                  v                      v
+------------------------------------------------------------------+
|                     API GATEWAY / INGRESS                          |
|  NGINX Ingress Controller  |  TLS 1.3  |  Rate Limiting (100/min) |
+--------+---------------------------------------------------------+
         |
         v
+------------------------------------------------------------------+
|                   EXPRESS.JS APPLICATION SERVER                     |
|  +------------------+  +------------------+  +------------------+ |
|  | Auth Service     |  | AdTech Service   |  | MarTech Service  | |
|  | - JWT issue      |  | - Campaign CRUD  |  | - CDP identify   | |
|  | - RBAC enforce   |  | - RTB Engine     |  | - Event tracking | |
|  | - API key mgmt   |  | - Ad Server      |  | - Segmentation   | |
|  +------------------+  | - Fraud Detection|  | - Profile merge  | |
|                        +------------------+  +------------------+ |
|  +------------------+  +------------------+  +------------------+ |
|  | Inventory Svc    |  | Analytics Svc    |  | Stream Processor | |
|  | - CRUD inventory |  | - Overview stats |  | - Impression log | |
|  | - Reservation    |  | - Campaign perf  |  | - Click stream   | |
|  | - Forecasting    |  | - Publisher rev   |  | - Conversion log | |
|  | - Yield optim    |  | - Predictions    |  | - Aggregation    | |
|  +------------------+  +------------------+  +------------------+ |
+--------+-----------+-----------+----------------------------------+
         |           |           |
         v           v           v
+------------------------------------------------------------------+
|                      CACHING LAYER                                 |
|  L1: In-Memory LRU (<100us)  |  L2: Redis 7 (<1ms)              |
|  Smart prefetching  |  Pattern-based invalidation  |  Auto-warming|
+--------+-----+------+------------------------------------------ -+
         |     |
         v     v
+------------------------------------------------------------------+
|                       DATA LAYER                                   |
|  +-------------------+  +-------------------+                     |
|  | PostgreSQL 14+    |  | Redis 7+          |                     |
|  | - Users, Orgs     |  | - Session store   |                     |
|  | - Campaigns       |  | - Auction cache   |                     |
|  | - Inventory       |  | - Streams (events)|                     |
|  | - ImpressionLogs  |  | - Pub/Sub         |                     |
|  | - Audiences       |  +-------------------+                     |
|  | (Prisma ORM)      |                                            |
|  +-------------------+                                            |
+------------------------------------------------------------------+
```

---

## 3. Component Descriptions

### 3.1 Client Layer
- **React 18 SPA**: Built with Vite, using Zustand for state, TanStack Query for data fetching, Tailwind CSS for styling, and Recharts for visualizations. Routes include Dashboard, Campaigns, Inventory, Customers, Audiences, and Analytics.
- **Mobile Apps**: React Native shells for admin, advertiser, and publisher roles.
- **API Clients**: External integrations via REST API with JWT or API key authentication.

### 3.2 API Gateway
- **NGINX Ingress Controller**: Handles TLS termination, rate limiting (100 req/min), SSL redirect, and load balancing across backend pods.
- **Cert-Manager**: Automates Let's Encrypt certificate issuance and renewal.

### 3.3 Application Services
All services run within a single Express.js process but are organized as modular service classes:

| Service | Responsibility | Key Classes |
|---------|---------------|-------------|
| Auth | JWT issuance, RBAC, password hashing (bcrypt) | AuthController, AuthMiddleware |
| AdTech | Campaign CRUD, RTB auctions, ad serving, tracking | RTBEngine, AdServer, FraudDetection |
| MarTech | CDP identification, event tracking, segmentation | CDP, SegmentationEngine |
| Inventory | Inventory CRUD, reservation, forecasting, yield optimization | InventoryManager |
| Analytics | Overview stats, campaign performance, publisher revenue, predictions | AnalyticsService, PredictiveAnalytics |
| Stream Processor | Event ingestion, time-window aggregation, batch storage | StreamProcessor |

### 3.4 Caching Layer
Three-tier caching strategy:
- **L1 (In-Memory LRU)**: Per-process cache with ~100us access time, 99% hit rate for hot data
- **L2 (Redis)**: Distributed cache with <1ms access, shared across all application instances
- **L3 (Database)**: PostgreSQL as source of truth, <10ms query time

Cache warming occurs on process startup. Pattern-based invalidation ensures consistency when campaign or inventory state changes.

### 3.5 Data Layer
- **PostgreSQL 14+**: Primary relational store via Prisma ORM. Houses users, organizations, campaigns, line items, creatives, inventory, audiences, impression logs, and reports.
- **Redis 7+**: Used for session storage, auction caching, real-time metrics, Redis Streams for event processing, and pub/sub for WebSocket fan-out.

---

## 4. Data Flow: Ad Serving Request

```
1. Browser/App sends GET /api/v1/serve/ad?placementId=X&deviceType=mobile&country=US
2. NGINX Ingress routes to backend pod
3. Rate limiter checks (0.1ms)
4. Auth bypass (ad serving is unauthenticated for performance)
5. AdServer.serveAd() called
   a. Fraud Detection checks request (IP, user-agent, device fingerprint) — <1ms
   b. If fraud score > threshold, return blank response
   c. RTBEngine.runAuction() called
      i.   Load eligible campaigns from cache (L1 -> L2 -> L3)
      ii.  AI Bid Optimizer predicts optimal bids per campaign
      iii. Execute second-price auction
      iv.  Deduct budget from winning campaign
   d. Return winning creative with impression tracking URL
6. Stream Processor publishes impression event to Redis Streams
7. Aggregator batches and flushes to PostgreSQL every 5 seconds
8. Browser renders ad and fires impression pixel
9. GET /api/v1/track/impression/:requestId logged
```

---

## 5. Communication Patterns

| Pattern | Technology | Use Case |
|---------|-----------|----------|
| Synchronous REST | Express.js HTTP | CRUD operations, ad serving |
| WebSocket | Socket.io | Real-time dashboard updates, auction notifications |
| Event Streaming | Redis Streams | Impression/click/conversion event processing |
| Pub/Sub | Redis Pub/Sub | Cross-instance WebSocket fan-out |

---

## 6. Security Architecture

### 6.1 Defense in Depth
```
Layer 1: DDoS Protection (Cloudflare)
Layer 2: TLS 1.3 termination (NGINX Ingress)
Layer 3: Rate Limiting (100 req/min per IP)
Layer 4: JWT Authentication (RS256)
Layer 5: RBAC Authorization (6 roles)
Layer 6: Input Validation (Zod + Joi)
Layer 7: SQL Injection Protection (Prisma parameterized queries)
Layer 8: XSS Protection (Helmet.js headers)
Layer 9: CORS Policy (allowlist)
Layer 10: Fraud Detection (7-layer engine)
```

### 6.2 Data Protection
- Passwords: bcrypt with 12 salt rounds
- JWT tokens: RS256 signing, 7-day expiry
- Data at rest: AES-256 encryption
- Data in transit: TLS 1.3
- Secrets: Kubernetes Secrets (Sealed Secrets in production)

---

## 7. Scalability Strategy

### 7.1 Horizontal Scaling
- Application pods scale from 3 to 50 replicas via HPA (CPU 70% / Memory 80% targets)
- Stateless design: all state in PostgreSQL/Redis
- Pod Disruption Budget ensures minimum 2 pods during rolling updates

### 7.2 Database Scaling
- Connection pooling (max 100 connections via Prisma)
- Read replicas for analytics queries (planned)
- Data sharding by campaign ID range (planned)

### 7.3 Cache Scaling
- Redis Cluster for horizontal cache scaling (planned)
- Independent Redis instances for cache vs. streams

---

## 8. Monitoring & Observability

| Layer | Tool | Metrics |
|-------|------|---------|
| Application | Prometheus | Request rate, latency percentiles, error rate, cache hit rate |
| Infrastructure | Kubernetes Metrics Server | CPU, memory, pod count |
| Logging | Winston + ELK Stack | Structured JSON logs, daily rotation |
| Tracing | OpenTelemetry (planned) | Distributed request traces |
| Alerting | Grafana Alerts | Error rate >1%, latency p99 >500ms, memory >80% |

---

## 9. Deployment Architecture

```
+-----------------------------------+
|       Load Balancer (NGINX)       |
+--------+--------+--------+-------+
         |        |        |
    +----v--+ +---v---+ +--v----+
    | Pod 1 | | Pod 2 | | Pod N |   (3-50 replicas)
    +---+---+ +---+---+ +---+--+
        |         |          |
   +----v---------v----------v------+
   |       Kubernetes Cluster       |
   +----+--------+--------+--------+
        |        |        |
   +----v--+ +---v---+ +--v------+
   |Postgres| | Redis | |Redis PVC|
   |(Primary)| |(Cache)| |(Streams)|
   +--------+ +-------+ +---------+
```

---

## 10. Technology Stack Summary

| Layer | Technology | Version |
|-------|-----------|---------|
| Frontend | React, Vite, TypeScript, Tailwind CSS, Zustand, TanStack Query | React 18 |
| Backend | Node.js, Express.js, TypeScript, Socket.io | Node 18+ |
| Database | PostgreSQL, Prisma ORM | PG 14+, Prisma 5 |
| Cache | Redis, ioRedis | Redis 7+ |
| AI/ML | TensorFlow.js | Latest |
| Containers | Docker, Kubernetes | K8s 1.27+ |
| CI/CD | Jenkins, Tekton | Jenkins 2.400+ |
| Security | Helmet.js, bcrypt, JWT, Zod | Latest |
| Monitoring | Prometheus, Grafana, Winston | Latest |

---

## 11. Related Documents
- [Software Architecture](software-architecture.md)
- [Enterprise Architecture](enterprise-architecture.md)
- [High-Level Design](hld.md)
- [Low-Level Design](lld.md)
- [Database Schema](database-schema.md)
