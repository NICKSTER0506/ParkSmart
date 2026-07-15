// src/screens/admin/AdminHomeScreen.js
import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator, ScrollView, RefreshControl, Platform } from 'react-native';
import { getSlotOccupancy, getRecentBookings } from '../../services/adminService';
import { seedDatabase } from '../../utils/seedData';
import { useAuth } from '../../context/AuthContext';
import { colors } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';

export default function AdminHomeScreen({ navigation }) {
  const { currentUser, role, userDoc } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const complexId = role === 'complex_admin' ? userDoc?.complexId : null;
      let occupancyData = await getSlotOccupancy(complexId);
      
      // Auto-seed if database is completely empty and user is super admin
      if (occupancyData.total === 0 && role === 'admin' && !complexId) {
        await seedDatabase();
        occupancyData = await getSlotOccupancy(complexId);
      }
      
      setStats(occupancyData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchData();
    });
    return unsubscribe;
  }, [navigation]);

  if (loading && !stats) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <View style={styles.page}>
      <View style={styles.header}>
        <View>
          <Text style={styles.screenTitle}>Command Centre</Text>
          <Text style={styles.subtitle}>{role === 'complex_admin' ? 'Complex Admin Access' : 'SuperAdmin Access'}</Text>
        </View>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{currentUser?.name?.charAt(0) || 'A'}</Text>
        </View>
      </View>

      <ScrollView
        style={styles.contentContainer}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={fetchData} colors={[colors.primary]} />
        }
      >
        <Text style={styles.sectionHeader}>SYSTEM METRICS</Text>
        <View style={styles.statsGrid}>
          <View style={styles.metricCard}>
            <View style={[styles.iconBox, { backgroundColor: '#E6F1FB' }]}>
              <Ionicons name="cube-outline" size={20} color={colors.primary} />
            </View>
            <Text style={styles.metricValue}>{stats?.total || 0}</Text>
            <Text style={styles.metricLabel}>Total Slots</Text>
          </View>
          <View style={styles.metricCard}>
            <View style={[styles.iconBox, { backgroundColor: '#EAF3DE' }]}>
              <Ionicons name="checkmark-circle-outline" size={20} color="#27500A" />
            </View>
            <Text style={styles.metricValue}>{stats?.available || 0}</Text>
            <Text style={styles.metricLabel}>Available</Text>
          </View>
          <View style={styles.metricCard}>
            <View style={[styles.iconBox, { backgroundColor: '#FCEBEB' }]}>
              <Ionicons name="car-outline" size={20} color="#791F1F" />
            </View>
            <Text style={styles.metricValue}>{stats?.booked || 0}</Text>
            <Text style={styles.metricLabel}>Booked</Text>
          </View>
          <View style={styles.metricCard}>
            <View style={[styles.iconBox, { backgroundColor: '#F1EFE8' }]}>
              <Ionicons name="close-circle-outline" size={20} color="#888780" />
            </View>
            <Text style={styles.metricValue}>{stats?.disabled || 0}</Text>
            <Text style={styles.metricLabel}>Disabled</Text>
          </View>
        </View>

        <Text style={styles.sectionHeader}>QUICK ACTIONS</Text>
        <View style={styles.operationsCard}>
          {role === 'admin' && (
            <>
              <Pressable style={styles.opItem} onPress={() => navigation.navigate('AdminComplexes')}>
                <View style={styles.opLeft}>
                  <View style={styles.opIconBg}>
                    <Ionicons name="business" size={18} color={colors.primary} />
                  </View>
                  <Text style={styles.opText}>Manage Complexes</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#888780" />
              </Pressable>
              <View style={styles.opSeparator} />
            </>
          )}
          <Pressable style={styles.opItem} onPress={() => navigation.navigate('Analytics')}>
            <View style={styles.opLeft}>
              <View style={styles.opIconBg}>
                <Ionicons name="stats-chart" size={18} color={colors.primary} />
              </View>
              <Text style={styles.opText}>View System Analytics</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#888780" />
          </Pressable>
          <View style={styles.opSeparator} />
          <Pressable style={styles.opItem} onPress={() => navigation.navigate('Bookings')}>
            <View style={styles.opLeft}>
              <View style={styles.opIconBg}>
                <Ionicons name="list" size={18} color={colors.primary} />
              </View>
              <Text style={styles.opText}>View All Bookings</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#888780" />
          </Pressable>
          <View style={styles.opSeparator} />
          <Pressable style={styles.opItem} onPress={() => navigation.navigate('AdminReports')}>
            <View style={styles.opLeft}>
              <View style={styles.opIconBg}>
                <Ionicons name="chatbubbles" size={18} color={colors.primary} />
              </View>
              <Text style={styles.opText}>Manage Issue Reports</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#888780" />
          </Pressable>
          <View style={styles.opSeparator} />
          <Pressable style={styles.opItem} onPress={() => navigation.navigate('Profile')}>
            <View style={styles.opLeft}>
              <View style={styles.opIconBg}>
                <Ionicons name="person" size={18} color={colors.primary} />
              </View>
              <Text style={styles.opText}>Admin Settings</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#888780" />
          </Pressable>
        </View>


      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#F1EFE8' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 16,
    paddingBottom: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  screenTitle: { fontSize: 24, fontWeight: '800', color: '#2C2C2A' },
  subtitle: { fontSize: 14, color: '#5F5E5A', marginTop: 4 },
  avatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center'
  },
  avatarText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  contentContainer: { flex: 1 },
  content: { padding: 16, paddingBottom: 16 },
  sectionHeader: {
    fontSize: 11, fontWeight: '700', color: '#888780',
    letterSpacing: 1, marginTop: 16, marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between',
  },
  metricCard: {
    width: '48%', backgroundColor: '#FFFFFF', borderRadius: 12,
    borderWidth: 1, borderColor: '#D3D1C7', padding: 16, marginBottom: 12,
  },
  iconBox: {
    width: 32, height: 32, borderRadius: 8,
    justifyContent: 'center', alignItems: 'center', marginBottom: 10,
  },
  metricValue: { fontSize: 24, fontWeight: '800', color: '#2C2C2A' },
  metricLabel: { fontSize: 12, color: '#5F5E5A', marginTop: 4, fontWeight: '500' },
  operationsCard: {
    backgroundColor: '#FFFFFF', borderRadius: 12,
    borderWidth: 1, borderColor: '#D3D1C7', padding: 8,
  },
  opItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12 },
  opLeft: { flexDirection: 'row', alignItems: 'center' },
  opIconBg: {
    width: 32, height: 32, borderRadius: 8, backgroundColor: '#F1EFE8',
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  opText: { fontSize: 14, fontWeight: '600', color: '#2C2C2A' },
  opSeparator: { height: 1, backgroundColor: '#F1EFE8', marginHorizontal: 12 },

  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F1EFE8' },
  loadingText: { marginTop: 12, fontSize: 14, color: '#5F5E5A' },
});
