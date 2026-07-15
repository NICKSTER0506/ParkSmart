// Notification/Toast utilities
export function showSuccess(message) {
  console.log('[SUCCESS]', message);
}

export function showError(error) {
  console.error('[ERROR]', error.message || error);
}

export function showInfo(message) {
  console.info('[INFO]', message);
}

// Validation helpers
export function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

export function validatePassword(password) {
  return password.length >= 6;
}

export function validatePhone(phone) {
  const re = /^[0-9]{10}$/;
  return re.test(phone.replace(/[^\d]/g, ''));
}

// Location helpers
export function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Time helpers
export function formatTime(timestamp) {
  return new Date(timestamp).toLocaleString();
}

export function formatDuration(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m`;
  return `${seconds}s`;
}
