// src/screens/home/HomeScreen.tsx
import React from 'react';
import {
  View,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Text, Searchbar, Card, ActivityIndicator } from 'react-native-paper';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '../../store/auth';
import {
  fetchServices,
  fetchTopServices,
  addFavorite,
  removeFavorite,
  getMyFavorites,
  Service,
} from '../../services/services';

export default function HomeScreen({ navigation }: any) {
  const { user, updateMe } = useAuth();
  const [query, setQuery] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const insets = useSafeAreaInsets();

  const [featured, setFeatured] = React.useState<Service[]>([]);
  const [mostLiked, setMostLiked] = React.useState<Service[]>([]);
  const [mostBooked, setMostBooked] = React.useState<Service[]>([]);
  const [all, setAll] = React.useState<Service[]>([]);
  const [favIds, setFavIds] = React.useState<number[]>([]);

  // Initial load
  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const [services, topLikesRaw, topBookedRaw] = await Promise.all([
          fetchServices(),
          fetchTopServices('likes', 8),
          fetchTopServices('bookings', 8),
        ]);

        const topLikes = (topLikesRaw || []).filter(
          (s: any) => (s.favoritesCount ?? 0) > 0
        );
        const topBooked = (topBookedRaw || []).filter(
          (s: any) => (s.bookingsCount ?? 0) > 0
        );

        if (!mounted) return;
        setAll(services);
        setFeatured(services.slice(0, 6));
        setMostLiked(topLikes);
        setMostBooked(topBooked);

        if (user) {
          const ids = await getMyFavorites();
          if (!mounted) return;
          setFavIds(ids);
        }
      } catch {
        // optionally show a snackbar
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [user?.id]);

  // Refresh favorites when returning to Home (fixes heart mismatch after navigating back)
  useFocusEffect(
    React.useCallback(() => {
      let alive = true;
      (async () => {
        if (!user) return;
        try {
          const ids = await getMyFavorites();
          if (alive) setFavIds(ids);
        } catch {}
      })();
      return () => {
        alive = false;
      };
    }, [user?.id])
  );

  const isFav = (id: number | string) => favIds.includes(Number(id));
  const toggleFav = async (id: number | string) => {
    const n = Number(id);
    try {
      // optimistic
      setFavIds((prev) =>
        isFav(n) ? prev.filter((x) => x !== n) : [...prev, n]
      );
      if (isFav(n)) await removeFavorite(n);
      else await addFavorite(n);
    } catch {
      // noop; could rollback if you want to
    }
  };

  const onPressLocation = () => {
    Alert.alert(
      'Set Location',
      'Pick a quick location to save.',
      [
        { text: 'Manila, PH', onPress: () => updateMe?.({ location: 'Manila, PH' }) },
        { text: 'Quezon City, PH', onPress: () => updateMe?.({ location: 'Quezon City, PH' }) },
        { text: 'Cancel', style: 'cancel' },
      ],
      { cancelable: true }
    );
  };

  const goToDetails = (svc: Service) => {
    navigation.navigate('ServiceDetails', { service: svc });
  };

  const filtered = all.filter((s) =>
    query ? s.name.toLowerCase().includes(query.toLowerCase()) : true
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#C836F9', '#a855f7']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top }]}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={onPressLocation}
            style={{ flexDirection: 'row', alignItems: 'center' }}
            hitSlop={12}
          >
            <Ionicons name="location-outline" size={18} color="#fff" />
            <Text style={styles.headerLocation}>
              {user?.location ?? 'Set location'}
            </Text>
          </TouchableOpacity>

          <View style={{ flexDirection: 'row', gap: 14 }}>
            {/* Heart icon to navigate to Favorites screen */}
            <TouchableOpacity
              onPress={() => navigation.navigate('Favorites')}
              hitSlop={12}
            >
              <Feather name="heart" size={20} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.getParent()?.navigate('Bookings')} hitSlop={12}>
              <Feather name="calendar" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        <Searchbar
          placeholder="Search catering or cuisine"
          value={query}
          onChangeText={setQuery}
          style={styles.search}
          inputStyle={{ fontSize: 14 }}
        />
      </LinearGradient>

      {/* Body */}
      <ScrollView
        style={styles.body}
        contentContainerStyle={{ paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <ActivityIndicator style={{ marginTop: 24 }} />
        ) : (
          <>
            {/* Featured */}
            <Text style={styles.sectionTitle}>Featured</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16 }}
            >
              {featured.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => goToDetails(item)}
                  activeOpacity={0.8}
                >
                  <Card style={styles.featuredCard}>
                    <Image
                      source={{
                        uri:
                          item.imageUrl ||
                          item.logoUrl ||
                          'https://picsum.photos/400/200',
                      }}
                      style={styles.featuredImg}
                    />
                    <View style={{ padding: 8 }}>
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <Text style={styles.featuredName}>{item.name}</Text>
                        <TouchableOpacity
                          onPress={() => toggleFav(item.id)}
                          style={{ padding: 4 }}
                        >
                          <Ionicons
                            name={isFav(item.id) ? 'heart' : 'heart-outline'}
                            size={18}
                            color={isFav(item.id) ? '#ef4444' : '#9ca3af'}
                          />
                        </TouchableOpacity>
                      </View>
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          marginTop: 2,
                        }}
                      >
                        <Ionicons name="star" size={14} color="#f59e0b" />
                        <Text style={{ marginLeft: 4, color: '#4b5563' }}>
                          {(item.rating ?? 4.8).toFixed(1)}
                        </Text>
                      </View>
                    </View>
                  </Card>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Most liked */}
            {mostLiked.length > 0 && (
              <>
                <Text style={[styles.sectionTitle, { marginTop: 18 }]}>
                  Most liked
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingHorizontal: 16 }}
                >
                  {mostLiked.map((svc) => (
                    <TouchableOpacity
                      key={svc.id}
                      onPress={() => goToDetails(svc)}
                      activeOpacity={0.8}
                    >
                      <Card style={styles.smallCard}>
                        <Image
                          source={{
                            uri:
                              svc.imageUrl ||
                              svc.logoUrl ||
                              'https://picsum.photos/300/200',
                          }}
                          style={styles.smallImg}
                        />
                        <View style={{ padding: 8 }}>
                          <Text style={styles.smallName} numberOfLines={1}>
                            {svc.name}
                          </Text>
                          <Text style={styles.metaText}>
                            ❤️ {svc.favoritesCount ?? 0}
                          </Text>
                        </View>
                      </Card>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            )}

            {/* Most popular (most booked) */}
            {mostBooked.length > 0 && (
              <>
                <Text style={[styles.sectionTitle, { marginTop: 18 }]}>
                  Most popular
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingHorizontal: 16 }}
                >
                  {mostBooked.map((svc) => (
                    <TouchableOpacity
                      key={svc.id}
                      onPress={() => goToDetails(svc)}
                      activeOpacity={0.8}
                    >
                      <Card style={styles.smallCard}>
                        <Image
                          source={{
                            uri:
                              svc.imageUrl ||
                              svc.logoUrl ||
                              'https://picsum.photos/300/200',
                          }}
                          style={styles.smallImg}
                        />
                        <View style={{ padding: 8 }}>
                          <Text style={styles.smallName} numberOfLines={1}>
                            {svc.name}
                          </Text>
                          <Text style={styles.metaText}>
                            📅 {svc.bookingsCount ?? 0}
                          </Text>
                        </View>
                      </Card>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            )}

            {/* Service list (search filtered) */}
            <Text style={[styles.sectionTitle, { marginTop: 18 }]}>
              All services
            </Text>
            <View style={{ paddingHorizontal: 16 }}>
              {filtered.map((svc) => (
                <TouchableOpacity
                  key={svc.id}
                  onPress={() => goToDetails(svc)}
                  activeOpacity={0.8}
                >
                  <View style={styles.serviceRow}>
                    <Image
                      source={{
                        uri:
                          svc.imageUrl ||
                          svc.logoUrl ||
                          'https://picsum.photos/200/200',
                      }}
                      style={styles.serviceImg}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.serviceName}>{svc.name}</Text>
                      <Text style={styles.servicePrice}>
                        price start at {svc.pricePerHead} per head
                      </Text>
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          marginTop: 2,
                        }}
                      >
                        <Ionicons name="star" size={14} color="#f59e0b" />
                        <Text style={{ marginLeft: 4, color: '#4b5563' }}>
                          {(svc.rating ?? 4.8).toFixed(1)}
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      onPress={() => toggleFav(svc.id)}
                      style={{ padding: 6 }}
                    >
                      <Ionicons
                        name={isFav(svc.id) ? 'heart' : 'heart-outline'}
                        size={22}
                        color={isFav(svc.id) ? '#ef4444' : '#9ca3af'}
                      />
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const RADIUS = 24;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#C836F9' },

  header: {
    height: 180,
    paddingTop: 18,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  headerRow: {
    marginTop: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLocation: { color: '#fff', fontWeight: '600', marginLeft: 6, fontSize: 14 },
  search: {
    marginTop: 14,
    borderRadius: 12,
    elevation: 2,
  },

  body: {
    flex: 1,
    backgroundColor: '#fff',
    borderTopLeftRadius: RADIUS,
    borderTopRightRadius: RADIUS,
    marginTop: -20,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
    paddingHorizontal: 16,
  },

  // Featured
  featuredCard: { width: 220, marginRight: 12, borderRadius: 12, overflow: 'hidden' },
  featuredImg: { width: '100%', height: 110 },
  featuredName: { fontWeight: '700', marginTop: 2 },

  // Small cards (most liked / most popular)
  smallCard: { width: 170, marginRight: 12, borderRadius: 12, overflow: 'hidden' },
  smallImg: { width: '100%', height: 90 },
  smallName: { fontWeight: '700' },
  metaText: { color: '#6b7280', marginTop: 2, fontSize: 12 },

  serviceRow: {
    flexDirection: 'row',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 10,
    gap: 12,
    backgroundColor: '#fff',
  },
  serviceImg: { width: 72, height: 72, borderRadius: 10 },
  serviceName: { fontWeight: '700', fontSize: 16 },
  servicePrice: { color: '#6b7280', marginTop: 2, fontSize: 12 },
});
