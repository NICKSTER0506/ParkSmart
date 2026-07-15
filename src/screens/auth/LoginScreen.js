// src/screens/auth/LoginScreen.js
import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { login } from '../../services/authService';
import { colors } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = async () => {
    if (!email || !password) {
      setErrorMsg('Please enter email and password.');
      return;
    }
    setErrorMsg('');
    setLoading(false);
    
    // UI/UX requirement: show loader on primary button
    setLoading(true);
    try {
      await login(email, password);
      // AppNavigator will automatically route based on AuthContext update
    } catch (err) {
      // UI/UX Brief spec: name the fix
      setErrorMsg('Incorrect email or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.page}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Ionicons name="car-sport-outline" size={48} color={colors.primary} />
          <Text style={styles.title}>ParkSmart</Text>
          <Text style={styles.subtitle}>Real-time Parking Management</Text>
        </View>

        <View style={styles.form}>
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
          <View style={styles.passwordContainer}>
            <TextInput
              placeholder="Enter your password"
              placeholderTextColor="#888780"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                setErrorMsg('');
              }}
              secureTextEntry={!showPassword}
              onFocus={() => setFocusedField('password')}
              onBlur={() => setFocusedField(null)}
              style={[styles.inputPassword, focusedField === 'password' && styles.inputFocused]}
            />
            <Pressable
              style={styles.eyeButton}
              onPress={() => setShowPassword(!showPassword)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color="#5F5E5A"
              />
            </Pressable>
          </View>

          {errorMsg ? (
            <Text style={styles.errorText}>{errorMsg}</Text>
          ) : null}

          <Pressable
            style={[styles.primaryButton, loading && styles.disabledButton]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>Sign in</Text>
            )}
          </Pressable>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>No account? </Text>
          <Pressable onPress={() => navigation.navigate('Register')}>
            <Text style={styles.footerLink}>Register</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#F1EFE8', // warm grey bg
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  container: {
    backgroundColor: '#FFFFFF', // card bg
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
    alignItems: 'center',
    marginBottom: 28,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#2C2C2A',
    marginTop: 8,
  },
  subtitle: {
    fontSize: 13,
    color: '#5F5E5A',
    marginTop: 4,
  },
  form: {
    marginBottom: 16,
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
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  inputPassword: {
    flex: 1,
    height: 52,
    borderWidth: 1,
    borderColor: '#D3D1C7',
    borderRadius: 10,
    paddingLeft: 16,
    paddingRight: 50,
    backgroundColor: '#F1EFE8',
    color: '#2C2C2A',
    fontSize: 14,
  },
  eyeButton: {
    position: 'absolute',
    right: 16,
    height: 52,
    justifyContent: 'center',
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
    backgroundColor: colors.primary, // Brand blue
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
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
  },
  footerText: {
    fontSize: 13,
    color: '#5F5E5A',
  },
  footerLink: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '600',
  },
});
