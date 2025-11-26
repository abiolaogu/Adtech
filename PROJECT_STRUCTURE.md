# AdTech Platform - Project Structure

Complete directory structure and organization guide for the AdTech/MarTech Platform repository.

## 📁 Repository Overview

```
Adtech/
├── backend/              # Node.js/Express backend API
├── frontend/             # Legacy React frontend (original)
├── frontend-app/         # NEW: Complete React frontend with all dashboards ⭐
├── mobile-app/           # NEW: Flutter mobile app (iOS/Android) ⭐
├── docs/                 # Complete documentation
├── config/               # Configuration files
├── k8s/                  # Kubernetes manifests
├── tekton/               # Tekton CI/CD pipelines
├── .github/              # GitHub Actions workflows
└── [Root Documentation]  # Core project docs
```

## 🎯 Key Directories

### Backend (`backend/`)

**Purpose:** Node.js/TypeScript backend API server

**Key Components:**
- `src/services/adtech/` - AdTech services (RTB, Ad Server, Campaigns)
- `src/services/martech/` - MarTech services (CDP, Segmentation)
- `src/repositories/` - Data access layer (PostgreSQL, Turbospike)
- `src/config/` - Configuration management
- `src/routes/` - API route definitions
- `prisma/` - Database schema and migrations

**Tech Stack:**
- Node.js + TypeScript
- Express.js
- Prisma ORM
- PostgreSQL + Turbospike (Aerospike fork)
- Redis

**Documentation:**
- [Backend README](./backend/README.md)

---

### Frontend App (`frontend-app/`) ⭐ **CURRENT**

**Purpose:** Complete React-based web application with multi-role support

**Status:** ✅ Active - Complete implementation with documentation

**Key Features:**
- Multi-role dashboards (Advertiser, Publisher, Admin)
- Campaign creation and management
- Real-time analytics with charts
- Responsive design (mobile, tablet, desktop)
- Protected routes with authentication

**Structure:**
```
frontend-app/
├── src/
│   ├── components/      # Reusable UI components
│   ├── pages/           # Page components by role
│   │   ├── advertiser/  # Advertiser dashboard & pages
│   │   ├── publisher/   # Publisher dashboard & pages
│   │   └── admin/       # Admin dashboard & pages
│   ├── services/        # API integration
│   ├── stores/          # Zustand state management
│   └── App.tsx          # Main app with routing
├── package.json
└── README.md            # Complete setup guide
```

**Tech Stack:**
- React 18 + TypeScript
- Vite (build tool)
- Tailwind CSS
- React Router v6
- Zustand (state management)
- Recharts (charts)

**Documentation:**
- [Frontend App README](./frontend-app/README.md)

**Getting Started:**
```bash
cd frontend-app
npm install
npm run dev
# Access at http://localhost:5173
```

---

### Legacy Frontend (`frontend/`)

**Purpose:** Original React frontend

**Status:** ⚠️ Legacy - Superseded by `frontend-app/`

**Note:** This is the original frontend implementation. For new development, use `frontend-app/` which has the complete implementation with all user roles and documentation.

---

### Mobile App (`mobile-app/`) ⭐ **CURRENT**

**Purpose:** Flutter-based native iOS and Android mobile application

**Status:** ✅ Active - Complete implementation with build instructions

**Key Features:**
- Native iOS and Android support
- Multi-role UI (Advertiser, Publisher, Admin)
- Biometric authentication
- Push notifications (Firebase)
- Offline data caching
- Multi-environment support (dev, staging, production)

**Structure:**
```
mobile-app/
├── lib/
│   ├── main.dart           # App entry point
│   ├── screens/            # UI screens by role
│   │   ├── advertiser/
│   │   ├── publisher/
│   │   └── admin/
│   ├── services/           # API & business logic
│   ├── widgets/            # Reusable widgets
│   └── models/             # Data models
├── android/                # Android-specific code
├── ios/                    # iOS-specific code
├── pubspec.yaml            # Flutter dependencies
└── BUILD_INSTRUCTIONS.md   # Complete build guide
```

