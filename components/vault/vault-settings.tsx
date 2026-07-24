import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAlert } from '../../context/alert-context';
import { useVault } from '../../context/vault-context';
import { BackupModal } from './backup-modal';

export const VaultSettings: React.FC = () => {
  const { showAlert } = useAlert();
  const {
    securityQuestion,
    setupPin,
    files,
    notes,
  } = useVault();

  const [newPin, setNewPin] = useState('');
  const [question, setQuestion] = useState(securityQuestion || 'What is your pet name?');
  const [answer, setAnswer] = useState('');
  const [showBackupModal, setShowBackupModal] = useState(false);

  const photosCount = files.filter((f) => f.type === 'image').length;
  const videosCount = files.filter((f) => f.type === 'video').length;
  const docsCount = files.filter((f) => f.type === 'document').length;

  const handleChangePin = async () => {
    if (newPin.length < 4 || newPin.length > 8) {
      showAlert('Invalid PIN', 'New PIN must be between 4 and 8 digits.');
      return;
    }
    if (!answer.trim()) {
      showAlert('Security Recovery', 'Please fill out the security answer.');
      return;
    }

    const success = await setupPin(newPin, question, answer);
    if (success) {
      showAlert('PIN Updated', 'Your secret vault PIN has been successfully updated.');
      setNewPin('');
      setAnswer('');
    } else {
      showAlert('Error', 'Failed to update PIN.');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* App Info Header */}
      <View style={styles.appInfoCard}>
        <Image
          source={require('../../assets/images/icon.png')}
          style={styles.appLogoImage}
          resizeMode="cover"
        />
        <View style={{ flex: 1 }}>
          <Text style={styles.appName}>Vault Calculator</Text>
          <Text style={styles.appVersion}>Encrypted & Sandboxed Storage v1.0</Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Vault Statistics</Text>
      </View>

      {/* Compact 4-Card Stats Grid */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Ionicons name="images" size={18} color="#38bdf8" />
          <Text style={styles.statNumber}>{photosCount}</Text>
          <Text style={styles.statLabel}>Photos</Text>
        </View>

        <View style={styles.statCard}>
          <Ionicons name="videocam" size={18} color="#a855f7" />
          <Text style={styles.statNumber}>{videosCount}</Text>
          <Text style={styles.statLabel}>Videos</Text>
        </View>

        <View style={styles.statCard}>
          <Ionicons name="document-text" size={18} color="#facc15" />
          <Text style={styles.statNumber}>{docsCount}</Text>
          <Text style={styles.statLabel}>Docs</Text>
        </View>

        <View style={styles.statCard}>
          <Ionicons name="journal" size={18} color="#4ade80" />
          <Text style={styles.statNumber}>{notes.length}</Text>
          <Text style={styles.statLabel}>Notes</Text>
        </View>
      </View>
      <View style={styles.divider} />

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Backup & Data Protection</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.backupSub}>
          Export or import your entire vault (photos, videos, documents, secret notes, and passwords) protected with an AES-256 password.
        </Text>

        <TouchableOpacity
          style={styles.backupActionBtn}
          onPress={() => setShowBackupModal(true)}
        >
          <View style={styles.backupActionIcon}>
            <Ionicons name="shield-half-outline" size={22} color="#38bdf8" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.backupActionTitle}>Password-Protected Backup</Text>
            <Text style={styles.backupActionSub}>Export or import encrypted (.vault) bundle</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#a1a1aa" />
        </TouchableOpacity>
      </View>

      <View style={styles.divider} />

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Security & Passcode</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>New Secret PIN (4-8 digits)</Text>
        <TextInput
          style={styles.input}
          placeholder="New PIN"
          placeholderTextColor="#64748b"
          keyboardType="number-pad"
          secureTextEntry
          value={newPin}
          onChangeText={setNewPin}
        />

        <Text style={styles.label}>Security Recovery Question</Text>
        <TextInput
          style={styles.input}
          placeholder="Security Question"
          placeholderTextColor="#64748b"
          value={question}
          onChangeText={setQuestion}
        />

        <Text style={styles.label}>Recovery Answer</Text>
        <TextInput
          style={styles.input}
          placeholder="Answer"
          placeholderTextColor="#64748b"
          value={answer}
          onChangeText={setAnswer}
        />

        <TouchableOpacity style={styles.saveBtn} onPress={handleChangePin}>
          <Text style={styles.saveBtnText}>Update PIN & Security</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.divider} />

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Stealth & Auto-Lock Features</Text>
      </View>

      <View style={styles.infoBox}>
        <View style={styles.infoRow}>
          <Ionicons name="lock-closed" size={18} color="#4ade80" />
          <Text style={styles.infoText}>
            <Text style={{ fontWeight: 'bold', color: '#f8fafc' }}>Auto-Lock on Background: </Text>
            Whenever you switch apps, home screen, or lock phone, the secret vault instantly locks.
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="eye-off" size={18} color="#38bdf8" />
          <Text style={styles.infoText}>
            <Text style={{ fontWeight: 'bold', color: '#f8fafc' }}>Calculator Stealth Mode: </Text>
            The front interface acts as a genuine math calculator to protect your privacy.
          </Text>
        </View>
      </View>

      <BackupModal
        visible={showBackupModal}
        onClose={() => setShowBackupModal(false)}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#161616',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  appInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#262626',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#383838',
  },
  appLogoImage: {
    width: 44,
    height: 44,
    borderRadius: 10,
  },
  appName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  appVersion: {
    fontSize: 12,
    color: '#A1A1AA',
    marginTop: 2,
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#262626',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 4,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#383838',
  },
  statNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginVertical: 2,
  },
  statLabel: {
    fontSize: 11,
    color: '#A1A1AA',
  },
  divider: {
    height: 1,
    backgroundColor: '#282828',
    marginVertical: 16,
  },
  card: {
    backgroundColor: '#262626',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#383838',
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#A1A1AA',
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    backgroundColor: '#181818',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#FFFFFF',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#383838',
  },
  saveBtn: {
    backgroundColor: '#2563EB',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  infoBox: {
    backgroundColor: '#262626',
    borderRadius: 14,
    padding: 16,
    gap: 14,
    borderWidth: 1,
    borderColor: '#383838',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  infoText: {
    flex: 1,
    color: '#A1A1AA',
    fontSize: 13,
    lineHeight: 18,
  },
  backupSub: {
    fontSize: 12,
    color: '#a1a1aa',
    lineHeight: 17,
    marginBottom: 12,
  },
  backupActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#181818',
    borderRadius: 10,
    padding: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: '#383838',
  },
  backupActionIcon: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: '#0c4a6e33',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backupActionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  backupActionSub: {
    fontSize: 11,
    color: '#a1a1aa',
    marginTop: 2,
  },
});
