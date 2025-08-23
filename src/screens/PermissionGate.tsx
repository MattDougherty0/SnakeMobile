import React, { useState } from 'react';
import { ActivityIndicator, Alert, Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { getCurrentPositionOnce, openAppSettings, requestForegroundPermission } from '../features/location/locationService';
import { useAppState } from '../state/appState';

// Example locations for testing real data
const EXAMPLE_LOCATIONS = [
  { name: 'Madison, Wisconsin', lat: 43.0731, lon: -89.4012 },
  { name: 'Mexico City, Mexico', lat: 19.4326, lon: -99.1332 },
  { name: 'São Paulo, Brazil', lat: -23.5505, lon: -46.6333 },
  { name: 'Manila, Philippines', lat: 14.5995, lon: 120.9842 },
  { name: 'Mumbai, India', lat: 19.0760, lon: 72.8777 },
];

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
    setCoordinate({ lat: 33.4484, lon: -112.0740 }); // Phoenix, AZ fallback
  };

  const handleExampleLocation = (lat: number, lon: number) => {
    setPermission('granted');
    setCoordinate({ lat, lon });
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

      <Text style={styles.exampleTitle}>Or try these example locations:</Text>
      <View style={styles.exampleGrid}>
        {EXAMPLE_LOCATIONS.map((location, index) => (
          <Pressable
            key={index}
            style={styles.exampleButton}
            onPress={() => handleExampleLocation(location.lat, location.lon)}
            accessibilityLabel={`Try ${location.name}`}
          >
            <Text style={styles.exampleText}>{location.name}</Text>
          </Pressable>
        ))}
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
  exampleTitle: {
    marginTop: 24,
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  exampleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  exampleButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#ccc',
    backgroundColor: '#fff',
    minWidth: '48%',
  },
  exampleText: {
    color: '#111',
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
});


