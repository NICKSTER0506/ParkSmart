import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, ActivityIndicator, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { colors } from '../../constants/theme';
import { subscribeToComplexesRealtime } from '../../services/firestore';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { calculateDistance, formatDistance, getDrivingDistances } from '../../utils/distance';
import { useAuth } from '../../context/AuthContext';

export default function ComplexListScreen({ navigation }) {
  const { userDoc } = useAuth();
  const [complexes, setComplexes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState(null);
  const [processedComplexes, setProcessedComplexes] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');

  const FILTER_CHIPS = [
    { id: 'all',      label: 'All'               },
    { id: 'favorites',label: '⭐ Favorites'      },
    { id: 'nearest',  label: 'Nearest'           },
    { id: 'cars',     label: 'Available Cars'    },
    { id: 'bikes',    label: 'Available Bikes'   },
    { id: 'most',     label: 'Most Available'    },
  ];

  const handleChipPress = (chipId) => {
    if (chipId === 'nearest' && !userLocation) return;
    if (chipId === activeFilter && chipId !== 'all') {
      setActiveFilter('all');
    } else {
      setActiveFilter(chipId);
    }
  };

  useEffect(() => {
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
    loadLocation();

    const unsubscribe = subscribeToComplexesRealtime((data) => {
      setComplexes(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    let isMounted = true;
    async function processAreas() {
      if (!userLocation || complexes.length === 0) {
        setProcessedComplexes(complexes.map(c => ({...c, distanceStr: null, distanceVal: Infinity})));
        return;
      }

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
      setProcessedComplexes([...initialAreas]);

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
          setProcessedComplexes(updatedAreas);
        } catch (e) {
          console.warn('Failed to update with driving distances', e);
        }
      }
    }
    processAreas();
    return () => { isMounted = false; };
  }, [complexes, userLocation]);

  const filteredComplexes = useMemo(() => {
    let result = [...processedComplexes];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(c =>
        c.name.toLowerCase().includes(q) ||
        (c.location && c.location.toLowerCase().includes(q))
      );
    }

    switch (activeFilter) {
      case 'favorites':
        const favs = userDoc?.favorites || [];
        result = result.filter(c => favs.includes(c.id));
        break;
      case 'cars':
        result = result.filter(c => c.carAvailable > 0);
        break;
      case 'bikes':
        result = result.filter(c => c.bikeAvailable > 0);
        break;
      case 'most':
        result.sort((a, b) => b.availableCount - a.availableCount);
        break;
      case 'nearest':
        if (userLocation) {
          result.sort((a, b) => a.distanceVal - b.distanceVal);
        }
        break;
      default:
        break;
    }

    return result;
  }, [processedComplexes, searchQuery, activeFilter, userLocation, userDoc]);

  const isFilterActive = searchQuery.trim() !== '' || activeFilter !== 'all';

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading complexes...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.page}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.screenTitle}>Select Complex</Text>
          <Text style={styles.subtitle}>Choose a parking location to view available slots</Text>
        </View>

        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#888780" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search by name or area..."
            placeholderTextColor="#888780"
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')} style={styles.clearBtn}>
              <Ionicons name="close-circle" size={20} color="#888780" />
            </Pressable>
          )}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsContainer}>
          {FILTER_CHIPS.map(chip => (
            <Pressable
              key={chip.id}
              onPress={() => handleChipPress(chip.id)}
              disabled={chip.id === 'nearest' && !userLocation}
              style={[
                styles.chip,
                activeFilter === chip.id && styles.activeChip,
                chip.id === 'nearest' && !userLocation && styles.disabledChip
              ]}
            >
              {chip.id === 'nearest' && !userLocation && (
                <Ionicons name="lock-closed" size={12} color="#888780" style={{ marginRight: 4 }} />
              )}
              <Text style={[
                styles.chipText,
                activeFilter === chip.id && styles.activeChipText
              ]}>{chip.label}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {filteredComplexes.length > 0 && (
          <Text style={styles.resultCountText}>
            {filteredComplexes.length} complex{filteredComplexes.length !== 1 ? 'es' : ''}
            {isFilterActive ? ' found' : ''}
          </Text>
        )}

        {filteredComplexes.length > 0 ? (
          filteredComplexes.map((complex) => (
          <Pressable 
            key={complex.id} 
            style={styles.card}
            onPress={() => navigation.navigate('ComplexOverview', { complex })}
          >
            <View style={styles.cardHeader}>
              <View style={styles.iconContainer}>
                <Ionicons name="business-outline" size={24} color={colors.primary} />
              </View>
              <View style={styles.cardTitleContainer}>
                <Text style={styles.cardTitle}>{complex.name}</Text>
                {complex.location && (
                  <Text style={styles.cardLocation}>{complex.location}</Text>
                )}
                {complex.distanceStr ? (
                  <Text style={[styles.cardSubtitle, { color: colors.primary, fontWeight: '600' }]}>{complex.distanceStr} away • {complex.totalSlots} Slots</Text>
                ) : (
                  <Text style={styles.cardSubtitle}>Total Capacity: {complex.totalSlots}</Text>
                )}
              </View>
            </View>

            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{complex.availableCount}</Text>
                <Text style={styles.statLabel}>Available</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={[styles.statValue, { color: '#27500A' }]}>{complex.bikeAvailable}</Text>
                <Text style={styles.statLabel}>Bikes Free</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={[styles.statValue, { color: '#1D4ED8' }]}>{complex.carAvailable}</Text>
                <Text style={styles.statLabel}>Cars Free</Text>
              </View>
            </View>
          </Pressable>
        ))
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons name="car-sport-outline" size={64} color="#D3D1C7" />
          <Text style={styles.emptyTitle}>No complexes found</Text>
          <Text style={styles.emptySubtitle}>
            {searchQuery && activeFilter !== 'all' ? `No results for "${searchQuery}" with this filter.` : 
             searchQuery ? `No results for "${searchQuery}".` : 
             activeFilter !== 'all' ? "No complexes match this filter." : 
             "Please run the Database Seed in the Admin Dashboard."}
          </Text>
          {isFilterActive && (
            <Pressable style={styles.clearFilterBtn} onPress={() => { setSearchQuery(''); setActiveFilter('all'); }}>
              <Text style={styles.clearFilterText}>Clear search & filters</Text>
            </Pressable>
          )}
        </View>
      )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#F1EFE8' },
  content: { padding: 16, paddingBottom: 16 },
  header: { marginBottom: 16 },
  screenTitle: { fontSize: 28, fontWeight: '800', color: '#2C2C2A' },
  subtitle: { fontSize: 14, color: '#5F5E5A', marginTop: 4 },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D3D1C7',
    paddingHorizontal: 12,
    height: 48,
    marginBottom: 16,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 15, color: '#2C2C2A' },
  clearBtn: { padding: 4 },
  chipsContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    maxHeight: 36,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#D3D1C7',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    height: 36,
  },
  activeChip: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  disabledChip: {
    opacity: 0.4,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#5F5E5A',
  },
  activeChipText: {
    color: '#FFFFFF',
  },
  resultCountText: {
    fontSize: 12,
    color: '#888780',
    marginBottom: 12,
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#D3D1C7',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  iconContainer: {
    backgroundColor: '#EAF3DE',
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  cardTitleContainer: { flex: 1 },
  cardTitle: { fontSize: 18, fontWeight: '800', color: '#2C2C2A', marginBottom: 2 },
  cardLocation: { fontSize: 13, color: '#5F5E5A', marginBottom: 4 },
  cardSubtitle: { fontSize: 13, color: '#5F5E5A' },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F9F9F8',
    borderRadius: 12,
    padding: 12,
  },
  statBox: { alignItems: 'center', flex: 1 },
  statValue: { fontSize: 20, fontWeight: '800', color: '#2C2C2A' },
  statLabel: { fontSize: 11, color: '#888780', marginTop: 4, textTransform: 'uppercase', fontWeight: '600' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F1EFE8' },
  loadingText: { marginTop: 12, fontSize: 14, color: '#5F5E5A' },
  emptyContainer: { alignItems: 'center', marginTop: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#2C2C2A', marginTop: 16 },
  emptySubtitle: { fontSize: 14, color: '#888780', marginTop: 8, textAlign: 'center', paddingHorizontal: 20 },
  clearFilterBtn: {
    marginTop: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#E6F1FB',
    borderRadius: 8,
  },
  clearFilterText: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 14,
  }
});
