import React, { createContext, useContext, useState, ReactNode } from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';

export interface AlertButton {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => any;
}

export interface AlertOptions {
  title: string;
  message?: string;
  type?: 'danger' | 'warning' | 'info' | 'success';
  icon?: keyof typeof Ionicons.glyphMap;
  buttons?: AlertButton[];
}

interface AlertContextType {
  showAlert: (
    titleOrOptions: string | AlertOptions,
    message?: string,
    buttons?: AlertButton[]
  ) => void;
  showConfirm: (
    title: string,
    message: string,
    onConfirm: () => any,
    confirmText?: string,
    cancelText?: string
  ) => void;
  showDeleteConfirm: (
    title: string,
    message: string,
    onDelete: () => any,
    deleteText?: string
  ) => void;
  hideAlert: () => void;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export const AlertProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [visible, setVisible] = useState(false);
  const [currentOptions, setCurrentOptions] = useState<AlertOptions | null>(null);

  const showAlert = (
    titleOrOptions: string | AlertOptions,
    message?: string,
    buttons?: AlertButton[]
  ) => {
    if (typeof titleOrOptions === 'string') {
      setCurrentOptions({
        title: titleOrOptions,
        message,
        buttons,
      });
    } else {
      setCurrentOptions(titleOrOptions);
    }
    setVisible(true);
  };

  const hideAlert = () => {
    setVisible(false);
  };

  const showConfirm = (
    title: string,
    message: string,
    onConfirm: () => any,
    confirmText: string = 'Confirm',
    cancelText: string = 'Cancel'
  ) => {
    showAlert({
      title,
      message,
      type: 'info',
      buttons: [
        { text: cancelText, style: 'cancel' },
        { text: confirmText, style: 'default', onPress: onConfirm },
      ],
    });
  };

  const showDeleteConfirm = (
    title: string,
    message: string,
    onDelete: () => any,
    deleteText: string = 'Delete'
  ) => {
    showAlert({
      title,
      message,
      type: 'danger',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        { text: deleteText, style: 'destructive', onPress: onDelete },
      ],
    });
  };

  // Determine icon & color based on alert options
  const getIconInfo = (options: AlertOptions) => {
    if (options.icon) {
      return {
        name: options.icon,
        color: '#38bdf8',
        bgColor: 'rgba(56, 189, 248, 0.15)',
      };
    }

    const hasDestructive = options.buttons?.some((b) => b.style === 'destructive');
    const titleLower = options.title.toLowerCase();

    if (
      options.type === 'danger' ||
      hasDestructive ||
      titleLower.includes('delete') ||
      titleLower.includes('remove')
    ) {
      return {
        name: 'trash-bin-outline' as const,
        color: '#ef4444',
        bgColor: 'rgba(239, 68, 68, 0.15)',
      };
    }

    if (
      options.type === 'warning' ||
      titleLower.includes('warning') ||
      titleLower.includes('incomplete') ||
      titleLower.includes('denied')
    ) {
      return {
        name: 'alert-circle-outline' as const,
        color: '#facc15',
        bgColor: 'rgba(250, 204, 21, 0.15)',
      };
    }

    if (
      options.type === 'success' ||
      titleLower.includes('success') ||
      titleLower.includes('updated') ||
      titleLower.includes('reset')
    ) {
      return {
        name: 'checkmark-circle-outline' as const,
        color: '#22c55e',
        bgColor: 'rgba(34, 197, 94, 0.15)',
      };
    }

    return {
      name: 'information-circle-outline' as const,
      color: '#38bdf8',
      bgColor: 'rgba(56, 189, 248, 0.15)',
    };
  };

  const handleButtonPress = async (btn: AlertButton) => {
    hideAlert();
    if (btn.onPress) {
      try {
        await btn.onPress();
      } catch (err) {
        console.error('Alert button press handler error:', err);
      }
    }
  };

  const buttons = currentOptions?.buttons?.length
    ? currentOptions.buttons
    : [{ text: 'OK', style: 'default' as const }];

  const iconInfo = currentOptions ? getIconInfo(currentOptions) : null;
  const isMultiVertical = buttons.length > 2;

  return (
    <AlertContext.Provider
      value={{
        showAlert,
        showConfirm,
        showDeleteConfirm,
        hideAlert,
      }}
    >
      {children}

      {/* Custom Themed App Alert & Delete Dialog Modal */}
      {visible && currentOptions && (
        <Modal
          visible={visible}
          transparent
          animationType="fade"
          onRequestClose={hideAlert}
        >
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback onPress={hideAlert}>
              <View style={StyleSheet.absoluteFillObject} />
            </TouchableWithoutFeedback>

            <BlurView intensity={40} tint="dark" style={styles.dialogCard}>
              {/* Icon Circle Header */}
              {iconInfo && (
                <View style={[styles.iconCircle, { backgroundColor: iconInfo.bgColor }]}>
                  <Ionicons name={iconInfo.name} size={28} color={iconInfo.color} />
                </View>
              )}

              {/* Title & Message */}
              <Text style={styles.title}>{currentOptions.title}</Text>
              {!!currentOptions.message && (
                <Text style={styles.message}>{currentOptions.message}</Text>
              )}

              {/* Action Buttons (Row for <=2, Column for >2) */}
              <View style={isMultiVertical ? styles.buttonColumn : styles.buttonRow}>
                {buttons.map((btn, index) => {
                  const isDestructive = btn.style === 'destructive';
                  const isCancel = btn.style === 'cancel';

                  let btnStyle = styles.defaultBtn;
                  let btnTextStyle: any = styles.defaultBtnText;

                  if (isDestructive) {
                    btnStyle = styles.destructiveBtn;
                    btnTextStyle = styles.destructiveBtnText;
                  } else if (isCancel) {
                    btnStyle = styles.cancelBtn;
                    btnTextStyle = styles.cancelBtnText;
                  }

                  return (
                    <TouchableOpacity
                      key={index}
                      style={[
                        btnStyle,
                        !isMultiVertical && buttons.length > 1 && { flex: 1 },
                      ]}
                      onPress={() => handleButtonPress(btn)}
                      activeOpacity={0.8}
                    >
                      <Text style={btnTextStyle}>{btn.text}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </BlurView>
          </View>
        </Modal>
      )}
    </AlertContext.Provider>
  );
};

export const useAlert = () => {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlert must be used within an AlertProvider');
  }
  return context;
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  dialogCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#1e293b',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#334155',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 12,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F8FAFC',
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 24,
  },
  buttonColumn: {
    flexDirection: 'column',
    gap: 10,
    marginTop: 24,
  },
  defaultBtn: {
    backgroundColor: '#2563eb',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  defaultBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  cancelBtn: {
    backgroundColor: '#334155',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    color: '#CBD5E1',
    fontSize: 14,
    fontWeight: '600',
  },
  destructiveBtn: {
    backgroundColor: '#ef4444',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  destructiveBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});

