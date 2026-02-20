# Database Schema — Adtech Platform
> Version: 1.0 | Last Updated: 2026-02-18 | Status: Draft
> Classification: Internal | Author: AIDD System

---

## 1. Overview

The Adtech Platform uses PostgreSQL 14+ as its primary relational database, accessed through Prisma ORM. The schema supports multi-tenant advertising operations including user management, campaign lifecycle, inventory monetization, customer data platform, and impression analytics.

---

## 2. Entity-Relationship Diagram

```
+----------------+     +------------------+     +----------------+
| Organization   |1---*| User             |1---*| ApiKey         |
| - id (PK)      |     | - id (PK)        |     | - id (PK)      |
| - name         |     | - email (UQ)     |     | - key (UQ)     |
| - domain (UQ)  |     | - passwordHash   |     | - name         |
| - type (enum)  |     | - name           |     | - userId (FK)  |
+-------+--------+     | - role (enum)    |     | - active       |
        |               | - organizationId |     | - expiresAt    |
        |               +--------+---------+     +----------------+
        |                        |
        |1                       |1
        |                        |
+-------v--------+     +--------v---------+
| Publisher       |     | Campaign         |1---*+-----------+
| - id (PK)       |     | - id (PK)        |     | LineItem  |
| - name          |     | - userId (FK)    |     | - id (PK) |
| - organizationId|     | - advertiserId   |     | - campaignId|
| - revenueShare  |     | - name           |     | - name    |
+-------+---------+     | - objective      |     | - budget  |
        |               | - totalBudget    |     | - spent   |
        |1              | - dailyBudget    |     | - cpm     |
        |               | - spent          |     +-----+-----+
+-------v--------+     | - startDate      |           |
| Site            |     | - endDate        |           |*
| - id (PK)       |     | - status (enum)  |     +-----v-----------+
| - publisherId   |     +------------------+     | CreativeLineItem|
| - domain (UQ)   |                              | - id (PK)       |
| - name          |     +------------------+     | - creativeId    |
+-------+---------+     | Advertiser       |     | - lineItemId    |
        |               | - id (PK)        |     +---------+-------+
        |1              | - name           |               |
        |               | - organizationId |               |*
+-------v--------+     +--------+---------+     +---------v-------+
| AdUnit          |              |1              | Creative         |
| - id (PK)       |              |               | - id (PK)        |
| - siteId (FK)   |     +-------v--------+      | - advertiserId   |
| - name          |     | Campaign (link) |      | - name           |
| - sizes[]       |     +----------------+      | - format         |
| - floorPrice    |                              | - content        |
+-----------------+                              | - clickUrl       |
                                                 +------------------+

+------------------+     +------------------+
| Audience         |     | ImpressionLog    |
| - id (PK)        |     | - id (PK)        |
| - userId (FK)    |     | - requestId (UQ) |
| - name           |     | - campaignId     |
| - description    |     | - publisherId    |
| - rules (JSON)   |     | - price          |
| - userCount      |     | - timestamp      |
+------------------+     | - country        |
                         | - deviceType     |
+------------------+     | - viewable       |
| Report           |     | - clicked        |
| - id (PK)        |     +------------------+
| - userId (FK)    |
| - name           |
| - config (JSON)  |
+------------------+
```

---

## 3. Table Definitions

### 3.1 User

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, auto-generated | Unique user identifier |
| email | VARCHAR | UNIQUE, NOT NULL, indexed | Login email address |
| passwordHash | VARCHAR | NOT NULL | bcrypt hashed password (12 rounds) |
| name | VARCHAR | NOT NULL | Display name |
| role | ENUM(UserRole) | NOT NULL, default USER | Access level |
| organizationId | UUID | FK -> Organization.id, nullable | Parent organization |
| createdAt | TIMESTAMP | NOT NULL, default NOW() | Record creation time |
| updatedAt | TIMESTAMP | NOT NULL, auto-updated | Last modification time |

**Indexes:** email, organizationId

**UserRole Enum Values:** SUPER_ADMIN, ADMIN, ACCOUNT_MANAGER, TRAFFICKER, ANALYST, USER

### 3.2 Organization

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Unique org identifier |
| name | VARCHAR | NOT NULL | Organization name |
| domain | VARCHAR | UNIQUE | Organization domain |
| type | ENUM(OrgType) | NOT NULL | Organization category |
| createdAt | TIMESTAMP | NOT NULL | Record creation |
| updatedAt | TIMESTAMP | NOT NULL | Last modification |

**OrgType Enum Values:** ADVERTISER, PUBLISHER, AGENCY, NETWORK

