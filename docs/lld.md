# Low-Level Design — Adtech Platform
> Version: 1.0 | Last Updated: 2026-02-18 | Status: Draft
> Classification: Internal | Author: AIDD System

---

## 1. Introduction

This Low-Level Design (LLD) document provides detailed component-level specifications for the Adtech Platform, including class diagrams, method signatures, algorithm descriptions, data structure definitions, and sequence diagrams for critical operations.

---

## 2. RTBEngine Component

### 2.1 Class Design

```typescript
class RTBEngine {
  private static instance: RTBEngine;
  private bidOptimizer: BidOptimizer;
  private budgetPacer: BudgetPacer;
  private fraudDetection: FraudDetection;
  private cache: MultiLayerCache;

  private constructor() { ... }

  static getInstance(): RTBEngine;

  async runAuction(request: AuctionRequest): Promise<AuctionResult>;
  private async loadEligibleCampaigns(request: AuctionRequest): Promise<Campaign[]>;
  private executeSecondPriceAuction(bids: Bid[], floorPrice: number): AuctionResult;
  private filterByCaps(campaigns: Campaign[]): Campaign[];
}
```

### 2.2 AuctionRequest Interface

```typescript
interface AuctionRequest {
  requestId: string;
  placementId: string;
  publisherId?: string;
  deviceType: 'desktop' | 'mobile' | 'tablet';
  country: string;
  floorPrice: number;
  userAgent?: string;
  ipAddress?: string;
  timestamp: Date;
}
```

### 2.3 AuctionResult Interface

```typescript
interface AuctionResult {
  requestId: string;
  won: boolean;
  winnerId?: string;        // campaignId
  winningBid?: number;      // highest bid
  clearingPrice?: number;   // second price + $0.01
  creative?: CreativeMarkup;
  trackingUrls: {
    impression: string;
    click: string;
    conversion: string;
  };
  latencyMs: number;
}
```

### 2.4 Second-Price Auction Algorithm

```
Input: bids[] sorted descending by price, floorPrice
Output: AuctionResult

1. Filter bids where bid.price >= floorPrice
2. If no valid bids, return { won: false }
3. winner = bids[0]                          // highest bidder wins
4. If bids.length == 1:
     clearingPrice = floorPrice + 0.01
   Else:
     clearingPrice = bids[1].price + 0.01    // second price + increment
5. If clearingPrice > winner.price:
     clearingPrice = winner.price
6. Return { won: true, winnerId: winner.campaignId, clearingPrice }
```

---

## 3. BidOptimizer Component

### 3.1 Class Design

```typescript
class BidOptimizer {
  private model: tf.LayersModel;
  private featureScaler: StandardScaler;

  async loadModel(): Promise<void>;
  async predictBids(campaigns: Campaign[], request: AuctionRequest): Promise<Bid[]>;
  private extractFeatures(campaign: Campaign, request: AuctionRequest): number[];
  async updateModel(trainingData: TrainingExample[]): Promise<void>;
}
```

### 3.2 Feature Vector

```
Feature Index | Feature Name      | Type    | Range
0             | deviceType        | one-hot | [0,1] (desktop=0, mobile=1, tablet=2)
1             | hourOfDay         | numeric | [0, 23]
2             | dayOfWeek         | numeric | [0, 6]
3             | country           | encoded | [0, N] (label encoded)
4             | floorPrice        | numeric | [0, 100]
5             | campaignBudgetPct | numeric | [0, 1] (spent / totalBudget)
6             | campaignAge       | numeric | [0, 365] (days since start)
7             | historicalCTR     | numeric | [0, 1]
8             | historicalCVR     | numeric | [0, 1]
9             | impressionCount   | numeric | [0, INF] (log-scaled)
10            | clickCount        | numeric | [0, INF] (log-scaled)
11            | lineCPM           | numeric | [0, 100]
12            | timeToEnd         | numeric | [0, 365] (days remaining)
13            | competitorCount   | numeric | [0, 100]
14            | placementQuality  | numeric | [0, 1]
```

