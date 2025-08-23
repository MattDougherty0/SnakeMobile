import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import PermissionGate from './src/screens/PermissionGate';
import ResultsList from './src/screens/ResultsList';
import { AppStateProvider, useAppState } from './src/state/appState';

function Root() {
  const { coordinate } = useAppState();
  return coordinate ? <ResultsList /> : <PermissionGate />;
}

export default function App() {
  return (
    <AppStateProvider>
      <View style={styles.container}>
        <Root />
        <StatusBar style="auto" />
      </View>
    </AppStateProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});