### 3.3 Campaign

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Campaign identifier |
| userId | UUID | FK -> User.id, indexed | Campaign owner |
| advertiserId | UUID | FK -> Advertiser.id, nullable, indexed | Associated advertiser |
| name | VARCHAR | NOT NULL | Campaign name |
| objective | VARCHAR | NOT NULL | Campaign goal (awareness, conversions, traffic) |
| totalBudget | FLOAT | NOT NULL | Lifetime budget cap |
| dailyBudget | FLOAT | Nullable | Daily spend limit |
| spent | FLOAT | NOT NULL, default 0 | Cumulative spend |
| startDate | TIMESTAMP | NOT NULL | Campaign start |
| endDate | TIMESTAMP | Nullable | Campaign end |
| status | ENUM(CampaignStatus) | NOT NULL, default DRAFT | Lifecycle state |
| createdAt | TIMESTAMP | NOT NULL | Record creation |
| updatedAt | TIMESTAMP | NOT NULL | Last modification |

**Indexes:** userId, advertiserId, status

**CampaignStatus Enum Values:** DRAFT, ACTIVE, PAUSED, COMPLETED

### 3.4 LineItem

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Line item identifier |
| campaignId | UUID | FK -> Campaign.id, indexed | Parent campaign |
| name | VARCHAR | NOT NULL | Line item name |
| budget | FLOAT | NOT NULL | Line item budget |
| spent | FLOAT | NOT NULL, default 0 | Cumulative spend |
| cpm | FLOAT | NOT NULL | Cost per mille (bid price) |
| createdAt | TIMESTAMP | NOT NULL | Record creation |
| updatedAt | TIMESTAMP | NOT NULL | Last modification |

### 3.5 Creative

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Creative identifier |
| advertiserId | UUID | FK -> Advertiser.id, indexed | Owner advertiser |
| name | VARCHAR | NOT NULL | Creative name |
| format | VARCHAR | NOT NULL | Ad format (display, video, native, email) |
| content | TEXT | NOT NULL | Creative markup (HTML, VAST XML, JSON) |
| clickUrl | VARCHAR | NOT NULL | Destination URL on click |
| createdAt | TIMESTAMP | NOT NULL | Record creation |
| updatedAt | TIMESTAMP | NOT NULL | Last modification |

### 3.6 CreativeLineItem (Junction Table)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Record identifier |
| creativeId | UUID | FK -> Creative.id | Creative reference |
| lineItemId | UUID | FK -> LineItem.id | Line item reference |
| createdAt | TIMESTAMP | NOT NULL | Association creation |

**Unique constraint:** (creativeId, lineItemId)

### 3.7 Publisher

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Publisher identifier |
| name | VARCHAR | NOT NULL | Publisher name |
| organizationId | UUID | FK -> Organization.id, indexed | Parent organization |
| revenueShare | FLOAT | NOT NULL, default 70 | Publisher revenue percentage |
| createdAt | TIMESTAMP | NOT NULL | Record creation |
| updatedAt | TIMESTAMP | NOT NULL | Last modification |

### 3.8 Site

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Site identifier |
| publisherId | UUID | FK -> Publisher.id, indexed | Owner publisher |
| domain | VARCHAR | UNIQUE | Site domain |
| name | VARCHAR | NOT NULL | Site name |
| createdAt | TIMESTAMP | NOT NULL | Record creation |
| updatedAt | TIMESTAMP | NOT NULL | Last modification |

### 3.9 AdUnit

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Ad unit identifier |
| siteId | UUID | FK -> Site.id, indexed | Parent site |
| name | VARCHAR | NOT NULL | Ad unit name |
| sizes | VARCHAR[] | NOT NULL | Accepted ad dimensions (e.g., "300x250") |
| floorPrice | FLOAT | NOT NULL, default 0 | Minimum bid price (CPM) |
| createdAt | TIMESTAMP | NOT NULL | Record creation |
| updatedAt | TIMESTAMP | NOT NULL | Last modification |

### 3.10 Audience

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Audience identifier |
| userId | UUID | FK -> User.id, indexed | Creator user |
| name | VARCHAR | NOT NULL | Audience name |
| description | TEXT | Nullable | Audience description |
| rules | JSONB | NOT NULL | Segmentation rules definition |
| userCount | INTEGER | NOT NULL, default 0 | Cached member count |
| createdAt | TIMESTAMP | NOT NULL | Record creation |
| updatedAt | TIMESTAMP | NOT NULL | Last modification |

