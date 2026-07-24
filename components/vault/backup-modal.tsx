import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useAlert } from '../../context/alert-context';
import { useVault } from '../../context/vault-context';
import { exportEncryptedVault, importEncryptedVault } from '../../services/backup-service';

interface BackupModalProps {
  visible: boolean;
  onClose: () => void;
}

export const BackupModal: React.FC<BackupModalProps> = ({ visible, onClose }) => {
  const { showAlert } = useAlert();
  const { reloadVaultData, pauseAutoLock, resumeAutoLock } = useVault();

  const [tab, setTab] = useState<'export' | 'import'>('export');
  
  // Export State
  const [exportPassword, setExportPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showExportPass, setShowExportPass] = useState(false);

  // Import State
  const [selectedFileUri, setSelectedFileUri] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [importPassword, setImportPassword] = useState('');
  const [showImportPass, setShowImportPass] = useState(false);
  const [importMode, setImportMode] = useState<'merge' | 'overwrite'>('merge');

  // Status & Progress State
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');

  const resetForm = () => {
    setExportPassword('');
    setConfirmPassword('');
    setSelectedFileUri(null);
    setSelectedFileName(null);
    setImportPassword('');
    setImportMode('merge');
    setIsProcessing(false);
    setProgressMsg('');
  };

  const handleClose = () => {
    if (isProcessing) return;
    resetForm();
    onClose();
  };

  const handleExport = async (target: 'share' | 'local' = 'share') => {
    if (!exportPassword.trim()) {
      showAlert('Password Required', 'Please enter a password to protect your export backup.');
      return;
    }
    if (exportPassword.length < 4) {
      showAlert('Password Too Short', 'Password should be at least 4 characters long.');
      return;
    }
    if (exportPassword !== confirmPassword) {
      showAlert('Password Mismatch', 'The passwords do not match. Please check and try again.');
      return;
    }

    setIsProcessing(true);
    try {
      pauseAutoLock();
      await exportEncryptedVault(exportPassword, target, (msg) => setProgressMsg(msg));
      showAlert(
        'Export Complete',
        target === 'local'
          ? 'Your encrypted vault backup has been saved to your local storage.'
          : 'Your encrypted vault backup has been created and opened in the share menu.'
      );
      handleClose();
    } catch (err: any) {
      console.error('Export failed:', err);
      showAlert('Export Failed', err.message || 'An error occurred while creating the backup.');
    } finally {
      setIsProcessing(false);
      setProgressMsg('');
      resumeAutoLock();
    }
  };

  const handlePickFile = async () => {
    try {
      pauseAutoLock();
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        setSelectedFileUri(file.uri);
        setSelectedFileName(file.name);
      }
    } catch (err) {
      console.error('Error picking backup file:', err);
      showAlert('File Picker Error', 'Could not select backup file.');
    } finally {
      resumeAutoLock();
    }
  };

  const handleImport = async () => {
    if (!selectedFileUri) {
      showAlert('No File Selected', 'Please select a backup (.vault) file to restore.');
      return;
    }
    if (!importPassword.trim()) {
      showAlert('Password Required', 'Please enter the password used when creating this backup.');
      return;
    }

    setIsProcessing(true);
    try {
      pauseAutoLock();
      const res = await importEncryptedVault(
        importPassword,
        selectedFileUri,
        importMode,
        (msg) => setProgressMsg(msg)
      );

      if (res.success) {
        await reloadVaultData();
        const { stats } = res;
        showAlert(
          'Backup Restored',
          `Successfully imported:\n• ${stats.files} Media & Docs\n• ${stats.notes} Secret Notes\n• ${stats.passwords} Passwords\n• ${stats.folders} Folders`
        );
        handleClose();
      }
    } catch (err: any) {
      console.error('Import failed:', err);
      showAlert(
        'Restoration Failed',
        err.message || 'Failed to decrypt or restore backup. Please verify your password.'
      );
    } finally {
      setIsProcessing(false);
      setProgressMsg('');
      resumeAutoLock();
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="shield-checkmark" size={22} color="#38bdf8" />
              <Text style={styles.title}>Encrypted Backup System</Text>
            </View>
            <TouchableOpacity onPress={handleClose} disabled={isProcessing}>
              <Ionicons name="close" size={24} color="#a1a1aa" />
            </TouchableOpacity>
          </View>

          {/* Tab Switcher */}
          <View style={styles.tabBar}>
            <TouchableOpacity
              style={[styles.tabBtn, tab === 'export' && styles.activeTabBtn]}
              onPress={() => !isProcessing && setTab('export')}
            >
              <Ionicons
                name="cloud-upload"
                size={16}
                color={tab === 'export' ? '#ffffff' : '#a1a1aa'}
              />
              <Text style={[styles.tabBtnText, tab === 'export' && styles.activeTabBtnText]}>
                Export Backup
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabBtn, tab === 'import' && styles.activeTabBtn]}
              onPress={() => !isProcessing && setTab('import')}
            >
              <Ionicons
                name="cloud-download"
                size={16}
                color={tab === 'import' ? '#ffffff' : '#a1a1aa'}
              />
              <Text style={[styles.tabBtnText, tab === 'import' && styles.activeTabBtnText]}>
                Import Backup
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} contentContainerStyle={{ paddingBottom: 24 }}>
            {tab === 'export' ? (
              /* EXPORT TAB CONTENT */
              <View style={styles.section}>
                <View style={styles.infoBanner}>
                  <Ionicons name="lock-closed" size={20} color="#facc15" />
                  <Text style={styles.infoText}>
                    Creates a password-protected **AES-256** encrypted bundle containing all photos, videos, documents, notes, passwords, and folders.
                  </Text>
                </View>

                <Text style={styles.label}>Set Backup Password</Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter backup password"
                    placeholderTextColor="#64748b"
                    secureTextEntry={!showExportPass}
                    value={exportPassword}
                    onChangeText={setExportPassword}
                    editable={!isProcessing}
                  />
                  <TouchableOpacity
                    onPress={() => setShowExportPass(!showExportPass)}
                    style={styles.eyeBtn}
                  >
                    <Ionicons
                      name={showExportPass ? 'eye-off' : 'eye'}
                      size={20}
                      color="#a1a1aa"
                    />
                  </TouchableOpacity>
                </View>

                <Text style={styles.label}>Confirm Backup Password</Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.input}
                    placeholder="Confirm backup password"
                    placeholderTextColor="#64748b"
                    secureTextEntry={!showExportPass}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    editable={!isProcessing}
                  />
                </View>

                <Text style={styles.warningText}>
                  ⚠️ Remember this password! Without it, no one (including you) can restore this backup file.
                </Text>

                {isProcessing ? (
                  <View style={styles.loadingBox}>
                    <ActivityIndicator size="large" color="#3b82f6" />
                    <Text style={styles.loadingText}>{progressMsg || 'Processing...'}</Text>
                  </View>
                ) : (
                  <View style={{ gap: 10, marginTop: 10 }}>
                    <TouchableOpacity style={styles.primaryBtn} onPress={() => handleExport('local')}>
                      <Ionicons name="folder-open-outline" size={18} color="#ffffff" />
                      <Text style={styles.primaryBtnText}>Save to Device Storage</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.secondaryBtn} onPress={() => handleExport('share')}>
                      <Ionicons name="share-social-outline" size={18} color="#38bdf8" />
                      <Text style={styles.secondaryBtnText}>Share / Send Backup File</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ) : (
              /* IMPORT TAB CONTENT */
              <View style={styles.section}>
                <Text style={styles.label}>1. Select Backup File (.vault / .zip)</Text>
                <TouchableOpacity
                  style={styles.filePickerBtn}
                  onPress={handlePickFile}
                  disabled={isProcessing}
                >
                  <Ionicons name="document-attach" size={20} color="#38bdf8" />
                  <Text style={styles.filePickerText} numberOfLines={1}>
                    {selectedFileName || 'Tap to choose backup file...'}
                  </Text>
                </TouchableOpacity>

                <Text style={styles.label}>2. Backup Password</Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter backup decryption password"
                    placeholderTextColor="#64748b"
                    secureTextEntry={!showImportPass}
                    value={importPassword}
                    onChangeText={setImportPassword}
                    editable={!isProcessing}
                  />
                  <TouchableOpacity
                    onPress={() => setShowImportPass(!showImportPass)}
                    style={styles.eyeBtn}
                  >
                    <Ionicons
                      name={showImportPass ? 'eye-off' : 'eye'}
                      size={20}
                      color="#a1a1aa"
                    />
                  </TouchableOpacity>
                </View>

                <Text style={styles.label}>3. Import Mode</Text>
                <View style={styles.modeRow}>
                  <TouchableOpacity
                    style={[styles.modeCard, importMode === 'merge' && styles.activeModeCard]}
                    onPress={() => !isProcessing && setImportMode('merge')}
                  >
                    <Ionicons
                      name="layers-outline"
                      size={18}
                      color={importMode === 'merge' ? '#38bdf8' : '#a1a1aa'}
                    />
                    <Text
                      style={[styles.modeTitle, importMode === 'merge' && styles.activeModeText]}
                    >
                      Merge Data
                    </Text>
                    <Text style={styles.modeSub}>Add to existing vault</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.modeCard, importMode === 'overwrite' && styles.activeModeCardDanger]}
                    onPress={() => !isProcessing && setImportMode('overwrite')}
                  >
                    <Ionicons
                      name="refresh-circle-outline"
                      size={18}
                      color={importMode === 'overwrite' ? '#ef4444' : '#a1a1aa'}
                    />
                    <Text
                      style={[
                        styles.modeTitle,
                        importMode === 'overwrite' && styles.activeModeTextDanger,
                      ]}
                    >
                      Overwrite
                    </Text>
                    <Text style={styles.modeSub}>Replace current vault</Text>
                  </TouchableOpacity>
                </View>

                {isProcessing ? (
                  <View style={styles.loadingBox}>
                    <ActivityIndicator size="large" color="#3b82f6" />
                    <Text style={styles.loadingText}>{progressMsg || 'Decrypting & restoring...'}</Text>
                  </View>
                ) : (
                  <TouchableOpacity style={styles.primaryBtnSuccess} onPress={handleImport}>
                    <Ionicons name="download-outline" size={18} color="#ffffff" />
                    <Text style={styles.primaryBtnText}>Decrypt & Restore Vault</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    padding: 16,
  },
  container: {
    backgroundColor: '#1e1e1e',
    borderRadius: 16,
    maxHeight: '85%',
    borderWidth: 1,
    borderColor: '#333333',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#121212',
    padding: 4,
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 10,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
  },
  activeTabBtn: {
    backgroundColor: '#2563eb',
  },
  tabBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#a1a1aa',
  },
  activeTabBtnText: {
    color: '#ffffff',
  },
  body: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  section: {
    gap: 12,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#262626',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#383838',
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: '#d4d4d8',
    lineHeight: 17,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#a1a1aa',
    marginTop: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#121212',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#333333',
    paddingHorizontal: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 11,
    fontSize: 14,
    color: '#ffffff',
  },
  eyeBtn: {
    padding: 6,
  },
  warningText: {
    fontSize: 12,
    color: '#fbbf24',
    lineHeight: 16,
    marginTop: 2,
  },
  filePickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#121212',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#383838',
    padding: 12,
  },
  filePickerText: {
    flex: 1,
    fontSize: 13,
    color: '#f4f4f5',
  },
  modeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  modeCard: {
    flex: 1,
    backgroundColor: '#121212',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#333333',
  },
  activeModeCard: {
    borderColor: '#38bdf8',
    backgroundColor: '#0c4a6e22',
  },
  activeModeCardDanger: {
    borderColor: '#ef4444',
    backgroundColor: '#7f1d1d22',
  },
  modeTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#a1a1aa',
    marginTop: 6,
  },
  activeModeText: {
    color: '#38bdf8',
  },
  activeModeTextDanger: {
    color: '#ef4444',
  },
  modeSub: {
    fontSize: 11,
    color: '#71717a',
    marginTop: 2,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingVertical: 14,
    marginTop: 10,
  },
  primaryBtnSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#16a34a',
    borderRadius: 10,
    paddingVertical: 14,
    marginTop: 10,
  },
  primaryBtnText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  loadingBox: {
    alignItems: 'center',
    paddingVertical: 20,
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
    color: '#38bdf8',
    fontWeight: '500',
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#121212',
    borderRadius: 10,
    paddingVertical: 13,
    borderWidth: 1,
    borderColor: '#38bdf8',
  },
  secondaryBtnText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#38bdf8',
  },
});
