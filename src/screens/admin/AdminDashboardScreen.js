// src/screens/admin/AdminDashboardScreen.js
import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator, ScrollView, RefreshControl, Platform } from 'react-native';
import { getSlotOccupancy } from '../../services/adminService';
import { logout } from '../../services/authService';
import { useAuth } from '../../context/AuthContext';
import { colors } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';

export default function AdminDashboardScreen({ navigation }) {
  const { currentUser } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      const data = await getSlotOccupancy();
      setStats(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading && !stats) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={fetchStats} colors={[colors.primary]} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.screenTitle}>Admin Panel</Text>
          <Text style={styles.subtitle}>Welcome back, {currentUser?.name || 'Admin'}</Text>
        </View>
        <Pressable
          style={styles.logoutBtn}
          onPress={handleLogout}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="log-out-outline" size={24} color="#791F1F" />
        </Pressable>
      </View>

      <Text style={styles.sectionHeader}>LIVE OCCUPANCY METRICS</Text>

      {/* Large Rate Card */}
      <View style={styles.occupancyRateCard}>
        <Text style={styles.rateLabel}>LIVE OCCUPANCY RATE</Text>
        <Text style={styles.rateValue}>{stats?.occupancyRate || 0}%</Text>
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${stats?.occupancyRate || 0}%` }]} />
        </View>
        <Text style={styles.rateSub}>
          {stats?.booked || 0} of {stats?.total || 0} slots currently reserved
        </Text>
      </View>

      {/* Grid of stats */}
      <View style={styles.statsGrid}>
        {/* Metric Item: Total */}
        <View style={styles.metricCard}>
          <View style={[styles.iconBox, { backgroundColor: '#E6F1FB' }]}>
            <Ionicons name="cube-outline" size={20} color={colors.primary} />
          </View>
          <Text style={styles.metricValue}>{stats?.total || 0}</Text>
          <Text style={styles.metricLabel}>Total Slots</Text>
        </View>

        {/* Metric Item: Available */}
        <View style={styles.metricCard}>
          <View style={[styles.iconBox, { backgroundColor: '#EAF3DE' }]}>
            <Ionicons name="checkmark-circle-outline" size={20} color="#27500A" />
          </View>
          <Text style={styles.metricValue}>{stats?.available || 0}</Text>
          <Text style={styles.metricLabel}>Available Slots</Text>
        </View>

        {/* Metric Item: Booked */}
        <View style={styles.metricCard}>
          <View style={[styles.iconBox, { backgroundColor: '#FCEBEB' }]}>
            <Ionicons name="car-outline" size={20} color="#791F1F" />
          </View>
          <Text style={styles.metricValue}>{stats?.booked || 0}</Text>
          <Text style={styles.metricLabel}>Booked Slots</Text>
        </View>

        {/* Metric Item: Disabled */}
        <View style={styles.metricCard}>
          <View style={[styles.iconBox, { backgroundColor: '#F1EFE8' }]}>
            <Ionicons name="ban-outline" size={20} color="#888780" />
          </View>
          <Text style={styles.metricValue}>{stats?.disabled || 0}</Text>
          <Text style={styles.metricLabel}>Blocked Slots</Text>
        </View>
      </View>

      {/* Quick Action Navigation Buttons */}
      <Text style={styles.sectionHeader}>QUICK OPERATIONS</Text>
      <View style={styles.operationsCard}>
        <Pressable
          style={styles.opItem}
          onPress={() => navigation.navigate('ManageSlots')}
        >
          <View style={styles.opLeft}>
            <View style={styles.opIconBg}>
              <Ionicons name="list" size={18} color={colors.primary} />
            </View>
            <Text style={styles.opText}>Manage Slot Inventory</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#888780" />
        </Pressable>

        <View style={styles.opSeparator} />

        <Pressable
          style={styles.opItem}
          onPress={() => navigation.navigate('Analytics')}
        >
          <View style={styles.opLeft}>
            <View style={styles.opIconBg}>
              <Ionicons name="trending-up" size={18} color={colors.primary} />
            </View>
            <Text style={styles.opText}>View Booking Analytics</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#888780" />
        </Pressable>

        <View style={styles.opSeparator} />

        <Pressable
          style={styles.opItem}
          onPress={() => navigation.navigate('AdminReports')}
        >
          <View style={styles.opLeft}>
            <View style={styles.opIconBg}>
              <Ionicons name="shield-checkmark" size={18} color={colors.primary} />
            </View>
            <Text style={styles.opText}>Review User Issues</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#888780" />
        </Pressable>
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
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 40 : 10,
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
  logoutBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FCEBEB',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F4C4C4',
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: '#888780',
    letterSpacing: 1,
    marginBottom: 12,
  },
  occupancyRateCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#D3D1C7',
    marginBottom: 20,
  },
  rateLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#888780',
    letterSpacing: 0.8,
  },
  rateValue: {
    fontSize: 48,
    fontWeight: '900',
    color: '#2C2C2A',
    marginTop: 6,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: '#F1EFE8',
    borderRadius: 4,
    marginTop: 12,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 4,
  },
  rateSub: {
    fontSize: 12,
    color: '#5F5E5A',
    marginTop: 10,
    fontWeight: '500',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  metricCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D3D1C7',
    padding: 16,
    marginBottom: 12,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#2C2C2A',
  },
  metricLabel: {
    fontSize: 12,
    color: '#5F5E5A',
    marginTop: 4,
    fontWeight: '500',
  },
  operationsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D3D1C7',
    padding: 8,
  },
  opItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
  },
  opLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  opIconBg: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F1EFE8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  opText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2C2C2A',
  },
  opSeparator: {
    height: 1,
    backgroundColor: '#F1EFE8',
    marginHorizontal: 12,
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
});
