const { initializeApp } = require('firebase/app');
const { getFirestore, collection, writeBatch, doc, getDocs } = require('firebase/firestore');

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const COMPLEXES = [
  { id: 'real_kempegowda', name: 'Kempe Gowda Maharaja Parking Complex', location: 'Majestic, Bengaluru', lat: 12.9738846, lng: 77.5783034 },
  { id: 'real_basavaraju', name: 'Basavaraju', location: 'Rajajinagar, Bengaluru', lat: 12.9716862, lng: 77.5549447 },
  { id: 'real_amw', name: 'AMW Bike Race', location: 'Indiranagar, Bengaluru', lat: 12.9656088, lng: 77.5527586 },
  { id: 'real_karnataka_metal', name: 'Karnataka Metal Parking', location: 'Rajajinagar, Bengaluru', lat: 12.9591022, lng: 77.5562789 },
  { id: 'real_car_bike', name: 'Majestic Car Park', location: 'Majestic, Bengaluru', lat: 12.973252, lng: 77.57803 }
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

async function seedDatabase() {
  console.log('Starting seed process. Wiping old data...');
  try {
    await clearCollection('slots');
    await clearCollection('bookings');
    await clearCollection('complexes');

    console.log('Generating new multi-floor hierarchy...');
    const slotBatches = [];
    let currentSlotBatch = writeBatch(db);
    let slotBatchCount = 0;

    for (const complex of COMPLEXES) {
      let availableCount = 0;
      let bikeAvailable = 0;
      let carAvailable = 0;
      let occupiedCount = 0;
      let reservedCount = 0;
      let maintenanceCount = 0;
      let floor1Available = 0;
      let floor2Available = 0;
      let floor3Available = 0;
      let floor4Available = 0;
      let floor5Available = 0;

      for (let i = 1; i <= 80; i++) {
        const slotRef = doc(collection(db, 'slots'));
        const statusRand = Math.random();
        let status = 'available';
        if (statusRand > 0.95) status = 'maintenance';
        else if (statusRand > 0.85) status = 'reserved';
        else if (statusRand > 0.6) status = 'occupied';

        if (status === 'available') { availableCount++; bikeAvailable++; floor1Available++; }
        else if (status === 'occupied') occupiedCount++;
        else if (status === 'reserved') reservedCount++;
        else maintenanceCount++;

        const labelNum = i < 10 ? `00${i}` : i < 100 ? `0${i}` : `${i}`;
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

      for (let floor = 2; floor <= 5; floor++) {
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

          if (status === 'available') { 
            availableCount++; 
            carAvailable++; 
            if (floor === 2) floor2Available++;
            else if (floor === 3) floor3Available++;
            else if (floor === 4) floor4Available++;
            else if (floor === 5) floor5Available++;
          }
          else if (status === 'occupied') occupiedCount++;
          else if (status === 'reserved') reservedCount++;
          else maintenanceCount++;

          const isHandicap = handicapIndices.includes(i);
          const labelNum = i < 10 ? `0${i}` : `${i}`;
          
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
        floor1Available,
        floor2Available,
        floor3Available,
        floor4Available,
        floor5Available,
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
    
    for (let i = 0; i < 200; i++) {
      const complex = COMPLEXES[Math.floor(Math.random() * COMPLEXES.length)];
      
      const daysAgo = Math.random() * 7;
      const createdAt = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
      
      const statusRand = Math.random();
      const status = statusRand > 0.8 ? 'active' : 'completed';
      
      const hours = Math.floor(Math.random() * 6) + 1; 
      const price = hours * (Math.random() > 0.5 ? 50 : 20);

      const isBike = Math.random() > 0.7;
      let slotLabel = '';
      if (isBike) {
         const slotNum = Math.floor(Math.random() * 80) + 1;
         slotLabel = 'B' + (slotNum < 10 ? `00${slotNum}` : slotNum < 100 ? `0${slotNum}` : `${slotNum}`);
      } else {
         const floor = Math.floor(Math.random() * 4) + 2; // 2 to 5
         const slotNum = Math.floor(Math.random() * 40) + 1;
         slotLabel = `C${floor}-` + (slotNum < 10 ? `0${slotNum}` : `${slotNum}`);
      }

      const bookingRef = doc(collection(db, 'bookings'));
      const bookingData = {
        bookingId: bookingRef.id,
        userId: 'dummy_user_' + Math.floor(Math.random() * 100),
        complexId: complex.id,
        lodgeName: complex.name,
        slotId: `${complex.id}_${slotLabel}`,
        slotLabel: slotLabel,
        status,
        createdAt,
        updatedAt: createdAt,
        startTime: createdAt,
        endTime: new Date(createdAt.getTime() + hours * 60 * 60 * 1000),
        durationMinutes: hours * 60,
        totalPrice: price,
        vehicleType: isBike ? 'bike' : 'car',
        vehicleReg: 'KA01AB' + Math.floor(1000 + Math.random() * 9000)
      };

      currentBookingBatch.set(bookingRef, bookingData);
      bookingBatchCount++;
      if (bookingBatchCount === 450) {
        bookingBatches.push(currentBookingBatch.commit());
        currentBookingBatch = writeBatch(db);
        bookingBatchCount = 0;
      }
    }

    if (bookingBatchCount > 0) bookingBatches.push(currentBookingBatch.commit());
    await Promise.all(bookingBatches);

    console.log('Database seeded successfully with 1,200 slots and 200 bookings!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

seedDatabase();
