import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/theme';
import { getParkingSpots, getReports } from '../services/firestore';
import { showAlert } from '../utils/alert';

// Default to a central location in Bengaluru
const defaultCenter = { lat: 12.9716, lng: 77.5946 };

function useLeaflet() {
  const [isLoaded, setIsLoaded] = useState(false);
  
  useEffect(() => {
    if (window.L) {
      setIsLoaded(true);
      return;
    }
    
    if (document.querySelector('#leaflet-css')) return;

    // Load CSS
    const link = document.createElement('link');
    link.id = 'leaflet-css';
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);

    // Load JS
    const script = document.createElement('script');
    script.id = 'leaflet-script';
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.async = true;
    script.onload = () => setIsLoaded(true);
    document.head.appendChild(script);
  }, []);

  return isLoaded;
}

export default function MapScreen({ navigation }) {
  const isLoaded = useLeaflet();
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markersRef = useRef([]);

  const [spots, setSpots] = useState(null);
  const [reports, setReports] = useState([]);
  const [userLocation, setUserLocation] = useState(defaultCenter);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();

    // Track user location for real-time positioning on the map
    let geoId;
    if (navigator.geolocation) {
      geoId = navigator.geolocation.watchPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => console.warn('Geolocation error:', error),
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    }
    
    return () => {
      if (geoId && navigator.geolocation) navigator.geolocation.clearWatch(geoId);
    };
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const spotsData = await getParkingSpots();
      setSpots(spotsData || []);
      const reportsData = await getReports(userLocation.lat, userLocation.lng);
      setReports(reportsData || []);
    } catch (error) {
      console.error('Error loading map data:', error);
      setSpots([]);
      setReports([]);
      showAlert('Error', 'Failed to load parking spot data.');
    } finally {
      setLoading(false);
    }
  };

  // Render Map and Markers when data and script are loaded
  useEffect(() => {
    if (!isLoaded || !mapRef.current || !spots) return;

    if (!mapInstance.current) {
      const map = window.L.map(mapRef.current).setView([defaultCenter.lat, defaultCenter.lng], 16);
      window.L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);
      mapInstance.current = map;
    }

    // Clear old markers
    markersRef.current.forEach(marker => mapInstance.current.removeLayer(marker));
    markersRef.current = [];

    // Add User Location Marker
    const userIcon = window.L.divIcon({
      className: 'custom-div-icon',
      html: '<div style="background-color:#4285F4;width:16px;height:16px;border-radius:50%;border:3px solid white;box-shadow:0 0 10px rgba(66,133,244,0.5);"></div>',
      iconSize: [22, 22],
      iconAnchor: [11, 11]
    });
    
    const userMarker = window.L.marker([userLocation.lat, userLocation.lng], { icon: userIcon, zIndexOffset: 1000 }).addTo(mapInstance.current);
    markersRef.current.push(userMarker);

    // Add Spot Markers
    spots.forEach(spot => {
      const isFree = spot.status === 'free' || spot.status === 'available';
      const color = isFree ? colors.success : colors.danger;
      
      const spotIcon = window.L.divIcon({
        className: 'custom-div-icon',
        html: `<div style="background-color:${color};color:white;width:32px;height:32px;border-radius:50%;border:2px solid white;display:flex;align-items:center;justify-content:center;font-weight:bold;box-shadow:0 2px 5px rgba(0,0,0,0.3);">P</div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      const lat = spot.latitude || defaultCenter.lat;
      const lng = spot.longitude || defaultCenter.lng;
      const spotMarker = window.L.marker([lat, lng], { icon: spotIcon }).addTo(mapInstance.current);

      spotMarker.on('click', () => {
        if (isFree) {
          navigation.navigate('Booking', { spot });
        } else {
          showAlert('Spot Occupied', 'This slot is currently taken.');
        }
      });
      markersRef.current.push(spotMarker);
    });

    // Add Report Markers
    reports.forEach(report => {
      const reportIcon = window.L.divIcon({
        className: 'custom-div-icon',
        html: '<div style="font-size:24px;">⚠️</div>',
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });
      const reportMarker = window.L.marker([report.latitude, report.longitude], { icon: reportIcon }).addTo(mapInstance.current);
      markersRef.current.push(reportMarker);
    });

  }, [isLoaded, spots, reports, userLocation, navigation]);

  if (!isLoaded || loading || !spots) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading Campus Map...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Campus Map</Text>
        <Text style={styles.headerSubtitle}>Real-time availability & reports</Text>
      </View>

      <View style={styles.mapCanvas}>
        <div ref={mapRef} style={{ width: '100%', height: '100%', zIndex: 0 }} />
        
        <Pressable 
          style={styles.locateMeBtn} 
          onPress={() => {
            if (mapInstance.current && userLocation) {
              mapInstance.current.flyTo([userLocation.lat, userLocation.lng], 16, { animate: true, duration: 1 });
            }
          }}
        >
          <Ionicons name="locate" size={24} color="#5F5E5A" />
        </Pressable>
      </View>

      <View style={styles.footerRow}>
        <Pressable style={styles.secondaryButton} onPress={loadData}>
          <Text style={styles.secondaryButtonText}>Refresh Map</Text>
        </Pressable>

        <Pressable 
          style={styles.primaryButton} 
          onPress={() => navigation.navigate('Report', { latitude: userLocation.lat, longitude: userLocation.lng })}
        >
          <Text style={styles.primaryButtonText}>⚠️ Report Hazard</Text>
        </Pressable>

        <Pressable style={styles.backButton} onPress={() => navigation.navigate('Home')}>
          <Text style={styles.backButtonText}>Exit Map</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EEF3ED',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#EEF3ED',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: colors.secondaryText,
    fontWeight: '600',
  },
  header: {
    padding: 24,
    backgroundColor: colors.panel,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '850',
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: 13,
    color: colors.secondaryText,
    marginTop: 4,
  },
  mapCanvas: {
    flex: 1,
    zIndex: -1,
  },
  footerRow: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: colors.panel,
    borderTopWidth: 1,
    borderColor: colors.border,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
    flex: 1.2,
    alignItems: 'center',
    marginHorizontal: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '750',
    fontSize: 14,
  },
  secondaryButton: {
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 8,
  },
  secondaryButtonText: {
    color: colors.primary,
    fontWeight: '750',
    fontSize: 14,
  },
  backButton: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    flex: 0.8,
    alignItems: 'center',
    marginHorizontal: 8,
  },
  backButtonText: {
    color: '#4B5563',
    fontWeight: '700',
    fontSize: 14,
  },
  locateMeBtn: {
    position: 'absolute',
    right: 16,
    bottom: 16,
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
    zIndex: 1000,
  }
});