### 3.3 Neural Network Architecture

```
Input Layer:  15 features
Hidden Layer 1: 64 neurons, ReLU activation
Hidden Layer 2: 32 neurons, ReLU activation
Hidden Layer 3: 16 neurons, ReLU activation
Hidden Layer 4: 8 neurons, ReLU activation
Output Layer: 1 neuron, Linear activation (predicted optimal bid)

Loss: Mean Squared Error
Optimizer: Adam (lr=0.001)
```

---

## 4. FraudDetection Component

### 4.1 Class Design

```typescript
class FraudDetection {
  private ipReputation: IPReputationService;
  private botDetector: BotDetector;

  async checkAdRequest(request: FraudCheckRequest): Promise<FraudCheckResult>;
  private checkIPReputation(ip: string): Promise<FraudSignal>;
  private checkClickVelocity(sessionId: string): Promise<FraudSignal>;
  private checkDeviceFingerprint(fingerprint: DeviceFingerprint): Promise<FraudSignal>;
  private checkBotSignature(userAgent: string): Promise<FraudSignal>;
  private checkGeolocation(ip: string, declaredCountry: string): Promise<FraudSignal>;
  private checkSessionPattern(sessionId: string): Promise<FraudSignal>;
  private checkReferrer(referrer: string, publisherDomain: string): Promise<FraudSignal>;
  private computeFraudScore(signals: FraudSignal[]): number;
}
```

### 4.2 FraudCheckResult Interface

```typescript
interface FraudCheckResult {
  allowed: boolean;
  fraudScore: number;      // 0.0 (clean) to 1.0 (fraud)
  reasons: string[];       // human-readable failure reasons
  signals: FraudSignal[];
  latencyMs: number;
}

interface FraudSignal {
  layer: string;
  score: number;       // 0.0 to 1.0
  confidence: number;  // 0.0 to 1.0
  reason?: string;
}
```

### 4.3 Scoring Algorithm

```
Input: 7 fraud signals (one per layer)
Output: composite fraudScore

1. weights = [0.20, 0.15, 0.15, 0.20, 0.10, 0.10, 0.10]
   // IP, velocity, fingerprint, bot, geo, session, referrer
2. weightedSum = SUM(signal[i].score * signal[i].confidence * weights[i])
3. fraudScore = CLAMP(weightedSum, 0.0, 1.0)
4. allowed = fraudScore < THRESHOLD (default 0.7)
```

---

## 5. MultiLayerCache Component

### 5.1 Class Design

```typescript
class MultiLayerCache {
  private l1: LRUCache<string, any>;    // in-memory, max 10,000 entries
  private l2: Redis;                     // distributed
  private l3: PrismaClient;             // database

  async get<T>(key: string, options: CacheOptions): Promise<T>;
  async set(key: string, value: any, ttl: number): Promise<void>;
  async invalidate(pattern: string): Promise<void>;
  async warmup(keys: string[]): Promise<void>;

  private async getFromL1(key: string): Promise<any | null>;
  private async getFromL2(key: string): Promise<any | null>;
  private async getFromL3(key: string, fetcher: () => Promise<any>): Promise<any>;
  private promoteToL1(key: string, value: any, ttl: number): void;
  private async promoteToL2(key: string, value: any, ttl: number): Promise<void>;
}

interface CacheOptions {
  ttl: number;            // seconds
  source?: () => Promise<any>;  // L3 fetcher function
  prefetch?: boolean;     // prefetch related keys
}
```

### 5.2 Cache Lookup Sequence

```
get(key):
  1. Check L1 (LRU in-memory)
     -> Hit: return value, latency ~100us
  2. Check L2 (Redis)
     -> Hit: promote to L1, return value, latency ~1ms
  3. Check L3 (Database via fetcher function)
     -> Hit: promote to L2 and L1, return value, latency ~10ms
  4. Miss: return null
```

