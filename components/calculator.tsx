import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useVault } from '../context/vault-context';
import { PinSetupModal } from './vault/pin-setup-modal';

export const Calculator: React.FC = () => {
  const { hasPin, unlockVault, securityQuestion, resetPinWithSecurityAnswer } = useVault();

  const [display, setDisplay] = useState('0');
  const [expression, setExpression] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [showPinSetup, setShowPinSetup] = useState(false);
  const [initialPinSetup, setInitialPinSetup] = useState('');

  // Password recovery modal state
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [recoveryAnswer, setRecoveryAnswer] = useState('');
  const [newPinInput, setNewPinInput] = useState('');

  const handleNumber = (num: string) => {
    if (display === '0' || display === 'Error') {
      setDisplay(num);
    } else {
      setDisplay(display + num);
    }
  };

  const handleOperator = (op: string) => {
    if (display === 'Error') return;
    setExpression(expression + ' ' + display + ' ' + op);
    setDisplay('0');
  };

  const handleClear = () => {
    setDisplay('0');
    setExpression('');
  };

  const handleBackspace = () => {
    if (display.length > 1) {
      setDisplay(display.slice(0, -1));
    } else {
      setDisplay('0');
    }
  };

  const handleToggleSign = () => {
    if (display === '0' || display === 'Error') return;
    if (display.startsWith('-')) {
      setDisplay(display.substring(1));
    } else {
      setDisplay('-' + display);
    }
  };

  const handlePercent = () => {
    try {
      const val = parseFloat(display);
      if (!isNaN(val)) {
        setDisplay((val / 100).toString());
      }
    } catch {
      setDisplay('Error');
    }
  };

  const handleEqual = async () => {
    const cleanDisplay = display.replace(/\s+/g, '');

    // Check if input is a potential secret passcode (pure digits, 4 to 8 length)
    if (/^\d{4,8}$/.test(cleanDisplay)) {
      if (!hasPin) {
        // Trigger initial PIN setup wizard
        setInitialPinSetup(cleanDisplay);
        setShowPinSetup(true);
        return;
      } else {
        // Try unlocking vault
        const unlocked = await unlockVault(cleanDisplay);
        if (unlocked) {
          handleClear();
          return;
        }
      }
    }

    // Standard Math Calculation Logic
    try {
      const fullExpr = (expression + ' ' + display)
        .replace(/×/g, '*')
        .replace(/÷/g, '/')
        .replace(/−/g, '-');

      // Safe evaluation of basic math expressions
      const sanitized = fullExpr.replace(/[^0-9+\-*/.() ]/g, '');
      const result = Function(`"use strict"; return (${sanitized})`)();

      if (typeof result === 'number' && !isNaN(result) && isFinite(result)) {
        const resultStr = Number.isInteger(result) ? result.toString() : result.toFixed(4).replace(/\.?0+$/, '');
        setHistory([`${fullExpr} = ${resultStr}`, ...history.slice(0, 4)]);
        setDisplay(resultStr);
        setExpression('');
      } else {
        setDisplay('Error');
      }
    } catch {
      setDisplay('Error');
    }
  };

  const handleRecoveryReset = async () => {
    if (!recoveryAnswer.trim() || !newPinInput.trim()) {
      Alert.alert('Incomplete', 'Please answer the security question and enter a new PIN.');
      return;
    }
    const success = await resetPinWithSecurityAnswer(recoveryAnswer, newPinInput);
    if (success) {
      Alert.alert('PIN Reset Success', 'Your secret vault PIN has been reset and unlocked.');
      setShowRecoveryModal(false);
      setRecoveryAnswer('');
      setNewPinInput('');
    } else {
      Alert.alert('Incorrect Answer', 'The security recovery answer is incorrect.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      {/* Calculator Header & Stealth Recovery Indicator */}
      <View style={styles.header}>
        <Text style={styles.appTitle}>Calculator</Text>
        <TouchableOpacity
          onLongPress={() => {
            if (hasPin) setShowRecoveryModal(true);
          }}
          style={styles.stealthBtn}
        >
          <Ionicons name="calculator-outline" size={20} color="#475569" />
        </TouchableOpacity>
      </View>

      {/* History & Display Area */}
      <View style={styles.displayContainer}>
        {history.length > 0 && (
          <Text style={styles.historyText}>{history[0]}</Text>
        )}
        <Text style={styles.expressionText}>{expression}</Text>
        <Text style={styles.displayText} numberOfLines={1} adjustsFontSizeToFit>
          {display}
        </Text>
      </View>

      {/* Button Keypad */}
      <View style={styles.keypad}>
        <View style={styles.row}>
          <TouchableOpacity style={[styles.btn, styles.btnFunc]} onPress={handleClear}>
            <Text style={styles.btnFuncText}>AC</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btn, styles.btnFunc]} onPress={handleToggleSign}>
            <Text style={styles.btnFuncText}>±</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btn, styles.btnFunc]} onPress={handlePercent}>
            <Text style={styles.btnFuncText}>%</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btn, styles.btnOp]} onPress={() => handleOperator('÷')}>
            <Text style={styles.btnOpText}>÷</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.row}>
          <TouchableOpacity style={styles.btn} onPress={() => handleNumber('7')}>
            <Text style={styles.btnText}>7</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btn} onPress={() => handleNumber('8')}>
            <Text style={styles.btnText}>8</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btn} onPress={() => handleNumber('9')}>
            <Text style={styles.btnText}>9</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btn, styles.btnOp]} onPress={() => handleOperator('×')}>
            <Text style={styles.btnOpText}>×</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.row}>
          <TouchableOpacity style={styles.btn} onPress={() => handleNumber('4')}>
            <Text style={styles.btnText}>4</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btn} onPress={() => handleNumber('5')}>
            <Text style={styles.btnText}>5</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btn} onPress={() => handleNumber('6')}>
            <Text style={styles.btnText}>6</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btn, styles.btnOp]} onPress={() => handleOperator('−')}>
            <Text style={styles.btnOpText}>−</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.row}>
          <TouchableOpacity style={styles.btn} onPress={() => handleNumber('1')}>
            <Text style={styles.btnText}>1</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btn} onPress={() => handleNumber('2')}>
            <Text style={styles.btnText}>2</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btn} onPress={() => handleNumber('3')}>
            <Text style={styles.btnText}>3</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btn, styles.btnOp]} onPress={() => handleOperator('+')}>
            <Text style={styles.btnOpText}>+</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.row}>
          <TouchableOpacity style={styles.btn} onPress={handleBackspace}>
            <Ionicons name="backspace-outline" size={24} color="#f8fafc" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.btn} onPress={() => handleNumber('0')}>
            <Text style={styles.btnText}>0</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btn} onPress={() => handleNumber('.')}>
            <Text style={styles.btnText}>.</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.btn, styles.btnEqual]}
            onPress={handleEqual}
            onLongPress={() => {
              if (hasPin) {
                handleEqual();
              }
            }}
          >
            <Text style={styles.btnEqualText}>=</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Initial Setup Wizard Modal */}
      <PinSetupModal
        visible={showPinSetup}
        initialPin={initialPinSetup}
        onClose={() => setShowPinSetup(false)}
      />

      {/* Secret PIN Recovery Modal */}
      <Modal visible={showRecoveryModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Passcode Recovery</Text>
            <Text style={styles.modalSubtitle}>
              Question: {securityQuestion || 'What is your secret hint or pet name?'}
            </Text>

            <TextInput
              style={styles.modalInput}
              placeholder="Your Recovery Answer"
              placeholderTextColor="#64748b"
              value={recoveryAnswer}
              onChangeText={setRecoveryAnswer}
            />

            <TextInput
              style={styles.modalInput}
              placeholder="New Secret PIN (4-8 digits)"
              placeholderTextColor="#64748b"
              keyboardType="number-pad"
              secureTextEntry
              value={newPinInput}
              onChangeText={setNewPinInput}
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnCancel]}
                onPress={() => setShowRecoveryModal(false)}
              >
                <Text style={styles.modalBtnTextCancel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnSave]}
                onPress={handleRecoveryReset}
              >
                <Text style={styles.modalBtnTextSave}>Reset PIN</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  appTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
    letterSpacing: 0.5,
  },
  stealthBtn: {
    padding: 6,
  },
  displayContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  historyText: {
    fontSize: 16,
    color: '#475569',
    marginBottom: 4,
  },
  expressionText: {
    fontSize: 22,
    color: '#94a3b8',
    marginBottom: 8,
  },
  displayText: {
    fontSize: 56,
    fontWeight: '300',
    color: '#f8fafc',
  },
  keypad: {
    paddingHorizontal: 12,
    paddingBottom: 24,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  btn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#1e293b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnText: {
    fontSize: 28,
    color: '#f8fafc',
    fontWeight: '400',
  },
  btnFunc: {
    backgroundColor: '#334155',
  },
  btnFuncText: {
    fontSize: 24,
    color: '#cbd5e1',
    fontWeight: '500',
  },
  btnOp: {
    backgroundColor: '#3b82f6',
  },
  btnOpText: {
    fontSize: 32,
    color: '#ffffff',
    fontWeight: '500',
  },
  btnEqual: {
    backgroundColor: '#2563eb',
  },
  btnEqualText: {
    fontSize: 34,
    color: '#ffffff',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#f8fafc',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 16,
  },
  modalInput: {
    backgroundColor: '#0f172a',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#f8fafc',
    fontSize: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalBtnCancel: {
    backgroundColor: '#334155',
  },
  modalBtnTextCancel: {
    color: '#94a3b8',
    fontWeight: '600',
  },
  modalBtnSave: {
    backgroundColor: '#2563eb',
  },
  modalBtnTextSave: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
});
