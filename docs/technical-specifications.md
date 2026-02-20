# Technical Specifications — Adtech Platform
> Version: 1.0 | Last Updated: 2026-02-18 | Status: Draft
> Classification: Internal | Author: AIDD System

---

## 1. Overview

This document provides the detailed technical specifications for the Adtech Platform, covering API contracts, data formats, protocol support, ad format specifications, and system configuration parameters.

---

## 2. API Specifications

### 2.1 API Standards
| Attribute | Specification |
|-----------|--------------|
| Protocol | HTTPS (TLS 1.3) |
| Style | RESTful |
| Data Format | JSON (application/json) |
| Character Encoding | UTF-8 |
| Versioning | URL path (/api/v1/) |
| Authentication | JWT Bearer token or API Key header |
| Pagination | Offset-based (page, limit query parameters) |
| Date Format | ISO 8601 (e.g., 2026-02-18T10:30:00Z) |
| ID Format | UUID v4 |

### 2.2 HTTP Status Codes
| Code | Meaning | Usage |
|------|---------|-------|
| 200 | OK | Successful GET, PUT, PATCH |
| 201 | Created | Successful POST |
| 204 | No Content | Successful DELETE |
| 400 | Bad Request | Validation error |
| 401 | Unauthorized | Missing or invalid authentication |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource does not exist |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Unexpected server failure |

### 2.3 Request Headers
| Header | Required | Description |
|--------|----------|-------------|
| Authorization | Yes (except ad serving) | `Bearer <jwt_token>` or N/A |
| X-API-Key | Alternative to Authorization | API key for server-to-server |
| Content-Type | Yes (POST/PUT) | `application/json` |
| Accept | No | `application/json` (default) |

### 2.4 Response Headers
| Header | Description |
|--------|-------------|
| X-RateLimit-Limit | Maximum requests per window |
| X-RateLimit-Remaining | Remaining requests in current window |
| X-RateLimit-Reset | Timestamp when the window resets |
| X-Request-Id | Unique request correlation ID |

---

## 3. Endpoint Specifications

### 3.1 Authentication

| Method | Path | Description | Auth Required |
|--------|------|-------------|--------------|
| POST | /api/v1/auth/register | Register new user | No |
| POST | /api/v1/auth/login | Login | No |
| GET | /api/v1/auth/me | Get current user | Yes |

### 3.2 AdTech - Campaigns

| Method | Path | Description | Auth Required |
|--------|------|-------------|--------------|
| GET | /api/v1/adtech/campaigns | List campaigns | Yes |
| POST | /api/v1/adtech/campaigns | Create campaign | Yes |
| GET | /api/v1/adtech/campaigns/:id | Get campaign | Yes |
| PUT | /api/v1/adtech/campaigns/:id | Update campaign | Yes |
| DELETE | /api/v1/adtech/campaigns/:id | Delete campaign | Yes |

### 3.3 Ad Serving & Tracking

| Method | Path | Description | Auth Required |
|--------|------|-------------|--------------|
| GET | /api/v1/serve/ad | Serve an ad | No |
| GET | /api/v1/track/impression/:requestId | Track impression | No |
| GET | /api/v1/track/click/:requestId | Track click | No |
| POST | /api/v1/track/conversion/:requestId | Track conversion | No |

### 3.4 Inventory

| Method | Path | Description | Auth Required |
|--------|------|-------------|--------------|
| POST | /api/v1/inventory | Create inventory | Yes |
| GET | /api/v1/inventory/available | List available inventory | Yes |
| POST | /api/v1/inventory/reserve | Reserve inventory slot | Yes |
| GET | /api/v1/inventory/:id/forecast | Availability forecast | Yes |
| GET | /api/v1/inventory/:id/analytics | Inventory analytics | Yes |
| GET | /api/v1/inventory/:id/optimize-yield | Yield optimization | Yes |

### 3.5 MarTech

