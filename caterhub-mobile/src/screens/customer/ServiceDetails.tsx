import React from 'react';
import { View, Image, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text, Button, Card, ActivityIndicator } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  fetchService,
  Service,
  ServicePackage,
  getMyFavorites,
  addFavorite,
  removeFavorite,
} from '../../services/services';
import { useAuth } from '../../store/auth';

export default function ServiceDetails({ route, navigation }: any) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const paramId = Number(route.params?.serviceId);
  const shallow = route.params?.service as Service | undefined;
  const fallbackId = Number(shallow?.id);
  const id = Number.isFinite(paramId) && paramId > 0 ? paramId : fallbackId;

  const [service, setService] = React.useState<Service | null>(null);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | null>(null);
  const [favIds, setFavIds] = React.useState<number[]>([]);

  React.useEffect(() => {
    if (!id) {
      setLoading(false);
      setError('Missing service id.');
      return;
    }
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchService(id); // has fallback for packages
        setService(data ?? null);
      } catch (e: any) {
        console.log('[ServiceDetails] fetchService error:', e?.message || e);
        setError('Failed to load service.');
        setService(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  React.useEffect(() => {
    let alive = true;
    (async () => {
      try {
        if (!user) return setFavIds([]);
        const ids = await getMyFavorites();
        if (alive) setFavIds(ids);
      } catch {}
    })();
    return () => { alive = false; };
  }, [user?.id]);

  const isFav = (sid: number) => favIds.includes(Number(sid));
  const toggleFav = async (sid: number) => {
    const nId = Number(sid);
    setFavIds(prev => (isFav(nId) ? prev.filter(x => x !== nId) : [...prev, nId])); // optimistic
    try {
      if (isFav(nId)) await removeFavorite(nId);
      else await addFavorite(nId);
    } catch {
      try {
        const ids = await getMyFavorites();
        setFavIds(ids);
      } catch {}
    }
  };

  const selectPackage = (pkg: ServicePackage) => {
    if (!service) return;
    navigation.navigate('CustomizePackage', { service, pkg });
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 12 }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        <View style={styles.topRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backTap}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator style={{ marginTop: 24 }} />
        ) : error ? (
          <Text style={styles.muted}>{error}</Text>
        ) : !service ? (
          <Text style={styles.muted}>Not found.</Text>
        ) : (
          <>
            <View style={styles.header}>
              <Image
                source={{ uri: service.logoUrl || service.imageUrl || 'https://picsum.photos/800/400' }}
                style={styles.logo}
              />
            </View>

            <View style={styles.titleRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{service.name}</Text>
                <View style={styles.ratingRow}>
                  <Ionicons name="star" size={16} color="#f59e0b" />
                  <Text style={styles.muted}>
                    {(service.rating ?? 4.8).toFixed(1)} • {service.reviewsCount ?? 120} reviews
                  </Text>
                </View>
              </View>

              <TouchableOpacity onPress={() => toggleFav(Number(service.id))} style={styles.heartTap}>
                <Ionicons
                  name={isFav(Number(service.id)) ? 'heart' : 'heart-outline'}
                  size={26}
                  color={isFav(Number(service.id)) ? '#ef4444' : '#9ca3af'}
                />
              </TouchableOpacity>
            </View>

            {service.description ? (
              <View style={{ paddingHorizontal: 16, marginTop: 4 }}>
                <Text style={styles.sectionTitle}>About</Text>
                <Text style={styles.muted}>{service.description}</Text>
              </View>
            ) : null}

            <Text style={[styles.sectionTitle, { paddingHorizontal: 16, marginTop: 16 }]}>
              Packages
            </Text>

            <View style={{ paddingHorizontal: 16 }}>
              {(service.packages ?? []).length > 0 ? (
                service.packages!.map((pkg) => (
                  <Card key={pkg.id} style={styles.pkgCard}>
                    <Card.Content>
                      <Text style={styles.pkgTitle}>
                        {pkg.name} • ₱{pkg.pricePerHead} / head
                      </Text>

                      {(pkg.categories ?? []).map((cat) => (
                        <View key={cat.id} style={styles.inclusionRow}>
                          <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                          <Text style={styles.inclusionText}>{cat.name}</Text>
                        </View>
                      ))}

                      <Button
                        mode="contained"
                        style={{ marginTop: 10, backgroundColor: '#C836F9' }}
                        onPress={() => selectPackage(pkg)}
                      >
                        Select package
                      </Button>
                    </Card.Content>
                  </Card>
                ))
              ) : (
                <Text style={[styles.muted, { paddingHorizontal: 2 }]}>No packages yet.</Text>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', paddingHorizontal: 16 },
  topRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  backTap: { padding: 6, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.04)' },

  header: { paddingTop: 8, alignItems: 'center' },
  logo: { width: '100%', height: 180, borderRadius: 12, backgroundColor: '#f3f4f6' },

  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 10 },
  name: { flexShrink: 1, fontSize: 22, fontWeight: '700' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  heartTap: { padding: 6 },

  muted: { color: '#6b7280' },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8 },

  pkgCard: { marginBottom: 12, borderRadius: 12, overflow: 'hidden' },
  inclusionRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  inclusionText: { color: '#374151' },
  pkgTitle: { fontWeight: '700', fontSize: 16, marginBottom: 6 },
});
