# Training Manual: Developer — Adtech Platform
> Version: 1.0 | Last Updated: 2026-02-18 | Status: Draft
> Classification: Internal | Author: AIDD System

---

## 1. Training Overview

### 1.1 Objective
Enable developers to integrate their applications with the Adtech Platform via REST API, implement ad serving on websites and apps, set up event tracking, and leverage the Customer Data Platform for audience activation.

### 1.2 Target Audience
- Frontend and backend developers integrating with the platform
- Mobile app developers implementing ad SDKs
- Data engineers building analytics pipelines
- DevOps engineers deploying the platform

### 1.3 Prerequisites
- Proficiency in at least one programming language (JavaScript/Python/Go)
- Understanding of REST API concepts
- Familiarity with JSON data formats
- Command-line / terminal proficiency

### 1.4 Duration
Estimated total training time: 10 hours (split across 2-3 days)

---

## 2. Training Curriculum

### Module D1: Environment Setup (1 hour)

**Learning Objectives:**
- Set up a local development environment
- Run the platform locally using Docker
- Verify API connectivity

**Topics:**
1. Prerequisites: Node.js 18+, PostgreSQL 14+, Redis 6+
2. Clone repository and install dependencies
3. Environment variable configuration (.env)
4. Database migration with Prisma
5. Running backend and frontend in development mode
6. Docker Compose for one-command setup

**Hands-on Exercise:**
```bash
# Clone and setup
git clone <repository-url>
cd Adtech
npm run install:all

# Configure environment
cd backend && cp .env.example .env
# Edit .env with local DB/Redis URLs

# Run migrations
npm run prisma:migrate
npm run prisma:generate

# Start development servers
cd .. && npm run dev
```
- Verify backend at http://localhost:3000
- Verify frontend at http://localhost:5173

---

### Module D2: Authentication & API Basics (1 hour)

**Learning Objectives:**
- Obtain JWT tokens via the auth API
- Generate and use API keys
- Understand rate limiting behavior

**Topics:**
1. POST /auth/register and /auth/login
2. JWT token structure and expiry
3. API key generation and usage
4. Authorization header format
5. Rate limit headers (X-RateLimit-*)
6. Error response format and codes

**Hands-on Exercise:**
```bash
# Register a test user
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"dev@test.com","password":"test1234","name":"Dev User","organizationName":"Dev Org"}'

# Login to get token
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"dev@test.com","password":"test1234"}'

# Use token to access protected endpoints
curl -H "Authorization: Bearer <token>" \
  http://localhost:3000/api/v1/auth/me
```

---

### Module D3: Campaign API Integration (1.5 hours)

**Learning Objectives:**
- Create, read, update, and delete campaigns via API
- Manage line items and creatives programmatically
- Understand campaign status lifecycle

**Topics:**
1. Campaign CRUD endpoints
2. Line item management
3. Creative upload and association
4. Campaign status transitions (DRAFT -> ACTIVE -> PAUSED -> COMPLETED)
5. Pagination and filtering
6. Error handling for invalid inputs

**Hands-on Exercise:**
- Create a campaign via API
- Add 2 line items
- Upload 2 creatives and associate them
- List all campaigns with status filter
- Update campaign budget
- Delete a draft campaign

---

### Module D4: Ad Serving Integration (1.5 hours)

**Learning Objectives:**
- Implement ad serving on a web page
- Handle ad responses (display, video, native)
- Implement impression and click tracking

**Topics:**
1. GET /serve/ad endpoint parameters and response
2. Rendering display ads (HTML injection)
3. Rendering video ads (VAST player integration)
4. Rendering native ads (JSON template population)
5. Impression pixel implementation
6. Click tracking redirect flow

**Hands-on Exercise:**
- Create an HTML page with an ad slot
- Fetch an ad from the API and render it
- Implement impression tracking
- Implement click tracking
- Verify events appear in analytics

