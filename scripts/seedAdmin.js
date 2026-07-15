const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || path.join(__dirname, 'serviceAccountKey.json');

if (!fs.existsSync(serviceAccountPath)) {
  console.error('Missing Firebase service account file.');
  console.error('Set GOOGLE_APPLICATION_CREDENTIALS to your service account JSON path, or place serviceAccountKey.json inside scripts/.');
  console.error(`Expected path: ${serviceAccountPath}`);
  process.exit(1);
}

const serviceAccount = require(serviceAccountPath);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const auth = admin.auth();
const db = admin.firestore();

const DEFAULT_ADMIN = {
  email: 'admin@parksmart.com',
  password: 'admin123',
  displayName: 'ParkSmart Admin',
};

async function ensureAdminUser() {
  try {
    let user;
    try {
      user = await auth.getUserByEmail(DEFAULT_ADMIN.email);
      console.log(`Admin auth user already exists: ${user.uid}`);
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        user = await auth.createUser({
          email: DEFAULT_ADMIN.email,
          password: DEFAULT_ADMIN.password,
          displayName: DEFAULT_ADMIN.displayName,
          emailVerified: true,
        });
        console.log(`Created admin auth user: ${user.uid}`);
      } else {
        throw error;
      }
    }

    const adminDocRef = db.collection('admins').doc(user.uid);
    await adminDocRef.set(
      {
        uid: user.uid,
        email: DEFAULT_ADMIN.email.toLowerCase(),
        role: 'admin',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    console.log('Admin document created or updated in Firestore admins collection.');
    console.log('Admin login details:');
    console.log(`  Email: ${DEFAULT_ADMIN.email}`);
    console.log(`  Password: ${DEFAULT_ADMIN.password}`);
  } catch (error) {
    console.error('Failed to seed admin account:', error);
    process.exit(1);
  }
}

ensureAdminUser();
