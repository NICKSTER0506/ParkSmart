// src/screens/ReportScreen.js
import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator, StatusBar, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { submitReport } from '../services/reportService';
import { useAuth } from '../context/AuthContext';
import { colors } from '../constants/theme';
import { triggerCustomAlert } from '../utils/alertService';

export default function ReportScreen({ navigation }) {
  const { user } = useAuth();
  const [description, setDescription] = useState('');
  const [title, setTitle] = useState('illegal_parking');
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState(null);

  const issueTypes = [
    { id: 'illegal_parking', label: 'Illegal Parking' },
    { id: 'damaged_slot', label: 'Damaged Slot' },
    { id: 'other', label: 'Other Issue' }
  ];

  const handleSubmit = async () => {
    if (!description.trim()) {
      triggerCustomAlert('Error', 'Please describe the issue in detail.', [{ text: 'OK' }]);
      return;
    }
    
    setLoading(true);
    try {
      await submitReport(user.uid, title, description.trim(), location.trim());
      triggerCustomAlert('Success', 'Your report has been submitted to administration.', [{ text: 'OK' }]);
      navigation.goBack();
    } catch (error) {
      triggerCustomAlert('Error', error.message, [{ text: 'OK' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton} hitSlop={15}>
          <Ionicons name="arrow-back" size={24} color="#2C2C2A" />
        </Pressable>
        <Text style={styles.screenTitle}>Report Issue</Text>
      </View>

      <View style={styles.formContainer}>
        <Text style={styles.fieldLabel}>Issue Type</Text>
        <View style={styles.typeGrid}>
          {issueTypes.map(t => (
            <Pressable 
              key={t.id} 
              style={[styles.typeCard, title === t.id && styles.typeCardActive]}
              onPress={() => setTitle(t.id)}
            >
              <Text style={[styles.typeText, title === t.id && styles.typeTextActive]}>
                {t.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.fieldLabel}>Location / Slot (Optional)</Text>
        <TextInput
          placeholder="e.g. Main Lodge A-12"
          placeholderTextColor="#888780"
          value={location}
          onChangeText={setLocation}
          onFocus={() => setFocusedField('location')}
          onBlur={() => setFocusedField(null)}
          style={[styles.input, focusedField === 'location' && styles.inputFocused]}
        />

        <Text style={styles.fieldLabel}>Description</Text>
        <TextInput
          placeholder="Please provide details about what happened..."
          placeholderTextColor="#888780"
          value={description}
          onChangeText={setDescription}
          onFocus={() => setFocusedField('description')}
          onBlur={() => setFocusedField(null)}
          style={[styles.input, styles.textArea, focusedField === 'description' && styles.inputFocused]}
          multiline
          textAlignVertical="top"
        />

        <Pressable 
          style={[styles.submitButton, loading && styles.disabledButton]} 
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.submitText}>Submit Report</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F1EFE8'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 16,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#D3D1C7'
  },
  backButton: {
    marginRight: 16
  },
  screenTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2C2C2A'
  },
  formContainer: {
    padding: 16,
    marginTop: 8
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#5F5E5A',
    marginBottom: 8,
    marginTop: 12
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 8
  },
  typeCard: {
    width: '31%',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D3D1C7',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center'
  },
  typeCardActive: {
    backgroundColor: '#E6F1FB',
    borderColor: colors.primary
  },
  typeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#5F5E5A',
    textAlign: 'center'
  },
  typeTextActive: {
    color: colors.primary
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D3D1C7',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 14,
    color: '#2C2C2A'
  },
  inputFocused: {
    borderColor: colors.primary
  },
  textArea: {
    height: 120,
    paddingTop: 16
  },
  submitButton: {
    backgroundColor: colors.primary,
    height: 52,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 32,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4
  },
  disabledButton: {
    opacity: 0.7
  },
  submitText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700'
  }
});
