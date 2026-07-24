import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import JSZip from 'jszip';
import CryptoJS from 'crypto-js';

import {
  VaultMetadata,
  VaultFile,
  VaultFolder,
  SecretNote,
  PasswordRecord,
  loadVaultMetadata,
  saveVaultMetadata,
  removeFileFromVault,
  MEDIA_DIR,
  DOCS_DIR,
  initVaultDirectories,
} from './vault-storage';

export interface ImportStats {
  files: number;
  notes: number;
  passwords: number;
  folders: number;
}

/**
 * Export all vault data into a password-protected AES-256 encrypted file (.vault)
 */
export async function exportEncryptedVault(
  password: string,
  target: 'share' | 'local' = 'share',
  onProgress?: (msg: string, percent?: number) => void
): Promise<boolean> {
  if (!password || password.trim().length === 0) {
    throw new Error('Backup password cannot be empty');
  }

  onProgress?.('Reading vault metadata...', 5);
  const metadata = await loadVaultMetadata();

  const zip = new JSZip();

  // 1. Add metadata JSON
  zip.file('metadata.json', JSON.stringify(metadata, null, 2));

  // 2. Add media & doc files to zip using STORE compression to eliminate CPU bottleneck
  const totalFiles = metadata.files.length;
  let processed = 0;

  for (const file of metadata.files) {
    processed++;
    const filePercent = Math.round(5 + (processed / Math.max(1, totalFiles)) * 55);
    onProgress?.(`Packing file ${processed}/${totalFiles}: ${file.name}`, filePercent);

    // Yield JS thread so React UI renders progress updates
    await new Promise((r) => setTimeout(r, 10));

    try {
      const fileInfo = await FileSystem.getInfoAsync(file.uri);
      if (fileInfo.exists) {
        const fileBase64 = await FileSystem.readAsStringAsync(file.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        zip.file(`data/${file.id}`, fileBase64, { base64: true, compression: 'STORE' });
      }
    } catch (err) {
      console.warn(`Failed to read file ${file.name} for backup:`, err);
    }
  }

  // 3. Generate raw zip base64 with STORE compression and percentage reporting
  onProgress?.('Creating zip archive...', 62);
  const zipBase64 = await zip.generateAsync(
    { type: 'base64', compression: 'STORE' },
    (zipMeta) => {
      const zipPercent = Math.round(62 + (zipMeta.percent * 0.20));
      onProgress?.(`Creating zip archive (${Math.round(zipMeta.percent)}%)...`, zipPercent);
    }
  );

  // 4. Encrypt zip string using AES-256 with password
  onProgress?.('Encrypting archive with AES-256...', 85);
  await new Promise((r) => setTimeout(r, 10));
  const encryptedPayload = CryptoJS.AES.encrypt(zipBase64, password.trim()).toString();

  const timeStamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const backupFileName = `Vault_Backup_${timeStamp}.vault`;

  // 5. Handle Save Target
  onProgress?.('Writing backup to storage...', 95);

  if (target === 'local') {
    if (Platform.OS === 'android' && FileSystem.StorageAccessFramework) {
      onProgress?.('Select folder to save backup...', 96);
      const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
      if (!permissions.granted) {
        throw new Error('Storage folder permission was not granted.');
      }
      onProgress?.('Writing backup to local storage...', 98);
      const newFileUri = await FileSystem.StorageAccessFramework.createFileAsync(
        permissions.directoryUri,
        backupFileName,
        'application/octet-stream'
      );
      await FileSystem.StorageAccessFramework.writeAsStringAsync(newFileUri, encryptedPayload);
      onProgress?.('Backup complete!', 100);
      return true;
    } else {
      const localBackupDir = `${FileSystem.documentDirectory}Backups/`;
      const dirInfo = await FileSystem.getInfoAsync(localBackupDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(localBackupDir, { intermediates: true });
      }
      const localPath = `${localBackupDir}${backupFileName}`;
      await FileSystem.writeAsStringAsync(localPath, encryptedPayload);

      if (await Sharing.isAvailableAsync()) {
        onProgress?.('Opening Save to Files menu...', 98);
        await Sharing.shareAsync(localPath, {
          mimeType: 'application/octet-stream',
          dialogTitle: 'Save Encrypted Vault Backup',
          UTI: 'public.data',
        });
      }
      onProgress?.('Backup complete!', 100);
      return true;
    }
  } else {
    const backupFilePath = `${FileSystem.cacheDirectory}${backupFileName}`;
    onProgress?.('Saving backup file...', 96);
    await FileSystem.writeAsStringAsync(backupFilePath, encryptedPayload);

    if (await Sharing.isAvailableAsync()) {
      onProgress?.('Opening share dialog...', 98);
      await Sharing.shareAsync(backupFilePath, {
        mimeType: 'application/octet-stream',
        dialogTitle: 'Save Encrypted Vault Backup',
        UTI: 'public.data',
      });
    }
    onProgress?.('Backup complete!', 100);
    return true;
  }
}

/**
 * Decrypt and import vault contents from an encrypted (.vault) file.
 */
export async function importEncryptedVault(
  password: string,
  fileUri: string,
  mode: 'merge' | 'overwrite',
  onProgress?: (msg: string, percent?: number) => void
): Promise<{ success: boolean; stats: ImportStats }> {
  if (!password || password.trim().length === 0) {
    throw new Error('Password is required');
  }

  await initVaultDirectories();

  // 1. Read encrypted file content safely
  onProgress?.('Reading backup file...', 10);
  let encryptedContent = '';
  try {
    const tempReadPath = FileSystem.cacheDirectory + 'temp_read_import.vault';
    await FileSystem.copyAsync({ from: fileUri, to: tempReadPath });
    encryptedContent = await FileSystem.readAsStringAsync(tempReadPath);
  } catch {
    try {
      encryptedContent = await FileSystem.readAsStringAsync(fileUri);
    } catch {
      throw new Error('Could not read backup file from device');
    }
  }

  // 2. Decrypt with AES-256
  onProgress?.('Decrypting backup with password...', 25);
  await new Promise((r) => setTimeout(r, 10));
  let decryptedZipBase64 = '';
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedContent.trim(), password.trim());
    decryptedZipBase64 = bytes.toString(CryptoJS.enc.Utf8);
  } catch {
    throw new Error('Incorrect password or invalid backup file');
  }

  if (!decryptedZipBase64 || decryptedZipBase64.length === 0) {
    throw new Error('Incorrect password or corrupted backup file');
  }

  // 3. Load ZIP archive
  onProgress?.('Extracting archive contents...', 45);
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(decryptedZipBase64, { base64: true });
  } catch {
    throw new Error('Failed to unpack archive. File might be corrupted.');
  }

  // 4. Extract metadata.json
  const metaFile = zip.file('metadata.json');
  if (!metaFile) {
    throw new Error('Invalid vault backup: metadata.json missing');
  }

  const metaContent = await metaFile.async('string');
  const backupMeta: VaultMetadata = JSON.parse(metaContent);

  const currentMeta = await loadVaultMetadata();

  if (mode === 'overwrite') {
    onProgress?.('Cleaning up existing vault storage...', 50);
    for (const f of currentMeta.files) {
      await removeFileFromVault(f.uri);
    }
  }

  // 5. Restore files to disk
  const restoredFiles: VaultFile[] = [];
  const backupFiles = backupMeta.files || [];

  let fileIndex = 0;
  for (const fileItem of backupFiles) {
    fileIndex++;
    const restorePercent = Math.round(50 + (fileIndex / Math.max(1, backupFiles.length)) * 40);
    onProgress?.(`Restoring file ${fileIndex}/${backupFiles.length}: ${fileItem.name}`, restorePercent);

    await new Promise((r) => setTimeout(r, 10));

    const zipEntry = zip.file(`data/${fileItem.id}`);
    if (zipEntry) {
      const fileBase64 = await zipEntry.async('base64');

      const isDoc = fileItem.type === 'document';
      const targetDir = isDoc ? DOCS_DIR : MEDIA_DIR;
      const sanitizedName = fileItem.name.replace(/[^a-zA-Z0-9_.-]/g, '_');
      const targetPath = `${targetDir}${fileItem.id}_${sanitizedName}`;

      await FileSystem.writeAsStringAsync(targetPath, fileBase64, {
        encoding: FileSystem.EncodingType.Base64,
      });

      restoredFiles.push({
        ...fileItem,
        uri: targetPath,
      });
    }
  }

  // 6. Merge or Overwrite Metadata
  onProgress?.('Updating vault catalog...', 95);
  let finalFolders: VaultFolder[] = [];
  let finalFiles: VaultFile[] = [];
  let finalNotes: SecretNote[] = [];
  let finalPasswords: PasswordRecord[] = [];

  if (mode === 'overwrite') {
    finalFolders = backupMeta.folders || [];
    finalFiles = restoredFiles;
    finalNotes = backupMeta.notes || [];
    finalPasswords = backupMeta.passwords || [];
  } else {
    const existingFolderIds = new Set(currentMeta.folders.map((f) => f.id));
    const newFolders = (backupMeta.folders || []).filter((f) => !existingFolderIds.has(f.id));
    finalFolders = [...currentMeta.folders, ...newFolders];

    const existingFileIds = new Set(currentMeta.files.map((f) => f.id));
    const newFiles = restoredFiles.filter((f) => !existingFileIds.has(f.id));
    finalFiles = [...currentMeta.files, ...newFiles];

    const existingNoteIds = new Set(currentMeta.notes.map((n) => n.id));
    const newNotes = (backupMeta.notes || []).filter((n) => !existingNoteIds.has(n.id));
    finalNotes = [...currentMeta.notes, ...newNotes];

    const existingPasswordIds = new Set(currentMeta.passwords.map((p) => p.id));
    const newPasswords = (backupMeta.passwords || []).filter((p) => !existingPasswordIds.has(p.id));
    finalPasswords = [...currentMeta.passwords, ...newPasswords];
  }

  const updatedMetadata: VaultMetadata = {
    folders: finalFolders,
    files: finalFiles,
    notes: finalNotes,
    passwords: finalPasswords,
  };

  await saveVaultMetadata(updatedMetadata);
  onProgress?.('Restoration complete!', 100);

  return {
    success: true,
    stats: {
      files: restoredFiles.length,
      notes: backupMeta.notes ? backupMeta.notes.length : 0,
      passwords: backupMeta.passwords ? backupMeta.passwords.length : 0,
      folders: backupMeta.folders ? backupMeta.folders.length : 0,
    },
  };
}
