import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator, Platform } from 'react-native';
import { colors } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { subscribeToComplexesRealtime, toggleFavorite } from '../../services/firestore';
import { useAuth } from '../../context/AuthContext';

export default function ManageFavoritesScreen({ navigation }) {
  const { user, userDoc } = useAuth();
  const [complexes, setComplexes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = subscribeToComplexesRealtime((data) => {
      setComplexes(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleToggle = async (complexId, isFav) => {
    try {
      await toggleFavorite(user.uid, complexId, isFav);
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const favorites = userDoc?.favorites || [];
  const favoriteComplexes = complexes.filter(c => favorites.includes(c.id));

  return (
    <View style={styles.page}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={15}>
          <Ionicons name="arrow-back" size={24} color="#2C2C2A" />
        </Pressable>
        <Text style={styles.title}>Saved Locations</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {favoriteComplexes.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="star-outline" size={48} color="#D3D1C7" />
            <Text style={styles.emptyText}>No saved locations.</Text>
            <Text style={styles.emptySubtext}>Star a complex to access it quickly here.</Text>
          </View>
        ) : (
          favoriteComplexes.map((complex) => {
            const isFav = true;
            return (
              <Pressable 
                key={complex.id} 
                style={styles.card}
                onPress={() => navigation.navigate('ComplexOverview', { complex })}
              >
                <View style={styles.info}>
                  <Text style={styles.name}>{complex.name}</Text>
                  {complex.location && <Text style={styles.location}>{complex.location}</Text>}
                </View>
                <Pressable
                  style={[styles.toggleBtn, isFav ? styles.btnFav : styles.btnUnfav]}
                  onPress={() => handleToggle(complex.id, isFav)}
                >
                  <Ionicons name={isFav ? "star" : "star-outline"} size={20} color={isFav ? "#FFFFFF" : colors.primary} />
                  <Text style={[styles.btnText, isFav && styles.btnTextFav]}>
                    {isFav ? 'Saved' : 'Save'}
                  </Text>
                </Pressable>
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#F1EFE8' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 60 : 16,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: { marginRight: 16 },
  title: { fontSize: 20, fontWeight: '800', color: '#2C2C2A' },
  content: { padding: 16 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  info: { flex: 1, paddingRight: 12 },
  name: { fontSize: 16, fontWeight: '700', color: '#2C2C2A', marginBottom: 4 },
  location: { fontSize: 13, color: '#5F5E5A' },
  toggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  btnUnfav: {
    backgroundColor: '#F1EFE8',
    borderColor: colors.primary,
  },
  btnFav: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  btnText: {
    marginLeft: 4,
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  btnTextFav: {
    color: '#FFFFFF',
  },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
  },
  emptyText: { fontSize: 18, fontWeight: '700', color: '#2C2C2A', marginTop: 16 },
  emptySubtext: { fontSize: 14, color: '#5F5E5A', marginTop: 8 }
});
