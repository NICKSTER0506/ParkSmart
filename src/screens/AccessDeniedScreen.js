import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors } from '../constants/theme';

export default function AccessDeniedScreen({ navigation }) {
  return (
    <View style={styles.page}>
      <Text style={styles.title}>Access Denied</Text>
      <Text style={styles.subtitle}>You do not have permission to view this section.</Text>
      <Pressable style={styles.button} onPress={() => navigation.reset({ index: 0, routes: [{ name: 'Home' }] })}>
        <Text style={styles.buttonText}>Return to Home</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.danger,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: colors.secondaryText,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  button: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 28,
    borderRadius: 18,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
});
