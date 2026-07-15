// src/services/adminService.js
import { db, firebaseConfig } from '../config/firebase';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import {
  collection,
  getDocs,
  query,
  orderBy,
  where,
  limit,
  getCountFromServer,
  onSnapshot,
  writeBatch,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  increment
} from 'firebase/firestore';

// Initialize secondary app once at the module level
let secondaryApp;
if (!getApps().some(app => app.name === 'SecondaryApp')) {
  secondaryApp = initializeApp(firebaseConfig, 'SecondaryApp');
} else {
  secondaryApp = getApp('SecondaryApp');
}
const secondaryAuth = getAuth(secondaryApp);

const bookingsCollection = collection(db, 'bookings');
const slotsCollection = collection(db, 'slots');
const complexesCollection = collection(db, 'complexes');
const adminsCollection = collection(db, 'admins');

const getFloorFromLabel = (label) => {
  if (!label) return 1;
  if (label.startsWith('B')) return 1;
  if (label.startsWith('C')) {
    const parts = label.split('-');
    if (parts.length > 0) return parseInt(parts[0].replace('C', ''), 10) || 1;
  }
  return 1;
};

/**
 * Fetch all bookings in the system for admin auditing.
 */
export async function getAllBookings(complexId = null) {
  try {
    const filters = [orderBy('createdAt', 'desc')];
    if (complexId) {
      filters.unshift(where('complexId', '==', complexId));
    }
    const q = query(bookingsCollection, ...filters);
    const snapshot = await getDocs(q);
    return snapshot.docs.map(docSnap => ({
      id: docSnap.id,
      ...docSnap.data()
    }));
  } catch (error) {
    // Index fallback
    const fallbackQ = complexId ? query(bookingsCollection, where('complexId', '==', complexId)) : bookingsCollection;
    const snapshot = await getDocs(fallbackQ);
    return snapshot.docs
      .map(docSnap => ({ id: docSnap.id, ...docSnap.data() }))
      .sort((a, b) => {
        const aTime = a.createdAt?.seconds || 0;
        const bTime = b.createdAt?.seconds || 0;
        return bTime - aTime;
      });
  }
}

/**
 * Fetch recent bookings efficiently
 */
export async function getRecentBookings(limitCount = 5, complexId = null) {
  try {
    const fetchLimit = complexId ? limitCount * 5 : limitCount;
    const q = query(bookingsCollection, orderBy('createdAt', 'desc'), limit(fetchLimit));
    const snapshot = await getDocs(q);
    let bookings = snapshot.docs.map(docSnap => ({
      id: docSnap.id,
      ...docSnap.data()
    }));
    
    if (complexId) {
      bookings = bookings.filter(b => b.complexId === complexId).slice(0, limitCount);
    }
    return bookings;
  } catch (error) {
    const fallbackQ = query(bookingsCollection, limit(limitCount));
    const snapshot = await getDocs(fallbackQ);
    let bookings = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
    if (complexId) {
      bookings = bookings.filter(b => b.complexId === complexId);
    }
    return bookings;
  }
}

/**
 * Real-time listener for recent bookings
 */
export function listenToRecentBookings(limitCount, callback, complexId = null) {
  const fetchLimit = complexId ? limitCount * 5 : limitCount;
  const q = query(bookingsCollection, orderBy('createdAt', 'desc'), limit(fetchLimit));
  
  return onSnapshot(q, (snapshot) => {
    let bookings = snapshot.docs.map(docSnap => ({
      id: docSnap.id,
      ...docSnap.data()
    }));
    if (complexId) {
      bookings = bookings.filter(b => b.complexId === complexId).slice(0, limitCount);
    }
    callback(bookings);
  }, (error) => {
    console.error("Error listening to recent bookings: ", error);
  });
}

/**
 * Fetch and count live slot statuses efficiently using getCountFromServer.
 */
