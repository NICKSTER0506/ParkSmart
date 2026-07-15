// src/services/slotService.js
import { db } from '../config/firebase';
import {
  collection,
  getDocs,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  serverTimestamp
} from 'firebase/firestore';

const slotsCollection = collection(db, 'slots');
const complexesCollection = collection(db, 'complexes');

/**
 * Fetch all complexes for UI lodge selection
 */
export async function getComplexes() {
  try {
    const snapshot = await getDocs(complexesCollection);
    return snapshot.docs.map(docSnap => ({
      id: docSnap.id,
      ...docSnap.data()
    })).sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    throw new Error(`Failed to fetch complexes: ${error.message}`);
  }
}

/**
 * Perform a one-time fetch of all slots, ordered by zone and label.
 */
export async function getAllSlots(complexId = null) {
  try {
    let q = slotsCollection;
    if (complexId) {
      q = query(slotsCollection, where('complexId', '==', complexId));
    }
    const snapshot = await getDocs(q);
    const slots = snapshot.docs.map(docSnap => ({
      id: docSnap.id,
      ...docSnap.data()
    }));
    
    return slots.sort((a, b) => {
      const zoneA = a.zone || '';
      const zoneB = b.zone || '';
      if (zoneA === zoneB) {
        const labelA = a.label || '';
        const labelB = b.label || '';
        return labelA.localeCompare(labelB);
      }
      return zoneA.localeCompare(zoneB);
    });
  } catch (error) {
    throw new Error(`Failed to fetch slots: ${error.message}`);
  }
}

/**
 * Setup a real-time listener on the slots collection.
 * Calls callback with updated list of slots.
 */
export function listenToSlots(callback) {
  return onSnapshot(slotsCollection, (snapshot) => {
    const slots = snapshot.docs.map(docSnap => ({
      id: docSnap.id,
      ...docSnap.data()
    }));
    
    slots.sort((a, b) => {
      const zoneA = a.zone || '';
      const zoneB = b.zone || '';
      if (zoneA === zoneB) {
        const labelA = a.label || '';
        const labelB = b.label || '';
        return labelA.localeCompare(labelB);
      }
      return zoneA.localeCompare(zoneB);
    });
    
    callback(slots);
  }, (error) => {
    console.error("Error listening to slots: ", error);
  });
}

/**
 * Admin operation to update a slot's status directly.
 */
export async function updateSlotStatus(slotId, status) {
  try {
    const slotRef = doc(db, 'slots', slotId);
    await updateDoc(slotRef, {
      status,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    throw new Error(`Failed to update slot status: ${error.message}`);
  }
}

/**
 * Admin operation to add a new slot to the inventory.
 */
export async function addSlot(slotData) {
  try {
    // Generate default coordinates if map needs them
    const latitude = slotData.latitude !== undefined ? slotData.latitude : 12.9716 + (Math.random() - 0.5) * 0.01;
    const longitude = slotData.longitude !== undefined ? slotData.longitude : 77.5946 + (Math.random() - 0.5) * 0.01;

    const docRef = await addDoc(slotsCollection, {
      label: slotData.label,
      zone: slotData.zone,
      floor: parseInt(slotData.floor, 10) || 0,
      status: slotData.status || 'available',
      latitude,
      longitude,
      updatedAt: serverTimestamp()
    });

    // Write slotId as the same document ID for schema consistency
    await updateDoc(docRef, { slotId: docRef.id });
    return docRef.id;
  } catch (error) {
    throw new Error(`Failed to add slot: ${error.message}`);
  }
}

/**
 * Admin operation to permanently delete a slot from the database.
 */
export async function removeSlot(slotId) {
  try {
    const slotRef = doc(db, 'slots', slotId);
    await deleteDoc(slotRef);
  } catch (error) {
    throw new Error(`Failed to remove slot: ${error.message}`);
  }
}
