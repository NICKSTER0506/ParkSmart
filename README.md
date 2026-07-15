# ParkSmart - Real-Time Parking Discovery & Management

ParkSmart is a comprehensive smart parking management application built with React Native and Expo to improve parking discovery and facility operations in Bengaluru.

The platform provides dedicated interfaces for drivers and parking administrators, combining real-time slot availability, multi-floor parking visualization, smart slot recommendations, digital bookings, native Razorpay payments, QR-based parking tickets, and simulated IoT sensor updates.

---

## 🌟 Key Features

### 🚗 For Drivers (Users)
- **Live Interactive Map**: Powered by an open-source Leaflet and OpenStreetMap integration via WebView, providing robust mapping without cloud billing dependencies.
- **Dynamic Slot Grids**: Visual grid representation of every floor in a parking complex, reflecting current slot availability as bookings and occupancy states change.
- **Native Payment Checkout**: Integrated with the native **Razorpay SDK** to provide an in-app parking payment flow.
- **Smart Recommendations**: A robust heuristic AI scoring engine (`aiService.js`) that recommends the optimal parking slot based on:
  - Distance to entrance/exit
  - User booking history
  - Strict vehicle type matching
  - Dynamic penalty for misuse of handicap slots
- **Issue Reporting**: Built-in hazard and illegal parking reporting system natively pushing to Firestore.
- **Digital Tickets**: Dynamic QR-code ticket generation for entry/exit validation.

### 🏢 For Administrators (Command Centre)
- **Live Analytics Engine**: Real-time aggregation of active bookings, total revenue, and slot utilization computed efficiently via `getDocs` to bypass heavy Cloud Functions.
- **SuperAdmin Dashboard**: Overarching control panel to oversee all complexes, system health, and global occupancy metrics.
- **Complex Management**: Dedicated infrastructure generator that automatically spawns multi-story parking complexes with granular, floor-by-floor slot configuration and hundreds of uniquely serialized slots (e.g., `C3-05`) in seconds.
- **Micro-management Overrides**: Facility managers can manually override slot statuses (e.g., mark a slot for maintenance) from their localized dashboard, instantly reflecting on the user map.

### 🔌 IoT Ecosystem & Resilience (v2.0 Features)
- **IoT Hardware Sensor Simulation**: A standalone Node.js background worker (`scripts/iot_simulator.js`) that uses the Firebase Admin SDK to simulate real-time physical parking sensors. It atomically updates slot statuses and pushes live UI changes to the Admin Dashboard.
- **Bulk Occupancy Scripts**: Node.js scripts (`bulk_occupy.js` and `target_occupy.js`) built to securely target and randomize slots within specific complexes (and specific floors) to mimic real-world peak hours on command.
- **Offline Digital Tickets**: Engineered with an offline-first caching mechanism using `AsyncStorage`. Users can retrieve their active booking QR codes even in basement parking lots with zero cellular connectivity.

---

## 🛠 Tech Stack & Architecture

- **Frontend Framework**: React Native 0.71 & Expo (Development Build Workflow)
- **Navigation**: React Navigation v6 (Bottom Tabs & Native Stacks)
- **Backend Database**: Firebase Firestore (NoSQL)
- **Authentication**: Firebase Authentication with Firestore-based role management
- **Payments Gateway**: Razorpay (Native Android SDK via `react-native-razorpay`)
- **Maps Integration**: Open-source Leaflet mapping embedded via `react-native-webview`.
- **Quota-Optimized Architecture**: Transitioned from costly `onSnapshot` real-time listeners to lean, on-demand `getDocs` targeted queries to ensure the application stays well within Firebase daily read quotas.

---

## 🗄️ Database Architecture

The system utilizes a denormalized NoSQL approach for rapid querying:
- **`users`**: Stores driver profiles, vehicle types, and historical preferences.
- **`admins`**: Stores facility manager credentials mapped to specific `complexId`s.
- **`complexes`**: The master infrastructure document tracking `availableCount`, `occupiedCount`, and GPS coordinates.
- **`slots`**: Thousands of individual slot documents containing `status` (`available`, `occupied`, `maintenance`), `vehicleType`, and spatial mapping data.
- **`bookings`**: Active and historical booking records containing parking, payment, and booking lifecycle data.

---

## 🚀 Setup & Installation

Because ParkSmart uses the native Razorpay SDK and custom native dependencies, the full application requires an Expo Development Build rather than the standard Expo Go client.

### 1. Prerequisites
- Node.js (v16+)
- Expo CLI
- Android Physical Device or Emulator
- An EAS (Expo Application Services) account.

### 2. Configure Environment Variables

Copy the example environment file:

```bash
cp .env.example .env
```

Configure the required Expo environment variables:

```bash
EXPO_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id

EXPO_PUBLIC_RAZORPAY_KEY_ID=rzp_test_your_key
```

> **Security Warning:** Never commit `.env`, Firebase Admin service-account credentials, or private payment gateway secrets to Git.

### 3. Build the Native Client (EAS)
Since the app requires native linking, you must trigger a cloud build using Expo Application Services:

```bash
# Ensure all your latest changes are committed to Git first!
git add .
git commit -m "Ready for build"

# Trigger the cloud build
npx eas-cli build --profile development --platform android
```
Once the build completes, scan the generated QR code to download and install the `.apk` on your Android device.

### 4. Start the Development Server
With the custom client installed on your phone, start your Metro bundler:
```bash
npx expo start --dev-client
```

### 5. Generate a Production Build
To generate a production Android build:

```bash
npx eas-cli build -p android --profile production
```
The resulting Android artifact depends on the selected EAS build profile and Android build configuration.
## 🔌 Running the IoT Simulator

To demonstrate real-time hardware capabilities, you can run the background sensor simulator.
1. Download your `serviceAccountKey.json` from the Firebase Console (Project Settings -> Service Accounts).
2. Place it inside the `scripts/` directory.
3. Open a new terminal and run:
```bash
node scripts/iot_simulator.js
```
The simulator will authenticate as an Admin and begin randomly toggling slots, which will instantly reflect on the connected mobile app's Admin Dashboard.

---
**Built to end Bengaluru's parking chaos.** 🚦
