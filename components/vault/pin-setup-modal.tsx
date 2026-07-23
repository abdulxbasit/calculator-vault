import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useVault } from '../../context/vault-context';

interface PinSetupModalProps {
  visible: boolean;
  initialPin: string;
  onClose: () => void;
}

export const PinSetupModal: React.FC<PinSetupModalProps> = ({ visible, initialPin, onClose }) => {
  const { setupPin } = useVault();
  const [pin, setPin] = useState(initialPin);
  const [confirmPin, setConfirmPin] = useState('');
  const [question, setQuestion] = useState('What is your secret hint or first pet name?');
  const [answer, setAnswer] = useState('');

  const handleSave = async () => {
    if (pin.length < 4 || pin.length > 8) {
      Alert.alert('Invalid PIN', 'PIN must be between 4 and 8 digits.');
      return;
    }
    if (pin !== confirmPin) {
      Alert.alert('PIN Mismatch', 'The confirmed PIN does not match.');
      return;
    }
    if (!answer.trim()) {
      Alert.alert('Security Recovery Required', 'Please provide an answer to your recovery security question.');
      return;
    }

    const success = await setupPin(pin, question, answer);
    if (success) {
      Alert.alert('Vault Passcode Set', 'Your secret folder is now configured! Enter your PIN and press "=" anytime to unlock.');
      onClose();
    } else {
      Alert.alert('Error', 'Failed to save secret PIN.');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <View style={styles.container}>
          <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.iconHeader}>
              <View style={styles.lockBadge}>
                <Ionicons name="shield-checkmark" size={36} color="#4ade80" />
              </View>
              <Text style={styles.title}>Set Vault Passcode</Text>
              <Text style={styles.subtitle}>
                Create a secret PIN. Entering this PIN into the calculator and pressing &quot;=&quot; will unlock your hidden vault.
              </Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Secret PIN (4-8 digits)</Text>
              <TextInput
                style={styles.input}
                value={pin}
                onChangeText={setPin}
                keyboardType="number-pad"
                secureTextEntry
                maxLength={8}
                placeholder="Enter PIN"
                placeholderTextColor="#64748b"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Confirm Secret PIN</Text>
              <TextInput
                style={styles.input}
                value={confirmPin}
                onChangeText={setConfirmPin}
                keyboardType="number-pad"
                secureTextEntry
                maxLength={8}
                placeholder="Re-enter PIN"
                placeholderTextColor="#64748b"
              />
            </View>

            <View style={styles.divider} />

            <Text style={styles.sectionHeader}>Passcode Recovery Setup</Text>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Security Question</Text>
              <TextInput
                style={styles.input}
                value={question}
                onChangeText={setQuestion}
                placeholder="Recovery Question"
                placeholderTextColor="#64748b"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Secret Answer (case insensitive)</Text>
              <TextInput
                style={styles.input}
                value={answer}
                onChangeText={setAnswer}
                placeholder="Your Answer"
                placeholderTextColor="#64748b"
              />
            </View>

            <View style={styles.buttonRow}>
              <TouchableOpacity style={[styles.btn, styles.cancelBtn]} onPress={onClose}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.btn, styles.saveBtn]} onPress={handleSave}>
                <Text style={styles.saveBtnText}>Save & Unlock</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    padding: 16,
  },
  container: {
    backgroundColor: '#262626',
    borderRadius: 20,
    maxHeight: '90%',
    paddingHorizontal: 20,
    paddingVertical: 24,
    borderWidth: 1,
    borderColor: '#383838',
  },
  content: {
    alignItems: 'stretch',
  },
  iconHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  lockBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#1E291E',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: '#A1A1AA',
    textAlign: 'center',
    lineHeight: 18,
  },
  divider: {
    height: 1,
    backgroundColor: '#383838',
    marginVertical: 16,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  inputGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#A1A1AA',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#181818',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#FFFFFF',
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#383838',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  btn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtn: {
    backgroundColor: '#353535',
  },
  cancelBtnText: {
    color: '#A1A1AA',
    fontWeight: '600',
    fontSize: 15,
  },
  saveBtn: {
    backgroundColor: '#2563EB',
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 15,
  },
});
