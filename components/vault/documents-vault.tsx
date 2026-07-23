import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  FlatList,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import { useVault } from '../../context/vault-context';
import { VaultFile, VaultFolder } from '../../services/vault-storage';
import { CreateFolderModal } from './create-folder-modal';
import { MoveFileModal } from './move-file-modal';

export const DocumentsVault: React.FC = () => {
  const { files, folders, addDocumentFile, deleteFile, deleteFolder } = useVault();
  const [selectedFolderId, setSelectedFolderId] = useState<string | 'ALL' | 'ROOT'>('ALL');

  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [fileToMove, setFileToMove] = useState<VaultFile | null>(null);

  const docFolders = folders.filter((f) => f.category === 'docs');
  const allDocFiles = files.filter((f) => f.type === 'document');

  const filteredDocFiles = allDocFiles.filter((f) => {
    if (selectedFolderId === 'ALL') return true;
    if (selectedFolderId === 'ROOT') return !f.folderId;
    return f.folderId === selectedFolderId;
  });

  const activeFolder = docFolders.find((f) => f.id === selectedFolderId);

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const targetFolderId =
          selectedFolderId !== 'ALL' && selectedFolderId !== 'ROOT'
            ? selectedFolderId
            : undefined;

        for (const file of result.assets) {
          await addDocumentFile(file.uri, file.name, file.mimeType, targetFolderId);
        }
      }
    } catch (err) {
      console.error('Document import error:', err);
      Alert.alert('Import Failed', 'Could not pick document.');
    }
  };

  const handleShare = async (file: VaultFile) => {
    try {
      const available = await Sharing.isAvailableAsync();
      if (!available) {
        Alert.alert('Sharing Unavailable', 'Sharing is not supported on this device.');
        return;
      }
      await Sharing.shareAsync(file.uri, {
        mimeType: file.mimeType || 'application/octet-stream',
        dialogTitle: `Export ${file.name}`,
      });
    } catch (err) {
      console.error('Error sharing document:', err);
    }
  };

  const handleDelete = (file: VaultFile) => {
    Alert.alert('Delete Document', `Are you sure you want to delete "${file.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteFile(file.id),
      },
    ]);
  };

  const handleDeleteFolder = (folder: VaultFolder) => {
    Alert.alert(
      'Delete Folder',
      `Delete folder "${folder.name}"? Files inside will be moved to Root.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Folder Only',
          onPress: async () => {
            await deleteFolder(folder.id, false);
            setSelectedFolderId('ALL');
          },
        },
        {
          text: 'Delete Folder & Files',
          style: 'destructive',
          onPress: async () => {
            await deleteFolder(folder.id, true);
            setSelectedFolderId('ALL');
          },
        },
      ]
    );
  };

  const formatBytes = (bytes?: number) => {
    if (!bytes) return 'Unknown size';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getDocIcon = (name: string) => {
    const ext = name.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return { name: 'document-text' as const, color: '#f87171' };
    if (['doc', 'docx'].includes(ext || '')) return { name: 'document-attach' as const, color: '#60a5fa' };
    if (['xls', 'xlsx', 'csv'].includes(ext || '')) return { name: 'grid-outline' as const, color: '#4ade80' };
    if (['zip', 'rar', '7z'].includes(ext || '')) return { name: 'archive-outline' as const, color: '#facc15' };
    return { name: 'document-outline' as const, color: '#94a3b8' };
  };

  const renderItem = ({ item }: { item: VaultFile }) => {
    const icon = getDocIcon(item.name);
    return (
      <View style={styles.docCard}>
        <View style={[styles.iconCircle, { backgroundColor: icon.color + '20' }]}>
          <Ionicons name={icon.name} size={24} color={icon.color} />
        </View>

        <View style={styles.docInfo}>
          <Text style={styles.docName} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.docSub}>
            {formatBytes(item.size)} • {new Date(item.createdAt).toLocaleDateString()}
          </Text>
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.actionIconBtn} onPress={() => setFileToMove(item)}>
            <Ionicons name="folder-open-outline" size={19} color="#facc15" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionIconBtn} onPress={() => handleShare(item)}>
            <Ionicons name="share-outline" size={19} color="#38bdf8" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionIconBtn} onPress={() => handleDelete(item)}>
            <Ionicons name="trash-outline" size={19} color="#f87171" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.sectionTitle}>
            {activeFolder ? `Folder: ${activeFolder.name}` : 'Secret Documents'}
          </Text>
          <Text style={styles.subtitle}>{filteredDocFiles.length} file(s) stored</Text>
        </View>

        <View style={styles.headerBtnRow}>
          <TouchableOpacity style={styles.newFolderBtn} onPress={() => setShowCreateFolder(true)}>
            <Ionicons name="folder-open-outline" size={18} color="#38bdf8" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.importBtn} onPress={handlePickDocument}>
            <Ionicons name="add" size={20} color="#ffffff" />
            <Text style={styles.importBtnText}>Add Document</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Folder Chips Selector */}
      <View style={styles.folderBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.folderChips}>
          <TouchableOpacity
            style={[styles.chip, selectedFolderId === 'ALL' && styles.chipActive]}
            onPress={() => setSelectedFolderId('ALL')}
          >
            <Text style={[styles.chipText, selectedFolderId === 'ALL' && styles.chipTextActive]}>
              All ({allDocFiles.length})
            </Text>
          </TouchableOpacity>

          {docFolders.map((f) => {
            const count = allDocFiles.filter((item) => item.folderId === f.id).length;
            const isActive = selectedFolderId === f.id;
            return (
              <TouchableOpacity
                key={f.id}
                style={[
                  styles.chip,
                  isActive && styles.chipActive,
                  { borderColor: f.color || '#334155' },
                ]}
                onPress={() => setSelectedFolderId(f.id)}
                onLongPress={() => handleDeleteFolder(f)}
              >
                <Ionicons name="folder-sharp" size={14} color={f.color || '#38bdf8'} />
                <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                  {f.name} ({count})
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* List or Empty State */}
      {filteredDocFiles.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconCircle}>
            <Ionicons name="folder-open-outline" size={48} color="#64748b" />
          </View>
          <Text style={styles.emptyTitle}>No Documents Stored</Text>
          <Text style={styles.emptySubtitle}>
            Securely import PDFs, Word docs, spreadsheets, or text files into this folder.
          </Text>
          <TouchableOpacity style={styles.emptyBtn} onPress={handlePickDocument}>
            <Text style={styles.emptyBtnText}>Import Document</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredDocFiles}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContainer}
        />
      )}

      {/* Create Folder Modal */}
      <CreateFolderModal
        visible={showCreateFolder}
        category="docs"
        onClose={() => setShowCreateFolder(false)}
      />

      {/* Move File Modal */}
      <MoveFileModal
        visible={!!fileToMove}
        file={fileToMove}
        category="docs"
        onClose={() => setFileToMove(null)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f8fafc',
  },
  subtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  headerBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  newFolderBtn: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
  },
  importBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#2563eb',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  importBtnText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 13,
  },
  folderBar: {
    backgroundColor: '#090d16',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  folderChips: {
    paddingHorizontal: 16,
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1e293b',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  chipActive: {
    backgroundColor: '#2563eb',
    borderColor: '#3b82f6',
  },
  chipText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '500',
  },
  chipTextActive: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  listContainer: {
    padding: 16,
    gap: 10,
  },
  docCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  docInfo: {
    flex: 1,
  },
  docName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#f8fafc',
    marginBottom: 4,
  },
  docSub: {
    fontSize: 12,
    color: '#94a3b8',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 6,
  },
  actionIconBtn: {
    padding: 6,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#1e293b',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#cbd5e1',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 18,
  },
  emptyBtn: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  emptyBtnText: {
    color: '#ffffff',
    fontWeight: '600',
  },
});
