// src/context/AuthContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged, logout as authLogout } from '../services/authService';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [userDoc, setUserDoc] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let userUnsub = null;
    let adminUnsub = null;

    const cleanupSnapshots = () => {
      if (userUnsub) {
        userUnsub();
        userUnsub = null;
      }
      if (adminUnsub) {
        adminUnsub();
        adminUnsub = null;
      }
    };

    const unsubscribeAuth = onAuthStateChanged(async (firebaseUser) => {
      cleanupSnapshots();

      if (!firebaseUser) {
        setUser(null);
        setRole(null);
        setUserDoc(null);
        setLoading(false);
        return;
      }

      setUser(firebaseUser);

      try {
        const userRef = doc(db, 'users', firebaseUser.uid);
        const adminRef = doc(db, 'admins', firebaseUser.uid);
        
        userUnsub = onSnapshot(userRef, (userSnap) => {
          if (userSnap.exists()) {
            if (adminUnsub) {
               adminUnsub();
               adminUnsub = null;
            }
            const profile = userSnap.data();
            setUserDoc(profile);
            let userRole = profile.role || 'user';
            if (firebaseUser.email === 'admin@parksmart.com') userRole = 'admin';
            setRole(userRole);
            setLoading(false);
          } else {
            // Check admins collection if not in users
            adminUnsub = onSnapshot(adminRef, (adminSnap) => {
              if (adminSnap.exists()) {
                const adminProfile = adminSnap.data();
                setUserDoc(adminProfile);
                setRole(adminProfile.role || 'complex_admin');
                setLoading(false);
              } else {
                setUserDoc(null);
                let fallbackRole = 'user';
                if (firebaseUser.email === 'admin@parksmart.com') fallbackRole = 'admin';
                setRole(fallbackRole);
                setLoading(false);
              }
            });
          }
        }, (error) => {
          console.error("Error fetching profile in AuthContext: ", error);
          setUserDoc(null);
          setRole('user');
          setLoading(false);
        });

      } catch (error) {
        console.error("Error setting up user snapshot in AuthContext: ", error);
        setUserDoc(null);
        setRole('user');
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      cleanupSnapshots();
    };
  }, []);

  const logout = async () => {
    await authLogout();
  };

  const value = {
    user,
    role,
    userDoc,
    loading,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
export default AuthContext;
