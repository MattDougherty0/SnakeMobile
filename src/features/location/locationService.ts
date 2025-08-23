import * as Location from 'expo-location';
import { Linking, Platform } from 'react-native';

export type Coordinate = { lat: number; lon: number };

export async function requestForegroundPermission(): Promise<boolean> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  return status === Location.PermissionStatus.GRANTED;
}

export async function getCurrentPositionOnce(): Promise<Coordinate> {
  const position = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });
  return { lat: position.coords.latitude, lon: position.coords.longitude };
}

export async function openAppSettings(): Promise<void> {
  if (Platform.OS === 'ios') {
    await Linking.openURL('app-settings:');
  } else {
    await Linking.openSettings();
  }
}

export const DEMO_COORDINATE: Coordinate = { lat: 33.4484, lon: -112.0740 }; // Phoenix, AZ


