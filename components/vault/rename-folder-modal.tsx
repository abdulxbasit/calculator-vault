import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useVault } from '../../context/vault-context';
import { useAlert } from '../../context/alert-context';
import { VaultFolder } from '../../services/vault-storage';

interface RenameFolderModalProps {
  visible: boolean;
  folder: VaultFolder | null;
  onClose: () => void;
}

export const RenameFolderModal: React.FC<RenameFolderModalProps> = ({ visible, folder, onClose }) => {
  const { renameFolder } = useVault();
  const { showAlert } = useAlert();
  const [folderName, setFolderName] = useState('');

  useEffect(() => {
    if (folder) {
      setFolderName(folder.name);
    }
  }, [folder]);

  if (!folder) return null;

  const handleSave = async () => {
    if (!folderName.trim()) {
      showAlert('Folder Name Required', 'Please enter a name for the folder.');
      return;
    }
    await renameFolder(folder.id, folderName.trim());
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.header}>
            <View style={styles.badge}>
              <Ionicons name="pencil-sharp" size={22} color={folder.color || '#3b82f6'} />
            </View>
            <Text style={styles.title}>Rename Folder</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>New Folder Name</Text>
          <TextInput
            style={styles.input}
            value={folderName}
            onChangeText={setFolderName}
            placeholder="Folder name"
            placeholderTextColor="#64748b"
            autoFocus
          />

          <View style={styles.btnRow}>
            <TouchableOpacity style={[styles.btn, styles.cancelBtn]} onPress={onClose}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, styles.saveBtn]} onPress={handleSave}>
              <Text style={styles.saveBtnText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#262626',
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: '#383838',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  badge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#181818',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    flex: 1,
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
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#383838',
  },
  btnRow: {
    flexDirection: 'row',
    gap: 12,
  },
  btn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelBtn: {
    backgroundColor: '#353535',
  },
  cancelBtnText: {
    color: '#A1A1AA',
    fontWeight: '600',
  },
  saveBtn: {
    backgroundColor: '#2563EB',
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
});
