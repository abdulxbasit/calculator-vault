import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  Pressable,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useVault } from '../context/vault-context';
import { useAlert } from '../context/alert-context';
import { PinSetupModal } from './vault/pin-setup-modal';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface HistoryItem {
  id: string;
  expression: string;
  result: string;
}

export const Calculator: React.FC = () => {
  const { hasPin, unlockVault, securityQuestion, resetPinWithSecurityAnswer } = useVault();
  const { showAlert } = useAlert();

  const [display, setDisplay] = useState('0');
  const [expression, setExpression] = useState('');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  // Keypad state
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDegree, setIsDegree] = useState(true);
  const [isInv, setIsInv] = useState(false);

  // Vault states
  const [showPinSetup, setShowPinSetup] = useState(false);
  const [initialPinSetup, setInitialPinSetup] = useState('');
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [recoveryAnswer, setRecoveryAnswer] = useState('');
  const [newPinInput, setNewPinInput] = useState('');

  // Number input
  const handleNumber = (num: string) => {
    if (display === '0' || display === 'Error') {
      setDisplay(num);
    } else {
      setDisplay(display + num);
    }
  };

  // Decimal point
  const handleDecimal = () => {
    if (display === 'Error') {
      setDisplay('0.');
      return;
    }
    // Only allow one decimal point in current active number segment
    const parts = display.split(/[\+\−\×\÷\^]/);
    const lastPart = parts[parts.length - 1];
    if (!lastPart.includes('.')) {
      setDisplay(display + '.');
    }
  };

  // Basic operator input
  const handleOperator = (op: string) => {
    if (display === 'Error') return;
    if (expression && display === '0') {
      // Replace last operator if expression ends with one
      setExpression(expression.replace(/[\+\−\×\÷\^]\s*$/, op + ' '));
    } else {
      setExpression((prev) => (prev ? `${prev} ${display} ${op}` : `${display} ${op}`));
      setDisplay('0');
    }
  };

  // Clear all
  const handleClear = () => {
    setDisplay('0');
    setExpression('');
  };

  // Backspace
  const handleBackspace = () => {
    if (display === 'Error') {
      setDisplay('0');
      return;
    }
    if (display.length > 1) {
      setDisplay(display.slice(0, -1));
    } else {
      setDisplay('0');
    }
  };

  // Smart Parentheses insertion
  const handleParentheses = () => {
    if (display === 'Error') {
      setDisplay('(');
      return;
    }
    const fullText = (expression + ' ' + display).trim();
    const openCount = (fullText.match(/\(/g) || []).length;
    const closeCount = (fullText.match(/\)/g) || []).length;

    const lastChar = display.slice(-1);
    const isLastOp = ['+', '−', '×', '÷', '(', '^'].includes(lastChar) || display === '0';

    if (openCount > closeCount && !isLastOp) {
      setDisplay(display + ')');
    } else {
      if (display === '0') {
        setDisplay('(');
      } else {
        setDisplay(display + '(');
      }
    }
  };

  // Percentage
  const handlePercent = () => {
    try {
      const val = parseFloat(display);
      if (!isNaN(val)) {
        const result = (val / 100).toString();
        setDisplay(result);
      }
    } catch {
      setDisplay('Error');
    }
  };

  // Factorial calculation helper
  const factorial = (n: number): number => {
    if (n < 0) return NaN;
    if (n === 0 || n === 1) return 1;
    let res = 1;
    for (let i = 2; i <= n; i++) res *= i;
    return res;
  };

  // Scientific function handler
  const handleScientific = (func: string) => {
    if (display === 'Error') return;
    const val = parseFloat(display);

    switch (func) {
      case '√':
        if (!isNaN(val) && val >= 0) {
          setDisplay(Math.sqrt(val).toString());
        } else {
          setDisplay('Error');
        }
        break;
      case 'π':
        setDisplay(Math.PI.toString());
        break;
      case 'e':
        if (isInv) {
          // e^x
          if (!isNaN(val)) setDisplay(Math.exp(val).toString());
        } else {
          setDisplay(Math.E.toString());
        }
        break;
      case '^':
        handleOperator('^');
        break;
      case '!':
        if (!isNaN(val) && Number.isInteger(val)) {
          setDisplay(factorial(val).toString());
        } else {
          setDisplay('Error');
        }
        break;
      case 'sin':
        if (!isNaN(val)) {
          if (isInv) {
            const rad = Math.asin(val);
            setDisplay(isDegree ? (rad * (180 / Math.PI)).toString() : rad.toString());
          } else {
            const rad = isDegree ? val * (Math.PI / 180) : val;
            setDisplay(Math.sin(rad).toString());
          }
        }
        break;
      case 'cos':
        if (!isNaN(val)) {
          if (isInv) {
            const rad = Math.acos(val);
            setDisplay(isDegree ? (rad * (180 / Math.PI)).toString() : rad.toString());
          } else {
            const rad = isDegree ? val * (Math.PI / 180) : val;
            setDisplay(Math.cos(rad).toString());
          }
        }
        break;
      case 'tan':
        if (!isNaN(val)) {
          if (isInv) {
            const rad = Math.atan(val);
            setDisplay(isDegree ? (rad * (180 / Math.PI)).toString() : rad.toString());
          } else {
            const rad = isDegree ? val * (Math.PI / 180) : val;
            setDisplay(Math.tan(rad).toString());
          }
        }
        break;
      case 'ln':
        if (!isNaN(val) && val > 0) {
          setDisplay(Math.log(val).toString());
        } else {
          setDisplay('Error');
        }
        break;
      case 'log':
        if (!isNaN(val) && val > 0) {
          setDisplay(Math.log10(val).toString());
        } else {
          setDisplay('Error');
        }
        break;
    }
  };

  // Evaluate expression & Vault Passcode check
  const handleEqual = async () => {
    const cleanDisplay = display.replace(/\s+/g, '');

    // Secret Passcode unlock check (pure 4 to 8 digits with no expression active)
    if (!expression && /^\d{4,8}$/.test(cleanDisplay)) {
      if (!hasPin) {
        setInitialPinSetup(cleanDisplay);
        setShowPinSetup(true);
        return;
      } else {
        const unlocked = await unlockVault(cleanDisplay);
        if (unlocked) {
          handleClear();
          return;
        }
      }
    }

    try {
      const rawExpr = (expression + ' ' + display).trim();
      if (!rawExpr) return;

      const sanitized = rawExpr
        .replace(/×/g, '*')
        .replace(/÷/g, '/')
        .replace(/−/g, '-')
        .replace(/\^/g, '**')
        .replace(/π/g, Math.PI.toString())
        .replace(/e/g, Math.E.toString())
        .replace(/[^0-9+\-*/.() ]/g, '');

      // Evaluate safely
      const result = Function(`"use strict"; return (${sanitized})`)();

      if (typeof result === 'number' && !isNaN(result) && isFinite(result)) {
        const resultStr = Number.isInteger(result)
          ? result.toString()
          : parseFloat(result.toFixed(8)).toString();

        // Add to history
        const newItem: HistoryItem = {
          id: Date.now().toString(),
          expression: rawExpr,
          result: resultStr,
        };
        setHistory((prev) => [newItem, ...prev.slice(0, 19)]);
        setDisplay(resultStr);
        setExpression('');
      } else {
        setDisplay('Error');
      }
    } catch {
      setDisplay('Error');
    }
  };

  // Secret recovery reset handle
  const handleRecoveryReset = async () => {
    if (!recoveryAnswer.trim() || !newPinInput.trim()) {
      showAlert('Incomplete', 'Please answer the security question and enter a new PIN.');
      return;
    }
    const success = await resetPinWithSecurityAnswer(recoveryAnswer, newPinInput);
    if (success) {
      showAlert('PIN Reset Success', 'Your secret vault PIN has been reset and unlocked.');
      setShowRecoveryModal(false);
      setRecoveryAnswer('');
      setNewPinInput('');
    } else {
      showAlert('Incorrect Answer', 'The security recovery answer is incorrect.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" backgroundColor="#161616" />

      {/* Top Header Bar */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerIconBtn}
          onPress={() => setShowHistory(true)}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons name="history" size={24} color="#D1D1D1" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.headerIconBtn}
          onPress={() => setShowMenu(true)}
          onLongPress={() => {
            if (hasPin) setShowRecoveryModal(true);
          }}
          activeOpacity={0.7}
        >
          <Ionicons name="ellipsis-vertical" size={22} color="#D1D1D1" />
        </TouchableOpacity>
      </View>

      {/* Display Area */}
      <View style={styles.displayContainer}>
        {expression ? (
          <Text style={styles.expressionText} numberOfLines={1} adjustsFontSizeToFit>
            {expression}
          </Text>
        ) : null}
        <View style={styles.displayRow}>
          <Text style={styles.displayText} numberOfLines={1} adjustsFontSizeToFit>
            {display}
          </Text>
          <View style={styles.cursor} />
        </View>
      </View>

      {/* Expand / Collapse Control Row */}
      <View style={styles.controlRow}>
        <TouchableOpacity
          style={styles.expandToggleBtn}
          onPress={() => setIsExpanded(!isExpanded)}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons
            name={isExpanded ? 'unfold-less-horizontal' : 'unfold-more-horizontal'}
            size={22}
            color="#A8A8A8"
          />
        </TouchableOpacity>
      </View>

      {/* Keypad Section */}
      <View style={[styles.keypad, isExpanded ? styles.keypadExpanded : styles.keypadCollapsed]}>

        {/* Scientific Rows (Only visible in Expanded Mode) */}
        {isExpanded && (
          <>
            {/* Scientific Row 1 */}
            <View style={styles.row}>
              <TouchableOpacity style={styles.btnSci} onPress={() => handleScientific('√')}>
                <Text style={styles.btnSciText}>√</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnSci} onPress={() => handleScientific('π')}>
                <Text style={styles.btnSciText}>π</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnSci} onPress={() => handleScientific('^')}>
                <Text style={styles.btnSciText}>^</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnSci} onPress={() => handleScientific('!')}>
                <Text style={styles.btnSciText}>!</Text>
              </TouchableOpacity>
            </View>

            {/* Scientific Row 2 */}
            <View style={styles.row}>
              <TouchableOpacity
                style={[styles.btnSci, !isDegree && styles.btnActive]}
                onPress={() => setIsDegree(!isDegree)}
              >
                <Text style={styles.btnSciText}>{isDegree ? 'Deg' : 'Rad'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnSci} onPress={() => handleScientific('sin')}>
                <Text style={styles.btnSciText}>{isInv ? 'sin⁻¹' : 'sin'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnSci} onPress={() => handleScientific('cos')}>
                <Text style={styles.btnSciText}>{isInv ? 'cos⁻¹' : 'cos'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnSci} onPress={() => handleScientific('tan')}>
                <Text style={styles.btnSciText}>{isInv ? 'tan⁻¹' : 'tan'}</Text>
              </TouchableOpacity>
            </View>

            {/* Scientific Row 3 */}
            <View style={styles.row}>
              <TouchableOpacity
                style={[styles.btnSci, isInv && styles.btnActive]}
                onPress={() => setIsInv(!isInv)}
              >
                <Text style={styles.btnSciText}>Inv</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnSci} onPress={() => handleScientific('e')}>
                <Text style={styles.btnSciText}>{isInv ? 'eˣ' : 'e'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnSci} onPress={() => handleScientific('ln')}>
                <Text style={styles.btnSciText}>ln</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnSci} onPress={() => handleScientific('log')}>
                <Text style={styles.btnSciText}>log</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* Standard Keypad Rows */}

        {/* Row 4 (or Row 1 Collapsed): AC | ( ) | % | ÷ */}
        <View style={styles.row}>
          <TouchableOpacity
            style={[styles.btn, styles.btnAc, isExpanded && styles.btnPill]}
            onPress={handleClear}
          >
            <Text style={styles.btnAcText}>AC</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.btn, styles.btnOp, isExpanded && styles.btnPill]}
            onPress={handleParentheses}
          >
            <Text style={styles.btnOpText}>( )</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.btn, styles.btnOp, isExpanded && styles.btnPill]}
            onPress={handlePercent}
          >
            <Text style={styles.btnOpText}>%</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.btn, styles.btnOp, isExpanded && styles.btnPill]}
            onPress={() => handleOperator('÷')}
          >
            <Text style={styles.btnOpText}>÷</Text>
          </TouchableOpacity>
        </View>

        {/* Row 5 (or Row 2 Collapsed): 7 | 8 | 9 | × */}
        <View style={styles.row}>
          <TouchableOpacity
            style={[styles.btn, styles.btnNum, isExpanded && styles.btnPill]}
            onPress={() => handleNumber('7')}
          >
            <Text style={styles.btnNumText}>7</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.btn, styles.btnNum, isExpanded && styles.btnPill]}
            onPress={() => handleNumber('8')}
          >
            <Text style={styles.btnNumText}>8</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.btn, styles.btnNum, isExpanded && styles.btnPill]}
            onPress={() => handleNumber('9')}
          >
            <Text style={styles.btnNumText}>9</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.btn, styles.btnOp, isExpanded && styles.btnPill]}
            onPress={() => handleOperator('×')}
          >
            <Text style={styles.btnOpText}>×</Text>
          </TouchableOpacity>
        </View>

        {/* Row 6 (or Row 3 Collapsed): 4 | 5 | 6 | − */}
        <View style={styles.row}>
          <TouchableOpacity
            style={[styles.btn, styles.btnNum, isExpanded && styles.btnPill]}
            onPress={() => handleNumber('4')}
          >
            <Text style={styles.btnNumText}>4</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.btn, styles.btnNum, isExpanded && styles.btnPill]}
            onPress={() => handleNumber('5')}
          >
            <Text style={styles.btnNumText}>5</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.btn, styles.btnNum, isExpanded && styles.btnPill]}
            onPress={() => handleNumber('6')}
          >
            <Text style={styles.btnNumText}>6</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.btn, styles.btnOp, isExpanded && styles.btnPill]}
            onPress={() => handleOperator('−')}
          >
            <Text style={styles.btnOpText}>−</Text>
          </TouchableOpacity>
        </View>

        {/* Row 7 (or Row 4 Collapsed): 1 | 2 | 3 | + */}
        <View style={styles.row}>
          <TouchableOpacity
            style={[styles.btn, styles.btnNum, isExpanded && styles.btnPill]}
            onPress={() => handleNumber('1')}
          >
            <Text style={styles.btnNumText}>1</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.btn, styles.btnNum, isExpanded && styles.btnPill]}
            onPress={() => handleNumber('2')}
          >
            <Text style={styles.btnNumText}>2</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.btn, styles.btnNum, isExpanded && styles.btnPill]}
            onPress={() => handleNumber('3')}
          >
            <Text style={styles.btnNumText}>3</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.btn, styles.btnOp, isExpanded && styles.btnPill]}
            onPress={() => handleOperator('+')}
          >
            <Text style={styles.btnOpText}>+</Text>
          </TouchableOpacity>
        </View>

        {/* Row 8 (or Row 5 Collapsed): 0 | . | ⌫ | = */}
        <View style={styles.row}>
          <TouchableOpacity
            style={[styles.btn, styles.btnNum, isExpanded && styles.btnPill]}
            onPress={() => handleNumber('0')}
          >
            <Text style={styles.btnNumText}>0</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.btn, styles.btnNum, isExpanded && styles.btnPill]}
            onPress={handleDecimal}
          >
            <Text style={styles.btnNumText}>.</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.btn, styles.btnNum, isExpanded && styles.btnPill]}
            onPress={handleBackspace}
          >
            <MaterialCommunityIcons name="backspace-outline" size={26} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.btn, styles.btnEqual, isExpanded && styles.btnPill]}
            onPress={handleEqual}
          >
            <Text style={styles.btnEqualText}>=</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* History Drawer Modal */}
      <Modal visible={showHistory} animationType="slide" transparent onRequestClose={() => setShowHistory(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.historyModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Calculation History</Text>
              <TouchableOpacity onPress={() => setShowHistory(false)}>
                <Ionicons name="close" size={24} color="#D1D1D1" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ flex: 1, marginVertical: 12 }}>
              {history.length === 0 ? (
                <Text style={styles.emptyText}>No history yet</Text>
              ) : (
                history.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.historyCard}
                    onPress={() => {
                      setDisplay(item.result);
                      setShowHistory(false);
                    }}
                  >
                    <Text style={styles.historyCardExpr}>{item.expression}</Text>
                    <Text style={styles.historyCardResult}>= {item.result}</Text>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>

            {history.length > 0 && (
              <TouchableOpacity
                style={styles.clearHistoryBtn}
                onPress={() => setHistory([])}
              >
                <Text style={styles.clearHistoryText}>Clear History</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>

      {/* Options Menu Modal */}
      <Modal visible={showMenu} animationType="fade" transparent onRequestClose={() => setShowMenu(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowMenu(false)}>
          <View style={styles.menuContent}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setShowMenu(false);
                setShowHistory(true);
              }}
            >
              <MaterialCommunityIcons name="history" size={20} color="#E3E3E3" />
              <Text style={styles.menuItemText}>History</Text>
            </TouchableOpacity>

            {hasPin && (
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setShowMenu(false);
                  setShowRecoveryModal(true);
                }}
              >
                <Ionicons name="key-outline" size={20} color="#E3E3E3" />
                <Text style={styles.menuItemText}>Reset Secret Passcode</Text>
              </TouchableOpacity>
            )}
          </View>
        </Pressable>
      </Modal>

      {/* Secret PIN Initial Setup Modal */}
      <PinSetupModal
        visible={showPinSetup}
        initialPin={initialPinSetup}
        onClose={() => setShowPinSetup(false)}
      />

      {/* Secret PIN Recovery Modal */}
      <Modal visible={showRecoveryModal} transparent animationType="fade" onRequestClose={() => setShowRecoveryModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.recoveryModalContent}>
            <Text style={styles.recoveryModalTitle}>Passcode Recovery</Text>
            <Text style={styles.recoveryModalSubtitle}>
              Question: {securityQuestion || 'What is your secret hint or pet name?'}
            </Text>

            <TextInput
              style={styles.recoveryInput}
              placeholder="Your Recovery Answer"
              placeholderTextColor="#71717A"
              value={recoveryAnswer}
              onChangeText={setRecoveryAnswer}
            />

            <TextInput
              style={styles.recoveryInput}
              placeholder="New Secret PIN (4-8 digits)"
              placeholderTextColor="#71717A"
              keyboardType="number-pad"
              secureTextEntry
              value={newPinInput}
              onChangeText={setNewPinInput}
            />

            <View style={styles.recoveryBtnRow}>
              <TouchableOpacity
                style={[styles.recoveryBtn, styles.recoveryBtnCancel]}
                onPress={() => setShowRecoveryModal(false)}
              >
                <Text style={styles.recoveryBtnTextCancel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.recoveryBtn, styles.recoveryBtnSave]}
                onPress={handleRecoveryReset}
              >
                <Text style={styles.recoveryBtnTextSave}>Reset PIN</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

