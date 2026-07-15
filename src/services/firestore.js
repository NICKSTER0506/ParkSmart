// Enhanced Firestore service with all CRUD operations
import { db } from '../config/firebase';
import {
  collection,
  getDocs,
  getDoc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  limit,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore';

const usersCollection = collection(db, 'users');
const adminsCollection = collection(db, 'admins');
const slotsCollection = collection(db, 'parkingSpots');
const bookingsCollection = collection(db, 'bookings');
const reportsCollection = collection(db, 'reports');
const analyticsCollection = collection(db, 'analytics');

export async function checkAdminAccess(email) {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  const q = query(adminsCollection, where('email', '==', normalized));
  const snapshot = await getDocs(q);
  return !snapshot.empty;
}

export async function getUserById(uid) {
  if (!uid) return null;
  const docRef = doc(usersCollection, uid);
  const snapshot = await getDoc(docRef);
  return snapshot.exists() ? { uid: snapshot.id, ...snapshot.data() } : null;
}

export async function toggleFavorite(userId, complexId, isFavorite) {
  const userRef = doc(usersCollection, userId);
  return await updateDoc(userRef, {
    favorites: isFavorite ? arrayRemove(complexId) : arrayUnion(complexId)
  });
}

export async function getParkingSpots() {
  const snapshot = await getDocs(slotsCollection);
  const slots = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
  return slots.sort((a, b) => {
    const aTime = a.createdAt?.seconds || 0;
    const bTime = b.createdAt?.seconds || 0;
    return aTime - bTime;
  });
}

export async function createSlot(slot) {
  return await addDoc(slotsCollection, {
    ...slot,
    status: slot.status || 'available',
    createdAt: serverTimestamp(),
  });
}

export async function removeSlot(slotId) {
  return await deleteDoc(doc(slotsCollection, slotId));
}

export async function updateSlotStatus(slotId, status) {
  return await updateDoc(doc(slotsCollection, slotId), {
    status,
    updatedAt: serverTimestamp(),
  });
}

export async function createBooking(booking) {
  return await addDoc(bookingsCollection, {
    ...booking,
    status: booking.status || 'pending',
    createdAt: serverTimestamp(),
  });
}

export async function getUserBookings(userId) {
  const q = query(bookingsCollection, where('userId', '==', userId), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function updateBooking(bookingId, updates) {
  return await updateDoc(doc(bookingsCollection, bookingId), {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

export async function submitReport(report) {
  return await addDoc(reportsCollection, {
    ...report,
    createdAt: serverTimestamp(),
  });
}

export async function getReports(latitude, longitude, radiusKm = 1) {
  const snapshot = await getDocs(reportsCollection);
  return snapshot.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter((r) => {
      const dist = Math.sqrt((r.latitude - latitude) ** 2 + (r.longitude - longitude) ** 2);
      return dist < radiusKm / 111;
    });
}

export async function saveAnalytics(userId, event) {
  return await addDoc(analyticsCollection, {
    userId,
    event,
    timestamp: serverTimestamp(),
  });
}

export async function getParkingStats() {
  const [slotsSnapshot, bookingsSnapshot, usersSnapshot] = await Promise.all([
    getDocs(slotsCollection),
    getDocs(bookingsCollection),
    getDocs(usersCollection),
  ]);

  const slots = slotsSnapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
  const bookings = bookingsSnapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));

  const totalUsers = usersSnapshot.size;
  const totalBookings = bookings.length;
  const availableSlots = slots.filter((slot) => slot.status === 'available').length;
  const occupiedSlots = slots.filter((slot) => slot.status !== 'available').length;

  const peakHour = calculatePeakBookingHour(bookings);

  return {
    totalUsers,
    totalBookings,
    availableSlots,
    occupiedSlots,
    peakBookingHour: peakHour.label,
    peakBookingCount: peakHour.count,
  };
}

function calculatePeakBookingHour(bookings) {
  const hourCount = bookings.reduce((acc, booking) => {
    const createdAt = booking.createdAt;
    let date = null;
    if (createdAt?.toDate) {
      date = createdAt.toDate();
    } else if (createdAt?.seconds) {
      date = new Date(createdAt.seconds * 1000);
    } else if (typeof createdAt === 'number') {
      date = new Date(createdAt);
    }
    if (!date) return acc;
    const hour = date.getHours();
    acc[hour] = (acc[hour] || 0) + 1;
    return acc;
  }, {});

  const peakHour = Object.entries(hourCount).sort((a, b) => b[1] - a[1])[0];
  if (!peakHour) {
    return { label: 'No bookings yet', count: 0 };
  }
  return { label: `${peakHour[0]}:00`, count: peakHour[1] };
}

export function subscribeToSlotsRealtime(callback) {
  const q = query(slotsCollection, orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snapshot) => callback(snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))));
}

export function subscribeToBookingsRealtime(callback) {
  const q = query(collection(db, 'bookings'), orderBy('createdAt', 'desc'), limit(50));
  return onSnapshot(q, (snapshot) => {
    const list = [];
    snapshot.forEach((doc) => {
      list.push({ id: doc.id, ...doc.data() });
    });
    callback(list);
  });
}

// Subscribe to Complexes Collection
export function subscribeToComplexesRealtime(callback) {
  const q = query(collection(db, 'complexes'), orderBy('totalSlots', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const list = [];
    snapshot.forEach((doc) => {
      list.push({ id: doc.id, ...doc.data() });
    });
    callback(list);
  }, (error) => {
    console.error('Error fetching complexes:', error);
    callback([]);
  });
}

export function subscribeToUsersRealtime(callback) {
  const q = query(usersCollection, orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snapshot) => callback(snapshot.docs.map((docSnap) => ({ uid: docSnap.id, ...docSnap.data() }))));
}
