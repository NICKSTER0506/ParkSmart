// src/services/authService.js
import { auth, db } from '../config/firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
  onAuthStateChanged as firebaseOnAuthStateChanged
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

/**
 * Register a new user with Email/Password and create a Firestore profile doc.
 * Default role is always 'user'.
 */
export async function register(email, password, name) {
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    const userData = {
      uid: cred.user.uid,
      name,
      email: email.trim().toLowerCase(),
      role: 'user',
      vehicleType: null,
      preferredFloor: 1,
      createdAt: serverTimestamp(),
    };
    await setDoc(doc(db, 'users', cred.user.uid), userData);
    return cred.user;
  } catch (error) {
    throw new Error(error.message);
  }
}

/**
 * Log in an existing user with Email/Password.
 */
export async function login(email, password) {
  try {
    const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
    return cred.user;
  } catch (error) {
    throw new Error(error.message);
  }
}

/**
 * Log out the current user session.
 */
export async function logout() {
  try {
    await signOut(auth);
  } catch (error) {
    throw new Error(error.message);
  }
}

/**
 * Get the currently logged-in Firebase Auth user.
 */
export function getCurrentUser() {
  return auth.currentUser;
}

/**
 * Update the user's profile data in Firestore.
 */
export async function updateUserProfile(uid, name, vehicleType) {
  try {
    const { updateDoc } = require('firebase/firestore');
    const userRef = doc(db, 'users', uid);
    
    // Check if vehicleType is an array that contains 'none', if so clear it or handle it.
    let finalVehicleType = vehicleType;
    if (Array.isArray(vehicleType)) {
      if (vehicleType.includes('none') || vehicleType.length === 0) {
        finalVehicleType = null;
      }
    } else {
      if (vehicleType === 'none') {
        finalVehicleType = null;
      }
    }

    await updateDoc(userRef, {
      name,
      vehicleType: finalVehicleType
    });
  } catch (error) {
    throw new Error(`Failed to update profile: ${error.message}`);
  }
}

/**
 * Send a secure password reset email
 */
export async function sendPasswordReset(email) {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error) {
    throw new Error(`Failed to send password reset: ${error.message}`);
  }
}

/**
 * Change user password in-app by reauthenticating first.
 */
export async function changePassword(currentPassword, newPassword) {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error("No authenticated user.");
    
    // Re-authenticate
    const credential = EmailAuthProvider.credential(user.email, currentPassword);
    await reauthenticateWithCredential(user, credential);
    
    // Update password
    await updatePassword(user, newPassword);
  } catch (error) {
    throw new Error(`Failed to change password: ${error.message}`);
  }
}

/**
 * Listen for Firebase Auth state changes.
 */
export function onAuthStateChanged(callback) {
  return firebaseOnAuthStateChanged(auth, callback);
}
