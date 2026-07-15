// src/screens/admin/AdminReportsScreen.js
import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, ActivityIndicator, StatusBar, Platform } from 'react-native';
import { getAllReports, updateReportStatus } from '../../services/reportService';
import { colors } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { triggerCustomAlert } from '../../utils/alertService';

export default function AdminReportsScreen({ navigation }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);

  const fetchReports = async () => {
    try {
      const data = await getAllReports();
      setReports(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchReports();
    });
    return unsubscribe;
  }, [navigation]);

  const handleResolve = async (reportId) => {
    triggerCustomAlert(
      'Resolve Issue',
      'Are you sure you want to mark this issue as resolved?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Resolve', 
          style: 'default',
          onPress: async () => {
            setUpdatingId(reportId);
            try {
              await updateReportStatus(reportId, 'resolved');
              setReports(prev => prev.map(r => r.id === reportId ? { ...r, status: 'resolved' } : r));
            } catch (err) {
              triggerCustomAlert('Error', err.message, [{ text: 'OK' }]);
            } finally {
              setUpdatingId(null);
            }
          }
        }
      ]
    );
  };

  const renderReportItem = ({ item }) => {
    const isResolved = item.status === 'resolved';
    const isUpdating = updatingId === item.id;
    
    const reportDate = item.createdAt?.toDate 
      ? item.createdAt.toDate().toLocaleString() 
      : 'Unknown Date';

    return (
      <View style={[styles.card, isResolved && styles.cardResolved]}>
        <View style={styles.cardHeader}>
          <View style={styles.badgeWrapper}>
            <View style={[styles.typeBadge, isResolved ? styles.bgResolved : styles.bgOpen]}>
              <Text style={[styles.typeText, isResolved ? styles.textResolved : styles.textOpen]}>
                {item.title.toUpperCase().replace('_', ' ')}
              </Text>
            </View>
          </View>
          <Text style={styles.dateText}>{reportDate}</Text>
        </View>

        <Text style={styles.locationText}>Location: {item.location || 'Not specified'}</Text>
        <Text style={styles.descText}>{item.description}</Text>

        <View style={styles.cardFooter}>
          <Text style={styles.userText}>User ID: {item.userId.substring(0, 8)}...</Text>
          
          {!isResolved ? (
            <Pressable 
              style={styles.resolveButton}
              onPress={() => handleResolve(item.id)}
              disabled={isUpdating}
            >
              {isUpdating ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle-outline" size={16} color="#FFFFFF" />
                  <Text style={styles.resolveText}>Resolve</Text>
                </>
              )}
            </Pressable>
          ) : (
            <View style={styles.resolvedStamp}>
              <Ionicons name="checkmark-done" size={16} color="#27500A" />
              <Text style={styles.stampText}>Resolved</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.page}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={15} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#2C2C2A" />
        </Pressable>
        <View>
          <Text style={styles.screenTitle}>Issue Reports</Text>
          <Text style={styles.subtitle}>Manage user complaints</Text>
        </View>
      </View>

      {loading && reports.length === 0 ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={reports}
          keyExtractor={(item) => item.id}
          renderItem={renderReportItem}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="shield-checkmark-outline" size={48} color="#888780" />
              <Text style={styles.emptyTitle}>All Clear!</Text>
              <Text style={styles.emptySub}>No issue reports have been submitted.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#F1EFE8',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 16,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#D3D1C7',
  },
  backButton: {
    marginRight: 16,
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#2C2C2A',
  },
  subtitle: {
    fontSize: 13,
    color: '#5F5E5A',
    marginTop: 2,
  },
  list: {
    padding: 16,
    paddingBottom: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D3D1C7',
    padding: 16,
    marginBottom: 16,
  },
  cardResolved: {
    backgroundColor: '#F9F9F9',
    opacity: 0.8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  badgeWrapper: {
    flex: 1,
  },
  typeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  bgOpen: {
    backgroundColor: '#FCEBEB',
  },
  bgResolved: {
    backgroundColor: '#EAF3DE',
  },
  typeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  textOpen: {
    color: '#791F1F',
  },
  textResolved: {
    color: '#27500A',
  },
  dateText: {
    fontSize: 11,
    color: '#888780',
    fontWeight: '500',
  },
  locationText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2C2C2A',
    marginBottom: 6,
  },
  descText: {
    fontSize: 14,
    color: '#5F5E5A',
    lineHeight: 20,
    marginBottom: 16,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F1EFE8',
    paddingTop: 12,
  },
  userText: {
    fontSize: 11,
    color: '#888780',
  },
  resolveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  resolveText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 4,
  },
  resolvedStamp: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EAF3DE',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  stampText: {
    color: '#27500A',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 4,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D3D1C7',
    padding: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2C2C2A',
    marginTop: 16,
  },
  emptySub: {
    fontSize: 13,
    color: '#5F5E5A',
    marginTop: 6,
    textAlign: 'center',
  },
});
