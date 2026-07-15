import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { colors } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import { useParking } from '../../context/ParkingContext';
import { getRecommendedSlot } from '../../services/aiService';
export default function SlotGridScreen({ route, navigation }) {
  const { complexId, floorNum, distanceStr } = route.params || {};
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);

  const { userDoc } = useAuth();
  const { bookingHistory } = useParking();

  const recommendedSlot = React.useMemo(() => {
    if (!slots.length || !userDoc) return null;
    return getRecommendedSlot(slots, bookingHistory, userDoc.vehicleType);
  }, [slots, bookingHistory, userDoc]);

  useEffect(() => {
    if (!complexId || !floorNum) return;

    const q = query(
      collection(db, 'slots'),
      where('complexId', '==', complexId),
      where('floor', '==', parseInt(floorNum))
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedSlots = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Sort: Available first, then alphabetically by label
      fetchedSlots.sort((a, b) => {
        if (a.status === 'available' && b.status !== 'available') return -1;
        if (a.status !== 'available' && b.status === 'available') return 1;
        return a.label.localeCompare(b.label);
      });

      setSlots(fetchedSlots);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [complexId, floorNum]);

  const getSlotColor = (status) => {
    switch (status) {
      case 'available': return { fill: '#EAF3DE', text: '#27500A', border: '#D2E3BE' };
      case 'booked': return { fill: '#FCEBEB', text: '#791F1F', border: '#F4C4C4' };
      case 'occupied': return { fill: '#FCEBEB', text: '#791F1F', border: '#F4C4C4' };
      case 'reserved': return { fill: '#FEF4E6', text: '#9A6314', border: '#FDE0B2' };
      case 'maintenance': return { fill: '#F1EFE8', text: '#888780', border: '#D3D1C7' };
      default: return { fill: '#F1EFE8', text: '#888780', border: '#D3D1C7' };
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading floor layout...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
        <Ionicons name="arrow-back" size={24} color="#2C2C2A" />
      </Pressable>

      <View style={styles.header}>
        <Text style={styles.screenTitle}>Floor {floorNum} Slots</Text>
        {distanceStr ? (
          <Text style={[styles.subtitle, { color: colors.primary, fontWeight: '700' }]}>{distanceStr} away • Tap an available slot • ₹50/hr</Text>
        ) : (
          <Text style={styles.subtitle}>Tap an available slot to book it • ₹50/hr</Text>
        )}
      </View>

      <View style={styles.floorSection}>
        <View style={styles.grid}>
          {slots.map((slot) => {
            const colorsSpec = getSlotColor(slot.status);
            const isTappable = slot.status === 'available';
            const isRecommended = recommendedSlot && recommendedSlot.id === slot.id;

            return (
              <Pressable
                key={slot.id}
                style={[
                  styles.slotCell, 
                  { backgroundColor: colorsSpec.fill, borderColor: colorsSpec.border },
                  isRecommended && styles.recommendedSlotCell
                ]}
                onPress={() => isTappable && navigation.navigate('SlotDetail', { slot })}
                disabled={!isTappable}
              >
                {isRecommended && (
                  <View style={styles.recommendedBadge}>
                    <Text style={styles.recommendedBadgeText}>✨ BEST</Text>
                  </View>
                )}
                <Text style={[styles.slotLabel, { color: colorsSpec.text }]}>
                  {slot.label} {slot.isHandicap ? '♿' : ''}
                </Text>
                <Text style={[styles.slotStatusLabel, { color: colorsSpec.text }]}>
                  {slot.status}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.legendContainer}>
        <Text style={styles.legendHeader}>LEGEND</Text>
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendBox, { backgroundColor: '#EAF3DE', borderColor: '#D2E3BE' }]} />
            <Text style={styles.legendText}>Available</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendBox, { backgroundColor: '#FCEBEB', borderColor: '#F4C4C4' }]} />
            <Text style={styles.legendText}>Occupied</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendBox, { backgroundColor: '#FEF4E6', borderColor: '#FDE0B2' }]} />
            <Text style={styles.legendText}>Reserved</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendBox, { backgroundColor: '#F1EFE8', borderColor: '#D3D1C7' }]} />
            <Text style={styles.legendText}>Maint.</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#F1EFE8',
  },
  content: {
    padding: 16,
    paddingBottom: 16,
  },
  header: {
    marginBottom: 24,
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#2C2C2A',
  },
  subtitle: {
    fontSize: 13,
    color: '#5F5E5A',
    marginTop: 4,
  },
  lodgeSection: {
    marginBottom: 24,
  },
  lodgeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  lodgeTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#2C2C2A',
    marginLeft: 8,
  },
  floorSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#D3D1C7',
  },
  floorHeader: {
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1EFE8',
  },
  floorTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#5F5E5A',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  slotCell: {
    width: '29%',
    aspectRatio: 1,
    borderRadius: 6,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    margin: '2%',
    minHeight: 48,
  },
  slotLabel: {
    fontSize: 16,
    fontWeight: '700',
  },
  slotStatusLabel: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 4,
    textTransform: 'uppercase',
  },
  recommendedSlotCell: {
    borderWidth: 2,
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
    transform: [{ scale: 1.05 }],
    zIndex: 10,
  },
  recommendedBadge: {
    position: 'absolute',
    top: -8,
    backgroundColor: colors.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    zIndex: 11,
  },
  recommendedBadgeText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: '900',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F1EFE8',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#5F5E5A',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2C2C2A',
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#5F5E5A',
    marginTop: 4,
    textAlign: 'center',
  },
  legendContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#D3D1C7',
  },
  legendHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: '#888780',
    letterSpacing: 1,
    marginBottom: 10,
    textAlign: 'center',
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendBox: {
    width: 16,
    height: 16,
    borderWidth: 1,
    borderRadius: 4,
    marginRight: 6,
  },
  legendText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#5F5E5A',
  },
});
