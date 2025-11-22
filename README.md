# AdTech/MarTech Platform

A comprehensive full-stack advertising technology and marketing technology platform for monetizing inventories and managing customer data.

## Features

### AdTech Capabilities
- **Real-Time Bidding (RTB) Engine** - Run millisecond auctions with second-price auction mechanism
- **Ad Server** - Serve ads across multiple channels (display, video, email, native)
- **Supply-Side Platform (SSP)** - Publishers can monetize their inventory
- **Demand-Side Platform (DSP)** - Advertisers can buy ad placements
- **Campaign Management** - Create and manage advertising campaigns
- **Creative Management** - Upload and manage ad creatives
- **Inventory Management** - Manage email lists, movie placements, and custom inventories

### MarTech Capabilities
- **Customer Data Platform (CDP)** - Unified customer profiles
- **Event Tracking** - Track customer events and behaviors
- **Segmentation Engine** - Create dynamic audience segments
- **Marketing Automation** - Customer journey automation
- **Analytics & Reporting** - Comprehensive analytics dashboards

### Inventory Types Supported
- ✉️ **Email Inventories** - Monetize email lists with sponsored content
- 🎬 **Movie/Video Inventories** - Pre-roll, mid-roll, and post-roll ad placements
- 📱 **Display Inventories** - Banner and display ad placements
- 📰 **Native Inventories** - Native advertising placements
- 🎯 **Custom Inventories** - Define your own inventory types

## Tech Stack

### Backend
- **Runtime:** Node.js with TypeScript
- **Framework:** Express.js
- **Database:** PostgreSQL with Prisma ORM
- **Cache/Queue:** Redis & ioRedis
- **Real-time:** Socket.io for WebSocket connections
- **Authentication:** JWT with bcrypt

### Frontend
- **Framework:** React 18 with TypeScript
- **Build Tool:** Vite
- **Routing:** React Router v6
- **State Management:** Zustand
- **Data Fetching:** TanStack Query (React Query)
- **Styling:** Tailwind CSS
- **Charts:** Recharts
- **Icons:** Lucide React

## Architecture

```
┌─────────────────┐
│   React App     │
│  (Frontend)     │
└────────┬────────┘
         │ HTTP/WS
         ▼
┌─────────────────┐
│  Express API    │
│   (Backend)     │
├─────────────────┤
│  ┌───────────┐  │
│  │ RTB Engine│  │ ← Real-time bidding
│  └───────────┘  │
│  ┌───────────┐  │
│  │ Ad Server │  │ ← Ad serving
│  └───────────┘  │
│  ┌───────────┐  │
│  │    CDP    │  │ ← Customer data
│  └───────────┘  │
│  ┌───────────┐  │
│  │Segmentation│ │ ← Audience segments
│  └───────────┘  │
└────────┬────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌────────┐ ┌─────┐
│Postgres│ │Redis│
└────────┘ └─────┘
```

## Quick Start

### Prerequisites
- Node.js >= 18.x
- PostgreSQL >= 14.x
- Redis >= 6.x
- npm >= 9.x

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd Adtech
```

2. **Install dependencies**
```bash
npm run install:all
```

3. **Setup environment variables**

Backend (`.env`):
```bash
cd backend
cp .env.example .env
# Edit .env with your configuration
```

Required environment variables:
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `JWT_SECRET` - Secret key for JWT tokens
- `PORT` - API server port (default: 3000)

4. **Setup database**
```bash
cd backend
npm run prisma:migrate
npm run prisma:generate
```

5. **Start development servers**

In one terminal (backend):
```bash
cd backend
npm run dev
```

In another terminal (frontend):
```bash
cd frontend
npm run dev
```

Or start both concurrently from root:
```bash
npm run dev
```

6. **Access the application**
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000
- API Docs: http://localhost:3000/api/v1

### First Steps

1. **Register an account**
   - Go to http://localhost:5173/login
   - Create a new account

2. **Create a publisher**
   - Navigate to AdTech > Publishers
   - Add your first publisher

3. **Add inventory**
   - Go to Inventory section
   - Create email, movie, or display inventory

4. **Create a campaign**
   - Navigate to Campaigns
   - Set up your first ad campaign

## API Documentation

### Authentication
```
POST /api/v1/auth/register - Register new user
POST /api/v1/auth/login    - Login
GET  /api/v1/auth/me       - Get current user
```

### AdTech - Campaigns
```
GET    /api/v1/adtech/campaigns     - List campaigns
POST   /api/v1/adtech/campaigns     - Create campaign
GET    /api/v1/adtech/campaigns/:id - Get campaign
PUT    /api/v1/adtech/campaigns/:id - Update campaign
DELETE /api/v1/adtech/campaigns/:id - Delete campaign
```

### AdTech - Ad Serving
```
GET  /api/v1/serve/ad                    - Serve an ad
GET  /api/v1/track/impression/:requestId - Track impression
GET  /api/v1/track/click/:requestId      - Track click
POST /api/v1/track/conversion/:requestId - Track conversion
```

### Inventory Management
```
POST /api/v1/inventory                 - Create inventory
GET  /api/v1/inventory/available       - Get available inventory
POST /api/v1/inventory/reserve         - Reserve inventory slot
GET  /api/v1/inventory/:id/forecast    - Get availability forecast
GET  /api/v1/inventory/:id/analytics   - Get inventory analytics
GET  /api/v1/inventory/:id/optimize-yield - Get yield optimization
```

### MarTech - Customer Data Platform
```
POST   /api/v1/martech/identify           - Identify customer
POST   /api/v1/martech/track               - Track event
GET    /api/v1/martech/customers/:id/profile - Get customer profile
POST   /api/v1/martech/customers/merge     - Merge customers
GET    /api/v1/martech/customers/:id/export - Export customer data (GDPR)
DELETE /api/v1/martech/customers/:id       - Delete customer data (GDPR)
```

### MarTech - Segmentation
```
POST /api/v1/martech/audiences              - Create audience
POST /api/v1/martech/audiences/:id/build    - Build segment
GET  /api/v1/martech/audiences/:id/members  - Get audience members
GET  /api/v1/martech/customers/:id/audiences - Get customer's audiences
```

### Analytics
```
GET /api/v1/analytics/overview                    - Platform overview
GET /api/v1/analytics/campaigns/:id/performance   - Campaign performance
GET /api/v1/analytics/publishers/:id/revenue      - Publisher revenue
```

## Core Components

### RTB Engine
The RTB (Real-Time Bidding) engine runs auctions in under 100ms:

```typescript
import { RTBEngine } from './services/adtech/rtb/RTBEngine';

