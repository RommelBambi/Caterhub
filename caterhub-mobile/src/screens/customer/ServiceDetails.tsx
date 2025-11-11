import React from 'react';
import { View, Image, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { Text, Button, Card, ActivityIndicator, Divider } from 'react-native-paper';
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
import { fetchCatererReviews, getCatererRating, ReviewWithUser } from '../../services/reviews';
import RatingStars from '../../components/common/RatingStars';

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
  const [reviews, setReviews] = React.useState<ReviewWithUser[]>([]);
  const [rating, setRating] = React.useState({ averageRating: 0, totalReviews: 0 });
  const [loadingReviews, setLoadingReviews] = React.useState(false);

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
        console.log(`[ServiceDetails] Fetching service ${id}...`);
        const data = await fetchService(id); // has fallback for packages
        console.log(`[ServiceDetails] Service loaded:`, {
          id: data?.id,
          name: data?.name,
          hasPackages: !!(data?.packages && data.packages.length > 0),
          packageCount: data?.packages?.length || 0,
          userId: (data as any)?.user_id,
        });
        setService(data ?? null);
        
        // Fetch reviews for this caterer
        if (data && (data as any)?.user_id) {
          setLoadingReviews(true);
          try {
            const catererId = (data as any).user_id;
            const [reviewsData, ratingData] = await Promise.all([
              fetchCatererReviews(catererId),
              getCatererRating(catererId)
            ]);
            setReviews(reviewsData);
            setRating(ratingData);
          } catch (reviewError) {
            console.error('[ServiceDetails] Error fetching reviews:', reviewError);
          } finally {
            setLoadingReviews(false);
          }
        }
      } catch (e: any) {
        console.error('[ServiceDetails] fetchService error:', e?.message || e);
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
                <TouchableOpacity 
                  style={styles.ratingRow}
                  onPress={() => navigation.navigate('AllReviews', {
                    catererId: (service as any)?.user_id,
                    catererName: service?.name
                  })}
                  activeOpacity={0.7}
                >
                  <Ionicons name="star" size={16} color="#f59e0b" />
                  <Text style={[styles.muted, { textDecorationLine: 'underline' }]}>
                    {rating.averageRating > 0 ? rating.averageRating.toFixed(1) : '0.0'} • {rating.totalReviews} {rating.totalReviews === 1 ? 'review' : 'reviews'}
                  </Text>
                </TouchableOpacity>
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

            {/* Caterer Profile Information */}
            {service.catererProfile && (
              <View style={{ paddingHorizontal: 16, marginTop: 16 }}>
                <Text style={styles.sectionTitle}>Caterer Information</Text>
                
                {/* About from caterer profile */}
                {service.catererProfile.about ? (
                  <View style={{ marginBottom: 12 }}>
                    <Text style={[styles.muted, { marginBottom: 4 }]}>{service.catererProfile.about}</Text>
                  </View>
                ) : null}
                
                {/* Contact Information */}
                <Card style={[styles.infoCard, { marginBottom: 12 }]}>
                  <Card.Content>
                    <Text style={[styles.infoSectionTitle, { marginBottom: 8 }]}>Contact</Text>
                    
                    {service.catererProfile.contactNumber && (
                      <View style={styles.infoRow}>
                        <Ionicons name="call-outline" size={18} color="#FF8000" />
                        <Text style={styles.infoText}>{service.catererProfile.contactNumber}</Text>
                      </View>
                    )}
                    
                    {service.catererProfile.email && (
                      <View style={styles.infoRow}>
                        <Ionicons name="mail-outline" size={18} color="#FF8000" />
                        <Text style={styles.infoText}>{service.catererProfile.email}</Text>
                      </View>
                    )}
                    
                    {service.catererProfile.website && (
                      <TouchableOpacity 
                        style={styles.infoRow}
                        onPress={async () => {
                          try {
                            const url = service.catererProfile!.website!.startsWith('http') 
                              ? service.catererProfile!.website 
                              : `https://${service.catererProfile!.website}`;
                            const canOpen = await Linking.canOpenURL(url);
                            if (canOpen) {
                              await Linking.openURL(url);
                            }
                          } catch (e) {
                            console.error('Error opening website:', e);
                          }
                        }}
                      >
                        <Ionicons name="globe-outline" size={18} color="#FF8000" />
                        <Text style={[styles.infoText, { color: '#3b82f6', textDecorationLine: 'underline' }]}>
                          {service.catererProfile.website}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </Card.Content>
                </Card>
                
                {/* Address */}
                {service.catererProfile.address && (
                  <Card style={[styles.infoCard, { marginBottom: 12 }]}>
                    <Card.Content>
                      <Text style={[styles.infoSectionTitle, { marginBottom: 8 }]}>Address</Text>
                      <View style={styles.infoRow}>
                        <Ionicons name="location-outline" size={18} color="#FF8000" />
                        <Text style={styles.infoText}>{service.catererProfile.address}</Text>
                      </View>
                    </Card.Content>
                  </Card>
                )}
                
                {/* Service Locations */}
                {service.locations && service.locations.length > 0 && (
                  <Card style={[styles.infoCard, { marginBottom: 12 }]}>
                    <Card.Content>
                      <Text style={[styles.infoSectionTitle, { marginBottom: 8 }]}>Service Areas</Text>
                      {service.locations.map((loc, idx) => (
                        <View key={loc.id || idx} style={{ marginBottom: 8 }}>
                          <View style={styles.infoRow}>
                            <Ionicons name="map-outline" size={18} color="#FF8000" />
                            <View style={{ flex: 1 }}>
                              {loc.address && (
                                <Text style={styles.infoText}>{loc.address}</Text>
                              )}
                              {(loc.city || loc.province) && (
                                <Text style={[styles.muted, { fontSize: 12, marginTop: 2 }]}>
                                  {[loc.city, loc.province, loc.country].filter(Boolean).join(', ')}
                                </Text>
                              )}
                              {loc.serviceRadiusKm && (
                                <Text style={[styles.muted, { fontSize: 11, marginTop: 2, fontStyle: 'italic' }]}>
                                  Service radius: {loc.serviceRadiusKm} km
                                </Text>
                              )}
                            </View>
                          </View>
                        </View>
                      ))}
                    </Card.Content>
                  </Card>
                )}
                
                {/* Social Media */}
                {(service.catererProfile.facebook || service.catererProfile.instagram) && (
                  <Card style={styles.infoCard}>
                    <Card.Content>
                      <Text style={[styles.infoSectionTitle, { marginBottom: 8 }]}>Follow Us</Text>
                      <View style={{ flexDirection: 'row', gap: 16 }}>
                        {service.catererProfile.facebook && (
                          <TouchableOpacity 
                            style={styles.socialButton}
                            onPress={async () => {
                              try {
                                const url = service.catererProfile!.facebook!.startsWith('http')
                                  ? service.catererProfile!.facebook
                                  : `https://facebook.com/${service.catererProfile!.facebook}`;
                                const canOpen = await Linking.canOpenURL(url);
                                if (canOpen) {
                                  await Linking.openURL(url);
                                }
                              } catch (e) {
                                console.error('Error opening Facebook:', e);
                              }
                            }}
                          >
                            <Ionicons name="logo-facebook" size={24} color="#1877f2" />
                            <Text style={[styles.infoText, { marginLeft: 4 }]}>Facebook</Text>
                          </TouchableOpacity>
                        )}
                        {service.catererProfile.instagram && (
                          <TouchableOpacity 
                            style={styles.socialButton}
                            onPress={async () => {
                              try {
                                const url = service.catererProfile!.instagram!.startsWith('http')
                                  ? service.catererProfile!.instagram
                                  : `https://instagram.com/${service.catererProfile!.instagram}`;
                                const canOpen = await Linking.canOpenURL(url);
                                if (canOpen) {
                                  await Linking.openURL(url);
                                }
                              } catch (e) {
                                console.error('Error opening Instagram:', e);
                              }
                            }}
                          >
                            <Ionicons name="logo-instagram" size={24} color="#e4405f" />
                            <Text style={[styles.infoText, { marginLeft: 4 }]}>Instagram</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </Card.Content>
                  </Card>
                )}
              </View>
            )}

            <Text style={[styles.sectionTitle, { paddingHorizontal: 16, marginTop: 16 }]}>
              Packages
            </Text>

            <View style={{ paddingHorizontal: 16 }}>
              {!service.user_id && (
                <Card style={[styles.pkgCard, { backgroundColor: '#fef3c7', borderColor: '#f59e0b', borderWidth: 1 }]}>
                  <Card.Content>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                      <Ionicons name="warning" size={20} color="#f59e0b" />
                      <Text style={[styles.pkgTitle, { marginLeft: 8, color: '#92400e' }]}>
                        Service Not Linked to Caterer
                      </Text>
                    </View>
                    <Text style={[styles.muted, { fontSize: 13, marginBottom: 8 }]}>
                      This service is not linked to a caterer account. Packages cannot be displayed until the service is properly linked to a caterer via the user_id field.
                    </Text>
                    <Text style={[styles.muted, { fontSize: 12, fontStyle: 'italic' }]}>
                      Database relationship: packages.caterer_id = services.user_id
                    </Text>
                  </Card.Content>
                </Card>
              )}
              {service.user_id && (service.packages ?? []).length === 0 && (
                <Card style={[styles.pkgCard, { backgroundColor: '#eff6ff', borderColor: '#3b82f6', borderWidth: 1 }]}>
                  <Card.Content>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                      <Ionicons name="information-circle" size={20} color="#3b82f6" />
                      <Text style={[styles.pkgTitle, { marginLeft: 8, color: '#1e40af' }]}>
                        No Packages Available
                      </Text>
                    </View>
                    <Text style={[styles.muted, { fontSize: 13 }]}>
                      This caterer hasn't created any packages yet. Please check back later or contact the caterer directly.
                    </Text>
                  </Card.Content>
                </Card>
              )}
              {(service.packages ?? []).length > 0 ? (
                service.packages!.map((pkg) => {
                  // Display sections (from database packages) or categories (from old format)
                  const sections = (pkg as any)._raw?.sections || [];
                  const inclusions = (pkg as any)._raw?.inclusions || [];
                  const categories = pkg.categories || [];
                  
                  return (
                    <Card key={pkg.id} style={styles.pkgCard}>
                      <Card.Content>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                          <Text style={styles.pkgTitle}>{pkg.name}</Text>
                          <Text style={styles.pkgPrice}>{`₱ ${pkg.pricePerHead}`}</Text>
                        </View>

                        {/* Display sections (food categories with dishes) */}
                        {sections.length > 0 && (
                          <>
                            {sections.map((section: any, sectionIdx: number) => (
                              <View key={sectionIdx} style={styles.sectionBlock}>
                                <Text style={styles.packageSectionTitle}>
                                  {`Choice of ${String(section.category || 'Category').replace(/^\w/, (c) => c.toUpperCase())}`}
                                </Text>
                                {/* Dish options are intentionally hidden on the card. They will be shown in the customization flow. */}
                              </View>
                            ))}
                          </>
                        )}

                        {/* Display categories (old format - for backward compatibility) */}
                        {categories.length > 0 && sections.length === 0 && (
                          <>
                            {categories.map((cat) => (
                              <View key={cat.id} style={styles.inclusionRow}>
                                <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                                <Text style={styles.inclusionText}>{cat.name}</Text>
                              </View>
                            ))}
                          </>
                        )}

                        {/* Display inclusions (add-ons) */}
                        {inclusions.length > 0 && (
                          <>
                            <Text style={styles.inclusionsTitle}>Inclusions:</Text>
                            {inclusions.map((inc: any, incIdx: number) => (
                              <View key={incIdx} style={styles.inclusionRow}>
                                <Ionicons name="add-circle" size={14} color="#9333ea" />
                                <Text style={styles.inclusionText}>
                                  {inc.name} {inc.price ? `(${inc.price})` : ''}
                                </Text>
                              </View>
                            ))}
                          </>
                        )}

                        <Button
                          mode="contained"
                        style={{ marginTop: 16, backgroundColor: '#FF8000' }}
                          onPress={() => selectPackage(pkg)}
                        >
                          Select package
                        </Button>
                      </Card.Content>
                    </Card>
                  );
                })
              ) : (
                <Text style={[styles.muted, { paddingHorizontal: 2 }]}>No packages available yet.</Text>
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

  infoCard: { marginBottom: 12, borderRadius: 12, backgroundColor: '#f9fafb', elevation: 1 },
  infoSectionTitle: { fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 4 },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8 },
  infoText: { flex: 1, color: '#374151', fontSize: 14 },
  socialButton: { flexDirection: 'row', alignItems: 'center', padding: 8, borderRadius: 8, backgroundColor: '#fff' },

  pkgCard: { marginBottom: 16, borderRadius: 12, overflow: 'hidden', elevation: 2 },
  inclusionRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  inclusionText: { color: '#374151', fontSize: 14 },
  pkgTitle: { fontWeight: '700', fontSize: 18, marginBottom: 4 },
  pkgPrice: { fontSize: 16, fontWeight: '600', color: '#10b981', marginBottom: 12 },
  sectionBlock: { marginBottom: 12, paddingVertical: 8, borderLeftWidth: 3, borderLeftColor: '#FF8000', paddingLeft: 12 },
  packageSectionTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 6 },
  dishRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4, marginLeft: 4 },
  dishText: { color: '#4b5563', fontSize: 14 },
  inclusionsTitle: { fontSize: 14, fontWeight: '600', color: '#6b7280', marginTop: 12, marginBottom: 6 },
});
