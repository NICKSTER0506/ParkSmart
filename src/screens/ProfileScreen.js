import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, StatusBar, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { colors } from '../constants/theme';
import { logout, getCurrentUser } from '../services/auth';
import { getUserById, getUserBookings, checkAdminAccess } from '../services/firestore';

export default function ProfileScreen({ navigation }) {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bookingCount, setBookingCount] = useState(0);
  const [role, setRole] = useState('user');

  useEffect(() => {
    const loadProfile = async () => {
      const currentUser = getCurrentUser();
      if (!currentUser) {
        navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
        return;
      }

      try {
        const profile = await getUserById(currentUser.uid);
        const bookings = await getUserBookings(currentUser.uid);
        const isAdmin = await checkAdminAccess(currentUser.email);
        setUserData(profile || { name: 'Driver', email: currentUser.email, uid: currentUser.uid });
        setBookingCount(bookings.length);
        setRole(isAdmin ? 'admin' : profile?.role || 'user');
      } catch (error) {
        Alert.alert('Error', error.message);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [navigation]);

  const handleLogout = async () => {
    try {
      await logout();
      navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
    } catch (error) {
      Alert.alert('Logout failed', error.message);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.page}>
      <StatusBar backgroundColor={colors.primary} barStyle="light-content" />
      <View style={styles.profileCard}>
        <Text style={styles.title}>{userData?.name || 'ParkSmart User'}</Text>
        <Text style={styles.username}>{userData?.email}</Text>
        <Text style={styles.userMeta}>
          Joined {userData?.createdAt?.toDate ? userData.createdAt.toDate().toLocaleDateString() : 'recently'}
        </Text>
      </View>

      <Pressable style={styles.favoritesButton} onPress={() => navigation.navigate('ManageFavorites')}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={{ fontSize: 20, marginRight: 12 }}>⭐</Text>
          <Text style={styles.favoritesButtonText}>Manage Favorites</Text>
        </View>
        <Text style={{ color: colors.primary, fontSize: 18 }}>›</Text>
      </Pressable>

      <View style={styles.detailsCard}>
        <Text style={styles.sectionTitle}>Account details</Text>
        <View style={styles.detailRow}>
          <View style={styles.detailBox}>
            <Text style={styles.detailItem}>Role</Text>
            <Text style={styles.detailValue}>{role}</Text>
          </View>
          <View style={styles.detailBox}>
            <Text style={styles.detailItem}>Vehicle Type</Text>
            <Text style={styles.detailValue} style={{textTransform: 'capitalize', fontSize: 16, fontWeight: '700', marginTop: 4, color: colors.text}}>
              {userData?.vehicleType || 'Car'}
            </Text>
          </View>
        </View>
        <Text style={styles.detailItem}>Email</Text>
        <Text style={styles.detailValue}>{userData?.email}</Text>
      </View>

      <View style={styles.detailsCard}>
        <Text style={styles.sectionTitle}>Activity</Text>
        <Text style={styles.detailItem}>Total bookings</Text>
        <Text style={styles.detailValue}>{bookingCount}</Text>
      </View>

      <Pressable style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Logout</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 20,
  },
  profileCard: {
    backgroundColor: colors.primary,
    borderRadius: 24,
    padding: 24,
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 8,
  },
  username: {
    fontSize: 18,
    color: '#fff',
    marginBottom: 6,
  },
  userMeta: {
    color: '#E8F3E8',
    fontSize: 13,
  },
  detailsCard: {
    backgroundColor: colors.panel,
    borderRadius: 22,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  favoritesButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  favoritesButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  detailBox: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 14,
    color: colors.text,
  },
  detailItem: {
    fontSize: 13,
    color: colors.secondaryText,
    marginTop: 10,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 4,
    color: colors.text,
  },
  logoutButton: {
    backgroundColor: colors.danger,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  logoutText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
});