export async function getSlotOccupancy(complexId = null) {
  try {
    let total = 0, booked = 0, available = 0, disabled = 0;

    if (complexId) {
      const docSnap = await getDoc(doc(complexesCollection, complexId));
      if (docSnap.exists()) {
        const data = docSnap.data();
        total = data.totalSlots || 0;
        available = data.availableCount || 0;
        booked = (data.occupiedCount || 0) + (data.reservedCount || 0);
        disabled = data.maintenanceCount || 0;
      }
    } else {
      const snapshot = await getDocs(complexesCollection);
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        total += data.totalSlots || 0;
        available += data.availableCount || 0;
        booked += (data.occupiedCount || 0) + (data.reservedCount || 0);
        disabled += data.maintenanceCount || 0;
      });
    }

    const occupancyRate = total > 0 ? Math.round((booked / total) * 100) : 0;

    return {
      total,
      booked,
      available,
      disabled,
      occupancyRate
    };
  } catch (error) {
    throw new Error(`Failed to calculate occupancy: ${error.message}`);
  }
}

/**
 * Rule-based peak hour estimate as defined in TRD 5.4.
 * Rules: 8-10am = High, 12-2pm = High, 4-7pm = Medium, else = Low
 * 
 * @param {number} hour Hour in 24h format (0 - 23)
 * @returns {'High' | 'Medium' | 'Low'}
 */
export function getPeakHourEstimate(hour) {
  if ((hour >= 8 && hour < 10) || (hour >= 12 && hour < 14)) {
    return 'High';
  } else if (hour >= 16 && hour < 19) {
    return 'Medium';
  } else {
    return 'Low';
  }
}

/**
 * Generate a complete peak hours chart/table for display.
 */
export function getPeakHoursTable() {
  return [
    { range: '08:00 AM - 10:00 AM', status: 'High' },
    { range: '10:00 AM - 12:00 PM', status: 'Low' },
    { range: '12:00 PM - 02:00 PM', status: 'High' },
    { range: '02:00 PM - 04:00 PM', status: 'Low' },
    { range: '04:00 PM - 07:00 PM', status: 'Medium' },
    { range: '07:00 PM - 08:00 AM', status: 'Low' },
  ];
}

/**
 * Add a new Complex and generate all slots for it
 */
export async function addComplexWithInfrastructure(complexData) {
  const {
    name, location, area, lat, lng,
    ownerEmail, ownerPassword,
    totalFloors, slotsPerFloor, bikeFloors
  } = complexData;

  // 1. Create Secondary Admin Auth Account
  let adminUid;
  try {
    const cred = await createUserWithEmailAndPassword(secondaryAuth, ownerEmail, ownerPassword);
    adminUid = cred.user.uid;
  } catch (error) {
    throw new Error(`Failed to create owner account: ${error.message}`);
  }

  try {
    // 2. Create the Complex Document
    const complexId = name.toLowerCase().replace(/[^a-z0-9]+/g, '_');
    const complexRef = doc(complexesCollection, complexId);
    
    // Parse slotsPerFloor (can be a single number "50" or comma-separated "50,42,42,30")
    let slotsList = [];
    if (typeof slotsPerFloor === 'string' && slotsPerFloor.includes(',')) {
      slotsList = slotsPerFloor.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n));
    } else {
      // Fallback for older format or if they just typed a single number for all floors
      const singleCount = parseInt(slotsPerFloor);
      for (let i = 0; i < totalFloors; i++) {
        slotsList.push(singleCount);
      }
    }

    // Ensure we have enough slot definitions for all floors (pad with 0 or the last value if short)
    while (slotsList.length < totalFloors) {
      slotsList.push(slotsList[slotsList.length - 1] || 0);
    }

    const totalSlots = slotsList.reduce((sum, count) => sum + count, 0);
    const bikeFloorList = bikeFloors.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n));
    
    let bikeCount = 0;
    let carCount = 0;

    const slotsData = [];

    // Pre-calculate slots to get accurate counts
    for (let f = 1; f <= totalFloors; f++) {
      const isBikeFloor = bikeFloorList.includes(f);
      const slotsOnThisFloor = slotsList[f - 1];
      for (let s = 1; s <= slotsOnThisFloor; s++) {
        if (isBikeFloor) bikeCount++;
        else carCount++;

        const labelNum = s < 10 ? `0${s}` : `${s}`;
        const label = isBikeFloor ? `B${f}-${labelNum}` : `C${f}-${labelNum}`;
        const slotId = `${complexId}_${label}`;
        
        slotsData.push({
          id: slotId,
          data: {
            slotId,
            label,
            floor: f,
            complexId,
            complexName: name,
            vehicleType: isBikeFloor ? 'bike' : 'car',
            isHandicap: false,
            status: 'available',
            updatedAt: new Date()
          }
        });
      }
    }

    const floorAvailableCounts = {};
    for (let f = 1; f <= totalFloors; f++) {
      floorAvailableCounts[`floor${f}Available`] = slotsList[f - 1];
    }

    const newComplex = {
      id: complexId,
      name,
      location,
      area: area || '',
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      totalSlots,
      availableCount: totalSlots,
      bikeAvailable: bikeCount,
      carAvailable: carCount,
      occupiedCount: 0,
      reservedCount: 0,
      maintenanceCount: 0,
      updatedAt: new Date(),
      ...floorAvailableCounts
    };

    // Save Admin Record
    await setDoc(doc(adminsCollection, adminUid), {
      email: ownerEmail.trim().toLowerCase(),
      role: 'complex_admin',
      complexId,
      createdAt: new Date()
    });

    // 3. Batch commit the complex and slots in chunks of 490
    const ops = [];
    ops.push({ type: 'set', ref: complexRef, data: newComplex });

    slotsData.forEach(slot => {
      ops.push({ type: 'set', ref: doc(slotsCollection, slot.id), data: slot.data });
    });

    const CHUNK_SIZE = 490;
    for (let i = 0; i < ops.length; i += CHUNK_SIZE) {
      const chunk = ops.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);
      chunk.forEach(op => {
        if (op.type === 'set') batch.set(op.ref, op.data);
      });
      await batch.commit();
    }

    return complexId;
  } catch (error) {
    throw new Error(`Failed to generate complex infrastructure: ${error.message}`);
  }
}

