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
import { SecretNote } from '../../services/vault-storage';

export const NotesVault: React.FC = () => {
  const { notes, addNote, updateNote, deleteNote } = useVault();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingNote, setEditingNote] = useState<SecretNote | null>(null);

  const [titleInput, setTitleInput] = useState('');
  const [contentInput, setContentInput] = useState('');

  const openNewNoteModal = () => {
    setEditingNote(null);
    setTitleInput('');
    setContentInput('');
    setModalVisible(true);
  };

  const openEditNoteModal = (note: SecretNote) => {
    setEditingNote(note);
    setTitleInput(note.title);
    setContentInput(note.content);
    setModalVisible(true);
  };

  const handleSaveNote = async () => {
    if (!titleInput.trim()) {
      Alert.alert('Validation Error', 'Note title cannot be empty.');
      return;
    }

    if (editingNote) {
      await updateNote(editingNote.id, titleInput, contentInput);
    } else {
      await addNote(titleInput, contentInput);
    }

    setModalVisible(false);
  };

  const handleDeleteNote = (note: SecretNote) => {
    Alert.alert('Delete Note', `Are you sure you want to delete "${note.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteNote(note.id);
          setModalVisible(false);
        },
      },
    ]);
  };

  const renderItem = ({ item }: { item: SecretNote }) => (
    <TouchableOpacity
      style={styles.noteCard}
      onPress={() => openEditNoteModal(item)}
      activeOpacity={0.8}
    >
      <View style={styles.noteHeader}>
        <Text style={styles.noteTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.noteDate}>{new Date(item.updatedAt).toLocaleDateString()}</Text>
      </View>
      <Text style={styles.notePreview} numberOfLines={2}>
        {item.content || 'Empty note content...'}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.sectionTitle}>Secret Notes</Text>
          <Text style={styles.subtitle}>{notes.length} note(s) saved</Text>
        </View>

        <TouchableOpacity style={styles.importBtn} onPress={openNewNoteModal}>
          <Ionicons name="create-outline" size={18} color="#ffffff" />
          <Text style={styles.importBtnText}>New Note</Text>
        </TouchableOpacity>
      </View>

      {notes.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconCircle}>
            <Ionicons name="journal-outline" size={48} color="#64748b" />
          </View>
          <Text style={styles.emptyTitle}>No Secret Notes</Text>
          <Text style={styles.emptySubtitle}>
            Write down confidential memos, private ideas, or personal journals.
          </Text>
          <TouchableOpacity style={styles.emptyBtn} onPress={openNewNoteModal}>
            <Text style={styles.emptyBtnText}>Create First Note</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={notes}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContainer}
        />
      )}

      {/* Note Editor Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.editorContainer}>
            <View style={styles.editorHeader}>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={styles.headerCancelText}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.editorHeaderTitle}>
                {editingNote ? 'Edit Secret Note' : 'New Secret Note'}
              </Text>
              <TouchableOpacity onPress={handleSaveNote}>
                <Text style={styles.headerSaveText}>Save</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.titleInput}
              placeholder="Note Title..."
              placeholderTextColor="#64748b"
              value={titleInput}
              onChangeText={setTitleInput}
            />

            <TextInput
              style={styles.contentInput}
              placeholder="Write your confidential text here..."
              placeholderTextColor="#475569"
              multiline
              textAlignVertical="top"
              value={contentInput}
              onChangeText={setContentInput}
            />

            {editingNote && (
              <TouchableOpacity
                style={styles.deleteNoteBtn}
                onPress={() => handleDeleteNote(editingNote)}
              >
                <Ionicons name="trash-outline" size={18} color="#f87171" />
                <Text style={styles.deleteNoteBtnText}>Delete Note</Text>
              </TouchableOpacity>
            )}
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
  noteCard: {
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  noteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  noteTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#f8fafc',
    flex: 1,
    marginRight: 8,
  },
  noteDate: {
    fontSize: 12,
    color: '#64748b',
  },
  notePreview: {
    fontSize: 14,
    color: '#94a3b8',
    lineHeight: 20,
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
    backgroundColor: '#020617',
  },
  editorContainer: {
    flex: 1,
    backgroundColor: '#0f172a',
    paddingTop: 48,
    paddingHorizontal: 20,
  },
  editorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerCancelText: {
    color: '#94a3b8',
    fontSize: 16,
  },
  editorHeaderTitle: {
    color: '#f8fafc',
    fontSize: 17,
    fontWeight: 'bold',
  },
  headerSaveText: {
    color: '#38bdf8',
    fontSize: 16,
    fontWeight: 'bold',
  },
  titleInput: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#f8fafc',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    marginBottom: 16,
  },
  contentInput: {
    flex: 1,
    fontSize: 16,
    color: '#cbd5e1',
    lineHeight: 24,
  },
  deleteNoteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 16,
    marginBottom: 24,
  },
  deleteNoteBtnText: {
    color: '#f87171',
    fontWeight: '600',
    fontSize: 15,
  },
});