**Tech Stack:**
- Flutter 3.16+
- Dart
- Provider + Riverpod (state)
- Firebase (notifications, analytics)
- Hive (local storage)

**Documentation:**
- [Build Instructions](./mobile-app/BUILD_INSTRUCTIONS.md) - Complete iOS/Android build guide

**Getting Started:**
```bash
cd mobile-app
flutter pub get
flutter run

# Build for production
flutter build apk --release --flavor production      # Android APK
flutter build appbundle --release --flavor production # Android AAB (Play Store)
flutter build ipa --release --flavor production       # iOS IPA
```

**Build Outputs:**
- Android APK: `build/app/outputs/flutter-apk/app-production-release.apk`
- Android AAB: `build/app/outputs/bundle/productionRelease/app-production-release.aab`
- iOS IPA: `build/ios/ipa/adtech_platform.ipa`

---

### Documentation (`docs/`)

**Purpose:** Complete platform documentation

**Structure:**
```
docs/
├── DOCUMENTATION_INDEX.md    # Master documentation index
├── USER_CATEGORIES.md        # User roles and permissions
├── manuals/
│   ├── user/                 # User manuals
│   │   ├── ADVERTISER_USER_MANUAL.md      # 5000+ lines
│   │   ├── PUBLISHER_USER_MANUAL.md       # 4000+ lines
│   │   └── ADMIN_QUICK_REFERENCE.md       # 500+ lines
│   └── video-scripts/        # Training video scripts
│       └── ADVERTISER_TRAINING_SCRIPT.md
└── turbospike/               # Turbospike integration docs
    ├── TURBOSPIKE_INTEGRATION.md
    └── TURBOSPIKE_SETUP_COMPLETE.md
```

**Key Documents:**

| Document | Purpose | Lines |
|----------|---------|-------|
| [DOCUMENTATION_INDEX.md](./docs/DOCUMENTATION_INDEX.md) | Master index to all documentation | 600+ |
| [USER_CATEGORIES.md](./docs/USER_CATEGORIES.md) | User roles, permissions, access levels | 250+ |
| [ADVERTISER_USER_MANUAL.md](./docs/manuals/user/ADVERTISER_USER_MANUAL.md) | Complete advertiser guide | 5000+ |
| [PUBLISHER_USER_MANUAL.md](./docs/manuals/user/PUBLISHER_USER_MANUAL.md) | Complete publisher guide | 4000+ |

---

### Configuration (`config/`)

**Purpose:** Environment and deployment configurations

**Contents:**
- Environment-specific configs
- Service configurations
- Deployment settings

---

### Kubernetes (`k8s/`)

**Purpose:** Kubernetes deployment manifests

**Contents:**
- Deployment configurations
- Service definitions
- Ingress rules
- ConfigMaps and Secrets

---

### CI/CD

**GitHub Actions (`.github/workflows/`):**
- `backend-ci.yml` - Backend testing and deployment
- `frontend-ci.yml` - Frontend build and deploy
- `mobile-build.yml` - Mobile app builds

**Tekton (`tekton/`):**
- Alternative CI/CD pipeline definitions

---

## 📄 Root Documentation Files

### Core Documentation

| File | Purpose |
|------|---------|
| [README.md](./README.md) | Main project README with quick start |
| [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md) | This file - project organization guide |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | System architecture and design |
| [PLATFORM_ARCHITECTURE.md](./PLATFORM_ARCHITECTURE.md) | Detailed platform architecture |
| [DEPLOYMENT.md](./DEPLOYMENT.md) | Production deployment guide |
| [SETUP.md](./SETUP.md) | Initial setup instructions |
| [SUPERIORITY.md](./SUPERIORITY.md) | Platform competitive advantages |
| [TEST_REPORT.md](./TEST_REPORT.md) | Testing results and coverage |

### Special Files

