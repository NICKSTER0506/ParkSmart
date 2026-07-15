import { triggerCustomAlert } from './alertService';

/**
 * Cross-platform alert helper that launches a gorgeous custom animated modal
 * on both Web and Native (iOS/Android) environments.
 * 
 * @param {string} title - Alert title
 * @param {string} message - Alert body message
 * @param {Array} buttons - Option buttons with [{ text, onPress, style }]
 */
export const showAlert = (title, message, buttons = []) => {
  triggerCustomAlert(title, message, buttons);
};
