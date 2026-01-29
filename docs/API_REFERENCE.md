# AdTech Platform API Reference

Version: 1.0.0
Base URL: `https://api.example.com/api/v1`
Last Updated: 2026-01-29

---

## Table of Contents

1. [Authentication](#authentication)
2. [Error Handling](#error-handling)
3. [Rate Limiting](#rate-limiting)
4. [Auth Endpoints](#auth-endpoints)
5. [AdTech Endpoints](#adtech-endpoints)
6. [Campaign Management](#campaign-management)
7. [Creative Management](#creative-management)
8. [Publisher Management](#publisher-management)
9. [Analytics Endpoints](#analytics-endpoints)
10. [Inventory Endpoints](#inventory-endpoints)
11. [MarTech Endpoints](#martech-endpoints)
12. [Audience Segmentation](#audience-segmentation)

---

## Authentication

The AdTech Platform API uses JWT (JSON Web Tokens) for authentication. All authenticated endpoints require a valid JWT token in the request header.

### Header Format

```http
Authorization: Bearer <your_jwt_token>
```

### Token Lifecycle

- **Expiration**: Tokens expire after the configured duration (default: 24 hours)
- **Refresh**: Use the `/auth/refresh` endpoint to obtain a new token
- **Logout**: Remove the token from client storage (stateless JWT)

### Obtaining a Token

Register or login to receive a JWT token:

```bash
# Register
POST /api/v1/auth/register

# Login
POST /api/v1/auth/login
```

---

## Error Handling

All API errors follow a consistent JSON format:

### Error Response Format

```json
{
  "status": "error",
  "message": "Human-readable error message",
  "requestId": "unique-request-identifier",
  "code": "ERROR_CODE"
}
```

### HTTP Status Codes

| Status Code | Description |
|-------------|-------------|
| `200` | Success |
| `201` | Created successfully |
| `204` | Success (no content) |
| `400` | Bad request / Validation error |
| `401` | Unauthorized / Authentication required |
| `403` | Forbidden / Insufficient permissions |
| `404` | Resource not found |
| `409` | Conflict / Duplicate resource |
| `429` | Too many requests / Rate limit exceeded |
| `500` | Internal server error |

### Error Codes

| Code | Description |
|------|-------------|
| `VALIDATION_ERROR` | Request validation failed |
| `AUTHENTICATION_ERROR` | Invalid or expired token |
| `AUTHORIZATION_ERROR` | Insufficient permissions |
| `NOT_FOUND` | Resource not found |
| `RATE_LIMIT_EXCEEDED` | Rate limit exceeded |
| `INTERNAL_ERROR` | Internal server error |
| `DATABASE_ERROR` | Database operation failed |
| `EXTERNAL_SERVICE_ERROR` | External service error |

### Example Error Response

```json
{
  "status": "error",
  "message": "Validation error: email: Invalid email format",
  "requestId": "req_abc123xyz",
  "code": "VALIDATION_ERROR"
}
```

---

## Rate Limiting

The API implements rate limiting to ensure fair usage and system stability.

### Rate Limit Headers

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

### Rate Limit Tiers

| Endpoint Type | Requests per Window | Window Duration |
|---------------|---------------------|-----------------|
| Authentication | 5 requests | 15 minutes |
| Ad Serving | 1000 requests | 1 minute |
| Standard API | 100 requests | 1 minute |
| Delete Operations | 10 requests | 1 minute |
| Export Operations | 5 requests | 1 hour |

---

## Auth Endpoints

### Register User

Create a new user account.

**Endpoint:** `POST /api/v1/auth/register`
**Authentication:** Not required
**Rate Limit:** 5 requests per 15 minutes

#### Request Body

```json
{
  "email": "user@example.com",
  "password": "SecurePass123",
  "name": "John Doe",
  "organizationName": "Acme Corp"
}
```

#### Request Schema

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `email` | string | Yes | Valid email format |
| `password` | string | Yes | Min 8 chars, 1 uppercase, 1 lowercase, 1 number |
| `name` | string | Yes | 2-100 characters |
| `organizationName` | string | No | 2-100 characters |

#### Response (201 Created)

```json
{
  "user": {
    "id": "usr_123abc",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "USER",
    "organizationId": "org_456def",
    "organization": {
      "id": "org_456def",
      "name": "Acme Corp",
      "domain": "example.com"
    },
    "createdAt": "2026-01-29T10:00:00.000Z"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### Error Responses

| Status | Code | Message |
|--------|------|---------|
| 400 | `VALIDATION_ERROR` | An account with this email already exists |
| 400 | `VALIDATION_ERROR` | Validation error: password: Password must contain at least one uppercase letter |

---

### Login

Authenticate user and receive JWT token.

**Endpoint:** `POST /api/v1/auth/login`
**Authentication:** Not required
**Rate Limit:** 5 requests per 15 minutes

#### Request Body

```json
{
  "email": "user@example.com",
  "password": "SecurePass123"
}
```

#### Request Schema

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `email` | string | Yes | Valid email format |
| `password` | string | Yes | Non-empty |

#### Response (200 OK)

```json
{
  "user": {
    "id": "usr_123abc",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "USER",
    "organizationId": "org_456def",
    "organization": {
      "id": "org_456def",
      "name": "Acme Corp",
      "domain": "example.com"
    },
    "createdAt": "2026-01-29T10:00:00.000Z",
    "updatedAt": "2026-01-29T10:00:00.000Z"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### Error Responses

| Status | Code | Message |
|--------|------|---------|
| 401 | `AUTHENTICATION_ERROR` | Invalid email or password |

---

### Get Current User

Retrieve authenticated user profile.

**Endpoint:** `GET /api/v1/auth/me`
**Authentication:** Required
**Authorization:** Any authenticated user

#### Response (200 OK)

```json
{
  "id": "usr_123abc",
  "email": "user@example.com",
  "name": "John Doe",
  "role": "USER",
  "organizationId": "org_456def",
  "organization": {
    "id": "org_456def",
    "name": "Acme Corp",
    "domain": "example.com"
  },
  "createdAt": "2026-01-29T10:00:00.000Z",
  "updatedAt": "2026-01-29T10:00:00.000Z"
}
```

---

### Refresh Token

Generate a new JWT token.

**Endpoint:** `POST /api/v1/auth/refresh`
**Authentication:** Required
**Authorization:** Any authenticated user

#### Response (200 OK)

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

### Logout

Logout user (client-side token removal).

**Endpoint:** `POST /api/v1/auth/logout`
**Authentication:** Required
**Authorization:** Any authenticated user

#### Response (200 OK)

```json
{
  "message": "Logged out successfully",
  "note": "Please remove the JWT token from client storage"
}
```

---

### Change Password

Update user password.

**Endpoint:** `POST /api/v1/auth/change-password`
**Authentication:** Required
**Authorization:** Any authenticated user

#### Request Body

```json
{
  "currentPassword": "OldPass123",
  "newPassword": "NewSecurePass456"
}
```

#### Response (200 OK)

```json
{
  "message": "Password changed successfully"
}
```

#### Error Responses

| Status | Code | Message |
|--------|------|---------|
| 400 | `VALIDATION_ERROR` | New password must be at least 8 characters |
| 401 | `AUTHENTICATION_ERROR` | Current password is incorrect |

---

## AdTech Endpoints

### Serve Ad

Retrieve an ad to display. Public endpoint with optional authentication for user tracking.

**Endpoint:** `GET /api/v1/adtech/serve/ad`
**Authentication:** Optional
**Rate Limit:** 1000 requests per minute

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `placementId` | string | Yes | Ad placement identifier |
| `publisherId` | string | Yes | Publisher identifier |
| `deviceType` | enum | Yes | `mobile`, `desktop`, `tablet`, `ctv` |
| `country` | string | No | 2-letter country code (e.g., `US`) |
| `userId` | string | No | User identifier for tracking |

#### Request Example

```http
GET /api/v1/adtech/serve/ad?placementId=pl_abc123&publisherId=pub_xyz789&deviceType=desktop&country=US
```

#### Response (200 OK)

```json
{
  "requestId": "req_unique_id_123",
  "ad": {
    "campaignId": "cmp_456def",
    "creativeId": "crv_789ghi",
    "content": {
      "type": "IMAGE",
      "imageUrl": "https://cdn.example.com/ad-creative.jpg",
      "clickUrl": "https://example.com/landing",
      "width": 300,
      "height": 250
    }
  },
  "impressionUrl": "https://api.example.com/api/v1/adtech/track/impression/req_unique_id_123",
  "clickUrl": "https://api.example.com/api/v1/adtech/track/click/req_unique_id_123",
  "viewabilityScript": "<!-- Viewability tracking script -->"
}
```

---

### Track Impression

Record an ad impression. Returns a 1x1 transparent pixel.

**Endpoint:** `GET /api/v1/adtech/track/impression/:requestId`
**Authentication:** Not required
**Rate Limit:** 1000 requests per minute

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `requestId` | string | Unique request ID from ad serving |

#### Response (200 OK)

Returns a 1x1 transparent PNG image with appropriate headers.

```http
HTTP/1.1 200 OK
Content-Type: image/png
Content-Length: 68
Cache-Control: no-cache, no-store, must-revalidate
```

---

### Track Click

Record an ad click and redirect to destination URL.

**Endpoint:** `GET /api/v1/adtech/track/click/:requestId`
**Authentication:** Not required
**Rate Limit:** 1000 requests per minute

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `requestId` | string | Unique request ID from ad serving |

#### Response (302 Found)

Redirects to the ad's click URL.

```http
HTTP/1.1 302 Found
Location: https://example.com/landing-page
```

#### Error Responses

| Status | Message |
|--------|---------|
| 404 | Click URL not found |

---

### Track Conversion

Record a conversion event.

**Endpoint:** `POST /api/v1/adtech/track/conversion/:requestId`
**Authentication:** Not required
**Rate Limit:** 1000 requests per minute

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `requestId` | string | Unique request ID from ad serving |

#### Request Body

```json
{
  "value": 49.99
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `value` | number | No | Conversion value (e.g., purchase amount) |

#### Response (200 OK)

```json
{
  "success": true
}
```

---

### Track Viewability

Record viewability metrics for an ad impression.

**Endpoint:** `POST /api/v1/adtech/track/viewability/:requestId`
**Authentication:** Not required
**Rate Limit:** 1000 requests per minute

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `requestId` | string | Unique request ID from ad serving |

#### Request Body

```json
{
  "viewableTime": 1500,
  "viewablePercentage": 75
}
```

| Field | Type | Description |
|-------|------|-------------|
| `viewableTime` | number | Time ad was viewable (milliseconds) |
| `viewablePercentage` | number | Percentage of ad pixels visible |

#### Response (200 OK)

```json
{
  "success": true,
  "viewable": true
}
```

**Note:** An ad is considered viewable per MRC standard when 50%+ pixels visible for 1+ second.

---

## Campaign Management

### List Campaigns

Retrieve all campaigns. Users see only their own campaigns; admins see all.

**Endpoint:** `GET /api/v1/adtech/campaigns`
**Authentication:** Required
**Authorization:** Any authenticated user

#### Response (200 OK)

```json
[
  {
    "id": "cmp_123abc",
    "name": "Summer Sale Campaign",
    "advertiserId": "adv_456def",
    "userId": "usr_789ghi",
    "type": "DISPLAY",
    "objective": "CONVERSION",
    "budget": 5000.00,
    "spent": 1250.00,
    "bidStrategy": "CPC",
    "maxBid": 2.50,
    "targeting": {
      "countries": ["US", "CA"],
      "devices": ["desktop", "mobile"],
      "inventoryTypes": ["DISPLAY"]
    },
    "status": "ACTIVE",
    "impressions": 50000,
    "clicks": 1250,
    "conversions": 125,
    "startDate": "2026-01-01T00:00:00.000Z",
    "endDate": "2026-03-31T23:59:59.999Z",
    "createdAt": "2025-12-15T10:00:00.000Z",
    "updatedAt": "2026-01-29T10:00:00.000Z",
    "advertiser": {
      "id": "adv_456def",
      "name": "Acme Retail"
    },
    "creatives": [
      {
        "id": "cc_001",
        "creativeId": "crv_789xyz",
        "weight": 50,
        "active": true,
        "creative": {
          "id": "crv_789xyz",
          "name": "Summer Banner 300x250",
          "type": "IMAGE"
        }
      }
    ]
  }
]
```

---

### Get Campaign by ID

Retrieve a specific campaign by ID.

**Endpoint:** `GET /api/v1/adtech/campaigns/:id`
**Authentication:** Required
**Authorization:** Campaign owner or ADMIN

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | UUID | Campaign ID |

#### Response (200 OK)

```json
{
  "id": "cmp_123abc",
  "name": "Summer Sale Campaign",
  "advertiserId": "adv_456def",
  "userId": "usr_789ghi",
  "type": "DISPLAY",
  "objective": "CONVERSION",
  "budget": 5000.00,
  "spent": 1250.00,
  "bidStrategy": "CPC",
  "maxBid": 2.50,
  "targeting": {
    "countries": ["US", "CA"],
    "devices": ["desktop", "mobile"]
  },
  "status": "ACTIVE",
  "impressions": 50000,
  "clicks": 1250,
  "conversions": 125,
  "startDate": "2026-01-01T00:00:00.000Z",
  "endDate": "2026-03-31T23:59:59.999Z",
  "createdAt": "2025-12-15T10:00:00.000Z",
  "updatedAt": "2026-01-29T10:00:00.000Z",
  "advertiser": {
    "id": "adv_456def",
    "name": "Acme Retail"
  },
  "creatives": [...],
  "audiences": [...]
}
```

#### Error Responses

| Status | Code | Message |
|--------|------|---------|
| 403 | `AUTHORIZATION_ERROR` | Access denied |
| 404 | `NOT_FOUND` | Campaign not found |

---

### Create Campaign

Create a new advertising campaign.

**Endpoint:** `POST /api/v1/adtech/campaigns`
**Authentication:** Required
**Authorization:** ADMIN, ADVERTISER, USER

#### Request Body

```json
{
  "name": "Holiday Campaign 2026",
  "advertiserId": "adv_456def",
  "userId": "usr_789ghi",
  "type": "DISPLAY",
  "objective": "AWARENESS",
  "budget": 10000.00,
  "bidStrategy": "CPM",
  "maxBid": 5.00,
  "targeting": {
    "countries": ["US", "GB", "CA"],
    "devices": ["desktop", "mobile"],
    "inventoryTypes": ["DISPLAY", "NATIVE"]
  },
  "startDate": "2026-12-01T00:00:00.000Z",
  "endDate": "2026-12-31T23:59:59.999Z"
}
```

#### Request Schema

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `name` | string | Yes | 1-200 characters |
| `advertiserId` | UUID | Yes | Valid advertiser ID |
| `userId` | UUID | Yes | Valid user ID (overridden by auth user) |
| `type` | enum | Yes | `DISPLAY`, `VIDEO`, `EMAIL`, `NATIVE`, `SPONSORED` |
| `objective` | enum | Yes | `AWARENESS`, `CONSIDERATION`, `CONVERSION` |
| `budget` | number | Yes | Positive number |
| `bidStrategy` | enum | Yes | `CPM`, `CPC`, `CPA`, `FIXED` |
| `maxBid` | number | No | Positive number |
| `targeting` | object | No | Targeting criteria |
| `startDate` | datetime | Yes | ISO 8601 datetime |
| `endDate` | datetime | No | ISO 8601 datetime |

#### Response (201 Created)

```json
{
  "id": "cmp_new123",
  "name": "Holiday Campaign 2026",
  "status": "DRAFT",
  "advertiserId": "adv_456def",
  "userId": "usr_789ghi",
  "type": "DISPLAY",
  "objective": "AWARENESS",
  "budget": 10000.00,
  "spent": 0.00,
  "bidStrategy": "CPM",
  "maxBid": 5.00,
  "targeting": {...},
  "impressions": 0,
  "clicks": 0,
  "conversions": 0,
  "startDate": "2026-12-01T00:00:00.000Z",
  "endDate": "2026-12-31T23:59:59.999Z",
  "createdAt": "2026-01-29T10:00:00.000Z",
  "updatedAt": "2026-01-29T10:00:00.000Z",
  "advertiser": {
    "id": "adv_456def",
    "name": "Acme Retail"
  }
}
```

---

### Update Campaign

Update an existing campaign.

**Endpoint:** `PUT /api/v1/adtech/campaigns/:id`
**Authentication:** Required
**Authorization:** Campaign owner or ADMIN

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | UUID | Campaign ID |

#### Request Body

```json
{
  "name": "Updated Campaign Name",
  "budget": 15000.00,
  "maxBid": 6.50,
  "status": "ACTIVE",
  "targeting": {
    "countries": ["US", "CA"]
  }
}
```

All fields are optional. Only provided fields will be updated.

#### Response (200 OK)

Returns the updated campaign object (same format as Get Campaign).

---

### Delete Campaign

Delete a campaign.

**Endpoint:** `DELETE /api/v1/adtech/campaigns/:id`
**Authentication:** Required
**Authorization:** Campaign owner or ADMIN
**Rate Limit:** 10 requests per minute

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | UUID | Campaign ID |

#### Response (204 No Content)

---

### Clone Campaign

Create a copy of an existing campaign.

**Endpoint:** `POST /api/v1/adtech/campaigns/:id/clone`
**Authentication:** Required
**Authorization:** Campaign owner or ADMIN

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | UUID | Campaign ID to clone |

#### Response (201 Created)

Returns the cloned campaign object with a new ID and name suffixed with " (Copy)".

```json
{
  "id": "cmp_clone456",
  "name": "Summer Sale Campaign (Copy)",
  "status": "DRAFT",
  ...
}
```

---

### Bulk Campaign Operations

Perform operations on multiple campaigns at once.

**Endpoint:** `POST /api/v1/adtech/campaigns/bulk`
**Authentication:** Required
**Authorization:** ADMIN, ADVERTISER, USER

#### Request Body

```json
{
  "operation": "pause",
  "campaignIds": [
    "cmp_123abc",
    "cmp_456def",
    "cmp_789ghi"
  ],
  "updates": {
    "status": "PAUSED"
  }
}
```

#### Request Schema

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `operation` | enum | Yes | `update`, `delete`, `pause`, `activate` |
| `campaignIds` | UUID[] | Yes | 1-100 campaign IDs |
| `updates` | object | Conditional | Required for `update` operation |

#### Supported Operations

- **update**: Apply updates to multiple campaigns
- **delete**: Delete multiple campaigns
- **pause**: Set status to PAUSED
- **activate**: Set status to ACTIVE

#### Response (200 OK)

```json
{
  "success": true,
  "operation": "pause",
  "affected": 3,
  "campaignIds": [
    "cmp_123abc",
    "cmp_456def",
    "cmp_789ghi"
  ]
}
```

---

## Creative Management

### List Creatives

Retrieve all creatives.

**Endpoint:** `GET /api/v1/adtech/creatives`
**Authentication:** Required
**Authorization:** Any authenticated user

#### Response (200 OK)

```json
[
  {
    "id": "crv_123abc",
    "name": "Banner Ad 300x250",
    "advertiserId": "adv_456def",
    "type": "IMAGE",
    "format": "300x250",
    "status": "APPROVED",
    "content": {
      "imageUrl": "https://cdn.example.com/banner.jpg",
      "clickUrl": "https://example.com/product"
    },
    "clickUrl": "https://example.com/product",
    "imageUrl": "https://cdn.example.com/banner.jpg",
    "createdAt": "2026-01-15T10:00:00.000Z",
    "updatedAt": "2026-01-20T10:00:00.000Z",
    "advertiser": {
      "id": "adv_456def",
      "name": "Acme Retail"
    }
  }
]
```

---

### Create Creative

Create a new ad creative.

**Endpoint:** `POST /api/v1/adtech/creatives`
**Authentication:** Required
**Authorization:** ADMIN, ADVERTISER, USER

#### Request Body

```json
{
  "name": "Video Ad 30s",
  "advertiserId": "adv_456def",
  "type": "VIDEO",
  "format": "video/mp4",
  "content": {
    "videoUrl": "https://cdn.example.com/video-ad.mp4",
    "duration": 30,
    "clickUrl": "https://example.com/promo"
  },
  "clickUrl": "https://example.com/promo",
  "videoUrl": "https://cdn.example.com/video-ad.mp4"
}
```

#### Request Schema

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `name` | string | Yes | 1-200 characters |
| `advertiserId` | UUID | Yes | Valid advertiser ID |
| `type` | enum | Yes | `IMAGE`, `VIDEO`, `HTML5`, `NATIVE`, `EMAIL` |
| `format` | string | Yes | Creative format/MIME type |
| `content` | object | Yes | Creative content data |
| `clickUrl` | URL | No | Valid URL |
| `imageUrl` | URL | No | Valid URL |
| `videoUrl` | URL | No | Valid URL |
| `htmlContent` | string | No | HTML content |

#### Response (201 Created)

```json
{
  "id": "crv_new789",
  "name": "Video Ad 30s",
  "advertiserId": "adv_456def",
  "type": "VIDEO",
  "format": "video/mp4",
  "status": "PENDING",
  "content": {...},
  "clickUrl": "https://example.com/promo",
  "videoUrl": "https://cdn.example.com/video-ad.mp4",
  "createdAt": "2026-01-29T10:00:00.000Z",
  "updatedAt": "2026-01-29T10:00:00.000Z",
  "advertiser": {
    "id": "adv_456def",
    "name": "Acme Retail"
  }
}
```

**Note:** Creatives are created with `PENDING` status and require admin approval.

---

### Update Creative

Update an existing creative.

**Endpoint:** `PUT /api/v1/adtech/creatives/:id`
**Authentication:** Required
**Authorization:** Any authenticated user

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | UUID | Creative ID |

#### Request Body

```json
{
  "name": "Updated Creative Name",
  "content": {
    "imageUrl": "https://cdn.example.com/new-banner.jpg"
  }
}
```

#### Response (200 OK)

Returns the updated creative object.

---

### Approve Creative

Approve a pending creative (Admin only).

**Endpoint:** `POST /api/v1/adtech/creatives/:id/approve`
**Authentication:** Required
**Authorization:** ADMIN only

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | UUID | Creative ID |

#### Response (200 OK)

```json
{
  "id": "crv_123abc",
  "name": "Banner Ad 300x250",
  "status": "APPROVED",
  ...
}
```

#### Error Responses

| Status | Code | Message |
|--------|------|---------|
| 400 | `VALIDATION_ERROR` | Creative is not pending approval |
| 404 | `NOT_FOUND` | Creative not found |

---

### Reject Creative

Reject a pending creative (Admin only).

**Endpoint:** `POST /api/v1/adtech/creatives/:id/reject`
**Authentication:** Required
**Authorization:** ADMIN only

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | UUID | Creative ID |

#### Request Body

```json
{
  "reason": "Content violates brand safety guidelines"
}
```

#### Response (200 OK)

```json
{
  "id": "crv_123abc",
  "name": "Banner Ad 300x250",
  "status": "REJECTED",
  "content": {
    "rejectionReason": "Content violates brand safety guidelines",
    ...
  },
  ...
}
```

---

## Publisher Management

### List Publishers

Retrieve all publishers.

**Endpoint:** `GET /api/v1/adtech/publishers`
**Authentication:** Required
**Authorization:** ADMIN, PUBLISHER

#### Response (200 OK)

```json
[
  {
    "id": "pub_123abc",
    "name": "Premium News Network",
    "domain": "news.example.com",
    "organizationId": "org_456def",
    "revenueShare": 0.7,
    "createdAt": "2025-11-01T10:00:00.000Z",
    "updatedAt": "2026-01-29T10:00:00.000Z",
    "placements": [
      {
        "id": "pl_789ghi",
        "name": "Homepage Banner",
        "size": "728x90",
        "type": "display"
      }
    ],
    "inventories": [...]
  }
]
```

---

### Create Publisher

Create a new publisher.

**Endpoint:** `POST /api/v1/adtech/publishers`
**Authentication:** Required
**Authorization:** ADMIN only

#### Request Body

```json
{
  "name": "Tech Blog Network",
  "domain": "techblog.example.com",
  "organizationId": "org_789xyz",
  "revenueShare": 0.75
}
```

#### Request Schema

| Field | Type | Required | Default |
|-------|------|----------|---------|
| `name` | string | Yes | - |
| `domain` | string | Yes | - |
| `organizationId` | UUID | No | - |
| `revenueShare` | number | No | 0.7 (70%) |

**Note:** `revenueShare` is the percentage of revenue paid to publisher (0.0 - 1.0).

#### Response (201 Created)

```json
{
  "id": "pub_new456",
  "name": "Tech Blog Network",
  "domain": "techblog.example.com",
  "organizationId": "org_789xyz",
  "revenueShare": 0.75,
  "createdAt": "2026-01-29T10:00:00.000Z",
  "updatedAt": "2026-01-29T10:00:00.000Z"
}
```

---

### Create Ad Placement

Create an ad placement for a publisher.

**Endpoint:** `POST /api/v1/adtech/placements`
**Authentication:** Required
**Authorization:** ADMIN, PUBLISHER

#### Request Body

```json
{
  "publisherId": "pub_123abc",
  "name": "Sidebar Banner",
  "size": "300x600",
  "type": "display",
  "position": "sidebar-right"
}
```

#### Request Schema

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `publisherId` | UUID | Yes | Publisher ID |
| `name` | string | Yes | Placement name |
| `size` | string | Yes | Ad size (e.g., "300x250") |
| `type` | string | Yes | Placement type |
| `position` | string | No | Page position |

#### Response (201 Created)

```json
{
  "id": "pl_new789",
  "publisherId": "pub_123abc",
  "name": "Sidebar Banner",
  "size": "300x600",
  "type": "display",
  "position": "sidebar-right",
  "createdAt": "2026-01-29T10:00:00.000Z",
  "updatedAt": "2026-01-29T10:00:00.000Z"
}
```

---

### Brand Safety Check

Check content for brand safety compliance (Admin only).

**Endpoint:** `POST /api/v1/adtech/brand-safety/check`
**Authentication:** Required
**Authorization:** ADMIN only

#### Request Body

```json
{
  "url": "https://example.com/article",
  "title": "Article Title",
  "description": "Article description",
  "keywords": ["tech", "innovation"],
  "html": "<html>...</html>",
  "domain": "example.com"
}
```

**Note:** At least one content field is required.

#### Response (200 OK)

```json
{
  "safe": true,
  "riskLevel": "LOW",
  "categories": ["technology", "business"],
  "flags": [],
  "score": 0.95,
  "reasons": []
}
```

#### Risk Levels

- `LOW`: Safe for ads
- `MEDIUM`: Caution advised
- `HIGH`: Not recommended for ads
- `CRITICAL`: Blocked content

---

## Analytics Endpoints

### Platform Overview

Get high-level platform statistics.

**Endpoint:** `GET /api/v1/analytics/overview`
**Authentication:** Required
**Authorization:** Any authenticated user

#### Response (200 OK)

```json
{
  "campaigns": {
    "total": 125,
    "active": 45
  },
  "publishers": 18,
  "inventory": 350,
  "customers": 5200,
  "impressionsLast24h": 125000
}
```

---

### Dashboard Analytics

Get aggregated dashboard data for last 30 days.

**Endpoint:** `GET /api/v1/analytics/dashboard`
**Authentication:** Required
**Authorization:** Any authenticated user

#### Response (200 OK)

```json
{
  "totalSpend": 12543.75,
  "totalImpressions": 2500000,
  "totalClicks": 50000,
  "totalConversions": 1250,
  "avgCtr": 2.0,
  "revenueData": [
    {
      "date": "2026-01-15",
      "spend": 450.25,
      "revenue": 500.30,
      "impressions": 100000,
      "clicks": 2000
    },
    ...
  ],
  "performanceData": [
    {
      "date": "2026-01-15",
      "impressions": 100000,
      "clicks": 2000
    },
    ...
  ]
}
```

---

### Campaign Performance

Get detailed performance metrics for a campaign.

**Endpoint:** `GET /api/v1/analytics/campaigns/:id/performance`
**Authentication:** Required
**Authorization:** Campaign owner or ADMIN

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | UUID | Campaign ID |

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `startDate` | datetime | No | Start date (ISO 8601) |
| `endDate` | datetime | No | End date (ISO 8601) |

#### Request Example

```http
GET /api/v1/analytics/campaigns/cmp_123abc/performance?startDate=2026-01-01T00:00:00Z&endDate=2026-01-31T23:59:59Z
```

#### Response (200 OK)

```json
{
  "campaign": {
    "id": "cmp_123abc",
    "name": "Summer Sale Campaign",
    "type": "DISPLAY",
    "status": "ACTIVE",
    "advertiser": {
      "id": "adv_456def",
      "name": "Acme Retail"
    }
  },
  "period": {
    "startDate": "2026-01-01T00:00:00Z",
    "endDate": "2026-01-31T23:59:59Z"
  },
  "metrics": {
    "impressions": 500000,
    "views": 450000,
    "clicks": 10000,
    "conversions": 500,
    "spend": 5000.00,
    "ctr": 2.0,
    "cvr": 5.0,
    "avgCpm": 10.0
  }
}
```

**Metric Definitions:**
- `ctr` (Click-Through Rate): (clicks / impressions) * 100
- `cvr` (Conversion Rate): (conversions / clicks) * 100
- `avgCpm` (Average CPM): (spend / impressions) * 1000

---

### Publisher Revenue

Get revenue analytics for a publisher.

**Endpoint:** `GET /api/v1/analytics/publishers/:id/revenue`
**Authentication:** Required
**Authorization:** ADMIN, PUBLISHER

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | UUID | Publisher ID |

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `startDate` | datetime | No | Start date (ISO 8601) |
| `endDate` | datetime | No | End date (ISO 8601) |

#### Response (200 OK)

```json
{
  "publisher": {
    "id": "pub_123abc",
    "name": "Premium News Network",
    "domain": "news.example.com"
  },
  "period": {
    "startDate": "2026-01-01T00:00:00Z",
    "endDate": "2026-01-31T23:59:59Z"
  },
  "metrics": {
    "totalImpressions": 1000000,
    "totalRevenue": 7000.00,
    "avgCpm": 7.0
  }
}
```

---

### Real-time Analytics

Get real-time metrics from the last hour (Admin only).

**Endpoint:** `GET /api/v1/analytics/realtime`
**Authentication:** Required
**Authorization:** ADMIN only

#### Response (200 OK)

```json
{
  "period": "last_hour",
  "impressions": 125000,
  "bids": 500000,
  "bidWinRate": 25.0,
  "activeCampaigns": 45,
  "timestamp": "2026-01-29T10:00:00.000Z"
}
```

---

### Audience Analytics

Get analytics for a specific audience.

**Endpoint:** `GET /api/v1/analytics/audiences/:id`
**Authentication:** Required
**Authorization:** Audience owner or ADMIN

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | UUID | Audience ID |

#### Response (200 OK)

```json
{
  "audience": {
    "id": "aud_123abc",
    "name": "High-Value Customers",
    "description": "Customers with LTV > $500",
    "userId": "usr_456def",
    "_count": {
      "segments": 12500,
      "campaigns": 8
    }
  },
  "memberCount": 12500,
  "campaignCount": 8
}
```

---

### Export Analytics

Export analytics data in CSV or JSON format.

**Endpoint:** `GET /api/v1/analytics/export`
**Authentication:** Required
**Authorization:** Any authenticated user
**Rate Limit:** 5 requests per hour

#### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `format` | enum | No | `csv` | `csv` or `json` |
| `type` | enum | No | `campaign` | `campaign` or `impression` |
| `startDate` | datetime | No | 30 days ago | Start date (ISO 8601) |
| `endDate` | datetime | No | now | End date (ISO 8601) |

#### Request Example

```http
GET /api/v1/analytics/export?format=csv&type=campaign&startDate=2026-01-01T00:00:00Z&endDate=2026-01-31T23:59:59Z
```

#### Response (200 OK) - CSV Format

```http
HTTP/1.1 200 OK
Content-Type: text/csv
Content-Disposition: attachment; filename="analytics-campaign-1738152000000.csv"

id,name,advertiser,type,status,budget,spent,impressions,clicks,conversions,ctr,cvr,startDate,endDate,createdAt
"cmp_123abc","Summer Sale","Acme Retail","DISPLAY","ACTIVE","5000.00","1250.00","50000","1250","125","2.50","10.00","2026-01-01T00:00:00.000Z","2026-03-31T23:59:59.999Z","2025-12-15T10:00:00.000Z"
```

#### Response (200 OK) - JSON Format

```json
{
  "data": [
    {
      "id": "cmp_123abc",
      "name": "Summer Sale",
      "advertiser": "Acme Retail",
      "type": "DISPLAY",
      "status": "ACTIVE",
      "budget": 5000.00,
      "spent": 1250.00,
      "impressions": 50000,
      "clicks": 1250,
      "conversions": 125,
      "ctr": "2.50",
      "cvr": "10.00",
      "startDate": "2026-01-01T00:00:00.000Z",
      "endDate": "2026-03-31T23:59:59.999Z",
      "createdAt": "2025-12-15T10:00:00.000Z"
    }
  ],
  "exportedAt": "2026-01-29T10:00:00.000Z",
  "count": 1
}
```

**Note:** Impression exports are limited to 10,000 records for performance.

---

## Inventory Endpoints

### Create Inventory

Create new inventory for ad placements.

**Endpoint:** `POST /api/v1/inventory`
**Authentication:** Required
**Authorization:** ADMIN, PUBLISHER

#### Request Body

```json
{
  "type": "EMAIL",
  "name": "Tech Newsletter Sponsorship",
  "description": "Weekly tech newsletter with 50K subscribers",
  "publisherId": "pub_123abc",
  "floorPrice": 25.00,
  "currency": "USD",
  "totalSlots": 4,
  "availableSlots": 4,
  "emailListSize": 50000,
  "emailSegments": ["technology", "software", "startups"]
}
```

#### Request Schema

| Field | Type | Required | Default | Validation |
|-------|------|----------|---------|------------|
| `type` | enum | Yes | - | `EMAIL`, `MOVIE`, `VIDEO`, `DISPLAY`, `NATIVE`, `CUSTOM` |
| `name` | string | Yes | - | 1-200 characters |
| `description` | string | No | - | Max 1000 characters |
| `publisherId` | UUID | Yes | - | Valid publisher ID |
| `floorPrice` | number | No | 0 | Non-negative |
| `currency` | string | No | `USD` | 3-letter code |
| `totalSlots` | number | Yes | - | Positive integer |
| `availableSlots` | number | Yes | - | Non-negative integer |
| `metadata` | object | No | - | Custom metadata |
| `emailListSize` | number | No | - | For EMAIL type |
| `emailSegments` | string[] | No | - | For EMAIL type |
| `contentType` | string | No | - | For MOVIE/VIDEO type |
| `contentGenre` | string[] | No | - | For MOVIE/VIDEO type |
| `contentRating` | string | No | - | For MOVIE/VIDEO type |

#### Response (201 Created)

```json
{
  "id": "inv_789xyz",
  "type": "EMAIL",
  "name": "Tech Newsletter Sponsorship",
  "description": "Weekly tech newsletter with 50K subscribers",
  "publisherId": "pub_123abc",
  "floorPrice": 25.00,
  "currency": "USD",
  "totalSlots": 4,
  "availableSlots": 4,
  "metadata": {},
  "emailListSize": 50000,
  "emailSegments": ["technology", "software", "startups"],
  "createdAt": "2026-01-29T10:00:00.000Z",
  "updatedAt": "2026-01-29T10:00:00.000Z"
}
```

---

### Get Available Inventory

Query available inventory slots.

**Endpoint:** `GET /api/v1/inventory/available`
**Authentication:** Required
**Authorization:** Any authenticated user

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `type` | enum | No | Filter by inventory type |
| `minSlots` | number | No | Minimum available slots |
| `maxPrice` | number | No | Maximum floor price |
| `publisherId` | UUID | No | Filter by publisher |

#### Request Example

```http
GET /api/v1/inventory/available?type=EMAIL&minSlots=2&maxPrice=50
```

#### Response (200 OK)

```json
[
  {
    "id": "inv_789xyz",
    "type": "EMAIL",
    "name": "Tech Newsletter Sponsorship",
    "publisherId": "pub_123abc",
    "floorPrice": 25.00,
    "currency": "USD",
    "totalSlots": 4,
    "availableSlots": 4,
    "emailListSize": 50000,
    "emailSegments": ["technology", "software", "startups"]
  }
]
```

---

### Reserve Inventory Slot

Reserve an inventory slot for a campaign.

**Endpoint:** `POST /api/v1/inventory/reserve`
**Authentication:** Required
**Authorization:** ADMIN, ADVERTISER, USER

#### Request Body

```json
{
  "slotId": "inv_789xyz",
  "campaignId": "cmp_123abc",
  "price": 30.00
}
```

#### Request Schema

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `slotId` | UUID | Yes | Valid inventory ID |
| `campaignId` | UUID | Yes | Valid campaign ID |
| `price` | number | Yes | Positive number |

#### Response (200 OK)

```json
{
  "success": true
}
```

---

### Get Inventory by ID

Retrieve specific inventory details.

**Endpoint:** `GET /api/v1/inventory/:id`
**Authentication:** Required
**Authorization:** Any authenticated user

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | UUID | Inventory ID |

#### Response (200 OK)

```json
{
  "id": "inv_789xyz",
  "type": "EMAIL",
  "name": "Tech Newsletter Sponsorship",
  "description": "Weekly tech newsletter with 50K subscribers",
  "publisherId": "pub_123abc",
  "floorPrice": 25.00,
  "currency": "USD",
  "totalSlots": 4,
  "availableSlots": 2,
  "emailListSize": 50000,
  "emailSegments": ["technology", "software", "startups"],
  "createdAt": "2026-01-29T10:00:00.000Z",
  "updatedAt": "2026-01-29T10:00:00.000Z"
}
```

---

### Get Inventory Forecast

Forecast inventory availability for a date range.

**Endpoint:** `GET /api/v1/inventory/:id/forecast`
**Authentication:** Required
**Authorization:** Any authenticated user

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | UUID | Inventory ID |

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `startDate` | datetime | Yes | Start date (ISO 8601) |
| `endDate` | datetime | Yes | End date (ISO 8601) |

#### Request Example

```http
GET /api/v1/inventory/inv_789xyz/forecast?startDate=2026-02-01T00:00:00Z&endDate=2026-02-28T23:59:59Z
```

#### Response (200 OK)

```json
{
  "inventoryId": "inv_789xyz",
  "period": {
    "startDate": "2026-02-01T00:00:00Z",
    "endDate": "2026-02-28T23:59:59Z"
  },
  "forecast": {
    "totalSlots": 16,
    "reservedSlots": 8,
    "availableSlots": 8,
    "utilizationRate": 50.0,
    "dailyBreakdown": [
      {
        "date": "2026-02-01",
        "availableSlots": 4,
        "reserved": false
      },
      ...
    ]
  }
}
```

---

### Optimize Inventory Yield

Get yield optimization recommendations.

**Endpoint:** `GET /api/v1/inventory/:id/optimize-yield`
**Authentication:** Required
**Authorization:** ADMIN, PUBLISHER

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | UUID | Inventory ID |

#### Response (200 OK)

```json
{
  "inventoryId": "inv_789xyz",
  "currentYield": 25.00,
  "recommendations": [
    {
      "type": "PRICE_ADJUSTMENT",
      "description": "Consider increasing floor price to $28.00",
      "expectedYield": 28.00,
      "confidence": 0.85
    },
    {
      "type": "TARGETING_OPTIMIZATION",
      "description": "Expand targeting to include related categories",
      "expectedYield": 27.50,
      "confidence": 0.75
    }
  ],
  "marketInsights": {
    "avgMarketPrice": 30.00,
    "competitorPricing": [24.00, 28.00, 32.00],
    "demandLevel": "HIGH"
  }
}
```

---

### Get Inventory Analytics

Get detailed analytics for inventory.

**Endpoint:** `GET /api/v1/inventory/:id/analytics`
**Authentication:** Required
**Authorization:** ADMIN, PUBLISHER

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | UUID | Inventory ID |

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `startDate` | datetime | Yes | Start date (ISO 8601) |
| `endDate` | datetime | Yes | End date (ISO 8601) |

#### Response (200 OK)

```json
{
  "inventoryId": "inv_789xyz",
  "period": {
    "startDate": "2026-01-01T00:00:00Z",
    "endDate": "2026-01-31T23:59:59Z"
  },
  "metrics": {
    "totalSlots": 16,
    "reservedSlots": 12,
    "utilization": 75.0,
    "revenue": 360.00,
    "avgPrice": 30.00,
    "impressions": 150000,
    "clicks": 3000,
    "ctr": 2.0
  }
}
```

---

### Update Inventory

Update inventory details.

**Endpoint:** `PUT /api/v1/inventory/:id`
**Authentication:** Required
**Authorization:** ADMIN, PUBLISHER

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | UUID | Inventory ID |

#### Request Body

```json
{
  "name": "Updated Newsletter Name",
  "floorPrice": 28.00,
  "availableSlots": 3
}
```

All fields are optional. Only provided fields will be updated.

#### Response (200 OK)

Returns the updated inventory object.

---

### Delete Inventory

Delete inventory (Admin only).

**Endpoint:** `DELETE /api/v1/inventory/:id`
**Authentication:** Required
**Authorization:** ADMIN only

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | UUID | Inventory ID |

#### Response (204 No Content)

---

## MarTech Endpoints

### Identify Customer

Create or update a customer profile in the CDP.

**Endpoint:** `POST /api/v1/martech/identify`
**Authentication:** Required
**Authorization:** Any authenticated user

#### Request Body

```json
{
  "email": "customer@example.com",
  "phone": "+1234567890",
  "externalId": "ext_cust_12345",
  "firstName": "Jane",
  "lastName": "Smith",
  "attributes": {
    "plan": "premium",
    "signupDate": "2026-01-15",
    "ltv": 500.00
  },
  "tags": ["high-value", "active"]
}
```

#### Request Schema

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `email` | string | Conditional* | Valid email format |
| `phone` | string | Conditional* | Phone number |
| `externalId` | string | Conditional* | External identifier |
| `firstName` | string | No | Max 100 characters |
| `lastName` | string | No | Max 100 characters |
| `attributes` | object | No | Custom attributes |
| `tags` | string[] | No | Customer tags |

**At least one identifier (email, phone, or externalId) is required.*

#### Response (200 OK)

```json
{
  "id": "cst_789xyz",
  "email": "customer@example.com",
  "phone": "+1234567890",
  "externalId": "ext_cust_12345",
  "firstName": "Jane",
  "lastName": "Smith",
  "attributes": {
    "plan": "premium",
    "signupDate": "2026-01-15",
    "ltv": 500.00
  },
  "tags": ["high-value", "active"],
  "createdAt": "2026-01-29T10:00:00.000Z",
  "updatedAt": "2026-01-29T10:00:00.000Z"
}
```

---

### Track Event

Record a customer event for analytics and segmentation.

**Endpoint:** `POST /api/v1/martech/track`
**Authentication:** Required
**Authorization:** Any authenticated user

#### Request Body

```json
{
  "customerId": "cst_789xyz",
  "eventType": "purchase",
  "eventName": "Product Purchased",
  "properties": {
    "productId": "prod_123",
    "productName": "Premium Widget",
    "amount": 99.99,
    "currency": "USD",
    "quantity": 1
  },
  "sessionId": "sess_abc123",
  "deviceType": "desktop",
  "browser": "Chrome"
}
```

#### Request Schema

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `customerId` | UUID | Yes | Customer ID |
| `eventType` | string | Yes | Event type category |
| `eventName` | string | Yes | Event name |
| `properties` | object | No | Event properties |
| `sessionId` | string | No | Session identifier |
| `deviceType` | string | No | Device type |
| `browser` | string | No | Browser name |

#### Response (200 OK)

```json
{
  "id": "evt_456def",
  "customerId": "cst_789xyz",
  "eventType": "purchase",
  "eventName": "Product Purchased",
  "properties": {...},
  "sessionId": "sess_abc123",
  "deviceType": "desktop",
  "browser": "Chrome",
  "createdAt": "2026-01-29T10:00:00.000Z"
}
```

---

### Get Customer Profile

Retrieve a complete customer profile.

**Endpoint:** `GET /api/v1/martech/customers/:id/profile`
**Authentication:** Required
**Authorization:** Any authenticated user

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | UUID | Customer ID |

#### Response (200 OK)

```json
{
  "customer": {
    "id": "cst_789xyz",
    "email": "customer@example.com",
    "phone": "+1234567890",
    "firstName": "Jane",
    "lastName": "Smith",
    "attributes": {...},
    "tags": ["high-value", "active"],
    "createdAt": "2026-01-15T10:00:00.000Z",
    "updatedAt": "2026-01-29T10:00:00.000Z"
  },
  "events": [
    {
      "id": "evt_456def",
      "eventType": "purchase",
      "eventName": "Product Purchased",
      "properties": {...},
      "createdAt": "2026-01-29T10:00:00.000Z"
    }
  ],
  "audiences": [
    {
      "id": "aud_123abc",
      "name": "High-Value Customers"
    }
  ],
  "stats": {
    "totalEvents": 45,
    "lastActive": "2026-01-29T10:00:00.000Z",
    "lifetimeValue": 500.00
  }
}
```

---

### Merge Customers

Merge two customer profiles (Admin only).

**Endpoint:** `POST /api/v1/martech/customers/merge`
**Authentication:** Required
**Authorization:** ADMIN only

#### Request Body

```json
{
  "primaryId": "cst_123abc",
  "secondaryId": "cst_456def"
}
```

**Note:** The secondary customer will be merged into the primary customer and deleted.

#### Request Schema

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `primaryId` | UUID | Yes | Primary customer ID (kept) |
| `secondaryId` | UUID | Yes | Secondary customer ID (merged and deleted) |

#### Response (200 OK)

```json
{
  "primaryCustomer": {
    "id": "cst_123abc",
    "email": "customer@example.com",
    ...
  },
  "mergedEvents": 28,
  "mergedAttributes": ["phone", "externalId"],
  "success": true
}
```

---

### Export Customer Data (GDPR)

Export all customer data for GDPR compliance.

**Endpoint:** `GET /api/v1/martech/customers/:id/export`
**Authentication:** Required
**Authorization:** Any authenticated user
**Rate Limit:** 5 requests per hour

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | UUID | Customer ID |

#### Response (200 OK)

```json
{
  "customer": {
    "id": "cst_789xyz",
    "email": "customer@example.com",
    "phone": "+1234567890",
    "firstName": "Jane",
    "lastName": "Smith",
    "attributes": {...},
    "tags": [...],
    "createdAt": "2026-01-15T10:00:00.000Z",
    "updatedAt": "2026-01-29T10:00:00.000Z"
  },
  "events": [...],
  "segments": [...],
  "campaigns": [...],
  "exportedAt": "2026-01-29T10:00:00.000Z"
}
```

---

### Delete Customer Data (GDPR)

Delete all customer data (Admin only).

**Endpoint:** `DELETE /api/v1/martech/customers/:id`
**Authentication:** Required
**Authorization:** ADMIN only
**Rate Limit:** 10 requests per minute

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | UUID | Customer ID |

#### Response (200 OK)

```json
{
  "success": true,
  "deletedCustomerId": "cst_789xyz",
  "deletedEvents": 45,
  "deletedSegments": 3,
  "deletedAt": "2026-01-29T10:00:00.000Z"
}
```

---

## Audience Segmentation

### Create Audience

Create a new audience segment.

**Endpoint:** `POST /api/v1/martech/audiences`
**Authentication:** Required
**Authorization:** Any authenticated user

#### Request Body

```json
{
  "name": "High-Value Customers",
  "description": "Customers with lifetime value over $500",
  "userId": "usr_123abc",
  "rules": {
    "operator": "AND",
    "conditions": [
      {
        "field": "attributes.ltv",
        "operator": "greater_than",
        "value": 500
      },
      {
        "field": "tags",
        "operator": "contains",
        "value": "active"
      }
    ]
  }
}
```

#### Request Schema

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | 1-200 characters |
| `description` | string | No | Max 1000 characters |
| `userId` | UUID | Yes | User ID (overridden by auth user) |
| `rules` | object | Yes | Segmentation rules |

#### Response (201 Created)

```json
{
  "id": "aud_789xyz",
  "name": "High-Value Customers",
  "description": "Customers with lifetime value over $500",
  "userId": "usr_123abc",
  "rules": {...},
  "size": 0,
  "status": "ACTIVE",
  "createdAt": "2026-01-29T10:00:00.000Z",
  "updatedAt": "2026-01-29T10:00:00.000Z"
}
```

---

### Get Audience by ID

Retrieve audience details.

**Endpoint:** `GET /api/v1/martech/audiences/:id`
**Authentication:** Required
**Authorization:** Audience owner or ADMIN

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | UUID | Audience ID |

#### Response (200 OK)

```json
{
  "id": "aud_789xyz",
  "name": "High-Value Customers",
  "description": "Customers with lifetime value over $500",
  "userId": "usr_123abc",
  "rules": {...},
  "size": 1250,
  "status": "ACTIVE",
  "lastBuiltAt": "2026-01-29T08:00:00.000Z",
  "createdAt": "2026-01-28T10:00:00.000Z",
  "updatedAt": "2026-01-29T10:00:00.000Z"
}
```

---

### Build Audience Segment

Build or rebuild audience segment membership.

**Endpoint:** `POST /api/v1/martech/audiences/:id/build`
**Authentication:** Required
**Authorization:** Any authenticated user

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | UUID | Audience ID |

#### Response (200 OK)

```json
{
  "audienceId": "aud_789xyz",
  "size": 1250
}
```

---

### Get Audience Members

Retrieve members of an audience (paginated).

**Endpoint:** `GET /api/v1/martech/audiences/:id/members`
**Authentication:** Required
**Authorization:** Any authenticated user

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | UUID | Audience ID |

#### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `limit` | number | No | 100 | Results per page (1-1000) |
| `offset` | number | No | 0 | Offset for pagination |

#### Request Example

```http
GET /api/v1/martech/audiences/aud_789xyz/members?limit=50&offset=0
```

#### Response (200 OK)

```json
{
  "audienceId": "aud_789xyz",
  "total": 1250,
  "limit": 50,
  "offset": 0,
  "members": [
    {
      "customerId": "cst_123abc",
      "email": "customer1@example.com",
      "firstName": "Jane",
      "lastName": "Smith",
      "addedAt": "2026-01-29T08:00:00.000Z"
    },
    ...
  ]
}
```

---

### Check Customer in Audience

Check if a customer is a member of an audience.

**Endpoint:** `GET /api/v1/martech/audiences/:audienceId/members/:customerId`
**Authentication:** Required
**Authorization:** Any authenticated user

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `audienceId` | UUID | Audience ID |
| `customerId` | UUID | Customer ID |

#### Response (200 OK)

```json
{
  "isInAudience": true
}
```

---

### Get Customer Audiences

Get all audiences a customer belongs to.

**Endpoint:** `GET /api/v1/martech/customers/:id/audiences`
**Authentication:** Required
**Authorization:** Any authenticated user

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | UUID | Customer ID |

#### Response (200 OK)

```json
[
  {
    "id": "aud_123abc",
    "name": "High-Value Customers",
    "description": "Customers with LTV > $500",
    "size": 1250
  },
  {
    "id": "aud_456def",
    "name": "Recent Buyers",
    "description": "Purchased in last 30 days",
    "size": 850
  }
]
```

---

### Refresh All Audiences

Rebuild all audience segments (Admin only).

**Endpoint:** `POST /api/v1/martech/audiences/refresh-all`
**Authentication:** Required
**Authorization:** ADMIN only

**Note:** This is a heavy operation that rebuilds all audience segments.

#### Response (200 OK)

```json
{
  "success": true
}
```

---

### Delete Audience

Delete an audience.

**Endpoint:** `DELETE /api/v1/martech/audiences/:id`
**Authentication:** Required
**Authorization:** Audience owner or ADMIN
**Rate Limit:** 10 requests per minute

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | UUID | Audience ID |

#### Response (204 No Content)

---

## Appendix

### User Roles

| Role | Description | Capabilities |
|------|-------------|--------------|
| `USER` | Standard user | Create campaigns, view own data |
| `ADVERTISER` | Advertiser account | Create campaigns, creatives, manage budgets |
| `PUBLISHER` | Publisher account | Create inventory, placements, view revenue |
| `ADMIN` | Administrator | Full system access, approve creatives, manage all resources |

### Campaign Types

| Type | Description |
|------|-------------|
| `DISPLAY` | Display banner ads |
| `VIDEO` | Video advertising |
| `EMAIL` | Email sponsorships |
| `NATIVE` | Native advertising |
| `SPONSORED` | Sponsored content |

### Campaign Objectives

| Objective | Description |
|-----------|-------------|
| `AWARENESS` | Brand awareness campaigns |
| `CONSIDERATION` | Drive consideration and engagement |
| `CONVERSION` | Drive conversions and sales |

### Campaign Status

| Status | Description |
|--------|-------------|
| `DRAFT` | Campaign in draft mode |
| `ACTIVE` | Campaign is running |
| `PAUSED` | Campaign temporarily paused |
| `COMPLETED` | Campaign ended successfully |
| `ARCHIVED` | Campaign archived |

### Bid Strategies

| Strategy | Description |
|----------|-------------|
| `CPM` | Cost per thousand impressions |
| `CPC` | Cost per click |
| `CPA` | Cost per acquisition/conversion |
| `FIXED` | Fixed price bidding |

### Creative Status

| Status | Description |
|--------|-------------|
| `PENDING` | Awaiting approval |
| `APPROVED` | Approved for use |
| `REJECTED` | Rejected, not suitable |

### Inventory Types

| Type | Description |
|------|-------------|
| `EMAIL` | Email newsletter inventory |
| `MOVIE` | Movie theater advertising |
| `VIDEO` | Online video inventory |
| `DISPLAY` | Display ad inventory |
| `NATIVE` | Native ad placements |
| `CUSTOM` | Custom inventory type |

---

## Support & Resources

- **API Base URL**: `https://api.example.com/api/v1`
- **Documentation**: https://docs.example.com
- **Support Email**: support@example.com
- **Status Page**: https://status.example.com

---

**Last Updated:** 2026-01-29
**API Version:** 1.0.0
**Documentation Version:** 1.0.0
