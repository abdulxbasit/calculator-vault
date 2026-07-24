import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useVault } from '../../context/vault-context';
import { useAlert } from '../../context/alert-context';

interface CreateFolderModalProps {
  visible: boolean;
  category: 'media' | 'docs';
  onClose: () => void;
}

const COLOR_OPTIONS = ['#3b82f6', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b', '#ef4444', '#06b6d4'];

export const CreateFolderModal: React.FC<CreateFolderModalProps> = ({
  visible,
  category,
  onClose,
}) => {
  const { createFolder, importFolderFromFileManager } = useVault();
  const { showAlert } = useAlert();
  const [folderName, setFolderName] = useState('');
  const [selectedColor, setSelectedColor] = useState(COLOR_OPTIONS[0]);

  const handleCreate = async () => {
    if (!folderName.trim()) {
      showAlert('Folder Name Required', 'Please enter a name for your folder.');
      return;
    }

    await createFolder(folderName, category, selectedColor);
    setFolderName('');
    onClose();
  };

  const handleImportFromFileManager = async () => {
    const success = await importFolderFromFileManager(category, folderName);
    if (success) {
      setFolderName('');
      onClose();
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.header}>
            <View style={styles.badge}>
              <Ionicons name="folder" size={24} color={selectedColor} />
            </View>
            <Text style={styles.title}>New Secret Folder</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Folder Name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Vacation, Financials, Passports"
            placeholderTextColor="#64748b"
            value={folderName}
            onChangeText={setFolderName}
            autoFocus
          />

          <Text style={styles.label}>Badge Color</Text>
          <View style={styles.colorRow}>
            {COLOR_OPTIONS.map((c) => (
              <TouchableOpacity
                key={c}
                style={[
                  styles.colorDot,
                  { backgroundColor: c },
                  selectedColor === c && styles.colorDotSelected,
                ]}
                onPress={() => setSelectedColor(c)}
              />
            ))}
          </View>

          <TouchableOpacity
            style={styles.importFolderBtn}
            onPress={handleImportFromFileManager}
          >
            <Ionicons name="folder-open" size={18} color="#38bdf8" />
            <Text style={styles.importFolderBtnText}>
              Select & Import Folder from File Manager
            </Text>
          </TouchableOpacity>

          <View style={styles.btnRow}>
            <TouchableOpacity style={[styles.btn, styles.cancelBtn]} onPress={onClose}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, styles.createBtn]} onPress={handleCreate}>
              <Text style={styles.createBtnText}>Create Empty</Text>
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
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#383838',
  },
  colorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  colorDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  colorDotSelected: {
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  importFolderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#0284c7',
    borderRadius: 10,
    paddingVertical: 12,
    marginBottom: 16,
  },
  importFolderBtnText: {
    color: '#38bdf8',
    fontSize: 14,
    fontWeight: '600',
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
  createBtn: {
    backgroundColor: '#2563EB',
  },
  createBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
});
