// src/screens/user/SlotDetailScreen.js
import React from 'react';
import { View, Text, Pressable, StyleSheet, StatusBar } from 'react-native';
import { useParking } from '../../context/ParkingContext';
import { colors } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';

export default function SlotDetailScreen({ route, navigation }) {
  const { slot } = route.params || {};
  const { activeBooking } = useParking();

  if (!slot) {
    return (
      <View style={styles.centered}>
        <Ionicons name="alert-circle-outline" size={48} color="#791F1F" />
        <Text style={styles.errorText}>Slot not found.</Text>
        <Pressable style={styles.backLink} onPress={() => navigation.goBack()}>
          <Text style={styles.backLinkText}>Back to grid</Text>
        </Pressable>
      </View>
    );
  }

  const isAvailable = slot.status === 'available';
  const hasExistingActive = activeBooking !== null;

  const getStatusColor = (status) => {
    switch (status) {
      case 'available':
        return { fill: '#EAF3DE', text: '#27500A', label: 'Available' };
      case 'booked':
        return { fill: '#FCEBEB', text: '#791F1F', label: 'Occupied' };
      case 'disabled':
        return { fill: '#F1EFE8', text: '#888780', label: 'Blocked' };
      default:
        return { fill: '#F1EFE8', text: '#888780', label: 'Blocked' };
    }
  };

  const statusStyle = getStatusColor(slot.status);

  return (
    <View style={styles.page}>
      <StatusBar backgroundColor="#F1EFE8" barStyle="dark-content" />

      {/* Screen Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back-outline" size={24} color="#2C2C2A" />
        </Pressable>
        <Text style={styles.screenTitle}>Slot Details</Text>
      </View>

      <ScrollViewContent style={styles.container}>
        {/* Main Details Card */}
        <View style={styles.card}>
          <Text style={styles.slotLabelLarge}>{slot.label}</Text>

          <View style={[styles.statusBadge, { backgroundColor: statusStyle.fill }]}>
            <Text style={[styles.statusText, { color: statusStyle.text }]}>
              {statusStyle.label}
            </Text>
          </View>

          <View style={styles.separator} />

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Lodge</Text>
            <Text style={styles.infoValue}>{slot.lodgeName || 'Main Lodge'}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Zone</Text>
            <Text style={styles.infoValue}>Zone {slot.zone}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Floor Level</Text>
            <Text style={styles.infoValue}>
              {slot.floor === 0 ? 'Ground Floor (0)' : `Floor ${slot.floor}`}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Hourly Rate</Text>
            <Text style={styles.infoValue}>₹50 / hr</Text>
          </View>

          {slot.vehicleType && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Designated For</Text>
              <Text style={[styles.infoValue, { textTransform: 'uppercase' }]}>{slot.vehicleType}</Text>
            </View>
          )}
        </View>

        {/* Dynamic Warning Banners (PRD & Brief requirements) */}
        {!isAvailable ? (
          <View style={[styles.banner, styles.bannerDanger]}>
            <Ionicons name="ban-outline" size={20} color="#791F1F" />
            <View style={styles.bannerTextContainer}>
              <Text style={styles.bannerTitleDanger}>Booking Unavailable</Text>
              <Text style={styles.bannerDescDanger}>
                This slot is currently occupied or disabled.
              </Text>
              <Pressable onPress={() => navigation.goBack()} style={styles.bannerAction}>
                <Text style={styles.bannerActionText}>Choose another slot</Text>
              </Pressable>
            </View>
          </View>
        ) : hasExistingActive ? (
          <View style={[styles.banner, styles.bannerWarning]}>
            <Ionicons name="alert-circle-outline" size={20} color="#633806" />
            <View style={styles.bannerTextContainer}>
              <Text style={styles.bannerTitleWarning}>Active Booking Found</Text>
              <Text style={styles.bannerDescWarning}>
                You already have an active booking ({activeBooking.slotLabel}). Cancel it to book a different slot.
              </Text>
              <Pressable
                onPress={() => navigation.navigate('UserTabs', { screen: 'Bookings' })}
                style={styles.bannerAction}
              >
                <Text style={styles.bannerActionTextWarning}>Manage existing booking</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        {/* Primary CTA Button (conditional) */}
        {isAvailable && !hasExistingActive ? (
          <Pressable
            style={styles.primaryButton}
            onPress={() => navigation.navigate('BookingConfirm', { slot })}
          >
            <Text style={styles.primaryButtonText}>Book this slot</Text>
          </Pressable>
        ) : null}
      </ScrollViewContent>
    </View>
  );
}

// Simple internal helper to avoid scroll issues on extremely small screens
function ScrollViewContent({ children, style }) {
  return <View style={style}>{children}</View>;
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
    paddingTop: 16,
    paddingBottom: 8,
  },
  backButton: {
    marginRight: 12,
  },
  screenTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2C2C2A',
  },
  container: {
    flex: 1,
    padding: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    borderWidth: 1,
    borderColor: '#D3D1C7',
    alignItems: 'center',
    marginBottom: 20,
  },
  slotLabelLarge: {
    fontSize: 48,
    fontWeight: '900',
    color: '#2C2C2A',
    letterSpacing: 1,
  },
  statusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  separator: {
    width: '100%',
    height: 1,
    backgroundColor: '#F1EFE8',
    marginVertical: 20,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 14,
    color: '#5F5E5A',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2C2C2A',
  },
  primaryButton: {
    height: 52,
    backgroundColor: colors.primary,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
  },
  primaryButtonText: {
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
  backLink: {
    paddingVertical: 10,
  },
  backLinkText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  banner: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
  },
  bannerDanger: {
    backgroundColor: '#FCEBEB',
    borderColor: '#F4C4C4',
  },
  bannerWarning: {
    backgroundColor: '#FAEEDA',
    borderColor: '#F0D4A8',
  },
  bannerTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  bannerTitleDanger: {
    fontSize: 14,
    fontWeight: '700',
    color: '#791F1F',
  },
  bannerDescDanger: {
    fontSize: 13,
    color: '#791F1F',
    marginTop: 4,
    lineHeight: 18,
  },
  bannerAction: {
    marginTop: 8,
  },
  bannerActionText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
    textDecorationLine: 'underline',
  },
  bannerTitleWarning: {
    fontSize: 14,
    fontWeight: '700',
    color: '#633806',
  },
  bannerDescWarning: {
    fontSize: 13,
    color: '#633806',
    marginTop: 4,
    lineHeight: 18,
  },
  bannerActionTextWarning: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
});
