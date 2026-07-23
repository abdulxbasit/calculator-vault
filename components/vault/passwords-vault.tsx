import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  FlatList,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useVault } from '../../context/vault-context';
import { PasswordRecord } from '../../services/vault-storage';

export const PasswordsVault: React.FC = () => {
  const { passwords, addPassword, updatePassword, deletePassword } = useVault();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<PasswordRecord | null>(null);
  const [visiblePasswords, setVisiblePasswords] = useState<{ [id: string]: boolean }>({});

  const [title, setTitle] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [website, setWebsite] = useState('');
  const [notes, setNotes] = useState('');

  const openNewModal = () => {
    setEditingItem(null);
    setTitle('');
    setUsername('');
    setPassword('');
    setWebsite('');
    setNotes('');
    setModalVisible(true);
  };

  const openEditModal = (item: PasswordRecord) => {
    setEditingItem(item);
    setTitle(item.title);
    setUsername(item.username);
    setPassword(item.password);
    setWebsite(item.website || '');
    setNotes(item.notes || '');
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!title.trim() || !password.trim()) {
      Alert.alert('Validation Error', 'Title and password are required.');
      return;
    }

    if (editingItem) {
      await updatePassword(editingItem.id, { title, username, password, website, notes });
    } else {
      await addPassword({ title, username, password, website, notes });
    }

    setModalVisible(false);
  };

  const handleDelete = (item: PasswordRecord) => {
    Alert.alert('Delete Record', `Are you sure you want to delete "${item.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deletePassword(item.id);
          setModalVisible(false);
        },
      },
    ]);
  };

  const toggleVisibility = (id: string) => {
    setVisiblePasswords((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const renderItem = ({ item }: { item: PasswordRecord }) => {
    const isPassVisible = !!visiblePasswords[item.id];

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.badgeIcon}>
            <Ionicons name="key" size={20} color="#38bdf8" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            {item.username ? (
              <Text style={styles.cardUsername}>{item.username}</Text>
            ) : null}
          </View>
          <TouchableOpacity onPress={() => openEditModal(item)} style={styles.editBtn}>
            <Ionicons name="create-outline" size={20} color="#94a3b8" />
          </TouchableOpacity>
        </View>

        <View style={styles.passwordRow}>
          <Text style={styles.passwordText}>
            {isPassVisible ? item.password : '••••••••••••'}
          </Text>
          <TouchableOpacity
            style={styles.eyeBtn}
            onPress={() => toggleVisibility(item.id)}
          >
            <Ionicons
              name={isPassVisible ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color="#94a3b8"
            />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.sectionTitle}>Password Keeper</Text>
          <Text style={styles.subtitle}>{passwords.length} login(s) saved</Text>
        </View>

        <TouchableOpacity style={styles.importBtn} onPress={openNewModal}>
          <Ionicons name="add" size={20} color="#ffffff" />
          <Text style={styles.importBtnText}>Add Login</Text>
        </TouchableOpacity>
      </View>

      {passwords.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconCircle}>
            <Ionicons name="key-outline" size={48} color="#64748b" />
          </View>
          <Text style={styles.emptyTitle}>No Passwords Saved</Text>
          <Text style={styles.emptySubtitle}>
            Safely store bank credentials, website logins, and secret keys.
          </Text>
          <TouchableOpacity style={styles.emptyBtn} onPress={openNewModal}>
            <Text style={styles.emptyBtnText}>Add Password</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={passwords}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContainer}
        />
      )}

      {/* Editor Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalHeaderTitle}>
                {editingItem ? 'Edit Credential' : 'Add Credential'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Title / Account Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Gmail, Bank Account, Netflix"
                placeholderTextColor="#64748b"
                value={title}
                onChangeText={setTitle}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Username / Email</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. john@example.com"
                placeholderTextColor="#64748b"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password *</Text>
              <TextInput
                style={styles.input}
                placeholder="Secret Password"
                placeholderTextColor="#64748b"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Website / App URL</Text>
              <TextInput
                style={styles.input}
                placeholder="https://..."
                placeholderTextColor="#64748b"
                value={website}
                onChangeText={setWebsite}
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Notes</Text>
              <TextInput
                style={[styles.input, { height: 72 }]}
                placeholder="Additional secret notes..."
                placeholderTextColor="#64748b"
                multiline
                value={notes}
                onChangeText={setNotes}
              />
            </View>

            <View style={styles.btnRow}>
              {editingItem && (
                <TouchableOpacity
                  style={[styles.modalBtn, styles.deleteBtn]}
                  onPress={() => handleDelete(editingItem)}
                >
                  <Text style={styles.deleteBtnText}>Delete</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={[styles.modalBtn, styles.saveBtn]} onPress={handleSave}>
                <Text style={styles.saveBtnText}>Save Credential</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    paddingVertical: 14,
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
  listContainer: {
    padding: 16,
    gap: 12,
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  badgeIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#0284c720',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#f8fafc',
  },
  cardUsername: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 2,
  },
  editBtn: {
    padding: 6,
  },
  passwordRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  passwordText: {
    fontSize: 15,
    color: '#38bdf8',
    fontFamily: 'monospace',
    letterSpacing: 1,
  },
  eyeBtn: {
    padding: 4,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalHeaderTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f8fafc',
  },
  inputGroup: {
    marginBottom: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#cbd5e1',
    marginBottom: 4,
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
  btnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  deleteBtn: {
    backgroundColor: '#ef444420',
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  deleteBtnText: {
    color: '#f87171',
    fontWeight: 'bold',
  },
  saveBtn: {
    backgroundColor: '#2563eb',
  },
  saveBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
});
