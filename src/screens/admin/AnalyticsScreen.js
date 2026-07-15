import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Dimensions, Platform } from 'react-native';
import { BarChart } from 'react-native-chart-kit';
import { fetchAnalyticsData, fetchTotalBookingsCount } from '../../services/aiService';
import { getSlotOccupancy } from '../../services/adminService';
import { colors } from '../../constants/theme';

import { useAuth } from '../../context/AuthContext';

const screenWidth = Dimensions.get('window').width;

export default function AnalyticsScreen({ navigation }) {
  const { role, userDoc } = useAuth();
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null);
  const [totalBookings, setTotalBookings] = useState(0);
  const [occupancy, setOccupancy] = useState(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const complexId = role === 'complex_admin' ? userDoc?.complexId : null;
      const [stats, totalCount, occupancyData] = await Promise.all([
        fetchAnalyticsData(complexId),
        fetchTotalBookingsCount(complexId),
        getSlotOccupancy(complexId)
      ]);
      setAnalytics(stats);
      setTotalBookings(totalCount);
      setOccupancy(occupancyData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadData();
    });
    return unsubscribe;
  }, [navigation]);

  if (loading && !analytics) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // Section 1: Metrics
  const activeNow = occupancy?.booked || 0;
  const totalCapacity = occupancy?.total || 1200; // avoid div by 0, default 1200
  const capacityUsedPercent = Math.round((activeNow / totalCapacity) * 100);

  // Section 2: Bar Chart config
  const chartConfig = {
    backgroundGradientFrom: '#FFFFFF',
    backgroundGradientTo: '#FFFFFF',
    color: (opacity = 1) => `rgba(15, 110, 86, ${opacity})`,
    labelColor: (opacity = 1) => `#5F5E5A`,
    strokeWidth: 2,
    barPercentage: 0.5,
    useShadowColorFromDataset: false,
    decimalPlaces: 0,
    propsForBackgroundLines: {
      strokeWidth: 0
    }
  };

  // Section 3: Occupancy logic
  const getPillData = (percent) => {
    if (percent > 75) return { label: 'Peak', bg: '#FCEBEB', text: '#791F1F' };
    if (percent > 50) return { label: 'High', bg: '#FEF4E6', text: '#9A6314' };
    if (percent > 25) return { label: 'Normal', bg: '#E6F1FB', text: '#125D98' };
    return { label: 'Low', bg: '#EAF3DE', text: '#27500A' };
  };

  return (
    <View style={styles.page}>
      <View style={styles.header}>
        <Text style={styles.screenTitle}>Analytics</Text>
        <Text style={styles.subtitle}>System-wide trends and insights</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        
        {/* SECTION 1: Live System Health */}
        <Text style={styles.sectionTitle}>LIVE SYSTEM HEALTH</Text>
        <View style={styles.healthGrid}>
          <View style={styles.healthCard}>
            <Text style={styles.healthValue}>{activeNow}</Text>
            <Text style={styles.healthLabel}>Active Now</Text>
          </View>
          <View style={styles.healthCard}>
            <Text style={styles.healthValue}>{totalCapacity}</Text>
            <Text style={styles.healthLabel}>Total Capacity</Text>
          </View>
          <View style={styles.healthCard}>
            <Text style={styles.healthValue}>{totalBookings}</Text>
            <Text style={styles.healthLabel}>Total Bookings</Text>
          </View>
          <View style={styles.healthCard}>
            <Text style={styles.healthValue}>{capacityUsedPercent}%</Text>
            <Text style={styles.healthLabel}>Capacity Used</Text>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${capacityUsedPercent}%` }]} />
            </View>
          </View>
          <View style={styles.healthCard}>
            <Text style={styles.healthValue}>₹{analytics?.totalRevenue || 0}</Text>
            <Text style={styles.healthLabel}>Total Revenue</Text>
          </View>
          <View style={styles.healthCard}>
            <Text style={styles.healthValue}>₹{totalBookings > 0 ? Math.round((analytics?.totalRevenue || 0) / totalBookings) : 0}</Text>
            <Text style={styles.healthLabel}>Avg Order Value</Text>
          </View>
        </View>

        {/* SECTION 2: Bookings per complex (SuperAdmin Only) */}
        {role === 'admin' && (
          <>
            <Text style={styles.sectionTitle}>BOOKINGS PER COMPLEX</Text>
            <View style={styles.listCard}>
              {analytics && analytics.complexChart.data.some(d => d > 0) ? (() => {
                const maxVal = Math.max(...analytics.complexChart.data);
                const minVal = Math.min(...analytics.complexChart.data);
                const range = maxVal - minVal || 1;

                // Color interpolation function between #9FE1CB and #0F6E56
                const getColorForValue = (val) => {
                  const intensity = (val - minVal) / range;
                  // Interpolate RGB from 159,225,203 to 15,110,86
                  const r = Math.round(159 + intensity * (15 - 159));
                  const g = Math.round(225 + intensity * (110 - 225));
                  const b = Math.round(203 + intensity * (86 - 203));
                  return `rgba(${r}, ${g}, ${b}, 1)`;
                };

                let complexesData = analytics.complexChart.labels.map((label, index) => ({
                  label,
                  value: analytics.complexChart.data[index]
                })).sort((a, b) => b.value - a.value);

                return complexesData.map((item, index) => {
                  const percent = Math.round((item.value / maxVal) * 100);
                  const isLast = index === complexesData.length - 1;
                  return (
                    <View key={index} style={[styles.horizontalBarRow, isLast && { marginBottom: 0 }]}>
                      <View style={styles.horizontalBarHeader}>
                        <Text style={styles.horizontalBarLabel} numberOfLines={1}>{item.label}</Text>
                        <Text style={styles.horizontalBarValue}>{item.value}</Text>
                      </View>
                      <View style={styles.horizontalBarTrack}>
                        <View style={[styles.horizontalBarFill, { width: `${percent}%`, backgroundColor: getColorForValue(item.value) }]} />
                      </View>
                    </View>
                  );
                });
              })() : (
                <Text style={styles.emptyText}>Not enough data for chart.</Text>
              )}
            </View>

            <Text style={styles.sectionTitle}>REVENUE BY COMPLEX</Text>
            <View style={styles.listCard}>
              {analytics && analytics.revenueChart && analytics.revenueChart.data.some(d => d > 0) ? (() => {
                const maxVal = Math.max(...analytics.revenueChart.data);
                const minVal = Math.min(...analytics.revenueChart.data);
                const range = maxVal - minVal || 1;

                // Color interpolation function between #9FE1CB and #0F6E56
                const getColorForValue = (val) => {
                  const intensity = (val - minVal) / range;
                  const r = Math.round(159 + intensity * (15 - 159));
                  const g = Math.round(225 + intensity * (110 - 225));
                  const b = Math.round(203 + intensity * (86 - 203));
                  return `rgba(${r}, ${g}, ${b}, 1)`;
                };

                let revenueData = analytics.revenueChart.labels.map((label, index) => ({
                  label,
                  value: analytics.revenueChart.data[index]
                })).sort((a, b) => b.value - a.value);

                return revenueData.map((item, index) => {
                  const percent = Math.round((item.value / maxVal) * 100);
                  const isLast = index === revenueData.length - 1;
                  return (
                    <View key={index} style={[styles.horizontalBarRow, isLast && { marginBottom: 0 }]}>
                      <View style={styles.horizontalBarHeader}>
                        <Text style={styles.horizontalBarLabel} numberOfLines={1}>{item.label}</Text>
                        <Text style={styles.horizontalBarValue}>₹{item.value}</Text>
                      </View>
                      <View style={styles.horizontalBarTrack}>
                        <View style={[styles.horizontalBarFill, { width: `${percent}%`, backgroundColor: getColorForValue(item.value) }]} />
                      </View>
                    </View>
                  );
                });
              })() : (
                <Text style={styles.emptyText}>Not enough data for chart.</Text>
              )}
            </View>
          </>
        )}

        {/* SECTION 3: Occupancy Rate Over Time */}
        <Text style={styles.sectionTitle}>RELATIVE OCCUPANCY BY DAY</Text>
        <View style={styles.listCard}>
          {analytics && (() => {
            const maxBookings = Math.max(...analytics.dayOccupancy.map(item => item.count));
            return analytics.dayOccupancy.map((item, index) => {
              const percent = maxBookings === 0 ? 0 : Math.round((item.count / maxBookings) * 100);
              const pill = getPillData(percent);

              return (
                <View key={index} style={styles.dayRow}>
                  <Text style={styles.dayLabel}>{item.day}</Text>
                  
                  <View style={styles.dayBarContainer}>
                    <View style={[styles.dayBarFill, { width: `${percent}%`, backgroundColor: pill.text }]} />
                  </View>

                  <Text style={styles.dayPercent}>{percent}%</Text>

                  <View style={[styles.pill, { backgroundColor: pill.bg }]}>
                    <Text style={[styles.pillText, { color: pill.text }]}>{pill.label}</Text>
                  </View>
                </View>
              );
            });
          })()}
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#F1EFE8' },
  header: { paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 60 : 16, paddingBottom: 16, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderColor: '#D3D1C7' },
  screenTitle: { fontSize: 24, fontWeight: '800', color: '#2C2C2A' },
  subtitle: { fontSize: 14, color: '#5F5E5A', marginTop: 4 },
  content: { padding: 16, paddingBottom: 16 },
  sectionTitle: { fontSize: 11, fontWeight: '700', color: '#888780', letterSpacing: 1, marginTop: 16, marginBottom: 12, marginLeft: 4 },
  
  healthGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  healthCard: { width: '48%', backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#D3D1C7' },
  healthValue: { fontSize: 24, fontWeight: '800', color: '#2C2C2A' },
  healthLabel: { fontSize: 12, color: '#5F5E5A', marginTop: 4, fontWeight: '500' },
  progressBarBg: { height: 6, backgroundColor: '#F1EFE8', borderRadius: 3, marginTop: 8, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: colors.primary, borderRadius: 3 },
  
  chartCard: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#D3D1C7', alignItems: 'center' },
  emptyText: { padding: 40, color: '#888780', textAlign: 'center' },
  
  listCard: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#D3D1C7' },
  dayRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 8 },
  dayLabel: { width: 40, fontSize: 13, fontWeight: '600', color: '#5F5E5A' },
  dayBarContainer: { flex: 1, height: 8, backgroundColor: '#F1EFE8', borderRadius: 4, marginHorizontal: 12, overflow: 'hidden' },
  dayBarFill: { height: '100%', borderRadius: 4 },
  dayPercent: { width: 36, fontSize: 13, fontWeight: '700', color: '#2C2C2A', textAlign: 'right', marginRight: 12 },
  pill: { width: 60, paddingVertical: 4, borderRadius: 12, alignItems: 'center' },
  pillText: { fontSize: 10, fontWeight: '700' },
  
  horizontalBarRow: { marginBottom: 16 },
  horizontalBarHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  horizontalBarLabel: { fontSize: 13, fontWeight: '600', color: '#2C2C2A', flex: 1, marginRight: 10 },
  horizontalBarValue: { fontSize: 14, fontWeight: '800', color: '#2C2C2A' },
  horizontalBarTrack: { height: 8, backgroundColor: '#F1EFE8', borderRadius: 4, overflow: 'hidden' },
  horizontalBarFill: { height: '100%', borderRadius: 4 },

  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F1EFE8' }
});
