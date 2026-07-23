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
  file: VaultFile | null;
  category: 'media' | 'docs';
  onClose: () => void;
}

export const MoveFileModal: React.FC<MoveFileModalProps> = ({
  visible,
  file,
  category,
  onClose,
}) => {
  const { folders, moveFileToFolder } = useVault();
  if (!file) return null;

  const categoryFolders = folders.filter((f) => f.category === category);

  const handleSelectFolder = async (folderId?: string) => {
    await moveFileToFolder(file.id, folderId);
    onClose();
  };

  const renderFolderItem = ({ item }: { item: VaultFolder | { id: undefined; name: string } }) => {
    const isSelected = file.folderId === item.id;
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

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>Move to Folder</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          <Text style={styles.fileName} numberOfLines={1}>
            File: {file.name}
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
