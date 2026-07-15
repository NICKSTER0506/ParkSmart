// src/screens/admin/AdminSlotsScreen.js
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator, Switch, Modal, TextInput, Platform } from 'react-native';
import { getAllSlots, updateSlotStatus, removeSlot, addSlot, getComplexes } from '../../services/slotService';
import { triggerCustomAlert } from '../../utils/alertService';
import { colors } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';

export default function AdminSlotsScreen({ navigation }) {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);

  // Filter states
  const [complexes, setComplexes] = useState([]);
  const [selectedComplexId, setSelectedComplexId] = useState(null);
  const [filterFloor, setFilterFloor] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');

  // Modal states
  const [modalVisible, setModalVisible] = useState(false);
  const [lodgeName, setLodgeName] = useState('');
  const [label, setLabel] = useState('');
  const [zone, setZone] = useState('');
  const [floor, setFloor] = useState('0');
  const [vehicleType, setVehicleType] = useState('car');
  const [addingSlot, setAddingSlot] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const vehicleOptions = ['car', 'ev', 'bike', 'suv', 'none'];

  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch complexes if not already loaded
      let availableComplexes = complexes;
      if (complexes.length === 0) {
        availableComplexes = await getComplexes();
        setComplexes(availableComplexes);
      }
      
      const targetComplexId = selectedComplexId || (availableComplexes.length > 0 ? availableComplexes[0].id : null);
      
      if (targetComplexId) {
        setSelectedComplexId(targetComplexId);
        const data = await getAllSlots(targetComplexId);
        setSlots(data);
      } else {
        setSlots([]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleComplexSelect = async (complexId) => {
    setSelectedComplexId(complexId);
    setLoading(true);
    try {
      const data = await getAllSlots(complexId);
      setSlots(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchData();
    });
    return unsubscribe;
  }, [navigation, selectedComplexId]);

  const handleStatusToggle = async (slotId, currentStatus) => {
    const newStatus = currentStatus === 'disabled' ? 'available' : 'disabled';
    setUpdatingId(slotId);
    try {
      await updateSlotStatus(slotId, newStatus);
      setSlots(prev => prev.map(s => s.id === slotId ? { ...s, status: newStatus } : s));
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDeletePress = (slotId, label) => {
    triggerCustomAlert(
      'Remove Parking Slot',
      `Are you sure you want to permanently delete slot ${label} from inventory?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              await removeSlot(slotId);
              await handleComplexSelect(selectedComplexId);
            } catch (err) {
              console.error(err);
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleAddSlot = async () => {
    if (!label.trim() || !zone.trim()) {
      setErrorMsg('Label and Zone are required.');
      return;
    }
    setErrorMsg('');
    setAddingSlot(true);

    try {
      const isDuplicate = slots.some(
        (s) => s.label.trim().toLowerCase() === label.trim().toLowerCase()
      );

      if (isDuplicate) {
        setErrorMsg(`Slot ${label.trim()} already exists in inventory.`);
        setAddingSlot(false);
        return;
      }

      await addSlot({
        lodgeName: lodgeName.trim() || 'Main Lodge',
        label: label.trim().toUpperCase(),
        zone: zone.trim().toUpperCase(),
        floor: parseInt(floor, 10) || 0,
        vehicleType: vehicleType === 'none' ? null : vehicleType,
        status: 'available',
      });

      setModalVisible(false);
      setLabel('');
      setZone('');
      setFloor('0');
      handleComplexSelect(selectedComplexId);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setAddingSlot(false);
    }
  };

  // Filter slots
  const filteredSlots = slots.filter(s => {
    const sFloor = (s.floor || 0).toString();
    const sStatus = s.status || '';
    const sType = s.vehicleType || 'none';

    if (filterFloor && sFloor !== filterFloor) return false;
    if (filterStatus && sStatus !== filterStatus) return false;
    if (filterType && sType !== filterType) return false;

    return true;
  });

  const groupedSlots = filteredSlots.reduce((acc, slot) => {
    // If it's seeded data, it might use complexName. 
    const lodge = slot.complexName || slot.lodgeName || 'Unknown Lodge';
    const fl = slot.floor || 0;
    
    if (!acc[lodge]) acc[lodge] = {};
    if (!acc[lodge][fl]) acc[lodge][fl] = [];
    
    acc[lodge][fl].push(slot);
    return acc;
  }, {});

  const lodges = Object.keys(groupedSlots).sort();

  return (
    <View style={styles.page}>
      <View style={styles.header}>
        <View>
          <Text style={styles.screenTitle}>Inventory</Text>
          <Text style={styles.subtitle}>Configure slot parameters</Text>
        </View>
        <Pressable style={styles.addButton} onPress={() => setModalVisible(true)}>
          <Ionicons name="add" size={20} color="#FFFFFF" style={{ marginRight: 4 }} />
          <Text style={styles.addButtonText}>Add Slot</Text>
        </Pressable>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.complexTabBar} contentContainerStyle={styles.complexTabContent}>
        {complexes.map(comp => (
          <Pressable 
            key={comp.id} 
            style={[styles.complexTab, selectedComplexId === comp.id && styles.complexTabActive]}
            onPress={() => handleComplexSelect(comp.id)}
          >
            <Text style={[styles.complexTabText, selectedComplexId === comp.id && styles.complexTabTextActive]}>
              {comp.name}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <View style={styles.filterBar}>
        <TextInput 
          style={styles.filterInput} 
          placeholder="Floor" 
          value={filterFloor}
          onChangeText={setFilterFloor}
          keyboardType="number-pad"
        />
        <TextInput 
          style={styles.filterInput} 
          placeholder="Status" 
          value={filterStatus}
          onChangeText={setFilterStatus}
        />
      </View>

      {loading && slots.length === 0 ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : filteredSlots.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="cube-outline" size={48} color="#888780" />
          <Text style={styles.emptyTitle}>No slots found</Text>
          <Text style={styles.emptySub}>Adjust filters or tap 'Add Slot' to create one.</Text>
        </View>
      ) : (
        <ScrollView style={styles.listContainer} contentContainerStyle={styles.list}>
          {lodges.map((lodge) => {
            const floors = Object.keys(groupedSlots[lodge]).sort((a, b) => Number(a) - Number(b));
            return (
              <View key={lodge} style={styles.lodgeSection}>
                <View style={styles.lodgeHeader}>
                  <Ionicons name="business-outline" size={20} color="#2C2C2A" />
                  <Text style={styles.lodgeTitle}>{lodge}</Text>
                </View>
                {floors.map((fl) => {
                  const floorSlots = groupedSlots[lodge][fl];
                  return (
                    <View key={fl} style={styles.floorSection}>
                      <View style={styles.floorHeader}>
                        <Text style={styles.floorTitle}>Floor {fl}</Text>
                      </View>
                      {floorSlots.sort((a,b) => a.label.localeCompare(b.label)).map((item) => {
                        const isDisabled = item.status === 'disabled';
                        const isBooked = item.status === 'booked';
                        const isUpdating = updatingId === item.id;

                        return (
                          <View key={item.id} style={styles.card}>
                            <View style={styles.cardLeft}>
                              <Text style={styles.slotLabel}>{item.label}</Text>
                              <Text style={styles.slotDetails}>
                                Zone {item.zone} {item.vehicleType ? `• ${item.vehicleType.toUpperCase()}` : ''}
                              </Text>
                              <View style={styles.statusBadgeWrapper}>
                                <View style={[styles.statusBadge, isBooked ? styles.badgeBooked : isDisabled ? styles.badgeDisabled : styles.badgeAvailable]}>
                                  <Text style={[styles.statusBadgeText, isBooked ? styles.textBooked : isDisabled ? styles.textDisabled : styles.textAvailable]}>
                                    {isBooked ? 'Booked' : isDisabled ? 'Blocked' : 'Available'}
                                  </Text>
                                </View>
                              </View>
                            </View>
                            <View style={styles.cardRight}>
                              {!isBooked ? (
                                <View style={styles.toggleRow}>
                                  <Text style={styles.toggleText}>{isDisabled ? 'Blocked' : 'Active'}</Text>
                                  {isUpdating ? (
                                    <ActivityIndicator color={colors.primary} size="small" style={{ marginLeft: 6 }} />
                                  ) : (
                                    <Switch
                                      value={!isDisabled}
                                      onValueChange={() => handleStatusToggle(item.id, item.status)}
                                      trackColor={{ false: '#D3D1C7', true: '#C7E0F8' }}
                                      thumbColor={!isDisabled ? colors.primary : '#888780'}
                                    />
                                  )}
                                </View>
                              ) : (
                                <View style={styles.lockedRow}>
                                  <Ionicons name="lock-closed" size={14} color="#888780" />
                                  <Text style={styles.lockedText}>Reserved</Text>
                                </View>
                              )}
                              <Pressable style={styles.deleteButton} onPress={() => handleDeletePress(item.id, item.label)}>
                                <Ionicons name="trash-outline" size={20} color="#791F1F" />
                              </Pressable>
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  );
                })}
              </View>
            );
          })}
        </ScrollView>
      )}

      {/* Add Slot Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add New Slot</Text>
              <Pressable onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#2C2C2A" />
              </Pressable>
            </View>
            
            <ScrollView style={styles.modalBody}>
              <Text style={styles.fieldLabel}>Lodge Name</Text>
              <TextInput style={styles.input} placeholder="e.g. Main Lodge" value={lodgeName} onChangeText={setLodgeName} />
              
              <Text style={styles.fieldLabel}>Slot Label</Text>
              <TextInput style={styles.input} placeholder="e.g. A-12" value={label} onChangeText={setLabel} autoCapitalize="characters" />
              
              <Text style={styles.fieldLabel}>Parking Zone</Text>
              <TextInput style={styles.input} placeholder="e.g. A" value={zone} onChangeText={setZone} autoCapitalize="characters" />
              
              <Text style={styles.fieldLabel}>Floor Level</Text>
              <TextInput style={styles.input} placeholder="0" value={floor} onChangeText={setFloor} keyboardType="number-pad" />
              
              <Text style={styles.fieldLabel}>Vehicle Type</Text>
              <View style={styles.typeGrid}>
                {vehicleOptions.map((opt) => (
                  <Pressable key={opt} style={[styles.typeCard, vehicleType === opt && styles.typeCardSelected]} onPress={() => setVehicleType(opt)}>
                    <Text style={[styles.typeText, vehicleType === opt && styles.typeTextSelected]}>{opt.toUpperCase()}</Text>
                  </Pressable>
                ))}
              </View>

              {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}

              <Pressable style={[styles.primaryButton, addingSlot && styles.disabledButton]} onPress={handleAddSlot} disabled={addingSlot}>
                {addingSlot ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>Add Slot</Text>}
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#F1EFE8' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 60 : 16, paddingBottom: 12 },
  screenTitle: { fontSize: 22, fontWeight: '800', color: '#2C2C2A' },
  subtitle: { fontSize: 13, color: '#5F5E5A', marginTop: 4 },
  addButton: { backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  addButtonText: { color: '#FFFFFF', fontWeight: '600', fontSize: 13 },
  complexTabBar: { maxHeight: 50, marginBottom: 12 },
  complexTabContent: { paddingHorizontal: 16, alignItems: 'center', gap: 8 },
  complexTab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#D3D1C7' },
  complexTabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  complexTabText: { fontSize: 13, fontWeight: '600', color: '#5F5E5A' },
  complexTabTextActive: { color: '#FFFFFF' },
  filterBar: { flexDirection: 'row', paddingHorizontal: 16, paddingBottom: 12, gap: 8 },
  filterInput: { flex: 1, height: 36, backgroundColor: '#FFFFFF', borderRadius: 6, borderWidth: 1, borderColor: '#D3D1C7', paddingHorizontal: 10, fontSize: 13 },
  listContainer: { flex: 1 },
  list: { padding: 16, paddingBottom: 16 },
  lodgeSection: { marginBottom: 24 },
  lodgeHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  lodgeTitle: { fontSize: 18, fontWeight: '800', color: '#2C2C2A', marginLeft: 8 },
  floorSection: { marginBottom: 16 },
  floorHeader: { marginBottom: 8 },
  floorTitle: { fontSize: 14, fontWeight: '600', color: '#5F5E5A' },
  card: { backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#D3D1C7', padding: 16, marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardLeft: { flex: 1.2 },
  slotLabel: { fontSize: 18, fontWeight: '800', color: '#2C2C2A' },
  slotDetails: { fontSize: 13, color: '#5F5E5A', marginTop: 4 },
  statusBadgeWrapper: { flexDirection: 'row', marginTop: 8 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeAvailable: { backgroundColor: '#EAF3DE' },
  badgeBooked: { backgroundColor: '#FCEBEB' },
  badgeDisabled: { backgroundColor: '#F1EFE8' },
  statusBadgeText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  textAvailable: { color: '#27500A' },
  textBooked: { color: '#791F1F' },
  textDisabled: { color: '#888780' },
  cardRight: { flex: 1, alignItems: 'flex-end', justifyContent: 'space-between', height: '100%', minHeight: 70 },
  toggleRow: { flexDirection: 'row', alignItems: 'center' },
  toggleText: { fontSize: 12, color: '#5F5E5A', marginRight: 6, fontWeight: '500' },
  lockedRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1EFE8', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  lockedText: { fontSize: 11, color: '#888780', fontWeight: '600', marginLeft: 4 },
  deleteButton: { paddingVertical: 4 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F1EFE8' },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#2C2C2A', marginTop: 12 },
  emptySub: { fontSize: 13, color: '#5F5E5A', marginTop: 4 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#F1EFE8', borderTopLeftRadius: 20, borderTopRightRadius: 20, height: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderColor: '#D3D1C7', backgroundColor: '#FFFFFF', borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#2C2C2A' },
  modalBody: { padding: 20 },
  fieldLabel: { fontSize: 13, fontWeight: '500', color: '#5F5E5A', marginBottom: 6 },
  input: { height: 52, borderWidth: 1, borderColor: '#D3D1C7', borderRadius: 10, paddingHorizontal: 16, backgroundColor: '#FFFFFF', color: '#2C2C2A', fontSize: 14, marginBottom: 16 },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 16 },
  typeCard: { width: '31%', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#D3D1C7', borderRadius: 8, paddingVertical: 10, alignItems: 'center', marginBottom: 10 },
  typeCardSelected: { backgroundColor: '#E6F1FB', borderColor: colors.primary },
  typeText: { fontSize: 12, fontWeight: '600', color: '#5F5E5A' },
  typeTextSelected: { color: colors.primary },
  errorText: { color: '#791F1F', backgroundColor: '#FCEBEB', padding: 10, borderRadius: 8, fontSize: 12, fontWeight: '500', marginBottom: 16, textAlign: 'center', borderWidth: 1, borderColor: '#F8C8C8' },
  primaryButton: { height: 52, backgroundColor: colors.primary, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 40 },
  disabledButton: { opacity: 0.7 },
  buttonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' }
});
