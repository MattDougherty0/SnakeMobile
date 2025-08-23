import React, { createContext, useContext, useMemo, useState } from 'react';
import type { Coordinate } from '../features/location/locationService';

export type PermissionState = 'unknown' | 'granted' | 'denied';

export type ResultItem = {
  scientificName: string;
  commonName: string;
  image: string | null;
  safetyBlurb: string;
  nearestMiles: number;
};

type AppState = {
  permission: PermissionState;
  setPermission: (p: PermissionState) => void;
  coordinate: Coordinate | null;
  setCoordinate: (c: Coordinate | null) => void;
};

const AppStateContext = createContext<AppState | undefined>(undefined);

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [permission, setPermission] = useState<PermissionState>('unknown');
  const [coordinate, setCoordinate] = useState<Coordinate | null>(null);

  const value = useMemo(
    () => ({ permission, setPermission, coordinate, setCoordinate }),
    [permission, coordinate]
  );

  return (
    <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>
  );
}

export function useAppState(): AppState {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error('useAppState must be used within AppStateProvider');
  return ctx;
}


