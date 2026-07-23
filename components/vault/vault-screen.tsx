import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useVault } from '../../context/vault-context';
import { MediaVault } from './media-vault';
import { DocumentsVault } from './documents-vault';
import { NotesVault } from './notes-vault';
import { PasswordsVault } from './passwords-vault';
import { VaultSettings } from './vault-settings';

type TabType = 'media' | 'docs' | 'notes' | 'passwords' | 'settings';

export const VaultScreen: React.FC = () => {
  const { lockVault } = useVault();
  const [activeTab, setActiveTab] = useState<TabType>('media');

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'media':
        return <MediaVault />;
      case 'docs':
        return <DocumentsVault />;
      case 'notes':
        return <NotesVault />;
      case 'passwords':
        return <PasswordsVault />;
      case 'settings':
        return <VaultSettings />;
      default:
        return <MediaVault />;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      {/* Top Navbar */}
      <View style={styles.navHeader}>
        <View style={styles.brandRow}>
          <View style={styles.shieldBadge}>
            <Ionicons name="shield-checkmark-sharp" size={18} color="#4ade80" />
          </View>
          <View>
            <Text style={styles.navTitle}>Secret Vault</Text>
            <Text style={styles.navSub}>Encrypted & Sandboxed Storage</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.lockBtn} onPress={lockVault}>
          <Ionicons name="lock-closed-outline" size={18} color="#f87171" />
          <Text style={styles.lockBtnText}>Lock Vault</Text>
        </TouchableOpacity>
      </View>

      {/* Main Content Area */}
      <View style={styles.tabContent}>{renderActiveTab()}</View>

      {/* Bottom Navigation Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'media' && styles.tabItemActive]}
          onPress={() => setActiveTab('media')}
        >
          <Ionicons
            name={activeTab === 'media' ? 'images' : 'images-outline'}
            size={22}
            color={activeTab === 'media' ? '#FFFFFF' : '#71717A'}
          />
          <Text style={[styles.tabLabel, activeTab === 'media' && styles.tabLabelActive]}>
            Media
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'docs' && styles.tabItemActive]}
          onPress={() => setActiveTab('docs')}
        >
          <Ionicons
            name={activeTab === 'docs' ? 'folder-open' : 'folder-open-outline'}
            size={22}
            color={activeTab === 'docs' ? '#FFFFFF' : '#71717A'}
          />
          <Text style={[styles.tabLabel, activeTab === 'docs' && styles.tabLabelActive]}>
            Docs
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'notes' && styles.tabItemActive]}
          onPress={() => setActiveTab('notes')}
        >
          <Ionicons
            name={activeTab === 'notes' ? 'journal' : 'journal-outline'}
            size={22}
            color={activeTab === 'notes' ? '#FFFFFF' : '#71717A'}
          />
          <Text style={[styles.tabLabel, activeTab === 'notes' && styles.tabLabelActive]}>
            Notes
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'passwords' && styles.tabItemActive]}
          onPress={() => setActiveTab('passwords')}
        >
          <Ionicons
            name={activeTab === 'passwords' ? 'key' : 'key-outline'}
            size={22}
            color={activeTab === 'passwords' ? '#FFFFFF' : '#71717A'}
          />
          <Text style={[styles.tabLabel, activeTab === 'passwords' && styles.tabLabelActive]}>
            Logins
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'settings' && styles.tabItemActive]}
          onPress={() => setActiveTab('settings')}
        >
          <Ionicons
            name={activeTab === 'settings' ? 'settings' : 'settings-outline'}
            size={22}
            color={activeTab === 'settings' ? '#FFFFFF' : '#71717A'}
          />
          <Text style={[styles.tabLabel, activeTab === 'settings' && styles.tabLabelActive]}>
            Settings
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#161616',
  },
  navHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#181818',
    borderBottomWidth: 1,
    borderBottomColor: '#282828',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  shieldBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#1E291E',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#22C55E',
  },
  navTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  navSub: {
    fontSize: 11,
    color: '#A1A1AA',
  },
  lockBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#2A1818',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#7F1D1D',
  },
  lockBtnText: {
    color: '#F87171',
    fontWeight: 'bold',
    fontSize: 12,
  },
  tabContent: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#181818',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderTopWidth: 1,
    borderTopColor: '#282828',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    borderRadius: 20,
    gap: 2,
  },
  tabItemActive: {
    backgroundColor: '#353535',
  },
  tabLabel: {
    fontSize: 11,
    color: '#71717A',
    fontWeight: '500',
  },
  tabLabelActive: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
});
