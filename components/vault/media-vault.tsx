import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as ImagePicker from 'expo-image-picker';
import * as Sharing from 'expo-sharing';
import { useVideoPlayer, VideoView } from 'expo-video';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  BackHandler,
  Dimensions,
  FlatList,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAlert } from '../../context/alert-context';
import { useVault } from '../../context/vault-context';
import { VaultFile, VaultFolder } from '../../services/vault-storage';
import { CreateFolderModal } from './create-folder-modal';
import { MoveFileModal } from './move-file-modal';
import { PinchZoomImage } from './pinch-zoom-image';
import { RenameFolderModal } from './rename-folder-modal';

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

const MediaFolderCard: React.FC<{
  name: string;
  count: number;
  color?: string;
  files: VaultFile[];
  onPress: () => void;
  onLongPress?: () => void;
  onDelete?: () => void;
  isAll?: boolean;
  isSelected?: boolean;
  isSelectionMode?: boolean;
}> = ({ name, count, color, files, onPress, onLongPress, onDelete, isAll, isSelected, isSelectionMode }) => {
  const previewFiles = files.slice(0, 4);

  return (
    <TouchableOpacity
      style={[styles.folderCard, isSelected && styles.folderCardSelected]}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.85}
    >
      <View style={styles.folderCardPreviewBox}>
        {previewFiles.length > 0 ? (
          <View style={styles.folderGridPreview}>
            {previewFiles.map((file, idx) => (
              <Image key={file.id || idx} source={{ uri: file.uri }} style={styles.folderGridThumb} />
            ))}
            {previewFiles.length < 4 &&
              Array.from({ length: 4 - previewFiles.length }).map((_, i) => (
                <View key={`placeholder_${i}`} style={styles.folderGridPlaceholder} />
              ))}
          </View>
        ) : (
          <View style={[styles.emptyFolderIconCircle, { backgroundColor: (color || '#38bdf8') + '15' }]}>
            <Ionicons name="folder" size={36} color={color || '#38bdf8'} />
          </View>
        )}

        {isSelectionMode && !isAll && (
          <View style={[styles.folderCheckboxOverlay, isSelected && styles.folderCheckboxOverlayActive]}>
            <Ionicons
              name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
              size={22}
              color={isSelected ? '#38bdf8' : 'rgba(255,255,255,0.7)'}
            />
          </View>
        )}
      </View>

      <View style={styles.folderCardInfo}>
        <View style={styles.folderCardTitleRow}>
          <Text style={styles.folderCardTitle} numberOfLines={1}>
            {name}
          </Text>
          {onDelete && !isAll && !isSelectionMode && (
            <TouchableOpacity onPress={onDelete} style={{ padding: 2 }}>
              <Ionicons name="ellipsis-vertical" size={16} color="#94a3b8" />
            </TouchableOpacity>
          )}
        </View>
        <Text style={styles.folderCardCount}>{count} item(s)</Text>
      </View>
    </TouchableOpacity>
  );
};

