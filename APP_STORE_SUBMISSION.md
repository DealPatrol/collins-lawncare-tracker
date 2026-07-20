# Collins Lawncare Tracker - App Store Submission Guide

## Overview

Collins Lawncare Tracker is a mobile-first job scheduling and payment tracking app built with React and Capacitor for iOS/Android deployment.

## Pre-Submission Checklist

### 1. App Information
- **App Name**: Collins Lawncare Tracker
- **Version**: 1.0.0
- **Bundle ID**: `com.collinslawncare.tracker`
- **Company**: Collins Lawncare
- **Support Email**: support@collinslawncare.com

### 2. Required Assets (Ready)
- ✓ App Icon (1024x1024px) - `resources/ios/icon/icon-1024.png`
- ✓ Splash Screens:
  - iPhone Pro Max (1242x2208px) - `resources/ios/splash/Default@3x~iphone~portrait~notch.png`
  - iPhone SE (1125x2436px) - `resources/ios/splash/Default~iphone~portrait.png`
- ✓ Marketing Screenshots (3 shots) - `docs/screenshots/`

### 3. Legal Documents (Ready)
- ✓ Privacy Policy - `docs/privacy.html`
- ✓ Terms of Service - `docs/terms.html`
- Support Email: support@collinslawncare.com

### 4. Key Features for Description

**Headline**: Track Jobs, Manage Your Crew, Get Paid

**Description**:
Collins Lawncare Tracker is the all-in-one job scheduling and payment tracking tool for lawn care businesses. Track time on every job, monitor weekly earnings, optimize your route, and generate professional invoices.

**Features**:
- Real-time clock in/out with GPS tracking
- Job prioritization and smart routing optimization
- Complete payment tracking with hourly rate calculations
- Weekly mow checklist and schedule management
- Professional invoice generation with client details
- Photo evidence and completion notes for every job
- Detailed analytics dashboard with performance metrics
- Automatic data backup and export
- Private data storage - nothing uploaded to the cloud

### 5. Content Rating (IARC)

Select these ratings:
- **Frequent/Intense**: None
- **Infrequent/Mild**: None
- This is a business productivity app with no objectionable content

### 6. Build Instructions for iOS

```bash
# Install dependencies
npm install

# Build web assets
npm run build

# Create iOS app
npx cap add ios
npx cap sync ios

# Update Xcode project
cd ios/App
pod install
cd ../..

# Open in Xcode
npx cap open ios
```

### 7. Capacitor Configuration

Key settings in `capacitor.config.json`:
- `appId`: com.collinslawncare.tracker
- `appName`: Collins Lawncare Tracker
- `webDir`: dist

### 8. Permissions Required

**App Permissions** (in Info.plist):
- `NSLocationWhenInUseUsageDescription`: "Track job locations and optimize your route"
- `NSCameraUsageDescription`: "Capture photos of completed work"
- `NSPhotoLibraryUsageDescription`: "Save photos to your device"

### 9. Testing Checklist

Before submission, verify:
- [ ] Onboarding screen displays correctly
- [ ] Crew name persists after first launch
- [ ] All navigation buttons work (Priority, Analytics, Invoice, Settings)
- [ ] Jobs can be created, edited, and deleted
- [ ] Timer starts/stops correctly
- [ ] Analytics dashboard displays with sample data
- [ ] Privacy policy and terms links work
- [ ] No console errors in production build
- [ ] App works in airplane mode (offline)
- [ ] Data persists after app close/reopen

### 10. App Store Connect Setup

1. Create app in App Store Connect
2. Add bundle ID: `com.collinslawncare.tracker`
3. Upload screenshots in required resolutions
4. Add privacy policy and terms URLs
5. Set pricing tier (recommend free with optional features)
6. Configure subscriptions (if planned)

### 11. Common Rejection Reasons to Avoid

- ✓ App has clear functionality (job tracking)
- ✓ Privacy policy explains local data storage
- ✓ No misleading metadata or screenshots
- ✓ Permissions justified and explained
- ✓ No hardcoded payment flow (if monetized later, use StoreKit)

### 12. Future Enhancement Ideas

For post-launch updates:
- Team member collaboration
- Cloud sync (optional)
- Stripe/PayPal payment integration
- Recurring job templates
- Client communication features
- Advanced reporting

### 13. Support & Feedback

- In-app settings link to privacy policy
- Email: support@collinslawncare.com
- Consider adding in-app feedback mechanism

### 14. Important Notes

- **Data Privacy**: All data stored locally on device. No cloud sync by default.
- **Offline Support**: App fully functional without internet connection
- **iOS Deployment**: Uses Capacitor for native iOS wrapper
- **Performance**: Optimized build size ~75KB gzipped
- **Browser Cache**: Uses localStorage for persistence (managed by Capacitor)

## Submission Timeline

1. **Day 1-2**: Prepare screenshots and metadata in App Store Connect
2. **Day 3**: Upload build (TestFlight beta recommended first)
3. **Day 3-5**: Test thoroughly on devices
4. **Day 6**: Submit to App Store review
5. **Day 7-10**: Apple review process (typically 24-48 hours)
6. **Day 11+**: App approved and published

## Troubleshooting

### Build Issues
- Clear node_modules: `rm -rf node_modules && npm install`
- Clear Capacitor cache: `npx cap sync`

### iOS Specific
- Update Xcode to latest version
- Ensure iOS deployment target matches Capacitor requirements
- Check provisioning profiles in Xcode

### Submission Issues
- Review rejection reasons carefully
- Most common: unclear privacy policy or misleading screenshots
- Provide detailed description of how app works

## Questions?

Contact: support@collinslawncare.com

---

Last Updated: January 2025
Status: Ready for Submission
