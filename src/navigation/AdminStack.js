// src/navigation/AdminStack.js
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/theme';

// Import Screens
import AdminHomeScreen from '../screens/admin/AdminHomeScreen';
import AdminBookingsScreen from '../screens/admin/AdminBookingsScreen';
import AnalyticsScreen from '../screens/admin/AnalyticsScreen';
import AdminProfileScreen from '../screens/admin/AdminProfileScreen';
import AdminComplexesScreen from '../screens/admin/AdminComplexesScreen';
import ComplexSlotManagerScreen from '../screens/admin/ComplexSlotManagerScreen';
import AdminReportsScreen from '../screens/admin/AdminReportsScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function AdminTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: '#888780',
        tabBarStyle: {
          height: 64,
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: colors.border,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
        tabBarIcon: ({ color, size }) => {
          let iconName;
          if (route.name === 'Home') iconName = 'home-outline';
          else if (route.name === 'Bookings') iconName = 'list-outline';
          else if (route.name === 'Analytics') iconName = 'stats-chart-outline';
          else if (route.name === 'Profile') iconName = 'person-outline';
          return <Ionicons name={iconName} size={24} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={AdminHomeScreen} options={{ title: 'Home' }} />
      <Tab.Screen name="Bookings" component={AdminBookingsScreen} options={{ title: 'Bookings' }} />
      <Tab.Screen name="Analytics" component={AnalyticsScreen} options={{ title: 'Analytics' }} />
      <Tab.Screen name="Profile" component={AdminProfileScreen} options={{ title: 'Profile' }} />
    </Tab.Navigator>
  );
}

export default function AdminNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AdminTabs" component={AdminTabs} />
      <Stack.Screen name="AdminComplexes" component={AdminComplexesScreen} />
      <Stack.Screen name="ComplexSlotManager" component={ComplexSlotManagerScreen} />
      <Stack.Screen name="AdminReports" component={AdminReportsScreen} />
    </Stack.Navigator>
  );
}
