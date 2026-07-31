import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useVault } from '../../context/vault-context';
import { VaultFile, VaultFolder } from '../../services/vault-storage';

interface MoveFileModalProps {
  visible: boolean;
  file?: VaultFile | null;
  files?: VaultFile[];
  category: 'media' | 'docs';
  onClose: () => void;
  onSuccess?: () => void;
}

export const MoveFileModal: React.FC<MoveFileModalProps> = ({
  visible,
  file,
  files,
  category,
  onClose,
  onSuccess,
}) => {
  const { folders, moveFilesBatchToFolder } = useVault();
  const targetFiles = files && files.length > 0 ? files : file ? [file] : [];
  if (targetFiles.length === 0) return null;

  const categoryFolders = folders.filter((f) => f.category === category);

  const handleSelectFolder = async (folderId?: string) => {
    const ids = targetFiles.map((f) => f.id);
    await moveFilesBatchToFolder(ids, folderId);
    if (onSuccess) onSuccess();
    onClose();
  };

  const currentFolderId = targetFiles.length === 1 ? targetFiles[0].folderId : undefined;

  const renderFolderItem = ({ item }: { item: VaultFolder | { id: undefined; name: string } }) => {
    const isSelected = currentFolderId === item.id;
    const isRoot = item.id === undefined;

    return (
      <TouchableOpacity
        style={[styles.folderOption, isSelected && styles.folderOptionSelected]}
        onPress={() => handleSelectFolder(item.id)}
      >
        <Ionicons
          name={isRoot ? 'home-outline' : 'folder-sharp'}
          size={24}
          color={'color' in item && item.color ? item.color : '#3b82f6'}
        />
        <Text style={styles.folderOptionName}>{item.name}</Text>
        {isSelected && <Ionicons name="checkmark-circle" size={20} color="#4ade80" />}
      </TouchableOpacity>
    );
  };

  const folderList = [
    { id: undefined, name: 'Root (No Folder)' },
    ...categoryFolders,
  ];

  const headerLabel =
    targetFiles.length === 1
      ? `File: ${targetFiles[0].name}`
      : `Moving ${targetFiles.length} item(s)`;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>Move to Folder</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          <Text style={styles.fileName} numberOfLines={1}>
            {headerLabel}
          </Text>

          <FlatList
            data={folderList}
            keyExtractor={(item) => item.id || 'root'}
            renderItem={renderFolderItem}
            contentContainerStyle={styles.list}
          />
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
    maxHeight: '70%',
    borderWidth: 1,
    borderColor: '#383838',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  fileName: {
    fontSize: 13,
    color: '#A1A1AA',
    marginBottom: 16,
  },
  list: {
    gap: 8,
  },
  folderOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#181818',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#383838',
  },
  folderOptionSelected: {
    borderColor: '#71717A',
    backgroundColor: '#353535',
  },
  folderOptionName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
