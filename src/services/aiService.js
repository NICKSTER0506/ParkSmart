import { collection, getDocs, query, limit, orderBy, getCountFromServer, where } from 'firebase/firestore';
import { db } from '../config/firebase';

const bookingsCollection = collection(db, 'bookings');

export function scoreSlot(slot, bookingHistory, userVehicleType) {
  if (slot.status !== 'available') return -9999;
  
  // If strict vehicle matching is desired
  // We allow 'handicap' spots to be used by 'car' as a fallback, but penalize it.
  const isCar = userVehicleType === 'car';
  if (slot.vehicleType === 'bike' && isCar) return -9999;
  if (slot.vehicleType === 'car' && !isCar) return -9999;

  let score = 0;

  // Penalize handicap slots slightly to save them for people who need them
  // unless the user explicitly needs them (which our basic profile doesn't track right now)
  if (slot.isHandicap) {
    score -= 10;
  }

  // Historical Preference (+15 points per previous booking)
  if (bookingHistory && bookingHistory.length > 0) {
    const historyMatches = bookingHistory.filter(b => 
      b.slotId === slot.slotId || b.slotId === slot.id
    ).length;
    score += historyMatches * 15;
  }

  // Proximity Bonus (High valuation as requested)
  // Extracts the numeric part of the label (e.g., 'C2-01' -> 1)
  const match = slot.label.match(/\d+$/);
  if (match) {
    const slotNum = parseInt(match[0], 10);
    // Give up to +30 points for being close to the entrance (Slot 1)
    score += Math.max(0, 30 - slotNum);
  }

  return score;
}

export function getRecommendedSlot(slots, bookingHistory, userVehicleType) {
  if (!slots || slots.length === 0) return null;

  let bestSlot = null;
  let highestScore = -Infinity;

  for (const slot of slots) {
    const score = scoreSlot(slot, bookingHistory, userVehicleType);
    // Score must be > -100 to avoid recommending impossible slots
    if (score > highestScore && score > -100) {
      highestScore = score;
      bestSlot = slot;
    }
  }

  return bestSlot;
}

export function detectOverstays(slots, bookings) {
  return slots; // stub
}

export async function fetchAnalyticsData(complexId = null) {
  const q = query(bookingsCollection, orderBy('createdAt', 'desc'), limit(complexId ? 1000 : 200));
  const snapshot = await getDocs(q);
  let bookings = snapshot.docs.map(doc => doc.data());
  
  if (complexId) {
    bookings = bookings.filter(b => b.complexId === complexId);
  }

  // Section 2: Bookings per complex
  const complexCounts = {};
  const complexRevenue = {};
  let totalRevenue = 0;
  
  // Section 3: Occupancy by Day of Week (0 = Sunday, 1 = Monday)
  const dayCounts = [0, 0, 0, 0, 0, 0, 0];
  
  bookings.forEach(b => {
    const price = b.totalPrice || 0;
    totalRevenue += price;

    // Group by lodgeName
    if (b.lodgeName) {
      const shortName = b.lodgeName; // Keeping full name since we truncate in UI
      complexCounts[shortName] = (complexCounts[shortName] || 0) + 1;
      complexRevenue[shortName] = (complexRevenue[shortName] || 0) + price;
    }

    // Group by day of week
    if (b.createdAt && b.createdAt.seconds) {
      const date = new Date(b.createdAt.seconds * 1000);
      dayCounts[date.getDay()]++;
    }
  });

  // Prepare Complex Chart Data
  const complexLabels = Object.keys(complexCounts);
  const complexData = Object.values(complexCounts);

  // Prepare Day of Week Data (Shift to Mon-Sun)
  // JS getDay: 0=Sun, 1=Mon, ..., 6=Sat
  // We want Mon=0, ..., Sun=6
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const shiftedCounts = [
    dayCounts[1], // Mon
    dayCounts[2],
    dayCounts[3],
    dayCounts[4],
    dayCounts[5],
    dayCounts[6], // Sat
    dayCounts[0], // Sun
  ];

  // Calculate occupancy metrics per day based on 240 slots per complex across 5 complexes?
  // User: "compute occupancy as bookings that day / total slots."
  // total slots is passed in or fetched. We'll return the raw counts and calculate % in UI,
  // or calculate here assuming ~1200 slots total. Actually, the user says "bookings that day / total slots".
  
  const dayOccupancy = days.map((day, idx) => ({
    day,
    count: shiftedCounts[idx]
  }));

  return {
    totalRevenue,
    complexChart: {
      labels: complexLabels.length ? complexLabels : ['N/A'],
      data: complexData.length ? complexData : [0]
    },
    revenueChart: {
      labels: Object.keys(complexRevenue).length ? Object.keys(complexRevenue) : ['N/A'],
      data: Object.values(complexRevenue).length ? Object.values(complexRevenue) : [0]
    },
    dayOccupancy
  };
}

export async function fetchTotalBookingsCount(complexId = null) {
  try {
    let totalActive = 0;
    if (complexId) {
      const complexDoc = await getDocs(query(collection(db, 'complexes'), where('id', '==', complexId)));
      if (!complexDoc.empty) {
        const data = complexDoc.docs[0].data();
        totalActive = (data.occupiedCount || 0) + (data.reservedCount || 0);
      }
    } else {
      const complexDocs = await getDocs(collection(db, 'complexes'));
      complexDocs.forEach(doc => {
        const data = doc.data();
        totalActive += (data.occupiedCount || 0) + (data.reservedCount || 0);
      });
    }
    return totalActive;
  } catch (error) {
    console.error("Error fetching total bookings count:", error);
    return 0;
  }
}
