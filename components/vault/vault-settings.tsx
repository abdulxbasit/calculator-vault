import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useVault } from '../../context/vault-context';

export const VaultSettings: React.FC = () => {
  const {
    securityQuestion,
    setupPin,
    lockVault,
    files,
    notes,
    passwords,
  } = useVault();

  const [newPin, setNewPin] = useState('');
  const [question, setQuestion] = useState(securityQuestion || 'What is your pet name?');
  const [answer, setAnswer] = useState('');

  const photosCount = files.filter((f) => f.type === 'image').length;
  const videosCount = files.filter((f) => f.type === 'video').length;
  const docsCount = files.filter((f) => f.type === 'document').length;

  const handleChangePin = async () => {
    if (newPin.length < 4 || newPin.length > 8) {
      Alert.alert('Invalid PIN', 'New PIN must be between 4 and 8 digits.');
      return;
    }
    if (!answer.trim()) {
      Alert.alert('Security Recovery', 'Please fill out the security answer.');
      return;
    }

    const success = await setupPin(newPin, question, answer);
    if (success) {
      Alert.alert('PIN Updated', 'Your secret vault PIN has been successfully updated.');
      setNewPin('');
      setAnswer('');
    } else {
      Alert.alert('Error', 'Failed to update PIN.');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Vault Statistics</Text>
      </View>

      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Ionicons name="images" size={24} color="#38bdf8" />
          <Text style={styles.statNumber}>{photosCount}</Text>
          <Text style={styles.statLabel}>Photos</Text>
        </View>

        <View style={styles.statCard}>
          <Ionicons name="videocam" size={24} color="#a855f7" />
          <Text style={styles.statNumber}>{videosCount}</Text>
          <Text style={styles.statLabel}>Videos</Text>
        </View>

        <View style={styles.statCard}>
          <Ionicons name="document-text" size={24} color="#facc15" />
          <Text style={styles.statNumber}>{docsCount}</Text>
          <Text style={styles.statLabel}>Documents</Text>
        </View>

        <View style={styles.statCard}>
          <Ionicons name="journal" size={24} color="#4ade80" />
          <Text style={styles.statNumber}>{notes.length}</Text>
          <Text style={styles.statLabel}>Notes</Text>
        </View>

        <View style={styles.statCard}>
          <Ionicons name="key" size={24} color="#fb923c" />
          <Text style={styles.statNumber}>{passwords.length}</Text>
          <Text style={styles.statLabel}>Logins</Text>
        </View>
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
          <Ionicons name="lock-closed" size={20} color="#4ade80" />
          <Text style={styles.infoText}>
            <Text style={{ fontWeight: 'bold', color: '#f8fafc' }}>Auto-Lock on Background: </Text>
            Whenever you switch apps, home screen, or lock phone, the secret vault instantly locks.
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="eye-off" size={20} color="#38bdf8" />
          <Text style={styles.infoText}>
            <Text style={{ fontWeight: 'bold', color: '#f8fafc' }}>Calculator Stealth Mode: </Text>
            The front interface acts as a genuine math calculator to protect your privacy.
          </Text>
        </View>
      </View>

      <TouchableOpacity style={styles.lockOutBtn} onPress={lockVault}>
        <Ionicons name="log-out-outline" size={20} color="#ffffff" />
        <Text style={styles.lockOutBtnText}>Lock Secret Vault Now</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#cbd5e1',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  statNumber: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#f8fafc',
    marginVertical: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#94a3b8',
  },
  divider: {
    height: 1,
    backgroundColor: '#1e293b',
    marginVertical: 16,
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#cbd5e1',
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    backgroundColor: '#0f172a',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#f8fafc',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  saveBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  saveBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  infoBox: {
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 16,
    gap: 14,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  infoText: {
    flex: 1,
    color: '#94a3b8',
    fontSize: 13,
    lineHeight: 18,
  },
  lockOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#dc2626',
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 8,
  },
  lockOutBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 15,
  },
});
