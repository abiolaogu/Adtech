# User Manual: Developer — Adtech Platform
> Version: 1.0 | Last Updated: 2026-02-18 | Status: Draft
> Classification: Internal | Author: AIDD System

---

## 1. Introduction

This manual provides developers with comprehensive guidance for integrating with the Adtech Platform via its REST API. It covers authentication, campaign management, ad serving integration, event tracking, customer data operations, and GDPR compliance endpoints.

---

## 2. API Overview

### 2.1 Base URL
```
Production: https://api.adtech.com/api/v1
Development: http://localhost:3000/api/v1
```

### 2.2 Authentication
All API requests (except ad serving and tracking) require authentication via JWT bearer token or API key.

#### JWT Authentication
```bash
# Obtain token
curl -X POST https://api.adtech.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "your_password"}'

# Response
{
  "token": "eyJhbGciOiJSUzI1NiIs...",
  "user": { "id": "uuid", "email": "user@example.com", "role": "USER" }
}

# Use token in subsequent requests
curl -H "Authorization: Bearer eyJhbGciOiJSUzI1NiIs..." \
  https://api.adtech.com/api/v1/adtech/campaigns
```

#### API Key Authentication
```bash
curl -H "X-API-Key: ak_your_api_key_here" \
  https://api.adtech.com/api/v1/adtech/campaigns
```

### 2.3 Response Format
All responses follow this structure:
```json
{
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100
  }
}
```

Error responses:
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid campaign budget",
    "details": [{ "field": "totalBudget", "message": "must be a positive number" }]
  }
}
```

### 2.4 Rate Limits
| Endpoint Category | Limit | Window |
|------------------|-------|--------|
| General API | 100 requests | 15 minutes |
| Auth endpoints | 10 requests | 15 minutes |
| Ad serving | Unlimited | N/A |
| Tracking | Unlimited | N/A |

---

## 3. Authentication Endpoints

### 3.1 Register
```
POST /api/v1/auth/register
```
**Body:**
```json
{
  "email": "user@example.com",
  "password": "secure_password_123",
  "name": "John Doe",
  "organizationName": "Acme Corp"
}
```
**Response:** `201 Created` with JWT token and user object.

### 3.2 Login
```
POST /api/v1/auth/login
```
**Body:**
```json
{
  "email": "user@example.com",
  "password": "secure_password_123"
}
```
**Response:** `200 OK` with JWT token and user object.

### 3.3 Get Current User
```
GET /api/v1/auth/me
Authorization: Bearer <token>
```
**Response:** `200 OK` with user object.

---

## 4. Campaign Management

### 4.1 List Campaigns
```
GET /api/v1/adtech/campaigns
Authorization: Bearer <token>
```
**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| page | number | Page number (default: 1) |
| limit | number | Items per page (default: 20) |
| status | string | Filter by status (DRAFT, ACTIVE, PAUSED, COMPLETED) |

### 4.2 Create Campaign
```
POST /api/v1/adtech/campaigns
Authorization: Bearer <token>
Content-Type: application/json
```
**Body:**
```json
{
  "name": "Summer Sale Campaign",
  "objective": "conversions",
  "totalBudget": 10000,
  "dailyBudget": 500,
  "startDate": "2026-03-01T00:00:00Z",
  "endDate": "2026-03-31T23:59:59Z"
}
```
**Response:** `201 Created` with campaign object (status: DRAFT).

### 4.3 Get Campaign
```
GET /api/v1/adtech/campaigns/:id
Authorization: Bearer <token>
```

### 4.4 Update Campaign
```
PUT /api/v1/adtech/campaigns/:id
Authorization: Bearer <token>
Content-Type: application/json
```
**Body:** Same fields as create (partial updates supported).

### 4.5 Delete Campaign
```
DELETE /api/v1/adtech/campaigns/:id
Authorization: Bearer <token>
```
**Response:** `204 No Content`.

---

## 5. Ad Serving Integration

### 5.1 Serve an Ad
```
GET /api/v1/serve/ad?placementId=P123&deviceType=mobile&country=US
```
**No authentication required** (performance path).

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| placementId | string | Yes | Ad unit placement ID |
| deviceType | string | No | desktop, mobile, tablet |
| country | string | No | ISO 3166-1 alpha-2 country code |

**Response:**
```json
{
  "requestId": "req_abc123",
  "markup": "<div class='ad'>...</div>",
  "format": "display",
  "width": 300,
  "height": 250,
  "trackingPixel": "https://api.adtech.com/api/v1/track/impression/req_abc123"
}
```

### 5.2 Integration Example (JavaScript)
```javascript
// Fetch and render ad
async function loadAd(placementId, container) {
  const response = await fetch(
    `https://api.adtech.com/api/v1/serve/ad?placementId=${placementId}&deviceType=desktop`
  );
  const ad = await response.json();

  // Render ad markup
  container.innerHTML = ad.markup;

  // Fire impression pixel
  const img = new Image();
  img.src = ad.trackingPixel;
}

