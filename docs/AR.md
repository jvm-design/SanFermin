# AR — getting the true-AR build on your phone

The AR battle (decision 0007) uses a native engine (ViroReact/ARKit) that
**Expo Go does not contain**. In Expo Go you'll keep seeing the camera
backdrop fallback. To see tomatoes flying through your actual room, you
need a development build of the app. Two routes:

## Route A — EAS cloud build (recommended; no Xcode, ~30 min + queue)

Prerequisite: an **Apple Developer Program** membership (developer.apple.com,
99 €/year). It is also required for TestFlight and the App Store, so this
is an investment you'll make anyway.

1. Create a free Expo account at **expo.dev**.
2. On the Mac, in the project:
   ```bash
   cd ~/SanFermin/apps/mobile
   npx eas-cli login          # your expo.dev credentials
   npx eas-cli build --profile development --platform ios
   ```
3. The CLI asks to log in to your Apple account and registers your
   iPhone (it guides you; say yes to everything it offers to create).
4. ~20-40 min later you get a link/QR: open it on the iPhone to install
   the **Tomatina dev app** (its own icon, separate from Expo Go).
5. Start Metro as usual (`pnpm mobile`) and open the Tomatina dev app —
   it connects to Metro like Expo Go did, but with the AR engine inside.
   The battle screens detect it automatically: AR on.

## Route B — local Xcode build (free Apple ID, heavier setup)

1. Install **Xcode** from the Mac App Store (large download).
2. ```bash
   cd ~/SanFermin/apps/mobile
   npx expo run:ios --device
   ```
3. Choose your plugged-in iPhone; sign with your free Apple ID when
   prompted (Xcode → Settings → Accounts). Free-account builds expire
   after 7 days — rerun the command to refresh.

## Day-to-day after the first build

JS-only changes (most of our work) do NOT need a rebuild: pull, restart
Metro, reopen the dev app. A rebuild is only needed when native modules
change (we'll flag it explicitly when it happens).
