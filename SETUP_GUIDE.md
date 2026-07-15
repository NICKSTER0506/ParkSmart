# ParkSmart Setup Guide

This guide explains how to configure and run ParkSmart locally.

ParkSmart is built with React Native and Expo and uses Firebase for authentication and data storage. The Android application also uses the native Razorpay SDK, so the complete mobile application requires an Expo Development Build instead of the standard Expo Go client.

---

## 1. Prerequisites

Before setting up the project, make sure you have the following:

- Node.js
- npm
- Git
- An Expo account with access to EAS Build
- An Android physical device or emulator
- A Firebase project
- A Razorpay test account

---

## 2. Clone the Repository

Clone the ParkSmart repository and move into the project directory:

```bash
git clone <repository-url>
cd ParkSmart
```

Install the project dependencies:

```bash
npm install
```

The required packages are installed based on `package.json` and `package-lock.json`.

---

## 3. Configure Firebase

Open the Firebase Console and create a Firebase project if you do not already have one.

### Enable Firebase Authentication

1. Open your Firebase project.
2. Go to **Authentication**.
3. Open the **Sign-in method** section.
4. Enable **Email/Password** authentication.

### Create a Firestore Database

1. Go to **Firestore Database**.
2. Create a Firestore database.
3. Select the appropriate database location.
4. Configure Firestore Security Rules for your environment.

Do not leave an application using unrestricted Firestore rules for a public or production deployment.

### Register a Web Application

ParkSmart uses the Firebase JavaScript SDK.

From the Firebase project settings:

1. Go to **Project Settings**.
2. Open **Your apps**.
3. Register a Web application.
4. Copy the Firebase configuration values.

These values will be added to the local environment configuration in the next step.

---

## 4. Configure Environment Variables

Copy the example environment file:

```bash
cp .env.example .env
```

If the `cp` command is unavailable in your shell, create a `.env` file manually using `.env.example` as the template.

Configure the following values:

```env
EXPO_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id

EXPO_PUBLIC_RAZORPAY_KEY_ID=rzp_test_your_key
```

The environment values are loaded by the Expo application configuration.

### Security

Do not commit any of the following files:

```text
.env
scripts/serviceAccountKey.json
src/config/secrets.js
```

These files are excluded from Git through `.gitignore`.

Never place a Razorpay Key Secret or Firebase Admin private key inside the mobile application.

---

## 5. Configure Razorpay

Create or sign in to a Razorpay account and use test mode while developing ParkSmart.

Generate a test Key ID and add it to `.env`:

```env
EXPO_PUBLIC_RAZORPAY_KEY_ID=rzp_test_your_key
```

ParkSmart uses `react-native-razorpay` for the Android payment checkout flow.

The Razorpay integration contains native code and therefore requires an Expo Development Build.

---

## 6. Firestore Structure

ParkSmart uses the following main Firestore collections:

```text
users
admins
complexes
slots
bookings
reports
```

### `users`

Stores driver account and vehicle information.

Example structure:

```json
{
  "uid": "user_123",
  "email": "user@example.com",
  "name": "John Doe",
  "vehicleType": "car",
  "vehicleReg": "KA01AB1234"
}
```

### `admins`

Stores administrator information and associates facility administrators with parking complexes.

Example structure:

```json
{
  "uid": "admin_123",
  "email": "admin@example.com",
  "role": "admin",
  "complexId": "complex_001"
}
```

### `complexes`

Stores parking complex information and availability data.

Example structure:

```json
{
  "name": "Example Parking Complex",
  "latitude": 12.9716,
  "longitude": 77.5946,
  "totalFloors": 5,
  "availableCount": 120,
  "occupiedCount": 80
}
```

Additional floor-level capacity and availability fields may be stored on complex documents for efficient dashboard and map queries.

### `slots`

Stores individual parking slots.

Example structure:

```json
{
  "complexId": "complex_001",
  "floor": 3,
  "spotId": "C3-05",
  "vehicleType": "car",
  "status": "available"
}
```

Slot states can include values such as:

```text
available
occupied
maintenance
```

### `bookings`

Stores active and historical parking bookings.

Booking documents contain parking, user, payment, timing, and booking lifecycle information.

Example fields may include:

```json
{
  "userId": "user_123",
  "complexId": "complex_001",
  "spotId": "C3-05",
  "vehicleType": "car",
  "hours": 2,
  "totalPrice": 100,
  "status": "active"
}
```

### `reports`

Stores parking-related reports and support tickets submitted through the application.

The exact report fields depend on the report or support workflow used by the application.

---

## 7. Build the Android Development Client

