import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, Animated, Dimensions } from 'react-native';
import { colors } from '../constants/theme';
import { registerAlertRef } from '../utils/alertService';

export default function CustomAlert() {
  const [visible, setVisible] = useState(false);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [buttons, setButtons] = useState([]);

  const scaleValue = useRef(new Animated.Value(0)).current;
  const opacityValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Register this instance as the global alert handler
    registerAlertRef({
      show: (alertTitle, alertMessage, alertButtons = []) => {
        setTitle(alertTitle);
        setMessage(alertMessage);
        setButtons(alertButtons);
        setVisible(true);

        // Entrance animations
        Animated.parallel([
          Animated.spring(scaleValue, {
            toValue: 1,
            friction: 7,
            tension: 40,
            useNativeDriver: true,
          }),
          Animated.timing(opacityValue, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start();
      },
      hide: () => {
        handleDismiss();
      }
    });
  }, []);

  const handleDismiss = () => {
    // Exit animations
    Animated.parallel([
      Animated.timing(scaleValue, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(opacityValue, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setVisible(false);
    });
  };

  const handleButtonPress = (onPress) => {
    handleDismiss();
    if (onPress) {
      // Execute after dismissal animation completes
      setTimeout(() => {
        onPress();
      }, 180);
    }
  };

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={handleDismiss}>
      <Pressable style={styles.overlay} onPress={handleDismiss}>
        <Animated.View 
          style={[
            styles.alertContainer, 
            { 
              opacity: opacityValue,
              transform: [{ scale: scaleValue }] 
            }
          ]}
        >
          {/* Card Frame */}
          <Pressable style={styles.alertCard} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.message}>{message}</Text>

            <View style={styles.buttonRow}>
              {buttons.length > 0 ? (
                buttons.map((btn, index) => {
                  const isCancel = btn.style === 'cancel';
                  const isDestructive = btn.style === 'destructive';
                  
                  return (
                    <Pressable
                      key={index}
                      style={[
                        styles.button,
                        isCancel ? styles.cancelButton : styles.primaryButton,
                        isDestructive && styles.destructiveButton,
                        buttons.length > 1 && { flex: 1, marginHorizontal: 6 }
                      ]}
                      onPress={() => handleButtonPress(btn.onPress)}
                    >
                      <Text 
                        style={[
                          styles.buttonText,
                          isCancel ? styles.cancelButtonText : styles.primaryButtonText,
                          isDestructive && styles.destructiveButtonText
                        ]}
                      >
                        {btn.text}
                      </Text>
                    </Pressable>
                  );
                })
              ) : (
                <Pressable style={[styles.button, styles.primaryButton]} onPress={handleDismiss}>
                  <Text style={[styles.buttonText, styles.primaryButtonText]}>OK</Text>
                </Pressable>
              )}
            </View>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(21, 41, 27, 0.45)', // Custom dark green-tinted backdrop
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  alertContainer: {
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
  },
  alertCard: {
    width: '100%',
    backgroundColor: colors.panel,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#15291B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 10,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: colors.secondaryText,
    lineHeight: 22,
    marginBottom: 24,
    textAlign: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginHorizontal: -6,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 100,
  },
  primaryButton: {
    backgroundColor: colors.primary,
  },
  cancelButton: {
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  destructiveButton: {
    backgroundColor: '#F8D7DA',
    borderWidth: 1,
    borderColor: colors.danger,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '700',
  },
  primaryButtonText: {
    color: '#fff',
  },
  cancelButtonText: {
    color: colors.primary,
  },
  destructiveButtonText: {
    color: colors.danger,
  },
});
