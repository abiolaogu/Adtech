# High-Level Design — Adtech Platform
> Version: 1.0 | Last Updated: 2026-02-18 | Status: Draft
> Classification: Internal | Author: AIDD System

---

## 1. Introduction

This High-Level Design (HLD) document presents the overall system design for the Adtech Platform, describing the major subsystems, their interactions, data flows, and deployment topology at a conceptual level suitable for stakeholder review and architectural approval.

---

## 2. System Context

```
                    +---------------------+
                    |   Advertisers       |
                    |   (Web / Mobile)    |
                    +---------+-----------+
                              |
                              v
+-------------------+  +-----------+  +-------------------+
| Publishers        |->|  ADTECH   |<-| Platform Admins   |
| (Web / Mobile)    |  |  PLATFORM |  | (Web / Mobile)    |
+-------------------+  +-----+-----+  +-------------------+
                              |
              +---------------+---------------+
              |               |               |
              v               v               v
      +-------+-----+ +------+------+ +------+------+
      | Ad Exchanges | | Data Provd. | | Payment Gw. |
      | (OpenRTB)    | | (LiveRamp)  | | (Stripe)    |
      +--------------+ +-------------+ +-------------+
```

### 2.1 External Actors
| Actor | Interaction |
|-------|-------------|
| Advertiser | Creates campaigns, uploads creatives, views performance reports |
| Publisher | Registers inventory, configures floor prices, views revenue |
| Admin | Manages platform configuration, users, and compliance |
| Ad Exchanges | Bid request/response via OpenRTB protocol |
| Data Providers | Supply third-party audience data enrichment |
| Payment Gateway | Process billing and payouts |

---

## 3. Major Subsystems

### 3.1 Subsystem Diagram

```
+------------------------------------------------------------------+
|                      PRESENTATION LAYER                            |
|  [React Web App]  [React Native Mobile]  [API Clients]           |
+--------+---------+----------+-----------+---------+---------------+
         |                    |                     |
         +--------------------+---------------------+
                              |
                              v
+------------------------------------------------------------------+
|                      API GATEWAY LAYER                             |
|  [NGINX Ingress] -> [TLS] -> [Rate Limit] -> [CORS]             |
+--------+---------------------------------------------------------+
         |
         v
+------------------------------------------------------------------+
|                    APPLICATION LAYER                               |
|  +---------------+  +----------------+  +------------------+     |
|  | AUTH          |  | ADTECH         |  | MARTECH          |     |
|  | - Login       |  | - Campaigns    |  | - CDP            |     |
|  | - Register    |  | - RTB Engine   |  | - Segmentation   |     |
|  | - RBAC        |  | - Ad Server    |  | - Event Tracking |     |
|  +---------------+  | - Fraud Detect |  +------------------+     |
|                     +----------------+                            |
|  +---------------+  +----------------+  +------------------+     |
|  | INVENTORY     |  | ANALYTICS      |  | STREAMING        |     |
|  | - CRUD        |  | - Dashboards   |  | - Event Ingest   |     |
|  | - Reservation |  | - Predictions  |  | - Aggregation    |     |
|  | - Forecasting |  | - A/B Testing  |  | - Batch Write    |     |
|  +---------------+  +----------------+  +------------------+     |
+--------+---------+-----------+----------------------------------+
         |         |           |
         v         v           v
+------------------------------------------------------------------+
|                      DATA LAYER                                    |
|  [PostgreSQL]  [Redis Cache]  [Redis Streams]                    |
+------------------------------------------------------------------+
```

### 3.2 Subsystem Descriptions

| Subsystem | Purpose | Key Capabilities |
|-----------|---------|-----------------|
| Auth | Identity and access management | JWT issuance, RBAC enforcement, API key management |
| AdTech | Core advertising operations | Campaign CRUD, real-time bidding, ad serving, fraud detection |
| MarTech | Customer data and segmentation | Customer identification, event tracking, audience building |
| Inventory | Supply management | Inventory CRUD, slot reservation, yield optimization, forecasting |
| Analytics | Business intelligence | Dashboard metrics, campaign performance, revenue reporting, predictions |
| Streaming | Event processing | Real-time event ingestion, time-window aggregation, batch persistence |

---

## 4. Key Design Decisions

### 4.1 Modular Monolith over Microservices
**Decision**: Deploy all subsystems within a single Node.js process.
**Rationale**: Simpler operations during early stage; in-process calls eliminate network latency between services; clear module boundaries allow future extraction.

### 4.2 PostgreSQL as Single Source of Truth
**Decision**: Use PostgreSQL for all persistent data.
**Rationale**: Strong ACID guarantees for financial data (budgets, spend); Prisma ORM provides type-safe queries; avoids operational complexity of multiple database engines.

### 4.3 Redis for Caching and Streaming
**Decision**: Use Redis for both caching and event streaming.
**Rationale**: Redis Streams provide durable, ordered event processing; multi-layer caching (L1 in-memory + L2 Redis) achieves 99.9% cache hit rate; single infrastructure dependency.