export const MediaVault: React.FC = () => {
  const { files, folders, addMediaFilesBatch, deleteFile, deleteFilesBatch, deleteFolder, deleteFoldersBatch, importFolderFromFileManager, exportFolderToFileManager, exportFoldersBatchToFileManager, exportFilesBatchToFileManager, pauseAutoLock, resumeAutoLock } = useVault();
  const { showAlert } = useAlert();
  const insets = useSafeAreaInsets();
  // null = Main View showing Folders Grid
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);

  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([]);
  const isSelectionMode = selectedFileIds.length > 0;

  const [selectedFolderIds, setSelectedFolderIds] = useState<string[]>([]);
  const isFolderSelectionMode = selectedFolderId === null && selectedFolderIds.length > 0;
  const [folderToRename, setFolderToRename] = useState<VaultFolder | null>(null);

  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);
  const [isControlsHidden, setIsControlsHidden] = useState<boolean>(false);
  const flatListRef = useRef<FlatList>(null);
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [fileToMove, setFileToMove] = useState<VaultFile | null>(null);
  const [isMoveBatchVisible, setIsMoveBatchVisible] = useState(false);

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
      if (selectedIndex !== null) {
        setSelectedIndex(null);
        return true;
      }
      if (selectedFileIds.length > 0) {
        setSelectedFileIds([]);
        return true;
      }
      if (selectedFolderIds.length > 0) {
        setSelectedFolderIds([]);
        return true;
      }
      if (selectedFolderId !== null) {
        setSelectedFolderId(null);
        return true;
      }
      return false;
    };
    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, [selectedFolderId, selectedFileIds, selectedFolderIds, selectedIndex]);

  const toggleSelectFile = (id: string) => {
    setSelectedFileIds((prev) =>
      prev.includes(id) ? prev.filter((itemId) => itemId !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedFileIds.length === filteredMediaFiles.length) {
      setSelectedFileIds([]);
    } else {
      setSelectedFileIds(filteredMediaFiles.map((f) => f.id));
    }
  };

  const exitSelectionMode = () => {
    setSelectedFileIds([]);
  };

  const handleBatchDelete = () => {
    if (selectedFileIds.length === 0) return;
    showAlert(
      'Delete Selected Media',
      `Are you sure you want to permanently delete ${selectedFileIds.length} selected file(s)?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteFilesBatch(selectedFileIds);
            setSelectedFileIds([]);
          },
        },
      ]
    );
  };

  const handleBatchExport = async () => {
    if (selectedFileIds.length === 0) return;
    const count = selectedFileIds.length;
    const success = await exportFilesBatchToFileManager(selectedFileIds, true);
    if (success) {
      showAlert('Files Moved Out', `Successfully moved ${count} item(s) to File Manager and removed from Vault.`);
      setSelectedFileIds([]);
    }
  };

  const handleImportFolder = async () => {
    await importFolderFromFileManager('media');
  };

  const toggleSelectFolder = (id: string) => {
    setSelectedFolderIds((prev) =>
      prev.includes(id) ? prev.filter((itemId) => itemId !== id) : [...prev, id]
    );
  };

  const handleFolderPress = (folder: VaultFolder) => {
    if (isFolderSelectionMode) {
      toggleSelectFolder(folder.id);
    } else {
      setSelectedFolderId(folder.id);
    }
  };

  const handleFolderLongPress = (folder: VaultFolder) => {
    if (isFolderSelectionMode) {
      toggleSelectFolder(folder.id);
    } else {
      handleDeleteFolder(folder);
    }
  };

  const handleBatchDeleteFolders = () => {
    if (selectedFolderIds.length === 0) return;
    showAlert(
      'Delete Selected Folders',
      `Are you sure you want to permanently delete ${selectedFolderIds.length} selected folder(s) and all their contents?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteFoldersBatch(selectedFolderIds, true);
            setSelectedFolderIds([]);
          },
        },
      ]
    );
  };

  const handleBatchExportFolders = async () => {
    if (selectedFolderIds.length === 0) return;
    const count = selectedFolderIds.length;
    const success = await exportFoldersBatchToFileManager(selectedFolderIds, true);
    if (success) {
      showAlert('Folders Moved Out', `Successfully moved ${count} folder(s) to File Manager and removed from Vault.`);
      setSelectedFolderIds([]);
    }
  };

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
    setIsControlsHidden(false);
    setSelectedIndex(index);
  };

  const handlePickMedia = async () => {
    try {
      pauseAutoLock();
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        showAlert('Permission Denied', 'Permission to access media library is required.');
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
          selectedFolderId && selectedFolderId !== 'ALL' && selectedFolderId !== 'ROOT'
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
      showAlert('Import Failed', 'Unable to import selected media file.');
    } finally {
      resumeAutoLock();
    }
  };

  const handleShare = async (file: VaultFile) => {
    try {
      pauseAutoLock();
      const available = await Sharing.isAvailableAsync();
      if (!available) {
        showAlert('Sharing Unavailable', 'Sharing is not supported on this device.');
        return;
      }
      await Sharing.shareAsync(file.uri, {
        mimeType: file.mimeType || (file.type === 'image' ? 'image/jpeg' : 'video/mp4'),
        dialogTitle: `Export ${file.name}`,
      });
    } catch (err) {
      console.error('Error sharing media file:', err);
    } finally {
      resumeAutoLock();
    }
  };

  const handleDelete = (file: VaultFile) => {
    showAlert('Delete Media', `Are you sure you want to permanently delete "${file.name}"?`, [
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
    showAlert(
      `Folder: ${folder.name}`,
      `Choose an action:`,
      [
        {
          text: 'Select Multiple Folders',
          style: 'default',
          onPress: () => {
            setSelectedFolderIds([folder.id]);
          },
        },
        {
          text: 'Rename Folder',
          style: 'default',
          onPress: () => {
            setFolderToRename(folder);
          },
        },
        {
          text: 'Move Out from Vault',
          style: 'default',
          onPress: async () => {
            await exportFolderToFileManager(folder.id, true);
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
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const renderItem = ({ item, index }: { item: VaultFile; index: number }) => {
    const isSelected = selectedFileIds.includes(item.id);

    return (
      <TouchableOpacity
        style={[styles.gridItem, isSelected && styles.gridItemSelected]}
        onPress={() => {
          if (isSelectionMode) {
            toggleSelectFile(item.id);
          } else {
            handleOpenPreview(index);
          }
        }}
        onLongPress={() => {
          if (!isSelectionMode) {
            setSelectedFileIds([item.id]);
          }
        }}
        activeOpacity={0.8}
      >
        <Image source={{ uri: item.uri }} style={styles.thumbnail} />
        {item.type === 'video' && (
          <View style={styles.videoBadge}>
            <Ionicons name="play-circle" size={24} color="#ffffff" />
          </View>
        )}

        {isSelectionMode && (
          <View style={[styles.checkboxOverlay, isSelected && styles.checkboxOverlayActive]}>
            <Ionicons
              name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
              size={22}
              color={isSelected ? '#38bdf8' : 'rgba(255,255,255,0.7)'}
            />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Clean Header */}
      <View style={styles.header}>
        {isFolderSelectionMode ? (
          <>
            <TouchableOpacity onPress={() => setSelectedFolderIds([])} style={styles.headerBackBtn}>
              <Ionicons name="close" size={24} color="#ffffff" />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>{selectedFolderIds.length} Folder(s) Selected</Text>
              <Text style={styles.subtitle}>{mediaFolders.length} total folder(s)</Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                if (selectedFolderIds.length === mediaFolders.length) {
                  setSelectedFolderIds([]);
                } else {
                  setSelectedFolderIds(mediaFolders.map((f) => f.id));
                }
              }}
              style={styles.selectAllBtn}
            >
              <Text style={styles.selectAllText}>
                {selectedFolderIds.length === mediaFolders.length ? 'Deselect All' : 'Select All'}
              </Text>
            </TouchableOpacity>
          </>
        ) : isSelectionMode ? (
          <>
            <TouchableOpacity onPress={exitSelectionMode} style={styles.headerBackBtn}>
              <Ionicons name="close" size={24} color="#ffffff" />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>{selectedFileIds.length} Selected</Text>
              <Text style={styles.subtitle}>{filteredMediaFiles.length} total item(s)</Text>
            </View>
            <TouchableOpacity onPress={handleSelectAll} style={styles.selectAllBtn}>
              <Text style={styles.selectAllText}>
                {selectedFileIds.length === filteredMediaFiles.length ? 'Deselect All' : 'Select All'}
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity
              disabled={selectedFolderId === null}
              onPress={() => {
                setSelectedFileIds([]);
                setSelectedFolderId(null);
              }}
              style={{ flex: 1 }}
              activeOpacity={selectedFolderId !== null ? 0.7 : 1}
            >
              <Text style={styles.sectionTitle}>
                {selectedFolderId === null
                  ? 'Photos & Videos'
                  : activeFolder
                    ? activeFolder.name
                    : 'All Media'}
              </Text>
              <Text style={styles.subtitle}>
                {selectedFolderId === null
                  ? `${mediaFolders.length + 1} folder(s)`
                  : `${filteredMediaFiles.length} item(s)`}
              </Text>
            </TouchableOpacity>

            {selectedFolderId !== null && filteredMediaFiles.length > 0 && (
              <TouchableOpacity
                onPress={() => setSelectedFileIds([filteredMediaFiles[0].id])}
                style={styles.selectModeIconBtn}
              >
                <Ionicons name="checkmark-done-circle-outline" size={24} color="#38bdf8" />
              </TouchableOpacity>
            )}
          </>
        )}
      </View>

      {/* Main View: Folders First OR Inside Folder Files */}
      {selectedFolderId === null ? (
        /* MAIN SCREEN: FOLDERS GRID VIEW WITH PREVIEWS */
        <ScrollView contentContainerStyle={styles.foldersGridContainer} showsVerticalScrollIndicator={false}>
          <View style={styles.foldersGrid}>
            {/* Master Card: All Secret Photos & Videos */}
            <MediaFolderCard
              name="All Secret Media"
              count={allMediaFiles.length}
              color="#38bdf8"
              files={allMediaFiles}
              isAll
              onPress={() => setSelectedFolderId('ALL')}
            />

            {/* Custom Secret Folders */}
            {mediaFolders.map((folder) => {
              const folderFiles = allMediaFiles.filter((f) => f.folderId === folder.id);
              const isSelected = selectedFolderIds.includes(folder.id);
              return (
                <MediaFolderCard
                  key={folder.id}
                  name={folder.name}
                  count={folderFiles.length}
                  color={folder.color}
                  files={folderFiles}
                  isSelected={isSelected}
                  isSelectionMode={isFolderSelectionMode}
                  onPress={() => handleFolderPress(folder)}
                  onLongPress={() => handleFolderLongPress(folder)}
                  onDelete={() => handleDeleteFolder(folder)}
                />
              );
            })}
          </View>

          {mediaFolders.length === 0 && (
            <View style={styles.emptyFoldersTipBox}>
              <Ionicons name="folder-open-outline" size={44} color="#38bdf8" />
              <Text style={styles.emptyFoldersTipTitle}>No Secret Folders Yet</Text>
              <Text style={styles.emptyFoldersTipSub}>
                Tap the &quot;+&quot; button in the bottom right corner to create or import secret folders.
              </Text>
            </View>
          )}
        </ScrollView>
      ) : (
        /* INSIDE FOLDER: FILES GRID VIEW */
        filteredMediaFiles.length === 0 ? (
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
            handlePickMedia();
          }}
        >
          <Text style={styles.fabSubLabel}>Import Media</Text>
          <View style={[styles.fabSubIconCircle, { backgroundColor: '#38bdf8' }]}>
            <Ionicons name="images" size={20} color="#FFFFFF" />
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
      {!isSelectionMode && !isFolderSelectionMode && (
        <TouchableOpacity
          style={styles.fabMainBtn}
          onPress={toggleFab}
          activeOpacity={0.85}
        >
          <Animated.View style={{ transform: [{ rotate: fabRotation }] }}>
            <Ionicons name="add" size={32} color="#FFFFFF" />
          </Animated.View>
        </TouchableOpacity>
      )}

      {/* Multi-Select Glassy Floating Action Bar for Folders */}
      {isFolderSelectionMode && (
        <BlurView intensity={80} tint="dark" style={[styles.selectionActionBar, { paddingBottom: Math.max(insets.bottom + 8, 16) }]}>
          <TouchableOpacity style={styles.selectionActionBtn} onPress={handleBatchExportFolders}>
            <Ionicons name="share-outline" size={22} color="#38bdf8" />
            <Text style={styles.selectionActionText}>Move Out ({selectedFolderIds.length})</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.selectionActionBtn} onPress={handleBatchDeleteFolders}>
            <Ionicons name="trash-outline" size={22} color="#f87171" />
            <Text style={[styles.selectionActionText, { color: '#f87171' }]}>Delete ({selectedFolderIds.length})</Text>
          </TouchableOpacity>
        </BlurView>
      )}

      {/* Multi-Select Glassy Floating Action Bar */}
      {isSelectionMode && (
        <BlurView intensity={80} tint="dark" style={[styles.selectionActionBar, { paddingBottom: Math.max(insets.bottom + 8, 16) }]}>
          <TouchableOpacity style={styles.selectionActionBtn} onPress={() => setIsMoveBatchVisible(true)}>
            <Ionicons name="folder-open-outline" size={22} color="#facc15" />
            <Text style={[styles.selectionActionText, { color: '#facc15' }]}>Move</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.selectionActionBtn} onPress={handleBatchExport}>
            <Ionicons name="share-outline" size={22} color="#38bdf8" />
            <Text style={styles.selectionActionText}>Export</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.selectionActionBtn} onPress={handleBatchDelete}>
            <Ionicons name="trash-outline" size={22} color="#f87171" />
            <Text style={[styles.selectionActionText, { color: '#f87171' }]}>Delete ({selectedFileIds.length})</Text>
          </TouchableOpacity>
        </BlurView>
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
              {/* Glassy Header (Hides on pinch zoom or single tap) */}
              {zoomLevel <= 1.05 && !isControlsHidden && (
                <BlurView intensity={75} tint="dark" style={[styles.previewHeader, { paddingTop: insets.top + 12 }]}>
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
              )}

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
                  style={{ flex: 1, width: width }}
                  contentContainerStyle={{ alignItems: 'center' }}
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
                      setIsControlsHidden(false);
                    }
                  }}
                  renderItem={({ item }) => (
                    <View style={{ width: width, height: '100%', justifyContent: 'center', alignItems: 'center' }}>
                      {item.type === 'image' ? (
                        <PinchZoomImage
                          uri={item.uri}
                          zoomLevel={zoomLevel}
                          onZoomChange={setZoomLevel}
                          onSingleTap={() => setIsControlsHidden((prev) => !prev)}
                          onPinchStart={() => setIsControlsHidden(true)}
                        />
                      ) : (
                        <VaultVideoPlayer uri={item.uri} />
                      )}
                    </View>
                  )}
                />
              </View>

              {/* Glassy Footer Toolbar (Hides on pinch zoom or single tap) */}
              {zoomLevel <= 1.05 && !isControlsHidden && (
                <BlurView intensity={75} tint="dark" style={[styles.previewFooter, { paddingBottom: Math.max(insets.bottom + 8, Platform.OS === 'ios' ? 28 : 18) }]}>
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
              )}
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
        visible={!!fileToMove || isMoveBatchVisible}
        file={fileToMove}
        files={isMoveBatchVisible ? filteredMediaFiles.filter((f) => selectedFileIds.includes(f.id)) : undefined}
        category="media"
        onClose={() => {
          setFileToMove(null);
          setIsMoveBatchVisible(false);
        }}
        onSuccess={() => {
          setSelectedFileIds([]);
        }}
      />

      {/* Rename Folder Modal */}
      <RenameFolderModal
        visible={!!folderToRename}
        folder={folderToRename}
        onClose={() => setFolderToRename(null)}
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
  folderCardSelected: {
    borderColor: '#38bdf8',
    borderWidth: 2,
    backgroundColor: '#0f172a',
  },
  folderCheckboxOverlay: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 12,
    padding: 2,
  },
  folderCheckboxOverlayActive: {
    backgroundColor: '#0f172a',
  },
  folderCardPreviewBox: {
    width: '100%',
    height: 110,
    borderRadius: 12,
    backgroundColor: '#0f172a',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  folderGridPreview: {
    width: '100%',
    height: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  folderGridThumb: {
    width: '50%',
    height: '50%',
    borderWidth: 0.5,
    borderColor: '#1e293b',
  },
  folderGridPlaceholder: {
    width: '50%',
    height: '50%',
    backgroundColor: '#1e293b',
    borderWidth: 0.5,
    borderColor: '#0f172a',
  },
  emptyFolderIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
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
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 50,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
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
    width: '100%',
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
    zIndex: 50,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 28 : 18,
    backgroundColor: 'rgba(18, 18, 18, 0.75)',
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
  selectAllBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#1e293b',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  selectAllText: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: '600',
  },
  selectModeIconBtn: {
    padding: 4,
    marginLeft: 8,
  },
  gridItemSelected: {
    borderWidth: 2,
    borderColor: '#38bdf8',
  },
  checkboxOverlay: {
    position: 'absolute',
    top: 6,
    right: 6,
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 12,
  },
  checkboxOverlayActive: {
    backgroundColor: '#0f172a',
  },
  selectionActionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 60,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingTop: 14,
    backgroundColor: 'rgba(18, 18, 18, 0.92)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.12)',
  },
  selectionActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  selectionActionText: {
    color: '#38bdf8',
    fontSize: 14,
    fontWeight: '700',
  },
});