| Method | Path | Description | Auth Required |
|--------|------|-------------|--------------|
| POST | /api/v1/martech/identify | Identify customer | Yes |
| POST | /api/v1/martech/track | Track event | Yes |
| GET | /api/v1/martech/customers/:id/profile | Get customer profile | Yes |
| POST | /api/v1/martech/customers/merge | Merge customer profiles | Yes |
| GET | /api/v1/martech/customers/:id/export | Export customer data | Yes |
| DELETE | /api/v1/martech/customers/:id | Delete customer data | Yes |
| POST | /api/v1/martech/audiences | Create audience | Yes |
| POST | /api/v1/martech/audiences/:id/build | Build segment | Yes |
| GET | /api/v1/martech/audiences/:id/members | Get audience members | Yes |

### 3.6 Analytics

| Method | Path | Description | Auth Required |
|--------|------|-------------|--------------|
| GET | /api/v1/analytics/overview | Platform overview | Yes |
| GET | /api/v1/analytics/campaigns/:id/performance | Campaign metrics | Yes |
| GET | /api/v1/analytics/publishers/:id/revenue | Publisher revenue | Yes |

---

## 4. Ad Format Specifications

### 4.1 Display Ads
| Attribute | Specification |
|-----------|--------------|
| Formats | JPEG, PNG, GIF, HTML5, SVG |
| Standard Sizes | 300x250, 728x90, 160x600, 320x50, 970x250 |
| Max File Size | Image: 150KB; HTML5: 200KB |
| HTML5 Requirements | Self-contained; no external script loading |
| Click Tracking | Mandatory click-through URL |

### 4.2 Video Ads
| Attribute | Specification |
|-----------|--------------|
| Protocol | VAST 3.0 / 4.0 |
| Formats | MP4 (H.264), WebM |
| Durations | 15s, 30s, 60s |
| Max File Size | 10MB |
| Placements | Pre-roll, mid-roll, post-roll, out-stream |
| Companion Ads | Supported (300x250 companion) |

### 4.3 Native Ads
| Attribute | Specification |
|-----------|--------------|
| Protocol | OpenRTB Native 1.2 |
| Required Fields | title, description, image, sponsored, clickUrl |
| Image Specs | Main: 1200x627 (1.91:1); Icon: 100x100 |
| Title Length | Max 90 characters |
| Description Length | Max 200 characters |

### 4.4 Email Ads
| Attribute | Specification |
|-----------|--------------|
| Format | HTML (inline CSS only) |
| Width | Max 600px |
| Image Hosting | Must use platform CDN URLs |
| Tracking | Platform-hosted impression pixel |
| Compliance | CAN-SPAM Act compliant |

---

## 5. RTB Protocol Specifications

### 5.1 Auction Mechanics
| Attribute | Specification |
|-----------|--------------|
| Auction Type | Second-price (Vickrey) |
| Timeout | 100ms maximum |
| Floor Price | Configurable per ad unit (default: $0.00) |
| Currency | USD |
| Price Unit | CPM (cost per mille) |
| Bid Increment | $0.01 |
| Clearing Price | Second-highest bid + $0.01 |

### 5.2 OpenRTB Compatibility (Planned)
| Field | Support |
|-------|---------|
| Bid Request (imp, site, device, user) | Planned |
| Bid Response (bid, seat, adm) | Planned |
| Win Notice | Planned |
| Loss Notice | Planned |
| VAST wrapping | Planned |

---

## 6. Data Schemas

### 6.1 Campaign Object
```json
{
  "id": "uuid",
  "userId": "uuid",
  "advertiserId": "uuid | null",
  "name": "string",
  "objective": "conversions | awareness | traffic",
  "totalBudget": "number (>=0)",
  "dailyBudget": "number | null (>=0)",
  "spent": "number (>=0)",
  "startDate": "ISO 8601 datetime",
  "endDate": "ISO 8601 datetime | null",
  "status": "DRAFT | ACTIVE | PAUSED | COMPLETED",
  "createdAt": "ISO 8601 datetime",
  "updatedAt": "ISO 8601 datetime"
}
```

