// src/screens/user/HistoryScreen.js
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { useParking } from '../../context/ParkingContext';
import { cancelBooking, expireBooking } from '../../services/bookingService';
import { triggerCustomAlert } from '../../utils/alertService';
import { ACCELERATOR } from '../../utils/timerConstants';
import { colors } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';

export default function HistoryScreen({ navigation }) {
  const { bookingHistory, activeBooking, historyLoading, refreshHistory } = useParking();
  const [cancellingId, setCancellingId] = useState(null);
  const [simRemainingMs, setSimRemainingMs] = useState(0);

  useEffect(() => {
    refreshHistory();
  }, []);

  useEffect(() => {
    if (!activeBooking) return;

    const startTimeMs = activeBooking.startTime?.toMillis ? activeBooking.startTime.toMillis() : new Date(activeBooking.startTime).getTime();
    const totalSimDurationMs = (activeBooking.durationMinutes || activeBooking.duration) * 60 * 1000;

    const updateTimer = async () => {
      const realElapsedMs = Date.now() - startTimeMs;
      const simElapsedMs = realElapsedMs * ACCELERATOR;
      const remaining = totalSimDurationMs - simElapsedMs;

      if (remaining <= 0) {
        setSimRemainingMs(0);
        // Prevent multiple calls by setting a flag on the object
        if (!activeBooking._isExpiring) {
          activeBooking._isExpiring = true;
          try {
            await expireBooking(activeBooking.bookingId || activeBooking.id, activeBooking.slotId, activeBooking.complexId, activeBooking.slotLabel);
            await refreshHistory();
          } catch (error) {
            console.error("Auto expire failed in history:", error);
            activeBooking._isExpiring = false;
          }
        }
      } else {
        setSimRemainingMs(remaining);
      }
    };

    updateTimer();
    const intervalId = setInterval(updateTimer, 500);

    return () => clearInterval(intervalId);
  }, [activeBooking]);

  const handleCancelPress = (bookingId, slotId) => {
    triggerCustomAlert(
      'Cancel Booking',
      'Are you sure you want to cancel this booking? This will release the slot immediately.',
      [
        { text: 'No, keep it', style: 'cancel' },
        {
          text: 'Yes, cancel',
          style: 'destructive',
          onPress: async () => {
            setCancellingId(bookingId);
            try {
              await cancelBooking(bookingId, slotId);
              await refreshHistory();
            } catch (err) {
              console.error(err);
            } finally {
              setCancellingId(null);
            }
          },
        },
      ]
    );
  };

  const formatTime = (timeObj) => {
    if (!timeObj) return '';
    const date = timeObj.toDate ? timeObj.toDate() : new Date(timeObj);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (timeObj) => {
    if (!timeObj) return '';
    const date = timeObj.toDate ? timeObj.toDate() : new Date(timeObj);
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const formatCountdown = (ms) => {
    if (ms <= 0) return '00:00:00';
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    const pad = (n) => n.toString().padStart(2, '0');
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  };

  // Filter history to display only completed/cancelled bookings
  const pastBookings = bookingHistory.filter((b) => b.status !== 'active');

  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={historyLoading} onRefresh={refreshHistory} colors={[colors.primary]} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.screenTitle}>My Bookings</Text>
        <Text style={styles.subtitle}>Pull down to refresh details</Text>
      </View>

      {/* ACTIVE BOOKINGS SECTION */}
      {activeBooking ? (
        <View style={styles.activeSection}>
          <Text style={styles.sectionHeader}>ACTIVE RESERVATION</Text>
          <Pressable
            style={styles.activeCard}
            onPress={() => {
              // Navigate to Ticket screen to show details / QR
              navigation.navigate('Ticket', { booking: activeBooking });
            }}
          >
            <View style={styles.activeHeader}>
              <View style={styles.activePill}>
                <View style={styles.activeDot} />
                <Text style={styles.activePillText}>Active Now</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#27500A" />
            </View>

            <View style={styles.activeSlotRow}>
              <Text style={styles.activeSlotLabel}>{activeBooking.slotLabel}</Text>
              <View>
                <Text style={styles.activeTimeLabel}>TIME REMAINING</Text>
                <Text style={styles.activeTimeValue}>{formatCountdown(simRemainingMs)}</Text>
              </View>
            </View>

            <View style={styles.separator} />

            <Pressable
              style={[styles.cancelButton, cancellingId === activeBooking.bookingId && styles.disabledButton]}
              onPress={(e) => {
                e.stopPropagation(); // Avoid parent Pressable navigation
                handleCancelPress(activeBooking.bookingId, activeBooking.slotId);
              }}
              disabled={cancellingId === activeBooking.bookingId}
            >
              {cancellingId === activeBooking.bookingId ? (
                <ActivityIndicator color="#791F1F" size="small" />
              ) : (
                <View style={styles.cancelBtnRow}>
                  <Ionicons name="close-circle-outline" size={18} color="#791F1F" />
                  <Text style={styles.cancelButtonText}>Cancel Reservation</Text>
                </View>
              )}
            </Pressable>
          </Pressable>
        </View>
      ) : null}

      {/* HISTORY SECTION */}
      <Text style={styles.sectionHeader}>PAST BOOKINGS</Text>

      {pastBookings.length > 0 ? (
        pastBookings.map((booking) => {
          const isCancelled = booking.status === 'cancelled';
          return (
            <View key={booking.id} style={styles.pastCard}>
              <View style={styles.pastRow}>
                <View>
                  <Text style={styles.pastSlot}>{booking.slotLabel}</Text>
                  <Text style={styles.pastSub}>
                    {formatDate(booking.startTime)} • {booking.durationMinutes || booking.duration} mins
                  </Text>
                </View>

                <View style={[styles.statusBadge, isCancelled ? styles.badgeCancelled : styles.badgeCompleted]}>
                  <Text style={[styles.statusBadgeText, isCancelled ? styles.textCancelled : styles.textCompleted]}>
                    {isCancelled ? 'Cancelled' : 'Completed'}
                  </Text>
                </View>
              </View>
            </View>
          );
        })
      ) : !activeBooking && !historyLoading ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="calendar-outline" size={48} color="#888780" style={{ marginBottom: 12 }} />
          <Text style={styles.emptyTitle}>No bookings yet</Text>
          <Text style={styles.emptySubtitle}>You haven't made any parking reservations.</Text>
          <Pressable
            style={styles.emptyLink}
            onPress={() => navigation.navigate('Slots')}
          >
            <Text style={styles.emptyLinkText}>Find an available slot</Text>
            <Ionicons name="arrow-forward-outline" size={16} color={colors.primary} style={{ marginLeft: 6 }} />
          </Pressable>
        </View>
      ) : historyLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />
      ) : null}
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
    marginBottom: 20,
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
  activeSection: {
    marginBottom: 24,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: '#888780',
    letterSpacing: 1,
    marginBottom: 10,
  },
  activeCard: {
    backgroundColor: '#EAF3DE', // success tint
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D2E3BE',
    padding: 16,
  },
  activeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  activePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#27500A',
    marginRight: 6,
  },
  activePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#27500A',
  },
  activeSlotRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  activeSlotLabel: {
    fontSize: 32,
    fontWeight: '800',
    color: '#2C2C2A',
  },
  activeTimeLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#888780',
    letterSpacing: 0.5,
    textAlign: 'right',
  },
  activeTimeValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#2C2C2A',
    marginTop: 2,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
  separator: {
    height: 1,
    backgroundColor: '#D2E3BE',
    marginVertical: 12,
  },
  cancelButton: {
    backgroundColor: '#FCEBEB', // red alert tint
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F4C4C4',
  },
  cancelBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#791F1F',
    fontWeight: '700',
    fontSize: 13,
    marginLeft: 6,
  },
  disabledButton: {
    opacity: 0.7,
  },
  pastCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D3D1C7',
    padding: 16,
    marginBottom: 10,
  },
  pastRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pastSlot: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2C2C2A',
  },
  pastSub: {
    fontSize: 12,
    color: '#5F5E5A',
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeCompleted: {
    backgroundColor: '#F1EFE8',
  },
  badgeCancelled: {
    backgroundColor: '#FCEBEB',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  textCompleted: {
    color: '#5F5E5A',
  },
  textCancelled: {
    color: '#791F1F',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D3D1C7',
    padding: 24,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2C2C2A',
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#5F5E5A',
    marginTop: 4,
    textAlign: 'center',
  },
  emptyLink: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
  },
  emptyLinkText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
});
