// src/utils/seedData.js
import { db } from '../config/firebase';
import { collection, writeBatch, doc, getDocs, setDoc } from 'firebase/firestore';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { firebaseConfig } from '../config/firebase';

// Initialize secondary app to create users without logging out
let secondaryApp;
if (!getApps().some(app => app.name === 'SecondarySeedApp')) {
  secondaryApp = initializeApp(firebaseConfig, 'SecondarySeedApp');
} else {
  secondaryApp = getApp('SecondarySeedApp');
}
const secondaryAuth = getAuth(secondaryApp);

const COMPLEXES = [
  { id: 'kempegowda', name: 'Kempe Gowda Maharaja Parking Complex', location: 'Majestic, Bengaluru', lat: 12.9738846, lng: 77.5783034 },
  { id: 'basavaraju', name: 'Basavaraju', location: 'Rajajinagar, Bengaluru', lat: 12.9716862, lng: 77.5549447 },
  { id: 'amw', name: 'AMW Bike Race', location: 'Indiranagar, Bengaluru', lat: 12.9656088, lng: 77.5527586 },
  { id: 'maharaja_paid', name: 'Maharaja paid parking', location: 'Majestic, Bengaluru', lat: 12.9740567, lng: 77.5783109 },
  { id: 'karnataka_metal', name: 'Karnataka Metal Parking', location: 'Rajajinagar, Bengaluru', lat: 12.9591022, lng: 77.5562789 },
  { id: 'car_bike', name: 'Majestic Car Park', location: 'Majestic, Bengaluru', lat: 12.973252, lng: 77.57803 }
];

async function clearCollection(collectionName) {
  const snapshot = await getDocs(collection(db, collectionName));
  const batches = [];
  let currentBatch = writeBatch(db);
  let count = 0;

  snapshot.docs.forEach((docSnap) => {
    currentBatch.delete(docSnap.ref);
    count++;
    if (count === 450) {
      batches.push(currentBatch.commit());
      currentBatch = writeBatch(db);
      count = 0;
    }
  });
  if (count > 0) batches.push(currentBatch.commit());
  await Promise.all(batches);
}