### 6.2 Ad Response Object
```json
{
  "requestId": "string",
  "markup": "string (HTML/VAST/JSON)",
  "format": "display | video | native | email",
  "width": "number",
  "height": "number",
  "trackingPixel": "string (URL)"
}
```

### 6.3 Impression Event
```json
{
  "requestId": "string",
  "campaignId": "string | null",
  "publisherId": "string | null",
  "price": "number (CPM)",
  "timestamp": "ISO 8601 datetime",
  "country": "string (ISO 3166-1 alpha-2)",
  "deviceType": "desktop | mobile | tablet",
  "viewable": "boolean",
  "clicked": "boolean"
}
```

---

## 7. Performance Specifications

| Metric | Target | Measurement |
|--------|--------|-------------|
| Ad serving latency (p50) | < 5ms | Prometheus histogram |
| Ad serving latency (p99) | < 50ms | Prometheus histogram |
| RTB auction latency (p99) | < 100ms | Prometheus histogram |
| API endpoint latency (p95) | < 200ms | Prometheus histogram |
| Cache hit rate (L1+L2) | > 99% | Prometheus counter |
| Event stream throughput | 10M events/sec | Redis Streams metrics |
| Database query latency (p95) | < 10ms | Prisma query logging |
| Fraud detection overhead | < 1ms | Internal timer |
| AI bid prediction latency | < 5ms | TensorFlow.js profiler |

---

## 8. Security Specifications

| Specification | Details |
|--------------|---------|
| Authentication protocol | JWT (RS256), 7-day expiry |
| Password hashing | bcrypt, 12 salt rounds |
| Encryption at rest | AES-256 |
| Encryption in transit | TLS 1.3 |
| Rate limiting | 100 req/15min (general), 10 req/15min (auth) |
| CORS | Configurable allowlist (default: frontend origin) |
| Security headers | Helmet.js (X-Frame-Options, X-Content-Type-Options, etc.) |
| Input validation | Zod schemas on all API inputs |
| SQL injection prevention | Prisma parameterized queries |
| XSS prevention | Content-Security-Policy headers |

---

## 9. Infrastructure Specifications

| Specification | Details |
|--------------|---------|
| Container base image | node:18-alpine |
| Container registry | Configurable (Docker Hub, ECR, GCR) |
| Kubernetes version | >= 1.27 |
| Minimum pod replicas | 3 |
| Maximum pod replicas | 50 |
| HPA CPU threshold | 70% |
| HPA memory threshold | 80% |
| PDB minimum available | 2 |
| Health check path | /health |
| Readiness check path | /ready |
| Graceful shutdown | 15-second pre-stop delay |

---

## 10. Configuration Parameters

| Parameter | Environment Variable | Default | Description |
|-----------|---------------------|---------|-------------|
| Server port | PORT | 3000 | HTTP server port |
| Node environment | NODE_ENV | development | Runtime environment |
| Database URL | DATABASE_URL | (required) | PostgreSQL connection string |
| Redis URL | REDIS_URL | redis://localhost:6379 | Redis connection string |
| JWT secret | JWT_SECRET | (required) | Token signing key |
| JWT expiry | JWT_EXPIRES_IN | 7d | Token expiration period |
| CORS origin | CORS_ORIGIN | http://localhost:5173 | Allowed CORS origin |
| RTB timeout | RTB_TIMEOUT_MS | 100 | Max auction time (ms) |
| Rate limit window | RATE_LIMIT_WINDOW | 15 | Rate limit window (minutes) |
| Rate limit max | RATE_LIMIT_MAX_REQUESTS | 100 | Max requests per window |
| Analytics batch size | ANALYTICS_BATCH_SIZE | 100 | Events per batch write |
| Analytics flush interval | ANALYTICS_FLUSH_INTERVAL | 5000 | Batch write interval (ms) |
| Log level | LOG_LEVEL | info | Winston log level |

---

## 11. Related Documents
- [Software Architecture](software-architecture.md)
- [Database Schema](database-schema.md)
- [User Manual - Developer](user-manual-developer.md)
- [Low-Level Design](lld.md)
