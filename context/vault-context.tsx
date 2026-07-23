import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AppState, AppStateStatus, Platform, Alert } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import {
  VaultFolder,
  VaultFile,
  SecretNote,
  PasswordRecord,
  VaultMetadata,
  getSavedPinHash,
  setSavedPin,
  verifyPin,
  saveSecurityRecovery,
  getSecurityQuestion,
  verifySecurityAnswer,
  copyFileToVault,
  removeFileFromVault,
  loadVaultMetadata,
  saveVaultMetadata,
} from '../services/vault-storage';

interface VaultContextType {
  isUnlocked: boolean;
  hasPin: boolean;
  securityQuestion: string | null;
  folders: VaultFolder[];
  files: VaultFile[];
  notes: SecretNote[];
  passwords: PasswordRecord[];
  isLoading: boolean;

  // Authentication
  unlockVault: (pin: string) => Promise<boolean>;
  lockVault: () => void;
  setupPin: (pin: string, question?: string, answer?: string) => Promise<boolean>;
  resetPinWithSecurityAnswer: (answer: string, newPin: string) => Promise<boolean>;

  // Folders
  createFolder: (name: string, category: 'media' | 'docs', color?: string) => Promise<VaultFolder>;
  deleteFolder: (id: string, deleteContents?: boolean) => Promise<boolean>;
  renameFolder: (id: string, name: string) => Promise<boolean>;
  importFolderFromFileManager: (category: 'media' | 'docs', customFolderName?: string) => Promise<boolean>;

  // Media & Files
  addMediaFile: (uri: string, originalName: string, type: 'image' | 'video', mimeType?: string, folderId?: string) => Promise<boolean>;
  addMediaFilesBatch: (items: { uri: string; originalName: string; type: 'image' | 'video'; mimeType?: string }[], folderId?: string) => Promise<boolean>;
  addDocumentFile: (uri: string, originalName: string, mimeType?: string, folderId?: string) => Promise<boolean>;
  addDocumentFilesBatch: (items: { uri: string; originalName: string; mimeType?: string }[], folderId?: string) => Promise<boolean>;
  moveFileToFolder: (fileId: string, folderId?: string) => Promise<boolean>;
  deleteFile: (id: string) => Promise<boolean>;

  // Notes
  addNote: (title: string, content: string) => Promise<SecretNote>;
  updateNote: (id: string, title: string, content: string) => Promise<boolean>;
  deleteNote: (id: string) => Promise<boolean>;

  // Passwords
  addPassword: (item: Omit<PasswordRecord, 'id' | 'createdAt' | 'updatedAt'>) => Promise<PasswordRecord>;
  updatePassword: (id: string, item: Omit<PasswordRecord, 'id' | 'createdAt' | 'updatedAt'>) => Promise<boolean>;
  deletePassword: (id: string) => Promise<boolean>;
}

const VaultContext = createContext<VaultContextType | undefined>(undefined);

