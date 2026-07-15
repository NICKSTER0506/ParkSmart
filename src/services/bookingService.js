// src/services/bookingService.js
import { db } from '../config/firebase';
import {
  collection,
  getDocs,
  getDoc,
  doc,
  writeBatch,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  increment
} from 'firebase/firestore';
import { ACCELERATOR } from '../utils/timerConstants';

const bookingsCollection = collection(db, 'bookings');

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
 * Atomic batch write to create a booking document and update the slot status to 'booked'.
 * Prevents race conditions and updates the complex aggregation counters.
 */
export async function createBooking(userId, slotId, slotLabel, complexId, durationMinutes, vehicleType = null) {
  try {
    const batch = writeBatch(db);
    const bookingRef = doc(bookingsCollection);
    
    const startTime = new Date();
    const endTime = new Date(startTime.getTime() + durationMinutes * 60 * 1000);

    // 1. Create booking document
    batch.set(bookingRef, {
      bookingId: bookingRef.id,
      userId,
      slotId,
      slotLabel,
      complexId, // Added complexId so cancel/expire can easily find it
      vehicleType,
      status: 'active',
      startTime,
      endTime,
      durationMinutes: durationMinutes,
      createdAt: serverTimestamp()
    });

    // 2. Mark slot status as 'booked' and increment bookingCount
    const slotRef = doc(db, 'slots', slotId);
    batch.update(slotRef, {
      status: 'booked',
      bookingCount: increment(1),
      updatedAt: serverTimestamp()
    });

    // 3. Update complex aggregation counters
    if (complexId) {
      const complexRef = doc(db, 'complexes', complexId);
      const isBike = slotLabel && slotLabel.startsWith('B');
      const floorNum = getFloorFromLabel(slotLabel);
      
      batch.update(complexRef, {
        availableCount: increment(-1),
        occupiedCount: increment(1),
        bikeAvailable: isBike ? increment(-1) : increment(0),
        carAvailable: !isBike ? increment(-1) : increment(0),
        [`floor${floorNum}Available`]: increment(-1)
      });
    }

    await batch.commit();
    
    return {
      bookingId: bookingRef.id,
      userId,
      slotId,
      slotLabel,
      complexId,
      vehicleType,
      status: 'active',
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      durationMinutes: durationMinutes
    };
  } catch (error) {
    throw new Error(`Booking failed: ${error.message}`);
  }
}

/**
 * Atomic batch write to cancel a booking and revert the slot status to 'available'.
 */
export async function cancelBooking(bookingId, slotId, complexId = null, slotLabel = null) {
  try {
    const batch = writeBatch(db);

    // 1. Update booking status to 'cancelled'
    const bookingRef = doc(db, 'bookings', bookingId);
    batch.update(bookingRef, {
      status: 'cancelled',
      updatedAt: serverTimestamp()
    });

    // 2. Revert slot status to 'available'
    const slotRef = doc(db, 'slots', slotId);
    batch.update(slotRef, {
      status: 'available',
      updatedAt: serverTimestamp()
    });

    // 3. Update complex aggregation counters
    if (complexId) {
      const complexRef = doc(db, 'complexes', complexId);
      const isBike = slotLabel && slotLabel.startsWith('B');
      const floorNum = getFloorFromLabel(slotLabel);
      batch.update(complexRef, {
        availableCount: increment(1),
        occupiedCount: increment(-1),
        bikeAvailable: isBike ? increment(1) : increment(0),
        carAvailable: !isBike ? increment(1) : increment(0),
        [`floor${floorNum}Available`]: increment(1)
      });
    }

    await batch.commit();
  } catch (error) {
    throw new Error(`Cancellation failed: ${error.message}`);
  }
}

/**
 * Fetch all bookings for a specific user, ordered chronologically.
 */
export async function getUserBookings(userId) {
  try {
    const q = query(
      bookingsCollection,
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(docSnap => ({
      id: docSnap.id,
      ...docSnap.data()
    }));
  } catch (error) {
    // If the database has no bookings with index, it might error initially.
    // Fallback: simple sorting in memory if indexing is building.
    const qSimple = query(bookingsCollection, where('userId', '==', userId));
    const snapshot = await getDocs(qSimple);
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
 * Fetch a single active booking for a user, if any exists.
 */
export async function getActiveBooking(userId) {
  try {
    const q = query(
      bookingsCollection,
      where('userId', '==', userId),
      where('status', '==', 'active'),
      limit(1)
    );
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    const docSnap = snapshot.docs[0];
    return {
      id: docSnap.id,
      ...docSnap.data()
    };
  } catch (error) {
    console.error("Error fetching active booking: ", error);
    return null;
  }
}

/**
 * Atomic batch write to expire a booking and revert the slot status to 'available'.
 */
export async function expireBooking(bookingId, slotId, complexId = null, slotLabel = null) {
  try {
    const batch = writeBatch(db);

    // 1. Update booking status to 'completed'
    const bookingRef = doc(db, 'bookings', bookingId);
    batch.update(bookingRef, {
      status: 'completed',
      actualEndTime: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    // 2. Revert slot status to 'available'
    const slotRef = doc(db, 'slots', slotId);
    batch.update(slotRef, {
      status: 'available',
      updatedAt: serverTimestamp()
    });

    // 3. Update complex aggregation counters
    if (complexId) {
      const complexRef = doc(db, 'complexes', complexId);
      const isBike = slotLabel && slotLabel.startsWith('B');
      const floorNum = getFloorFromLabel(slotLabel);
      batch.update(complexRef, {
        availableCount: increment(1),
        occupiedCount: increment(-1),
        bikeAvailable: isBike ? increment(1) : increment(0),
        carAvailable: !isBike ? increment(1) : increment(0),
        [`floor${floorNum}Available`]: increment(1)
      });
    }

    await batch.commit();
  } catch (error) {
    throw new Error(`Expiry failed: ${error.message}`);
  }
}

/**
 * Clean up expired bookings
 */
export async function cleanExpiredBookings(userId) {
  try {
    const q = query(
      bookingsCollection,
      where('userId', '==', userId),
      where('status', '==', 'active')
    );
    const snapshot = await getDocs(q);
    
    for (const docSnap of snapshot.docs) {
      const booking = docSnap.data();
      const startTimeMs = booking.startTime?.toMillis() || Date.now();
      const realElapsedMs = Date.now() - startTimeMs;
      const simElapsedMs = realElapsedMs * ACCELERATOR;
      const totalSimDurationMs = booking.durationMinutes * 60 * 1000;
      
      if (simElapsedMs >= totalSimDurationMs) {
        console.log(`Auto-expiring booking ${docSnap.id} for user ${userId}`);
        await expireBooking(docSnap.id, booking.slotId);
      }
    }
  } catch (error) {
    console.error("Error cleaning expired bookings: ", error);
  }
}