/**
 * Delete a complex and all its slots
 */
export async function deleteComplex(complexId) {
  try {
    // 1. Delete the complex doc
    await deleteDoc(doc(complexesCollection, complexId));

    // 2. Delete all slots for this complex
    const slotsQ = query(slotsCollection, where('complexId', '==', complexId));
    const snapshot = await getDocs(slotsQ);
    
    const CHUNK_SIZE = 490;
    const docs = snapshot.docs;
    
    for (let i = 0; i < docs.length; i += CHUNK_SIZE) {
      const chunk = docs.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);
      chunk.forEach(d => batch.delete(d.ref));
      await batch.commit();
    }
    
    return true;
  } catch (error) {
    throw new Error(`Failed to delete complex: ${error.message}`);
  }
}

/**
 * Add a new floor with auto-generated slots to an existing complex
 */
export async function addFloorToComplex(complexId, complexName, floorNum, isBikeFloor, slotCount) {
  try {
    const slotsData = [];
    const batch = writeBatch(db);

    for (let s = 1; s <= slotCount; s++) {
      const labelNum = s < 10 ? `0${s}` : `${s}`;
      const label = isBikeFloor ? `B${floorNum}-${labelNum}` : `C${floorNum}-${labelNum}`;
      const slotId = `${complexId}_${label}`;
      
      const slotRef = doc(slotsCollection, slotId);
      batch.set(slotRef, {
        slotId,
        label,
        floor: floorNum,
        complexId,
        complexName,
        vehicleType: isBikeFloor ? 'bike' : 'car',
        isHandicap: false,
        status: 'available',
        updatedAt: new Date()
      });
    }

    const complexRef = doc(complexesCollection, complexId);
    batch.update(complexRef, {
      totalSlots: increment(slotCount),
      availableCount: increment(slotCount),
      bikeAvailable: isBikeFloor ? increment(slotCount) : increment(0),
      carAvailable: isBikeFloor ? increment(0) : increment(slotCount),
      [`floor${floorNum}Available`]: increment(slotCount)
    });

    await batch.commit();
    return true;
  } catch (error) {
    throw new Error(`Failed to add floor: ${error.message}`);
  }
}

