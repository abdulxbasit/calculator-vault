import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAlert } from '../../context/alert-context';

interface ChatConversation {
  id: string;
  name: string;
  lastMessage: string;
  time: string;
  unreadCount?: number;
}

export const ChatVault: React.FC = () => {
  const { showAlert } = useAlert();
  const [chats] = useState<ChatConversation[]>([]);

  const handleStartChat = () => {
    showAlert('Secret Chat', 'New secret chat feature initialized. Select a contact or create a private channel.');
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.sectionTitle}>Secret Chats</Text>
          <Text style={styles.subtitle}>End-to-end encrypted private messaging</Text>
        </View>

        <TouchableOpacity style={styles.newChatHeaderBtn} onPress={handleStartChat}>
          <Ionicons name="chatbubble-ellipses-outline" size={20} color="#38bdf8" />
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      {chats.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconCircle}>
            <Ionicons name="chatbubbles-outline" size={48} color="#A1A1AA" />
          </View>
          <Text style={styles.emptyTitle}>No Conversations Yet</Text>
          <Text style={styles.emptySubtitle}>
            Start a new secret conversation to keep your private messages safe and encrypted.
          </Text>
          <TouchableOpacity style={styles.emptyBtn} onPress={handleStartChat}>
            <Ionicons name="add" size={18} color="#FFFFFF" />
            <Text style={styles.emptyBtnText}>Start New Chat</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={chats}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.chatCard}>
              <View style={styles.avatarCircle}>
                <Ionicons name="person" size={20} color="#38bdf8" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.chatName}>{item.name}</Text>
                <Text style={styles.chatMessage} numberOfLines={1}>
                  {item.lastMessage}
                </Text>
              </View>
              <Text style={styles.chatTime}>{item.time}</Text>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.listContainer}
        />
      )}
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
  newChatHeaderBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyIconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#262626',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#383838',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#A1A1AA',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 24,
  },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#2563EB',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  listContainer: {
    padding: 16,
  },
  chatCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#262626',
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#383838',
  },
  avatarCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  chatMessage: {
    fontSize: 13,
    color: '#A1A1AA',
    marginTop: 2,
  },
  chatTime: {
    fontSize: 11,
    color: '#71717A',
  },
});
