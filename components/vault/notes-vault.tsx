import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useRef, useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { RichEditor, RichToolbar, actions } from 'react-native-pell-rich-editor';
import { useAlert } from '../../context/alert-context';
import { useVault } from '../../context/vault-context';
import { SecretNote } from '../../services/vault-storage';

// Google Keep Palette (Dark Themes)
const GOOGLE_KEEP_COLORS = [
  { id: 'default', hex: '#202124', border: '#3c4043', label: 'Default' },
  { id: 'coral', hex: '#5c2b29', border: '#7c3a37', label: 'Coral' },
  { id: 'amber', hex: '#614a19', border: '#826422', label: 'Amber' },
  { id: 'emerald', hex: '#1e4620', border: '#295e2c', label: 'Emerald' },
  { id: 'teal', hex: '#16504b', border: '#1f6e67', label: 'Teal' },
  { id: 'cobalt', hex: '#2d3748', border: '#3f4e66', label: 'Cobalt' },
  { id: 'purple', hex: '#42275e', border: '#5b3682', label: 'Purple' },
  { id: 'rose', hex: '#5b2245', border: '#7e2f60', label: 'Rose' },
];

export const NotesVault: React.FC = () => {
  const { notes, addNote, updateNote, deleteNote } = useVault();
  const { showAlert } = useAlert();

  // Search & View Mode state
  const [searchQuery, setSearchQuery] = useState('');
  const [isGridView, setIsGridView] = useState(true);

  // Editor Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [editingNote, setEditingNote] = useState<SecretNote | null>(null);
  const [titleInput, setTitleInput] = useState('');
  const [contentInput, setContentInput] = useState('');
  const [selectedColor, setSelectedColor] = useState('#202124');

  const richTextRef = useRef<RichEditor>(null);

  const openNewNoteModal = () => {
    setEditingNote(null);
    setTitleInput('');
    setContentInput('');
    setSelectedColor('#202124');
    setModalVisible(true);
  };

  const openEditNoteModal = (note: SecretNote) => {
    setEditingNote(note);
    setTitleInput(note.title);
    setContentInput(note.content);
    setSelectedColor(note.color || '#202124');
    setModalVisible(true);
  };

  const handleSaveNote = async () => {
    const rawContent = (await richTextRef.current?.getContentHtml()) || contentInput;
    const cleanTitle = titleInput.trim() || 'Untitled Note';

    const plainTextExcerpt = rawContent.replace(/<[^>]*>?/gm, '').trim();

    if (!cleanTitle && !plainTextExcerpt) {
      setModalVisible(false);
      return;
    }

    if (editingNote) {
      await updateNote(editingNote.id, cleanTitle, rawContent, selectedColor);
    } else {
      await addNote(cleanTitle, rawContent, selectedColor);
    }

    setModalVisible(false);
  };

  const handleDeleteNote = (note: SecretNote) => {
    showAlert('Delete Note', `Delete "${note.title}" permanently?`, [
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

  const stripHtml = (html: string) => {
    if (!html) return '';
    return html.replace(/<[^>]*>?/gm, '').replace(/&nbsp;/g, ' ').trim();
  };

  // Filter Notes
  const filteredNotes = useMemo(() => {
    if (!searchQuery.trim()) return notes;
    const q = searchQuery.toLowerCase().trim();
    return notes.filter(
      (n) =>
        n.title.toLowerCase().includes(q) ||
        stripHtml(n.content).toLowerCase().includes(q)
    );
  }, [notes, searchQuery]);

  const renderNoteCard = (item: SecretNote) => {
    const colorObj = GOOGLE_KEEP_COLORS.find((c) => c.hex === item.color) || GOOGLE_KEEP_COLORS[0];
    const previewText = stripHtml(item.content);

    return (
      <TouchableOpacity
        key={item.id}
        style={[
          styles.noteCard,
          isGridView ? styles.gridCard : styles.listCard,
          { backgroundColor: colorObj.hex, borderColor: colorObj.border },
        ]}
        onPress={() => openEditNoteModal(item)}
        activeOpacity={0.85}
      >
        <Text style={styles.noteTitle} numberOfLines={2}>
          {item.title}
        </Text>

        {previewText ? (
          <Text style={styles.notePreview} numberOfLines={isGridView ? 6 : 3}>
            {previewText}
          </Text>
        ) : null}

        <View style={styles.cardFooter}>
          <Text style={styles.noteDate}>
            {new Date(item.updatedAt).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
            })}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Search & Layout Control Bar */}
      <View style={styles.searchBarContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#a1a1aa" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search notes..."
            placeholderTextColor="#71717a"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color="#a1a1aa" />
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity
            style={styles.viewToggleBtn}
            onPress={() => setIsGridView(!isGridView)}
          >
            <Ionicons
              name={isGridView ? 'list-outline' : 'grid-outline'}
              size={20}
              color="#f4f4f5"
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Notes List / Grid */}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {filteredNotes.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconBox}>
              <Ionicons name="journal-outline" size={54} color="#52525b" />
            </View>
            <Text style={styles.emptyTitle}>No Secret Notes</Text>
            <Text style={styles.emptySubtitle}>
              Tap the + button to create a new encrypted rich text note.
            </Text>
          </View>
        ) : (
          <View style={isGridView ? styles.gridContainer : styles.listContainer}>
            {filteredNotes.map(renderNoteCard)}
          </View>
        )}
      </ScrollView>

      {/* Floating Action Button (FAB) */}
      <TouchableOpacity style={styles.fabBtn} onPress={openNewNoteModal} activeOpacity={0.85}>
        <Ionicons name="add" size={32} color="#ffffff" />
      </TouchableOpacity>

      {/* WYSIWYG Rich Text Editor Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={handleSaveNote}
      >
        <View style={[styles.editorScreen, { backgroundColor: selectedColor }]}>
          {/* Top Bar */}
          <View style={styles.editorTopBar}>
            <TouchableOpacity onPress={handleSaveNote} style={styles.topBarBtn}>
              <Ionicons name="arrow-back" size={24} color="#ffffff" />
            </TouchableOpacity>

            <View style={styles.topBarRight}>
              {editingNote ? (
                <TouchableOpacity
                  onPress={() => handleDeleteNote(editingNote)}
                  style={styles.topBarBtn}
                >
                  <Ionicons name="trash-outline" size={22} color="#ef4444" />
                </TouchableOpacity>
              ) : null}

              <TouchableOpacity onPress={handleSaveNote} style={styles.saveCheckBtn}>
                <Ionicons name="checkmark" size={20} color="#ffffff" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Editor Body */}
          <ScrollView style={styles.editorBody} contentContainerStyle={{ paddingBottom: 140 }}>
            <TextInput
              style={styles.titleInput}
              placeholder="Title"
              placeholderTextColor="#9ca3af"
              value={titleInput}
              onChangeText={setTitleInput}
            />

            <RichEditor
              ref={richTextRef}
              initialContentHTML={contentInput}
              onChange={setContentInput}
              placeholder="Write your note here..."
              editorStyle={{
                backgroundColor: selectedColor,
                color: '#ffffff',
                placeholderColor: '#6b7280',
                contentCSSText: 'font-size: 16px; line-height: 24px; min-height: 280px;',
              }}
              style={styles.richEditor}
            />
          </ScrollView>

          {/* Bottom Dock: WYSIWYG Rich Toolbar + Color Palette */}
          <View style={styles.bottomDock}>
            <RichToolbar
              editor={richTextRef}
              actions={[
                actions.setBold,
                actions.setItalic,
                actions.setStrikethrough,
                actions.heading1,
                actions.insertBulletsList,
                actions.checkboxList,
                actions.removeFormat,
                actions.undo,
                actions.redo,
              ]}
              iconTint="#e4e4e7"
              selectedIconTint="#ffffff"
              iconSelectedBgColor="#2563eb"
              style={styles.richToolbar}
            />

            {/* Google Keep Color Palette Bar */}
            <View style={styles.paletteContainer}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.paletteScroll}
              >
                {GOOGLE_KEEP_COLORS.map((c) => (
                  <TouchableOpacity
                    key={c.id}
                    style={[
                      styles.colorCircle,
                      { backgroundColor: c.hex, borderColor: c.border },
                      selectedColor === c.hex && styles.activeColorCircle,
                    ]}
                    onPress={() => setSelectedColor(c.hex)}
                  >
                    {selectedColor === c.hex ? (
                      <Ionicons name="checkmark" size={14} color="#ffffff" />
                    ) : null}
                  </TouchableOpacity>
                ))}
              </ScrollView>
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
  searchBarContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#202124',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
    borderWidth: 1,
    borderColor: '#3c4043',
  },
  searchInput: {
    flex: 1,
    color: '#ffffff',
    fontSize: 15,
  },
  viewToggleBtn: {
    paddingLeft: 8,
    borderLeftWidth: 1,
    borderLeftColor: '#3c4043',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 90,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  listContainer: {
    gap: 10,
  },
  noteCard: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
  },
  gridCard: {
    width: '48.5%',
    minHeight: 110,
  },
  listCard: {
    width: '100%',
  },
  noteTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 6,
  },
  notePreview: {
    fontSize: 13,
    color: '#d1d5db',
    lineHeight: 18,
    marginBottom: 8,
  },
  cardFooter: {
    marginTop: 'auto',
    alignItems: 'flex-end',
  },
  noteDate: {
    fontSize: 10,
    color: '#9ca3af',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyIconBox: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#202124',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#3c4043',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#9ca3af',
    textAlign: 'center',
    maxWidth: 260,
    lineHeight: 18,
  },
  fabBtn: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  editorScreen: {
    flex: 1,
  },
  editorTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 44,
    paddingBottom: 12,
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  topBarBtn: {
    padding: 6,
  },
  saveCheckBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editorBody: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  titleInput: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 16,
  },
  richEditor: {
    flex: 1,
    minHeight: 280,
  },
  bottomDock: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(18, 18, 18, 0.95)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 12,
    gap: 6,
  },
  richToolbar: {
    backgroundColor: 'transparent',
    paddingHorizontal: 8,
  },
  paletteContainer: {
    marginBottom: 8,
  },
  paletteScroll: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 14,
    marginTop: 4,
    marginBottom: 4,
  },
  colorCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeColorCircle: {
    borderColor: '#ffffff',
    transform: [{ scale: 1.18 }],
  },
});
