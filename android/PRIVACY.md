# ScamCheck GH for Android

This app is for your own phone. Install the debug APK yourself. It is not on the Play Store.

## What it asks for

- **Receive SMS** and **Read SMS**, so it can check an incoming text and the recent inbox.
- **Notifications**, so a Scam or Caution result can appear without opening the app.
- **Internet**, only when you tap **Check with AI**.

If you decline SMS access, the app still opens. Paste a message and check it on the phone.

## What leaves the phone

Nothing, until you tap **Check with AI**. That sends the one message to the server address you saved. The app does not contain a Nebius key or a Tavily key. The server stays in sample mode until you set `DEMO_MODE=false` there.

Notifications show the band, not the full text. Saved messages live in the app’s private files and go away when you uninstall.

## Install the debug APK

1. Download `scamcheck-debug-apk` from the GitHub Actions run, or build it with `gradle :app:assembleDebug` inside `android/`.
2. Copy the APK to the phone and open it. Allow installs from that source if Android asks.
3. On Android 13 and newer, sideloaded apps that use SMS are blocked until you turn on restricted settings:
   - Open **Settings → Apps → ScamCheck GH → App info** (the menu in the top corner).
   - Tap **Allow restricted settings**.
   - Go back to the app and allow SMS access.
4. Open ScamCheck, read the explanation, then allow SMS or choose **Not now**.

## If this were listed on Play

Google Play treats `RECEIVE_SMS` and `READ_SMS` as sensitive. A store listing would need the SMS permissions declaration, under a permitted use such as the device’s default SMS app or a documented spam-detection exception. That exception asks for a track record. This sideload build does not go through that review. Do not ship these permissions on Play without that declaration and an approval.