---

## 6. StreamProcessor Component

### 6.1 Class Design

```typescript
class StreamProcessor {
  private redis: Redis;
  private aggregator: Aggregator;
  private consumerGroup: string;
  private consumerId: string;

  async publish(stream: string, event: StreamEvent): Promise<string>;
  async startConsumer(): Promise<void>;
  private async processEvents(events: StreamEvent[]): Promise<void>;
  async shutdown(): Promise<void>;
}

class Aggregator {
  private buckets: Map<string, AggregationBucket>;
  private flushInterval: number;  // 5000ms

  addEvent(event: StreamEvent): void;
  private createBucketKey(event: StreamEvent): string;
  async flush(): Promise<void>;
}

interface AggregationBucket {
  campaignId: string;
  publisherId: string;
  minute: string;         // ISO timestamp truncated to minute
  impressions: number;
  clicks: number;
  conversions: number;
  revenue: number;
}
```

### 6.2 Stream Names

| Stream | Events | Consumer Group |
|--------|--------|---------------|
| `adtech:impressions` | Impression events | `impression-processors` |
| `adtech:clicks` | Click events | `click-processors` |
| `adtech:conversions` | Conversion events | `conversion-processors` |
| `martech:events` | CDP custom events | `cdp-processors` |

---

## 7. AdServer Component

### 7.1 Class Design

```typescript
class AdServer {
  private static instance: AdServer;
  private rtbEngine: RTBEngine;
  private creativeSelector: CreativeSelector;

  static getInstance(): AdServer;

  async serveAd(request: AdRequest): Promise<AdResponse>;
  private renderCreative(creative: Creative, trackingUrls: TrackingUrls): string;
  private buildTrackingUrls(requestId: string): TrackingUrls;
}

interface AdRequest {
  placementId: string;
  publisherId: string;
  deviceType: string;
  country: string;
  userAgent: string;
  ipAddress: string;
  referrer: string;
}

interface AdResponse {
  requestId: string;
  markup: string;         // HTML/VAST/JSON ad markup
  format: string;         // display | video | native
  width: number;
  height: number;
  trackingPixel: string;  // 1x1 impression pixel URL
}
```

---

## 8. CDP Component

### 8.1 Class Design

```typescript
class CDP {
  private static instance: CDP;
  private prisma: PrismaClient;
  private streamProcessor: StreamProcessor;

  static getInstance(): CDP;

  async identify(data: IdentifyRequest): Promise<CustomerProfile>;
  async track(data: TrackRequest): Promise<void>;
  async getProfile(customerId: string): Promise<CustomerProfile>;
  async mergeProfiles(sourceId: string, targetId: string): Promise<CustomerProfile>;
  async exportData(customerId: string): Promise<CustomerExport>;
  async deleteData(customerId: string): Promise<void>;
}

interface IdentifyRequest {
  email: string;
  firstName?: string;
  lastName?: string;
  properties?: Record<string, any>;
}

interface TrackRequest {
  email: string;
  eventType: string;
  eventName: string;
  properties?: Record<string, any>;
  timestamp?: Date;
}
```

---

## 9. SegmentationEngine Component

### 9.1 Class Design

```typescript
class SegmentationEngine {
  private static instance: SegmentationEngine;
  private prisma: PrismaClient;

  static getInstance(): SegmentationEngine;

  async createAudience(data: CreateAudienceRequest): Promise<Audience>;
  async buildSegment(audienceId: string): Promise<SegmentResult>;
  async getMembers(audienceId: string, page: number, limit: number): Promise<Customer[]>;
  async evaluateRules(rules: AudienceRules, customerId: string): Promise<boolean>;
}

interface AudienceRules {
  behavioral?: {
    events: EventRule[];
  };
  demographic?: {
    age?: { min: number; max: number };
    country?: string[];
    gender?: string;
  };
  custom?: {
    properties: Record<string, RuleCondition>;
  };
}

interface RuleCondition {
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'in';
  value: any;
}
```

