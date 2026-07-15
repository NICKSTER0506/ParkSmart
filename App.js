import 'react-native-gesture-handler';
import React from 'react';
import { View, StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { AuthProvider } from './src/context/AuthContext';
import { ParkingProvider } from './src/context/ParkingContext';
import AppNavigator from './src/navigation/AppNavigator';
import CustomAlert from './src/components/CustomAlert';

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <ParkingProvider>
          <View style={{ flex: 1 }}>
            <StatusBar barStyle="dark-content" backgroundColor="#F1EFE8" />
            <NavigationContainer>
              <AppNavigator />
            </NavigationContainer>
            <CustomAlert />
          </View>
        </ParkingProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
