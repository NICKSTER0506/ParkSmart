// src/screens/user/TicketScreen.js
import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, StatusBar, ScrollView } from 'react-native';
import { colors } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { ACCELERATOR } from '../../utils/timerConstants';
import { expireBooking } from '../../services/bookingService';

export default function TicketScreen({ route, navigation }) {
  const { booking, slot } = route.params || {};

  const [simRemainingMs, setSimRemainingMs] = useState(0);
  const [progressPct, setProgressPct] = useState(100);
  const [hasExpired, setHasExpired] = useState(false);

  useEffect(() => {
    if (!booking) return;

    const startTimeMs = booking.startTime?.toMillis ? booking.startTime.toMillis() : new Date(booking.startTime).getTime();
    const totalSimDurationMs = booking.durationMinutes * 60 * 1000;

    const updateTimer = async () => {
      if (hasExpired) return;

      const realElapsedMs = Date.now() - startTimeMs;
      const simElapsedMs = realElapsedMs * ACCELERATOR;
      const remaining = totalSimDurationMs - simElapsedMs;

      if (remaining <= 0) {
        setSimRemainingMs(0);
        setProgressPct(0);
        if (!hasExpired) {
          setHasExpired(true);
          try {
            await expireBooking(booking.bookingId || booking.id, booking.slotId, booking.complexId, booking.slotLabel);
            navigation.navigate('UserTabs', { screen: 'Bookings' });
          } catch (error) {
            console.error("Failed to auto-expire booking: ", error);
          }
        }
      } else {
        setSimRemainingMs(remaining);
        setProgressPct(Math.max(0, (remaining / totalSimDurationMs) * 100));
      }
    };

    updateTimer(); // Initial call
    const intervalId = setInterval(updateTimer, 500);

    return () => clearInterval(intervalId);
  }, [booking, hasExpired]);

  if (!booking) {
    return (
      <View style={styles.centered}>
        <Ionicons name="alert-circle-outline" size={48} color="#791F1F" />
        <Text style={styles.errorText}>No ticket loaded.</Text>
        <Pressable onPress={() => navigation.navigate('UserTabs', { screen: 'Slots' })}>
          <Text style={styles.backLinkText}>Go to Slots Grid</Text>
        </Pressable>
      </View>
    );
  }

  // Format date helper
  const formatTime = (timeObj) => {
    if (!timeObj) return '';
    const date = timeObj.toDate ? timeObj.toDate() : new Date(timeObj);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (timeObj) => {
    if (!timeObj) return '';
    const date = timeObj.toDate ? timeObj.toDate() : new Date(timeObj);
    return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatCountdown = (ms) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    const pad = (n) => n.toString().padStart(2, '0');
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  };

  const simMinutesRemaining = simRemainingMs / 60000;
  const isExpiringSoon = simMinutesRemaining > 0 && simMinutesRemaining <= 10;

  return (
    <View style={styles.page}>
      <StatusBar backgroundColor="#F1EFE8" barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.screenTitle}>Digital Ticket</Text>
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {hasExpired ? (
          <View style={[styles.statusBanner, { backgroundColor: '#FCEBEB', borderColor: '#F4C4C4' }]}>
            <Ionicons name="time-outline" size={20} color="#791F1F" />
            <Text style={[styles.statusBannerText, { color: '#791F1F' }]}>Parking time elapsed</Text>
          </View>
        ) : isExpiringSoon ? (
          <View style={[styles.statusBanner, { backgroundColor: '#FAEEDA', borderColor: '#F0D4A8' }]}>
            <Ionicons name="warning-outline" size={20} color="#633806" />
            <Text style={[styles.statusBannerText, { color: '#633806' }]}>Parking expiring soon</Text>
          </View>
        ) : (
          <View style={[styles.statusBanner, { backgroundColor: '#EAF3DE', borderColor: '#D2E3BE' }]}>
            <Ionicons name="checkmark-circle" size={20} color="#27500A" />
            <Text style={[styles.statusBannerText, { color: '#27500A' }]}>Booking Active</Text>
          </View>
        )}

        {/* Timer UI */}
        <View style={styles.timerContainer}>
          <Text style={styles.timerLabel}>REMAINING TIME</Text>
          <Text style={[
            styles.timerValue, 
            hasExpired && { color: '#791F1F' },
            isExpiringSoon && !hasExpired && { color: '#B36B00' }
          ]}>
            {formatCountdown(simRemainingMs)}
          </Text>
          <View style={styles.progressTrack}>
            <View 
              style={[
                styles.progressFill, 
                { width: `${progressPct}%` },
                isExpiringSoon && { backgroundColor: '#FF9800' },
                hasExpired && { backgroundColor: '#F44336' }
              ]} 
            />
          </View>
        </View>

        {/* Ticket Card */}
        <View style={styles.ticketCard}>
          <Text style={styles.ticketLabel}>PARKING SLOT</Text>
          <Text style={styles.slotLabel}>{booking.slotLabel}</Text>
          {slot && (
            <Text style={styles.slotSubLabel}>
              {slot.lodgeName || 'Main Lodge'} • Floor {slot.floor === 0 ? 'Ground' : slot.floor}
            </Text>
          )}
          
          <View style={styles.separator} />

          {/* Fake QR code */}
          <View style={styles.qrContainer}>
            <View style={styles.qrMock}>
              <Ionicons name="qr-code-outline" size={100} color="#2C2C2A" />
            </View>
            <Text style={styles.qrCaption}>Booking reference</Text>
          </View>

          <View style={styles.separator} />

          {/* Details */}
          <View style={styles.detailRow}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>START TIME</Text>
              <Text style={styles.detailValue}>{formatDate(booking.startTime)} {formatTime(booking.startTime)}</Text>
            </View>
            <View style={[styles.detailItem, { alignItems: 'flex-end' }]}>
              <Text style={styles.detailLabel}>VEHICLE TYPE</Text>
              <Text style={[styles.detailValue, { textTransform: 'uppercase' }]}>{booking.vehicleType || 'GENERAL'}</Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>DURATION</Text>
              <Text style={styles.detailValue}>{booking.durationMinutes || booking.duration} minutes</Text>
            </View>
            <View style={[styles.detailItem, { alignItems: 'flex-end' }]}>
              <Text style={styles.detailLabel}>BOOKING ID</Text>
              <Text style={styles.detailValueShort} numberOfLines={1}>
                #{(booking.bookingId || booking.id || '').substring(0, 8).toUpperCase()}
              </Text>
            </View>
          </View>
        </View>

        {/* Dismiss Button */}
        <Pressable
          style={styles.primaryButton}
          onPress={() => {
            navigation.navigate('UserTabs', { screen: 'Bookings' });
          }}
        >
          <Text style={styles.buttonText}>View my bookings</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#F1EFE8',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    alignItems: 'center',
  },
  screenTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2C2C2A',
  },
  container: {
    flexGrow: 1,
    padding: 16,
    justifyContent: 'center',
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  statusBannerText: {
    fontWeight: '700',
    fontSize: 14,
    marginLeft: 8,
  },
  timerContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#D3D1C7',
    marginBottom: 16,
    alignItems: 'center',
  },
  timerLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#888780',
    letterSpacing: 1,
  },
  timerValue: {
    fontSize: 36,
    fontWeight: '900',
    color: '#2C2C2A',
    fontVariant: ['tabular-nums'],
    marginVertical: 8,
  },
  progressTrack: {
    width: '100%',
    height: 8,
    backgroundColor: '#F1EFE8',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 4,
  },
  ticketCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    borderWidth: 1,
    borderColor: '#D3D1C7',
    marginBottom: 24,
  },
  ticketLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#888780',
    letterSpacing: 1,
    textAlign: 'center',
  },
  slotLabel: {
    fontSize: 40,
    fontWeight: '900',
    color: '#2C2C2A',
    textAlign: 'center',
    marginTop: 4,
    letterSpacing: 1,
  },
  slotSubLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#5F5E5A',
    textAlign: 'center',
    marginTop: 4,
  },
  separator: {
    height: 1,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: '#D3D1C7',
    marginVertical: 16,
    borderRadius: 1,
  },
  qrContainer: {
    alignItems: 'center',
    marginVertical: 4,
  },
  qrMock: {
    padding: 8,
    borderWidth: 1,
    borderColor: '#D3D1C7',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  qrCaption: {
    fontSize: 11,
    color: '#888780',
    marginTop: 8,
    fontWeight: '500',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#888780',
    letterSpacing: 0.8,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2C2C2A',
    marginTop: 4,
  },
  detailValueShort: {
    fontSize: 14,
    fontWeight: '700',
    color: '#185FA5',
    marginTop: 4,
  },
  primaryButton: {
    height: 52,
    backgroundColor: colors.primary,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F1EFE8',
    padding: 24,
  },
  errorText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#791F1F',
    marginTop: 12,
    marginBottom: 16,
  },
  backLinkText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
});
