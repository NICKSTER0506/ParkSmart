// src/screens/admin/AddSlotScreen.js
import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator, StatusBar } from 'react-native';
import { addSlot, getAllSlots } from '../../services/slotService';
import { colors } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';

export default function AddSlotScreen({ navigation }) {
  const [lodgeName, setLodgeName] = useState('');
  const [label, setLabel] = useState('');
  const [zone, setZone] = useState('');
  const [floor, setFloor] = useState('0');
  const [vehicleType, setVehicleType] = useState('car');
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const vehicleOptions = ['car', 'ev', 'bike', 'suv', 'none'];

  const handleAddSlot = async () => {
    if (!label.trim() || !zone.trim()) {
      setErrorMsg('Label and Zone are required.');
      return;
    }
    setErrorMsg('');
    setLoading(true);

    try {
      // Check for duplicates in current inventory
      const existingSlots = await getAllSlots();
      const isDuplicate = existingSlots.some(
        (s) => s.label.trim().toLowerCase() === label.trim().toLowerCase()
      );

      if (isDuplicate) {
        setErrorMsg(`Slot ${label.trim()} already exists in inventory.`);
        setLoading(false);
        return;
      }

      await addSlot({
        lodgeName: lodgeName.trim() || 'Main Lodge',
        label: label.trim().toUpperCase(),
        zone: zone.trim().toUpperCase(),
        floor: parseInt(floor, 10) || 0,
        vehicleType: vehicleType === 'none' ? null : vehicleType,
        status: 'available',
      });

      navigation.goBack();
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.page}>
      <StatusBar backgroundColor="#F1EFE8" barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back-outline" size={24} color="#2C2C2A" />
        </Pressable>
        <Text style={styles.screenTitle}>Add Slot</Text>
      </View>

      <View style={styles.container}>
        <View style={styles.formCard}>
          <Text style={styles.fieldLabel}>Lodge Name</Text>
          <TextInput
            placeholder="e.g. Main Lodge"
            placeholderTextColor="#888780"
            value={lodgeName}
            onChangeText={(text) => {
              setLodgeName(text);
              setErrorMsg('');
            }}
            onFocus={() => setFocusedField('lodgeName')}
            onBlur={() => setFocusedField(null)}
            style={[styles.input, focusedField === 'lodgeName' && styles.inputFocused]}
          />

          <Text style={styles.fieldLabel}>Slot Label</Text>
          <TextInput
            placeholder="e.g. A-12 or B-01"
            placeholderTextColor="#888780"
            value={label}
            onChangeText={(text) => {
              setLabel(text);
              setErrorMsg('');
            }}
            autoCapitalize="characters"
            onFocus={() => setFocusedField('label')}
            onBlur={() => setFocusedField(null)}
            style={[styles.input, focusedField === 'label' && styles.inputFocused]}
          />

          <Text style={styles.fieldLabel}>Parking Zone</Text>
          <TextInput
            placeholder="e.g. A, B, or C"
            placeholderTextColor="#888780"
            value={zone}
            onChangeText={(text) => {
              setZone(text);
              setErrorMsg('');
            }}
            autoCapitalize="characters"
            onFocus={() => setFocusedField('zone')}
            onBlur={() => setFocusedField(null)}
            style={[styles.input, focusedField === 'zone' && styles.inputFocused]}
          />

          <Text style={styles.fieldLabel}>Floor Level</Text>
          <TextInput
            placeholder="0 for ground level, 1 for first level"
            placeholderTextColor="#888780"
            value={floor}
            onChangeText={(text) => {
              setFloor(text);
              setErrorMsg('');
            }}
            keyboardType="number-pad"
            onFocus={() => setFocusedField('floor')}
            onBlur={() => setFocusedField(null)}
            style={[styles.input, focusedField === 'floor' && styles.inputFocused]}
          />

          <Text style={styles.fieldLabel}>Vehicle Type</Text>
          <View style={styles.typeGrid}>
            {vehicleOptions.map((opt) => (
              <Pressable
                key={opt}
                style={[
                  styles.typeCard,
                  vehicleType === opt && styles.typeCardSelected
                ]}
                onPress={() => setVehicleType(opt)}
              >
                <Text style={[
                  styles.typeText,
                  vehicleType === opt && styles.typeTextSelected
                ]}>
                  {opt.toUpperCase()}
                </Text>
              </Pressable>
            ))}
          </View>

          {errorMsg ? (
            <Text style={styles.errorText}>{errorMsg}</Text>
          ) : null}

          {/* Submit CTA */}
          <Pressable
            style={[styles.primaryButton, loading && styles.disabledButton]}
            onPress={handleAddSlot}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>Add Slot</Text>
            )}
          </Pressable>
        </View>
      </View>
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
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    borderWidth: 1,
    borderColor: '#D3D1C7',
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#5F5E5A',
    marginBottom: 6,
  },
  input: {
    height: 52,
    borderWidth: 1,
    borderColor: '#D3D1C7',
    borderRadius: 10,
    paddingHorizontal: 16,
    backgroundColor: '#F1EFE8',
    color: '#2C2C2A',
    fontSize: 14,
    marginBottom: 16,
  },
  inputFocused: {
    borderColor: colors.primary,
    backgroundColor: '#FFFFFF',
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  typeCard: {
    width: '31%',
    backgroundColor: '#F1EFE8',
    borderWidth: 1,
    borderColor: '#D3D1C7',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  typeCardSelected: {
    backgroundColor: '#E6F1FB',
    borderColor: colors.primary,
  },
  typeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#5F5E5A',
  },
  typeTextSelected: {
    color: colors.primary,
  },
  errorText: {
    color: '#791F1F',
    backgroundColor: '#FCEBEB',
    padding: 10,
    borderRadius: 8,
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 16,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: '#F8C8C8',
  },
  primaryButton: {
    height: 52,
    backgroundColor: colors.primary,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  disabledButton: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