// Usage
loadAd('placement_homepage_banner', document.getElementById('ad-slot'));
```

---

## 6. Tracking Endpoints

### 6.1 Track Impression
```
GET /api/v1/track/impression/:requestId
```
**No authentication required.** Returns a 1x1 transparent pixel.

### 6.2 Track Click
```
GET /api/v1/track/click/:requestId
```
**No authentication required.** Returns a 302 redirect to the creative's click URL.

### 6.3 Track Conversion
```
POST /api/v1/track/conversion/:requestId
Content-Type: application/json
```
**Body:**
```json
{
  "conversionType": "purchase",
  "value": 49.99,
  "orderId": "ORD-12345"
}
```
**Response:** `200 OK`.

---

## 7. Inventory Management

### 7.1 Create Inventory
```
POST /api/v1/inventory
Authorization: Bearer <token>
Content-Type: application/json
```
**Body (Email Inventory):**
```json
{
  "type": "EMAIL",
  "name": "Tech Newsletter",
  "publisherId": "pub_123",
  "totalSlots": 30,
  "emailListSize": 50000,
  "emailSegments": ["tech", "developers"],
  "floorPrice": 5.0
}
```

### 7.2 Get Available Inventory
```
GET /api/v1/inventory/available
Authorization: Bearer <token>
```

### 7.3 Reserve Inventory
```
POST /api/v1/inventory/reserve
Authorization: Bearer <token>
Content-Type: application/json
```
**Body:**
```json
{
  "inventoryId": "inv_456",
  "slots": 5,
  "startDate": "2026-03-01",
  "endDate": "2026-03-31"
}
```

### 7.4 Get Inventory Analytics
```
GET /api/v1/inventory/:id/analytics
Authorization: Bearer <token>
```

### 7.5 Get Inventory Forecast
```
GET /api/v1/inventory/:id/forecast
Authorization: Bearer <token>
```

---

## 8. Customer Data Platform (MarTech)

### 8.1 Identify Customer
```
POST /api/v1/martech/identify
Authorization: Bearer <token>
Content-Type: application/json
```
**Body:**
```json
{
  "email": "customer@example.com",
  "firstName": "Jane",
  "lastName": "Smith",
  "properties": { "accountType": "premium", "plan": "annual" }
}
```

### 8.2 Track Event
```
POST /api/v1/martech/track
Authorization: Bearer <token>
Content-Type: application/json
```
**Body:**
```json
{
  "email": "customer@example.com",
  "eventType": "purchase",
  "eventName": "Product Purchased",
  "properties": { "value": 99.99, "productId": "PROD-001" }
}
```

### 8.3 Get Customer Profile
```
GET /api/v1/martech/customers/:id/profile
Authorization: Bearer <token>
```

### 8.4 Export Customer Data (GDPR)
```
GET /api/v1/martech/customers/:id/export
Authorization: Bearer <token>
```
Returns a JSON file containing all data associated with the customer.

### 8.5 Delete Customer Data (GDPR)
```
DELETE /api/v1/martech/customers/:id
Authorization: Bearer <token>
```
Permanently deletes all customer PII from all tables.

---

## 9. Audience Segmentation

### 9.1 Create Audience
```
POST /api/v1/martech/audiences
Authorization: Bearer <token>
Content-Type: application/json
```
**Body:**
```json
{
  "name": "High-Value Customers",
  "description": "Customers with 3+ purchases in last 30 days",
  "rules": {
    "behavioral": {
      "events": [{
        "eventName": "purchase",
        "timeframe": { "days": 30 },
        "count": { "operator": "gte", "value": 3 }
      }]
    }
  }
}
```

### 9.2 Build Segment
```
POST /api/v1/martech/audiences/:id/build
Authorization: Bearer <token>
```
Evaluates rules against all customer profiles and updates the member count.

### 9.3 Get Audience Members
```
GET /api/v1/martech/audiences/:id/members
Authorization: Bearer <token>
```

---

## 10. Analytics

### 10.1 Platform Overview
```
GET /api/v1/analytics/overview
Authorization: Bearer <token>
```

### 10.2 Campaign Performance
```
GET /api/v1/analytics/campaigns/:id/performance
Authorization: Bearer <token>
```

### 10.3 Publisher Revenue
```
GET /api/v1/analytics/publishers/:id/revenue
Authorization: Bearer <token>
```

---

## 11. WebSocket Integration

### 11.1 Connecting
```javascript
import { io } from 'socket.io-client';

const socket = io('https://api.adtech.com', {
  auth: { token: 'your_jwt_token' }
});

socket.on('connect', () => console.log('Connected'));
```

### 11.2 Events
| Event | Direction | Payload |
|-------|-----------|---------|
| `auction:completed` | Server -> Client | `{ auctionId, winner, price }` |
| `dashboard:update` | Server -> Client | `{ impressions, revenue, fillRate }` |
| `campaign:status` | Server -> Client | `{ campaignId, status }` |

---

## 12. Error Codes

| Code | HTTP Status | Description |
|------|------------|-------------|
| VALIDATION_ERROR | 400 | Request body validation failed |
| AUTHENTICATION_ERROR | 401 | Missing or invalid token |
| AUTHORIZATION_ERROR | 403 | Insufficient permissions |
| NOT_FOUND | 404 | Resource does not exist |
| RATE_LIMIT_EXCEEDED | 429 | Too many requests |
| INTERNAL_ERROR | 500 | Unexpected server error |

---

## 13. Related Documents
- [Technical Specifications](technical-specifications.md)
- [User Manual - Admin](user-manual-admin.md)
- [User Manual - End User](user-manual-enduser.md)
