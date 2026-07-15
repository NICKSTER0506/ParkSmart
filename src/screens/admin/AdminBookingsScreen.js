// src/screens/admin/AdminBookingsScreen.js
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Pressable, Platform } from 'react-native';
import { listenToRecentBookings } from '../../services/adminService';
import { colors } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../../context/AuthContext';

export default function AdminBookingsScreen({ navigation }) {
  const { role, userDoc } = useAuth();
  const [allBookings, setAllBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribe;
    const setupListener = () => {
      setLoading(true);
      const complexId = role === 'complex_admin' ? userDoc?.complexId : null;
      unsubscribe = listenToRecentBookings(50, (data) => {
        setAllBookings(data);
        setLoading(false);
      }, complexId);
    };

    const navUnsubscribe = navigation.addListener('focus', () => {
      if (!unsubscribe) setupListener();
    });

    const blurUnsubscribe = navigation.addListener('blur', () => {
      if (unsubscribe) {
        unsubscribe();
        unsubscribe = null;
      }
    });

    // Initial setup if screen is already focused
    setupListener();

    return () => {
      navUnsubscribe();
      blurUnsubscribe();
      if (unsubscribe) unsubscribe();
    };
  }, [navigation]);

  // Calculate Stats
  const activeCount = allBookings.filter(b => b.status === 'active').length;
  const completedCount = allBookings.filter(b => b.status === 'completed').length;

  // Show only active
  const displayedBookings = allBookings.filter(b => b.status === 'active');

  if (loading && allBookings.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.page}>
      <View style={styles.header}>
        <Text style={styles.screenTitle}>Bookings</Text>
        <Text style={styles.subtitle}>Global read-only visibility</Text>
      </View>



      <ScrollView style={styles.listContainer} contentContainerStyle={styles.list}>
        {displayedBookings.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="list-outline" size={48} color="#888780" />
            <Text style={styles.emptyTitle}>No bookings found</Text>
          </View>
        ) : (
          displayedBookings.map((booking) => {
            const isActive = booking.status === 'active';
            const isCompleted = booking.status === 'completed';
            return (
              <View key={booking.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View>
                    <Text style={styles.spotText}>Slot: {booking.slotLabel || booking.spotId || 'Unknown'}</Text>
                    {role === 'admin' && booking.lodgeName && (
                      <Text style={styles.complexText}>{booking.lodgeName}</Text>
                    )}
                  </View>
                  <View style={[styles.statusBadge, styles.badgeActive]}>
                    <Text style={[styles.badgeText, styles.textActive]}>ACTIVE</Text>
                  </View>
                </View>
                
                <View style={styles.cardBody}>
                  <Text style={styles.userIdText}>Booked By: {booking.userId || 'N/A'}</Text>
                  <Text style={styles.timeText}>
                    Time: {booking.createdAt?.seconds ? new Date(booking.createdAt.seconds * 1000).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : 'N/A'}
                  </Text>
                  <Text style={styles.priceText}>Cost: ₹{(booking.hours || 0) * 50} ({booking.hours || 0} hrs @ ₹50/hr)</Text>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Stats Bar at bottom */}
      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{activeCount}</Text>
          <Text style={styles.statLabel}>Active Now</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{completedCount}</Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#F1EFE8' },
  header: { paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 60 : 16, paddingBottom: 16, backgroundColor: '#FFFFFF' },
  screenTitle: { fontSize: 24, fontWeight: '800', color: '#2C2C2A' },
  subtitle: { fontSize: 14, color: '#5F5E5A', marginTop: 4 },
  listContainer: { flex: 1 },
  list: { padding: 16, paddingBottom: 24 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#D3D1C7', padding: 16, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  spotText: { fontSize: 16, fontWeight: '800', color: '#2C2C2A' },
  complexText: { fontSize: 11, color: '#888780', marginTop: 2, fontWeight: '600' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginTop: 2 },
  badgeActive: { backgroundColor: '#EAF3DE' },
  badgeCompleted: { backgroundColor: '#F1EFE8' },
  badgeDefault: { backgroundColor: '#FCEBEB' },
  badgeText: { fontSize: 10, fontWeight: '700' },
  textActive: { color: '#27500A' },
  textCompleted: { color: '#5F5E5A' },
  textDefault: { color: '#791F1F' },
  cardBody: { gap: 4 },
  userIdText: { fontSize: 13, color: '#5F5E5A' },
  timeText: { fontSize: 13, color: '#5F5E5A' },
  priceText: { fontSize: 14, fontWeight: '700', color: '#2C2C2A', marginTop: 4 },
  statsBar: { flexDirection: 'row', backgroundColor: '#FFFFFF', paddingVertical: 16, borderTopWidth: 1, borderColor: '#D3D1C7' },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '800', color: '#2C2C2A' },
  statLabel: { fontSize: 12, color: '#888780', marginTop: 2, fontWeight: '600' },
  statDivider: { width: 1, backgroundColor: '#D3D1C7', marginVertical: 8 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F1EFE8' },
  emptyContainer: { alignItems: 'center', padding: 40 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#2C2C2A', marginTop: 16 },
});
