import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Alert, TextInput, Platform } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../config/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { toggleSlotStatus, addFloorToComplex, addSlotToFloor, removeFloorFromComplex } from '../../services/adminService';
import { colors } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';

export default function ComplexSlotManagerScreen({ navigation }) {
  const { userDoc } = useAuth();
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);

  // New floor form
  const [showAddFloor, setShowAddFloor] = useState(false);
  const [newFloorNum, setNewFloorNum] = useState('');
  const [newSlotCount, setNewSlotCount] = useState('20');
  const [isBikeFloor, setIsBikeFloor] = useState(false);

  // New slot form
  const [showAddSlot, setShowAddSlot] = useState(false);
  const [addSlotFloorNum, setAddSlotFloorNum] = useState('');
  const [addSlotLabel, setAddSlotLabel] = useState('');
  const [addSlotVehicleType, setAddSlotVehicleType] = useState('car');

  useEffect(() => {
    if (!userDoc?.complexId) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'slots'),
      where('complexId', '==', userDoc.complexId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const slotsData = snapshot.docs.map(doc => doc.data());
      // Sort by floor then label
      slotsData.sort((a, b) => {
        if (a.floor !== b.floor) return a.floor - b.floor;
        return a.label.localeCompare(b.label);
      });
      setSlots(slotsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userDoc]);

  const handleToggleStatus = async (slot) => {
    if (slot.status === 'booked' || slot.status === 'occupied') {
      Alert.alert('Cannot modify', 'This slot is currently occupied or booked.');
      return;
    }
    
    Alert.alert(
      'Modify Slot',
      `Change status of ${slot.label}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: slot.status === 'available' ? 'Set Maintenance' : 'Set Available', 
          style: slot.status === 'available' ? 'destructive' : 'default',
          onPress: async () => {
            try {
              await toggleSlotStatus(slot.slotId, slot.status, userDoc.complexId);
            } catch (err) {
              Alert.alert('Error', err.message);
            }
          }
        }
      ]
    );
  };

  const handleAddFloor = async () => {
    if (!newFloorNum || !newSlotCount) {
      Alert.alert('Error', 'Please enter floor number and slot count');
      return;
    }
    try {
      await addFloorToComplex(
        userDoc.complexId, 
        userDoc.name || 'Complex', 
        parseInt(newFloorNum), 
        isBikeFloor, 
        parseInt(newSlotCount)
      );
      Alert.alert('Success', `Floor ${newFloorNum} added with ${newSlotCount} slots.`);
      setShowAddFloor(false);
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  };

  const handleAddSlot = async () => {
    if (!addSlotFloorNum || !addSlotLabel) {
      Alert.alert('Error', 'Please enter floor number and slot label');
      return;
    }
    try {
      await addSlotToFloor(
        userDoc.complexId,
        userDoc.name || 'Complex',
        parseInt(addSlotFloorNum),
        addSlotLabel,
        addSlotVehicleType
      );
      Alert.alert('Success', `Slot ${addSlotLabel} added.`);
      setShowAddSlot(false);
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  };

  // Group slots by floor
  const floors = {};
  slots.forEach(slot => {
    if (!floors[slot.floor]) floors[slot.floor] = [];
    floors[slot.floor].push(slot);
  });

  const handleRemoveFloor = (floorNum) => {
    Alert.alert(
      'Remove Floor',
      `Are you sure you want to permanently delete Floor ${floorNum} and all its slots?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeFloorFromComplex(userDoc.complexId, floorNum);
              Alert.alert('Success', `Floor ${floorNum} deleted.`);
            } catch (err) {
              Alert.alert('Error', err.message);
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.page}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#2C2C2A" />
        </Pressable>
        <Text style={styles.screenTitle}>Slot Manager</Text>
      </View>

      <ScrollView style={styles.content}>
        
        {/* ACTION BUTTONS */}
        <View style={styles.actionRow}>
          <Pressable style={styles.actionBtn} onPress={() => { setShowAddFloor(!showAddFloor); setShowAddSlot(false); }}>
            <Ionicons name="layers-outline" size={20} color="#FFFFFF" />
            <Text style={styles.actionBtnText}>Add Floor</Text>
          </Pressable>
          <Pressable style={styles.actionBtnSecondary} onPress={() => { setShowAddSlot(!showAddSlot); setShowAddFloor(false); }}>
            <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
            <Text style={styles.actionBtnTextSecondary}>Add Slot</Text>
          </Pressable>
        </View>

        {/* ADD FLOOR FORM */}
        {showAddFloor && (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Generate New Floor</Text>
            <View style={styles.inputRow}>
              <View style={styles.inputWrap}>
                <Text style={styles.inputLabel}>Floor #</Text>
                <TextInput style={styles.input} keyboardType="numeric" value={newFloorNum} onChangeText={setNewFloorNum} placeholder="e.g. 6" />
              </View>
              <View style={styles.inputWrap}>
                <Text style={styles.inputLabel}>Slot Count</Text>
                <TextInput style={styles.input} keyboardType="numeric" value={newSlotCount} onChangeText={setNewSlotCount} placeholder="e.g. 20" />
              </View>
            </View>
            <Pressable style={styles.toggleRow} onPress={() => setIsBikeFloor(!isBikeFloor)}>
              <Ionicons name={isBikeFloor ? "checkbox" : "square-outline"} size={24} color={colors.primary} />
              <Text style={styles.toggleText}>Bike Floor (B- prefix)</Text>
            </Pressable>
            <Pressable style={styles.submitBtn} onPress={handleAddFloor}>
              <Text style={styles.submitBtnText}>Generate Floor</Text>
            </Pressable>
          </View>
        )}

        {/* ADD SLOT FORM */}
        {showAddSlot && (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Add Individual Slot</Text>
            <View style={styles.inputRow}>
              <View style={styles.inputWrap}>
                <Text style={styles.inputLabel}>Floor #</Text>
                <TextInput style={styles.input} keyboardType="numeric" value={addSlotFloorNum} onChangeText={setAddSlotFloorNum} placeholder="e.g. 1" />
              </View>
              <View style={styles.inputWrap}>
                <Text style={styles.inputLabel}>Slot Label</Text>
                <TextInput style={styles.input} value={addSlotLabel} onChangeText={setAddSlotLabel} placeholder="e.g. C1-99" />
              </View>
            </View>
            
            <Text style={styles.inputLabel}>Vehicle Type</Text>
            <View style={styles.typeGrid}>
              {['car', 'bike', 'handicap'].map((opt) => (
                <Pressable
                  key={opt}
                  style={[styles.typeCard, addSlotVehicleType === opt && styles.typeCardSelected]}
                  onPress={() => setAddSlotVehicleType(opt)}
                >
                  <Text style={[styles.typeText, addSlotVehicleType === opt && styles.typeTextSelected]}>
                    {opt.toUpperCase()}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Pressable style={styles.submitBtn} onPress={handleAddSlot}>
              <Text style={styles.submitBtnText}>Add Slot</Text>
            </Pressable>
          </View>
        )}

        {/* SLOT GRID */}
        {Object.keys(floors).length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="grid-outline" size={48} color="#888780" />
            <Text style={styles.emptyTitle}>No slots found</Text>
          </View>
        ) : (
          Object.keys(floors).sort((a,b) => a-b).map(floor => (
            <View key={floor} style={styles.floorSection}>
              <View style={styles.floorHeaderRow}>
                <Text style={styles.floorHeader}>FLOOR {floor}</Text>
                <Pressable onPress={() => handleRemoveFloor(floor)} style={styles.deleteFloorBtn}>
                  <Ionicons name="trash-outline" size={16} color="#791F1F" />
                </Pressable>
              </View>
              <View style={styles.slotGrid}>
                {floors[floor].map(slot => {
                  let bgColor = '#FFFFFF';
                  let borderColor = '#D3D1C7';
                  let textColor = '#2C2C2A';

                  if (slot.status === 'booked' || slot.status === 'occupied') {
                    bgColor = '#FCEBEB';
                    borderColor = '#F4C4C4';
                    textColor = '#791F1F';
                  } else if (slot.status === 'maintenance') {
                    bgColor = '#F1EFE8';
                    borderColor = '#D3D1C7';
                    textColor = '#888780';
                  } else if (slot.status === 'available') {
                    bgColor = '#EAF3DE';
                    borderColor = '#D2E3BE';
                    textColor = '#27500A';
                  }

                  return (
                    <Pressable 
                      key={slot.slotId} 
                      style={[styles.slotItem, { backgroundColor: bgColor, borderColor }]}
                      onPress={() => handleToggleStatus(slot)}
                    >
                      <Text style={[styles.slotLabel, { color: textColor }]}>{slot.label}</Text>
                      <Text style={[styles.slotStatus, { color: textColor }]}>
                        {slot.status === 'maintenance' ? 'MAINT' : slot.status.substring(0, 5).toUpperCase()}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))
        )}

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#F1EFE8' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 60 : 16, paddingBottom: 16, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderColor: '#D3D1C7' },
  backBtn: { marginRight: 16 },
  screenTitle: { fontSize: 20, fontWeight: '800', color: '#2C2C2A' },
  content: { padding: 16 },
  
  actionRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  actionBtn: { flex: 1, flexDirection: 'row', backgroundColor: colors.primary, paddingVertical: 12, borderRadius: 8, justifyContent: 'center', alignItems: 'center', gap: 8 },
  actionBtnText: { color: '#FFFFFF', fontWeight: '600', fontSize: 14 },
  actionBtnSecondary: { flex: 1, flexDirection: 'row', backgroundColor: '#E6F1FB', paddingVertical: 12, borderRadius: 8, justifyContent: 'center', alignItems: 'center', gap: 8 },
  actionBtnTextSecondary: { color: colors.primary, fontWeight: '600', fontSize: 14 },

  formCard: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginBottom: 24, borderWidth: 1, borderColor: '#D3D1C7' },
  formTitle: { fontSize: 16, fontWeight: '700', color: '#2C2C2A', marginBottom: 16 },
  inputRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  inputWrap: { flex: 1 },
  inputLabel: { fontSize: 12, color: '#5F5E5A', marginBottom: 6, fontWeight: '500' },
  input: { backgroundColor: '#F9F8F6', borderWidth: 1, borderColor: '#D3D1C7', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  toggleText: { fontSize: 14, color: '#2C2C2A', fontWeight: '500' },
  submitBtn: { backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 14, alignItems: 'center', marginTop: 12 },
  submitBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  typeCard: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6, borderWidth: 1, borderColor: '#D3D1C7', backgroundColor: '#F1EFE8' },
  typeCardSelected: { backgroundColor: '#E6F1FB', borderColor: colors.primary },
  typeText: { fontSize: 11, fontWeight: '600', color: '#5F5E5A' },
  typeTextSelected: { color: colors.primary },

  floorSection: { marginBottom: 24 },
  floorHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  floorHeader: { fontSize: 12, fontWeight: '800', color: '#888780', letterSpacing: 1 },
  deleteFloorBtn: { padding: 4 },
  slotGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  slotItem: { width: '23%', aspectRatio: 1, borderRadius: 8, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  slotLabel: { fontSize: 13, fontWeight: '800' },
  slotStatus: { fontSize: 9, fontWeight: '700', marginTop: 4, opacity: 0.8 },

  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { alignItems: 'center', marginTop: 40 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#5F5E5A', marginTop: 12 },
});
