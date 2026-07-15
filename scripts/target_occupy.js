const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');
const serviceAccount = require(serviceAccountPath);

// Prevent re-initialization if already initialized (helpful for some environments)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

async function runTargetedOccupy() {
  const targetIds = ['sk', 'bgs', 'kp'];
  console.log(`Starting targeted occupancy for complexes: ${targetIds.join(', ')}...`);
  
  try {
    const slotsSnap = await db.collection('slots').get();
    let slots = slotsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // Filter slots to only include target complexes AND specifically floors 4 and 5
    slots = slots.filter(s => 
      s.status !== 'maintenance' && 
      targetIds.some(targetId => s.complexId.includes(targetId)) &&
      (s.floor === 4 || s.floor === 5)
    );
    
    console.log(`Found ${slots.length} valid slots in the target complexes.`);
    
    if (slots.length === 0) {
      console.log('No slots found for those complexes. Exiting.');
      process.exit(0);
    }
    
    let occupiedCount = 0;
    const batch = db.batch();
    const complexUpdates = {};
    
    for (const slot of slots) {
      // 75% chance to occupy for these specific floors to make them look busy
      if (Math.random() < 0.75) { 
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
    console.log(`Successfully occupied ${occupiedCount} slots across SK, BGS, and KP!`);
    
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

runTargetedOccupy();
