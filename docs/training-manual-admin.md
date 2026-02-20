# Training Manual: Platform Administrator — Adtech Platform
> Version: 1.0 | Last Updated: 2026-02-18 | Status: Draft
> Classification: Internal | Author: AIDD System

---

## 1. Training Overview

### 1.1 Objective
Equip platform administrators with the knowledge and skills to operate, configure, monitor, and troubleshoot the Adtech Platform effectively.

### 1.2 Target Audience
- New platform administrators
- System operators transitioning to the Adtech Platform
- DevOps engineers supporting the platform

### 1.3 Prerequisites
- Basic understanding of web application concepts
- Familiarity with advertising terminology (CPM, impressions, campaigns)
- Access to an admin account on the training environment

### 1.4 Duration
Estimated total training time: 8 hours (2 days, 4 hours/day)

---

## 2. Training Curriculum

### Module 1: Platform Fundamentals (1 hour)

**Learning Objectives:**
- Understand the Adtech Platform architecture at a high level
- Identify the main subsystems (AdTech, MarTech, Inventory, Analytics)
- Recognize the roles of different user types

**Topics:**
1. Platform overview and value proposition
2. Architecture walkthrough (frontend, backend, database, cache)
3. User roles: SUPER_ADMIN, ADMIN, ACCOUNT_MANAGER, TRAFFICKER, ANALYST, USER
4. Navigation tour of the admin dashboard

**Hands-on Exercise:**
- Log in to the training environment
- Navigate through all dashboard sections
- Identify key metrics on the overview dashboard

---

### Module 2: User and Organization Management (1 hour)

**Learning Objectives:**
- Create and manage user accounts
- Set up organizations with appropriate types
- Configure role-based access

**Topics:**
1. User lifecycle (creation, role assignment, deactivation)
2. Organization types (ADVERTISER, PUBLISHER, AGENCY, NETWORK)
3. Revenue share configuration per organization
4. API key management

**Hands-on Exercise:**
- Create a test advertiser organization
- Add a user with ACCOUNT_MANAGER role
- Generate an API key for the user
- Verify access restrictions by role

---

### Module 3: Campaign Oversight (1 hour)

**Learning Objectives:**
- Review and approve campaigns submitted by advertisers
- Understand campaign status lifecycle
- Monitor campaign delivery and budget pacing

**Topics:**
1. Campaign review workflow (DRAFT -> ACTIVE)
2. Line item and creative verification
3. Budget and schedule validation
4. Pausing and resuming campaigns
5. Identifying underperforming campaigns

**Hands-on Exercise:**
- Review a sample DRAFT campaign
- Approve the campaign
- Monitor it for 15 minutes and observe impression delivery
- Pause the campaign and verify it stops serving

---

### Module 4: Fraud Detection and Security (1 hour)

**Learning Objectives:**
- Interpret fraud detection alerts
- Configure fraud detection thresholds
- Block and unblock IP addresses

**Topics:**
1. Overview of the 7-layer fraud detection pipeline
2. Reading fraud scores and signal breakdowns
3. IP reputation management
4. Adjusting detection thresholds
5. Investigating false positives

**Hands-on Exercise:**
- Review 5 sample fraud alerts
- Classify each as true positive or false positive
- Block a suspicious IP address
- Adjust the fraud threshold and observe the effect

---

### Module 5: Platform Configuration (1 hour)

**Learning Objectives:**
- Configure global platform settings
- Manage data retention policies
- Set up alerting rules

**Topics:**
1. Rate limiting configuration
2. Default revenue share settings
3. RTB engine parameters (timeout, max bid requests)
4. Cache TTL configuration
5. Data retention periods
6. Alert threshold configuration

**Hands-on Exercise:**
- Modify the rate limit for the training environment
- Change the default revenue share to 75/25
- Configure an alert for error rate >2%

---

### Module 6: Monitoring and Observability (1 hour)

**Learning Objectives:**
- Interpret system health dashboards
- Identify performance bottlenecks
- Respond to alerts

**Topics:**
1. Dashboard walkthrough (request rate, error rate, latency, cache hit rate)
2. Understanding p50/p95/p99 latency percentiles
3. Database connection pool monitoring
4. Pod scaling and health checks
5. Log analysis basics

**Hands-on Exercise:**
- Navigate to the System Health dashboard
- Identify a simulated latency spike
- Trace the cause to a specific component
- Document the incident resolution steps

---

### Module 7: Backup and Recovery (1 hour)

**Learning Objectives:**
- Understand backup procedures
- Execute a recovery scenario
- Verify data integrity after recovery

**Topics:**
1. Automated daily backup schedule
2. Manual backup triggers
3. Recovery procedure walkthrough
4. Recovery time and point objectives (RTO/RPO)
5. Post-recovery verification checklist

**Hands-on Exercise:**
- Verify the latest backup exists
- Simulate a database recovery from backup in the training environment
- Verify campaign and user data integrity after recovery

---

### Module 8: Compliance and Audit (1 hour)

**Learning Objectives:**
- Review and export audit logs
- Process GDPR data requests
- Understand SOC 2 control requirements

**Topics:**
1. Audit log structure (who, what, when, where)
2. Exporting audit logs for compliance review
3. Processing data export requests (GDPR Art. 15)
4. Processing data deletion requests (GDPR Art. 17)
5. SOC 2 control mapping to platform features

**Hands-on Exercise:**
- Export audit logs for the last 7 days
- Process a simulated GDPR data export request
- Process a simulated GDPR data deletion request
- Verify the data was completely removed

---

## 3. Assessment

### 3.1 Knowledge Check (15 questions)
1. What are the six user roles in the platform?
2. What is the default revenue share for publishers?
3. How many layers does the fraud detection engine have?
4. What is the target RTO for disaster recovery?
5. Where do you configure rate limits?
6. What status must a campaign be in before it can serve ads?
7. How often are automated database backups taken?
8. What is the default fraud score threshold?
9. Name three metrics shown on the System Health dashboard.
10. What GDPR articles require data export and deletion capabilities?
11. What happens when a user account is deactivated?
12. How do you generate an API key for a user?
13. What is the cache TTL for active campaigns?
14. Where do you review audit logs?
15. What is the maximum number of backend pod replicas?

### 3.2 Practical Assessment
- Complete a full admin workflow: create organization, add user, approve campaign, review fraud alerts, export audit logs

---

## 4. Additional Resources

| Resource | Location |
|----------|----------|
| User Manual - Admin | [user-manual-admin.md](user-manual-admin.md) |
| Architecture Documentation | [architecture.md](architecture.md) |
| Deployment Guide | [deployment.md](deployment.md) |
| Troubleshooting Guide | [user-manual-admin.md](user-manual-admin.md) Section 11 |

---

## 5. Training Completion

Upon successful completion of all modules and assessments:
- Administrator is certified to operate the platform independently
- Access is granted to production environment with admin privileges
- Administrator is added to the on-call rotation (if applicable)
