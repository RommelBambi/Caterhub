import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

import { getMyFavorites, Service, fetchServices } from '../../services/services';
import { useAuth } from '../../store/auth';

export default function FavoritesScreen({ navigation }: any) {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = React.useState(true);
  const [favorites, setFavorites] = React.useState<Service[]>([]);

  useFocusEffect(
    React.useCallback(() => {
      // Note: Tab reset logic is handled in MainTabs.tsx tabPress listeners
      let isActive = true;
      (async () => {
        try {
          setLoading(true);
          if (!user) {
            if (isActive) setFavorites([]);
            return;
          }

          const [favIds, all] = await Promise.all([getMyFavorites(), fetchServices()]);
          if (!isActive) return;

          const favs = all.filter((s) => favIds.includes(Number(s.id)));
          setFavorites(favs);
        } catch (e) {
          console.error('Favorites load error:', e);
          if (isActive) setFavorites([]);
        } finally {
          if (isActive) setLoading(false);
        }
      })();

      return () => {
        isActive = false;
      };
    }, [user?.id])
  );

  const goToDetails = (svc: Service) =>
    navigation.navigate('ServiceDetails', { service: svc });

  // --- Loading ---
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  // --- Empty state ---
  if (!favorites.length) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backTap}
          >
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Favorites</Text>
        </View>

        <View style={styles.center}>
          <Ionicons name="heart-outline" size={60} color="#9ca3af" />
          <Text style={styles.emptyTitle}>No favorites yet</Text>
          <Text style={styles.emptyText}>
            Tap the heart ♥ on a catering to save it here.
          </Text>
        </View>
      </View>
    );
  }

  // --- Favorites list ---
  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backTap}
        >
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Favorites</Text>
      </View>

      <ScrollView
        style={{ flex: 1, backgroundColor: '#fff' }}
        contentContainerStyle={{ padding: 16 }}
        showsVerticalScrollIndicator={false}
      >
        {favorites.map((svc) => (
          <TouchableOpacity
            key={svc.id}
            onPress={() => goToDetails(svc)}
            activeOpacity={0.8}
          >
            <View style={styles.card}>
              <Image
                source={{
                  uri:
                    svc.imageUrl ||
                    svc.logoUrl ||
                    'https://picsum.photos/400/200',
                }}
                style={styles.cardImg}
              />
              <View style={{ padding: 8 }}>
                <Text style={styles.name}>{svc.name}</Text>
                {(svc.pricePerHead ?? 0) > 0 && (
                  <Text style={styles.meta}>₱{svc.pricePerHead} / head</Text>
                )}
                <View style={{ flexDirection: 'row', marginTop: 4 }}>
                  <Ionicons name="star" size={14} color="#f59e0b" />
                  <Text style={styles.rating}>
                    {(svc.rating ?? 4.8).toFixed(1)}
                  </Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },

  header: {
    backgroundColor: '#FF8000',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 10,
    elevation: 2,
  },
  backTap: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginRight: 8,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },

  // Featured-style vertical card
  card: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
    backgroundColor: '#fff',
    elevation: 2,
  },
  cardImg: {
    width: '100%',
    height: 140,
    backgroundColor: '#f3f4f6',
  },
  name: { fontSize: 16, fontWeight: '700', marginTop: 4 },
  meta: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  rating: { marginLeft: 4, color: '#4b5563', fontSize: 12 },

  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
    color: '#374151',
  },
  emptyText: { color: '#6b7280', marginTop: 4, textAlign: 'center' },
});
