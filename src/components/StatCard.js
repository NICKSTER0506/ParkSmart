import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../constants/theme';

export default function StatCard({ label, value, accent }) {
  return (
    <View style={[styles.card, accent && { borderColor: accent, backgroundColor: colors.primaryLight }]}> 
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 100,
    borderRadius: 18,
    padding: 18,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  value: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
  },
  label: {
    fontSize: 13,
    color: colors.secondaryText,
    lineHeight: 18,
  },
});
