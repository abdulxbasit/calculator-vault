import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useVault } from '../../context/vault-context';
import { DocumentsVault } from './documents-vault';
import { MediaVault } from './media-vault';
import { NotesVault } from './notes-vault';
import { PasswordsVault } from './passwords-vault';
import { VaultSettings } from './vault-settings';


export const VaultScreen: React.FC = () => {
  const { lockVault, activeTab, setActiveTab } = useVault();

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

      {/* Main Content Area */}
      <View style={styles.tabContent}>{renderActiveTab()}</View>

      {/* Centered Floating Compact Lock Vault Button */}
      <View style={styles.floatingLockContainer} pointerEvents="box-none">
        <TouchableOpacity style={styles.floatingLockBtn} onPress={lockVault} activeOpacity={0.85}>
          <Ionicons name="lock-closed" size={14} color="#FFFFFF" />
          <Text style={styles.floatingLockBtnText}>Lock Vault</Text>
        </TouchableOpacity>
      </View>

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
  floatingLockContainer: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 20,
  },
  floatingLockBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(37, 99, 235, 0.45)', // Translucent action blue glass
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(147, 197, 253, 0.7)', // Translucent light-blue border highlight
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 8,
  },
  floatingLockBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 12.5,
    letterSpacing: 0.3,
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
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
