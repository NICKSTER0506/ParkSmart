// src/screens/user/ProfileScreen.js
import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, StatusBar, TextInput, ActivityIndicator, Modal, ScrollView } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useParking } from '../../context/ParkingContext';
import { logout, updateUserProfile, changePassword } from '../../services/authService';
import { colors } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { triggerCustomAlert } from '../../utils/alertService';
import { Alert } from 'react-native';

export default function ProfileScreen({ navigation }) {
  const { user, userDoc, role } = useAuth();
  const { bookingHistory } = useParking();

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editVehicle, setEditVehicle] = useState([]);
  const [isSaving, setIsSaving] = useState(false);

  // Password Modal State
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Initialize edit state when entering edit mode
  React.useEffect(() => {
    if (isEditing && userDoc) {
      setEditName(userDoc.name || '');
      const vt = userDoc.vehicleType;
      setEditVehicle(Array.isArray(vt) ? vt : (vt ? [vt] : []));
    }
  }, [isEditing, userDoc]);

  const handleSaveProfile = async () => {
    if (!editName.trim()) {
      triggerCustomAlert('Error', 'Name cannot be empty.', [{ text: 'OK' }]);
      return;
    }

    setIsSaving(true);
    try {
      await updateUserProfile(user.uid, editName.trim(), editVehicle);
      triggerCustomAlert('Success', 'Profile updated successfully!', [{ text: 'OK' }]);
      setIsEditing(false);
    } catch (err) {
      triggerCustomAlert('Error', err.message, [{ text: 'OK' }]);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordReset = () => {
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

  const handleLogout = async () => {
    try {
      await logout();
      // Auth state listener will auto-route to Auth/Login screen
    } catch (err) {
      console.error("Logout failed: ", err);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Recently';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString([], { month: 'long', year: 'numeric' });
  };

  return (
    <View style={styles.page}>
      <StatusBar backgroundColor="#F1EFE8" barStyle="dark-content" />

      <View style={styles.header}>
        <Text style={styles.screenTitle}>My Profile</Text>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 16 }} showsVerticalScrollIndicator={false}>
        {/* User Card */}
        <View style={styles.profileCard}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.avatarRow}>
              <View style={styles.avatarMock}>
                <Ionicons name="person" size={32} color="#FFFFFF" />
              </View>
              <View style={styles.userMeta}>
                <Text style={styles.userName}>{userDoc?.name || 'Driver'}</Text>
                <Text style={styles.userEmail}>{user?.email}</Text>
              </View>
            </View>

            <Pressable
              style={styles.editIconBtn}
              onPress={() => setIsEditing(!isEditing)}
              hitSlop={10}
            >
              <Ionicons name={isEditing ? "close-outline" : "create-outline"} size={20} color="#5F5E5A" />
            </Pressable>
          </View>

          <View style={styles.separator} />

          {isEditing ? (
            <View style={styles.editSection}>
              <Text style={styles.editLabel}>Full Name</Text>
              <TextInput
                value={editName}
                onChangeText={setEditName}
                style={styles.editInput}
                placeholder="Enter your name"
              />

              <Text style={styles.editLabel}>Vehicle Type</Text>
              <View style={styles.typeGrid}>
                {['car', 'ev', 'bike', 'suv'].map((opt) => {
                  const isSelected = editVehicle.includes(opt);
                  return (
                    <Pressable
                      key={opt}
                      style={[styles.typeCard, isSelected && styles.typeCardSelected]}
                      onPress={() => {
                        if (isSelected) {
                          setEditVehicle(editVehicle.filter(v => v !== opt));
                        } else {
                          setEditVehicle([...editVehicle, opt]);
                        }
                      }}
                    >
                      <Text style={[styles.typeText, isSelected && styles.typeTextSelected]}>
                        {opt.toUpperCase()}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Pressable
                style={[styles.saveBtn, isSaving && styles.disabledBtn]}
                onPress={handleSaveProfile}
                disabled={isSaving}
              >
                {isSaving ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.saveBtnText}>Save Changes</Text>}
              </Pressable>
            </View>
          ) : (
            <View style={styles.badgeRow}>
              <View style={styles.roleBadge}>
                <Text style={styles.roleBadgeText}>{role ? role.toUpperCase() : 'DRIVER'} ROLE</Text>
              </View>
              {(Array.isArray(userDoc?.vehicleType) ? userDoc.vehicleType : (userDoc?.vehicleType ? [userDoc.vehicleType] : [])).map((vt, index) => (
                <View key={index} style={[styles.roleBadge, { backgroundColor: '#F1EFE8', borderColor: '#D3D1C7', marginLeft: 8 }]}>
                  <Text style={[styles.roleBadgeText, { color: '#5F5E5A' }]}>
                    {vt.toUpperCase()}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Account stats card */}
        <View style={styles.statsCard}>
          <Text style={styles.sectionHeader}>ACCOUNT SUMMARY</Text>

          <View style={styles.statItem}>
            <View style={styles.statIconWrapper}>
              <Ionicons name="calendar-outline" size={18} color="#5F5E5A" />
            </View>
            <View style={styles.statTextWrapper}>
              <Text style={styles.statLabel}>Member Since</Text>
              <Text style={styles.statValue}>{formatDate(userDoc?.createdAt)}</Text>
            </View>
          </View>

          <View style={styles.statItem}>
            <View style={styles.statIconWrapper}>
              <Ionicons name="car-outline" size={18} color="#5F5E5A" />
            </View>
            <View style={styles.statTextWrapper}>
              <Text style={styles.statLabel}>Total Bookings</Text>
              <Text style={styles.statValue}>{bookingHistory.length} Reservations</Text>
            </View>
          </View>
        </View>

        {/* Action Menu */}
        <View style={styles.actionMenu}>
          <Pressable style={styles.actionRow} onPress={() => navigation.navigate('ManageFavorites')}>
            <View style={styles.actionLeft}>
              <Ionicons name="star-outline" size={20} color="#5F5E5A" />
              <Text style={styles.actionText}>Saved Locations</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#D3D1C7" />
          </Pressable>
          <View style={styles.actionDivider} />

          <Pressable style={styles.actionRow} onPress={() => navigation.navigate('SupportTickets')}>
            <View style={styles.actionLeft}>
              <Ionicons name="chatbubbles-outline" size={20} color="#5F5E5A" />
              <Text style={styles.actionText}>Support Tickets</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#D3D1C7" />
          </Pressable>
          <View style={styles.actionDivider} />

          <Pressable style={styles.actionRow} onPress={handlePasswordReset}>
            <View style={styles.actionLeft}>
              <Ionicons name="lock-closed-outline" size={20} color="#5F5E5A" />
              <Text style={styles.actionText}>Change Password</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#D3D1C7" />
          </Pressable>
        </View>

        {/* Support actions */}
        <Pressable style={styles.supportButton} onPress={() => navigation.navigate('Report')}>
          <Ionicons name="alert-circle-outline" size={20} color={colors.primary} />
          <Text style={styles.supportText}>Report a New Issue</Text>
        </Pressable>

        {/* Logout button */}
        <Pressable style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#791F1F" />
          <Text style={styles.logoutText}>Sign out</Text>
        </Pressable>
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
  page: {
    flex: 1,
    backgroundColor: '#F1EFE8',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#2C2C2A',
  },
  container: {
    flex: 1,
    padding: 16,
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#D3D1C7',
    marginBottom: 20,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarMock: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  editIconBtn: {
    padding: 4,
    backgroundColor: '#F1EFE8',
    borderRadius: 8,
  },
  userMeta: {
    marginLeft: 16,
  },
  userName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2C2C2A',
  },
  userEmail: {
    fontSize: 13,
    color: '#5F5E5A',
    marginTop: 2,
  },
  separator: {
    height: 1,
    backgroundColor: '#F1EFE8',
    marginVertical: 16,
  },
  badgeRow: {
    flexDirection: 'row',
  },
  roleBadge: {
    backgroundColor: '#E6F1FB', // brand tint
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#C7E0F8',
  },
  roleBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.5,
  },
  editSection: {
    marginTop: 4,
  },
  editLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#888780',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  editInput: {
    backgroundColor: '#F1EFE8',
    borderWidth: 1,
    borderColor: '#D3D1C7',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#2C2C2A',
    marginBottom: 16,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  typeCard: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#D3D1C7',
    backgroundColor: '#F1EFE8',
  },
  typeCardSelected: {
    backgroundColor: '#E6F1FB',
    borderColor: colors.primary,
  },
  typeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#5F5E5A',
  },
  typeTextSelected: {
    color: colors.primary,
  },
  saveBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  disabledBtn: {
    opacity: 0.7,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  statsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#D3D1C7',
    marginBottom: 24,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: '#888780',
    letterSpacing: 1,
    marginBottom: 14,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  statIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#F1EFE8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  statTextWrapper: {
    justifyContent: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#888780',
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2C2C2A',
    marginTop: 2,
  },
  supportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D3D1C7',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 12,
  },
  supportText: {
    marginLeft: 10,
    fontSize: 15,
    fontWeight: '700',
    color: colors.primary,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F4C4C4',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 32,
  },
  logoutText: {
    marginLeft: 10,
    fontSize: 15,
    fontWeight: '700',
    color: '#791F1F',
  },
  actionMenu: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D3D1C7',
    marginBottom: 16,
    overflow: 'hidden',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  actionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2C2C2A',
    marginLeft: 12,
  },
  actionDivider: {
    height: 1,
    backgroundColor: '#F1EFE8',
    marginLeft: 48,
  },
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
  }
});
