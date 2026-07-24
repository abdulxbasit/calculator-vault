import React, { useState, useEffect } from 'react';
import { StyleSheet, View, AppState, AppStateStatus } from 'react-native';
import { useVault } from '../../context/vault-context';
import { Calculator } from '../../components/calculator';
import { VaultScreen } from '../../components/vault/vault-screen';

export default function HomeScreen() {
  const { isUnlocked } = useVault();
  const [isAppActive, setIsAppActive] = useState<boolean>(AppState.currentState === 'active');

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      setIsAppActive(nextState === 'active');
    });
    return () => subscription.remove();
  }, []);

  const shouldShowVault = isUnlocked && isAppActive;

  return (
    <View style={styles.container}>
      {shouldShowVault ? <VaultScreen /> : <Calculator />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
});