/**
 * Add a single new slot to an existing floor
 */
export async function addSlotToFloor(complexId, complexName, floorNum, label, vehicleType) {
  try {
    const slotId = `${complexId}_${label}`;
    const slotRef = doc(slotsCollection, slotId);
    
    const batch = writeBatch(db);
    batch.set(slotRef, {
      slotId,
      label,
      floor: floorNum,
      complexId,
      complexName,
      vehicleType: vehicleType,
      isHandicap: vehicleType === 'handicap',
      status: 'available',
      updatedAt: new Date()
    });

    const isBike = vehicleType === 'bike';

    const complexRef = doc(complexesCollection, complexId);
    batch.update(complexRef, {
      totalSlots: increment(1),
      availableCount: increment(1),
      bikeAvailable: isBike ? increment(1) : increment(0),
      carAvailable: !isBike ? increment(1) : increment(0),
      [`floor${floorNum}Available`]: increment(1)
    });

    await batch.commit();
    return slotId;
  } catch (error) {
    throw new Error(`Failed to add slot: ${error.message}`);
  }
}

/**
 * Remove an entire floor from a complex
 */
export async function removeFloorFromComplex(complexId, floorNum) {
  try {
    const floorQ = query(
      slotsCollection, 
      where('complexId', '==', complexId),
      where('floor', '==', parseInt(floorNum))
    );
    const snapshot = await getDocs(floorQ);
    
    if (snapshot.empty) return false;

    let bikeCount = 0;
    let carCount = 0;
    let availableCount = 0;
    let occupiedCount = 0;
    let reservedCount = 0;
    let maintenanceCount = 0;

    const CHUNK_SIZE = 490; // Firebase batch limit is 500
    const docs = snapshot.docs;
    
    // Process in batches
    for (let i = 0; i < docs.length; i += CHUNK_SIZE) {
      const chunk = docs.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);
      
      chunk.forEach(d => {
        const data = d.data();
        if (data.vehicleType === 'bike') bikeCount++;
        else carCount++;
        
        if (data.status === 'available') availableCount++;
        else if (data.status === 'occupied') occupiedCount++;
        else if (data.status === 'reserved') reservedCount++;
        else if (data.status === 'maintenance') maintenanceCount++;
        
        batch.delete(d.ref);
      });
      
        const complexRef = doc(complexesCollection, complexId);
        batch.update(complexRef, {
          totalSlots: increment(-docs.length),
          availableCount: increment(-availableCount),
          occupiedCount: increment(-occupiedCount),
          reservedCount: increment(-reservedCount),
          maintenanceCount: increment(-maintenanceCount),
          bikeAvailable: increment(-bikeCount), // approximate for available bikes
          carAvailable: increment(-carCount),
          [`floor${floorNum}Available`]: increment(-availableCount)
        });
      
      await batch.commit();
    }
    return true;
  } catch (error) {
    throw new Error(`Failed to remove floor: ${error.message}`);
  }
}

/**
 * Toggle slot status between available and maintenance
 */
export async function toggleSlotStatus(slotId, currentStatus, complexId) {
  try {
    const newStatus = currentStatus === 'available' ? 'maintenance' : 'available';
    const slotRef = doc(slotsCollection, slotId);
    
    const batch = writeBatch(db);
    batch.set(slotRef, { status: newStatus, updatedAt: new Date() }, { merge: true });

    if (complexId) {
      const label = slotId.split('_')[1];
      const floorNum = getFloorFromLabel(label);
      const complexRef = doc(complexesCollection, complexId);
      batch.update(complexRef, {
        availableCount: increment(newStatus === 'available' ? 1 : -1),
        maintenanceCount: increment(newStatus === 'maintenance' ? 1 : -1),
        [`floor${floorNum}Available`]: increment(newStatus === 'available' ? 1 : -1)
      });
    }

    await batch.commit();
    return newStatus;
  } catch (error) {
    throw new Error(`Failed to toggle slot status: ${error.message}`);
  }
}
