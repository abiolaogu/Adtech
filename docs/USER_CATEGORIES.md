# AdTech Platform - User Categories & Roles

## User Categories

### 1. Platform Administrator
**Role**: System management and oversight
**Permissions**: Full platform access
**Key Functions**:
- User management (create, edit, delete users)
- Organization management
- Platform configuration
- System monitoring and health
- Financial oversight and billing
- Security and compliance management
- Support ticket management

### 2. Advertiser
**Role**: Create and manage advertising campaigns
**Permissions**: Campaign creation, creative management, reporting
**Key Functions**:
- Campaign creation and management
- Creative upload and approval
- Budget management
- Targeting configuration
- Performance analytics
- Invoice and payment management
- Audience segmentation

### 3. Publisher
**Role**: Monetize website/app inventory
**Permissions**: Ad placement management, revenue reporting
**Key Functions**:
- Site/app registration
- Ad unit creation and management
- Ad placement configuration
- Revenue reporting
- Payment tracking
- Inventory management
- Block list management

### 4. Agency
**Role**: Manage campaigns for multiple advertisers
**Permissions**: Multi-account management
**Key Functions**:
- Multi-advertiser account management
- Campaign management across accounts
- Consolidated reporting
- Client billing and invoicing
- Team member management
- White-label reporting

### 5. Data Analyst
**Role**: Platform analytics and insights
**Permissions**: Read-only access to analytics
**Key Functions**:
- Advanced analytics and reporting
- Custom report generation
- Data export capabilities
- Dashboard creation
- Trend analysis
- Performance insights

### 6. Finance Manager
**Role**: Financial operations and billing
**Permissions**: Financial data access
**Key Functions**:
- Invoice generation
- Payment processing
- Revenue reconciliation
- Financial reporting
- Budget oversight
- Payment disputes

### 7. Content Moderator
**Role**: Review and approve creatives
**Permissions**: Creative approval/rejection
**Key Functions**:
- Creative review and approval
- Content policy enforcement
- Inappropriate content flagging
- Advertiser communication
- Compliance verification

## Permission Matrix

| Function | Admin | Advertiser | Publisher | Agency | Analyst | Finance | Moderator |
|----------|-------|------------|-----------|--------|---------|---------|-----------|
| User Management | ✅ | ❌ | ❌ | ✅ (Team) | ❌ | ❌ | ❌ |
| Campaign Creation | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| Creative Upload | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| Creative Approval | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Ad Unit Creation | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Analytics View | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Financial Reports | ✅ | ✅ (Own) | ✅ (Own) | ✅ | ❌ | ✅ | ❌ |
| Billing Management | ✅ | ✅ (Own) | ✅ (Own) | ✅ | ❌ | ✅ | ❌ |
| System Config | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Support Tickets | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

## User Journey Maps

### Advertiser Journey
1. **Registration** → Create account → Email verification
2. **Onboarding** → Company details → Payment method
3. **Campaign Setup** → Create campaign → Set budget → Define targeting
4. **Creative Upload** → Upload ads → Submit for approval
5. **Launch** → Activate campaign → Monitor performance
6. **Optimization** → Analyze metrics → Adjust targeting/budget
7. **Reporting** → View reports → Export data → Invoice review

### Publisher Journey
1. **Registration** → Create account → Email verification
2. **Onboarding** → Site/app registration → Ad placement details
3. **Integration** → Get ad tags → Implement on site
4. **Verification** → Test ad serving → Traffic validation
5. **Monetization** → Ads start serving → Revenue accumulation
6. **Optimization** → View performance → Adjust placements
7. **Payment** → Revenue reports → Payment processing

### Agency Journey
1. **Registration** → Create agency account → Team setup
2. **Client Onboarding** → Add client accounts → Access permissions
3. **Multi-Campaign Management** → Create campaigns for multiple clients
4. **Consolidated Reporting** → Cross-client analytics
5. **Client Billing** → Invoice generation → Payment tracking
6. **Team Management** → Add/remove team members → Role assignment

## UI/UX Requirements

### Common Elements (All Users)
- Top navigation bar with logo and user menu
- Left sidebar navigation
- Dashboard home page with key metrics
- Notification center
- Search functionality
- Help/support access
- Dark/light mode toggle
- Mobile-responsive design

### Admin Dashboard
- System health overview
- User statistics
- Revenue metrics
- Campaign activity feed
- Alert notifications
- Quick actions panel

### Advertiser Portal
- Campaign performance overview
- Budget spent vs remaining
- Top performing ads
- Audience insights
- Quick campaign creation
- Recent activity

### Publisher Portal
- Revenue overview
- Top performing ad units
- Fill rate statistics
- Payment status
- Site performance metrics
- Ad tag generator

## Mobile App Requirements

### Features by User Type
- **All Users**: Login, notifications, basic reporting
- **Advertisers**: Campaign monitoring, budget alerts, quick pause/resume
- **Publishers**: Revenue tracking, ad unit performance, payment status
- **Admins**: System monitoring, user management, critical alerts
- **Analysts**: Report viewing, data export

### Technical Requirements
- Flutter framework (iOS + Android)
- Role-based UI rendering
- Offline data caching
- Push notifications
- Biometric authentication
- Real-time data sync

## Training Requirements

### By User Type
1. **Platform Overview** (All users) - 30 min video
2. **Advertiser Training** - 2 hours (video + manual)
3. **Publisher Training** - 1.5 hours (video + manual)
4. **Admin Training** - 3 hours (video + manual)
5. **Agency Training** - 2.5 hours (video + manual)
6. **Analyst Training** - 1 hour (video + manual)

### Training Formats
- Video tutorials (MP4)
- PDF manuals
- Interactive HTML guides
- In-app tooltips
- Live webinars
- Knowledge base articles
