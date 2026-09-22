export interface PositionPoint {
  lat: number;
  lng: number;
  timestamp: number;
  speed?: number | null; // in m/s
  altitude?: number | null; // in meters
  accuracy?: number; // in meters
}

export interface Trip {
  id: string;
  name: string;
  date: number;
  path: PositionPoint[];
  distance: number; // in km
  duration: number; // in seconds
  maxSpeed: number; // in km/h
  avgSpeed: number; // in km/h
  maxAltitude?: number | null;
  minAltitude?: number | null;
}

export type TrackingMode = 'idle' | 'recording' | 'paused';
export type SourceMode = 'gps' | 'simulation';

export interface SimulationRoutePreset {
  id: string;
  name: string;
  description: string;
  coordinates: [number, number][]; // [lat, lng]
  travelMode: 'walk' | 'bike' | 'drive';
  speedKmh: number;
}

export type MapTheme = 'dark' | 'midnight' | 'retro' | 'silver' | 'light';

export interface SavedShareCode {
  code: string;
  lat: number;
  lng: number;
  timestamp: number;
  speed?: number;
  heading?: number;
  name: string;
}
