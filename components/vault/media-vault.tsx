import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  FlatList,
  Image,
  Modal,
  Alert,
  Dimensions,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Sharing from 'expo-sharing';
import { BlurView } from 'expo-blur';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useVault } from '../../context/vault-context';
import { VaultFile, VaultFolder } from '../../services/vault-storage';
import { CreateFolderModal } from './create-folder-modal';
import { MoveFileModal } from './move-file-modal';
import { PinchZoomImage } from './pinch-zoom-image';

const VaultVideoPlayer: React.FC<{ uri: string }> = ({ uri }) => {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.play();
  });

  return (
    <VideoView
      style={styles.fullVideo}
      player={player}
      allowsFullscreen
      allowsPictureInPicture
      nativeControls
    />
  );
};

const { width, height } = Dimensions.get('window');
const COLUMN_COUNT = 3;
const ITEM_SIZE = (width - 32 - 16) / COLUMN_COUNT;

export const MediaVault: React.FC = () => {
  const { files, folders, addMediaFilesBatch, deleteFile, deleteFolder, importFolderFromFileManager } = useVault();
  const [selectedFolderId, setSelectedFolderId] = useState<string | 'ALL' | 'ROOT'>('ALL');

  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const flatListRef = React.useRef<FlatList>(null);
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [fileToMove, setFileToMove] = useState<VaultFile | null>(null);

  const handleImportFolder = async () => {
    await importFolderFromFileManager('media');
  };

  // Picture Zoom Level State
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);

  const mediaFolders = folders.filter((f) => f.category === 'media');
  const allMediaFiles = files.filter((f) => f.type === 'image' || f.type === 'video');

  const filteredMediaFiles = allMediaFiles.filter((f) => {
    if (selectedFolderId === 'ALL') return true;
    if (selectedFolderId === 'ROOT') return !f.folderId;
    return f.folderId === selectedFolderId;
  });

  const activeFolder = mediaFolders.find((f) => f.id === selectedFolderId);
  const selectedFile = selectedIndex !== null && selectedIndex >= 0 && selectedIndex < filteredMediaFiles.length ? filteredMediaFiles[selectedIndex] : null;

  const handleOpenPreview = (index: number) => {
    setZoomLevel(1.0);
    setSelectedIndex(index);
  };





  const handlePickMedia = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Denied', 'Permission to access media library is required.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images', 'videos'],
        quality: 1,
        allowsMultipleSelection: true,
        selectionLimit: 0,
      });

      if (!result.canceled && result.assets.length > 0) {
        const targetFolderId =
          selectedFolderId !== 'ALL' && selectedFolderId !== 'ROOT'
            ? selectedFolderId
            : undefined;

        const itemsToImport = result.assets.map((asset, index) => {
          const type = asset.type === 'video' ? 'video' : 'image';
          const name = asset.fileName || `${type}_${Date.now()}_${index + 1}`;
          return {
            uri: asset.uri,
            originalName: name,
            type: type as 'image' | 'video',
            mimeType: asset.mimeType,
          };
        });

        await addMediaFilesBatch(itemsToImport, targetFolderId);
      }
    } catch (err) {
      console.error('Media import error:', err);
      Alert.alert('Import Failed', 'Unable to import selected media file.');
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
        mimeType: file.mimeType || (file.type === 'image' ? 'image/jpeg' : 'video/mp4'),
        dialogTitle: `Export ${file.name}`,
      });
    } catch (err) {
      console.error('Error sharing media file:', err);
    }
  };

  const handleDelete = (file: VaultFile) => {
    Alert.alert('Delete Media', `Are you sure you want to permanently delete "${file.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteFile(file.id);
          if (filteredMediaFiles.length <= 1) {
            setSelectedIndex(null);
          } else if (selectedIndex !== null && selectedIndex >= filteredMediaFiles.length - 1) {
            setSelectedIndex(filteredMediaFiles.length - 2);
          }
        },
      },
    ]);
  };

  const handleDeleteFolder = (folder: VaultFolder) => {
    Alert.alert(
      'Delete Folder',
      `Delete "${folder.name}"? Files inside will be moved to Root.`,
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

  const renderItem = ({ item, index }: { item: VaultFile; index: number }) => (
    <TouchableOpacity
      style={styles.gridItem}
      onPress={() => handleOpenPreview(index)}
      activeOpacity={0.8}
    >
      <Image source={{ uri: item.uri }} style={styles.thumbnail} />
      {item.type === 'video' && (
        <View style={styles.videoBadge}>
          <Ionicons name="play-circle" size={24} color="#ffffff" />
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.sectionTitle}>
            {activeFolder ? `Folder: ${activeFolder.name}` : 'Photos & Videos'}
          </Text>
          <Text style={styles.subtitle}>{filteredMediaFiles.length} item(s)</Text>
        </View>

        <View style={styles.headerBtnRow}>
          <TouchableOpacity style={styles.newFolderBtn} onPress={() => setShowCreateFolder(true)}>
            <Ionicons name="folder-open-outline" size={18} color="#E3E3E3" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.importFolderHeaderBtn} onPress={handleImportFolder}>
            <Ionicons name="folder-open" size={16} color="#38bdf8" />
            <Text style={styles.importFolderHeaderBtnText}>Folder</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.importBtn} onPress={handlePickMedia}>
            <Ionicons name="add" size={20} color="#FFFFFF" />
            <Text style={styles.importBtnText}>Gallery</Text>
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
              All ({allMediaFiles.length})
            </Text>
          </TouchableOpacity>

          {mediaFolders.map((f) => {
            const count = allMediaFiles.filter((item) => item.folderId === f.id).length;
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

      {/* Grid or Empty State */}
      {filteredMediaFiles.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconCircle}>
            <Ionicons name="images-outline" size={48} color="#A1A1AA" />
          </View>
          <Text style={styles.emptyTitle}>No Media Here</Text>
          <Text style={styles.emptySubtitle}>
            Import secret photos & videos from your gallery to keep them safe in this folder.
          </Text>
          <TouchableOpacity style={styles.emptyBtn} onPress={handlePickMedia}>
            <Text style={styles.emptyBtnText}>Import Now</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredMediaFiles}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          numColumns={COLUMN_COUNT}
          contentContainerStyle={styles.gridContainer}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Media Fullscreen Interactive Zoom Preview Modal with Left/Right Swipe */}
      {selectedIndex !== null && selectedFile && (
        <Modal
          visible
          transparent
          animationType="fade"
          onRequestClose={() => setSelectedIndex(null)}
        >
          <GestureHandlerRootView style={{ flex: 1 }}>
            <View style={styles.modalOverlay}>
              {/* Glassy Header */}
              <BlurView intensity={75} tint="dark" style={styles.previewHeader}>
                <TouchableOpacity onPress={() => setSelectedIndex(null)} style={styles.headerBackBtn}>
                  <Ionicons name="arrow-back" size={24} color="#ffffff" />
                </TouchableOpacity>

                <View style={styles.previewTitleContainer}>
                  <Text style={styles.previewTitle} numberOfLines={1}>
                    {selectedFile.name}
                  </Text>
                  <Text style={styles.previewCounter}>
                    {selectedIndex + 1} of {filteredMediaFiles.length}
                  </Text>
                </View>
              </BlurView>

              {/* Horizontal Swipeable Content View */}
              <View style={styles.previewContent}>
                <FlatList
                  ref={flatListRef}
                  data={filteredMediaFiles}
                  horizontal
                  pagingEnabled
                  scrollEnabled={zoomLevel <= 1.05}
                  showsHorizontalScrollIndicator={false}
                  keyExtractor={(item) => item.id}
                  initialScrollIndex={selectedIndex}
                  getItemLayout={(_, index) => ({
                    length: width,
                    offset: width * index,
                    index,
                  })}
                  onMomentumScrollEnd={(e) => {
                    const newIdx = Math.round(e.nativeEvent.contentOffset.x / width);
                    if (newIdx >= 0 && newIdx < filteredMediaFiles.length && newIdx !== selectedIndex) {
                      setSelectedIndex(newIdx);
                      setZoomLevel(1.0);
                    }
                  }}
                  renderItem={({ item }) => (
                    <View style={{ width: width, flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                      {item.type === 'image' ? (
                        <PinchZoomImage
                          uri={item.uri}
                          zoomLevel={zoomLevel}
                          onZoomChange={setZoomLevel}
                        />
                      ) : (
                        <VaultVideoPlayer uri={item.uri} />
                      )}
                    </View>
                  )}
                />
              </View>

              {/* Glassy Footer Toolbar */}
              <BlurView intensity={75} tint="dark" style={styles.previewFooter}>
                <TouchableOpacity style={styles.actionBtn} onPress={() => handleShare(selectedFile)}>
                  <Ionicons name="share-outline" size={20} color="#38bdf8" />
                  <Text style={styles.actionText}>Export</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => {
                    setFileToMove(selectedFile);
                    setSelectedIndex(null);
                  }}
                >
                  <Ionicons name="folder-open-outline" size={20} color="#facc15" />
                  <Text style={[styles.actionText, { color: '#facc15' }]}>Move</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => handleDelete(selectedFile)}
                >
                  <Ionicons name="trash-outline" size={20} color="#f87171" />
                  <Text style={[styles.actionText, { color: '#f87171' }]}>Delete</Text>
                </TouchableOpacity>
              </BlurView>
            </View>
          </GestureHandlerRootView>
        </Modal>
      )}

      {/* Folder Creation Modal */}
      <CreateFolderModal
        visible={showCreateFolder}
        category="media"
        onClose={() => setShowCreateFolder(false)}
      />

      {/* Move File Modal */}
      <MoveFileModal
        visible={!!fileToMove}
        file={fileToMove}
        category="media"
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
  headerBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  newFolderBtn: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: '#262626',
    borderWidth: 1,
    borderColor: '#383838',
  },
  importBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#2563EB',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  importBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13,
  },
  importFolderHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#0f172a',
    borderColor: '#0284c7',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 20,
  },
  importFolderHeaderBtnText: {
    color: '#38bdf8',
    fontWeight: '600',
    fontSize: 12,
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
  gridContainer: {
    padding: 16,
    gap: 8,
  },
  gridItem: {
    width: ITEM_SIZE,
    height: ITEM_SIZE,
    marginRight: 8,
    marginBottom: 8,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#262626',
    position: 'relative',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  videoBadge: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: '#121212',
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: 'rgba(18, 18, 18, 0.75)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.12)',
    gap: 12,
    overflow: 'hidden',
  },
  headerBackBtn: {
    paddingRight: 4,
    paddingVertical: 4,
  },
  previewTitleContainer: {
    flex: 1,
    marginRight: 8,
  },
  previewTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  previewCounter: {
    color: '#38bdf8',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  previewContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullVideo: {
    width: '100%',
    height: '100%',
  },
  zoomScrollView: {
    width: width,
    height: height - 140,
  },
  zoomScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullImage: {
    width: width,
    height: height * 0.7,
  },
  previewFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 30,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 14,
    paddingBottom: Platform.OS === 'ios' ? 28 : 18,
    backgroundColor: 'rgba(18, 18, 18, 0.65)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.12)',
    overflow: 'hidden',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  actionText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13,
  },
});
