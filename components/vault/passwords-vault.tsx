import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  FlatList,
  Modal,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useVault } from '../../context/vault-context';
import { useAlert } from '../../context/alert-context';
import { PasswordRecord } from '../../services/vault-storage';

export const PasswordsVault: React.FC = () => {
  const { passwords, addPassword, updatePassword, deletePassword } = useVault();
  const { showAlert } = useAlert();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<PasswordRecord | null>(null);
  const [visiblePasswords, setVisiblePasswords] = useState<{ [id: string]: boolean }>({});

  const [title, setTitle] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const openNewModal = () => {
    setEditingItem(null);
    setTitle('');
    setEmail('');
    setPassword('');
    setModalVisible(true);
  };

  const openEditModal = (item: PasswordRecord) => {
    setEditingItem(item);
    setTitle(item.title);
    setEmail(item.username || '');
    setPassword(item.password || '');
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!title.trim()) {
      showAlert('Validation Error', 'Service title (e.g. Google, Netflix) is required.');
      return;
    }

    const payload = {
      title: title.trim(),
      username: email.trim(),
      password: password,
      website: '',
      notes: '',
    };

    if (editingItem) {
      await updatePassword(editingItem.id, payload);
    } else {
      await addPassword(payload);
    }

    setModalVisible(false);
  };

  const handleDelete = (item: PasswordRecord) => {
    showAlert('Delete Record', `Are you sure you want to delete "${item.title}"?`, [
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

  const copyToClipboard = async (text: string, label: string) => {
    if (!text) {
      showAlert('Notice', `No ${label.toLowerCase()} saved to copy.`);
      return;
    }
    await Clipboard.setStringAsync(text);
    showAlert('Copied', `${label} copied to clipboard!`);
  };

  const renderItem = ({ item }: { item: PasswordRecord }) => {
    const isPassVisible = !!visiblePasswords[item.id];

    return (
      <View style={styles.card}>
        {/* Card Header: Service Title & Quick Actions */}
        <View style={styles.cardHeader}>
          <View style={styles.badgeIcon}>
            <Ionicons name="key" size={20} color="#ffffff" />
          </View>

          <Text style={styles.cardTitle}>{item.title}</Text>

          <View style={styles.headerActions}>
            <TouchableOpacity onPress={() => openEditModal(item)} style={styles.actionIconBtn}>
              <Ionicons name="create-outline" size={20} color="#a1a1aa" />
            </TouchableOpacity>

            <TouchableOpacity onPress={() => handleDelete(item)} style={styles.actionIconBtn}>
              <Ionicons name="trash-outline" size={20} color="#ef4444" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Email Row */}
        <View style={styles.fieldRow}>
          <View style={styles.fieldLeft}>
            <Text style={styles.fieldLabel}>Email / Username</Text>
            <Text style={styles.fieldValueText} numberOfLines={1}>
              {item.username || 'Not specified'}
            </Text>
          </View>
          {item.username ? (
            <TouchableOpacity
              style={styles.copyBtn}
              onPress={() => copyToClipboard(item.username, 'Email')}
            >
              <Ionicons name="copy-outline" size={16} color="#a1a1aa" />
              <Text style={styles.copyBtnText}>Copy Email</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Password Row */}
        <View style={styles.fieldRow}>
          <View style={styles.fieldLeft}>
            <Text style={styles.fieldLabel}>Password</Text>
            <Text style={[styles.fieldValueText, styles.passwordFont]}>
              {isPassVisible ? item.password || 'No Password' : '••••••••••••'}
            </Text>
          </View>

          <View style={styles.passRowActions}>
            <TouchableOpacity
              style={styles.eyeBtn}
              onPress={() => toggleVisibility(item.id)}
            >
              <Ionicons
                name={isPassVisible ? 'eye-off-outline' : 'eye-outline'}
                size={18}
                color="#a1a1aa"
              />
            </TouchableOpacity>

            {item.password ? (
              <TouchableOpacity
                style={styles.copyBtn}
                onPress={() => copyToClipboard(item.password, 'Password')}
              >
                <Ionicons name="copy-outline" size={16} color="#a1a1aa" />
                <Text style={styles.copyBtnText}>Copy Pass</Text>
              </TouchableOpacity>
            ) : null}
          </View>
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
          <Text style={styles.importBtnText}>Add Password</Text>
        </TouchableOpacity>
      </View>

      {passwords.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconCircle}>
            <Ionicons name="key-outline" size={48} color="#a1a1aa" />
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

      {/* 3-Field Editor Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalHeaderTitle}>
                {editingItem ? 'Edit Password' : 'Add Password'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#a1a1aa" />
              </TouchableOpacity>
            </View>

            {/* Field 1: Service Title */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Service Title *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Google, Netflix, Bank"
                placeholderTextColor="#64748b"
                value={title}
                onChangeText={setTitle}
              />
            </View>

            {/* Field 2: Email / Username */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email / Username</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. john@example.com"
                placeholderTextColor="#64748b"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
              />
            </View>

            {/* Field 3: Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter password"
                placeholderTextColor="#64748b"
                value={password}
                onChangeText={setPassword}
                autoCapitalize="none"
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
    backgroundColor: '#121212',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#282828',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  subtitle: {
    fontSize: 12,
    color: '#a1a1aa',
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
    backgroundColor: '#202124',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#3c4043',
    gap: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badgeIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionIconBtn: {
    padding: 6,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#161616',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#333333',
  },
  fieldLeft: {
    flex: 1,
    marginRight: 8,
  },
  fieldLabel: {
    fontSize: 10,
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  fieldValueText: {
    fontSize: 14,
    color: '#ffffff',
  },
  passwordFont: {
    fontFamily: 'monospace',
    letterSpacing: 1,
  },
  passRowActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  eyeBtn: {
    padding: 6,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#2a2a2e',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#3f3f46',
  },
  copyBtnText: {
    fontSize: 11,
    color: '#e4e4e7',
    fontWeight: '600',
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
    backgroundColor: '#202124',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#a1a1aa',
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
    backgroundColor: '#202124',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#3c4043',
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
    color: '#ffffff',
  },
  inputGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#a1a1aa',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#161616',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#ffffff',
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#383838',
  },
  modalPasswordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161616',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#383838',
    paddingRight: 10,
  },
  modalPasswordInput: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#ffffff',
    fontSize: 15,
  },
  modalEyeBtn: {
    padding: 4,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  deleteBtn: {
    backgroundColor: '#3a1e1e',
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
