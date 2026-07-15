import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, Modal, TextInput, ScrollView, ActivityIndicator, Alert, Keyboard, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { subscribeToComplexesRealtime } from '../../services/firestore';
import { addComplexWithInfrastructure, deleteComplex } from '../../services/adminService';
import { colors } from '../../constants/theme';

const pickerMapHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <style>
        body, html { margin: 0; padding: 0; height: 100%; width: 100%; background-color: #F1EFE8; }
        #map { height: 100%; width: 100%; }
        .emoji-icon {
            font-size: 32px;
            text-align: center;
            background: transparent;
            border: none;
        }
        .user-location-dot {
            background-color: #4285F4;
            border: 3px solid white;
            border-radius: 50%;
            box-shadow: 0 0 4px rgba(0,0,0,0.4);
            width: 18px !important;
            height: 18px !important;
        }
    </style>
</head>
<body>
    <div id="map"></div>
    <script>
        var map = L.map('map', { zoomControl: false, maxZoom: 16 }).setView([12.9716, 77.5946], 15);
        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
            attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);

        var marker;
        var userLocationMarker;

        map.on('click', function(e) {
            if (marker) map.removeLayer(marker);
            marker = L.marker(e.latlng, {
                icon: L.divIcon({ className: 'emoji-icon', html: '📍', iconSize: [32, 32], iconAnchor: [16, 32] })
            }).addTo(map);
            
            window.ReactNativeWebView.postMessage(JSON.stringify({ 
                type: 'LOCATION_SELECTED', 
                lat: e.latlng.lat, 
                lng: e.latlng.lng 
            }));
        });

        const handleMessage = function(event) {
            try {
                var data = JSON.parse(event.data);
                if (data.type === 'FLY_TO') {
                    map.flyTo([data.lat, data.lng], 15, { animate: true, duration: 1.5 });
                    if (marker) map.removeLayer(marker);
                    marker = L.marker([data.lat, data.lng], {
                        icon: L.divIcon({ className: 'emoji-icon', html: '📍', iconSize: [32, 32], iconAnchor: [16, 32] })
                    }).addTo(map);
                } else if (data.type === 'USER_LOCATION') {
                    if (userLocationMarker) map.removeLayer(userLocationMarker);
                    userLocationMarker = L.marker([data.lat, data.lng], {
                        icon: L.divIcon({ className: 'user-location-dot', iconSize: [18, 18], iconAnchor: [9, 9] }),
                        zIndexOffset: 1000
                    }).addTo(map);
                    
                    if (data.center) {
                        map.setView([data.lat, data.lng], 17);
                    }
                }
            } catch(e) {}
        };
        window.addEventListener('message', handleMessage);
        document.addEventListener('message', handleMessage);
        
        // Signal that the map is fully loaded and ready to receive messages
        setTimeout(function() {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'MAP_READY' }));
        }, 500);
    </script>
