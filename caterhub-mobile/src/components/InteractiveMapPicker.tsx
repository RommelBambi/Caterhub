import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  Dimensions,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Text, Button, Searchbar } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { saveAndSetPrimaryLocation } from '../services/userLocations';

const { width, height } = Dimensions.get('window');

interface InteractiveMapPickerProps {
  visible: boolean;
  onClose: () => void;
  onLocationSelect: (location: { latitude: number; longitude: number; address: string }) => void;
  currentLocation?: { latitude: number; longitude: number; address: string };
}

export default function InteractiveMapPicker({ visible, onClose, onLocationSelect, currentLocation }: InteractiveMapPickerProps) {
  const [loading, setLoading] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{ latitude: number; longitude: number; address: string } | null>(
    currentLocation || null
  );
  const [webViewRef, setWebViewRef] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);

  // Get current location on mount
  useEffect(() => {
    if (visible) {
      getCurrentLocation();
    }
  }, [visible]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, [searchTimeout]);

  const getCurrentLocation = async () => {
    try {
      setLoading(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Location permission is required to use this feature.');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;
      
      // Get address from coordinates
      const address = await reverseGeocode(latitude, longitude);
      
      setSelectedLocation({ latitude, longitude, address });
      
      // Update map location
      if (webViewRef) {
        webViewRef.postMessage(JSON.stringify({
          type: 'SET_LOCATION',
          latitude,
          longitude,
          address
        }));
      }
    } catch (error) {
      console.error('Error getting location:', error);
      Alert.alert('Error', 'Could not get your current location.');
    } finally {
      setLoading(false);
    }
  };

  const reverseGeocode = async (latitude: number, longitude: number): Promise<string> => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'CaterHub-Mobile/1.0',
          },
        }
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const text = await response.text();
      
      if (text.startsWith('<')) {
        console.warn('Rate limited by Nominatim, using coordinates');
        return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
      }
      
      const data = JSON.parse(text);
      
      if (data.display_name) {
        return data.display_name;
      }
      
      return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
    } catch (error) {
      console.error('Geocoding error:', error);
      return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
    }
  };

  const searchLocation = async (query: string) => {
    if (!query.trim() || query.length < 3) return;
    
    try {
      setSearchLoading(true);
      
      // Add delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&addressdetails=1&countrycodes=ph`,
        {
          headers: {
            'User-Agent': 'CaterHub-Mobile/1.0',
          },
        }
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const text = await response.text();
      
      if (text.startsWith('<')) {
        console.warn('Rate limited by Nominatim');
        Alert.alert('Rate Limited', 'Please wait a moment before searching again.');
        return;
      }
      
      const data = JSON.parse(text);
      
      if (data && data.length > 0) {
        const { lat, lon, display_name } = data[0];
        const latitude = parseFloat(lat);
        const longitude = parseFloat(lon);
        
        // Update map location
        if (webViewRef) {
          webViewRef.postMessage(JSON.stringify({
            type: 'SET_LOCATION',
            latitude,
            longitude,
            address: display_name
          }));
        }
        
        setSelectedLocation({
          latitude,
          longitude,
          address: display_name
        });
      } else {
        Alert.alert('Not found', 'Location not found. Please try a different search term.');
      }
    } catch (error) {
      console.error('Search error:', error);
      Alert.alert('Error', 'Could not search for location. Please try again.');
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    
    // Clear existing timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    
    // Set new timeout for debounced search
    if (text.trim().length > 2) {
      const timeout = setTimeout(() => {
        searchLocation(text);
      }, 800); // 800ms delay
      setSearchTimeout(timeout);
    }
  };

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      
      if (data.type === 'LOCATION_SELECTED') {
        setSelectedLocation({
          latitude: data.latitude,
          longitude: data.longitude,
          address: data.address
        });
      }
    } catch (error) {
      console.error('Error parsing message:', error);
    }
  };

  const handleConfirm = async () => {
    if (selectedLocation) {
      try {
        setLoading(true);
        
        // Save location to database
        await saveAndSetPrimaryLocation({
          latitude: selectedLocation.latitude,
          longitude: selectedLocation.longitude,
          address: selectedLocation.address,
          location_name: 'Primary Location',
          is_primary: true,
        });
        
        // Call the parent callback
        onLocationSelect(selectedLocation);
        onClose();
      } catch (error) {
        console.error('Error saving location:', error);
        
        // Check if it's an authentication error
        if (error instanceof Error && error.message.includes('not authenticated')) {
          Alert.alert(
            'Authentication Required', 
            'Please log in again to save your location.',
            [
              { text: 'OK', onPress: onClose }
            ]
          );
        } else {
          Alert.alert('Error', 'Failed to save location. Please try again.');
        }
      } finally {
        setLoading(false);
      }
    }
  };

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Location Picker</title>
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <style>
        body {
          margin: 0;
          padding: 0;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        #map {
          width: 100%;
          height: 100vh;
        }
        .crosshair {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 20px;
          height: 20px;
          border: 2px solid #FF8000;
          border-radius: 50%;
          background: rgba(200, 54, 249, 0.1);
          z-index: 1000;
          pointer-events: none;
        }
        .crosshair::before {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 4px;
          height: 4px;
          background: #FF8000;
          border-radius: 50%;
        }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <div class="crosshair"></div>

      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <script>
        let map;
        let marker;
        let selectedLocation = null;

        function initMap() {
          // Default to Manila if no location provided
          const defaultLocation = [14.5995, 120.9842];
          
          map = L.map('map').setView(defaultLocation, 15);

          // Add OpenStreetMap tiles
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
          }).addTo(map);

          // Add click listener
          map.on('click', (e) => {
            const lat = e.latlng.lat;
            const lng = e.latlng.lng;
            
            // Remove existing marker
            if (marker) {
              map.removeLayer(marker);
            }
            
            // Add new marker
            marker = L.marker([lat, lng], {
              icon: L.divIcon({
                className: 'custom-marker',
                html: '<div style="background: #FF8000; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3);"></div>',
                iconSize: [20, 20],
                iconAnchor: [10, 10]
              })
            }).addTo(map);
            
            // Get address using Nominatim
            fetch(\`https://nominatim.openstreetmap.org/reverse?format=json&lat=\${lat}&lng=\${lng}&addressdetails=1\`)
              .then(response => response.json())
              .then(data => {
                const address = data.display_name || \`\${lat.toFixed(4)}, \${lng.toFixed(4)}\`;
                selectedLocation = { latitude: lat, longitude: lng, address };
                
                
                // Send to React Native
                if (window.ReactNativeWebView) {
                  window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'LOCATION_SELECTED',
                    latitude: lat,
                    longitude: lng,
                    address: address
                  }));
                }
              })
              .catch(error => {
                console.error('Geocoding error:', error);
                const address = \`\${lat.toFixed(4)}, \${lng.toFixed(4)}\`;
                selectedLocation = { latitude: lat, longitude: lng, address };
                
              });
          });
        }

        // Listen for messages from React Native
        document.addEventListener('message', (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'SET_LOCATION') {
              const location = [data.latitude, data.longitude];
              map.setView(location, 15);
              
              // Add marker
              if (marker) {
                map.removeLayer(marker);
              }
              marker = L.marker(location, {
                icon: L.divIcon({
                  className: 'custom-marker',
                  html: '<div style="background: #FF8000; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3);"></div>',
                  iconSize: [20, 20],
                  iconAnchor: [10, 10]
                })
              }).addTo(map);
              
              selectedLocation = { 
                latitude: data.latitude, 
                longitude: data.longitude, 
                address: data.address 
              };
              
              document.getElementById('locationText').textContent = data.address;
              document.getElementById('confirmBtn').disabled = false;
            }
          } catch (error) {
            console.error('Error handling message:', error);
          }
        });


        // Initialize map when page loads
        window.addEventListener('load', initMap);
      </script>
    </body>
    </html>
  `;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Select Location</Text>
          <TouchableOpacity onPress={getCurrentLocation} style={styles.currentLocationButton}>
            <Ionicons name="locate" size={24} color="#FF8000" />
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Searchbar
            placeholder="Search for a location..."
            value={searchQuery}
            onChangeText={handleSearch}
            style={styles.searchBar}
            loading={searchLoading}
            icon="magnify"
            clearIcon="close"
            onClearIconPress={() => setSearchQuery('')}
          />
        </View>

        {/* Map */}
        <View style={styles.mapContainer}>
          {loading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#FF8000" />
            </View>
          )}
          
          <WebView
            ref={setWebViewRef}
            source={{ html: htmlContent }}
            style={styles.map}
            onMessage={handleMessage}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            startInLoadingState={true}
            renderLoading={() => (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" color="#FF8000" />
              </View>
            )}
          />
        </View>

        {/* Selected Location Info */}
        <View style={styles.locationInfo}>
          <View style={styles.locationDetails}>
            <Ionicons name="location" size={20} color="#FF8000" />
            <View style={styles.locationTextContainer}>
              <Text style={styles.locationLabel}>Selected Location</Text>
              <Text style={styles.locationText} numberOfLines={2}>
                {selectedLocation?.address || 'Tap on the map to select a location'}
              </Text>
            </View>
          </View>
          <Button
            mode="contained"
            onPress={handleConfirm}
            style={styles.confirmButton}
            buttonColor="#FF8000"
            contentStyle={styles.confirmButtonContent}
            disabled={!selectedLocation}
          >
            Confirm Location
          </Button>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  searchBar: {
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
  },
  closeButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  currentLocationButton: {
    padding: 8,
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  locationInfo: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  locationDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  locationTextContainer: {
    flex: 1,
  },
  locationLabel: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
    marginBottom: 2,
  },
  locationText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  confirmButton: {
    borderRadius: 8,
  },
  confirmButtonContent: {
    paddingVertical: 8,
  },
});