### 4.4 AI at the Edge
**Decision**: Run TensorFlow.js models within the Node.js process.
**Rationale**: Eliminates network round-trip to a separate ML service; sub-5ms inference latency; model updates deployed with application.

---

## 5. Data Flow Overview

### 5.1 Campaign Lifecycle

```
Create (DRAFT) -> Approve (ACTIVE) -> Serve Ads -> Track Events -> Report
                                          |              |
                                          v              v
                                    Budget Pacing   Analytics Aggregation
                                          |              |
                                          v              v
                                    PAUSED/COMPLETED  Dashboard Updates
```

### 5.2 Ad Serving Data Flow

```
Ad Request -> Fraud Check -> Load Campaigns -> AI Bid -> Auction -> Serve -> Track
                                (Cache)        (TFJS)   (2nd Price)  (HTML)  (Streams)
```

### 5.3 Analytics Data Flow

```
Events (impression/click/conversion)
    |
    v
Redis Streams -> Aggregator (1-min windows) -> Batch Insert -> PostgreSQL
                                                                    |
                                                                    v
                                                            API Queries -> Dashboard
```

---

## 6. Deployment Topology

### 6.1 Production Environment

```
                    Internet
                       |
                       v
              +--------+--------+
              |   Cloudflare    |  (DDoS protection, CDN)
              +--------+--------+
                       |
                       v
              +--------+--------+
              | NGINX Ingress   |  (TLS termination, rate limiting)
              +--------+--------+
                       |
           +-----------+-----------+
           |           |           |
      +----v---+  +----v---+  +---v----+
      | Pod 1  |  | Pod 2  |  | Pod 3  |  (min 3 replicas)
      | Backend|  | Backend|  | Backend|
      +----+---+  +----+---+  +---+----+
           |           |           |
      +----v-----------v-----------v----+
      |         Kubernetes Cluster       |
      +----+--------+--------+---------+
           |        |        |
      +----v--+ +---v---+ +-v--------+
      |Postgres| | Redis | | Redis   |
      |(RDS)   | |(Cache)| |(Streams)|
      +--------+ +-------+ +---------+
```

### 6.2 Scaling Configuration
| Component | Min | Max | Trigger |
|-----------|-----|-----|---------|
| Backend Pods | 3 | 50 | CPU >70% or Memory >80% |
| PostgreSQL | 1 primary + 1 replica | 1 primary + 3 replicas | Read load |
| Redis Cache | 1 | 3 (cluster) | Memory pressure |

---

## 7. Security Design

### 7.1 Authentication Flow

```
Client -> POST /auth/login {email, password}
  -> Backend validates credentials (bcrypt compare)
  -> Backend issues JWT (RS256, 7-day expiry)
  -> Client stores JWT
  -> Client sends JWT in Authorization header for subsequent requests
  -> Middleware validates JWT and attaches user context
  -> RBAC middleware checks user role against route permissions
```

### 7.2 Network Security
- All external traffic encrypted via TLS 1.3
- Kubernetes Network Policies restrict pod-to-pod communication
- Backend pods can only reach PostgreSQL (5432) and Redis (6379)
- Ingress allows only ports 80 (redirect) and 443 (HTTPS)

---

## 8. Integration Design

### 8.1 OpenRTB Integration (Planned)
```
External Exchange -> POST /api/v1/rtb/bid-request
  -> Parse OpenRTB 2.6 bid request object
  -> Extract impression objects, device info, user data
  -> Run internal auction
  -> Return OpenRTB bid response with creative markup
```

### 8.2 Webhook Notifications (Planned)
```
Platform Event (campaign.status.changed) -> Webhook Dispatcher
  -> POST to registered callback URLs
  -> Retry with exponential backoff (3 attempts)
  -> Log delivery status
```

---

## 9. Availability & Reliability

| Metric | Target | Mechanism |
|--------|--------|-----------|
| Uptime | 99.99% | Multi-pod HPA, PDB, rolling updates |
| RTO | < 5 minutes | Kubernetes self-healing, automated pod restart |
| RPO | < 1 minute | Redis AOF persistence, PostgreSQL WAL |
| Data Durability | 99.999% | Multi-AZ database, daily backups (30-day retention) |

---

## 10. Technology Summary

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, TypeScript, Tailwind CSS, Zustand, TanStack Query, Recharts |
| Backend | Node.js 18+, Express.js, TypeScript, Socket.io, Zod, Helmet.js |
| Database | PostgreSQL 14+ (Prisma ORM) |
| Cache/Streams | Redis 7+ (ioRedis) |
| AI/ML | TensorFlow.js |
| Infrastructure | Docker, Kubernetes 1.27+, NGINX Ingress, Cert-Manager |
| CI/CD | Jenkins / Tekton |
| Monitoring | Prometheus, Grafana, Winston |
| Security | JWT (RS256), bcrypt, Helmet.js, Kubernetes NetworkPolicy |

---

## 11. Related Documents
- [Low-Level Design](lld.md)
- [Architecture](architecture.md)
- [Software Architecture](software-architecture.md)
- [Database Schema](database-schema.md)
- [Deployment](deployment.md)
