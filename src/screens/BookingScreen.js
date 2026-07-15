import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { colors } from '../constants/theme';
import ParkingSlot from '../components/ParkingSlot';
import { getCurrentUser } from '../services/auth';
import { subscribeToSlotsRealtime } from '../services/firestore';

const getTrafficPrediction = () => {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 12) {
    return 'High traffic ahead — reserve early.';
  }
  if (hour >= 12 && hour < 18) {
    return 'Medium traffic zone — pick a nearby slot.';
  }
  return 'Low traffic available — ideal for a quick stop.';
};

export default function BookingScreen({ navigation }) {
  const [slots, setSlots] = useState([]);
  const [selectedSlotId, setSelectedSlotId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToSlotsRealtime((slotList) => {
      setSlots(slotList);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const selectedSlot = slots.find((slot) => slot.id === selectedSlotId);

  const handleContinue = () => {
    if (!selectedSlot) {
      Alert.alert('Pick a slot first', 'Select an available slot to continue.');
      return;
    }
    navigation.navigate('Confirmation', { selectedSlot });
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.pageContent}>
      <Text style={styles.heading}>Choose your parking slot</Text>
      <Text style={styles.subtitle}>{getTrafficPrediction()}</Text>

      <View style={styles.grid}>
        {slots.map((slot) => (
          <ParkingSlot
            key={slot.id}
            label={slot.slotId || slot.id}
            status={slot.status || 'available'}
            selected={selectedSlotId === slot.id}
            onPress={() => {
              if (slot.status === 'available') {
                setSelectedSlotId(slot.id);
              }
            }}
          />
        ))}
      </View>

      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>Selected slot</Text>
        <Text style={styles.summaryValue}>{selectedSlot ? selectedSlot.slotId || selectedSlot.id : 'None selected'}</Text>
        <Text style={styles.summaryExtra}>{selectedSlot?.parkingArea || 'Choose a slot to see details'}</Text>
      </View>

      <Pressable
        style={[styles.bookButton, !selectedSlot && styles.bookButtonDisabled]}
        onPress={handleContinue}
        disabled={!selectedSlot}
      >
        <Text style={styles.bookButtonText}>Continue to confirmation</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: colors.background,
  },
  pageContent: {
    padding: 20,
  },
  heading: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 6,
  },
  subtitle: {
    color: colors.secondaryText,
    marginBottom: 22,
    lineHeight: 22,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  summaryCard: {
    backgroundColor: colors.panel,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 24,
  },
  summaryLabel: {
    fontSize: 14,
    color: colors.secondaryText,
    marginBottom: 6,
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
  },
  bookButton: {
    backgroundColor: colors.primary,
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
  },
  bookButtonDisabled: {
    backgroundColor: '#A0D1A4',
  },
  bookButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
});