export async function seedDatabase() {
  console.log('Starting seed process. Wiping old data...');
  try {
    await clearCollection('slots');
    await clearCollection('bookings');
    await clearCollection('complexes');
    await clearCollection('admins');

    console.log('Generating new multi-floor hierarchy...');
    const slotBatches = [];
    let currentSlotBatch = writeBatch(db);
    let slotBatchCount = 0;
    
    const activeSlotsList = []; // Track active/reserved slots to generate accurate bookings

    for (const complex of COMPLEXES) {
      // 1. Create Auth User for the complex admin
      const adminEmail = `${complex.id}@parksmart.com`;
      let adminUid = null;
      try {
        const cred = await createUserWithEmailAndPassword(secondaryAuth, adminEmail, '123456');
        adminUid = cred.user.uid;
        console.log(`Created auth account for ${adminEmail}`);
      } catch (e) {
        if (e.code === 'auth/email-already-in-use') {
          console.log(`Account ${adminEmail} already exists, fetching UID...`);
          try {
            const loginCred = await signInWithEmailAndPassword(secondaryAuth, adminEmail, '123456');
            adminUid = loginCred.user.uid;
          } catch (loginErr) {
            console.error(`Failed to login existing account ${adminEmail}:`, loginErr);
          }
        } else {
          console.error(`Failed to create account ${adminEmail}:`, e);
        }
      }

      if (adminUid) {
        currentSlotBatch.set(doc(db, 'admins', adminUid), {
          email: adminEmail,
          role: 'complex_admin',
          complexId: complex.id,
          createdAt: new Date()
        });
      }

      let availableCount = 0;
      let bikeAvailable = 0;
      let carAvailable = 0;
      let occupiedCount = 0;
      let reservedCount = 0;
      let maintenanceCount = 0;

      // Floor 1: Bikes
      for (let i = 1; i <= 80; i++) {
        const slotRef = doc(collection(db, 'slots'));
        const statusRand = Math.random();
        let status = 'available';
        if (statusRand > 0.95) status = 'maintenance';
        else if (statusRand > 0.85) status = 'reserved';
        else if (statusRand > 0.6) status = 'occupied';

        if (status === 'available') { availableCount++; bikeAvailable++; }
        else if (status === 'occupied') occupiedCount++;
        else if (status === 'reserved') reservedCount++;
        else maintenanceCount++;

        const labelNum = i < 10 ? `00${i}` : i < 100 ? `0${i}` : `${i}`;
        const label = `B${labelNum}`;
        
        if (status === 'occupied' || status === 'reserved') {
          activeSlotsList.push({ complexId: complex.id, complexName: complex.name, label, vehicleType: 'bike', status });
        }
        const slotData = {
          slotId: slotRef.id,
          label: `B${labelNum}`,
          floor: 1,
          complexId: complex.id,
          complexName: complex.name,
          vehicleType: 'bike',
          isHandicap: false,
          status,
          updatedAt: new Date()
        };

        currentSlotBatch.set(slotRef, slotData);
        slotBatchCount++;
        if (slotBatchCount === 450) {
          slotBatches.push(currentSlotBatch.commit());
          currentSlotBatch = writeBatch(db);
          slotBatchCount = 0;
        }
      }

      // Floors 2-5: Cars
      for (let floor = 2; floor <= 5; floor++) {
        // Pick 3 random handicap slots for this floor
        const handicapIndices = [];
        while (handicapIndices.length < 3) {
          const randIdx = Math.floor(Math.random() * 40) + 1;
          if (!handicapIndices.includes(randIdx)) handicapIndices.push(randIdx);
        }

        for (let i = 1; i <= 40; i++) {
          const slotRef = doc(collection(db, 'slots'));
          const statusRand = Math.random();
          let status = 'available';
          if (statusRand > 0.95) status = 'maintenance';
          else if (statusRand > 0.85) status = 'reserved';
          else if (statusRand > 0.6) status = 'occupied';

          if (status === 'available') { availableCount++; carAvailable++; }
          else if (status === 'occupied') occupiedCount++;
          else if (status === 'reserved') reservedCount++;
          else maintenanceCount++;

          const isHandicap = handicapIndices.includes(i);
          const labelNum = i < 10 ? `0${i}` : `${i}`;
          const label = `C${floor}-${labelNum}`;
          
          if (status === 'occupied' || status === 'reserved') {
            activeSlotsList.push({ complexId: complex.id, complexName: complex.name, label, vehicleType: isHandicap ? 'handicap' : 'car', status });
          }
          
          const slotData = {
            slotId: slotRef.id,
            label: `C${floor}-${labelNum}`,
            floor: floor,
            complexId: complex.id,
            complexName: complex.name,
            vehicleType: isHandicap ? 'handicap' : 'car',
            isHandicap,
            status,
            updatedAt: new Date()
          };

          currentSlotBatch.set(slotRef, slotData);
          slotBatchCount++;
          if (slotBatchCount === 450) {
            slotBatches.push(currentSlotBatch.commit());
            currentSlotBatch = writeBatch(db);
            slotBatchCount = 0;
          }
        }
      }

      // Create Complex aggregation doc
      const complexRef = doc(db, 'complexes', complex.id);
      currentSlotBatch.set(complexRef, {
        ...complex,
        totalSlots: 240,
        availableCount,
        bikeAvailable,
        carAvailable,
        occupiedCount,
        reservedCount,
        maintenanceCount,
        updatedAt: new Date()
      });
      slotBatchCount++;
      if (slotBatchCount === 450) {
        slotBatches.push(currentSlotBatch.commit());
        currentSlotBatch = writeBatch(db);
        slotBatchCount = 0;
      }
    }

    if (slotBatchCount > 0) slotBatches.push(currentSlotBatch.commit());
    await Promise.all(slotBatches);

    console.log('Generating dummy bookings for analytics...');
    const bookingBatches = [];
    let currentBookingBatch = writeBatch(db);
    let bookingBatchCount = 0;

    const now = new Date();
    
    // Helper to add a booking to batch
    const addBooking = (bookingData) => {
      const bookingRef = doc(collection(db, 'bookings'));
      currentBookingBatch.set(bookingRef, bookingData);
      bookingBatchCount++;
      if (bookingBatchCount === 450) {
        bookingBatches.push(currentBookingBatch.commit());
        currentBookingBatch = writeBatch(db);
        bookingBatchCount = 0;
      }
    };
    
    // 1. Generate an ACTIVE booking for every occupied/reserved slot
    for (const slotInfo of activeSlotsList) {
      const hours = Math.floor(Math.random() * 6) + 1; // 1 to 6 hours
      const price = hours * 50; // Flat 50/hr logic
      
      const hoursAgo = Math.random() * hours; 
      const createdAt = new Date(now.getTime() - hoursAgo * 60 * 60 * 1000);

      addBooking({
        userId: 'user_' + Math.floor(Math.random() * 10000),
        complexId: slotInfo.complexId,
        lodgeName: slotInfo.complexName,
        spotId: slotInfo.label,
        status: 'active', // Or reserved, but mapping them to active for simplicity
        createdAt,
        updatedAt: createdAt,
        hours,
        totalPrice: price,
        vehicleType: slotInfo.vehicleType,
        vehicleReg: 'KA01' + String.fromCharCode(65 + Math.floor(Math.random() * 26)) + Math.floor(1000 + Math.random() * 9000)
      });
    }

    // 2. Generate 100 COMPLETED bookings in the past 7 days
    for (let i = 0; i < 100; i++) {
      const complex = COMPLEXES[Math.floor(Math.random() * COMPLEXES.length)];
      
      const isCar = Math.random() > 0.3;
      const s = Math.floor(Math.random() * (isCar ? 40 : 80)) + 1;
      const f = isCar ? Math.floor(Math.random() * 4) + 2 : 1;
      const labelNum = s < 10 ? (isCar ? `0${s}` : `00${s}`) : (isCar ? `${s}` : s < 100 ? `0${s}` : `${s}`);
      const label = isCar ? `C${f}-${labelNum}` : `B${labelNum}`;

      const daysAgo = Math.random() * 7;
      const createdAt = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
      
      const hours = Math.floor(Math.random() * 6) + 1;
      const price = hours * 50;

      addBooking({
        userId: 'user_' + Math.floor(Math.random() * 10000),
        complexId: complex.id,
        lodgeName: complex.name,
        spotId: label,
        status: 'completed',
        createdAt,
        updatedAt: new Date(createdAt.getTime() + hours * 60 * 60 * 1000),
        hours,
        totalPrice: price,
        vehicleType: isCar ? 'car' : 'bike',
        vehicleReg: 'KA01' + String.fromCharCode(65 + Math.floor(Math.random() * 26)) + Math.floor(1000 + Math.random() * 9000)
      });
    }

    if (bookingBatchCount > 0) bookingBatches.push(currentBookingBatch.commit());
    await Promise.all(bookingBatches);

    console.log('Database seeded successfully with 1,200 slots!');
    return true;
  } catch (error) {
    console.error('Error seeding database:', error);
    return false;
  }
}
