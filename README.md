# react-native-mwa-reference

Example of a React Native app that hosts EGYM micro web apps (MWAs) in Ionic Portals and exposes native mobile features to them. It does what [ios-mwa-reference](https://github.com/egym/ios-mwa-reference) and [android-mwa-reference](https://github.com/egym/android-mwa-reference) do, in a plain React Native CLI app with TypeScript and the new architecture, without Expo.

This branch is a proof of concept: the app takes Portals, Capacitor and the Capacitor plugins from the EGYM package `@egym/capacitor-mwa-navigation`, which it installs from a local folder. See "EGYM MWA navigation package" below.

## What the app does

- The home screen has three buttons: "Workouts MWA", "Bioage MWA" and "NFC MWA".
- Each button calls `EgymMwa.open` from `@egym/capacitor-mwa-navigation/react-native` for one Appflow app: Workouts `851e0894`, Bioage `068a3720` or NFC `dcbe378a`, all three on the channel `reference`, with a sample initial context. See `src/mwas.ts` and `src/MwaHome.tsx`.
- The package shows the MWA in its own native full-screen screen, with its `EgymMwaNavigation` plugin and the nine Capacitor plugins that EGYM MWAs need. It closes the screen when the MWA sends `dismiss`, and on Android back. The app writes no code for this.
- With a local `bma-login.json`, the app first logs in as a BMA user, for EGYM testing. See "Log in as a BMA user" below.

## Versions

- React Native 0.87.1.
- `@ionic/portals-react-native` 0.10.0-beta.0, pinned exactly. It is the newest release of the SDK and the first one that uses Portals 0.13.1 or later on Android, which needs no Portals key. The `latest` release, 0.9.1, uses `io.ionic:portals:0.13.0-rn.1` on Android, which still asks for a key. The beta is built on React Native 0.87.1. Move to the stable release when it ships.
- Ionic Portals 0.13.2 on iOS (CocoaPods) and 0.13.1 on Android, as the SDK asks.
- Capacitor 8, Live Updates 0.5 and the Capacitor plugins come from `@egym/capacitor-mwa-navigation`.

No Portals key, token or password is needed, and none is stored in this repo.

## Build from a fresh clone

You need:

- Node 22.13 or newer. React Native 0.87 supports Node 22.13 and later 22 releases, 24.3 and later 24 releases, and 26 or newer.
- For iOS: Xcode with an iOS Simulator, and Ruby with Bundler for CocoaPods.
- For Android: JDK 21 and the Android SDK, both from Android Studio. Set `JAVA_HOME`, on macOS `export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"`, and `ANDROID_HOME`, on macOS usually `export ANDROID_HOME="$HOME/Library/Android/sdk"`. The first build downloads the NDK and the SDK parts it needs.

Steps:

1. This branch installs `@egym/capacitor-mwa-navigation` from a local folder: `package.json` points at `../../libs/lib-capacitor-mwa-navigation`, relative to this checkout. Run `npm install` in the package folder first. If your checkout sits elsewhere, run `npm install <path to the package folder>` here instead of `npm ci`. Then install the npm packages:
   ```bash
   npm ci
   ```
2. For iOS, install the pods:
   ```bash
   bundle install
   cd ios && bundle exec pod install && cd ..
   ```
3. Start Metro, which serves the JavaScript of debug builds:
   ```bash
   npm start
   ```
4. In a second terminal, build and run the app on a booted iOS Simulator or a running Android emulator:
   ```bash
   npm run ios
   npm run android
   ```

Run `npm ci` again after any change to `package.json` or `package-lock.json`, and `bundle exec pod install` for iOS, because Xcode and Gradle build the plugin code inside `node_modules`. If `pod install` cannot find a pod version, run `bundle exec pod install --repo-update`.

After you update the package folder, also delete `android/build/generated/autolinking`. The React Native Gradle plugin keeps its autolinking config until `package-lock.json` changes, and a linked local package does not change it, so Android would build without the package's native module.

Before each open the package syncs the MWA's live update, as the BMA apps do, so the first open on a fresh install shows no empty or error page: a loading view with a close button shows until the newest build is on the device. An open during a running download waits for that download. The sync waits at most 30 seconds; after that, or when it fails, the package shows the build already on the device, and with none it shows "Try again" and "Close". On iOS, the first tap on the back arrow of an MWA can do nothing; tap it again.

## Log in as a BMA user (optional, EGYM internal)

By default the app opens the MWAs with the sample context and no login. For EGYM testing, it can first log in as a member of a BMA (Galaxy) brand and then open Workouts and NFC as that member, the way the BMA apps do:

1. Copy the example file in the repo root:
   ```bash
   cp bma-login.example.json bma-login.json
   ```
2. Set its three keys to the values of an EGYM test environment:
   - `galaxyURL`: the Galaxy host of the member's brand.
   - `mwaApiURL`: the mwa-api host of the same environment. Workouts and NFC send every request there.
   - `liveUpdateChannel`: the Appflow channel that Workouts and NFC load from.
3. Restart Metro (`npm start`) and run the app. It starts with "Auth as BMA user". Log in with the member's email and password.

After the login, Workouts and NFC open on the channel from the file with `clientId` `egym`, the MWA token as `authToken`, the mwa-api host as `url`, the member's home gym as `gymLocation`, the email, `language` `en-US`, `preferences` `{}` and `linking` `{ status: 'linked', egymEmail }`. The context leaves out `emailJWT`, because the key alone turns on the MWA's consent guard, and `mwaProtocolVersion`, because this app does not handle `trackEvent`. Bioage keeps the sample context and the channel `reference`.

How it works:

- `src/bmaLogin/config.ts` reads the file with a `require` inside `try`. Metro treats such a require as optional: it bundles the file when it exists and builds without it when it does not, and the app then starts as described above. Metro looks for the file when it starts, so restart Metro after you add or delete the file. A release build takes the file that exists when it is built. A file with an empty key stops the app with a message that names the key.
- The login makes the two Galaxy calls of the BMA apps: the member login `POST /np/exerciser/login`, then `GET /np/micro-web-app/v1.0/exercisers/{uuid}/tokens/FLS` with the session of the login (`src/bmaLogin/galaxy.ts`).
- The app keeps Galaxy's session cookies in memory and sends them with each token call itself. The platform cookie store cannot keep them: on Android, each Capacitor Portal clears the session cookies of the WebView cookie store when it starts, and React Native's `fetch` uses the same store.
- When an MWA asks for a new token (type `authToken` on the topic `subscription`), the app gets one from Galaxy and publishes it on the topic `authToken`. The package relays the request from its screen to the app and the answer back. The next open starts with the new token. When Galaxy answers with 401 or 403, the session has ended, and the app goes back to the login.
- The token goes out through `PortalsStringPublisher`, a small native module of this app (`PortalsStringPublisher.kt`, `PortalsStringPublisher.swift`). The SDK's `publish` wraps every value as `{ message: value }`, but the MWAs read the `authToken` topic as a plain string.

The password goes only to Galaxy and is never stored or logged; iOS may offer to save it, as for any login form. The token and the session cookies stay in memory, so a new app start shows the login again. Never commit `bma-login.json`, a user, a password or a host name. To go back to the sample context, delete the file and restart Metro.

## Capacitor plugins

The package screen registers the package's own plugin list. A Capacitor plugin that the EGYM MWAs need goes into the package, not into this app.

Android takes Capacitor core only from `@capacitor/android` in `node_modules`, and `android/app/build.gradle` excludes the copy that Portals brings from Maven, so the app holds one Capacitor core.

## Android: system bars and the keyboard

The package screen is its own activity. It pads the system bars and the keyboard itself and sets the Capacitor config of its Portal, so this app needs no Portal config.

## EGYM MWA navigation package

`@egym/capacitor-mwa-navigation` carries Capacitor 8, Ionic Portals 0.13, Live Updates 0.5, nine Capacitor plugins (Preferences, App, Haptics, Keyboard, Status Bar, Browser, Device, community SQLite and the EGYM NFC wallet plugin) and two ways to open an MWA full screen: the open call `EgymMwa.open`, which this app uses, and the plugin `EgymMwaNavigation`, with which an MWA can open another MWA (today only NFC, `dcbe378a`). The package closes both on `dismiss`, so the host writes no live update or `dismiss` code. The package is not published yet, so this branch installs it from a local folder.

What this branch changes in the host:

- `package.json` lists the package in place of the app's own `@capacitor/core`, Preferences, SQLite and NFC wallet entries.
- `src/MwaHome.tsx` calls `EgymMwa.open` from `@egym/capacitor-mwa-navigation/react-native`, a module that imports nothing from `@capacitor/core`. The app shows no `PortalView` of its own.
- iOS: React Native autolinking adds the package's pod with its default subspec `Core`. The `Podfile` adds the subspec `ReactNative`, which holds the native module behind `EgymMwa.open`, and SQLite and the NFC wallet plugin from the package's `node_modules`, because CocoaPods trunk has neither. It gives SQLCipher and CapacitorKeyboard module maps, which the package's Swift pods need when pods build as static libraries, and raises the deployment target of the SQLCipher and ZIPFoundation pods from 12.0 to 15.0, which Xcode 27 needs.
- Android: `settings.gradle` includes the package's Gradle module, and SQLite and the NFC wallet plugin from the package's `node_modules`. `app/build.gradle` depends on `:egym-capacitor-mwa-navigation`. React Native autolinking finds the package's native module through its `react-native.config.cjs` and adds `EgymMwaReactNativePackage` to the app's package list.
- `metro.config.js` watches the package folder, because npm links a local folder into `node_modules` and Metro follows a link only into watched folders.

Host lines that stay with the package:

- iOS: the `ReactNative` subspec line, the two `:path` pods, the two `:modular_headers` pods and the deployment target fix in the `Podfile`, and the existing dynamic framework setting for Capacitor.
- Android: the `include` and `projectDir` lines, because only the app's `settings.gradle` can add Gradle projects; `@capacitor/android` and the `:capacitor-android` project, because the SQLite module depends on it; the exclude of the Capacitor core from Maven, because the Portals that the SDK brings from Maven would add a second core.
- `watchFolders` in `metro.config.js`, only while the package comes from a local folder.

The NFC MWA calls the wallet plugin as `CapacitorNFCPassWallet`: on its home screen it asks `isWalletAvailable` and shows "Add to Google Wallet" or "Add to Apple Wallet" only when the answer is true. When that button shows, the plugin works in this app.

The Workouts and NFC builds on the channel `reference` predate the MWAs' CSS safe area fallback and pad a fixed 40px, so with the package they show 40px more at the top and 20px more at the bottom. Newer builds pad once.

## Try the navigation plugin without a login

Call `open` from the Workouts WebView. On Android, open Workouts, connect Chrome DevTools to its WebView (`chrome://inspect`) and run:

```js
const context = JSON.parse(AndroidInitialContext.initialContext()).value;
Capacitor.Plugins.EgymMwaNavigation.open({
  appId: 'dcbe378a',
  channel: 'reference',
  startingRoute: '/nfc/home',
  initialContext: { ...context, startingRoute: '/nfc/home' },
}).then(console.log, console.error);
```

On iOS, use the Simulator's WebKit inspector (Safari, Develop menu) on the Workouts WebView of a debug build, and pass `{ ...window.portalInitialContext.value, startingRoute: '/nfc/home' }` as `initialContext`.

NFC opens full screen. Its back arrow resolves the call with `closedBy: 'dismiss'`, and Android back with `closedBy: 'back'`. A second call while NFC is up rejects with `BUSY`, and a call for another app id rejects with `NOT_ALLOWED`.

## Notes

- The NFC wallet plugin 0.4.0 that the package brings uses `proguard-android.txt`, which the Android Gradle plugin 9 rejects. `android/gradle.properties` turns that check off with `android.r8.proguardAndroidTxt.disallowed=false` until the plugin moves to `proguard-android-optimize.txt`.
- Checks: `npm run lint`, `npx tsc --noEmit` and `npm test`.
