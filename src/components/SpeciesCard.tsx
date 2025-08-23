import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

type Props = {
  scientificName: string;
  commonName: string;
  image: string | null;
  safetyBlurb: string;
  nearestMiles: number;
};

export const SpeciesCard: React.FC<Props> = ({
  scientificName,
  commonName,
  image,
  safetyBlurb,
  nearestMiles,
}) => {
  const rounded = Math.max(0, Math.round(nearestMiles));
  const accessibilityLabel = `${commonName} (${scientificName}). Venomous. Nearest record about ${rounded} miles away.`;

  return (
    <View style={styles.card} accessible accessibilityLabel={accessibilityLabel}>
      <View style={styles.thumbWrap}>
        {image ? (
          <Image
            source={{ uri: Image.resolveAssetSource(require('../../assets/images/placeholder.png')).uri }}
            style={styles.thumb}
          />
        ) : (
          <View style={[styles.thumb, styles.thumbPlaceholder]} />
        )}
      </View>
      <View style={styles.textWrap}>
        <Text style={styles.title} numberOfLines={1}>
          {commonName} <Text style={styles.scientific}>({scientificName})</Text>
        </Text>
        <Text style={styles.blurb} numberOfLines={3}>{safetyBlurb}</Text>
        <Text style={styles.meta}>Nearest record: ~{rounded} miles away. If bitten, call 911 immediately.</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#ddd',
    backgroundColor: '#fff',
    gap: 12,
  },
  thumbWrap: {
    width: 64,
    height: 64,
  },
  thumb: {
    width: 64,
    height: 64,
    borderRadius: 8,
    backgroundColor: '#eee',
  },
  thumbPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111',
  },
  scientific: {
    fontWeight: '400',
    color: '#444',
  },
  blurb: {
    marginTop: 4,
    fontSize: 14,
    color: '#222',
  },
  meta: {
    marginTop: 6,
    fontSize: 12,
    color: '#666',
  },
});

export default SpeciesCard;


