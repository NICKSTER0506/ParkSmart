const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');
const serviceAccount = require(serviceAccountPath);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function runBulkOccupy() {
  console.log('Starting bulk occupancy...');
  try {
    const slotsSnap = await db.collection('slots').get();
    let slots = slotsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    slots = slots.filter(s => s.status !== 'maintenance');
    
    let occupiedCount = 0;
    const batch = db.batch();
    const complexUpdates = {};
    
    for (const slot of slots) {
      if (Math.random() < 0.45) { // 45% chance to occupy
        const newStatus = 'occupied';
        const isChanging = slot.status === 'available';
        
        batch.update(db.collection('slots').doc(slot.id), { status: newStatus });
        
        if (isChanging) {
            if (!complexUpdates[slot.complexId]) {
                complexUpdates[slot.complexId] = { occupiedCount: 0, availableCount: 0 };
            }
            complexUpdates[slot.complexId].occupiedCount++;
            complexUpdates[slot.complexId].availableCount--;
            occupiedCount++;
        }
      }
    }
    
    for (const [complexId, counts] of Object.entries(complexUpdates)) {
        batch.update(db.collection('complexes').doc(complexId), {
            occupiedCount: admin.firestore.FieldValue.increment(counts.occupiedCount),
            availableCount: admin.firestore.FieldValue.increment(counts.availableCount)
        });
    }

    await batch.commit();
    console.log(`Successfully occupied ${occupiedCount} slots randomly!`);
    
    // Invalidate the cache for iot_simulator so it picks up new slots next time
    const cachePath = path.join(__dirname, 'slots_cache.json');
    if (fs.existsSync(cachePath)) {
        fs.unlinkSync(cachePath);
        console.log('Deleted old slots cache.');
    }
    
  } catch (err) {
    console.error('Error:', err);
  }
  process.exit(0);
}

runBulkOccupy();
