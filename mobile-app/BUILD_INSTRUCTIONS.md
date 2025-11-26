# Mobile App Build Instructions

## Prerequisites

### Flutter SDK
```bash
# Install Flutter (macOS/Linux)
git clone https://github.com/flutter/flutter.git -b stable
export PATH="$PATH:`pwd`/flutter/bin"
flutter doctor
```

### Android Build Requirements
- Android Studio (latest version)
- Android SDK (API level 21+)
- Java JDK 11 or higher
- Gradle 7.6+

### iOS Build Requirements
- macOS with Xcode 15+
- CocoaPods: `sudo gem install cocoapods`
- Apple Developer Account (for distribution)

---

## Building for Android

### 1. Setup Environment

```bash
cd mobile-app

# Install dependencies
flutter pub get

# Verify setup
flutter doctor
```

### 2. Build APK (Debug)

```bash
# Build debug APK
flutter build apk --debug

# Output: build/app/outputs/flutter-apk/app-debug.apk
```

### 3. Build APK (Release)

**Setup Signing** (First time only):

1. Create keystore:
```bash
keytool -genkey -v -keystore ~/adtech-release-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias adtech
```

2. Create `android/key.properties`:
```properties
storePassword=<your-keystore-password>
keyPassword=<your-key-password>
keyAlias=adtech
storeFile=<path-to-keystore>
```

**Build Release APK**:
```bash
# Build release APK
flutter build apk --release --flavor production

# Output: build/app/outputs/flutter-apk/app-production-release.apk
```

### 4. Build App Bundle (for Play Store)

```bash
# Build AAB (recommended for Play Store)
flutter build appbundle --release --flavor production

# Output: build/app/outputs/bundle/productionRelease/app-production-release.aab
```

### 5. Build for Different Environments

```bash
# Development
flutter build apk --flavor development --debug

# Staging
flutter build apk --flavor staging --release

# Production
flutter build apk --flavor production --release
```

---

## Building for iOS

### 1. Setup Environment

```bash
cd mobile-app

# Install dependencies
flutter pub get

# Install iOS pods
cd ios
pod install
cd ..
```

### 2. Configure Xcode Project

1. Open `ios/Runner.xcworkspace` in Xcode
2. Select Runner → Signing & Capabilities
3. Select your Team
4. Update Bundle Identifier: `com.adtech.platform`

### 3. Build IPA (Debug)

```bash
# Build debug IPA
flutter build ios --debug --no-codesign

# Output: build/ios/iphoneos/Runner.app
```

### 4. Build IPA (Release)

```bash
# Build release IPA
flutter build ios --release

# Archive in Xcode
open ios/Runner.xcworkspace
# Product → Archive → Distribute App
```

**Or use command line**:
```bash
# Build and export IPA
flutter build ipa --release --export-options-plist=ios/ExportOptions.plist

# Output: build/ios/ipa/adtech_platform.ipa
```

### 5. Create ExportOptions.plist

Create `ios/ExportOptions.plist`:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>method</key>
    <string>app-store</string>
    <key>teamID</key>
    <string>YOUR_TEAM_ID</string>
    <key>uploadBitcode</key>
    <false/>
    <key>compileBitcode</key>
    <false/>
    <key>uploadSymbols</key>
    <true/>
</dict>
</plist>
```

---

## App Signing & Distribution

### Android - Google Play Store

1. **Build signed AAB**:
   ```bash
   flutter build appbundle --release --flavor production
   ```

2. **Upload to Play Console**:
   - Go to https://play.google.com/console
   - Create app → Upload AAB
   - Complete store listing
   - Submit for review

### iOS - App Store

1. **Archive in Xcode**:
   ```bash
   flutter build ios --release
   open ios/Runner.xcworkspace
   ```

2. **Create Archive**:
   - Product → Archive
   - Window → Organizer
   - Distribute App → App Store Connect
   - Upload

3. **App Store Connect**:
   - Go to https://appstoreconnect.apple.com
   - Complete app information
   - Submit for review

---

## Firebase Setup (Push Notifications)

### Android

1. Download `google-services.json` from Firebase Console
2. Place in `android/app/google-services.json`

### iOS

1. Download `GoogleService-Info.plist` from Firebase Console
2. Place in `ios/Runner/GoogleService-Info.plist`
3. Add to Xcode project

---

## Build Variants

### Development Build
```bash
# Android
flutter build apk --flavor development --debug

# iOS
flutter build ios --debug --flavor development
```

**Features**:
- Debug logging enabled
- Dev API endpoints
- Local testing optimized

### Staging Build
```bash
# Android
flutter build apk --flavor staging --release