| File | Purpose |
|------|---------|
| [PLATFORM_DEMO.html](./PLATFORM_DEMO.html) | Interactive platform demo |
| [docker-compose.turbospike.yml](./docker-compose.turbospike.yml) | Turbospike cluster setup |
| [Dockerfile](./Dockerfile) | Docker container definition |
| [Jenkinsfile](./Jenkinsfile) | Jenkins pipeline configuration |

---

## 🎯 Interactive Demo

**File:** `PLATFORM_DEMO.html`

**Purpose:** Comprehensive interactive HTML demo showcasing all platform features

**Features:**
- Live platform preview
- Interactive dashboards for all user roles
- Mobile app preview in phone frame
- Charts and analytics visualization
- Complete feature demonstrations
- Clickable navigation

**Usage:**
Open `PLATFORM_DEMO.html` in any modern web browser to explore the platform.

---

## 🏗️ Development Workflow

### Backend Development

```bash
cd backend
npm install
npm run dev
# API available at http://localhost:3000
```

### Frontend Development

```bash
cd frontend-app
npm install
npm run dev
# Web app available at http://localhost:5173
```

### Mobile Development

```bash
cd mobile-app
flutter pub get
flutter run
# Choose device (iOS/Android/Web)
```

### Full Stack Development

Run all services concurrently:

```bash
# Terminal 1: Backend
cd backend && npm run dev

# Terminal 2: Frontend
cd frontend-app && npm run dev

# Terminal 3: Mobile (optional)
cd mobile-app && flutter run
```

---

## 📦 Dependencies

### Root Level

- **package.json** - Root workspace configuration
- **package-lock.json** - Dependency lock file

### Backend Dependencies

See `backend/package.json`

Key dependencies:
- Express.js
- Prisma
- TypeScript
- PostgreSQL drivers
- Redis clients

### Frontend Dependencies

See `frontend-app/package.json`

Key dependencies:
- React 18
- TypeScript
- Vite
- Tailwind CSS
- React Router
- Zustand

### Mobile Dependencies

See `mobile-app/pubspec.yaml`

Key dependencies:
- Flutter SDK 3.16+
- Provider
- Riverpod
- Dio
- Firebase

---

## 🔐 Configuration Files

### Environment Variables

**Backend:** `backend/.env`
```
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
JWT_SECRET=...
PORT=3000
```

**Frontend:** `frontend-app/.env`
```
VITE_API_BASE_URL=http://localhost:3000
VITE_WS_URL=ws://localhost:3000
```

**Mobile:** `mobile-app/.env` (or build-time config)
- Development: Dev API URLs
- Staging: Staging API URLs
- Production: Production API URLs

### TypeScript Configs

- `backend/tsconfig.json` - Backend TypeScript config
- `frontend-app/tsconfig.json` - Frontend TypeScript config

### Build Configs

- `frontend-app/vite.config.ts` - Vite build configuration
- `mobile-app/android/app/build.gradle` - Android build config
- `mobile-app/ios/Runner.xcodeproj` - iOS build config

---

## 🚀 Deployment Structure

### Docker Deployment

```bash
# Build containers
docker build -t adtech-backend -f Dockerfile .
docker-compose up -d

# With Turbospike
docker-compose -f docker-compose.turbospike.yml up -d
```

### Kubernetes Deployment

```bash
# Apply manifests
kubectl apply -f k8s/

# Check deployment
kubectl get pods -n adtech
```

---

## 📊 Directory Sizes

Approximate sizes (excluding node_modules):

```
backend/         ~5MB   (TypeScript source, Prisma schema)
frontend-app/    ~100KB (React components, pages)
mobile-app/      ~200KB (Flutter/Dart source)
docs/            ~500KB (Documentation, manuals)
```

---

## 🔍 Finding Files

### By Component

**AdTech RTB Engine:**
```
backend/src/services/adtech/rtb/RTBEngine.ts
```

**Ad Server:**
```
backend/src/services/adtech/adserver/AdServer.ts
```