export const VaultProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isUnlocked, setIsUnlocked] = useState<boolean>(false);
  const [hasPin, setHasPin] = useState<boolean>(false);
  const [securityQuestion, setSecurityQuestion] = useState<string | null>(null);
  const [folders, setFolders] = useState<VaultFolder[]>([]);
  const [files, setFiles] = useState<VaultFile[]>([]);
  const [notes, setNotes] = useState<SecretNote[]>([]);
  const [passwords, setPasswords] = useState<PasswordRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Initialize and check if PIN exists
  useEffect(() => {
    async function init() {
      try {
        const pinHash = await getSavedPinHash();
        setHasPin(!!pinHash);

        const secQ = await getSecurityQuestion();
        setSecurityQuestion(secQ);

        const meta = await loadVaultMetadata();
        setFolders(meta.folders || []);
        setFiles(meta.files || []);
        setNotes(meta.notes || []);
        setPasswords(meta.passwords || []);
      } catch (err) {
        console.error('Error loading vault init state:', err);
      } finally {
        setIsLoading(false);
      }
    }
    init();
  }, []);

  // Listen to AppState to auto-lock vault when app goes to background
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        setIsUnlocked(false);
      }
    };
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, []);

  // Save metadata updates
  const persistState = async (
    newFolders = folders,
    newFiles = files,
    newNotes = notes,
    newPasswords = passwords
  ) => {
    const meta: VaultMetadata = {
      folders: newFolders,
      files: newFiles,
      notes: newNotes,
      passwords: newPasswords,
      securityQuestion: securityQuestion || undefined,
    };
    await saveVaultMetadata(meta);
  };

  const unlockVault = async (pin: string): Promise<boolean> => {
    const isValid = await verifyPin(pin);
    if (isValid) {
      setIsUnlocked(true);
      return true;
    }
    return false;
  };

  const lockVault = () => {
    setIsUnlocked(false);
  };

  const setupPin = async (pin: string, question?: string, answer?: string): Promise<boolean> => {
    const success = await setSavedPin(pin);
    if (success) {
      setHasPin(true);
      if (question && answer) {
        await saveSecurityRecovery(question, answer);
        setSecurityQuestion(question);
      }
      setIsUnlocked(true);
      return true;
    }
    return false;
  };

  const resetPinWithSecurityAnswer = async (answer: string, newPin: string): Promise<boolean> => {
    const isValid = await verifySecurityAnswer(answer);
    if (!isValid) return false;

    const success = await setSavedPin(newPin);
    if (success) {
      setHasPin(true);
      setIsUnlocked(true);
      return true;
    }
    return false;
  };

  // Folder Operations
  const createFolder = async (name: string, category: 'media' | 'docs', color?: string): Promise<VaultFolder> => {
    const newFolder: VaultFolder = {
      id: 'dir_' + Date.now().toString() + '_' + Math.random().toString(36).substring(2, 6),
      name: name.trim(),
      category,
      color: color || '#3b82f6',
      createdAt: Date.now(),
    };
    const updated = [newFolder, ...folders];
    setFolders(updated);
    await persistState(updated, files, notes, passwords);
    return newFolder;
  };

  const deleteFolder = async (id: string, deleteContents = false): Promise<boolean> => {
    let updatedFiles = files;
    if (deleteContents) {
      const filesToDelete = files.filter((f) => f.folderId === id);
      for (const f of filesToDelete) {
        await removeFileFromVault(f.uri);
      }
      updatedFiles = files.filter((f) => f.folderId !== id);
    } else {
      // Unassign folderId from files (move to root)
      updatedFiles = files.map((f) => (f.folderId === id ? { ...f, folderId: undefined } : f));
    }

    const updatedFolders = folders.filter((dir) => dir.id !== id);
    setFolders(updatedFolders);
    setFiles(updatedFiles);
    await persistState(updatedFolders, updatedFiles, notes, passwords);
    return true;
  };

  const renameFolder = async (id: string, name: string): Promise<boolean> => {
    const updatedFolders = folders.map((dir) =>
      dir.id === id ? { ...dir, name: name.trim() } : dir
    );
    setFolders(updatedFolders);
    await persistState(updatedFolders, files, notes, passwords);
    return true;
  };

  // Media Batch
  const addMediaFilesBatch = async (
    items: {
      uri: string;
      originalName: string;
      type: 'image' | 'video';
      mimeType?: string;
    }[],
    folderId?: string
  ): Promise<boolean> => {
    const newFiles: VaultFile[] = [];
    for (const item of items) {
      const created = await copyFileToVault(item.uri, 'media', item.originalName, item.type, item.mimeType);
      if (created) {
        if (folderId) {
          created.folderId = folderId;
        }
        newFiles.push(created);
      }
    }
    if (newFiles.length > 0) {
      let finalFiles: VaultFile[] = [];
      setFiles((prevFiles) => {
        finalFiles = [...newFiles, ...prevFiles];
        return finalFiles;
      });
      await persistState(folders, finalFiles, notes, passwords);
      return true;
    }
    return false;
  };

  const addMediaFile = async (
    uri: string,
    originalName: string,
    type: 'image' | 'video',
    mimeType?: string,
    folderId?: string
  ): Promise<boolean> => {
    return addMediaFilesBatch([{ uri, originalName, type, mimeType }], folderId);
  };

  // Documents Batch
  const addDocumentFilesBatch = async (
    items: {
      uri: string;
      originalName: string;
      mimeType?: string;
    }[],
    folderId?: string
  ): Promise<boolean> => {
    const newFiles: VaultFile[] = [];
    for (const item of items) {
      const created = await copyFileToVault(item.uri, 'docs', item.originalName, 'document', item.mimeType);
      if (created) {
        if (folderId) {
          created.folderId = folderId;
        }
        newFiles.push(created);
      }
    }
    if (newFiles.length > 0) {
      let finalFiles: VaultFile[] = [];
      setFiles((prevFiles) => {
        finalFiles = [...newFiles, ...prevFiles];
        return finalFiles;
      });
      await persistState(folders, finalFiles, notes, passwords);
      return true;
    }
    return false;
  };

  const addDocumentFile = async (
    uri: string,
    originalName: string,
    mimeType?: string,
    folderId?: string
  ): Promise<boolean> => {
    return addDocumentFilesBatch([{ uri, originalName, mimeType }], folderId);
  };

  const moveFileToFolder = async (fileId: string, folderId?: string): Promise<boolean> => {
    const updatedFiles = files.map((f) => (f.id === fileId ? { ...f, folderId } : f));
    setFiles(updatedFiles);
    await persistState(folders, updatedFiles, notes, passwords);
    return true;
  };

  const deleteFile = async (id: string): Promise<boolean> => {
    const fileToDelete = files.find((f) => f.id === id);
    if (fileToDelete) {
      await removeFileFromVault(fileToDelete.uri);
    }
    const updated = files.filter((f) => f.id !== id);
    setFiles(updated);
    await persistState(folders, updated, notes, passwords);
    return true;
  };

  // Notes
  const addNote = async (title: string, content: string): Promise<SecretNote> => {
    const newNote: SecretNote = {
      id: Date.now().toString(),
      title,
      content,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    const updated = [newNote, ...notes];
    setNotes(updated);
    await persistState(folders, files, updated, passwords);
    return newNote;
  };

  const updateNote = async (id: string, title: string, content: string): Promise<boolean> => {
    const updated = notes.map((n) =>
      n.id === id ? { ...n, title, content, updatedAt: Date.now() } : n
    );
    setNotes(updated);
    await persistState(folders, files, updated, passwords);
    return true;
  };

  const deleteNote = async (id: string): Promise<boolean> => {
    const updated = notes.filter((n) => n.id !== id);
    setNotes(updated);
    await persistState(folders, files, updated, passwords);
    return true;
  };

  // Passwords
  const addPassword = async (
    item: Omit<PasswordRecord, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<PasswordRecord> => {
    const newRecord: PasswordRecord = {
      ...item,
      id: Date.now().toString(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    const updated = [newRecord, ...passwords];
    setPasswords(updated);
    await persistState(folders, files, notes, updated);
    return newRecord;
  };

  const updatePassword = async (
    id: string,
    item: Omit<PasswordRecord, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<boolean> => {
    const updated = passwords.map((p) =>
      p.id === id ? { ...p, ...item, updatedAt: Date.now() } : p
    );
    setPasswords(updated);
    await persistState(folders, files, notes, updated);
    return true;
  };

  const deletePassword = async (id: string): Promise<boolean> => {
    const updated = passwords.filter((p) => p.id !== id);
    setPasswords(updated);
    await persistState(folders, files, notes, updated);
    return true;
  };

  const importFolderFromFileManager = async (
    category: 'media' | 'docs',
    customFolderName?: string
  ): Promise<boolean> => {
    try {
      if (Platform.OS === 'android' && FileSystem.StorageAccessFramework) {
        const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
        if (permissions.granted) {
          const dirUri = permissions.directoryUri;
          const decodedUri = decodeURIComponent(dirUri);
          const segments = decodedUri.split(/[:\/]/).filter(Boolean);
          const detectedName = customFolderName?.trim() || segments[segments.length - 1] || 'Imported Folder';

          const fileUris = await FileSystem.StorageAccessFramework.readDirectoryAsync(dirUri);
          if (fileUris && fileUris.length > 0) {
            const newFolder = await createFolder(detectedName, category);
            if (category === 'media') {
              const items = fileUris.map((uri) => {
                const decoded = decodeURIComponent(uri);
                const name = decoded.split('/').pop() || 'media_file';
                const isVideo = /\.(mp4|mov|m4v|mkv|avi|webm)$/i.test(name);
                return {
                  uri,
                  originalName: name,
                  type: isVideo ? ('video' as const) : ('image' as const),
                };
              });
              await addMediaFilesBatch(items, newFolder.id);
            } else {
              const items = fileUris.map((uri) => {
                const decoded = decodeURIComponent(uri);
                const name = decoded.split('/').pop() || 'document_file';
                return {
                  uri,
                  originalName: name,
                };
              });
              await addDocumentFilesBatch(items, newFolder.id);
            }
            return true;
          }
        }
      }

      // Fallback / iOS document picker multiple selection
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
        multiple: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const folderName = customFolderName?.trim() || 'Imported Folder';
        const newFolder = await createFolder(folderName, category);

        if (category === 'media') {
          const items = result.assets.map((file) => {
            const isVideo =
              file.mimeType?.startsWith('video/') ||
              /\.(mp4|mov|m4v|mkv|avi|webm)$/i.test(file.name);
            return {
              uri: file.uri,
              originalName: file.name,
              type: isVideo ? ('video' as const) : ('image' as const),
              mimeType: file.mimeType,
            };
          });
          await addMediaFilesBatch(items, newFolder.id);
        } else {
          const items = result.assets.map((file) => ({
            uri: file.uri,
            originalName: file.name,
            mimeType: file.mimeType,
          }));
          await addDocumentFilesBatch(items, newFolder.id);
        }
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error importing folder from file manager:', err);
      Alert.alert('Import Failed', 'Could not import folder from file manager.');
      return false;
    }
  };

  return (
    <VaultContext.Provider
      value={{
        isUnlocked,
        hasPin,
        securityQuestion,
        folders,
        files,
        notes,
        passwords,
        isLoading,
        unlockVault,
        lockVault,
        setupPin,
        resetPinWithSecurityAnswer,
        createFolder,
        deleteFolder,
        renameFolder,
        addMediaFile,
        addMediaFilesBatch,
        addDocumentFile,
        addDocumentFilesBatch,
        moveFileToFolder,
        deleteFile,
        addNote,
        updateNote,
        deleteNote,
        addPassword,
        updatePassword,
        deletePassword,
        importFolderFromFileManager,
      }}
    >
      {children}
    </VaultContext.Provider>
  );
};

export const useVault = () => {
  const context = useContext(VaultContext);
  if (!context) {
    throw new Error('useVault must be used within a VaultProvider');
  }
  return context;
};
