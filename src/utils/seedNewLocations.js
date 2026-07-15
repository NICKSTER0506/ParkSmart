import { db } from '../config/firebase';
import { collection, writeBatch, doc } from 'firebase/firestore';

const NEW_COMPLEXES = [
  { id: 'real_kempegowda', name: 'Kempe Gowda Maharaja Parking Complex', location: 'Majestic, Bengaluru', lat: 12.9738846, lng: 77.5783034 },
  { id: 'real_basavaraju', name: 'Basavaraju', location: 'Rajajinagar, Bengaluru', lat: 12.9716862, lng: 77.5549447 },
  { id: 'real_amw', name: 'AMW Bike Race', location: 'Indiranagar, Bengaluru', lat: 12.9656088, lng: 77.5527586 },
  { id: 'real_maharaja_paid', name: 'Maharaja paid parking', location: 'Majestic, Bengaluru', lat: 12.9740567, lng: 77.5783109 },
  { id: 'real_karnataka_metal', name: 'Parking For Customers @ The Karnataka Metal Industry', location: 'Rajajinagar, Bengaluru', lat: 12.9591022, lng: 77.5562789 },
  { id: 'real_car_bike', name: 'Car and Bike Parking', location: 'Majestic, Bengaluru', lat: 12.973252, lng: 77.57803 }
];

export async function appendNewLocations() {
  console.log('Appending new locations...');
  try {
    const slotBatches = [];
    let currentSlotBatch = writeBatch(db);
    let slotBatchCount = 0;

    for (const complex of NEW_COMPLEXES) {
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

    console.log('Appended successfully!');
    return true;
  } catch (error) {
    console.error('Error appending new locations:', error);
    return false;
  }
}
