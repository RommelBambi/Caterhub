// src/screens/customer/HomeScreen.tsx
import React from 'react';
import {
  View,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
} from 'react-native';
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
  searchServices,
  Service,
} from '../../services/services';
import InteractiveMapPicker from '../../components/InteractiveMapPicker';
import { filterServicesByDistance, getServiceDistance, formatDistance, calculateDistance } from '../../services/location';
import { getPrimaryLocation } from '../../services/userLocations';

export default function HomeScreen({ navigation }: any) {
  const { user, updateMe } = useAuth();
  const [query, setQuery] = React.useState('');
  const [searchResults, setSearchResults] = React.useState<Service[]>([]);
  const [isSearching, setIsSearching] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const insets = useSafeAreaInsets();

  const [featured, setFeatured] = React.useState<Service[]>([]);
  const [mostBooked, setMostBooked] = React.useState<Service[]>([]);
  const [all, setAll] = React.useState<Service[]>([]);
  const [favIds, setFavIds] = React.useState<number[]>([]);
  const [showLocationPicker, setShowLocationPicker] = React.useState(false);
  const [userLocation, setUserLocation] = React.useState<{ latitude: number; longitude: number; address: string } | null>(null);
  const [showAllServicesModal, setShowAllServicesModal] = React.useState(false);

  // Load saved location
  const loadSavedLocation = async () => {
    try {
      const savedLocation = await getPrimaryLocation();
      if (savedLocation) {
        setUserLocation({
          latitude: savedLocation.latitude,
          longitude: savedLocation.longitude,
          address: savedLocation.address,
        });
      }
    } catch (error) {
      // Only log authentication errors, don't show to user
      if (error instanceof Error && !error.message.includes('not authenticated')) {
        console.error('Failed to load saved location:', error);
      }
    }
  };

  // Initial load
  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        console.log('[HomeScreen] Starting to fetch services...');
        
        const [services, topBookedRaw] = await Promise.all([
          fetchServices(),
          fetchTopServices('bookings', 8),
        ]);

        console.log(`[HomeScreen] Fetched ${services.length} services, ${topBookedRaw.length} top booked`);

        // Show all services for "Most Popular" section, sorted by bookings count
        const topBooked = (topBookedRaw || []).sort(
          (a: any, b: any) => (b.bookingsCount ?? 0) - (a.bookingsCount ?? 0)
        );

        if (!mounted) return;
        
        setAll(services);
        setFeatured(services.slice(0, 6));
        setMostBooked(topBooked);

        console.log(`[HomeScreen] Set ${services.length} all services, ${services.slice(0, 6).length} featured, ${topBooked.length} most booked`);
        
        // Diagnostic: Count unique caterers
        const uniqueCaterers = new Set(services.filter(s => s.user_id).map(s => s.user_id));
        console.log(`[HomeScreen] DIAGNOSTIC: Total services: ${services.length}, Unique caterers: ${uniqueCaterers.size}`);
        if (uniqueCaterers.size === 1 && services.length > 1) {
          console.warn(`[HomeScreen] WARNING: All ${services.length} services belong to the same caterer!`);
        }

        if (user) {
          try {
            const ids = await getMyFavorites();
            if (!mounted) return;
            setFavIds(ids);
            console.log(`[HomeScreen] Loaded ${ids.length} favorites`);
          } catch (favError) {
            console.error('[HomeScreen] Error loading favorites:', favError);
          }
        }
      } catch (error: any) {
        console.error('[HomeScreen] Error fetching services:', error);
        console.error('[HomeScreen] Error details:', JSON.stringify(error, null, 2));
        // Show error to user
        Alert.alert(
          'Error Loading Services',
          error?.message || 'Failed to load catering services. Please check your connection and try again.',
          [{ text: 'OK' }]
        );
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [user?.id]);

  // Load saved location when user is authenticated
  React.useEffect(() => {
    if (user) {
      loadSavedLocation();
    }
  }, [user]);

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
    setShowLocationPicker(true);
  };

  const handleLocationSelect = async (location: { latitude: number; longitude: number; address: string }) => {
    console.log(`[HomeScreen] Location selected:`, {
      lat: location.latitude,
      lng: location.longitude,
      address: location.address
    });
    setUserLocation(location);
    // Update user location in database
    await updateMe?.({ location: location.address });
    console.log(`[HomeScreen] User location updated, nearby services will recalculate`);
  };

  const goToDetails = (svc: Service) => {
    navigation.navigate('ServiceDetails', { service: svc });
  };

  // Debounced search function
  const performSearch = React.useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    try {
      const results = await searchServices(searchQuery);
      setSearchResults(results);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Debounce search input
  React.useEffect(() => {
    const timeoutId = setTimeout(() => {
      performSearch(query);
    }, 500); // 500ms delay

    return () => clearTimeout(timeoutId);
  }, [query, performSearch]);

  // Use search results if query exists, otherwise use all services
  const filtered = query.trim() ? searchResults : all;
  
  // Filter and sort nearby services by distance when location is set
  const nearbyServices = React.useMemo(() => {
    if (!userLocation) {
      console.log(`[HomeScreen] No user location set, returning empty nearby services`);
      return [];
    }
    
    console.log(`[HomeScreen] ========================================`);
    console.log(`[HomeScreen] RECALCULATING nearby services for location:`, {
      lat: userLocation.latitude,
      lng: userLocation.longitude,
      address: userLocation.address
    });
    console.log(`[HomeScreen] Total services to filter: ${filtered.length}`);
    console.log(`[HomeScreen] Services with coordinates: ${filtered.filter(s => s.latitude && s.longitude).length}`);
    
    // Filter services that have coordinates and are within service radius
    const servicesWithDistance = filtered
      .map(svc => {
        // Check if service has coordinates
        if (!svc.latitude || !svc.longitude) {
          console.log(`[HomeScreen] Service ${svc.name} has no coordinates`);
          return null;
        }
        
        // Check if service is within any of its service areas (from locations)
        let isWithinRange = false;
        let minDistance = Infinity;
        
        if (svc.locations && Array.isArray(svc.locations) && svc.locations.length > 0) {
          // Check if user is within any service location's radius
          let hasValidLocation = false;
          for (const loc of svc.locations) {
            if (loc.latitude && loc.longitude) {
              hasValidLocation = true;
              const serviceDistance = calculateDistance(
                userLocation.latitude,
                userLocation.longitude,
                loc.latitude,
                loc.longitude
              );
              
              // Use service radius if available, otherwise skip this location (caterer must set radius)
              if (!loc.serviceRadiusKm) {
                console.warn(`[HomeScreen] Service ${svc.name} location has no serviceRadiusKm set, skipping`);
                continue; // Skip locations without radius
              }
              const maxRadius = loc.serviceRadiusKm;
              
              console.log(`[HomeScreen] Service ${svc.name} location check:`, {
                serviceLocation: { lat: loc.latitude, lng: loc.longitude },
                userLocation: { lat: userLocation.latitude, lng: userLocation.longitude },
                distance: serviceDistance.toFixed(2) + 'km',
                maxRadius: maxRadius + 'km',
                withinRange: serviceDistance <= maxRadius
              });
              
              if (serviceDistance <= maxRadius) {
                isWithinRange = true;
                minDistance = Math.min(minDistance, serviceDistance);
              }
            } else {
              console.warn(`[HomeScreen] Service ${svc.name} location missing coordinates:`, loc);
            }
          }
          
          if (!hasValidLocation) {
            console.warn(`[HomeScreen] Service ${svc.name} has locations array but none have coordinates`);
          }
        } else {
          // If no locations defined, service cannot be shown (caterer must set locations with service radius)
          console.warn(`[HomeScreen] Service ${svc.name} has no locations defined, cannot determine service area`);
          return null; // Don't show services without defined locations
        }
        
        return isWithinRange ? { ...svc, _distance: minDistance } : null;
      })
      .filter((svc): svc is Service & { _distance: number } => svc !== null)
      .sort((a, b) => a._distance - b._distance); // Sort by distance (closest first)
    
    console.log(`[HomeScreen] ========================================`);
    console.log(`[HomeScreen] Found ${servicesWithDistance.length} nearby services within range`);
    if (servicesWithDistance.length > 0) {
      console.log(`[HomeScreen] Nearby services (sorted by distance):`, servicesWithDistance.map(s => ({
        name: s.name,
        distance: s._distance.toFixed(2) + 'km',
        hasLocations: s.locations && s.locations.length > 0,
        locationsCount: s.locations?.length || 0
      })));
    } else {
      console.warn(`[HomeScreen] ⚠️ No nearby services found!`);
      console.warn(`[HomeScreen] This could mean:`);
      console.warn(`[HomeScreen] 1. No services have coordinates`);
      console.warn(`[HomeScreen] 2. All services are outside their service radius`);
      console.warn(`[HomeScreen] 3. Services are still being geocoded`);
    }
    console.log(`[HomeScreen] ========================================`);
    
    return servicesWithDistance;
  }, [filtered, userLocation]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <View style={styles.headerRow}>
        <Searchbar
          placeholder="Search catering or cuisine"
          value={query}
          onChangeText={setQuery}
          style={styles.search}
          inputStyle={{ 
            fontSize: 16, 
            color: '#1f2937',
            paddingVertical: 4,
          }}
          placeholderTextColor="#9ca3af"
          loading={isSearching}
        />
          
          <TouchableOpacity
            onPress={onPressLocation}
            style={styles.locationIconButton}
            hitSlop={12}
          >
            <Ionicons name="location" size={26} color="#FF8000" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Body */}
      <ScrollView
        style={styles.body}
        contentContainerStyle={{ paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={{ padding: 40, alignItems: 'center' }}>
            <ActivityIndicator size="large" color="#FF8000" style={{ marginBottom: 12 }} />
            <Text style={{ color: '#6b7280', fontSize: 14 }}>Loading services...</Text>
          </View>
        ) : all.length === 0 && !query.trim() ? (
          /* Empty State - No Services */
          <View style={{ padding: 40, alignItems: 'center', marginTop: 60 }}>
            <Ionicons name="restaurant-outline" size={64} color="#9ca3af" />
            <Text style={{ fontSize: 18, fontWeight: '600', color: '#111827', marginTop: 16, marginBottom: 8 }}>
              No Catering Services Available
            </Text>
            <Text style={{ fontSize: 14, color: '#6b7280', textAlign: 'center', maxWidth: 300 }}>
              There are no catering services available at the moment. Please check back later or contact support.
            </Text>
          </View>
        ) : query.trim() ? (
          /* Search Results */
          <>
            <Text style={styles.sectionTitle}>
              Search Results ({searchResults.length})
            </Text>
            <View style={{ paddingHorizontal: 16 }}>
              {isSearching ? (
                <ActivityIndicator style={{ marginVertical: 20 }} />
              ) : searchResults.length > 0 ? (
                searchResults.map((svc) => (
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
                            'https://picsum.photos/300/200',
                        }}
                        style={styles.serviceImg}
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.serviceName}>{svc.name}</Text>
                        <Text style={styles.servicePrice}>
                          ₱{svc.pricePerHead || 0} per head
                        </Text>
                        <View
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            marginTop: 2,
                            gap: 12,
                          }}
                        >
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Ionicons name="star" size={14} color="#f59e0b" />
                            <Text style={{ marginLeft: 4, color: '#4b5563' }}>
                              {(svc.rating ?? 4.8).toFixed(1)}
                            </Text>
                          </View>
                          {userLocation && (() => {
                            const distance = getServiceDistance(svc, userLocation);
                            return distance ? (
                              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Ionicons name="location-outline" size={12} color="#6b7280" />
                                <Text style={{ marginLeft: 2, color: '#6b7280', fontSize: 12 }}>
                                  {formatDistance(distance)}
                                </Text>
                              </View>
                            ) : null;
                          })()}
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
                ))
              ) : (
                <View style={styles.noResultsContainer}>
                  <Ionicons name="search-outline" size={48} color="#9ca3af" />
                  <Text style={styles.noResultsText}>No services found</Text>
                  <Text style={styles.noResultsSubtext}>
                    Try searching with different keywords
                  </Text>
                </View>
              )}
            </View>
          </>
        ) : (
          <>
            {/* Featured */}
            <Text style={styles.sectionTitle}>Featured</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, paddingRight: 4 }}
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


            {/* Most popular */}
            <Text style={styles.sectionTitle}>
              Most popular
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, paddingRight: 4 }}
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
                        📅 {svc.bookingsCount ?? 0} bookings
                      </Text>
                    </View>
                  </Card>
                </TouchableOpacity>
              ))}
            </ScrollView>

             {/* Nearby Services (when location is set) */}
             {userLocation && (
               <>
                 <Text style={styles.sectionTitle}>
                   Nearby Services {nearbyServices.length > 0 && `(${nearbyServices.length})`}
                 </Text>
                 {nearbyServices.length === 0 ? (
                   <View style={{ paddingHorizontal: 16, paddingVertical: 20 }}>
                     <Text style={{ color: '#6b7280', textAlign: 'center' }}>
                       No caterers found within service range of your location.
                     </Text>
                     <Text style={{ color: '#6b7280', textAlign: 'center', fontSize: 12, marginTop: 4 }}>
                       Try selecting a different location or check back later.
                     </Text>
                   </View>
                 ) : (
                   <ScrollView
                     key={`nearby-services-${userLocation.latitude}-${userLocation.longitude}`}
                     horizontal
                     showsHorizontalScrollIndicator={false}
                     contentContainerStyle={{ paddingHorizontal: 16, paddingRight: 4 }}
                   >
                     {nearbyServices.slice(0, 3).map((svc) => (
                     <TouchableOpacity
                       key={`${svc.id}-${svc._distance || 0}`}
                       onPress={() => goToDetails(svc)}
                       activeOpacity={0.8}
                     >
                       <Card style={styles.nearbyCard}>
                         <Image
                           source={{
                             uri:
                               svc.imageUrl ||
                               svc.logoUrl ||
                               'https://picsum.photos/300/200',
                           }}
                           style={styles.nearbyImg}
                         />
                         <View style={{ padding: 12 }}>
                           <Text style={styles.nearbyName} numberOfLines={1}>
                             {svc.name}
                           </Text>
                           <Text style={styles.nearbyPrice} numberOfLines={1}>
                             ₱{svc.pricePerHead || 0} per head
                           </Text>
                           <View
                             style={{
                               flexDirection: 'row',
                               alignItems: 'center',
                               marginTop: 6,
                               gap: 8,
                             }}
                           >
                             <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                               <Ionicons name="star" size={12} color="#f59e0b" />
                               <Text style={{ marginLeft: 2, color: '#4b5563', fontSize: 12 }}>
                                 {(svc.rating ?? 4.8).toFixed(1)}
                               </Text>
                             </View>
                             {(() => {
                               const distance = getServiceDistance(svc, userLocation);
                               return distance ? (
                                 <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                   <Ionicons name="location-outline" size={10} color="#6b7280" />
                                   <Text style={{ marginLeft: 2, color: '#6b7280', fontSize: 11 }}>
                                     {formatDistance(distance)}
                                   </Text>
                                 </View>
                               ) : null;
                             })()}
                           </View>
                           <TouchableOpacity
                             onPress={() => toggleFav(svc.id)}
                             style={styles.nearbyHeartButton}
                           >
                             <Ionicons
                               name={isFav(svc.id) ? 'heart' : 'heart-outline'}
                               size={18}
                               color={isFav(svc.id) ? '#ef4444' : '#9ca3af'}
                             />
                           </TouchableOpacity>
                         </View>
                       </Card>
                     </TouchableOpacity>
                     ))}
                   </ScrollView>
                 )}
                 
                 {/* View All Services Button */}
                 {nearbyServices.length > 0 && (
                   <View style={{ paddingHorizontal: 16, marginTop: 20 }}>
                     <TouchableOpacity
                       onPress={() => setShowAllServicesModal(true)}
                       style={styles.viewAllButton}
                       activeOpacity={0.8}
                     >
                       <Text style={styles.viewAllButtonText}>View All Services</Text>
                       <Ionicons name="arrow-forward" size={20} color="#FF8000" />
                     </TouchableOpacity>
                   </View>
                 )}
               </>
             )}

             {/* Service list (search filtered) - only show when no location is set */}
             {!userLocation && (
               <>
                 <Text style={styles.sectionTitle}>
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
                           gap: 12,
                         }}
                       >
                         <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                           <Ionicons name="star" size={14} color="#f59e0b" />
                           <Text style={{ marginLeft: 4, color: '#4b5563' }}>
                             {(svc.rating ?? 4.8).toFixed(1)}
                           </Text>
                         </View>
                         {userLocation && (() => {
                           const distance = getServiceDistance(svc, userLocation);
                           return distance ? (
                             <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                               <Ionicons name="location-outline" size={12} color="#6b7280" />
                               <Text style={{ marginLeft: 2, color: '#6b7280', fontSize: 12 }}>
                                 {formatDistance(distance)}
                               </Text>
                             </View>
                           ) : null;
                         })()}
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
          </>
        )}
      </ScrollView>

      {/* Location Picker Modal */}
      <InteractiveMapPicker
        visible={showLocationPicker}
        onClose={() => setShowLocationPicker(false)}
        onLocationSelect={handleLocationSelect}
        currentLocation={userLocation || undefined}
      />

      {/* All Services Modal */}
      <Modal
        visible={showAllServicesModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAllServicesModal(false)}
      >
        <View style={styles.modalContainer}>
          {/* Modal Header */}
          <View style={[styles.modalHeader, { paddingTop: insets.top + 10 }]}>
            <TouchableOpacity
              onPress={() => setShowAllServicesModal(false)}
              style={styles.modalCloseButton}
            >
              <Ionicons name="close" size={24} color="#000" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>All Services</Text>
            <View style={{ width: 24 }} />
          </View>

          {/* Search Bar */}
          <View style={styles.modalSearchContainer}>
            <Searchbar
              placeholder="Search catering or cuisine"
              value={query}
              onChangeText={setQuery}
              style={styles.modalSearch}
              inputStyle={{ fontSize: 14 }}
            />
          </View>

          {/* Services List */}
          <ScrollView
            style={styles.modalScrollView}
            contentContainerStyle={{ paddingBottom: 24 }}
            showsVerticalScrollIndicator={false}
          >
            {(userLocation ? nearbyServices : filtered).map((svc) => (
              <TouchableOpacity
                key={svc.id}
                onPress={() => {
                  setShowAllServicesModal(false);
                  goToDetails(svc);
                }}
                activeOpacity={0.8}
              >
                <View style={styles.serviceRow}>
                  <Image
                    source={{
                      uri:
                        svc.imageUrl ||
                        svc.logoUrl ||
                        'https://picsum.photos/300/200',
                    }}
                    style={styles.serviceImg}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.serviceName} numberOfLines={1}>
                      {svc.name}
                    </Text>
                    <Text style={styles.servicePrice} numberOfLines={1}>
                      ₱{svc.pricePerHead || 0} per head
                    </Text>
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        marginTop: 2,
                        gap: 12,
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Ionicons name="star" size={14} color="#f59e0b" />
                        <Text style={{ marginLeft: 4, color: '#4b5563' }}>
                          {(svc.rating ?? 4.8).toFixed(1)}
                        </Text>
                      </View>
                      {userLocation && (() => {
                        const distance = getServiceDistance(svc, userLocation);
                        return distance ? (
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Ionicons name="location-outline" size={12} color="#6b7280" />
                            <Text style={{ marginLeft: 2, color: '#6b7280', fontSize: 12 }}>
                              {formatDistance(distance)}
                            </Text>
                          </View>
                        ) : null;
                      })()}
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
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const RADIUS = 24;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },

  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  search: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  locationIconButton: {
    padding: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },

  body: {
    flex: 1,
    backgroundColor: '#fff',
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 24,
    marginBottom: 12,
    paddingHorizontal: 16,
    color: '#1f2937',
  },

  // Featured
  featuredCard: { 
    width: 220, 
    marginRight: 16, 
    borderRadius: 16, 
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  featuredImg: { width: '100%', height: 120 },
  featuredName: { fontWeight: '700', marginTop: 4, fontSize: 16 },

  // Small cards (most liked / most popular)
  smallCard: { 
    width: 180, 
    marginRight: 16, 
    borderRadius: 16, 
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  smallImg: { width: '100%', height: 100 },
  smallName: { fontWeight: '700', fontSize: 14 },
  metaText: { color: '#6b7280', marginTop: 4, fontSize: 12 },

  // Nearby services cards (horizontal)
  nearbyCard: { 
    width: 200, 
    marginRight: 16, 
    borderRadius: 16, 
    overflow: 'hidden',
    backgroundColor: '#fff',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  nearbyImg: { width: '100%', height: 130 },
  nearbyName: { 
    fontWeight: '700', 
    fontSize: 15,
    marginBottom: 4,
  },
  nearbyPrice: { 
    color: '#6b7280', 
    fontSize: 13,
    marginBottom: 6,
  },
  nearbyHeartButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    padding: 4,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 12,
  },

  // No results
  noResultsContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  noResultsText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
  },
  noResultsSubtext: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 8,
    textAlign: 'center',
  },

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
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FF8000',
    backgroundColor: '#faf5ff',
    gap: 8,
  },
  viewAllButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF8000',
  },
  
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  modalCloseButton: {
    padding: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  modalSearchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalSearch: {
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
  },
  modalScrollView: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
});
