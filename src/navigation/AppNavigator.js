// src/navigation/AppNavigator.js
import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { colors } from '../constants/theme';
import { cleanExpiredBookings } from '../services/bookingService';

// Import Navigators
import UserNavigator from './UserTabs';
import AdminNavigator from './AdminStack';

// Import Auth Screens
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import VehicleSetupScreen from '../screens/auth/VehicleSetupScreen';

const Stack = createNativeStackNavigator();

function AuthNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
}

export default function AppNavigator() {
  const { user, role, userDoc, loading } = useAuth();

  useEffect(() => {
    if (user && role === 'user') {
      cleanExpiredBookings(user.uid);
    }
  }, [user, role]);

  // Show loading if context is loading, OR if user is logged in but role hasn't been resolved yet
  if (loading || (user && !role)) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F1EFE8' }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!user ? (
        <Stack.Screen name="Auth" component={AuthNavigator} />
      ) : (role === 'admin' || role === 'complex_admin') ? (
        <Stack.Screen name="Admin" component={AdminNavigator} />
      ) : userDoc && userDoc.vehicleType === null ? (
        <Stack.Screen name="VehicleSetup" component={VehicleSetupScreen} />
      ) : (
        <Stack.Screen name="User" component={UserNavigator} />
      )}
    </Stack.Navigator>
  );
}
