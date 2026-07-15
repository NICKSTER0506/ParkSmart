// src/context/ParkingContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { getUserBookings } from '../services/bookingService';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from '../config/firebase';

const ParkingContext = createContext(null);

export function ParkingProvider({ children }) {
  const { user, role, userDoc } = useAuth();
  
  const [activeBooking, setActiveBooking] = useState(null);
  const [bookingHistory, setBookingHistory] = useState([]);

  // 2. Active Booking Listener Lifecycle
  useEffect(() => {
    if (!user || role === 'admin') {
      setActiveBooking(null);
      return;
    }

    // Load from cache first for offline support
    const loadCachedBooking = async () => {
      try {
        const cached = await AsyncStorage.getItem(`@cached_active_booking_${user.uid}`);
        if (cached) {
          setActiveBooking(JSON.parse(cached));
        }
      } catch (e) {
        console.error('Failed to load cached active booking', e);
      }
    };
    loadCachedBooking();

    const q = query(
      collection(db, 'bookings'),
      where('userId', '==', user.uid),
      where('status', '==', 'active')
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      if (snapshot.empty) {
        setActiveBooking(null);
        await AsyncStorage.removeItem(`@cached_active_booking_${user.uid}`);
      } else {
        const docSnap = snapshot.docs[0];
        const bookingData = {
          id: docSnap.id,
          ...docSnap.data()
        };
        
        // Convert Timestamps to ISO strings for safe caching
        if (bookingData.startTime && bookingData.startTime.toDate) {
            bookingData.startTime = bookingData.startTime.toDate().toISOString();
        }
        if (bookingData.bookingTime && bookingData.bookingTime.toDate) {
            bookingData.bookingTime = bookingData.bookingTime.toDate().toISOString();
        }
        
        setActiveBooking(bookingData);
        await AsyncStorage.setItem(`@cached_active_booking_${user.uid}`, JSON.stringify(bookingData));
      }
    }, (error) => {
      console.error("Error listening to active booking: ", error);
      // Keep using the loaded cache if offline
    });

    return () => unsubscribe();
  }, [user, role]);

  // 3. Load booking history (one-time fetch helper)
  const refreshHistory = async () => {
    if (!user) return;
    try {
      const history = await getUserBookings(user.uid);
      
      // Serialize dates for caching
      const serializableHistory = history.map(b => {
          const newB = {...b};
          if (newB.startTime && newB.startTime.toDate) newB.startTime = newB.startTime.toDate().toISOString();
          if (newB.bookingTime && newB.bookingTime.toDate) newB.bookingTime = newB.bookingTime.toDate().toISOString();
          return newB;
      });
      
      setBookingHistory(serializableHistory);
      await AsyncStorage.setItem(`@cached_booking_history_${user.uid}`, JSON.stringify(serializableHistory));
    } catch (error) {
      console.error("Failed to load booking history, attempting to load from cache: ", error);
      try {
        const cached = await AsyncStorage.getItem(`@cached_booking_history_${user.uid}`);
        if (cached) {
          setBookingHistory(JSON.parse(cached));
        }
      } catch (e) {
        console.error('Failed to load cached booking history', e);
      }
    }
  };

  // Automatically refresh history when the user logs in or role changes
  useEffect(() => {
    if (user && role === 'user') {
      refreshHistory();
    } else {
      setBookingHistory([]);
    }
  }, [user, role]);

  const value = {
    activeBooking,
    bookingHistory,
    refreshHistory
  };

  return (
    <ParkingContext.Provider value={value}>
      {children}
    </ParkingContext.Provider>
  );
}

export function useParking() {
  const context = useContext(ParkingContext);
  if (!context) {
    throw new Error('useParking must be used within a ParkingProvider');
  }
  return context;
}
export default ParkingContext;
