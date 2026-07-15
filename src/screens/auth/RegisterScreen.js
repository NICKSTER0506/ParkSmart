// src/screens/auth/RegisterScreen.js
import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { register } from '../../services/authService';
import { colors } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';

export default function RegisterScreen({ navigation }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const handleRegister = async () => {
    if (!name || !email || !password) {
      setErrorMsg('All fields are required.');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }
    setErrorMsg('');
    setLoading(true);

    try {
      await register(email, password, name);
      // Auth state change will auto-route to User Tabs
    } catch (err) {
      if (err.message.includes('email-already-in-use')) {
        setErrorMsg('An account with this email already exists.');
      } else {
        setErrorMsg(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.page}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
          >
            <Ionicons name="arrow-back-outline" size={24} color="#2C2C2A" />
          </Pressable>
          <Text style={styles.title}>Register</Text>
          <Text style={styles.subtitle}>Create your ParkSmart account</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.fieldLabel}>Full Name</Text>
          <TextInput
            placeholder="Enter your name"
            placeholderTextColor="#888780"
            value={name}
            onChangeText={(text) => {
              setName(text);
              setErrorMsg('');
            }}
            onFocus={() => setFocusedField('name')}
            onBlur={() => setFocusedField(null)}
            style={[styles.input, focusedField === 'name' && styles.inputFocused]}
          />

          <Text style={styles.fieldLabel}>Email Address</Text>
          <TextInput
            placeholder="Enter your email"
            placeholderTextColor="#888780"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              setErrorMsg('');
            }}
            keyboardType="email-address"
            autoCapitalize="none"
            onFocus={() => setFocusedField('email')}
            onBlur={() => setFocusedField(null)}
            style={[styles.input, focusedField === 'email' && styles.inputFocused]}
          />

          <Text style={styles.fieldLabel}>Password</Text>
          <TextInput
            placeholder="Minimum 6 characters"
            placeholderTextColor="#888780"
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              setErrorMsg('');
            }}
            secureTextEntry
            onFocus={() => setFocusedField('password')}
            onBlur={() => setFocusedField(null)}
            style={[styles.input, focusedField === 'password' && styles.inputFocused]}
          />

          {errorMsg ? (
            <Text style={styles.errorText}>{errorMsg}</Text>
          ) : null}

          <Pressable
            style={[styles.primaryButton, loading && styles.disabledButton]}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>Create account</Text>
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
  },
  backButton: {
    marginBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#2C2C2A',
  },
  subtitle: {
    fontSize: 13,
    color: '#5F5E5A',
    marginTop: 4,
  },
  form: {
    marginBottom: 8,
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
