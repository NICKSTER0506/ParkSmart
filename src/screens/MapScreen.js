// src/screens/MapScreen.js
import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, Pressable, Text, StatusBar, Alert, Linking, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import { colors } from '../constants/theme';
import { subscribeToComplexesRealtime } from '../services/firestore';

// HTML Template for Leaflet Map
const mapHtmlTemplate = `
<!DOCTYPE html>
<html>
<head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <style>
        body { padding: 0; margin: 0; }
        html, body, #map { height: 100%; width: 100%; }
        /* Custom markers */
        .custom-marker {
            width: 32px;
            height: 32px;
            border-radius: 50%;
            border: 2px solid white;
            box-shadow: 0 2px 8px rgba(0,0,0,0.15);
            display: flex;
            justify-content: center;
            align-items: center;
            color: white;
            font-family: 'Inter', Arial, sans-serif;
            font-weight: bold;
            font-size: 14px;
            transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        .custom-marker.active {
            transform: scale(1.35);
            box-shadow: 0 6px 16px rgba(0,0,0,0.3);
            z-index: 1000 !important;
        }
        .marker-available { background-color: #28a745; }
        .marker-full { background-color: #dc3545; }
        
        /* Pulse Animation for User Location */
        @keyframes pulse {
            0% { box-shadow: 0 0 0 0 rgba(66, 133, 244, 0.7); }
            70% { box-shadow: 0 0 0 15px rgba(66, 133, 244, 0); }
            100% { box-shadow: 0 0 0 0 rgba(66, 133, 244, 0); }
        }

        /* User location dot */
        .user-marker {
            background-color: #4285F4;
            width: 18px;
            height: 18px;
            border-radius: 50%;
            border: 3px solid white;
            animation: pulse 2s infinite;
        }
    </style>
</head>
<body>
    <div id="map"></div>
    <script>
        var map = L.map('map', { zoomControl: false, attributionControl: false }).setView([12.9720, 77.5940], 12);
        
        // CartoDB Voyager tiles (clean, modern look similar to Google Maps)
        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
            maxZoom: 19
        }).addTo(map);

        var userMarker = null;
        var markers = {};
        var currentRoute = null;
        var activeMarkerId = null;

        // Custom icon generation
        function getCustomIcon(availableCount, isActive) {
            var className = availableCount > 0 ? 'marker-available' : 'marker-full';
            var activeClass = isActive ? ' active' : '';
            var html = '<div class="custom-marker ' + className + activeClass + '">P</div>';
            return L.divIcon({
                className: 'custom-div-icon',
                html: html,
                iconSize: [32, 32],
                iconAnchor: [16, 32]
            });
        }

        // Listen for messages from React Native
        document.addEventListener('message', function(event) {
            handleMessage(event.data);
        });
        window.addEventListener('message', function(event) {
            handleMessage(event.data);
        });

        function handleMessage(dataStr) {
            try {
                var data = JSON.parse(dataStr);
                
                if (data.type === 'USER_LOCATION') {
                    var latlng = [data.lat, data.lng];
                    if (!userMarker) {
                        var userIcon = L.divIcon({ className: 'custom-div-icon', html: '<div class="user-marker"></div>', iconSize: [22, 22], iconAnchor: [11, 11] });
                        userMarker = L.marker(latlng, { icon: userIcon, zIndexOffset: 1000 }).addTo(map);
                        if(data.firstTime) {
                            map.setView(latlng, 14);
                        }
                    } else {
                        userMarker.setLatLng(latlng);
                    }
                } 
                else if (data.type === 'COMPLEXES') {
                    data.complexes.forEach(function(c) {
                        if (c.lat == null || c.lng == null) return;
                        var isActive = (c.id === activeMarkerId);
                        if (markers[c.id]) {
                            markers[c.id].setIcon(getCustomIcon(c.availableCount, isActive));
                            // Ensure active marker is on top
                            if (isActive) markers[c.id].setZIndexOffset(500);
                            else markers[c.id].setZIndexOffset(0);
                        } else {
                            var marker = L.marker([c.lat, c.lng], { icon: getCustomIcon(c.availableCount, isActive) }).addTo(map);
                            marker.on('click', function() {
                                window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'MARKER_CLICK', id: c.id }));
                            });
                            markers[c.id] = marker;
                        }
                    });
                }
                else if (data.type === 'ROUTE') {
                    if (currentRoute) { map.removeLayer(currentRoute); }
                    if (data.coordinates && data.coordinates.length > 0) {
                        currentRoute = L.polyline(data.coordinates, { color: '#4285F4', weight: 4 }).addTo(map);
                        map.fitBounds(currentRoute.getBounds(), { padding: [50, 300] }); // Pad bottom for the card
                    }
                }
                else if (data.type === 'CLEAR_SELECTION') {
                    activeMarkerId = null;
                    if (currentRoute) {
                        map.removeLayer(currentRoute);
                        currentRoute = null;
                    }
                    // Reset all icons
                    Object.keys(markers).forEach(function(id) {
                        var m = markers[id];
                        var html = m.options.icon.options.html.replace(' active', '');
                        m.setIcon(L.divIcon({ className: 'custom-div-icon', html: html, iconSize: [32, 32], iconAnchor: [16, 32] }));
                        m.setZIndexOffset(0);
                    });
                }
                else if (data.type === 'CENTER_MAP') {
                     map.flyTo([data.lat, data.lng], 15, { animate: true, duration: 1.5 });
                }
                else if (data.type === 'SET_ACTIVE') {
                    activeMarkerId = data.id;
                    // React Native sends the COMPLEXES payload again anyway when state changes,
                    // but we can also handle it here if needed.
                }
            } catch(e) {}
        }
        
        map.on('click', function() {
             window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'MAP_CLICK' }));
        });
        
        // Signal that map is ready
        setTimeout(function() {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'MAP_READY' }));
        }, 300);
    </script>
</body>
</html>
`;