# iOS
flutter build ios --release --flavor staging
```

**Features**:
- Staging API endpoints
- Pre-production testing
- Performance monitoring

### Production Build
```bash
# Android
flutter build appbundle --flavor production --release

# iOS
flutter build ipa --flavor production --release
```

**Features**:
- Production API endpoints
- Analytics enabled
- Crashlytics enabled
- Code obfuscation

---

## Automated Builds (CI/CD)

### GitHub Actions

Create `.github/workflows/mobile-build.yml`:

```yaml
name: Mobile App Build

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  build-android:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: subosito/flutter-action@v2
        with:
          flutter-version: '3.16.0'
      - run: flutter pub get
      - run: flutter test
      - run: flutter build apk --release
      - uses: actions/upload-artifact@v3
        with:
          name: android-apk
          path: build/app/outputs/flutter-apk/app-release.apk

  build-ios:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v3
      - uses: subosito/flutter-action@v2
        with:
          flutter-version: '3.16.0'
      - run: flutter pub get
      - run: flutter test
      - run: flutter build ios --release --no-codesign
```

### Fastlane (Advanced)

Install Fastlane:
```bash
sudo gem install fastlane
```

**Android** (`android/fastlane/Fastfile`):
```ruby
default_platform(:android)

platform :android do
  desc "Build and deploy to Play Store"
  lane :release do
    gradle(task: "clean bundleRelease")
    upload_to_play_store(
      track: 'internal',
      aab: '../build/app/outputs/bundle/release/app-release.aab'
    )
  end
end
```

**iOS** (`ios/fastlane/Fastfile`):
```ruby
default_platform(:ios)

platform :ios do
  desc "Build and deploy to App Store"
  lane :release do
    build_app(scheme: "Runner")
    upload_to_app_store(
      skip_metadata: true,
      skip_screenshots: true
    )
  end
end
```

---

## Testing Before Release

### Unit Tests
```bash
flutter test
```

### Integration Tests
```bash
flutter test integration_test
```

### Widget Tests
```bash
flutter test test/widget_test.dart
```

### Performance Testing
```bash
# Android
flutter run --profile --flavor production

# iOS
flutter run --profile --flavor production
```

---

## App Size Optimization

### Reduce APK Size
```bash
# Split by ABI
flutter build apk --split-per-abi --release

# Outputs:
# - app-armeabi-v7a-release.apk (~20MB)
# - app-arm64-v8a-release.apk (~25MB)
# - app-x86_64-release.apk (~30MB)
```

### Code Obfuscation
```bash
flutter build apk --obfuscate --split-debug-info=build/debug-info --release
```

### Compress Assets
- Use WebP instead of PNG/JPG
- Compress images with `flutter_image_compress`
- Remove unused assets

---

## Troubleshooting

### Common Android Issues

**Issue**: Gradle build fails
```bash
# Solution
cd android
./gradlew clean
cd ..
flutter clean
flutter pub get
flutter build apk
```

**Issue**: Multidex error
```gradle
// Add to android/app/build.gradle
defaultConfig {
    multiDexEnabled true
}
```

### Common iOS Issues

**Issue**: Pod install fails
```bash
# Solution
cd ios
pod repo update
pod install
cd ..
```

**Issue**: Signing error
- Check Apple Developer account
- Verify certificates in Keychain
- Clean build folder: Product → Clean Build Folder

---

## Build Output Locations

### Android
```
build/app/outputs/
├── flutter-apk/
│   ├── app-production-release.apk      # Release APK
│   ├── app-debug.apk                   # Debug APK
│   └── app-{flavor}-{buildType}.apk
└── bundle/
    └── productionRelease/
        └── app-production-release.aab  # Play Store bundle
```

### iOS
```
build/ios/
├── iphoneos/
│   └── Runner.app                      # iOS app
├── ipa/
│   └── adtech_platform.ipa             # IPA for distribution
└── archive/
    └── Runner.xcarchive                # Xcode archive
```

---

## Version Management

Update version in `pubspec.yaml`:
```yaml
version: 1.0.0+1  # version_name+build_number
```

**Increment for releases**:
- Major release: `2.0.0+1`
- Minor release: `1.1.0+2`
- Patch release: `1.0.1+3`

---

## Support

**Build Issues**: support@adtech.com
**Documentation**: https://docs.adtech.com/mobile
**Flutter Docs**: https://docs.flutter.dev

---

**Last Updated**: November 2025
**Flutter Version**: 3.16.0
**Minimum Supported**:
- Android: API 21 (Android 5.0)
- iOS: 12.0
