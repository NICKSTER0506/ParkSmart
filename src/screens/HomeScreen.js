import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, Pressable } from 'react-native';
import { colors } from '../constants/theme';
import StatCard from '../components/StatCard';
import ActionCard from '../components/ActionCard';
import { getCurrentUser } from '../services/auth';
import { getUserById, subscribeToComplexesRealtime, checkAdminAccess } from '../services/firestore';
import * as Location from 'expo-location';
import { calculateDistance, formatDistance, getDrivingDistances } from '../utils/distance';
import { useParking } from '../context/ParkingContext';
import { Ionicons } from '@expo/vector-icons';

// Removed static prediction logic

export default function HomeScreen({ navigation }) {
  const [userName, setUserName] = useState('Driver');
  const [loading, setLoading] = useState(true);
  const [complexes, setComplexes] = useState([]);
  const [availableCount, setAvailableCount] = useState(0);
  const [bookedCount, setBookedCount] = useState(0);
  const [totalSlots, setTotalSlots] = useState(0);
  const [nearbyAreas, setNearbyAreas] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const { activeBooking } = useParking();

  useEffect(() => {
    const currentUser = getCurrentUser();

    async function loadUser() {
      if (!currentUser) return;
      const userDoc = await getUserById(currentUser.uid);
      setUserName(userDoc?.name || currentUser.email || 'Driver');
      const adminAccess = await checkAdminAccess(currentUser.email);
      setIsAdmin(adminAccess);
    }

    async function loadLocation() {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      let location = await Location.getLastKnownPositionAsync({});
      if (!location) {
        location = await Location.getCurrentPositionAsync({});
      }

      setUserLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
    }

    loadUser();
    loadLocation();

    const unsubscribe = subscribeToComplexesRealtime((complexData) => {
      setComplexes(complexData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    let isMounted = true;
    let avail = 0;
    let occup = 0;
    let total = 0;

    complexes.forEach((complex) => {
      avail += complex.availableCount;
      occup += complex.occupiedCount + complex.reservedCount;
      total += complex.totalSlots;
    });

    setAvailableCount(avail);
    setBookedCount(occup);
    setTotalSlots(total);

    async function processAreas() {
      if (!userLocation || complexes.length === 0) {
        setNearbyAreas(complexes.map(c => ({...c, distanceStr: null, distanceVal: Infinity})));
        return;
      }

      // 1. Immediately show Haversine distance so the UI never appears empty
      let initialAreas = complexes.map((complex) => {
        let distanceStr = null;
        let distanceVal = Infinity;
        if (complex.lat && complex.lng) {
          distanceVal = calculateDistance(userLocation.latitude, userLocation.longitude, complex.lat, complex.lng);
          distanceStr = formatDistance(distanceVal);
        }
        return { ...complex, distanceStr, distanceVal };
      });
      initialAreas.sort((a, b) => a.distanceVal - b.distanceVal);
      setNearbyAreas([...initialAreas]);

      // 2. Fetch driving distances asynchronously and update
      const validDestinations = complexes.filter(c => c.lat && c.lng).map(c => ({ lat: c.lat, lng: c.lng, id: c.id }));
      if (validDestinations.length > 0) {
        try {
          const distanceResults = await getDrivingDistances(userLocation, validDestinations);
          if (!isMounted) return;

          const updatedAreas = initialAreas.map((complex) => {
            const distData = distanceResults[complex.id];
            if (distData && distData.distanceStr) {
              return { ...complex, ...distData };
            }
            return complex;
          });

          updatedAreas.sort((a, b) => a.distanceVal - b.distanceVal);
          setNearbyAreas(updatedAreas);
        } catch (e) {
          console.warn('Failed to update with driving distances', e);
        }
      }
    }

    processAreas();

    return () => {
      isMounted = false;
    };
  }, [complexes, userLocation]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Hello, {userName}</Text>
        <Text style={styles.headline}>Your smart parking dashboard is ready.</Text>
      </View>

      {activeBooking ? (
        <Pressable style={styles.activeBookingCard} onPress={() => navigation.navigate('Bookings')}>
          <View style={styles.activeBookingHeader}>
            <Text style={styles.activeBookingLabel}>ACTIVE BOOKING</Text>
            <View style={styles.liveIndicator}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>LIVE</Text>
            </View>
          </View>
          <Text style={styles.activeSpotId}>{activeBooking.slotLabel || activeBooking.spotId}</Text>
          <Text style={styles.activeComplexName}>{activeBooking.lodgeName}</Text>
          <Text style={styles.activeTimer}>
            Expires at {new Date(activeBooking.endTime?.toDate ? activeBooking.endTime.toDate() : activeBooking.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </Pressable>
      ) : nearbyAreas.length > 0 && nearbyAreas[0].distanceVal < Infinity ? (
        <Pressable style={styles.closestParkingCard} onPress={() => navigation.navigate('ComplexOverview', { complex: nearbyAreas[0] })}>
          <View style={styles.closestHeader}>
            <Ionicons name="location-sharp" size={16} color={colors.primary} />
            <Text style={styles.closestLabel}>NEAREST PARKING</Text>
          </View>
          <Text style={styles.closestComplexName}>{nearbyAreas[0].name}</Text>
          <View style={styles.closestDetailsRow}>
            <Text style={styles.closestDistance}>{nearbyAreas[0].distanceStr} away</Text>
            <View style={styles.closestDivider} />
            <Text style={styles.closestAvailable}>{nearbyAreas[0].availableCount} open slots</Text>
          </View>
        </Pressable>
      ) : null}

      <View style={styles.statRow}>
        <StatCard label="Available" value={availableCount.toString()} accent={colors.success} />
        <StatCard label="Occupied" value={bookedCount.toString()} accent={colors.danger} />
      </View>

      <View style={styles.statRow}>
        <StatCard label="Total slots" value={totalSlots.toString()} accent={colors.primary} />
        <StatCard label="Areas" value={nearbyAreas.length.toString()} accent={colors.secondaryText} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick actions</Text>
        <View style={styles.actionRow}>
          <ActionCard title="Book Slot" subtitle="Reserve parking now" onPress={() => navigation.navigate('Slots')} color="#E8F8F0" />
          <ActionCard title="View Map" subtitle="See live parking spots" onPress={() => navigation.navigate('Map')} color="#E3F2FD" />
        </View>
        <View style={styles.actionRow}>
          <ActionCard title="History" subtitle="View your bookings" onPress={() => navigation.navigate('Bookings')} color="#FEF4E6" />
          <ActionCard title="Profile" subtitle="Manage your account" onPress={() => navigation.navigate('Profile')} color="#F3F7FF" />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Nearby parking</Text>
        <View style={[styles.nearbyRow, { flexWrap: 'wrap' }]}>
          {nearbyAreas.length > 0 ? (
            nearbyAreas.map((complex) => (
              <Pressable 
                key={complex.id} 
                style={[styles.smallCard, { marginBottom: 16 }]}
                onPress={() => navigation.navigate('ComplexOverview', { complex })}
              >
                <Text style={styles.smallTitle}>{complex.name}</Text>
                <Text style={styles.smallText}>{complex.totalSlots} slots</Text>
                <Text style={styles.smallText}>{complex.availableCount} available</Text>
                {complex.distanceStr && (
                  <Text style={[styles.smallText, { color: colors.primary, fontWeight: '600', marginTop: 4 }]}>
                    {complex.distanceStr} away
                  </Text>
                )}
              </Pressable>
            ))
          ) : (
            <View style={styles.smallCard}>
              <Text style={styles.smallTitle}>No nearby data</Text>
              <Text style={styles.smallText}>Add slots in Firestore to see nearby parking.</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>Smart Parking Dashboard</Text>
        <Text style={styles.infoText}>Track real parking availability and manage bookings with live data.</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 16,
  },
  header: {
    marginBottom: 24,
  },
  greeting: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 10,
  },
  headline: {
    fontSize: 15,
    color: colors.secondaryText,
    lineHeight: 22,
    maxWidth: '90%',
  },
  
  // Active Booking Card Styles
  activeBookingCard: {
    backgroundColor: '#EAF3DE',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#D2E3BE',
  },
  activeBookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  activeBookingLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#27500A',
    letterSpacing: 1,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#791F1F',
    marginRight: 4,
  },
  liveText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#791F1F',
  },
  activeSpotId: {
    fontSize: 32,
    fontWeight: '800',
    color: '#27500A',
  },
  activeComplexName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3B7A0F',
    marginTop: 4,
  },
  activeTimer: {
    fontSize: 14,
    fontWeight: '500',
    color: '#52961D',
    marginTop: 12,
  },

  // Closest Parking Card Styles
  closestParkingCard: {
    backgroundColor: '#E6F1FB',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#C7E0F8',
  },
  closestHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  closestLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 1,
    marginLeft: 6,
  },
  closestComplexName: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1A365D',
  },
  closestDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  closestDistance: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.primary,
  },
  closestDivider: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#C7E0F8',
    marginHorizontal: 10,
  },
  closestAvailable: {
    fontSize: 15,
    fontWeight: '600',
    color: '#27500A',
  },

  statRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  section: {
    marginBottom: 22,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 14,
  },
  nearbyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  smallCard: {
    backgroundColor: colors.panel,
    borderRadius: 18,
    padding: 18,
    width: '100%',
    borderWidth: 1,
    borderColor: colors.border,
  },
  smallTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
  },
  smallText: {
    fontSize: 13,
    color: colors.secondaryText,
    lineHeight: 20,
  },
  actionRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  infoCard: {
    marginTop: 4,
    padding: 20,
    borderRadius: 22,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  infoTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: colors.secondaryText,
    lineHeight: 20,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
});
