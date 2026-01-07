# Security Configuration Guide

This document outlines the security features implemented in the Adtech platform and configuration requirements for production deployment.

## Authentication & Authorization

### JWT Configuration

The platform uses JWT (JSON Web Tokens) for authentication. **Critical security requirements:**

1. **Generate a Strong Secret**:
   ```bash
   # Generate a cryptographically secure 64-byte secret
   openssl rand -base64 64
   ```

2. **Set Environment Variables**:
   ```bash
   # Required for production
   JWT_SECRET=<your-64-byte-secret-here>
   JWT_EXPIRES_IN=7d  # Or shorter for more security (e.g., 1d, 4h)
   ```

3. **Never Use Default Secrets**: The application will log warnings in development if using insecure secrets, and will refuse to start in production with default values.

### Role-Based Access Control (RBAC)

The platform implements four user roles:

| Role | Description | Permissions |
|------|-------------|-------------|
| `ADMIN` | Platform administrator | Full access to all resources |
| `USER` | Standard user | Access to own campaigns, audiences |
| `PUBLISHER` | Content publisher | Access to inventory, placements, analytics |
| `ADVERTISER` | Advertiser | Access to campaigns, creatives |

### Middleware Stack

All authenticated routes use the following middleware chain:

1. **`authenticate`** - Validates JWT token and attaches user to request
2. **`authorize(roles...)`** - Validates user role against allowed roles
3. **`validate(schema)`** - Validates request body/params/query with Zod

Example:
```typescript
router.post(
  '/campaigns',
  authenticate,
  authorize('ADMIN', 'ADVERTISER'),
  validate(createCampaignSchema),
  async (req, res, next) => { ... }
);
```

## Rate Limiting

The platform implements rate limiting to prevent abuse:

| Limiter | Window | Max Requests | Use Case |
|---------|--------|--------------|----------|
| `authRateLimiter` | 15 min | 10 | Login, registration |
| `apiRateLimiter` | 1 min | 100 | General API endpoints |
| `adServingRateLimiter` | 1 min | 1000 | Ad serving, tracking |
| `exportRateLimiter` | 1 hour | 5 | GDPR data exports |
| `deleteRateLimiter` | 15 min | 20 | Deletion operations |

## Input Validation

All API endpoints use Zod schemas for input validation:

- **Registration**: Email format, password strength (8+ chars, uppercase, lowercase, number)
- **Campaign creation**: UUID validation, enum validation, positive numbers
- **Inventory**: Type validation, price validation
- **MarTech**: Customer identifier requirements, event schema validation

## Request Tracking

Every request is assigned a unique `X-Request-Id` header for distributed tracing:

- Incoming requests can provide their own `X-Request-Id`
- If not provided, a UUID v4 is generated
- All logs include the request ID for correlation
- Error responses include the request ID

## Error Handling

The error handler implements:

1. **Error codes** for programmatic handling
2. **Request ID** for support/debugging
3. **Stack traces** only in development
4. **Sanitized messages** in production

## CORS Configuration

Configure CORS for your production domain:

```bash
CORS_ORIGIN=https://your-production-domain.com
```

For multiple origins, modify the CORS configuration in `src/index.ts`.

## Health Checks

The platform exposes health check endpoints:

| Endpoint | Purpose |
|----------|---------|
| `/health` | Full health check with DB and Redis status |
| `/ready` | Kubernetes readiness probe |
| `/live` | Kubernetes liveness probe |

## Database Security

### Indexes Added

Performance indexes have been added to prevent slow queries:

- User lookups by organization, role
- Campaign queries by status, dates, advertiser
- Inventory by publisher, type, status
- Bid tracking by campaign, placement, timestamp
- Customer events by type and timestamp

### Connection Security

Ensure your `DATABASE_URL` uses SSL in production:

```bash
DATABASE_URL=postgresql://user:password@host:5432/db?sslmode=require
```

## Production Checklist

Before deploying to production:

- [ ] Generate and set strong `JWT_SECRET`
- [ ] Set `NODE_ENV=production`
- [ ] Configure `CORS_ORIGIN` for your domain
- [ ] Enable SSL/TLS for database connections
- [ ] Configure Redis password if using external Redis
- [ ] Review rate limit settings for your traffic
- [ ] Set up monitoring and alerting
- [ ] Enable log aggregation
- [ ] Configure backup strategies

## Incident Response

If you suspect a security breach:

1. Rotate `JWT_SECRET` immediately (this invalidates all tokens)
2. Review audit logs for suspicious activity
3. Check rate limit violations
4. Review failed authentication attempts

## Reporting Security Issues

If you discover a security vulnerability, please report it responsibly by contacting the security team.
