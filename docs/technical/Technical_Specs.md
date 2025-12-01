# AdTech Platform Technical Specifications

## 1. System Architecture

### High-Level Overview
The platform is built on a microservices-oriented architecture using Node.js/TypeScript for the backend and React for the frontend.

```mermaid
graph TD
    Client[Client (Web/Mobile)] --> LB[Load Balancer / Nginx]
    LB --> API[API Gateway / Backend]
    
    subgraph Services
        API --> Auth[Auth Service]
        API --> RTB[RTB Engine]
        API --> Camp[Campaign Service]
        API --> Fraud[Fraud Detection Engine]
    end
    
    subgraph Data Layer
        RTB --> Redis[(Redis Cache)]
        RTB --> Turbospike[(Turbospike / Redis Mock)]
        Camp --> Postgres[(PostgreSQL)]
        Fraud --> Kdb[(kdb+ / Mock)]
    end
    
    subgraph External
        RTB --> DSP[External DSPs]
        Client --> SSP[External SSPs]
    end
```

### Key Components
- **RTB Engine**: Handles bid requests, auctions, and DSP communication. Optimized for <100ms latency.
- **Fraud Detection**: Analyzes traffic patterns in real-time using kdb+ (simulated) and Redis to block bot traffic.
- **Turbospike Service**: High-speed key-value store for user profiles (simulated via Redis).

---

## 2. API Documentation (Summary)

### Authentication
- `POST /api/auth/register`: Register new user.
- `POST /api/auth/login`: Login and receive JWT.

### Campaigns (Advertiser)
- `GET /api/adtech/campaigns`: List campaigns.
- `POST /api/adtech/campaigns`: Create new campaign.
- `PUT /api/adtech/campaigns/:id`: Update campaign.

### RTB (Programmatic)
- `POST /api/adtech/bid`: Endpoint for SSPs to send bid requests.
  - **Body**: `BidRequest` object (device, user, geo, etc.).
  - **Response**: `BidResponse` (winning bid, creative, price).

### Analytics
- `GET /api/adtech/analytics`: Retrieve performance metrics.
  - **Query Params**: `startDate`, `endDate`, `dimension` (campaign, creative).

---

## 3. Database Schema

### PostgreSQL (Prisma Models)
- **User**: `id`, `email`, `password`, `role` (ADVERTISER, PUBLISHER, ADMIN).
- **Campaign**: `id`, `advertiserId`, `budget`, `status`, `targeting` (JSON).
- **Creative**: `id`, `campaignId`, `type`, `url`.
- **Partner**: `id`, `name`, `type` (DSP/SSP), `endpoint`.

### Redis (Cache & Hot Data)
- **Session**: User sessions.
- **Budgets**: Real-time campaign budget tracking (`campaign:{id}:spent`).
- **Frequency Capping**: User ad exposure counts.

### Turbospike (User Profiles)
- **Namespace**: `users`
- **Key**: `userId`
- **Value**: `{ segments: ['auto', 'finance'], demographics: {...} }`

---

## 4. Deployment

### Docker
- **Backend**: `Dockerfile` (Node.js 20, Multi-stage).
- **Frontend**: `frontend/Dockerfile` (Nginx serving React build).
- **Orchestration**: `docker-compose.yml` manages Backend, Frontend, Postgres, and Redis.

### CI/CD
- **GitHub Actions**: Automated testing, linting, and Docker build on push to `main`.
- **Environment Variables**: Managed via `.env` (local) and GitHub Secrets (production).
