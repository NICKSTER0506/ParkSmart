import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { colors } from '../constants/theme';
import { getCurrentUser } from '../services/auth';
import { createBooking, updateSlotStatus } from '../services/firestore';

export default function ConfirmationScreen({ navigation, route }) {
  const { selectedSlot } = route.params || {};
  const [loading, setLoading] = useState(false);

  if (!selectedSlot) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>No slot selected.</Text>
        <Pressable style={styles.primaryButton} onPress={() => navigation.replace('Booking')}>
          <Text style={styles.primaryButtonText}>Choose a slot</Text>
        </Pressable>
      </View>
    );
  }

  const handleConfirm = async () => {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      Alert.alert('Authentication required', 'Please login to confirm booking.');
      navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
      return;
    }

    setLoading(true);
    try {
      const booking = await createBooking({
        userId: currentUser.uid,
        slotId: selectedSlot.id,
        status: 'active',
        durationHours: 1,
      });
      await updateSlotStatus(selectedSlot.id, 'occupied');
      navigation.replace('Ticket', { booking, slot: selectedSlot });
    } catch (error) {
      Alert.alert('Booking failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.page}>
      <Text style={styles.heading}>Confirm your booking</Text>
      <View style={styles.card}>
        <Text style={styles.label}>Slot</Text>
        <Text style={styles.value}>{selectedSlot.slotId || selectedSlot.id}</Text>
        <Text style={styles.label}>Area</Text>
        <Text style={styles.value}>{selectedSlot.parkingArea || 'Campus Lot'}</Text>
        <Text style={styles.label}>Status</Text>
        <Text style={styles.value}>{selectedSlot.status || 'available'}</Text>
      </View>

      <Pressable style={styles.primaryButton} onPress={handleConfirm} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Confirm booking</Text>}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 24,
  },
  heading: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 18,
  },
  card: {
    backgroundColor: colors.panel,
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    color: colors.secondaryText,
    marginTop: 16,
  },
  value: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginTop: 6,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: colors.background,
  },
  errorText: {
    fontSize: 18,
    color: colors.danger,
    marginBottom: 18,
    textAlign: 'center',
  },
});
