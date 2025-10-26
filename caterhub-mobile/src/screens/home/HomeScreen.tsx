// src/screens/home/HomeScreen.tsx
import React from 'react';
import {
  View,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  Platform,
  Dimensions,
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
import { filterServicesByDistance, getServiceDistance, formatDistance } from '../../services/location';
import { getPrimaryLocation } from '../../services/userLocations';

export default function HomeScreen({ navigation }: any) {
  const { user, updateMe } = useAuth();
  const [query, setQuery] = React.useState('');
  const [searchResults, setSearchResults] = React.useState<Service[]>([]);
  const [isSearching, setIsSearching] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const insets = useSafeAreaInsets();
  
  // Web detection and responsive dimensions
  const isWeb = Platform.OS === 'web';
  const { width: screenWidth } = Dimensions.get('window');
  const isTablet = screenWidth >= 768;
  const isDesktop = screenWidth >= 1024;

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
        const [services, topBookedRaw] = await Promise.all([
          fetchServices(),
          fetchTopServices('bookings', 8),
        ]);

        // Show all services for "Most Popular" section, sorted by bookings count
        const topBooked = (topBookedRaw || []).sort(
          (a: any, b: any) => (b.bookingsCount ?? 0) - (a.bookingsCount ?? 0)
        );

        if (!mounted) return;
        setAll(services);
        setFeatured(services.slice(0, 6));
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
    setUserLocation(location);
    // Update user location in database
    await updateMe?.({ location: location.address });
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

  return (
    <View style={[styles.container, isWeb && styles.webContainer]}>
      {/* Header */}
      <View style={[
        styles.header, 
        { paddingTop: insets.top },
        isWeb && styles.webHeader
      ]}>
        <View style={[
          styles.headerRow,
          isWeb && styles.webHeaderRow
        ]}>
          <Searchbar
            placeholder="Search catering or cuisine"
            value={query}
            onChangeText={setQuery}
            style={[
              styles.search,
              isWeb && styles.webSearch
            ]}
            inputStyle={{ 
              fontSize: isWeb ? 14 : 16, 
              color: '#1f2937',
              paddingVertical: 4,
            }}
            placeholderTextColor="#9ca3af"
            loading={isSearching}
          />
          
          <TouchableOpacity
            onPress={onPressLocation}
            style={[
              styles.locationIconButton,
              isWeb && styles.webLocationButton
            ]}
            hitSlop={12}
          >
            <Ionicons name="location" size={isWeb ? 20 : 26} color="#C836F9" />
            </TouchableOpacity>
          </View>
        </View>

      {/* Body */}
      <ScrollView
        style={[styles.body, isWeb && styles.webBody]}
        contentContainerStyle={[
          { paddingBottom: 24 },
          isWeb && styles.webBodyContent
        ]}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <ActivityIndicator style={{ marginTop: 24 }} />
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
            <Text style={[styles.sectionTitle, isWeb && styles.webSectionTitle]}>Featured</Text>
            {isDesktop ? (
              <View style={styles.webGridContainer}>
                {featured.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    onPress={() => goToDetails(item)}
                    activeOpacity={0.8}
                    style={styles.webCardWrapper}
                  >
                    <Card style={[
                      styles.featuredCard,
                      styles.webFeaturedCard
                    ]}>
                      <Image
                        source={{
                          uri:
                            item.imageUrl ||
                            item.logoUrl ||
                            'https://picsum.photos/300/200',
                        }}
                        style={styles.featuredImg}
                      />
                      <View style={{ padding: 12 }}>
                        <Text style={styles.featuredName} numberOfLines={1}>
                          {item.name}
                        </Text>
                        <View
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            marginTop: 4,
                            gap: 8,
                          }}
                        >
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Ionicons name="star" size={14} color="#f59e0b" />
                            <Text style={{ marginLeft: 4, color: '#4b5563', fontSize: 12 }}>
                              {(item.rating ?? 4.8).toFixed(1)}
                            </Text>
                          </View>
                          <TouchableOpacity
                            onPress={() => toggleFav(item.id)}
                            style={{ padding: 4 }}
                          >
                            <Ionicons
                              name={isFav(item.id) ? 'heart' : 'heart-outline'}
                              size={16}
                              color={isFav(item.id) ? '#ef4444' : '#9ca3af'}
                            />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </Card>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
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
                  style={isDesktop && styles.webCardWrapper}
                >
                  <Card style={[
                    styles.featuredCard,
                    isWeb && styles.webFeaturedCard
                  ]}>
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
            )}


            {/* Most popular */}
            <Text style={[styles.sectionTitle, isWeb && styles.webSectionTitle]}>
              Most popular
                </Text>
            {isDesktop ? (
              <View style={styles.webGridContainer}>
                {mostBooked.map((svc) => (
                    <TouchableOpacity
                      key={svc.id}
                      onPress={() => goToDetails(svc)}
                      activeOpacity={0.8}
                    style={styles.webCardWrapper}
                    >
                    <Card style={[
                      styles.smallCard,
                      styles.webSmallCard
                    ]}>
                        <Image
                          source={{
                            uri:
                              svc.imageUrl ||
                              svc.logoUrl ||
                              'https://picsum.photos/300/200',
                          }}
                          style={styles.smallImg}
                        />
                      <View style={{ padding: 12 }}>
                          <Text style={styles.smallName} numberOfLines={1}>
                            {svc.name}
                          </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                          <Ionicons name="calendar-outline" size={12} color="#6b7280" />
                          <Text style={styles.metaText}>
                            {svc.bookingsCount || 0} bookings
                          </Text>
                        </View>
                        </View>
                      </Card>
                    </TouchableOpacity>
                  ))}
              </View>
            ) : (
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
                  style={isDesktop && styles.webCardWrapper}
                    >
                  <Card style={[
                    styles.smallCard,
                    isWeb && styles.webSmallCard
                  ]}>
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
            )}

             {/* Nearby Services (when location is set) */}
             {userLocation && (
               <>
                 <Text style={[styles.sectionTitle, isWeb && styles.webSectionTitle]}>
                   Nearby Services
                 </Text>
                 {isDesktop ? (
                   <View style={styles.webGridContainer}>
                     {filtered.slice(0, 3).map((svc) => (
                       <TouchableOpacity
                         key={svc.id}
                         onPress={() => goToDetails(svc)}
                         activeOpacity={0.8}
                         style={styles.webCardWrapper}
                       >
                         <Card style={[
                           styles.nearbyCard,
                           styles.webNearbyCard
                         ]}>
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
                                 marginTop: 4,
                                 gap: 8,
                               }}
                             >
                               <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                 <Ionicons name="star" size={12} color="#f59e0b" />
                                 <Text style={{ marginLeft: 4, color: '#4b5563', fontSize: 11 }}>
                                   {(svc.rating ?? 4.8).toFixed(1)}
                                 </Text>
                               </View>
                               {(() => {
                                 const distance = getServiceDistance(svc, userLocation);
                                 return distance ? (
                                   <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                     <Ionicons name="location-outline" size={10} color="#6b7280" />
                                     <Text style={{ marginLeft: 2, color: '#6b7280', fontSize: 10 }}>
                                       {formatDistance(distance)}
                                     </Text>
                                   </View>
                                 ) : null;
                               })()}
                             </View>
                           </View>
                         </Card>
                       </TouchableOpacity>
                     ))}
                   </View>
                 ) : (
                   <ScrollView
                     horizontal
                     showsHorizontalScrollIndicator={false}
                     contentContainerStyle={{ paddingHorizontal: 16, paddingRight: 4 }}
                   >
                   {filtered.slice(0, 3).map((svc) => (
                     <TouchableOpacity
                       key={svc.id}
                       onPress={() => goToDetails(svc)}
                       activeOpacity={0.8}
                       style={isDesktop && styles.webCardWrapper}
                     >
                       <Card style={[
                         styles.nearbyCard,
                         isWeb && styles.webNearbyCard
                       ]}>
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
                 <View style={[
                   { paddingHorizontal: 16, marginTop: 20 },
                   isWeb && { paddingHorizontal: 0, alignItems: 'center' }
                 ]}>
                   <TouchableOpacity
                     onPress={() => setShowAllServicesModal(true)}
                     style={[
                       styles.viewAllButton,
                       isWeb && styles.webViewAllButton
                     ]}
                     activeOpacity={0.8}
                   >
                     <Text style={styles.viewAllButtonText}>View All Services</Text>
                     <Ionicons name="arrow-forward" size={20} color="#C836F9" />
                   </TouchableOpacity>
                 </View>
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
        animationType={isWeb ? "fade" : "slide"}
        presentationStyle={isWeb ? "overFullScreen" : "pageSheet"}
        onRequestClose={() => setShowAllServicesModal(false)}
      >
        <View style={[
          styles.modalContainer,
          isWeb && styles.webModalContainer
        ]}>
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
            {filtered.map((svc) => (
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
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  locationIconButton: {
    padding: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    elevation: 2,
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
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
    elevation: 3,
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
  },
  featuredImg: { 
    width: '100%', 
    height: 120,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  featuredName: { fontWeight: '700', marginTop: 4, fontSize: 16 },

  // Small cards (most liked / most popular)
  smallCard: { 
    width: 180, 
    marginRight: 16, 
    borderRadius: 16, 
    elevation: 2,
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
  },
  smallImg: { 
    width: '100%', 
    height: 100,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  smallName: { fontWeight: '700', fontSize: 14 },
  metaText: { color: '#6b7280', marginTop: 4, fontSize: 12 },

  // Nearby services cards (horizontal)
  nearbyCard: { 
    width: 200, 
    marginRight: 16, 
    borderRadius: 16, 
    backgroundColor: '#fff',
    elevation: 3,
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
  },
  nearbyImg: { 
    width: '100%', 
    height: 130,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
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
    borderColor: '#C836F9',
    backgroundColor: '#faf5ff',
    gap: 8,
  },
  viewAllButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#C836F9',
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

  // Web-specific styles
  webContainer: {
    maxWidth: 1400,
    marginHorizontal: 'auto',
    width: '100%',
  },
  webHeader: {
    paddingHorizontal: 24,
    paddingBottom: 16,
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
  },
  webHeaderRow: {
    maxWidth: 800,
    marginHorizontal: 'auto',
  },
  webSearch: {
    maxWidth: 600,
  },
  webLocationButton: {
    padding: 10,
  },
  webBody: {
    backgroundColor: '#f8fafc',
  },
  webBodyContent: {
    paddingHorizontal: 32,
    maxWidth: 1400,
    marginHorizontal: 'auto',
    width: '100%',
  },
  webSectionTitle: {
    fontSize: 24,
    marginTop: 32,
    marginBottom: 16,
    textAlign: 'center',
  },
  webGridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 20,
    paddingHorizontal: 0,
    marginBottom: 20,
  },
  webCardWrapper: {
    width: 320,
    minWidth: 300,
    maxWidth: 350,
  },
  webFeaturedCard: {
    width: '100%',
    marginRight: 0,
    marginBottom: 16,
  },
  webSmallCard: {
    width: '100%',
    marginRight: 0,
    marginBottom: 16,
  },
  webNearbyCard: {
    width: '100%',
    marginRight: 0,
    marginBottom: 16,
  },
  webViewAllButton: {
    maxWidth: 300,
    paddingVertical: 16,
    paddingHorizontal: 32,
  },
  webModalContainer: {
    maxWidth: 800,
    marginHorizontal: 'auto',
    marginVertical: 40,
    borderRadius: 16,
    overflow: 'hidden',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  },
});
