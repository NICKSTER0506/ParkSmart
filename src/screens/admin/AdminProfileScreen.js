// src/screens/admin/AdminProfileScreen.js
import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Alert, TextInput, ActivityIndicator, Modal, Platform } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { logout, changePassword } from '../../services/authService';
import { triggerCustomAlert } from '../../utils/alertService';
import { colors } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';

export default function AdminProfileScreen({ navigation }) {
  const { currentUser, userDoc, role } = useAuth();
  const isComplexAdmin = role === 'complex_admin';

  // Password Modal State
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const handleLogout = () => {
    triggerCustomAlert(
      'Logout',
      'Are you sure you want to log out of the admin panel?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
            } catch (err) {
              console.error(err);
            }
          }
        }
      ]
    );
  };

  const handleChangePassword = () => {
    setCurrentPassword('');
    setNewPassword('');
    setShowPasswordModal(true);
  };

  const handleChangePasswordSubmit = async () => {
    if (!currentPassword || !newPassword) {
      triggerCustomAlert('Error', 'Please fill in both fields.', [{ text: 'OK' }]);
      return;
    }
    if (newPassword.length < 6) {
      triggerCustomAlert('Error', 'New password must be at least 6 characters.', [{ text: 'OK' }]);
      return;
    }
    
    setIsChangingPassword(true);
    try {
      await changePassword(currentPassword, newPassword);
      triggerCustomAlert('Success', 'Password changed successfully!', [{ text: 'OK' }]);
      setShowPasswordModal(false);
    } catch (e) {
      let msg = 'Failed to change password. Please try again.';
      if (e.message.includes('auth/invalid-credential')) {
         msg = 'Incorrect current password. Please try again.';
      } else if (e.message.includes('auth/too-many-requests')) {
         msg = 'Too many attempts. Please try again later.';
      } else if (e.message.includes('auth/weak-password')) {
         msg = 'Your new password is too weak. Please use a stronger password.';
      }
      triggerCustomAlert('Error', msg, [{ text: 'OK' }]);
    } finally {
      setIsChangingPassword(false);
    }
  };


  return (
    <View style={styles.page}>
      <View style={styles.header}>
        <Text style={styles.screenTitle}>Profile</Text>
        <Text style={styles.subtitle}>Manage your account</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>{currentUser?.name?.charAt(0) || 'A'}</Text>
          </View>
          <Text style={styles.name}>{currentUser?.name || 'Admin User'}</Text>
          <Text style={styles.email}>{currentUser?.email || 'admin@parksmart.local'}</Text>
        </View>

        {/* Info Section */}
        <Text style={styles.sectionTitle}>ACCOUNT DETAILS</Text>
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Role</Text>
            <View style={[styles.badge, isComplexAdmin && { backgroundColor: '#E6F1FB' }]}>
              <Text style={[styles.badgeText, isComplexAdmin && { color: '#185FA5' }]}>
                {isComplexAdmin ? 'Complex Admin' : 'SuperAdmin'}
              </Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Assigned Complex</Text>
            <Text style={styles.infoValue}>{isComplexAdmin ? userDoc?.complexId : 'All Complexes'}</Text>
          </View>
        </View>

        {isComplexAdmin && (
          <>
            <Text style={styles.sectionTitle}>FACILITY MANAGEMENT</Text>
            <View style={styles.infoCard}>
              <Pressable style={styles.infoRow} onPress={() => navigation.navigate('ComplexSlotManager')}>
                <View>
                  <Text style={styles.infoLabel}>Manage Complex Slots</Text>
                  <Text style={styles.helpText}>Add floors, create slots, or mark maintenance</Text>
                </View>
                <Ionicons name="grid-outline" size={24} color={colors.primary} />
              </Pressable>
            </View>
          </>
        )}

        {/* Action Buttons */}
        <Text style={styles.sectionTitle}>SECURITY</Text>
        <View style={styles.actionsCard}>
          <Pressable style={styles.actionItem} onPress={handleChangePassword}>
            <View style={styles.actionLeft}>
              <Ionicons name="lock-closed-outline" size={20} color={colors.primary} />
              <Text style={styles.actionText}>Change Password</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#888780" />
          </Pressable>
          <View style={styles.divider} />
          <Pressable style={styles.actionItem} onPress={handleLogout}>
            <View style={styles.actionLeft}>
              <Ionicons name="log-out-outline" size={20} color="#791F1F" />
              <Text style={[styles.actionText, { color: '#791F1F' }]}>Logout</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#888780" />
          </Pressable>
        </View>

      </ScrollView>

      {/* Change Password Modal */}
      <Modal visible={showPasswordModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Change Password</Text>
              <Pressable onPress={() => setShowPasswordModal(false)} hitSlop={10}>
                <Ionicons name="close" size={24} color="#888780" />
              </Pressable>
            </View>
            
            <Text style={styles.modalLabel}>Current Password</Text>
            <TextInput
              style={styles.modalInput}
              secureTextEntry
              placeholder="Enter old password"
              value={currentPassword}
              onChangeText={setCurrentPassword}
            />
            
            <Text style={styles.modalLabel}>New Password</Text>
            <TextInput
              style={styles.modalInput}
              secureTextEntry
              placeholder="Enter new password (min. 6 chars)"
              value={newPassword}
              onChangeText={setNewPassword}
            />
            
            <Pressable 
              style={[styles.modalSubmitBtn, isChangingPassword && styles.disabledBtn]} 
              onPress={handleChangePasswordSubmit}
              disabled={isChangingPassword}
            >
              {isChangingPassword ? <ActivityIndicator color="#FFF" /> : <Text style={styles.modalSubmitText}>Confirm Change</Text>}
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#F1EFE8' },
  header: { paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 60 : 16, paddingBottom: 20, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderColor: '#D3D1C7' },
  screenTitle: { fontSize: 24, fontWeight: '800', color: '#2C2C2A' },
  subtitle: { fontSize: 14, color: '#5F5E5A', marginTop: 4 },
  content: { padding: 16, paddingBottom: 20 },
  profileCard: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 24, alignItems: 'center', marginBottom: 24, borderWidth: 1, borderColor: '#D3D1C7' },
  avatarContainer: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  avatarText: { fontSize: 32, fontWeight: '800', color: '#FFFFFF' },
  name: { fontSize: 20, fontWeight: '700', color: '#2C2C2A' },
  email: { fontSize: 14, color: '#5F5E5A', marginTop: 4 },
  sectionTitle: { fontSize: 11, fontWeight: '700', color: '#888780', letterSpacing: 1, marginBottom: 8, marginLeft: 4 },
  infoCard: { backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#D3D1C7', paddingHorizontal: 16, marginBottom: 24 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16 },
  infoLabel: { fontSize: 15, fontWeight: '500', color: '#2C2C2A' },
  infoValue: { fontSize: 15, color: '#5F5E5A' },
  helpText: { fontSize: 12, color: '#888780', marginTop: 4 },
  badge: { backgroundColor: '#EAF3DE', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgeText: { fontSize: 12, fontWeight: '700', color: '#27500A' },
  divider: { height: 1, backgroundColor: '#F1EFE8' },
  actionsCard: { backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#D3D1C7', paddingHorizontal: 16 },
  actionItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16 },
  actionLeft: { flexDirection: 'row', alignItems: 'center' },
  actionText: { fontSize: 15, fontWeight: '500', color: '#2C2C2A', marginLeft: 12 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#2C2C2A',
  },
  modalLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#5F5E5A',
    marginBottom: 8,
  },
  modalInput: {
    backgroundColor: '#F9F8F6',
    borderWidth: 1,
    borderColor: '#D3D1C7',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    marginBottom: 16,
  },
  modalSubmitBtn: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  modalSubmitText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  disabledBtn: {
    opacity: 0.7
  }
});
