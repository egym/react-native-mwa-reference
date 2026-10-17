# react-native-mwa-reference

Example of a React Native app that hosts EGYM micro web apps (MWAs) in Ionic Portals and exposes native mobile features to them. It does what [ios-mwa-reference](https://github.com/egym/ios-mwa-reference) and [android-mwa-reference](https://github.com/egym/android-mwa-reference) do, in a plain React Native CLI app with TypeScript and the new architecture, without Expo.

This branch is a proof of concept: the app takes Portals, Capacitor and the Capacitor plugins from the EGYM package `@egym/capacitor-mwa-navigation`, which it installs from a local folder. See "EGYM MWA navigation package" below.

## What the app does

- The home screen has three buttons: "Workouts MWA", "Bioage MWA" and "NFC MWA".
- Each button opens a full-screen `PortalView` for one Appflow app: Workouts `851e0894`, Bioage `068a3720` or NFC `dcbe378a`. All three load from the channel `reference` and sync their live update when the Portal is added (`syncOnAdd: true`).
- Each Portal gets a sample initial context and the plugin list of the EGYM package, registered by class name: its `EgymMwaNavigation` plugin and the nine Capacitor plugins that EGYM MWAs need. See `src/mwas.ts`.
- When the MWA sends `dismiss` on the `subscription` topic, the screen closes and its subscription ends. Android back closes it too. See `src/MwaScreen.tsx`.
- With a local `bma-login.json`, the app first logs in as a BMA user, for EGYM testing. See "Log in as a BMA user" below.
- Debug builds show a fourth button, "Plugin test". See "Try the navigation plugin without a login" below.

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

On a fresh install, the first open of each MWA shows an empty page on iOS and "Webpage not available" on Android while its live update downloads. On Android, go back and open it again. On iOS, close the app, start it again and open the MWA again. On iOS, the first tap on the back arrow of an MWA can do nothing; tap it again.

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
- When an MWA asks for a new token (type `authToken` on the topic `subscription`), the app gets one from Galaxy and publishes it on the topic `authToken`. When Galaxy answers with 401 or 403, the session has ended, and the app goes back to the login.
- The token goes out through `PortalsStringPublisher`, a small native module of this app (`PortalsStringPublisher.kt`, `PortalsStringPublisher.swift`). The SDK's `publish` wraps every value as `{ message: value }`, but the MWAs read the `authToken` topic as a plain string.

The password goes only to Galaxy and is never stored or logged; iOS may offer to save it, as for any login form. The token and the session cookies stay in memory, so a new app start shows the login again. Never commit `bma-login.json`, a user, a password or a host name. To go back to the sample context, delete the file and restart Metro.

## Add a Capacitor plugin

1. Install it from npm: `npm install <plugin>`.
2. iOS: run `bundle exec pod install` in `ios`. React Native autolinking adds the plugin's pod.
3. Android: React Native autolinking skips Capacitor plugins, so add the plugin's Gradle module by hand. In `android/settings.gradle`, add it to the `include` line and set its `projectDir` to `../node_modules/<plugin>/android`. In `android/app/build.gradle`, add `implementation project(':<name>')`.
4. Register the plugin on each Portal in `src/mwas.ts`, next to `egymMwaPortalPlugins`, with `androidClassPath`, the full Java class name, and `iosClassName`, the Objective-C class name, which most plugins set with `@objc(...)` in their Swift code.
5. For a plugin that one platform does not use, register it only on the other platform and turn its autolinking off in a `react-native.config.js`.

Android takes Capacitor core only from `@capacitor/android` in `node_modules`, and `android/app/build.gradle` excludes the copy that Portals brings from Maven, so the app holds one Capacitor core.

## Android: system bars and the keyboard

The SDK has no field for a Capacitor config. Without one, the first Portal lets Capacitor 8's SystemBars plugin pad the whole React Native window for the system bars until the app restarts. On a WebView 140 or newer, Capacitor's `SystemBars.java` passes the bar insets to the MWA instead, so the MWA would pad again inside the screen's safe area.

`PortalInsets.kt`, registered in `MainActivity.kt`, handles every Portal the SDK creates:

- It sets the Capacitor config `SystemBars.insetsHandling: "disable"`, as the native Android reference does.
- It passes zero bar insets to the Portal's WebView, because the React Native screen keeps the Portal clear of the bars with `SafeAreaView`.
- It pads the Portal above the keyboard, because the edge-to-edge window does not resize for it.
- It sets `App.disableBackButtonHandler: true`, because the package's App plugin would otherwise take Android back from React Native's `BackHandler` and do nothing when the MWA has no back listener.
- It adds `EgymMwa.zeroCssSafeAreaListener()` from the package. With the package's Status Bar plugin, an EGYM MWA that sees no CSS safe area pads 40px at the top and 20px at the bottom on top of this screen's padding; the listener sets the CSS safe area to 0.

Keep `PortalInsets` when you copy the Portal screen into another React Native app.

## EGYM MWA navigation package

`@egym/capacitor-mwa-navigation` carries Capacitor 8, Ionic Portals 0.13, Live Updates 0.5, nine Capacitor plugins (Preferences, App, Haptics, Keyboard, Status Bar, Browser, Device, community SQLite and the EGYM NFC wallet plugin) and its own plugin, `EgymMwaNavigation`. With it, an MWA can open another MWA full screen (today only NFC, `dcbe378a`), and the plugin closes it again on `dismiss`. The host writes no code for the opened MWA. The package is not published yet, so this branch installs it from a local folder.

What this branch changes in the host:

- `package.json` lists the package in place of the app's own `@capacitor/core`, Preferences, SQLite and NFC wallet entries.
- Every Portal registers `egymMwaPortalPlugins` from `@egym/capacitor-mwa-navigation/react-native`, a module that imports nothing from `@capacitor/core` (`src/mwas.ts`).
- iOS: React Native autolinking adds the package's pod. The `Podfile` adds SQLite and the NFC wallet plugin from the package's `node_modules`, because CocoaPods trunk has neither, gives SQLCipher and CapacitorKeyboard module maps, which the package's Swift pods need when pods build as static libraries, and raises the deployment target of the SQLCipher and ZIPFoundation pods from 12.0 to 15.0, which Xcode 27 needs.
- Android: `settings.gradle` includes the package's Gradle module, and SQLite and the NFC wallet plugin from the package's `node_modules`. `app/build.gradle` depends on `:egym-capacitor-mwa-navigation` alone; `PortalInsets.kt` gets Portals and Capacitor through it.
- iOS: `src/MwaScreen.tsx` runs the Portal edge to edge, because with the package's Status Bar plugin the MWA pads the safe area itself.
- `metro.config.js` watches the package folder, because npm links a local folder into `node_modules` and Metro follows a link only into watched folders.

Host lines that stay with the package:

- iOS: the two `:path` pods, the two `:modular_headers` pods and the deployment target fix in the `Podfile`, and the existing dynamic framework setting for Capacitor.
- Android: the `include` and `projectDir` lines, because only the app's `settings.gradle` can add Gradle projects; `@capacitor/android` and the `:capacitor-android` project, because the SQLite module depends on it; the exclude of the Capacitor core from Maven, because the Portals that the SDK brings from Maven would add a second core.
- Android: the `App` and `SystemBars` settings and the CSS safe area listener in `PortalInsets.kt`.
- iOS: the edge-to-edge Portal in `src/MwaScreen.tsx`.
- `watchFolders` in `metro.config.js`, only while the package comes from a local folder.

The Workouts and NFC builds on the channel `reference` predate the MWAs' CSS safe area fallback and pad a fixed 40px, so with the package they show 40px more at the top and 20px more at the bottom. Newer builds pad once.

## Try the navigation plugin without a login

Debug builds have a fourth button, "Plugin test". It opens a small page from `debug-assets/plugin-test` in a Portal with the package's plugin list and the Workouts context, and its buttons call `EgymMwaNavigation.open` the way the Workouts demo button does:

- "Open NFC" opens NFC on the channel that the app uses for NFC. NFC's back arrow closes it, and the page shows `closedBy: dismiss`. Android back closes it with `closedBy: back`.
- "Open twice" opens one NFC screen and shows `rejected: BUSY` for the second call.
- "Other app" asks for Bioage and shows `rejected: NOT_ALLOWED`; nothing opens.
- "Close" closes the page.

The page is in debug builds only: Android takes it from the `debug` source set, and the iOS Release configuration leaves it out with `EXCLUDED_SOURCE_FILE_NAMES`. The button shows only when `__DEV__` is true.

On Android you can also call `open` from the Workouts WebView. Open Workouts, connect Chrome DevTools to its WebView (`chrome://inspect`) and run:

```js
const context = JSON.parse(AndroidInitialContext.initialContext()).value;
Capacitor.Plugins.EgymMwaNavigation.open({
  appId: 'dcbe378a',
  channel: 'reference',
  startingRoute: '/nfc/home',
  initialContext: { ...context, startingRoute: '/nfc/home' },
}).then(console.log, console.error);
```

## Notes

- `PortalView` writes to the portal object it gets, and development builds freeze props, so `src/MwaScreen.tsx` passes a copy.
- The NFC wallet plugin 0.4.0 that the package brings uses `proguard-android.txt`, which the Android Gradle plugin 9 rejects. `android/gradle.properties` turns that check off with `android.r8.proguardAndroidTxt.disallowed=false` until the plugin moves to `proguard-android-optimize.txt`.
- Checks: `npm run lint`, `npx tsc --noEmit` and `npm test`.
