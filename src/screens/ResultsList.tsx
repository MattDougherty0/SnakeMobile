import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import SpeciesCard from '../components/SpeciesCard';
import { DEFAULT_RADIUS_MILES } from '../util/constants';
import { findSpeciesWithinRadius, loadOccurrences, loadSpeciesInfo, mergeSpeciesDetails } from '../features/snakes/dataService';
import { useAppState } from '../state/appState';

export default function ResultsList() {
  const { coordinate } = useAppState();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      try {
        const [occ, info] = await Promise.all([loadOccurrences(), loadSpeciesInfo()]);
        const nearby = findSpeciesWithinRadius(
          occ,
          coordinate!.lat,
          coordinate!.lon,
          DEFAULT_RADIUS_MILES
        );
        const merged = mergeSpeciesDetails(nearby, info);
        if (!cancelled) setItems(merged);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    if (coordinate) run();
    return () => {
      cancelled = true;
    };
  }, [coordinate]);

  if (!coordinate) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.header}>Venomous species near you (25 mi)</Text>
      {loading ? (
        <Text style={styles.meta}>Loading…</Text>
      ) : items.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No venomous snake occurrences within 25 miles.</Text>
          <Text style={styles.emptyTip}>Still be cautious—absence of records isn’t absence of risk.</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.scientificName}
          contentContainerStyle={{ paddingBottom: 24, gap: 12 }}
          renderItem={({ item }) => (
            <SpeciesCard
              scientificName={item.scientificName}
              commonName={item.commonName}
              image={item.image}
              safetyBlurb={item.safetyBlurb}
              nearestMiles={item.nearestMiles}
            />
          )}
        />
      )}
      <Text style={styles.footer}>
        Data: VenomMaps occurrence records. Occurrence records are historical and may be incomplete. Always
        exercise caution outdoors. In case of a bite or suspected bite, call 911 immediately.
      </Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f8f9fb',
  },
  header: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111',
    marginBottom: 12,
  },
  meta: {
    color: '#555',
  },
  empty: {
    paddingVertical: 32,
    alignItems: 'flex-start',
    gap: 6,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
  },
  emptyTip: {
    fontSize: 13,
    color: '#555',
  },
  footer: {
    marginTop: 12,
    fontSize: 12,
    color: '#666',
  },
});


