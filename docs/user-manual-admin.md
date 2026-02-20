# User Manual: Platform Administrator — Adtech Platform
> Version: 1.0 | Last Updated: 2026-02-18 | Status: Draft
> Classification: Internal | Author: AIDD System

---

## 1. Introduction

This manual provides comprehensive instructions for platform administrators responsible for operating, configuring, and maintaining the Adtech Platform. Administrators have elevated access to manage users, organizations, system settings, fraud alerts, and platform-wide analytics.

---

## 2. Getting Started

### 2.1 Accessing the Admin Dashboard
1. Open your browser and navigate to the platform URL (e.g., `https://admin.adtech.com`).
2. Enter your admin email and password on the login page.
3. Click "Sign In."
4. You will be redirected to the Admin Dashboard.

### 2.2 Admin Roles
| Role | Capabilities |
|------|-------------|
| SUPER_ADMIN | Full platform access, user management, system configuration |
| ADMIN | Organization-scoped administration, user management |
| ACCOUNT_MANAGER | Campaign approval, advertiser/publisher support |

### 2.3 Dashboard Overview
The admin dashboard displays:
- **Total Impressions**: Lifetime and current-month impression count
- **Total Revenue**: Platform revenue (marketplace fees)
- **Active Campaigns**: Number of currently running campaigns
- **Fill Rate**: Percentage of ad requests that returned an ad
- **System Health**: Error rate, latency p99, active pods

---

## 3. User Management

### 3.1 Viewing Users
1. Navigate to **Settings > Users**.
2. View the user list with columns: Name, Email, Role, Organization, Status, Created Date.
3. Use the search bar to find specific users by name or email.
4. Filter by role or organization.

### 3.2 Creating a User
1. Click **"Add User"** button.
2. Fill in the required fields:
   - **Email**: Must be unique across the platform.
   - **Name**: Display name.
   - **Password**: Minimum 8 characters.
   - **Role**: Select from SUPER_ADMIN, ADMIN, ACCOUNT_MANAGER, TRAFFICKER, ANALYST, USER.
   - **Organization**: Assign to an existing organization or create new.
3. Click **"Create User."**

### 3.3 Editing a User
1. Click on a user row in the user list.
2. Modify fields as needed (name, role, organization).
3. Click **"Save Changes."**

### 3.4 Deactivating a User
1. Click on the user to open their profile.
2. Click **"Deactivate Account."**
3. Confirm the action.
4. The user will no longer be able to log in.

---

## 4. Organization Management

### 4.1 Creating an Organization
1. Navigate to **Settings > Organizations**.
2. Click **"Add Organization."**
3. Enter:
   - **Name**: Organization name.
   - **Domain**: Organization domain (unique).
   - **Type**: ADVERTISER, PUBLISHER, AGENCY, or NETWORK.
4. Click **"Create."**

### 4.2 Managing Organization Settings
1. Click on an organization to open its detail page.
2. Configure:
   - **Revenue Share**: Publisher revenue percentage (default 70%).
   - **Rate Limits**: Custom rate limits for this organization.
   - **Data Retention**: Override default retention policies.
3. Click **"Save."**

---

## 5. Campaign Oversight

### 5.1 Reviewing Campaigns
1. Navigate to **Campaigns** in the main menu.
2. View all campaigns across the platform.
3. Filter by status (DRAFT, ACTIVE, PAUSED, COMPLETED), organization, or date range.

### 5.2 Approving a Campaign
1. Find campaigns in DRAFT status awaiting approval.
2. Click on the campaign to review details.
3. Verify budget, targeting, and creatives.
4. Click **"Approve"** to change status to ACTIVE, or **"Reject"** with a reason.

### 5.3 Pausing a Campaign
1. Select an ACTIVE campaign.
2. Click **"Pause Campaign."**
3. Confirm the action.
4. The campaign will stop participating in auctions immediately.

---

## 6. Fraud Management

### 6.1 Reviewing Fraud Alerts
1. Navigate to **Security > Fraud Alerts**.
2. View flagged ad requests with fraud scores.
3. Each alert shows: timestamp, IP address, user agent, fraud score, triggered layers, reason.

