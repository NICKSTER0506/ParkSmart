import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../constants/theme';

export default function PredictionCard({ label, level, recommendation, accent }) {
  return (
    <View style={[styles.card, { borderColor: accent || colors.primaryLight, backgroundColor: accent ? `${accent}10` : colors.panel }]}> 
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.level, { color: accent || colors.primary }]}>{level}</Text>
      <Text style={styles.recommendation}>{recommendation}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 22,
    padding: 20,
    marginBottom: 18,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
    backgroundColor: colors.panel,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.secondaryText,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  level: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 8,
  },
  recommendation: {
    fontSize: 14,
    color: colors.secondaryText,
    lineHeight: 20,
  },
});