const rtb = RTBEngine.getInstance();
const result = await rtb.runAuction({
  requestId: 'req_123',
  placementId: 'placement_456',
  deviceType: 'mobile',
  country: 'US',
  floorPrice: 0.5
});
```

### Ad Server
Serve ads and track impressions:

```typescript
import { AdServer } from './services/adtech/adserver/AdServer';

const adServer = AdServer.getInstance();
const ad = await adServer.serveAd({
  placementId: 'placement_123',
  publisherId: 'pub_456',
  deviceType: 'desktop'
});
```

### Customer Data Platform
Track customer events and build profiles:

```typescript
import { CDP } from './services/martech/CDP';

const cdp = CDP.getInstance();

// Identify customer
await cdp.identify({
  email: 'user@example.com',
  firstName: 'John',
  lastName: 'Doe'
});

// Track event
await cdp.track({
  email: 'user@example.com',
  eventType: 'purchase',
  eventName: 'Product Purchased',
  properties: { value: 99.99 }
});
```

### Segmentation Engine
Create dynamic audience segments:

```typescript
import { SegmentationEngine } from './services/martech/SegmentationEngine';

const segmentation = SegmentationEngine.getInstance();

await segmentation.createAudience({
  name: 'High-Value Customers',
  userId: 'user_123',
  rules: {
    behavioral: {
      events: [{
        eventName: 'purchase',
        timeframe: { days: 30 },
        count: { operator: 'gte', value: 3 }
      }]
    }
  }
});
```

## Inventory Monetization

### Email Inventory
Monetize your email lists:

```typescript
await inventoryManager.createInventory({
  type: 'EMAIL',
  name: 'Tech Newsletter',
  publisherId: 'pub_123',
  totalSlots: 30, // 30 days
  emailListSize: 50000,
  emailSegments: ['tech', 'developers'],
  floorPrice: 5.0 // $5 CPM
});
```

### Movie/Video Inventory
Monetize video content:

```typescript
await inventoryManager.createInventory({
  type: 'MOVIE',
  name: 'Action Movies Pre-Roll',
  publisherId: 'pub_123',
  totalSlots: 1000,
  contentType: 'pre-roll',
  contentGenre: ['action', 'thriller'],
  floorPrice: 8.0 // $8 CPM
});
```

## Deployment

### Production Build

1. **Build frontend**
```bash
cd frontend
npm run build
```

2. **Build backend**
```bash
cd backend
npm run build
```

3. **Set production environment variables**
```bash
NODE_ENV=production
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
JWT_SECRET=<strong-secret>
```

4. **Run migrations**
```bash
cd backend
npm run prisma:migrate
```

5. **Start production server**
```bash
cd backend
npm start
```

## Performance

- **RTB Auctions:** < 100ms response time
- **Ad Serving:** < 50ms response time
- **API Endpoints:** < 200ms average
- **Real-time Updates:** WebSocket-based live updates
- **Scalability:** Horizontal scaling with Redis

## Security

- ✅ JWT-based authentication
- ✅ Password hashing with bcrypt
- ✅ CORS protection
- ✅ Helmet.js security headers
- ✅ Rate limiting
- ✅ SQL injection protection (Prisma)
- ✅ XSS protection
- ✅ GDPR compliance (data export/deletion)

## License

MIT License - see LICENSE file for details

## Acknowledgments

Inspired by industry leaders:
- [Clearcode](https://clearcode.cc) - AdTech development experts
- [Avenga](https://avenga.com) - Digital transformation
- [OpenX](https://openx.com) - SSP platform

## Sources

Research for this project was based on:
- [The AdTech Book by Clearcode](https://adtechbook.clearcode.cc/)
- [Clearcode AdTech Services](https://clearcode.cc/)
- [OpenX SSP Technology](https://www.openx.com/)
- [DSP vs SSP Guide](https://improvado.io/blog/dsp-vs-ssp-programmatic-guide)
- [Programmatic Advertising Platforms](https://www.unboundb2b.com/blog/7-types-of-programmatic-advertising-platforms/)
