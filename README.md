# ParkSmart - Real-Time Parking Discovery & Management

ParkSmart is a smart parking management application built with React Native and Expo. The idea behind the project is simple: make it easier for drivers to find and book available parking spaces while also giving parking facility administrators the tools they need to manage their complexes.

The app has separate interfaces for drivers and administrators and supports multi-floor parking complexes, live slot availability, slot recommendations, bookings, Razorpay payments, QR-based parking tickets, and simulated IoT sensor updates.

---

## Key Features

### For Drivers

- **Interactive Parking Map**  
  Parking complexes are displayed on an interactive map built using Leaflet and OpenStreetMap inside a WebView. This avoids relying on paid map APIs for the core map experience.

- **Dynamic Slot Grids**  
  Each floor of a parking complex has a visual slot grid that reflects the current availability and occupancy of parking spaces.

- **Razorpay Payments**  
  The native Razorpay SDK is integrated into the booking flow, allowing users to complete parking payments directly from the app.

- **Smart Slot Recommendations**  
  ParkSmart includes a heuristic recommendation engine in `aiService.js` that scores parking slots using factors such as:
  - Distance from the entrance or exit
  - Previous booking behaviour
  - Vehicle type compatibility
  - Penalties for inappropriate use of handicap parking slots

- **Issue Reporting**  
  Users can report parking-related issues such as hazards or illegal parking. Reports are stored in Firestore for administrator review.

- **Digital Parking Tickets**  
  After a booking is completed, the app generates a QR-based digital ticket that can be used for parking entry and exit validation.

### For Administrators

- **Parking Analytics**  
  Administrators can view active bookings, revenue information, and parking slot utilization. The required data is aggregated using targeted Firestore queries.

- **SuperAdmin Dashboard**  
  A separate SuperAdmin interface provides an overview of parking complexes, occupancy, and general system activity.

- **Parking Complex Management**  
  Administrators can create multi-floor parking complexes and configure the number of slots available on each floor. ParkSmart automatically generates uniquely identified parking slots such as `C3-05`.

- **Manual Slot Management**  
  Facility administrators can manually update parking slot states when required. For example, a slot can be marked as unavailable or under maintenance, and the updated state is reflected in the application.

### IoT Simulation and Offline Support

- **IoT Parking Sensor Simulation**  
  The project includes a Node.js simulator located at `scripts/iot_simulator.js`. It uses the Firebase Admin SDK to simulate physical parking sensors and update slot occupancy in Firestore.

- **Occupancy Simulation Scripts**  
  Scripts such as `bulk_occupy.js` and `target_occupy.js` can populate or randomize occupancy for selected parking complexes and floors. These were mainly used to test the application under more realistic parking conditions.

- **Offline Digital Tickets**  
  Active parking tickets are cached using `AsyncStorage`. This allows users to access their booking QR code even in areas with poor or no network connectivity, such as basement parking facilities.

---

## Tech Stack

- **Frontend:** React Native and Expo
- **Navigation:** React Navigation v6 with Bottom Tabs and Native Stacks
- **Database:** Firebase Firestore
- **Authentication:** Firebase Authentication with Firestore-based role management
- **Payments:** Razorpay using `react-native-razorpay`
- **Maps:** Leaflet and OpenStreetMap through `react-native-webview`
- **Local Storage:** AsyncStorage
- **Backend Utilities:** Node.js and Firebase Admin SDK
- **Build System:** Expo Application Services (EAS)

### Firestore Read Optimization

During development, some continuous `onSnapshot` listeners were replaced with targeted `getDocs` queries where constant real-time synchronization was not required.

This helped reduce unnecessary Firestore reads while still allowing the application to fetch current parking and booking information when needed.

---

## Database Architecture

ParkSmart uses a denormalized Firestore structure to keep parking data easy to query from the mobile application.

The main collections are:

- **`users`**  
  Stores driver profiles, vehicle information, and user-related preferences.

- **`admins`**  
  Stores parking administrator information and maps facility managers to their assigned `complexId`.

- **`complexes`**  
  Stores parking complex information, GPS coordinates, capacity, and availability data.

- **`slots`**  
  Stores individual parking slot information including slot status, vehicle type, floor, and spatial information.

  A slot can have states such as `available`, `occupied`, or `maintenance`.

- **`bookings`**  
  Stores active and historical booking information including parking, payment, and booking lifecycle data.

---

## Setup and Installation

ParkSmart uses the native Razorpay SDK and other native dependencies. Because of this, the complete application requires an Expo Development Build instead of the standard Expo Go client.

### 1. Prerequisites

Make sure the following are installed or available:

- Node.js
- npm
- Expo tooling
- An Android physical device or emulator
- An Expo Application Services (EAS) account

### 2. Clone and Install the Project

Clone the repository and install the required dependencies:

```bash
git clone <repository-url>
cd ParkSmart
npm install
```

### 3. Configure Environment Variables

Copy the example environment file:

```bash
cp .env.example .env
```

Add your Firebase and Razorpay configuration to `.env`:

```env
EXPO_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id

EXPO_PUBLIC_RAZORPAY_KEY_ID=rzp_test_your_key
```

> **Security Note:** Do not commit `.env`, Firebase Admin service-account credentials, or private payment gateway secrets to Git.

### 4. Build the Development Client

Since Razorpay requires native linking, build a custom development client using EAS:

```bash
npx eas-cli build --profile development --platform android
```

Once the build is complete, install the generated development build on your Android device.

### 5. Start the Development Server

After installing the development client, start Metro using:

```bash
npx expo start --dev-client
```

Open the ParkSmart development build on your device and connect it to the running development server.

### 6. Create a Production Build

To generate a production Android build:

```bash
npx eas-cli build -p android --profile production
```

The generated Android artifact depends on the Android configuration defined in the selected EAS build profile.

---

## Running the IoT Simulator

ParkSmart includes a simulator that can be used to demonstrate how physical parking sensors could update the application.

### Setup

1. Open the Firebase Console.
2. Go to **Project Settings > Service Accounts**.
3. Generate a Firebase Admin service-account key.
4. Save the downloaded file as:

```text
scripts/serviceAccountKey.json
```

The service-account file is excluded from Git through `.gitignore` and should never be committed to the repository.

### Run the Simulator

Open a separate terminal and run:

```bash
node scripts/iot_simulator.js
```

The simulator updates parking slot occupancy in Firestore to imitate data coming from physical parking sensors. These changes can then be viewed through the ParkSmart application.

---

## About the Project

ParkSmart was built as a practical approach to parking discovery and management in Bengaluru. The project focuses on combining a simple driver booking experience with tools for managing multi-floor parking facilities.

The IoT simulator was added to test how the same application architecture could work with physical parking sensors in a real parking facility.

---

**Built to make parking in Bengaluru a little less painful.**