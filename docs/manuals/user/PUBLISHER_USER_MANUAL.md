# Publisher User Manual
## AdTech Platform - Complete Guide for Publishers

**Version**: 1.0
**Last Updated**: November 2025

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Dashboard Overview](#dashboard-overview)
3. [Site & App Management](#site--app-management)
4. [Ad Unit Creation](#ad-unit-creation)
5. [Ad Implementation](#ad-implementation)
6. [Revenue Optimization](#revenue-optimization)
7. [Analytics & Reporting](#analytics--reporting)
8. [Payments](#payments)
9. [Best Practices](#best-practices)
10. [Troubleshooting](#troubleshooting)

---

## Getting Started

### Publisher Account Setup

1. **Register** at https://platform.adtech.com/publisher/register
2. **Complete profile**:
   - Company/individual name
   - Website/app details
   - Monthly traffic volume
   - Payment information (bank account or PayPal)
3. **Verify** identity (government ID for payments $1000+/month)
4. **Add** your first property (website or app)

### Approval Process

**Timeline**: 24-48 hours

**Requirements**:
- Original content (no copied/scraped content)
- Minimum 10,000 monthly pageviews
- Policy compliance (no adult, illegal, or hateful content)
- Working website with 3+ pages of content

**Approval Email**: Contains your Publisher ID and next steps

---

## Dashboard Overview

### Revenue Dashboard

```
┌─────────────────────────────────────────────────────────────┐
│  💰 REVENUE OVERVIEW (Last 30 Days)                         │
│                                                               │
│  Total Revenue: $5,248.32  (+18% vs last month)             │
│  Pending Payment: $2,156.40  (Next payment: Dec 15)         │
│                                                               │
│  📊 REVENUE BREAKDOWN                                        │
│  ┌──────────────┬──────────────┬──────────────┬─────────┐  │
│  │  Impressions │   Fill Rate  │     eCPM     │  RPM    │  │
│  │    2.8M      │     94.2%    │    $2.45     │ $2.31   │  │
│  └──────────────┴──────────────┴──────────────┴─────────┘  │
│                                                               │
│  📈 TOP PERFORMING AD UNITS                                  │
│  1. Homepage Leaderboard - $1,240 (eCPM $3.20)              │
│  2. Sidebar 300x250 - $890 (eCPM $2.85)                     │
│  3. In-content Ad - $720 (eCPM $2.40)                       │
│                                                               │
│  🌐 TOP PERFORMING SITES                                     │
│  1. example.com - $3,200                                     │
│  2. blog.example.com - $1,500                                │
│  3. shop.example.com - $548                                  │
└─────────────────────────────────────────────────────────────┘
```

### Key Metrics Explained

- **eCPM**: Effective cost per 1000 impressions (your revenue rate)
- **Fill Rate**: % of ad requests that returned an ad
- **RPM**: Revenue per 1000 pageviews
- **Viewability**: % of ads that were actually seen by users

---

## Site & App Management

### Adding a Website

1. **Navigate** to Sites → Add New Site
2. **Enter** site details:
   - Website URL
   - Site category (news, entertainment, etc.)
   - Monthly pageviews
   - Primary language
3. **Verify** ownership:
   - **Method 1**: Upload HTML file to root directory
   - **Method 2**: Add meta tag to homepage
   - **Method 3**: DNS TXT record
4. **Wait** for approval (12-24 hours)

### Adding a Mobile App

1. **Go to** Apps → Add New App
2. **Provide** app details:
   - App name
   - App store URL (iOS App Store or Google Play)
   - Category
   - Monthly active users
3. **Verify** with app store credentials
4. **Integration** instructions provided after approval

### Site Settings

**General Settings**:
- Site name and description
- Site category
- Primary audience demographics

**Ad Settings**:
- Allowed ad formats
- Maximum ads per page
- Ad refresh settings
- Block specific advertisers/categories

**Brand Safety**:
- Content ratings
- Keyword blocking
- Competitor exclusions

---

## Ad Unit Creation

### Understanding Ad Units

An **Ad Unit** is a specific ad placement on your site. Each ad unit has:
- Unique ID
- Size/format
- Placement location
- Performance tracking

### Creating Display Ad Units

**Step 1: Basic Information**

```
Ad Unit Name: "Homepage Top Banner"
Format: Display Banner
Size: 728x90 (Leaderboard)
Placement: Above the fold, homepage only
```

**Step 2: Ad Unit Settings**

**Allowed Ad Types**:
- ☑️ Display
- ☑️ Native
- ☐ Video (if you don't want video)
- ☑️ Responsive

**Pricing**:
- **Automatic** (recommended): Platform optimizes pricing
- **Floor Price**: Set minimum CPM (e.g., $0.50)
  - Protects revenue but may reduce fill rate
  - Recommended: Start with no floor, analyze data, then set

**Refresh Settings**:
- **No Refresh**: Ad stays same until page reload
- **Refresh every 30s**: Higher impressions, more revenue
- **Refresh on viewability**: Only when ad is visible

**Step 3: Generate Ad Code**

After creation, you receive ad code:

```html
<!-- AdTech Platform - Homepage Top Banner -->
<div id="adtech-ad-slot-123456"></div>
<script>
  (function() {
    var ad = document.createElement('script');
    ad.src = 'https://cdn.adtech.com/v1/ads.js';
    ad.setAttribute('data-ad-slot', '123456');
    ad.setAttribute('data-ad-format', 'leaderboard');
    document.getElementById('adtech-ad-slot-123456').appendChild(ad);
  })();
</script>
```

### Responsive Ad Units

**What are responsive ads?**
- Automatically adjust size to fit available space
- Work on mobile, tablet, desktop
- Higher fill rates

**Creating responsive ad unit**:

```html
<!-- Responsive ad - adapts to screen size -->
<div id="adtech-ad-slot-789012" style="min-height: 250px;"></div>
<script>
  (function() {
    var ad = document.createElement('script');
    ad.src = 'https://cdn.adtech.com/v1/ads.js';
    ad.setAttribute('data-ad-slot', '789012');
    ad.setAttribute('data-ad-format', 'responsive');
    ad.setAttribute('data-full-width-responsive', 'true');
    document.getElementById('adtech-ad-slot-789012').appendChild(ad);
  })();
</script>
```

### Video Ad Units

**Requirements**:
- Video player on your site
- Minimum 400x300 pixels
- Auto-play muted allowed (better performance)

**Video Ad Types**:
- **In-Stream**: Plays before/during/after your video content
- **Out-Stream**: Standalone video player (no your content required)
- **Sticky Video**: Follows user as they scroll

**Creating video ad unit**:

1. Select "Video Ad Unit"
2. Choose type (in-stream or out-stream)
3. Set player size (recommended: 640x360 or larger)
4. Configure auto-play settings
5. Get integration code

### Native Ad Units

**What are native ads?**
- Ads that match your site's look and feel
- Higher engagement (2-3x CTR vs display)
- Better user experience

**Native ad components**:
- Headline
- Description
- Image
- Call-to-action
- Sponsored label (required)

**Customization**:
- Font family, size, color
- Image size and position
- Background color
- Border and padding

**Example CSS customization**:

```css
.adtech-native-ad {
  font-family: Arial, sans-serif;
  background-color: #f5f5f5;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 15px;
}

.adtech-native-headline {
  font-size: 18px;
  font-weight: bold;
  color: #333;
}

.adtech-native-description {
  font-size: 14px;
  color: #666;
  margin-top: 10px;
}
```

---

## Ad Implementation

### Standard Implementation

**Step 1: Add Header Code**

Add once to `<head>` of all pages:

```html
<head>
  <!-- AdTech Platform - Header Code -->
  <script async src="https://cdn.adtech.com/v1/platform.js"></script>
  <script>
    window.adtechPlatform = window.adtechPlatform || [];
    window.adtechPlatform.push({
      publisherId: 'YOUR-PUBLISHER-ID',
      siteId: 'YOUR-SITE-ID'
    });
  </script>
</head>
```

**Step 2: Add Ad Units**

Place ad unit code where you want ads to appear:

```html
<body>
  <!-- Header ad -->
  <div id="adtech-ad-slot-header"></div>
  <script>
    window.adtechPlatform.push({
      adSlot: 'header',
      adUnit: 'YOUR-AD-UNIT-ID'
    });
  </script>

  <!-- Content -->
  <div class="content">
    <p>Your article content...</p>
  </div>

  <!-- Sidebar ad -->
  <aside>
    <div id="adtech-ad-slot-sidebar"></div>
    <script>
      window.adtechPlatform.push({
        adSlot: 'sidebar',
        adUnit: 'YOUR-AD-UNIT-ID'
      });
    </script>
  </aside>
</body>
```

### WordPress Integration

**Option 1: Plugin** (Easiest)

1. Install "AdTech Platform" plugin
2. Enter Publisher ID
3. Use shortcodes or widgets to place ads

```
[adtech id="YOUR-AD-UNIT-ID"]
```

**Option 2: Theme Integration**

Add to `functions.php`:

```php
<?php
// AdTech Platform integration
function adtech_header_code() {
  ?>
  <script async src="https://cdn.adtech.com/v1/platform.js"></script>
  <script>
    window.adtechPlatform = window.adtechPlatform || [];
    window.adtechPlatform.push({
      publisherId: '<?php echo get_option('adtech_publisher_id'); ?>',
      siteId: '<?php echo get_option('adtech_site_id'); ?>'
    });
  </script>
  <?php
}
add_action('wp_head', 'adtech_header_code');
?>
```

### Mobile App Integration

#### Android (Java/Kotlin)

1. Add dependency to `build.gradle`:

```gradle
dependencies {
    implementation 'com.adtech:ads-sdk:1.0.0'
}
```

2. Initialize SDK in `Application` class:

```java
import com.adtech.ads.AdTechSDK;

public class MyApp extends Application {
    @Override
    public void onCreate() {
        super.onCreate();
        AdTechSDK.initialize(this, "YOUR-PUBLISHER-ID");
    }
}
```

3. Load ads:

```java
import com.adtech.ads.AdView;

AdView adView = findViewById(R.id.adView);
adView.loadAd("YOUR-AD-UNIT-ID");
```

#### iOS (Swift)

1. Install via CocoaPods:

```ruby
pod 'AdTechSDK', '~> 1.0'
```

2. Initialize SDK:

```swift
import AdTechSDK

func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
    AdTechSDK.initialize(publisherID: "YOUR-PUBLISHER-ID")
    return true
}
```

3. Load ads:

```swift
import AdTechSDK

let adView = AdTechBannerView(adUnitID: "YOUR-AD-UNIT-ID", adSize: .banner)
adView.load()
view.addSubview(adView)
```

### Lazy Loading (Performance Optimization)

Load ads only when visible to user:

```javascript
// Lazy load ads on scroll
document.addEventListener('DOMContentLoaded', function() {
  const adSlots = document.querySelectorAll('[data-adtech-lazy]');

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const adSlot = entry.target;
        const adUnitId = adSlot.getAttribute('data-ad-unit');

        // Load ad
        window.adtechPlatform.push({
          adSlot: adSlot.id,
          adUnit: adUnitId
        });

        observer.unobserve(adSlot);
      }
    });
  });

  adSlots.forEach(slot => observer.observe(slot));
});
```

---

## Revenue Optimization

### Increasing eCPM

**1. Improve Ad Viewability**

- Place ads above the fold
- Avoid banner blindness (don't place where users ignore)
- Use sticky ads (follow user as they scroll)
- Target: >70% viewability

**2. Enable All Ad Formats**

- Display ads: $1.50-$3.00 eCPM
- Video ads: $5.00-$15.00 eCPM
- Native ads: $2.00-$5.00 eCPM
- Enabling all can increase revenue 30-50%

**3. Optimize Ad Placement**

**Best Performing Placements**:
1. Above-the-fold (90-100% viewability)
2. In-content (halfway through article)
3. Sidebar (desktop only)
4. Sticky footer (mobile)

**Poor Placements**:
- Below comments section
- After multiple scrolls
- Footer (desktop)

**4. Responsive Ads**

- 20-30% higher fill rate
- Better mobile monetization
- Easier implementation

**5. Header Bidding**

Enable header bidding for 15-25% revenue increase:

1. Go to Settings → Header Bidding
2. Enable feature
3. Select demand partners (more = better)
4. Set timeout (1000ms recommended)
5. Results in 7-14 days

**How it works**: Multiple advertisers bid simultaneously, highest bid wins.

**6. Refresh Ads**

- Static ads: 1 impression per pageview
- 30s refresh: 3-5 impressions per pageview
- Can triple revenue on same traffic

**Best practices**:
- Only refresh when ad is viewable
- Max 5 refreshes per ad unit
- Don't refresh too fast (30s minimum)

**7. Geographic Targeting**

eCPM varies by country:
- **Tier 1** (US, UK, CA, AU): $2.00-$5.00
- **Tier 2** (EU countries): $1.00-$2.50
- **Tier 3** (Asia, LATAM): $0.30-$1.00

**Strategy**: Create country-specific content to attract Tier 1 traffic.

### Increasing Fill Rate

**Current fill rate < 90%? Try these**:

1. **Lower floor price** (or remove it)
2. **Enable more ad formats** (display + native + video)
3. **Allow more categories** (unless brand safety concern)
4. **Check ad.txt** (ensure properly configured)
5. **Fix ad implementation** (check browser console for errors)

### Monitoring Performance

**Daily Check**:
- Revenue trend (up or down?)
- Fill rate (should be >90%)
- eCPM by ad unit
- Top/bottom performers

**Weekly Review**:
- Revenue by site/app
- Test new ad placements
- A/B test ad formats
- Adjust floor prices

**Monthly Analysis**:
- Traffic vs revenue correlation
- Seasonal trends
- Strategic planning
- Payment reconciliation

---

## Analytics & Reporting

### Revenue Reports

**Real-Time Dashboard**:
- Current day revenue (updates hourly)
- Impressions, clicks
- Fill rate
- eCPM

**Performance Report**:
- Date range selection
- Revenue breakdown by:
  - Site/app
  - Ad unit
  - Country
  - Device type
  - Ad format
- Export to CSV/Excel

**Trends Report**:
- Daily/weekly/monthly comparisons
- Year-over-year growth
- Seasonality analysis
- Forecasting (AI-powered)

### Custom Reports

**Report Builder**:
1. Select metrics (revenue, impressions, clicks, etc.)
2. Choose dimensions (site, ad unit, country, etc.)
3. Apply filters
4. Save and schedule (daily/weekly email)

**Example custom report**:
```
Report: "Mobile Revenue by Country"
Metrics: Revenue, Impressions, eCPM
Dimensions: Country, Device Type
Filters: Device = Mobile, Date Range = Last 30 days
Grouping: By Country
Sort: By Revenue DESC
```

### API Access

For advanced users, access reporting via API:

```bash
curl -X GET \
  'https://api.adtech.com/v1/publisher/reports' \
  -H 'Authorization: Bearer YOUR-API-KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "start_date": "2025-11-01",
    "end_date": "2025-11-30",
    "dimensions": ["date", "site_id"],
    "metrics": ["revenue", "impressions", "ecpm"]
  }'
```

Response:
```json
{
  "data": [
    {
      "date": "2025-11-01",
      "site_id": "site_123",
      "revenue": 145.23,
      "impressions": 52000,
      "ecpm": 2.79
    }
  ]
}
```

---

## Payments

### Payment Schedule

**Payment Terms**: Net-30 (paid 30 days after month end)

**Example**:
- November earnings: Paid December 30
- December earnings: Paid January 30

**Minimum Payout**: $100
- If below $100, balance rolls to next month

### Payment Methods

**1. Bank Transfer (ACH/Wire)**
- No fees
- 3-5 business days
- US and international supported

**2. PayPal**
- 2% fee (deducted from payment)
- Instant transfer
- Available in 200+ countries

**3. Check (US only)**
- $5 processing fee
- 7-10 business days
- Mailed to address on file

### Tax Information

**US Publishers**:
- Form W-9 required
- 1099-MISC issued annually (if earnings > $600)

**International Publishers**:
- Form W-8BEN required
- 30% withholding tax unless tax treaty (most countries have treaty = 0-15%)

**Adding tax information**:
1. Go to Settings → Tax Forms
2. Complete appropriate form (W-9 or W-8BEN)
3. E-sign and submit
4. Approved within 24 hours

### Payment History

**View payment history**:
- All past payments
- Payment dates
- Amounts
- Payment method
- Download receipts

---

## Best Practices

### Content Quality

**High-Quality Content = Higher eCPM**

✅ **Do**:
- Original, unique content
- Regular updates (new content)
- Proper grammar and spelling
- Fast loading times
- Mobile-friendly design
- Good user experience

❌ **Don't**:
- Copy content from other sites
- Auto-generated content
- Misleading headlines (clickbait)
- Excessive ads (poor user experience)
- Slow site (>3s load time)

### Ad Placement Guidelines

**Optimal Ad Density**:
- **Desktop**: 3-4 ads per page
- **Mobile**: 2-3 ads per page
- **Long articles**: 1 ad per 500 words

**Placement Rules**:
- ✅ Above the fold: 1 ad maximum
- ✅ In-content: Yes, but not disruptive
- ❌ More ads than content: No
- ❌ Ads mimicking content: No
- ❌ Auto-playing video with sound: No

### Policy Compliance

**Prohibited Content**:
- Adult/sexual content
- Illegal drugs, weapons
- Hate speech, discrimination
- Violence, gore
- Piracy, copyright infringement
- Misleading medical claims

**Consequences of violation**:
1. Warning (first offense)
2. Account suspension (repeated violations)
3. Permanent ban (severe violations)

### Site Performance

**Page Speed = Revenue**

- 1s faster load time = 10-15% more revenue
- Users leave if >3s load time
- Google ranks faster sites higher

**Optimization tips**:
- Use async ad loading (provided by default)
- Enable lazy loading
- Compress images
- Use CDN
- Minimize JavaScript
- Cache aggressively

**Test your site**:
- Google PageSpeed Insights
- GTmetrix
- WebPageTest.org

---

## Troubleshooting

### Ads Not Showing

**Checklist**:
1. ✓ Ad code properly implemented?
2. ✓ Publisher account approved?
3. ✓ Site/app verified and approved?
4. ✓ Ad unit active (not paused)?
5. ✓ No ad blockers active (test in incognito)?
6. ✓ Sufficient inventory available?
7. ✓ Check browser console for errors

**Common errors**:
```javascript
// Error: Invalid Publisher ID
// Fix: Check publisher ID in header code

// Error: Ad unit not found
// Fix: Verify ad unit ID is correct

// Error: ads.js failed to load
// Fix: Check CDN status at status.adtech.com
```

### Low Fill Rate

**Solutions**:
1. Remove floor prices (temporarily)
2. Enable all ad formats
3. Check targeting restrictions
4. Verify ad.txt is configured
5. Contact support with site details

### Revenue Dropped

**Common causes**:
1. **Traffic drop**: Check Google Analytics
2. **Seasonal**: Normal for some industries
3. **Ad blocker increase**: Monitor percentage
4. **Site speed issues**: Run speed test
5. **Policy violation**: Check email for warnings

**Action plan**:
1. Review last 7 days of data
2. Compare to previous period
3. Check for site changes
4. Review ad implementation
5. Contact support if no clear cause

### Payment Issues

**Payment delayed**:
- Check minimum threshold met ($100)
- Verify payment method is valid
- Ensure tax forms completed
- Allow 30 days + 5 business days

**Payment amount incorrect**:
1. Review payment report
2. Check for adjustments (refunds, fraud)
3. Download detailed breakdown
4. Contact finance@adtech.com with details

---

## Advanced Features

### Ad.txt Management

**What is ads.txt?**
- Text file that authorizes sellers of your inventory
- Fights ad fraud
- Required for programmatic ads

**Setup**:
1. Go to Settings → Ads.txt
2. Copy provided content
3. Create file at: yoursite.com/ads.txt
4. Verify after 24 hours

**Example ads.txt**:
```
# AdTech Platform
adtech.com, pub-123456789, DIRECT, f08c47fec0942fa0
google.com, pub-987654321, RESELLER, f08c47fec0942fa0
```

### Experiments & A/B Testing

**Test different strategies**:

1. Create experiment (e.g., "Test 300x250 vs 300x600")
2. Split traffic 50/50
3. Run for 7-14 days
4. Compare results
5. Implement winner

**Example test**:
- **Variant A**: 300x250 sidebar ad
- **Variant B**: 300x600 sidebar ad
- **Winner**: Variant B (15% more revenue)

### Custom Channels

**Group ad units for easier reporting**:

1. Create channel (e.g., "Homepage Ads")
2. Add ad units to channel
3. View aggregated performance
4. Useful for large sites with many ad units

### Mediation (Mobile Apps)

**Maximize mobile app revenue**:

- Combines multiple ad networks
- Waterfall + header bidding
- 20-40% revenue increase
- Automatic network optimization

**Supported networks**:
- AdMob
- Facebook Audience Network
- AppLovin
- Unity Ads
- Vungle

---

## Mobile App

**Download**:
- iOS: App Store
- Android: Google Play

**Features**:
- Real-time revenue tracking
- Push notifications for milestones
- Quick ad unit management
- Payment notifications
- Support chat

---

## Support

**Support Center**: https://help.adtech.com/publishers
- 500+ articles
- Video tutorials
- Integration guides

**Live Chat**: In platform (bottom right)
- 24/7 chatbot
- Human support: Mon-Fri 9am-6pm ET

**Email**: publisher-support@adtech.com
- Response within 24 hours

**Community Forum**: https://community.adtech.com
- Ask questions
- Share tips
- Network with other publishers

---

## Glossary

**Ad Unit**: Specific ad placement on your site
**eCPM**: Effective cost per 1000 impressions (your revenue rate)
**Fill Rate**: % of ad requests filled with ads
**Impressions**: Number of times ads were displayed
**Page RPM**: Revenue per 1000 pageviews
**Viewability**: % of ads actually seen by users
**Header Bidding**: Multiple advertisers bid simultaneously
**Floor Price**: Minimum CPM you'll accept
**Ad Refresh**: Reloading ads without page refresh
**Lazy Loading**: Loading ads only when visible

---

**End of Publisher User Manual**

**Version History**:
- v1.0 (Nov 2025): Initial release

For latest version: https://docs.adtech.com/publisher-manual
