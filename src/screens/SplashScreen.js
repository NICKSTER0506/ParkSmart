import React, { useEffect } from 'react';
import { View, Text, StyleSheet, StatusBar } from 'react-native';
import { colors } from '../constants/theme';

export default function SplashScreen({ navigation, user, userRole }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!user) {
        navigation.replace('Login');
        return;
      }
      navigation.replace(userRole === 'admin' ? 'AdminDashboard' : 'Home');
    }, 1400);

    return () => clearTimeout(timer);
  }, [navigation, user, userRole]);

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={colors.primary} barStyle="light-content" />
      <View style={styles.logoBox}>
        <Text style={styles.logo}>ParkSmart</Text>
      </View>
      <Text style={styles.subtitle}>Smart parking made simple</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  logoBox: {
    width: 140,
    height: 140,
    borderRadius: 40,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  logo: {
    color: colors.primary,
    fontSize: 28,
    fontWeight: '800',
  },
  subtitle: {
    color: '#FFFFFF',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 260,
  },
});