---

## 10. BudgetPacer Component

### 10.1 Class Design

```typescript
class BudgetPacer {
  private cache: MultiLayerCache;

  async deductSpend(campaignId: string, amount: number): Promise<PaceResult>;
  async checkBudget(campaignId: string): Promise<BudgetStatus>;
  private calculateDailyPace(campaign: Campaign): number;
  private shouldThrottle(campaign: Campaign, currentSpend: number): boolean;
}

interface PaceResult {
  allowed: boolean;
  remainingBudget: number;
  dailyRemaining: number;
  pacePercentage: number;   // 0-100, how fast budget is being consumed
  throttle: boolean;        // true if spending too fast
}
```

### 10.2 Pacing Algorithm

```
Input: campaign (totalBudget, dailyBudget, spent, startDate, endDate)
Output: PaceResult

1. totalRemaining = totalBudget - spent
2. If totalRemaining <= 0: return { allowed: false }
3. If dailyBudget set:
     a. todaySpend = sum of today's impressions for campaign (from Redis counter)
     b. dailyRemaining = dailyBudget - todaySpend
     c. If dailyRemaining <= 0: return { allowed: false, throttle: true }
4. daysRemaining = (endDate - now) in days
5. idealDailySpend = totalRemaining / daysRemaining
6. pacePercentage = (todaySpend / idealDailySpend) * 100
7. throttle = pacePercentage > 120  // spending 20% faster than ideal
8. Return { allowed: true, remainingBudget, dailyRemaining, pacePercentage, throttle }
```

---

## 11. Error Handling Design

### 11.1 Error Class Hierarchy

```typescript
class AppError extends Error {
  statusCode: number;
  code: string;
  isOperational: boolean;
}

class ValidationError extends AppError {
  statusCode = 400;
  code = 'VALIDATION_ERROR';
}

class AuthenticationError extends AppError {
  statusCode = 401;
  code = 'AUTHENTICATION_ERROR';
}

class AuthorizationError extends AppError {
  statusCode = 403;
  code = 'AUTHORIZATION_ERROR';
}

class NotFoundError extends AppError {
  statusCode = 404;
  code = 'NOT_FOUND';
}

class RateLimitError extends AppError {
  statusCode = 429;
  code = 'RATE_LIMIT_EXCEEDED';
}
```

### 11.2 Error Response Format

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid campaign budget",
    "details": [
      { "field": "totalBudget", "message": "must be a positive number" }
    ]
  }
}
```

---

## 12. Database Access Patterns

### 12.1 Campaign Queries
| Operation | Query Pattern | Expected Latency |
|-----------|--------------|-----------------|
| List by user | `WHERE userId = ? AND status IN (?)` | <5ms |
| Get by ID | `WHERE id = ?` | <2ms |
| Active campaigns for auction | `WHERE status = 'ACTIVE' AND spent < totalBudget` | <5ms (cached) |
| Update spend | `UPDATE SET spent = spent + ? WHERE id = ?` | <3ms |

### 12.2 Impression Queries
| Operation | Query Pattern | Expected Latency |
|-----------|--------------|-----------------|
| Batch insert | `INSERT INTO ImpressionLog VALUES (...)` (100-row batch) | <10ms |
| Campaign stats | `GROUP BY date_trunc('day', timestamp) WHERE campaignId = ?` | <50ms |
| Publisher revenue | `SUM(price) WHERE publisherId = ? AND timestamp BETWEEN ? AND ?` | <50ms |

---

## 13. Related Documents
- [High-Level Design](hld.md)
- [Software Architecture](software-architecture.md)
- [Database Schema](database-schema.md)
- [Technical Specifications](technical-specifications.md)
