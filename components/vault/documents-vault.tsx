import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import React, { useRef, useState, useEffect } from 'react';
import {
  Animated,
  Dimensions,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  BackHandler,
} from 'react-native';
import { useVault } from '../../context/vault-context';
import { useAlert } from '../../context/alert-context';
import { VaultFile, VaultFolder } from '../../services/vault-storage';
import { CreateFolderModal } from './create-folder-modal';
import { MoveFileModal } from './move-file-modal';

const { width } = Dimensions.get('window');

const DocFolderCard: React.FC<{
  name: string;
  count: number;
  color?: string;
  files: VaultFile[];
  onPress: () => void;
  onDelete?: () => void;
  isAll?: boolean;
}> = ({ name, count, color, files, onPress, onDelete, isAll }) => {
  const previewFiles = files.slice(0, 3);

  return (
    <TouchableOpacity style={styles.folderCard} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.folderCardPreviewBox}>
        <View style={[styles.emptyFolderIconCircle, { backgroundColor: (color || '#38bdf8') + '15' }]}>
          <Ionicons name="documents" size={34} color={color || '#38bdf8'} />
        </View>
        {previewFiles.length > 0 && (
          <View style={styles.docMiniChipStack}>
            {previewFiles.map((file, idx) => (
              <View key={file.id || idx} style={styles.docMiniChip}>
                <Ionicons name="document-text" size={10} color={color || '#38bdf8'} />
                <Text style={styles.docMiniChipText} numberOfLines={1}>
                  {file.name}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>

      <View style={styles.folderCardInfo}>
        <View style={styles.folderCardTitleRow}>
          <Text style={styles.folderCardTitle} numberOfLines={1}>
            {name}
          </Text>
          {onDelete && !isAll && (
            <TouchableOpacity onPress={onDelete} style={{ padding: 2 }}>
              <Ionicons name="ellipsis-vertical" size={16} color="#94a3b8" />
            </TouchableOpacity>
          )}
        </View>
        <Text style={styles.folderCardCount}>{count} file(s)</Text>
      </View>
    </TouchableOpacity>
  );
};

export const DocumentsVault: React.FC = () => {
  const { files, folders, addDocumentFilesBatch, deleteFile, deleteFolder, importFolderFromFileManager } = useVault();
  const { showAlert } = useAlert();
  // null = Main View showing Folders Grid
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);

  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [fileToMove, setFileToMove] = useState<VaultFile | null>(null);

  // Animated Floating Action Button (FAB) state
  const [isFabOpen, setIsFabOpen] = useState(false);
  const fabAnim = useRef(new Animated.Value(0)).current;

  const toggleFab = () => {
    const toValue = isFabOpen ? 0 : 1;
    Animated.spring(fabAnim, {
      toValue,
      useNativeDriver: true,
      friction: 6,
      tension: 40,
    }).start();
    setIsFabOpen(!isFabOpen);
  };

  const fabRotation = fabAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '45deg'],
  });

  const menuScale = fabAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 1],
  });

  const menuTranslateY = fabAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [20, 0],
  });

  const backdropOpacity = fabAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  // Hardware BackHandler effect
  useEffect(() => {
    const onBackPress = () => {
      if (selectedFolderId !== null) {
        setSelectedFolderId(null);
        return true;
      }
      return false;
    };
    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, [selectedFolderId]);

  const docFolders = folders.filter((f) => f.category === 'docs');
  const allDocFiles = files.filter((f) => f.type === 'document');

  const filteredDocFiles = allDocFiles.filter((f) => {
    if (selectedFolderId === 'ALL') return true;
    if (selectedFolderId === 'ROOT') return !f.folderId;
    return f.folderId === selectedFolderId;
  });

  const activeFolder = docFolders.find((f) => f.id === selectedFolderId);

  const handleImportFolder = async () => {
    await importFolderFromFileManager('docs');
  };

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
        multiple: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const targetFolderId =
          selectedFolderId && selectedFolderId !== 'ALL' && selectedFolderId !== 'ROOT'
            ? selectedFolderId
            : undefined;

        const itemsToImport = result.assets.map((file) => ({
          uri: file.uri,
          originalName: file.name,
          mimeType: file.mimeType,
        }));

        await addDocumentFilesBatch(itemsToImport, targetFolderId);
      }
    } catch (err) {
      console.error('Document import error:', err);
      showAlert('Import Failed', 'Could not pick document.');
    }
  };

  const handleShare = async (file: VaultFile) => {
    try {
      const available = await Sharing.isAvailableAsync();
      if (!available) {
        showAlert('Sharing Unavailable', 'Sharing is not supported on this device.');
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
    showAlert('Delete Document', `Are you sure you want to delete "${file.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteFile(file.id),
      },
    ]);
  };

  const handleDeleteFolder = (folder: VaultFolder) => {
    showAlert(
      'Delete Folder',
      `Delete folder "${folder.name}"? Files inside will be moved to Root.`,
      [
        {
          text: 'Delete Folder & Files',
          style: 'destructive',
          onPress: async () => {
            await deleteFolder(folder.id, true);
            setSelectedFolderId('ALL');
          },
        },
        {
          text: 'Delete Folder Only',
          style: 'default',
          onPress: async () => {
            await deleteFolder(folder.id, false);
            setSelectedFolderId('ALL');
          },
        },
        { text: 'Cancel', style: 'cancel' },
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
      {/* Clean Header */}
      <View style={styles.header}>
        <TouchableOpacity
          disabled={selectedFolderId === null}
          onPress={() => setSelectedFolderId(null)}
          style={{ flex: 1 }}
          activeOpacity={selectedFolderId !== null ? 0.7 : 1}
        >
          <Text style={styles.sectionTitle}>
            {selectedFolderId === null
              ? 'Secret Documents'
              : activeFolder
                ? activeFolder.name
                : 'All Documents'}
          </Text>
          <Text style={styles.subtitle}>
            {selectedFolderId === null
              ? `${docFolders.length + 1} folder(s)`
              : `${filteredDocFiles.length} file(s)`}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Main View: Folders First OR Inside Folder Files */}
      {selectedFolderId === null ? (
        /* MAIN SCREEN: FOLDERS GRID VIEW WITH PREVIEWS */
        <ScrollView contentContainerStyle={styles.foldersGridContainer} showsVerticalScrollIndicator={false}>

          <View style={styles.foldersGrid}>
            {/* Master Card: All Secret Documents */}
            <DocFolderCard
              name="All Secret Documents"
              count={allDocFiles.length}
              color="#38bdf8"
              files={allDocFiles}
              isAll
              onPress={() => setSelectedFolderId('ALL')}
            />

            {/* Custom Secret Folders */}
            {docFolders.map((folder) => {
              const folderFiles = allDocFiles.filter((f) => f.folderId === folder.id);
              return (
                <DocFolderCard
                  key={folder.id}
                  name={folder.name}
                  count={folderFiles.length}
                  color={folder.color}
                  files={folderFiles}
                  onPress={() => setSelectedFolderId(folder.id)}
                  onDelete={() => handleDeleteFolder(folder)}
                />
              );
            })}
          </View>

          {docFolders.length === 0 && (
            <View style={styles.emptyFoldersTipBox}>
              <Ionicons name="folder-open-outline" size={44} color="#38bdf8" />
              <Text style={styles.emptyFoldersTipTitle}>No Document Folders Yet</Text>
              <Text style={styles.emptyFoldersTipSub}>
                Tap the &quot;+&quot; button in the bottom right corner to create or import document folders.
              </Text>
            </View>
          )}
        </ScrollView>
      ) : (
        /* INSIDE FOLDER: FILES LIST VIEW */
        filteredDocFiles.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="folder-open-outline" size={48} color="#A1A1AA" />
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
            showsVerticalScrollIndicator={false}
          />
        )
      )}

      {/* Dim Backdrop when FAB menu is open */}
      {isFabOpen && (
        <TouchableOpacity
          activeOpacity={1}
          style={styles.fabBackdrop}
          onPress={toggleFab}
        />
      )}

      {/* Animated Sub-Actions FAB Menu */}
      <Animated.View
        pointerEvents={isFabOpen ? 'auto' : 'none'}
        style={[
          styles.fabMenuContainer,
          {
            opacity: backdropOpacity,
            transform: [{ scale: menuScale }, { translateY: menuTranslateY }],
          },
        ]}
      >
        <TouchableOpacity
          style={styles.fabSubBtn}
          onPress={() => {
            toggleFab();
            handlePickDocument();
          }}
        >
          <Text style={styles.fabSubLabel}>Import Document</Text>
          <View style={[styles.fabSubIconCircle, { backgroundColor: '#38bdf8' }]}>
            <Ionicons name="document-text" size={20} color="#FFFFFF" />
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.fabSubBtn}
          onPress={() => {
            toggleFab();
            handleImportFolder();
          }}
        >
          <Text style={styles.fabSubLabel}>Import Folder</Text>
          <View style={[styles.fabSubIconCircle, { backgroundColor: '#a855f7' }]}>
            <Ionicons name="folder-open" size={20} color="#FFFFFF" />
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.fabSubBtn}
          onPress={() => {
            toggleFab();
            setShowCreateFolder(true);
          }}
        >
          <Text style={styles.fabSubLabel}>New Folder</Text>
          <View style={[styles.fabSubIconCircle, { backgroundColor: '#22c55e' }]}>
            <Ionicons name="folder-outline" size={20} color="#FFFFFF" />
          </View>
        </TouchableOpacity>
      </Animated.View>

      {/* Primary Animated Floating Action Button (FAB) */}
      <TouchableOpacity
        style={styles.fabMainBtn}
        onPress={toggleFab}
        activeOpacity={0.85}
      >
        <Animated.View style={{ transform: [{ rotate: fabRotation }] }}>
          <Ionicons name="add" size={32} color="#FFFFFF" />
        </Animated.View>
      </TouchableOpacity>

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
    backgroundColor: '#161616',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#282828',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 12,
    color: '#A1A1AA',
    marginTop: 2,
  },
  backToFoldersBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginRight: 10,
    backgroundColor: '#1e293b',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  backToFoldersText: {
    color: '#38bdf8',
    fontSize: 13,
    fontWeight: '600',
  },
  foldersGridContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  foldersGridHeader: {
    marginBottom: 14,
  },
  foldersGridSectionTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  foldersGridSectionSub: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 2,
  },
  foldersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  folderCard: {
    width: (width - 32 - 12) / 2,
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  folderCardPreviewBox: {
    width: '100%',
    height: 110,
    borderRadius: 12,
    backgroundColor: '#0f172a',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
  },
  docMiniChipStack: {
    width: '100%',
    gap: 4,
    marginTop: 4,
  },
  docMiniChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#1e293b',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  docMiniChipText: {
    color: '#94a3b8',
    fontSize: 9,
    fontWeight: '500',
    flex: 1,
  },
  emptyFolderIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  folderCardInfo: {
    marginTop: 8,
  },
  folderCardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  folderCardTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    flex: 1,
  },
  folderCardCount: {
    color: '#38bdf8',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  emptyFoldersTipBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
    gap: 8,
  },
  emptyFoldersTipTitle: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 8,
  },
  emptyFoldersTipSub: {
    color: '#94A3B8',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  fabBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    zIndex: 40,
  },
  fabMainBtn: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    zIndex: 50,
  },
  fabMenuContainer: {
    position: 'absolute',
    bottom: 90,
    right: 20,
    alignItems: 'flex-end',
    gap: 12,
    zIndex: 50,
  },
  fabSubBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  fabSubLabel: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '600',
    backgroundColor: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    elevation: 4,
  },
  fabSubIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  folderBar: {
    backgroundColor: '#181818',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#282828',
  },
  folderChips: {
    paddingHorizontal: 16,
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#262626',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#383838',
  },
  chipActive: {
    backgroundColor: '#353535',
    borderColor: '#71717A',
  },
  chipText: {
    color: '#A1A1AA',
    fontSize: 12,
    fontWeight: '500',
  },
  chipTextActive: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  listContainer: {
    padding: 16,
    gap: 10,
  },
  docCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#262626',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#383838',
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
    color: '#FFFFFF',
    marginBottom: 4,
  },
  docSub: {
    fontSize: 12,
    color: '#A1A1AA',
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
    backgroundColor: '#262626',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#A1A1AA',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 18,
  },
  emptyBtn: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  emptyBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