```html
<!-- Example: Ad slot implementation -->
<div id="ad-slot" style="width:300px;height:250px;"></div>
<script>
fetch('/api/v1/serve/ad?placementId=test_placement&deviceType=desktop')
  .then(r => r.json())
  .then(ad => {
    document.getElementById('ad-slot').innerHTML = ad.markup;
    new Image().src = ad.trackingPixel; // Fire impression
  });
</script>
```

---

### Module D5: Event Tracking & CDP (1.5 hours)

**Learning Objectives:**
- Implement customer identification
- Track custom events
- Build and query audience segments

**Topics:**
1. POST /martech/identify - customer identification
2. POST /martech/track - event tracking
3. Event properties and naming conventions
4. Customer profile querying
5. Audience creation with rules
6. Segment building and member retrieval

**Hands-on Exercise:**
```bash
# Identify a customer
curl -X POST http://localhost:3000/api/v1/martech/identify \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"email":"customer@example.com","firstName":"Jane","lastName":"Doe"}'

# Track an event
curl -X POST http://localhost:3000/api/v1/martech/track \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"email":"customer@example.com","eventType":"purchase","eventName":"Product Purchased","properties":{"value":99.99}}'

# Create audience
curl -X POST http://localhost:3000/api/v1/martech/audiences \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"name":"Buyers","rules":{"behavioral":{"events":[{"eventName":"purchase","timeframe":{"days":30},"count":{"operator":"gte","value":1}}]}}}'
```

---

### Module D6: WebSocket Real-Time Integration (1 hour)

**Learning Objectives:**
- Connect to the WebSocket server
- Subscribe to real-time events
- Build a live dashboard component

**Topics:**
1. Socket.io client setup
2. Authentication via auth token
3. Event types: auction:completed, dashboard:update, campaign:status
4. Reconnection handling
5. Building a real-time metrics component

**Hands-on Exercise:**
```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000', {
  auth: { token: 'your_jwt_token' }
});

socket.on('dashboard:update', (data) => {
  console.log('Live metrics:', data);
  // Update UI counters
});

socket.on('auction:completed', (data) => {
  console.log('Auction:', data.auctionId, 'Winner:', data.winner);
});
```

---

### Module D7: GDPR Compliance Integration (45 minutes)

**Learning Objectives:**
- Implement data export for GDPR Art. 15
- Implement data deletion for GDPR Art. 17
- Handle consent management

**Topics:**
1. GET /martech/customers/:id/export
2. DELETE /martech/customers/:id
3. Consent string handling
4. Data minimization principles
5. Audit trail requirements

**Hands-on Exercise:**
- Export a test customer's data
- Delete a test customer's data
- Verify the deletion was complete

---

### Module D8: Platform Deployment (1 hour)

**Learning Objectives:**
- Build Docker images for the platform
- Deploy to Kubernetes
- Configure CI/CD pipelines

**Topics:**
1. Dockerfile walkthrough
2. Docker Compose for local orchestration
3. Kubernetes deployment manifests
4. CI/CD pipeline overview (Jenkins / Tekton)
5. Environment-specific configuration
6. Health check and readiness probe configuration

**Hands-on Exercise:**
```bash
# Build and run with Docker Compose
docker-compose up -d

# Verify all services are running
docker-compose ps

# View logs
docker-compose logs -f backend
```

---

## 3. Assessment

### 3.1 Knowledge Assessment (10 questions)
1. What is the base URL for the API?
2. How do you authenticate API requests?
3. What HTTP method creates a new campaign?
4. What response format does the ad serving endpoint return?
5. How do you track an impression?
6. What event name do you use to identify a customer in CDP?
7. How do you connect to the WebSocket server?
8. What endpoint exports customer data for GDPR compliance?
9. What is the rate limit for general API endpoints?
10. How do you run database migrations?

### 3.2 Practical Assessment
- Build a simple web page that:
  1. Authenticates with the API
  2. Fetches and displays an ad
  3. Tracks impression and click events
  4. Identifies a customer and tracks a purchase event
  5. Creates an audience segment

---

## 4. Related Documents
- [User Manual - Developer](user-manual-developer.md)
- [Technical Specifications](technical-specifications.md)
- [Software Architecture](software-architecture.md)
- [Deployment](deployment.md)
