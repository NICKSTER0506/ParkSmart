// src/navigation/UserTabs.js
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/theme';

// Import Screens (from their future locations)
import SlotGridScreen from '../screens/user/SlotGridScreen';
import HistoryScreen from '../screens/user/HistoryScreen';
import ProfileScreen from '../screens/user/ProfileScreen';
import SlotDetailScreen from '../screens/user/SlotDetailScreen';
import BookingConfirmScreen from '../screens/user/BookingConfirmScreen';
import TicketScreen from '../screens/user/TicketScreen';
import HomeScreen from '../screens/HomeScreen';
import MapScreen from '../screens/MapScreen';
import ReportScreen from '../screens/ReportScreen';

import ComplexListScreen from '../screens/user/ComplexListScreen';
import ComplexOverviewScreen from '../screens/user/ComplexOverviewScreen';
import ManageFavoritesScreen from '../screens/user/ManageFavoritesScreen';
import SupportTicketsScreen from '../screens/user/SupportTicketsScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function TabNavigator() {
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
          if (route.name === 'Home') {
            iconName = 'home-outline';
          } else if (route.name === 'Slots') {
            iconName = 'business-outline';
          } else if (route.name === 'Bookings') {
            iconName = 'calendar-outline';
          } else if (route.name === 'Profile') {
            iconName = 'person-outline';
          }
          return <Ionicons name={iconName} size={24} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'Home' }} />
      <Tab.Screen name="Slots" component={ComplexListScreen} options={{ title: 'Complexes' }} />
      <Tab.Screen name="Bookings" component={HistoryScreen} options={{ title: 'Bookings' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profile' }} />
    </Tab.Navigator>
  );
}

import AdminScreen from '../screens/AdminScreen';

export default function UserNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="UserTabs" component={TabNavigator} />
      <Stack.Screen name="ComplexOverview" component={ComplexOverviewScreen} />
      <Stack.Screen name="Slots" component={SlotGridScreen} />
      <Stack.Screen name="SlotDetail" component={SlotDetailScreen} />
      <Stack.Screen name="BookingConfirm" component={BookingConfirmScreen} />
      <Stack.Screen name="Ticket" component={TicketScreen} />
      <Stack.Screen name="Map" component={MapScreen} />
      <Stack.Screen name="Report" component={ReportScreen} />
      <Stack.Screen name="AdminDashboard" component={AdminScreen} />
      <Stack.Screen name="ManageFavorites" component={ManageFavoritesScreen} />
      <Stack.Screen name="SupportTickets" component={SupportTicketsScreen} />
    </Stack.Navigator>
  );
}