// Calculate size for 4-column grid layout
const BTN_GAP = 12;
const PADDING_HORIZ = 16;
const AVAILABLE_WIDTH = SCREEN_WIDTH - PADDING_HORIZ * 2;
const BTN_SIZE_COLLAPSED = Math.floor((AVAILABLE_WIDTH - BTN_GAP * 3) / 4);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#161616',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerIconBtn: {
    padding: 8,
    borderRadius: 20,
  },
  displayContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  expressionText: {
    fontSize: 22,
    color: '#9E9E9E',
    marginBottom: 8,
    textAlign: 'right',
  },
  displayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  displayText: {
    fontSize: 56,
    fontWeight: '300',
    color: '#FFFFFF',
    textAlign: 'right',
  },
  cursor: {
    width: 2.5,
    height: 48,
    backgroundColor: '#FFFFFF',
    marginLeft: 4,
    borderRadius: 1,
  },
  controlRow: {
    paddingHorizontal: 20,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  expandToggleBtn: {
    padding: 4,
  },
  keypad: {
    paddingHorizontal: PADDING_HORIZ,
    gap: BTN_GAP,
  },
  keypadCollapsed: {
    paddingBottom: 24,
  },
  keypadExpanded: {
    paddingBottom: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: BTN_GAP,
  },

  // Collapsed Circle Buttons
  btn: {
    width: BTN_SIZE_COLLAPSED,
    height: BTN_SIZE_COLLAPSED,
    borderRadius: BTN_SIZE_COLLAPSED / 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnPill: {
    height: Math.floor(BTN_SIZE_COLLAPSED * 0.72),
    borderRadius: 24,
  },

  // Scientific Stadium Buttons
  btnSci: {
    flex: 1,
    height: Math.floor(BTN_SIZE_COLLAPSED * 0.62),
    borderRadius: 20,
    backgroundColor: '#353535',
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnSciText: {
    fontSize: 16,
    color: '#E3E3E3',
    fontWeight: '400',
  },
  btnActive: {
    backgroundColor: '#4E4E4E',
    borderWidth: 1,
    borderColor: '#71717A',
  },

  // Button Color Variations (Stock Android Dark Theme Palette)
  btnAc: {
    backgroundColor: '#9C9C9C', // Light silver / grey
  },
  btnAcText: {
    fontSize: 24,
    color: '#141414',
    fontWeight: '500',
  },
  btnOp: {
    backgroundColor: '#353535', // Medium dark grey
  },
  btnOpText: {
    fontSize: 26,
    color: '#E3E3E3',
    fontWeight: '400',
  },
  btnNum: {
    backgroundColor: '#252525', // Dark charcoal
  },
  btnNumText: {
    fontSize: 30,
    color: '#FFFFFF',
    fontWeight: '400',
  },
  btnEqual: {
    backgroundColor: '#2563EB', // Blue accent
  },
  btnEqualText: {
    fontSize: 34,
    color: '#FFFFFF',
    fontWeight: '400',
  },

  // Modals & Menu
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  historyModalContent: {
    backgroundColor: '#1E1E1E',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '75%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2E2E2E',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  emptyText: {
    textAlign: 'center',
    color: '#71717A',
    fontSize: 15,
    marginTop: 24,
  },
  historyCard: {
    backgroundColor: '#262626',
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
  },
  historyCardExpr: {
    fontSize: 14,
    color: '#A1A1AA',
    marginBottom: 4,
  },
  historyCardResult: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  clearHistoryBtn: {
    marginTop: 8,
    paddingVertical: 12,
    backgroundColor: '#27272A',
    borderRadius: 12,
    alignItems: 'center',
  },
  clearHistoryText: {
    color: '#EF4444',
    fontWeight: '600',
    fontSize: 15,
  },

  menuContent: {
    position: 'absolute',
    top: 50,
    right: 16,
    backgroundColor: '#262626',
    borderRadius: 12,
    paddingVertical: 8,
    minWidth: 180,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  menuItemText: {
    color: '#E3E3E3',
    fontSize: 15,
    fontWeight: '400',
  },

  recoveryModalContent: {
    backgroundColor: '#262626',
    borderRadius: 20,
    padding: 20,
    margin: 20,
  },
  recoveryModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  recoveryModalSubtitle: {
    fontSize: 14,
    color: '#A1A1AA',
    marginBottom: 16,
  },
  recoveryInput: {
    backgroundColor: '#18181B',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#FFFFFF',
    fontSize: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#3F3F46',
  },
  recoveryBtnRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  recoveryBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  recoveryBtnCancel: {
    backgroundColor: '#3F3F46',
  },
  recoveryBtnTextCancel: {
    color: '#A1A1AA',
    fontWeight: '600',
  },
  recoveryBtnSave: {
    backgroundColor: '#3B82F6',
  },
  recoveryBtnTextSave: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
});
