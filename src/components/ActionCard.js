import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { colors } from '../constants/theme';

export default function ActionCard({ title, subtitle, onPress, color }) {
  return (
    <TouchableOpacity style={[styles.card, { backgroundColor: color || colors.panel }]} onPress={onPress} activeOpacity={0.8}>
      <View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    padding: 16,
    borderRadius: 18,
    marginRight: 12,
    justifyContent: 'center',
    minHeight: 110,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 12,
    color: colors.secondaryText,
    lineHeight: 18,
  },
});
