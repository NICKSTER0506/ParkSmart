const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Helper to get a random integer between min and max (inclusive)
function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || path.join(__dirname, 'serviceAccountKey.json');

if (!fs.existsSync(serviceAccountPath)) {
  console.error('\n❌ ERROR: Missing Firebase Service Account file.');
  console.error('To fix this easily:');
  console.error('1. Go to Firebase Console -> Project Settings -> Service Accounts');
  console.error('2. Click "Generate new private key"');
  console.error('3. Save the downloaded file as "serviceAccountKey.json" inside the "scripts/" folder.');
  console.error('4. Run this script again.');
  process.exit(1);
}

const serviceAccount = require(serviceAccountPath);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function runSimulator() {
  console.log('🔌 Starting ParkSmart IoT Sensor Simulator via Admin SDK...');
  
  try {
    let slots = [];
    const cachePath = path.join(__dirname, 'slots_cache.json');

    if (fs.existsSync(cachePath)) {
      console.log('📦 Found local cache! Loading slots from memory (0 Firebase reads).');
      const cacheData = fs.readFileSync(cachePath, 'utf8');
      slots = JSON.parse(cacheData);
    } else {
      console.log('🌐 No local cache found. Fetching slots data from Firestore (Warning: ~1200 reads)...');
      const slotsSnap = await db.collection('slots').get();
      slots = slotsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Save to cache for next time
      fs.writeFileSync(cachePath, JSON.stringify(slots, null, 2));
      console.log('✅ Slots cached locally to scripts/slots_cache.json for future use!');
    }
    
    // Filter out maintenance slots since sensors shouldn't toggle them
    slots = slots.filter(s => s.status !== 'maintenance');
    
    if (slots.length === 0) {
      console.log('❌ No valid slots found. Please seed the database first.');
      process.exit(1);
    }
    
    console.log(`✅ Loaded ${slots.length} sensor-equipped parking slots across all complexes.`);
    console.log('📡 Simulation active. Toggling 1 random slot every 15-20 seconds...\n');

    // Simulation loop
    const simulateTick = async () => {
      try {
        // Pick a random slot
        const randomIdx = getRandomInt(0, slots.length - 1);
        const targetSlot = slots[randomIdx];
        
        // Determine the new status
        // We assume hardware sensors only detect physical presence (occupied vs available)
        const newStatus = targetSlot.status === 'available' ? 'occupied' : 'available';
        
        // Prepare batch write
        const batch = db.batch();
        
        // 1. Update the slot document
        const slotRef = db.collection('slots').doc(targetSlot.id);
        batch.update(slotRef, { status: newStatus });
        
        // 2. Update the parent complex counts atomically using increment
        const complexRef = db.collection('complexes').doc(targetSlot.complexId);
        if (newStatus === 'occupied') {
          batch.update(complexRef, {
            occupiedCount: admin.firestore.FieldValue.increment(1),
            availableCount: admin.firestore.FieldValue.increment(-1)
          });
        } else {
          batch.update(complexRef, {
            occupiedCount: admin.firestore.FieldValue.increment(-1),
            availableCount: admin.firestore.FieldValue.increment(1)
          });
        }
        
        // Commit the batch
        await batch.commit();
        
        // Update local state to reflect the change
        slots[randomIdx].status = newStatus;
        
        const timestamp = new Date().toLocaleTimeString();
        console.log(`[${timestamp}] 🚗 Sensor Triggered: Slot ${targetSlot.label} (${targetSlot.complexId}) changed to -> ${newStatus.toUpperCase()}`);
        
      } catch (err) {
        console.error('❌ Error during simulation tick:', err);
      } finally {
        // Schedule the next tick randomly between 15 and 20 seconds
        const nextDelay = getRandomInt(15000, 20000);
        setTimeout(simulateTick, nextDelay);
      }
    };

    // Start the first tick immediately
    simulateTick();

  } catch (error) {
    if (error.code === '7' || error.message.includes('permission-denied') || error.message.includes('Missing or insufficient permissions')) {
      console.error('\n❌ FIREBASE PERMISSION ERROR: Your simulator is locked out of the database.');
      console.error('To fix this:');
      console.error('1. Go to Firebase Console -> Firestore Database -> Rules tab.');
      console.error('2. Change the rules to: allow read, write: if true;');
      console.error('3. Publish the rules and run this script again.\n');
    } else {
      console.error('❌ Failed to initialize simulator:', error);
    }
    process.exit(1);
  }
}

// Handle termination gracefully
process.on('SIGINT', () => {
  console.log('\n🛑 Stopping IoT Simulator gracefully...');
  process.exit(0);
});

runSimulator();
