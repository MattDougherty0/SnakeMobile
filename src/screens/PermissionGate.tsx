import React, { useState } from 'react';
import { ActivityIndicator, Alert, Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { DEMO_COORDINATE, getCurrentPositionOnce, openAppSettings, requestForegroundPermission } from '../features/location/locationService';
import { useAppState } from '../state/appState';

export default function PermissionGate() {
  const { setPermission, setCoordinate } = useAppState();
  const [loading, setLoading] = useState(false);

  const handleEnable = async () => {
    setLoading(true);
    try {
      const granted = await requestForegroundPermission();
      if (!granted) {
        setPermission('denied');
        setLoading(false);
        return;
      }
      setPermission('granted');
      const loc = await getCurrentPositionOnce();
      setCoordinate(loc);
    } catch (e) {
      Alert.alert("Couldn't get your location. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenSettings = async () => {
    await openAppSettings();
  };

  const handleDemo = () => {
    setPermission('granted');
    setCoordinate(DEMO_COORDINATE);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Find Venomous Snakes Near You</Text>
      <Text style={styles.body}>
        We use your location to check nearby snake occurrences and show safety tips.
      </Text>
      <Pressable style={styles.primary} onPress={handleEnable} disabled={loading} accessibilityLabel="Enable Location">
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Enable Location</Text>}
      </Pressable>

      <Text style={styles.deniedMsg}>Location access is required to check your area.</Text>
      <View style={styles.row}>
        <Pressable style={styles.secondary} onPress={handleOpenSettings} accessibilityLabel="Open Settings">
          <Text style={styles.secondaryText}>Open Settings</Text>
        </Pressable>
        <Pressable style={styles.secondary} onPress={handleDemo} accessibilityLabel="Try Demo Location">
          <Text style={styles.secondaryText}>Try Demo Location</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: '#f8f9fb',
    justifyContent: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111',
    marginBottom: 12,
  },
  body: {
    fontSize: 15,
    color: '#222',
    marginBottom: 24,
  },
  primary: {
    backgroundColor: '#111',
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 12,
  },
  primaryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  deniedMsg: {
    marginTop: 16,
    fontSize: 13,
    color: '#555',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  secondary: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#bbb',
    backgroundColor: '#fff',
  },
  secondaryText: {
    color: '#111',
    fontSize: 14,
    fontWeight: '600',
  },
});


