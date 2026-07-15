// src/screens/user/SupportTicketsScreen.js
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator, StatusBar, Platform } from 'react-native';
import { colors } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { getUserReports } from '../../services/reportService';
import { useAuth } from '../../context/AuthContext';

export default function SupportTicketsScreen({ navigation }) {
  const { user } = useAuth();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchReports() {
      if (!user) return;
      try {
        const userReports = await getUserReports(user.uid);
        setReports(userReports);
      } catch (e) {
        console.error("Failed to load reports:", e);
      } finally {
        setLoading(false);
      }
    }
    fetchReports();
  }, [user]);

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Recently';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.page}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={15}>
          <Ionicons name="arrow-back" size={24} color="#2C2C2A" />
        </Pressable>
        <Text style={styles.title}>Support Tickets</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {reports.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={48} color="#D3D1C7" />
            <Text style={styles.emptyText}>No support tickets found.</Text>
            <Text style={styles.emptySubtext}>You haven't reported any issues yet.</Text>
          </View>
        ) : (
          reports.map((report) => (
            <View key={report.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.reportTitle}>
                  {report.title.replace('_', ' ').toUpperCase()}
                </Text>
                <View style={[
                  styles.statusBadge, 
                  report.status === 'open' ? styles.statusOpen : styles.statusResolved
                ]}>
                  <Text style={[
                    styles.statusText,
                    report.status === 'open' ? styles.statusTextOpen : styles.statusTextResolved
                  ]}>
                    {report.status.toUpperCase()}
                  </Text>
                </View>
              </View>
              
              <Text style={styles.reportDescription}>{report.description}</Text>
              
              <View style={styles.metaRow}>
                {report.location ? (
                  <View style={styles.metaItem}>
                    <Ionicons name="location-outline" size={14} color="#5F5E5A" />
                    <Text style={styles.metaText}>{report.location}</Text>
                  </View>
                ) : <View />}
                
                <View style={styles.metaItem}>
                  <Ionicons name="time-outline" size={14} color="#5F5E5A" />
                  <Text style={styles.metaText}>{formatDate(report.createdAt)}</Text>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#F1EFE8' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 60 : 16,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: { marginRight: 16 },
  title: { fontSize: 20, fontWeight: '800', color: '#2C2C2A' },
  content: { padding: 16 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
  },
  emptyText: { fontSize: 18, fontWeight: '700', color: '#2C2C2A', marginTop: 16 },
  emptySubtext: { fontSize: 14, color: '#5F5E5A', marginTop: 8 },

  card: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#D3D1C7',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  reportTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#2C2C2A',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusOpen: {
    backgroundColor: '#FCEBEB',
    borderColor: '#F4C4C4',
  },
  statusTextOpen: {
    color: '#791F1F',
    fontSize: 10,
    fontWeight: '800',
  },
  statusResolved: {
    backgroundColor: '#EAF3DE',
    borderColor: '#D2E3BE',
  },
  statusTextResolved: {
    color: '#27500A',
    fontSize: 10,
    fontWeight: '800',
  },
  reportDescription: {
    fontSize: 14,
    color: '#5F5E5A',
    lineHeight: 20,
    marginBottom: 16,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F1EFE8',
    paddingTop: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 12,
    color: '#5F5E5A',
    marginLeft: 6,
    fontWeight: '500'
  }
});