### 6.2 Blocking an IP Address
1. In the Fraud Alerts view, click on a flagged entry.
2. Review the 7-layer fraud analysis breakdown.
3. Click **"Block IP"** to add the IP to the blocklist.
4. Future requests from this IP will be rejected at Layer 1.

### 6.3 Adjusting Fraud Thresholds
1. Navigate to **Settings > Fraud Detection**.
2. Adjust the global fraud score threshold (default: 0.7).
3. Adjust individual layer weights if needed.
4. Click **"Save."**
5. Changes take effect on the next ad request.

---

## 7. System Configuration

### 7.1 Platform Settings
Navigate to **Settings > Platform** to configure:

| Setting | Description | Default |
|---------|-------------|---------|
| Rate Limit (global) | Max requests per 15-min window per IP | 100 |
| Rate Limit (auth) | Max auth attempts per 15-min window | 10 |
| Default Revenue Share | Publisher percentage of clearing price | 70% |
| RTB Timeout | Maximum auction execution time | 100ms |
| Max Bid Requests | Maximum concurrent bid requests | 1000 |
| Cache TTL (campaigns) | Active campaign cache duration | 300s |
| Analytics Batch Size | Events per batch write | 100 |
| Analytics Flush Interval | Batch write frequency | 5000ms |

### 7.2 Data Retention Settings
| Data Type | Default Retention | Configurable |
|-----------|------------------|-------------|
| Impression logs | 90 days (hot) | Yes |
| Customer profiles | Until deletion | No (GDPR) |
| Campaign data | 3 years | Yes |
| Audit logs | 5 years | Yes |
| Session data | 24 hours | Yes |

---

## 8. Monitoring

### 8.1 Platform Health Dashboard
The health dashboard (available at **Dashboard > System Health**) shows:
- **Request Rate**: Requests per second across all endpoints
- **Error Rate**: Percentage of 4xx and 5xx responses
- **Latency**: p50, p95, p99 response times
- **Cache Hit Rate**: L1 and L2 cache effectiveness
- **Pod Count**: Current active backend pods
- **Database Connections**: Active vs. pool limit

### 8.2 Alerting
Configure alerts in **Settings > Alerts**:
- Error rate exceeds 1%
- Latency p99 exceeds 500ms
- Fill rate drops below 95%
- Database connections exceed 80% of pool
- Memory usage exceeds 80%
- Pod restarts detected

---

## 9. Backup and Recovery

### 9.1 Database Backups
- Automated daily backups are configured in the deployment.
- Backup retention: 30 days.
- To trigger a manual backup, contact the DevOps team.

### 9.2 Recovery Procedure
1. Identify the backup point (date/time).
2. Contact DevOps to initiate recovery.
3. Expected recovery time: 1-2 hours.
4. Verify data integrity after recovery.

---

## 10. Audit Logs

### 10.1 Viewing Audit Logs
1. Navigate to **Settings > Audit Logs**.
2. Each entry includes: timestamp, user, action, resource, details, IP address.
3. Filter by user, action type, or date range.
4. Export logs as CSV for compliance review.

### 10.2 Audited Actions
- User creation, modification, and deactivation
- Campaign approval and rejection
- Platform setting changes
- Fraud alert actions (block/unblock)
- Data export and deletion requests

---

## 11. Troubleshooting

| Issue | Resolution |
|-------|-----------|
| User cannot log in | Check if account is active; reset password if needed |
| High latency | Check System Health dashboard; verify database and Redis connectivity |
| Low fill rate | Review active campaign count and budgets; check inventory availability |
| Fraud alerts spike | Review recent traffic patterns; consider adjusting thresholds temporarily |
| Pod restart loops | Check pod logs via kubectl; verify environment variables and database connectivity |

---

## 12. Related Documents
- [Training Manual - Admin](training-manual-admin.md)
- [User Manual - Developer](user-manual-developer.md)
- [Deployment](deployment.md)