export default function MapScreen({ navigation }) {
  const [location, setLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [complexes, setComplexes] = useState([]);
  const [selectedComplex, setSelectedComplex] = useState(null);
  const [routeEta, setRouteEta] = useState(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const webviewRef = useRef(null);

  // Send message to WebView safely
  const sendToMap = (data) => {
    if (webviewRef.current) {
      webviewRef.current.postMessage(JSON.stringify(data));
    }
  };

  const fetchRoute = async (destLat, destLng) => {
    if (!location) return;
    
    // OSRM expects coordinates as Longitude,Latitude
    const originStr = `${location.coords.longitude},${location.coords.latitude}`;
    const destStr = `${destLng},${destLat}`;
    
    // Free OSRM Public API
    const url = `https://router.project-osrm.org/route/v1/driving/${originStr};${destStr}?overview=full&geometries=geojson`;
    
    try {
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.routes && data.routes.length > 0) {
        // OSRM returns GeoJSON coordinates as [Lng, Lat], Leaflet expects [Lat, Lng]
        const coordinates = data.routes[0].geometry.coordinates.map(coord => [coord[1], coord[0]]);
        const durationSec = data.routes[0].duration;
        setRouteEta(Math.ceil(durationSec / 60));
        sendToMap({ type: 'ROUTE', coordinates });
      }
    } catch (error) {
      console.warn("Failed to fetch route from OSRM:", error);
    }
  };

  useEffect(() => {
    let locationSubscription;
    let isFirstLocation = true;

    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Permission to access location was denied');
        return;
      }

      locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 5000,
          distanceInterval: 5,
        },
        (loc) => {
          setLocation(loc);
          sendToMap({
            type: 'USER_LOCATION',
            lat: loc.coords.latitude,
            lng: loc.coords.longitude,
            firstTime: isFirstLocation
          });
          isFirstLocation = false;
        }
      );
    })();

    const unsubscribe = subscribeToComplexesRealtime((data) => {
      setComplexes(data);
      // Once complexes are loaded, send them to the map
      sendToMap({ type: 'COMPLEXES', complexes: data });
    });

    return () => {
      if (locationSubscription) locationSubscription.remove();
      unsubscribe();
    };
  }, []);

  // Update map when complexes change or when map becomes ready
  useEffect(() => {
    if (isMapReady && complexes.length > 0) {
      sendToMap({ type: 'COMPLEXES', complexes });
    }
  }, [complexes, isMapReady]);

  // Resend location if map wasn't ready earlier
  useEffect(() => {
    if (isMapReady && location) {
      sendToMap({
        type: 'USER_LOCATION',
        lat: location.coords.latitude,
        lng: location.coords.longitude,
        firstTime: true
      });
    }
  }, [isMapReady]);

  const handleMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      
      if (data.type === 'MAP_READY') {
        setIsMapReady(true);
      } else if (data.type === 'MARKER_CLICK') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        const complex = complexes.find(c => c.id === data.id);
        if (complex) {
          setSelectedComplex(complex);
          setRouteEta(null);
          sendToMap({ type: 'SET_ACTIVE', id: complex.id });
          sendToMap({ type: 'COMPLEXES', complexes }); // Re-render markers to show active
          fetchRoute(complex.lat, complex.lng);
        }
      } else if (data.type === 'MAP_CLICK') {
        if (selectedComplex) {
            Haptics.selectionAsync();
            setSelectedComplex(null);
            sendToMap({ type: 'CLEAR_SELECTION' });
        }
      }
    } catch (error) {
      console.error("Error parsing WebView message", error);
    }
  };

  const handleGetDirections = () => {
    if (!selectedComplex) return;
    
    // Construct intent for Google Maps or Apple Maps app directly
    const scheme = Platform.select({ ios: 'maps:0,0?q=', android: 'geo:0,0?q=' });
    const latLng = `${selectedComplex.lat},${selectedComplex.lng}`;
    const label = selectedComplex.name;
    const url = Platform.select({
      ios: `${scheme}${label}@${latLng}`,
      android: `${scheme}${latLng}(${label})`
    });
    
    // Fallback directly to OpenStreetMap directions if native intent fails
    const fallbackUrl = location 
      ? `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${location.coords.latitude}%2C${location.coords.longitude}%3B${selectedComplex.lat}%2C${selectedComplex.lng}`
      : `https://www.openstreetmap.org/?mlat=${selectedComplex.lat}&mlon=${selectedComplex.lng}#map=15/${selectedComplex.lat}/${selectedComplex.lng}`;

    Linking.canOpenURL(url).then(supported => {
      if (supported) {
        return Linking.openURL(url);
      } else {
        return Linking.openURL(fallbackUrl);
      }
    }).catch(err => console.error('An error occurred', err));
  };

  // Calculate Haversine distance
  const getDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radius of the earth in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2); 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); 
    return (R * c).toFixed(1); 
  };
  const handleLocateMe = () => {
    Haptics.selectionAsync();
    if (location) {
      sendToMap({ type: 'CENTER_MAP', lat: location.coords.latitude, lng: location.coords.longitude });
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <WebView
        ref={webviewRef}
        source={{ html: mapHtmlTemplate }}
        style={styles.map}
        onMessage={handleMessage}
        scrollEnabled={false}
        bounces={false}
      />

      {/* Floating Header */}
      <View style={styles.floatingHeader}>
        <Pressable style={styles.backButton} onPress={() => { Haptics.selectionAsync(); navigation.goBack(); }}>
          <Ionicons name="arrow-back" size={24} color="#2C2C2A" />
        </Pressable>
        <Text style={styles.headerTitle}>Find Parking</Text>
      </View>

      {/* Floating Locate Me Button */}
      {!selectedComplex && (
        <Pressable 
          style={[styles.locateMeBtn, { bottom: 40 }]} 
          onPress={handleLocateMe}
        >
          <Ionicons name="locate" size={24} color="#5F5E5A" />
        </Pressable>
      )}

      {/* Bottom Sheet Card */}
      {selectedComplex && (
        <View style={styles.bottomCard}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.cardTitle}>{selectedComplex.name}</Text>
              <Text style={styles.cardSubtitle}>
                {location && `${getDistance(location.coords.latitude, location.coords.longitude, selectedComplex.lat, selectedComplex.lng)} km`}
                {routeEta && `  •  ${routeEta} min`}
                {`  •  ${selectedComplex.totalSlots} slots total`}
              </Text>
            </View>
            <Pressable onPress={() => {
              Haptics.selectionAsync();
              setSelectedComplex(null);
              sendToMap({ type: 'CLEAR_SELECTION' });
            }} hitSlop={10} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color="#5F5E5A" />
            </Pressable>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Available</Text>
              <Text style={[styles.statValue, { color: colors.success }]}>{selectedComplex.availableCount}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Occupied</Text>
              <Text style={[styles.statValue, { color: colors.danger }]}>{selectedComplex.occupiedCount}</Text>
            </View>
          </View>

          <View style={styles.actionRow}>
            <Pressable 
              style={[styles.actionBtn, styles.btnSecondary]} 
              onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  handleGetDirections();
              }}
            >
              <Ionicons name="navigate" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.btnSecondaryText}>Directions</Text>
            </Pressable>
            <Pressable 
              style={[styles.actionBtn, styles.btnPrimary]}
              onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  navigation.navigate('ComplexOverview', { complex: selectedComplex });
              }}
            >
              <Text style={styles.btnPrimaryText}>View Floors</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Floating Action Button */}
      {!selectedComplex && (
        <Pressable
          style={styles.reportButton}
          onPress={() => navigation.navigate('Report')}
        >
          <Ionicons name="alert-circle-outline" size={20} color="#FFFFFF" />
          <Text style={styles.reportText}>Report Issue</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F1EFE8'
  },
  map: {
    flex: 1,
    width: '100%',
    height: '100%'
  },
  floatingHeader: {
    position: 'absolute',
    top: 50,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 16,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  backButton: {
    marginRight: 12,
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#2C2C2A',
  },
  locateMeBtn: {
    position: 'absolute',
    right: 16,
    backgroundColor: '#FFFFFF',
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
    zIndex: 10,
  },
  bottomCard: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  closeBtn: {
    backgroundColor: '#F1EFE8',
    borderRadius: 16,
    padding: 4,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#2C2C2A',
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#5F5E5A',
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row',
    marginBottom: 20,
    backgroundColor: '#F1EFE8',
    borderRadius: 12,
    padding: 16,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#5F5E5A',
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 16,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnSecondary: {
    backgroundColor: '#4285F4',
  },
  btnSecondaryText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  btnPrimary: {
    backgroundColor: colors.primary,
  },
  btnPrimaryText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  reportButton: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#791F1F',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  reportText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
    marginLeft: 8,
  }
});
