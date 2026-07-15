let alertRef = null;

/**
 * Register the global Alert Modal reference.
 */
export const registerAlertRef = (ref) => {
  alertRef = ref;
};

/**
 * Triggers the custom animated alert modal.
 */
export const triggerCustomAlert = (title, message, buttons = []) => {
  if (alertRef) {
    alertRef.show(title, message, buttons);
  } else {
    // Fallback to basic alerts if root component isn't mounted
    if (buttons && buttons.length > 0) {
      const confirmed = window.confirm(`${title}\n\n${message}`);
      if (confirmed) {
        const actionButton = buttons.find(b => b.style !== 'cancel') || buttons[0];
        if (actionButton && actionButton.onPress) actionButton.onPress();
      } else {
        const cancelButton = buttons.find(b => b.style === 'cancel');
        if (cancelButton && cancelButton.onPress) cancelButton.onPress();
      }
    } else {
      window.alert(`${title}\n\n${message}`);
    }
  }
};
