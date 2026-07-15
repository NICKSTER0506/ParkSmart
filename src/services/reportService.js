// src/services/reportService.js
import { db } from '../config/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

const reportsCollection = collection(db, 'reports');

/**
 * Submit a new issue report
 * @param {string} userId - ID of the reporting user
 * @param {string} title - Short title of the issue
 * @param {string} description - Detailed description
 * @param {string} location - General location/slot if applicable
 */
export async function submitReport(userId, title, description, location = '') {
  try {
    const docRef = await addDoc(reportsCollection, {
      userId,
      title,
      description,
      location,
      status: 'open',
      createdAt: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    throw new Error(`Failed to submit report: ${error.message}`);
  }
}

/**
 * Fetch all reports for Admin Dashboard
 */
export async function getAllReports() {
  try {
    const { getDocs, query, orderBy } = require('firebase/firestore');
    const q = query(reportsCollection, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(docSnap => ({
      id: docSnap.id,
      ...docSnap.data()
    }));
  } catch (error) {
    // Fallback if index is missing
    const { getDocs } = require('firebase/firestore');
    const snapshot = await getDocs(reportsCollection);
    return snapshot.docs
      .map(docSnap => ({ id: docSnap.id, ...docSnap.data() }))
      .sort((a, b) => {
        const aTime = a.createdAt?.seconds || 0;
        const bTime = b.createdAt?.seconds || 0;
        return bTime - aTime;
      });
  }
}

/**
 * Update the status of a report (e.g. mark as resolved)
 */
export async function updateReportStatus(reportId, newStatus) {
  try {
    const { doc, updateDoc } = require('firebase/firestore');
    const reportRef = doc(db, 'reports', reportId);
    await updateDoc(reportRef, {
      status: newStatus
    });
  } catch (error) {
    throw new Error(`Failed to update report: ${error.message}`);
  }
}

/**
 * Fetch all reports submitted by a specific user.
 */
export async function getUserReports(userId) {
  try {
    const { getDocs, query, where, orderBy } = require('firebase/firestore');
    const q = query(
      reportsCollection, 
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(docSnap => ({
      id: docSnap.id,
      ...docSnap.data()
    }));
  } catch (error) {
    // Fallback if index is missing
    const { getDocs, query, where } = require('firebase/firestore');
    const q = query(reportsCollection, where('userId', '==', userId));
    const snapshot = await getDocs(q);
    return snapshot.docs
      .map(docSnap => ({ id: docSnap.id, ...docSnap.data() }))
      .sort((a, b) => {
        const aTime = a.createdAt?.seconds || 0;
        const bTime = b.createdAt?.seconds || 0;
        return bTime - aTime;
      });
  }
}
