# AdTech Platform - Documentation Index

Complete guide to all platform documentation, manuals, and resources.

## 📚 Table of Contents

- [User Manuals](#user-manuals)
- [Training Materials](#training-materials)
- [Technical Documentation](#technical-documentation)
- [API Documentation](#api-documentation)
- [Deployment Guides](#deployment-guides)
- [Quick References](#quick-references)

---

## 📖 User Manuals

### Complete User Guides

| Role | Manual | Description | Pages |
|------|--------|-------------|-------|
| **Advertiser** | [ADVERTISER_USER_MANUAL.md](./manuals/user/ADVERTISER_USER_MANUAL.md) | Complete guide for advertisers including campaign creation, targeting, creative management, budgeting, and analytics | 5000+ lines |
| **Publisher** | [PUBLISHER_USER_MANUAL.md](./manuals/user/PUBLISHER_USER_MANUAL.md) | Complete guide for publishers covering ad unit creation, inventory management, revenue optimization, and reporting | 4000+ lines |
| **Admin** | [ADMIN_QUICK_REFERENCE.md](./manuals/user/ADMIN_QUICK_REFERENCE.md) | Quick reference for platform administrators including system monitoring, user management, and emergency procedures | 500+ lines |

### User Categories Overview

- [USER_CATEGORIES.md](./USER_CATEGORIES.md) - Complete overview of all 7 user roles, permissions matrix, and access levels

**7 User Roles:**
1. **Admin** - Platform administration and oversight
2. **Advertiser** - Create and manage ad campaigns
3. **Publisher** - Monetize inventory and manage ad units
4. **Agency** - Manage multiple advertiser accounts
5. **Analyst** - Advanced analytics and reporting
6. **Finance Manager** - Financial oversight and billing
7. **Content Moderator** - Review and approve ad creatives

---

## 🎓 Training Materials

### Video Training Scripts

| Script | Duration | Target Audience | Topics Covered |
|--------|----------|-----------------|----------------|
| [ADVERTISER_TRAINING_SCRIPT.md](./manuals/video-scripts/ADVERTISER_TRAINING_SCRIPT.md) | 15 min | Advertisers | Platform intro, campaign setup, targeting, analytics, best practices |

**Training Script Structure:**
- Scene-by-scene breakdown
- Narrator scripts with timing
- Visual element descriptions
- On-screen text and graphics
- Interactive elements for HTML5 players

**Upcoming Training Scripts:**
- Publisher Training (20 minutes)
- Admin Training (15 minutes)
- Agency Training (18 minutes)
- Analyst Training (12 minutes)

---

## 🔧 Technical Documentation

### Architecture & Design

- [../ARCHITECTURE.md](../ARCHITECTURE.md) - System architecture and design patterns
- [../PLATFORM_ARCHITECTURE.md](../PLATFORM_ARCHITECTURE.md) - Detailed platform architecture
- [Turbospike Integration](../docs/TURBOSPIKE_INTEGRATION.md) - Ultra-low latency database integration

### Backend Documentation

**Location:** `backend/`

- [Backend README](../backend/README.md) - Backend setup and development guide
- Database schema (Prisma ORM)
- Service layer documentation
- AdTech components:
  - RTB Engine (`backend/src/services/adtech/rtb/`)
  - Ad Server (`backend/src/services/adtech/adserver/`)
  - Campaign Manager (`backend/src/services/adtech/campaigns/`)
- MarTech components:
  - CDP (`backend/src/services/martech/CDP.ts`)
  - Segmentation Engine (`backend/src/services/martech/SegmentationEngine.ts`)
- Turbospike Integration:
  - [Integration Guide](./turbospike/TURBOSPIKE_INTEGRATION.md) - Technical integration guide (573 lines)
  - [Setup Complete](./turbospike/TURBOSPIKE_SETUP_COMPLETE.md) - Setup completion summary (452 lines)

### Frontend Documentation

**Location:** `frontend-app/`

- [Frontend README](../frontend-app/README.md) - Complete frontend setup guide
- Component library
- State management with Zustand
- Routing and authentication
- Responsive design guidelines

### Mobile Documentation

**Location:** `mobile-app/`

- [BUILD_INSTRUCTIONS.md](../mobile-app/BUILD_INSTRUCTIONS.md) - Complete iOS/Android build guide (500+ lines)
- Flutter setup and configuration
- Product flavors (dev, staging, production)
- App signing and distribution
- CI/CD with GitHub Actions and Fastlane

---

## 🔌 API Documentation

### REST API Endpoints

**Base URL:** `https://api.adtech.com/api/v1`

#### Authentication
```
POST /auth/register        - Register new user
POST /auth/login          - User login
GET  /auth/me            - Get current user profile
POST /auth/refresh       - Refresh access token
```

#### AdTech - Campaigns
```
GET    /adtech/campaigns           - List all campaigns
POST   /adtech/campaigns           - Create new campaign
GET    /adtech/campaigns/:id       - Get campaign details
PUT    /adtech/campaigns/:id       - Update campaign
DELETE /adtech/campaigns/:id       - Delete campaign
PATCH  /adtech/campaigns/:id/status - Update campaign status
```

#### AdTech - Creatives
```
GET    /adtech/creatives           - List all creatives
POST   /adtech/creatives           - Upload new creative
GET    /adtech/creatives/:id       - Get creative details
DELETE /adtech/creatives/:id       - Delete creative
```

#### AdTech - Ad Serving
```
GET  /serve/ad                    - Serve an ad
GET  /track/impression/:requestId - Track impression
GET  /track/click/:requestId      - Track click
POST /track/conversion/:requestId - Track conversion
```

#### Inventory Management
```
GET  /inventory                   - List inventory
POST /inventory                   - Create inventory
GET  /inventory/:id               - Get inventory details
POST /inventory/reserve           - Reserve inventory slot
GET  /inventory/:id/forecast      - Get availability forecast
GET  /inventory/:id/analytics     - Get inventory analytics
```

#### Publishers
```
GET    /publishers                - List publishers
POST   /publishers                - Create publisher
GET    /publishers/:id            - Get publisher details
PUT    /publishers/:id            - Update publisher
DELETE /publishers/:id            - Delete publisher
```

#### Analytics
```
GET /analytics/overview                  - Platform overview
GET /analytics/campaigns/:id/performance - Campaign performance
GET /analytics/publishers/:id/revenue    - Publisher revenue
GET /analytics/reports                   - Generate reports
```

#### MarTech - Customer Data Platform
```
POST   /martech/identify           - Identify customer
POST   /martech/track              - Track event
GET    /martech/customers/:id      - Get customer profile
POST   /martech/customers/merge    - Merge customer profiles
GET    /martech/customers/:id/export - Export customer data (GDPR)
DELETE /martech/customers/:id      - Delete customer data (GDPR)
```

#### MarTech - Segmentation
```
POST /martech/audiences              - Create audience segment
POST /martech/audiences/:id/build    - Build segment
GET  /martech/audiences/:id/members  - Get audience members
GET  /martech/customers/:id/audiences - Get customer's audiences
```

**Full API Documentation:**
- Swagger UI: `http://localhost:3000/api/v1/docs`
- OpenAPI Spec: `backend/openapi.yaml`

---

## 🚢 Deployment Guides

### Production Deployment

- [../DEPLOYMENT.md](../DEPLOYMENT.md) - Complete production deployment guide

**Covers:**
- Environment setup
- Database configuration
- Redis setup
- Environment variables
- Docker deployment
- Kubernetes deployment
- Monitoring and logging

### Mobile App Deployment

- [../mobile-app/BUILD_INSTRUCTIONS.md](../mobile-app/BUILD_INSTRUCTIONS.md)

**Android Deployment:**
- APK generation
- App Bundle for Play Store
- Signing configuration
- Play Console upload

**iOS Deployment:**
- IPA generation
- Xcode archiving
- App Store Connect
- TestFlight distribution

### CI/CD

**GitHub Actions Workflows:**
- `.github/workflows/backend-ci.yml` - Backend testing and deployment
- `.github/workflows/frontend-ci.yml` - Frontend build and deploy
- `.github/workflows/mobile-build.yml` - Mobile app builds

**Fastlane:**
- Android: `mobile-app/android/fastlane/Fastfile`
- iOS: `mobile-app/ios/fastlane/Fastfile`

---

## ⚡ Quick References

### Cheat Sheets

#### For Advertisers
```
Campaign Creation: Dashboard → Campaigns → New Campaign
Target Audience: Campaign → Targeting → Demographics/Geography
Set Budget: Campaign → Budget → Daily/Total Budget
View Analytics: Dashboard → Analytics → Performance
```

#### For Publishers
```
Create Ad Unit: Dashboard → Ad Units → New Ad Unit
Get Ad Code: Ad Unit → Integration → Copy Code
View Revenue: Dashboard → Revenue → Earnings
Payment Settings: Settings → Payments → Payment Method
```

#### For Admins
```
Monitor System: Dashboard → System Health
User Management: Users → All Users → Actions
Platform Stats: Dashboard → Overview
Emergency Actions: System → Emergency Mode
```

### Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Search | `Ctrl/Cmd + K` |
| New Campaign | `Ctrl/Cmd + N` |
| View Analytics | `Ctrl/Cmd + A` |
| Navigate Dashboard | `Ctrl/Cmd + D` |
| Open Settings | `Ctrl/Cmd + ,` |

### Common Workflows

#### Create First Campaign (Advertiser)
1. Register account → Login
2. Dashboard → Campaigns → New Campaign
3. Set campaign name, objective, budget
4. Configure targeting (geography, demographics, interests)
5. Upload creatives (banners, videos)
6. Review and launch
7. Monitor performance in Analytics

#### Monetize Inventory (Publisher)
1. Register as publisher → Complete profile
2. Dashboard → Ad Units → New Ad Unit
3. Select ad format (display, video, native)
4. Configure size and placement
5. Copy ad code
6. Implement on website/app
7. Monitor revenue in Dashboard

---

## 🎯 Interactive Demos

### Platform Demo
- [../PLATFORM_DEMO.html](../PLATFORM_DEMO.html) - Full interactive platform demo

**Demo Features:**
- Live platform preview
- Interactive dashboards for all roles
- Mobile app preview
- Charts and analytics
- Clickable navigation
- Feature demonstrations

**How to Use:**
1. Open `PLATFORM_DEMO.html` in any modern browser
2. Click tabs to explore different user roles
3. Interact with demo dashboards
4. View mobile app preview in phone frame
5. Explore all platform features

---

## 📱 Mobile App Resources

### Getting Started
1. Install Flutter SDK (3.16+)
2. Clone repository
3. Run `flutter pub get`
4. Configure Firebase (optional)
5. Run `flutter run`

### Build Commands

**Development:**
```bash
flutter run --flavor development
```

**Production:**
```bash
# Android APK
flutter build apk --release --flavor production

# Android AAB (Play Store)
flutter build appbundle --release --flavor production

# iOS IPA
flutter build ipa --release --flavor production
```

### Mobile Features
- ✅ Biometric authentication
- ✅ Push notifications
- ✅ Offline mode
- ✅ Real-time updates
- ✅ Multi-role support
- ✅ Dark mode

---

## 🔍 Search & Navigation

### Finding Documentation

**By Role:**
- Advertiser: Start with [ADVERTISER_USER_MANUAL.md](./manuals/user/ADVERTISER_USER_MANUAL.md)
- Publisher: Start with [PUBLISHER_USER_MANUAL.md](./manuals/user/PUBLISHER_USER_MANUAL.md)
- Admin: Start with [ADMIN_QUICK_REFERENCE.md](./manuals/user/ADMIN_QUICK_REFERENCE.md)
- Developer: Start with [../ARCHITECTURE.md](../ARCHITECTURE.md)

**By Topic:**
- Campaign Management → ADVERTISER_USER_MANUAL.md § 3
- Revenue Optimization → PUBLISHER_USER_MANUAL.md § 5
- API Integration → API Documentation section above
- Mobile Development → [BUILD_INSTRUCTIONS.md](../mobile-app/BUILD_INSTRUCTIONS.md)

**By Task:**
- "How do I create a campaign?" → ADVERTISER_USER_MANUAL.md
- "How do I monetize my website?" → PUBLISHER_USER_MANUAL.md
- "How do I build the mobile app?" → BUILD_INSTRUCTIONS.md
- "How do I deploy to production?" → DEPLOYMENT.md

---

## 💡 Tips & Best Practices

### Documentation Best Practices
1. Always check the latest version in the repo
2. Use the search function (Ctrl/Cmd + F) within documents
3. Follow links to related documentation
4. Check the changelog for updates
5. Refer to code examples in user manuals

### Getting Help
- **Documentation Issues**: Create issue in GitHub repo
- **Technical Support**: support@adtech.com
- **Training Questions**: training@adtech.com
- **API Support**: developers@adtech.com

---

## 📊 Documentation Statistics

| Type | Count | Total Lines |
|------|-------|-------------|
| User Manuals | 3 | 9,500+ |
| Training Scripts | 1 | 500+ |
| Technical Docs | 8 | 3,000+ |
| Build Guides | 1 | 500+ |
| README Files | 4 | 2,000+ |
| **Total** | **17** | **15,500+** |

---

## 🔄 Last Updated

**Date:** November 2025
**Version:** 1.0.0
**Contributors:** AdTech Platform Team

---

## 📝 Contributing to Documentation

Want to improve the documentation?

1. Fork the repository
2. Make your changes
3. Test all links and examples
4. Submit a pull request
5. Tag with `documentation` label

**Documentation Standards:**
- Use clear, concise language
- Include code examples
- Add screenshots where helpful
- Keep formatting consistent
- Test all commands and links
- Update this index when adding new docs

---

**Need help finding something?** Use the GitHub repository search or contact support@adtech.com
