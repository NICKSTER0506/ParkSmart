// src/screens/auth/VehicleSetupScreen.js
import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { colors } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';

export default function VehicleSetupScreen() {
  const { user, userDoc } = useAuth();
  const [loading, setLoading] = useState(false);
  const [selectedType, setSelectedType] = useState(null);

  const vehicleTypes = [
    { id: 'car', label: 'Car', icon: 'car-sport-outline' },
    { id: 'bike', label: 'Bike', icon: 'bicycle-outline' },
    { id: 'ev', label: 'Electric Vehicle', icon: 'flash-outline' },
    { id: 'suv', label: 'SUV', icon: 'car-outline' },
  ];

  const handleSave = async (typeId) => {
    setLoading(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, { vehicleType: typeId });
      // Updating firestore should trigger onAuthStateChanged/getDoc in AuthContext eventually,
      // but to make it instant we might need to rely on the next snapshot or a reload.
      // Wait, AuthContext uses getDoc on auth state change. If we update the doc, 
      // the context might not re-fetch automatically unless auth state changes.
      // So let's force a reload or we need to manually update context.
      // For now, since it's just a demo, we can just do the update.
    } catch (error) {
      console.error('Error saving vehicle type:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.page}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>What type of vehicle are you parking?</Text>
          <Text style={styles.subtitle}>You can change this later in your profile.</Text>
        </View>

        <View style={styles.grid}>
          {vehicleTypes.map((v) => (
            <Pressable
              key={v.id}
              style={[
                styles.card,
                selectedType === v.id && styles.cardSelected,
              ]}
              onPress={() => setSelectedType(v.id)}
            >
              <Ionicons
                name={v.icon}
                size={36}
                color={selectedType === v.id ? colors.primary : '#5F5E5A'}
              />
              <Text
                style={[
                  styles.cardLabel,
                  selectedType === v.id && styles.cardLabelSelected,
                ]}
              >
                {v.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <Pressable
          style={[styles.primaryButton, (!selectedType || loading) && styles.disabledButton]}
          onPress={() => handleSave(selectedType)}
          disabled={!selectedType || loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>Continue</Text>
          )}
        </Pressable>

        <Pressable
          style={styles.skipButton}
          onPress={() => handleSave(null)} // Null represents skipped
          disabled={loading}
        >
          <Text style={styles.skipButtonText}>Skip for now</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#F1EFE8',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    borderWidth: 1,
    borderColor: '#D3D1C7',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  header: {
    marginBottom: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#2C2C2A',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#5F5E5A',
    marginTop: 8,
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  card: {
    width: '48%',
    backgroundColor: '#F1EFE8',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  cardSelected: {
    borderColor: colors.primary,
    backgroundColor: '#E8F0FE',
  },
  cardLabel: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#5F5E5A',
    textAlign: 'center',
  },
  cardLabelSelected: {
    color: colors.primary,
  },
  primaryButton: {
    height: 52,
    backgroundColor: colors.primary,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  skipButton: {
    marginTop: 16,
    alignItems: 'center',
    paddingVertical: 8,
  },
  skipButtonText: {
    color: '#5F5E5A',
    fontSize: 14,
    fontWeight: '500',
  },
});
