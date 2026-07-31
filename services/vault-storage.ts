import * as Crypto from 'expo-crypto';
import * as FileSystem from 'expo-file-system/legacy';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
export interface VaultFolder {
  id: string;
  name: string;
  category: 'media' | 'docs';
  color?: string;
  createdAt: number;
}

export interface VaultFile {
  id: string;
  name: string;
  uri: string;
  type: 'image' | 'video' | 'document';
  folderId?: string;
  mimeType?: string;
  size?: number;
  createdAt: number;
}

export interface SecretNote {
  id: string;
  title: string;
  content: string;
  color?: string;
  isPinned?: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface PasswordRecord {
  id: string;
  title: string;
  username: string;
  password: string;
  website?: string;
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

export interface VaultMetadata {
  folders: VaultFolder[];
  files: VaultFile[];
  notes: SecretNote[];
  passwords: PasswordRecord[];
  securityQuestion?: string;
  allowScreenCapture?: boolean;
  allowFlipToLock?: boolean;
}

export const VAULT_DIR = (FileSystem.documentDirectory || '') + 'vault/';
export const MEDIA_DIR = VAULT_DIR + 'media/';
export const DOCS_DIR = VAULT_DIR + 'docs/';
export const METADATA_FILE = VAULT_DIR + 'metadata.json';

const PIN_HASH_KEY = 'vault_pin_hash_v1';
const SECURITY_Q_KEY = 'vault_sec_q_v1';
const SECURITY_A_HASH_KEY = 'vault_sec_a_hash_v1';

// Hashing helper
export async function hashString(input: string): Promise<string> {
  const hash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    input.trim().toLowerCase()
  );
  return hash;
}

// Directory initialization
export async function initVaultDirectories(): Promise<void> {
  try {
    const vaultInfo = await FileSystem.getInfoAsync(VAULT_DIR);
    if (!vaultInfo.exists) {
      await FileSystem.makeDirectoryAsync(VAULT_DIR, { intermediates: true });
    }
    const mediaInfo = await FileSystem.getInfoAsync(MEDIA_DIR);
    if (!mediaInfo.exists) {
      await FileSystem.makeDirectoryAsync(MEDIA_DIR, { intermediates: true });
    }
    const docsInfo = await FileSystem.getInfoAsync(DOCS_DIR);
    if (!docsInfo.exists) {
      await FileSystem.makeDirectoryAsync(DOCS_DIR, { intermediates: true });
    }
  } catch (err) {
    console.error('Error initializing vault directories:', err);
  }
}

// PIN operations
export async function getSavedPinHash(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(PIN_HASH_KEY);
  } catch (e) {
    console.error('Failed to get pin hash:', e);
    return null;
  }
}

export async function setSavedPin(pin: string): Promise<boolean> {
  try {
    const hash = await hashString(pin);
    await SecureStore.setItemAsync(PIN_HASH_KEY, hash);
    return true;
  } catch (e) {
    console.error('Failed to set pin:', e);
    return false;
  }
}

export async function verifyPin(pin: string): Promise<boolean> {
  const savedHash = await getSavedPinHash();
  if (!savedHash) return false;
  const inputHash = await hashString(pin);
  return savedHash === inputHash;
}

// Security Question operations
export async function saveSecurityRecovery(question: string, answer: string): Promise<void> {
  try {
    const aHash = await hashString(answer);
    await SecureStore.setItemAsync(SECURITY_Q_KEY, question);
    await SecureStore.setItemAsync(SECURITY_A_HASH_KEY, aHash);
  } catch (e) {
    console.error('Failed to save security recovery:', e);
  }
}

export async function getSecurityQuestion(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(SECURITY_Q_KEY);
  } catch {
    return null;
  }
}

export async function verifySecurityAnswer(answer: string): Promise<boolean> {
  try {
    const savedAHash = await SecureStore.getItemAsync(SECURITY_A_HASH_KEY);
    if (!savedAHash) return false;
    const inputHash = await hashString(answer);
    return savedAHash === inputHash;
  } catch {
    return false;
  }
}

// File Copy & Storage
export async function copyFileToVault(
  sourceUri: string,
  category: 'media' | 'docs',
  originalName: string,
  fileType: 'image' | 'video' | 'document',
  mimeType?: string,
  deleteSource: boolean = true
): Promise<VaultFile | null> {
  await initVaultDirectories();
  const fileId = Date.now().toString() + '_' + Math.random().toString(36).substring(2, 8);
  const targetDir = category === 'media' ? MEDIA_DIR : DOCS_DIR;

  // Extract extension
  const extMatch = originalName.match(/\.[0-9a-z]+$/i);
  const ext = extMatch ? extMatch[0] : '';
  const sanitizedName = originalName.replace(/[^a-zA-Z0-9_.-]/g, '_');
  const destinationPath = `${targetDir}${fileId}_${sanitizedName}${ext ? '' : ''}`;

  try {
    await FileSystem.copyAsync({
      from: sourceUri,
      to: destinationPath,
    });

    const fileInfo = await FileSystem.getInfoAsync(destinationPath);
    const size = fileInfo.exists && 'size' in fileInfo ? fileInfo.size : undefined;

    // By default, delete file from source after moving it to vault
    if (deleteSource && sourceUri) {
      try {
        if (Platform.OS === 'android' && sourceUri.startsWith('content://')) {
          if (FileSystem.StorageAccessFramework) {
            await FileSystem.StorageAccessFramework.deleteAsync(sourceUri).catch(() => { });
          }
        } else {
          await FileSystem.deleteAsync(sourceUri, { idempotent: true }).catch(() => { });
        }
      } catch (delErr) {
        console.warn('Could not delete source file after moving:', sourceUri, delErr);
      }
    }

    return {
      id: fileId,
      name: originalName,
      uri: destinationPath,
      type: fileType,
      mimeType,
      size,
      createdAt: Date.now(),
    };
  } catch (err) {
    console.error('Failed to copy file into vault:', err);
    return null;
  }
}

export async function removeFileFromVault(fileUri: string): Promise<boolean> {
  try {
    const fileInfo = await FileSystem.getInfoAsync(fileUri);
    if (fileInfo.exists) {
      await FileSystem.deleteAsync(fileUri, { idempotent: true });
    }
    return true;
  } catch (err) {
    console.error('Failed to delete file from vault:', err);
    return false;
  }
}

// Metadata JSON Persistence
export async function loadVaultMetadata(): Promise<VaultMetadata> {
  await initVaultDirectories();
  try {
    const info = await FileSystem.getInfoAsync(METADATA_FILE);
    if (info.exists) {
      const content = await FileSystem.readAsStringAsync(METADATA_FILE);
      const data = JSON.parse(content);
      return {
        folders: data.folders || [],
        files: data.files || [],
        notes: data.notes || [],
        passwords: data.passwords || [],
        securityQuestion: data.securityQuestion,
        allowScreenCapture: data.allowScreenCapture,
        allowFlipToLock: data.allowFlipToLock ?? data.allowShakeToLock,
      };
    }
  } catch (err) {
    console.error('Failed to load vault metadata:', err);
  }
  return { folders: [], files: [], notes: [], passwords: [] };
}

export async function saveVaultMetadata(metadata: VaultMetadata): Promise<boolean> {
  await initVaultDirectories();
  try {
    await FileSystem.writeAsStringAsync(METADATA_FILE, JSON.stringify(metadata, null, 2));
    return true;
  } catch (err) {
    console.error('Failed to save vault metadata:', err);
    return false;
  }
}