**Turbospike Integration:**
```
backend/src/config/turbospike.ts
backend/src/repositories/TurbospikeRepository.ts
docs/turbospike/TURBOSPIKE_INTEGRATION.md
```

**Campaign Management:**
```
backend/src/services/adtech/campaigns/
frontend-app/src/pages/advertiser/
mobile-app/lib/screens/advertiser/
```

**CDP (Customer Data Platform):**
```
backend/src/services/martech/CDP.ts
```

**Segmentation Engine:**
```
backend/src/services/martech/SegmentationEngine.ts
```

### By User Role

**Advertiser:**
- Frontend: `frontend-app/src/pages/advertiser/`
- Mobile: `mobile-app/lib/screens/advertiser/`
- Manual: `docs/manuals/user/ADVERTISER_USER_MANUAL.md`

**Publisher:**
- Frontend: `frontend-app/src/pages/publisher/`
- Mobile: `mobile-app/lib/screens/publisher/`
- Manual: `docs/manuals/user/PUBLISHER_USER_MANUAL.md`

**Admin:**
- Frontend: `frontend-app/src/pages/admin/`
- Mobile: `mobile-app/lib/screens/admin/`
- Manual: `docs/manuals/user/ADMIN_QUICK_REFERENCE.md`

---

## 🧹 Clean Architecture

The project follows clean architecture principles:

```
┌────────────────────────────────────────────────┐
│              Presentation Layer                 │
│  (Frontend/Mobile - React/Flutter)              │
└────────────┬───────────────────────────────────┘
             │
┌────────────▼───────────────────────────────────┐
│              Application Layer                  │
│  (API Routes, Controllers)                      │
└────────────┬───────────────────────────────────┘
             │
┌────────────▼───────────────────────────────────┐
│              Business Logic Layer               │
│  (Services - RTB, AdServer, CDP, etc.)          │
└────────────┬───────────────────────────────────┘
             │
┌────────────▼───────────────────────────────────┐
│              Data Access Layer                  │
│  (Repositories - PostgreSQL, Turbospike)        │
└────────────┬───────────────────────────────────┘
             │
┌────────────▼───────────────────────────────────┐
│              Data Layer                         │
│  (PostgreSQL, Turbospike, Redis)                │
└────────────────────────────────────────────────┘
```

---

## 📚 Additional Resources

### Documentation
- [Documentation Index](./docs/DOCUMENTATION_INDEX.md) - Master guide to all docs
- [User Categories](./docs/USER_CATEGORIES.md) - User roles and permissions

### Development
- [Architecture Guide](./ARCHITECTURE.md)
- [Setup Instructions](./SETUP.md)
- [Deployment Guide](./DEPLOYMENT.md)

### Testing
- [Test Report](./TEST_REPORT.md)

---

## 🤝 Contributing

When contributing to the project:

1. **Backend changes:** Work in `backend/`
2. **Frontend changes:** Work in `frontend-app/` (not `frontend/`)
3. **Mobile changes:** Work in `mobile-app/` (not `mobile-apps/`)
4. **Documentation:** Update relevant files in `docs/`
5. **Tests:** Add tests alongside your changes

---

## 📝 Version History

**Current Structure:** v2.0
- ✅ Complete frontend-app with all dashboards
- ✅ Complete mobile-app with build instructions
- ✅ Comprehensive documentation
- ✅ Turbospike integration
- ✅ Multi-role support

**Previous Structure:** v1.0
- Initial backend implementation
- Basic frontend
- Limited documentation

---

## ⚠️ Important Notes

1. **Use `frontend-app/` not `frontend/`** for web development
2. **Use `mobile-app/` not `mobile-apps/`** for mobile development
3. All documentation is indexed in `docs/DOCUMENTATION_INDEX.md`
4. Interactive demo is available at `PLATFORM_DEMO.html`
5. Build instructions for mobile are in `mobile-app/BUILD_INSTRUCTIONS.md`

---

**Last Updated:** November 2025
**Maintainer:** AdTech Platform Team