ParkSmart cannot use the standard Expo Go client for its complete Android functionality because the application uses the native Razorpay SDK.

Build a development client using EAS:

```bash
npx eas-cli build --profile development --platform android
```

If required, sign in to your Expo account:

```bash
npx eas-cli login
```

After the build completes, install the generated development build on your Android device.

---

## 8. Start ParkSmart

Start the Expo development server in development-client mode:

```bash
npx expo start --dev-client
```

Open the installed ParkSmart development build on your Android device and connect it to the Metro development server.

---

## 9. Web Development

The web version can be started using:

```bash
npm run web
```

ParkSmart uses a platform-specific map implementation for web through Leaflet and OpenStreetMap.

Some native Android features, including the Razorpay native checkout flow, may not be available in the web version.

---

## 10. Running the IoT Simulator

ParkSmart includes a Node.js simulator that imitates physical parking sensors.

The simulator uses the Firebase Admin SDK and requires a Firebase service-account credential.

### Create a Service Account Key

1. Open the Firebase Console.
2. Go to **Project Settings**.
3. Open **Service Accounts**.
4. Generate a new private key.
5. Save the downloaded credential as:

```text
scripts/serviceAccountKey.json
```

The file is excluded from Git through `.gitignore`.

Never commit a Firebase service-account key to a public repository.

### Start the Simulator

Open a separate terminal and run:

```bash
node scripts/iot_simulator.js
```

The simulator updates parking slot occupancy in Firestore to imitate data received from physical parking sensors.

---

## 11. Additional Simulation and Database Scripts

The `scripts` directory contains utilities used to configure and test the ParkSmart environment.

### Seed an Administrator

```bash
npm run seed-admin
```

This uses the administrator seeding workflow defined by the project.

### Synchronize Parking Complex Data

```bash
node scripts/sync_complexes.js
```

This synchronizes aggregate parking availability and capacity information with the slot data stored in Firestore.

### Simulate Bulk Occupancy

```bash
node scripts/bulk_occupy.js
```

This can be used to populate parking occupancy for testing.

### Simulate Targeted Occupancy

```bash
node scripts/target_occupy.js
```

This script can target selected complexes or floors to simulate parking activity under specific test conditions.

These scripts use administrative Firebase access. Review the script configuration before running them against a Firebase project.

---

## 12. Testing the Application

After starting ParkSmart, the basic application flow can be tested as follows:

1. Create a user account using email and password.
2. Configure the user's vehicle information.
3. View available parking complexes.
4. Open a parking complex and select a floor.
5. View the current parking slot grid.
6. Select a slot or use the smart slot recommendation.
7. Complete the booking and payment flow.
8. View the generated digital parking ticket.
9. Check the booking history.
10. Submit a parking issue or support ticket.
11. Sign in with an administrator account to test the administration interface.

---

## 13. Troubleshooting

### Firebase Module Not Found

If Firebase is not installed correctly, run:

```bash
npm install
```

If the problem continues, verify that Firebase is listed in `package.json`.

### Metro Bundler Cache Problems

Clear the Expo development cache:

```bash
npx expo start --clear
```

For a development client:

```bash
npx expo start --dev-client --clear
```

### Map Does Not Load

ParkSmart uses Leaflet and OpenStreetMap for its map interface.

Check that:

- The device has an active internet connection.
- OpenStreetMap tiles are reachable.
- The WebView is loading correctly.

### Login Fails

Check the following:

1. The Firebase environment variables in `.env` are correct.
2. Email/Password authentication is enabled in Firebase.
3. The device has an active internet connection.
4. The Firebase project ID matches the configured application.

### Razorpay Checkout Does Not Open

Check that:

1. `EXPO_PUBLIC_RAZORPAY_KEY_ID` contains a valid Razorpay test Key ID.
2. The app is running through an Expo Development Build.
3. The native application was rebuilt after native dependency changes.
4. The Android device has an active internet connection.

### IoT Simulator Cannot Authenticate

Check that:

1. `scripts/serviceAccountKey.json` exists locally.
2. The service-account key belongs to the configured Firebase project.
3. The Firebase Admin SDK dependencies are installed.
4. The service-account credential has not been revoked.

---

## 14. Production Build

To create a production Android build using the configured EAS profile:

```bash
npx eas-cli build -p android --profile production
```

The generated Android artifact depends on the Android configuration defined in `eas.json`.

Before a public deployment, review:

- Firestore Security Rules
- Firebase authentication and administrator permissions
- Payment verification architecture
- Environment configuration
- Application signing
- Privacy and data handling requirements

---

## Resources

- React Native Documentation
- Expo Documentation
- Firebase Documentation
- Razorpay Documentation
- React Navigation Documentation