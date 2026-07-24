import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useVault } from '../../context/vault-context';
import { Calculator } from '../../components/calculator';
import { VaultScreen } from '../../components/vault/vault-screen';

export default function HomeScreen() {
  const { isUnlocked } = useVault();

  return (
    <View style={styles.container}>
      {isUnlocked ? <VaultScreen /> : <Calculator />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
});