</body>
</html>
`;

export default function AdminComplexesScreen({ navigation }) {
  const [complexes, setComplexes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [area, setArea] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totalFloors, setTotalFloors] = useState('');
  const [floorSlots, setFloorSlots] = useState([]);
  const [bikeFloors, setBikeFloors] = useState('');
  
  // Map Picker State
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [userLoc, setUserLoc] = useState(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const webviewRef = React.useRef(null);

  const handleTotalFloorsChange = (val) => {
    setTotalFloors(val);
    const floors = parseInt(val) || 0;
    if (floors > 0 && floors <= 20) {
      // If the array is empty, fill it. If it has existing values, preserve them and append/truncate.
      setFloorSlots(prev => {
        const next = [...prev];
        if (next.length < floors) {
          return next.concat(Array(floors - next.length).fill(''));
        }
        return next.slice(0, floors);
      });
    } else {
      setFloorSlots([]);
    }
  };

  const handleFloorSlotChange = (index, val) => {
    const newSlots = [...floorSlots];
    newSlots[index] = val;
    setFloorSlots(newSlots);
  };

  useEffect(() => {
    if (showMapPicker) {
      (async () => {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;

        let loc = await Location.getCurrentPositionAsync({});
        setUserLoc(loc);
      })();
    }
  }, [showMapPicker]);

  useEffect(() => {
    if (isMapReady && userLoc && webviewRef.current) {
      webviewRef.current.postMessage(JSON.stringify({ 
        type: 'USER_LOCATION', 
        lat: userLoc.coords.latitude, 
        lng: userLoc.coords.longitude,
        center: true
      }));
    }
  }, [isMapReady, userLoc]);

  const handleLocateMe = () => {
    if (userLoc && webviewRef.current) {
      webviewRef.current.postMessage(JSON.stringify({ 
        type: 'USER_LOCATION', 
        lat: userLoc.coords.latitude, 
        lng: userLoc.coords.longitude,
        center: true
      }));
    }
  };

  const getAddressFromCoordinates = async (latitude, longitude) => {
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`, {
        headers: { 'User-Agent': 'ParkSmartApp/1.0' }
      });
      const data = await response.json();
      if (data && data.display_name) {
        const cleanAddress = data.display_name.split(',').slice(0, 3).join(', ');
        setLocation(cleanAddress);
        
        if (data.address) {
          const fetchedArea = data.address.suburb || data.address.neighbourhood || data.address.city_district || data.address.village || '';
          if (fetchedArea) setArea(fetchedArea);
        }
      }
    } catch (err) {
      console.warn("Failed to reverse geocode:", err);
    }
  };

  const handleMapMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'MAP_READY') {
        setIsMapReady(true);
      } else if (data.type === 'LOCATION_SELECTED') {
        setLat(data.lat.toFixed(6).toString());
        setLng(data.lng.toFixed(6).toString());
        getAddressFromCoordinates(data.lat, data.lng);
        setShowMapPicker(false);
      }
    } catch (e) {}
  };

  const searchLocation = async () => {
    if (!searchQuery.trim()) return;
    Keyboard.dismiss();
    setSearchLoading(true);
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&limit=1&addressdetails=1`, {
        headers: { 'User-Agent': 'ParkSmartApp/1.0' }
      });
      const data = await response.json();
      if (data && data.length > 0) {
        const result = data[0];
        const resultLat = parseFloat(result.lat);
        const resultLng = parseFloat(result.lon);
        
        if (webviewRef.current) {
          webviewRef.current.postMessage(JSON.stringify({ 
            type: 'FLY_TO', 
            lat: resultLat, 
            lng: resultLng
          }));
        }
        
        setLat(resultLat.toFixed(6).toString());
        setLng(resultLng.toFixed(6).toString());
        setLocation(data[0].display_name.split(',').slice(0, 3).join(', '));
        
        if (data[0].address) {
          const fetchedArea = data[0].address.suburb || data[0].address.neighbourhood || data[0].address.city_district || data[0].address.village || '';
          if (fetchedArea) setArea(fetchedArea);
        }
      } else {
        Alert.alert('Not Found', 'Could not find that location. Try being more specific.');
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to search location.');
    } finally {
      setSearchLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = subscribeToComplexesRealtime((data) => {
      setComplexes(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleDelete = (id, name) => {
    Alert.alert(
      "Delete Complex",
      `Are you sure you want to delete ${name} and all its slots? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true);
              await deleteComplex(id);
              Alert.alert('Success', 'Complex deleted successfully.');
            } catch (err) {
              Alert.alert('Error', err.message);
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleSave = async () => {
    if (!name || !location || !lat || !lng || !email || !password || !totalFloors || floorSlots.length === 0 || floorSlots.some(s => !s)) {
      Alert.alert('Validation Error', 'Please fill in all required fields and ensure slots are provided for every floor.');
      return;
    }

    try {
      setIsSubmitting(true);
      await addComplexWithInfrastructure({
        name,
        location,
        area,
        lat,
        lng,
        ownerEmail: email,
        ownerPassword: password,
        totalFloors: parseInt(totalFloors),
        slotsPerFloor: floorSlots.join(','),
        bikeFloors
      });
      setModalVisible(false);
      resetForm();
      Alert.alert('Success', 'Complex and infrastructure generated successfully!');
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setName(''); setLocation(''); setArea(''); setLat(''); setLng('');
    setEmail(''); setPassword('');
    setTotalFloors(''); setFloorSlots([]); setBikeFloors('');
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardInfo}>
        <Text style={styles.cardTitle}>{item.name}</Text>
        <Text style={styles.cardSubtitle}>{item.location}</Text>
        <Text style={styles.cardMeta}>{item.totalSlots} Slots • {item.bikeAvailable + item.carAvailable} Available</Text>
      </View>
      <Pressable onPress={() => handleDelete(item.id, item.name)} style={styles.deleteBtn}>
        <Ionicons name="trash-outline" size={20} color="#791F1F" />
      </Pressable>
    </View>
  );

  return (
    <View style={styles.page}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#2C2C2A" />
        </Pressable>
        <Text style={styles.screenTitle}>Manage Complexes</Text>
      </View>

      {loading ? (
        <ActivityIndicator style={styles.loader} size="large" color={colors.primary} />
      ) : (
        <FlatList
          data={complexes}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.emptyText}>No complexes found.</Text>}
        />
      )}

      <Pressable style={styles.fab} onPress={() => setModalVisible(true)}>
        <Ionicons name="add" size={32} color="#FFFFFF" />
      </Pressable>

      {/* Add Complex Modal */}
      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>New Complex</Text>
          <Pressable onPress={() => setModalVisible(false)}>
            <Text style={styles.cancelBtn}>Cancel</Text>
          </Pressable>
        </View>

        <ScrollView style={styles.modalContent} contentContainerStyle={{ paddingBottom: 16 }}>
          <Text style={styles.sectionTitle}>BASIC DETAILS</Text>
          <TextInput style={styles.input} placeholder="Complex Name (e.g. Orion)" value={name} onChangeText={setName} />
          <TextInput style={styles.input} placeholder="Address/Location" value={location} onChangeText={setLocation} />
          <TextInput style={styles.input} placeholder="Area/Neighborhood (e.g. Koramangala)" value={area} onChangeText={setArea} />
          <View style={styles.row}>
            <TextInput style={[styles.input, styles.halfInput]} placeholder="Latitude" value={lat} onChangeText={setLat} keyboardType="numeric" />
            <TextInput style={[styles.input, styles.halfInput]} placeholder="Longitude" value={lng} onChangeText={setLng} keyboardType="numeric" />
          </View>
          
          <Pressable style={styles.pickMapBtn} onPress={() => setShowMapPicker(true)}>
            <Ionicons name="map" size={18} color="#FFFFFF" />
            <Text style={styles.pickMapBtnText}>Pick on Map</Text>
          </Pressable>

          <Text style={styles.sectionTitle}>OWNER CREDENTIALS</Text>
          <TextInput style={styles.input} placeholder="Owner Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
          <TextInput style={styles.input} placeholder="Owner Password" value={password} onChangeText={setPassword} secureTextEntry />

          <Text style={styles.sectionTitle}>INFRASTRUCTURE AUTO-GENERATOR</Text>
          <TextInput style={styles.input} placeholder="Total Floors (max 20)" value={totalFloors} onChangeText={handleTotalFloorsChange} keyboardType="numeric" />
          
          {floorSlots.length > 0 && (
            <View style={{ marginBottom: 12 }}>
              <Text style={styles.sectionTitle}>SLOTS PER FLOOR</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
                {floorSlots.map((val, index) => (
                  <TextInput
                    key={index}
                    style={[styles.input, { width: '48%', marginBottom: 10 }]}
                    placeholder={`Flr ${index + 1} slots`}
                    value={val}
                    onChangeText={(v) => handleFloorSlotChange(index, v)}
                    keyboardType="numeric"
                  />
                ))}
              </View>
            </View>
          )}

          <TextInput style={styles.input} placeholder="Bike Floors (e.g. '1,2' or leave blank)" value={bikeFloors} onChangeText={setBikeFloors} />

          <Pressable style={styles.saveBtn} onPress={handleSave} disabled={isSubmitting}>
            {isSubmitting ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveBtnText}>Generate Infrastructure & Save</Text>}
          </Pressable>
        </ScrollView>
      </Modal>

      {/* Full Screen Map Picker Modal */}
      <Modal visible={showMapPicker} animationType="slide">
        <View style={styles.mapPickerHeader}>
          <Pressable onPress={() => setShowMapPicker(false)} style={styles.mapPickerCloseBtn}>
            <Ionicons name="close" size={28} color="#2C2C2A" />
          </Pressable>
          <View style={styles.searchContainer}>
            <TextInput 
              style={styles.searchInput} 
              placeholder="Search city, area, mall..." 
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={searchLocation}
            />
            <Pressable onPress={searchLocation} style={styles.searchBtn}>
              {searchLoading ? <ActivityIndicator color="#FFF" size="small" /> : <Ionicons name="search" size={20} color="#FFF" />}
            </Pressable>
          </View>
        </View>
        
        <View style={{ flex: 1 }}>
          <WebView
            ref={webviewRef}
            source={{ html: pickerMapHtml }}
            onMessage={handleMapMessage}
            style={{ flex: 1 }}
            bounces={false}
            scrollEnabled={false}
          />
          <Pressable style={styles.locateMeBtn} onPress={handleLocateMe}>
            <Ionicons name="locate" size={24} color="#5F5E5A" />
          </Pressable>
        </View>

        <View style={styles.mapPickerFooter}>
          <Text style={styles.mapPickerInstruction}>Tap anywhere on the map to drop a pin.</Text>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#F1EFE8' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 60 : 16, paddingBottom: 16, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderColor: '#D3D1C7' },
  backBtn: { marginRight: 16 },
  screenTitle: { fontSize: 20, fontWeight: '800', color: '#2C2C2A' },
  loader: { marginTop: 40 },
  list: { padding: 16, paddingBottom: 100 },
  card: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#D3D1C7', alignItems: 'center', justifyContent: 'space-between' },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#2C2C2A' },
  cardSubtitle: { fontSize: 13, color: '#5F5E5A', marginTop: 4 },
  cardMeta: { fontSize: 12, fontWeight: '600', color: colors.primary, marginTop: 8 },
  deleteBtn: { padding: 8, backgroundColor: '#FCEBEB', borderRadius: 8, marginLeft: 12 },
  emptyText: { textAlign: 'center', color: '#888780', marginTop: 40 },
  fab: { position: 'absolute', bottom: 24, right: 24, width: 64, height: 64, borderRadius: 32, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 8 },

  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderColor: '#D3D1C7', backgroundColor: '#FFF' },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#2C2C2A' },
  cancelBtn: { fontSize: 16, color: '#5F5E5A' },
  modalContent: { padding: 20, backgroundColor: '#F1EFE8' },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: '#888780', letterSpacing: 1, marginTop: 16, marginBottom: 8, marginLeft: 4 },
  input: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#D3D1C7', borderRadius: 8, padding: 14, marginBottom: 12, fontSize: 15, color: '#2C2C2A' },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  halfInput: { width: '48%' },
  pickMapBtn: { flexDirection: 'row', backgroundColor: colors.primary, padding: 12, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  pickMapBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600', marginLeft: 8 },
  saveBtn: { backgroundColor: colors.primary, padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 24 },
  saveBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  
  mapPickerHeader: { flexDirection: 'row', alignItems: 'center', paddingTop: Platform.OS === 'ios' ? 60 : 16, paddingBottom: 16, paddingHorizontal: 16, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderColor: '#D3D1C7' },
  mapPickerCloseBtn: { marginRight: 12 },
  searchContainer: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  searchInput: { flex: 1, backgroundColor: '#F1EFE8', borderRadius: 8, padding: 10, fontSize: 15, marginRight: 8 },
  searchBtn: { backgroundColor: colors.primary, padding: 10, borderRadius: 8, width: 44, alignItems: 'center' },
  mapPickerFooter: { position: 'absolute', bottom: 40, left: 20, right: 20, backgroundColor: 'rgba(0,0,0,0.8)', padding: 16, borderRadius: 12, alignItems: 'center' },
  mapPickerInstruction: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  locateMeBtn: { position: 'absolute', right: 16, bottom: 90, backgroundColor: '#FFFFFF', width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 6 }
});