### 3.11 ImpressionLog

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Log entry identifier |
| requestId | VARCHAR | UNIQUE | Ad request correlation ID |
| campaignId | VARCHAR | Nullable | Winning campaign |
| publisherId | VARCHAR | Nullable | Serving publisher |
| price | FLOAT | NOT NULL | Clearing price (CPM) |
| timestamp | TIMESTAMP | NOT NULL, default NOW(), indexed | Event time |
| country | VARCHAR | NOT NULL | User country code |
| deviceType | VARCHAR | NOT NULL | Device category (desktop, mobile, tablet) |
| viewable | BOOLEAN | NOT NULL, default false | MRC viewability flag |
| clicked | BOOLEAN | NOT NULL, default false | Click event recorded |

**Indexes:** timestamp, campaignId, publisherId

### 3.12 Report

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Report identifier |
| userId | UUID | FK -> User.id, indexed | Report owner |
| name | VARCHAR | NOT NULL | Report name |
| config | JSONB | NOT NULL | Report configuration (date range, dimensions, metrics) |
| createdAt | TIMESTAMP | NOT NULL | Record creation |
| updatedAt | TIMESTAMP | NOT NULL | Last modification |

### 3.13 ApiKey

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Key identifier |
| key | VARCHAR | UNIQUE | API key value |
| name | VARCHAR | NOT NULL | Key description |
| userId | UUID | FK -> User.id | Key owner |
| active | BOOLEAN | NOT NULL, default true | Active/revoked status |
| createdAt | TIMESTAMP | NOT NULL | Creation time |
| expiresAt | TIMESTAMP | Nullable | Expiration time |

---

## 4. JSONB Schema Details

### 4.1 Audience Rules Schema
```json
{
  "behavioral": {
    "events": [
      {
        "eventName": "purchase",
        "timeframe": { "days": 30 },
        "count": { "operator": "gte", "value": 3 }
      }
    ]
  },
  "demographic": {
    "age": { "min": 25, "max": 45 },
    "country": ["US", "CA", "GB"]
  },
  "custom": {
    "properties": {
      "accountType": { "operator": "eq", "value": "premium" }
    }
  }
}
```

### 4.2 Report Config Schema
```json
{
  "dateRange": { "start": "2026-01-01", "end": "2026-01-31" },
  "dimensions": ["campaign", "country", "deviceType"],
  "metrics": ["impressions", "clicks", "ctr", "spend", "conversions"],
  "filters": {
    "campaignId": ["uuid-1", "uuid-2"],
    "status": "ACTIVE"
  },
  "groupBy": "day"
}
```

---

## 5. Index Strategy

| Table | Index | Type | Purpose |
|-------|-------|------|---------|
| User | email | B-tree UNIQUE | Login lookup |
| User | organizationId | B-tree | Org member listing |
| Campaign | userId | B-tree | User campaign listing |
| Campaign | advertiserId | B-tree | Advertiser campaign listing |
| Campaign | status | B-tree | Status filtering |
| ImpressionLog | timestamp | B-tree | Time-range queries |
| ImpressionLog | campaignId | B-tree | Campaign reporting |
| ImpressionLog | publisherId | B-tree | Publisher reporting |
| Site | publisherId | B-tree | Publisher site listing |
| AdUnit | siteId | B-tree | Site ad unit listing |
| Audience | userId | B-tree | User audience listing |

---

## 6. Migration Strategy

Migrations are managed by Prisma Migrate:

```bash
# Generate migration from schema changes
npx prisma migrate dev --name <migration-name>

# Apply migrations to production
npx prisma migrate deploy

# Reset database (development only)
npx prisma migrate reset

# Open Prisma Studio for visual data exploration
npx prisma studio
```

---

## 7. Performance Considerations

- **Connection Pooling**: Prisma manages a connection pool of up to 100 connections
- **Batch Operations**: Impression logs are batch-inserted every 5 seconds from the stream aggregator
- **JSONB Indexing**: GIN indexes on Audience.rules and Report.config for JSONB query acceleration (planned)
- **Partitioning**: ImpressionLog table partitioned by month for query performance (planned)
- **Read Replicas**: Analytics queries routed to read replicas to reduce primary load (planned)

---

## 8. Data Integrity

- All foreign keys use UUID references with CASCADE or RESTRICT delete behavior
- Prisma ORM enforces type safety at the application layer
- Database-level constraints prevent invalid enum values
- Unique constraints on email, domain, requestId, and API key values
- Timestamps are auto-managed by Prisma (createdAt/updatedAt)

---

## 9. Related Documents
- [Architecture](architecture.md)
- [Software Architecture](software-architecture.md)
- [Technical Specifications](technical-specifications.md)
