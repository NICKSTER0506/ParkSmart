const admin = require('firebase-admin');
const path = require('path');

const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');
const serviceAccount = require(serviceAccountPath);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

async function syncComplexes() {
  console.log('Syncing all complex stats with actual slots...');
  try {
    const slotsSnap = await db.collection('slots').get();
    const slots = slotsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    const complexesSnap = await db.collection('complexes').get();
    const complexes = complexesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    const batch = db.batch();

    for (const complex of complexes) {
      const complexSlots = slots.filter(s => s.complexId === complex.id);
      
      let availableCount = 0;
      let occupiedCount = 0;
      let reservedCount = 0;
      let maintenanceCount = 0;
      
      const floorAvailable = {};
      const floorTotal = {};
      let maxFloor = 0;

      for (const slot of complexSlots) {
        if (slot.floor > maxFloor) maxFloor = slot.floor;
        
        floorTotal[slot.floor] = (floorTotal[slot.floor] || 0) + 1;
        
        if (slot.status === 'available') {
            availableCount++;
            floorAvailable[slot.floor] = (floorAvailable[slot.floor] || 0) + 1;
        }
        else if (slot.status === 'occupied') occupiedCount++;
        else if (slot.status === 'reserved') reservedCount++;
        else if (slot.status === 'maintenance') maintenanceCount++;
      }

      const updates = {
        availableCount,
        occupiedCount,
        reservedCount,
        maintenanceCount,
        totalFloors: maxFloor
      };

      for (let f = 1; f <= maxFloor; f++) {
          updates[`floor${f}Available`] = floorAvailable[f] || 0;
          updates[`floor${f}Total`] = floorTotal[f] || 0;
      }

      batch.update(db.collection('complexes').doc(complex.id), updates);
    }

    await batch.commit();
    console.log('Successfully synced all complexes!');
    
  } catch (err) {
    console.error('Error:', err);
  }
  process.exit(0);
}

syncComplexes();
