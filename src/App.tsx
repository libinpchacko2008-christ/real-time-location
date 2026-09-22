import { useState, useEffect, useRef, useMemo } from 'react';

// Safe localStorage wrapper to prevent sandboxed iframe SecurityError
const safeStorage = {
  getItem: (key: string): string | null => {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      console.warn('localStorage is blocked or unavailable:', e);
      return null;
    }
  },
  setItem: (key: string, value: string): void => {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.warn('localStorage is blocked or unavailable:', e);
    }
  }
};

import { 
  Footprints, 
  Bike, 
  Car, 
  Play, 
  Square, 
  Pause, 
  RotateCcw, 
  Compass, 
  Settings, 
  Share2, 
  Sliders, 
  MapPin, 
  Activity, 
  Lock, 
  Unlock, 
  Palette,
  History,
  Info,
  Layers,
  Sparkles,
  RefreshCw,
  TrendingUp,
  Map as MapIcon,
  ChevronRight,
  Route,
  Navigation,
  AlertTriangle
} from 'lucide-react';

import { 
  PositionPoint, 
  Trip, 
  TrackingMode, 
  SourceMode, 
  MapTheme,
  SimulationRoutePreset
} from './types';
import { SIMULATION_PRESETS, TRAVEL_MODE_METADATA } from './presets';
import { 
  calculateDistance, 
  formatDistance, 
  formatDuration, 
  formatSpeed, 
  getSimulatedElevation, 
  interpolatePoints 
} from './utils';

import Speedometer from './components/Speedometer';
import StatsGrid from './components/StatsGrid';
import SimulationControls from './components/SimulationControls';
import ShareCodePanel from './components/ShareCodePanel';
import PastTripsPanel from './components/PastTripsPanel';
import InteractiveMap from './components/InteractiveMap';

export default function App() {
  // Navigation tabs
  const [currentTab, setCurrentTab] = useState<'tracker' | 'simulation' | 'share' | 'history'>('tracker');
  
  // Tracking general states
  const [trackingMode, setTrackingMode] = useState<TrackingMode>('idle');
  const [sourceMode, setSourceMode] = useState<SourceMode>('simulation'); // Default to simulation for instant sandbox feedback!
  const [travelMode, setTravelMode] = useState<'walk' | 'bike' | 'drive'>('bike');
  const [useImperial, setUseImperial] = useState<boolean>(false);
  const [mapTheme, setMapTheme] = useState<MapTheme>('dark');
  const [autoCenter, setAutoCenter] = useState<boolean>(true);
  
  // Live coordinates and breadcrumbs
  const [path, setPath] = useState<PositionPoint[]>([]);
  const [currentPoint, setCurrentPoint] = useState<PositionPoint | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  
  // Active statistics accumulator
  const [accDistanceKm, setAccDistanceKm] = useState<number>(0);
  const [accDurationSec, setAccDurationSec] = useState<number>(0);
  const [maxSpeedKmh, setMaxSpeedKmh] = useState<number>(0);
  
  // Simulation specific states
  const [simPresetId, setSimPresetId] = useState<string | null>(null);
  const [simCoordinates, setSimCoordinates] = useState<[number, number][]>([]);
  const [simIndex, setSimIndex] = useState<number>(0);
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(5);
  
  // Custom drawn path coordinates
  const [customWaypoints, setCustomWaypoints] = useState<[number, number][]>([]);
  const [isDrawingMode, setIsDrawingMode] = useState<boolean>(false);

  // Sharing states
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [sharedDevices, setSharedDevices] = useState<any[]>([]);
  const [cellularTargets, setCellularTargets] = useState<any[]>([]);

  // Combined external devices for plotting on map
  const allTrackedDevices = useMemo(() => [...sharedDevices, ...cellularTargets], [sharedDevices, cellularTargets]);

  // History & Chart interactions
  const [previewTripId, setPreviewTripId] = useState<string | null>(null);
  const [hoveredChartPoint, setHoveredChartPoint] = useState<PositionPoint | null>(null);
  const [isShutdown, setIsShutdown] = useState<boolean>(false);
  const [systemLogs, setSystemLogs] = useState<string[]>(['SYSTEM BOOT COMPLETE', 'SENSORS INITIALIZED', 'DIAGNOSTIC CHANNEL ACTIVE']);

  // Focus location for map zooming and panning
  const [focusLocation, setFocusLocation] = useState<{ lat: number; lng: number; trigger: number } | null>(null);
  const [isLocating, setIsLocating] = useState<boolean>(false);

  // Safe UI Dialogue and Notification states
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [saveTripDialog, setSaveTripDialog] = useState<{ defaultName: string; onConfirm: (name: string) => void } | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ message: string; onConfirm: () => void } | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setSystemLogs(prev => [...prev.slice(-3), `NOTICE: ${msg.toUpperCase()}`]);
  };

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // GPS watch ID ref
  const watchIdRef = useRef<number | null>(null);
  // Simulation interval ref
  const simIntervalRef = useRef<any | null>(null);
  // Trip clock timer ref
  const clockIntervalRef = useRef<any | null>(null);

  // ==================== INITIAL LOAD ====================
  useEffect(() => {
    // Load trips from safeStorage
    const saved = safeStorage.getItem('recorded_trips');
    if (saved) {
      try {
        setTrips(JSON.parse(saved));
      } catch (e) {
        console.error('Error loading past trips:', e);
      }
    }

    // Set default initial position on India if GPS not authorized yet
    const defaultPt: PositionPoint = {
      lat: 28.6129,
      lng: 77.2295,
      timestamp: Date.now(),
      speed: 0,
      altitude: 216,
      accuracy: 5
    };
    setCurrentPoint(defaultPt);

    return () => {
      stopGPSWatch();
      stopSimulationTimer();
      stopClockTimer();
    };
  }, []);

  // ==================== MULTI-DEVICE SIMULATION ROOM ENGINE =====================
  useEffect(() => {
    if (!roomCode) {
      setSharedDevices([]);
      return;
    }

    const baseLat = currentPoint?.lat || 28.6129;
    const baseLng = currentPoint?.lng || 77.2295;

    const devices = [
      { id: 'dev-emma', name: 'Emma (Runner)', lat: baseLat + 0.003, lng: baseLng - 0.002, speedKmh: 9.5, role: 'Running', avatarColor: 'bg-pink-500' },
      { id: 'dev-marcus', name: 'Marcus (Cyclist)', lat: baseLat - 0.004, lng: baseLng + 0.003, speedKmh: 24.2, role: 'Cycling', avatarColor: 'bg-emerald-500' },
      { id: 'dev-courier', name: 'Courier #24', lat: baseLat + 0.001, lng: baseLng + 0.004, speedKmh: 36.8, role: 'Electric Scooter', avatarColor: 'bg-amber-500' }
    ];
    setSharedDevices(devices);

    let angle = 0;
    const interval = setInterval(() => {
      angle += 0.06;
      setSharedDevices(prev => 
        prev.map(d => {
          let latOffset = 0;
          let lngOffset = 0;

          if (d.id === 'dev-emma') {
            latOffset = Math.sin(angle) * 0.0004;
            lngOffset = Math.cos(angle) * 0.0004;
          } else if (d.id === 'dev-marcus') {
            latOffset = Math.cos(angle * 0.7) * 0.001;
            lngOffset = Math.sin(angle * 0.7) * 0.001;
          } else {
            latOffset = Math.sin(angle * 1.3) * 0.0015;
            lngOffset = Math.cos(angle * 1.3) * 0.0015;
          }

          const speedVar = (Math.random() - 0.5) * 2;

          return {
            ...d,
            lat: d.lat + latOffset * 0.15,
            lng: d.lng + lngOffset * 0.15,
            speedKmh: Math.max(2, d.speedKmh + speedVar)
          };
        })
      );
    }, 1500);

    return () => clearInterval(interval);
  }, [roomCode]);

  // ==================== GPS ENGINE TRACKING WRAPPERS ====================
  const startGPSWatch = () => {
    if (!navigator.geolocation) {
      showToast('Your browser does not support GPS Geolocation.');
      return;
    }
    stopGPSWatch();

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, speed, altitude, accuracy } = pos.coords;
        const speedKmh = speed !== null ? speed * 3.6 : 0;
        
        const pt: PositionPoint = {
          lat: latitude,
          lng: longitude,
          timestamp: Date.now(),
          speed: speed !== null ? speed : 0,
          altitude: altitude || getSimulatedElevation(latitude, longitude),
          accuracy: accuracy
        };

        handleNewPoint(pt, speedKmh);
      },
      (err) => {
        console.error('GPS watchPosition failed:', err);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  const stopGPSWatch = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  };

  const requestLiveLocation = () => {
    if (!navigator.geolocation) {
      showToast('Your browser does not support GPS Geolocation.');
      return;
    }
    
    setIsLocating(true);
    setSystemLogs(prev => [...prev.slice(-3), 'REQUESTING GPS ACCESS', 'AWAITING USER APPROVAL']);
    
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, speed, altitude, accuracy } = pos.coords;
        const pt: PositionPoint = {
          lat: latitude,
          lng: longitude,
          timestamp: Date.now(),
          speed: speed || 0,
          altitude: altitude || getSimulatedElevation(latitude, longitude),
          accuracy: accuracy
        };
        
        setCurrentPoint(pt);
        setFocusLocation({ lat: latitude, lng: longitude, trigger: Date.now() });
        setAutoCenter(true);
        setIsLocating(false);
        setSystemLogs(prev => [
          ...prev,
          'GPS LOCATION LOCKED',
          `LAT: ${latitude.toFixed(5)}, LNG: ${longitude.toFixed(5)}`
        ]);
        showToast('Successfully locked onto your live GPS location.');
      },
      (err) => {
        console.error('getCurrentPosition failed:', err);
        setIsLocating(false);
        let errorMsg = 'Failed to fetch your live location.';
        if (err.code === err.PERMISSION_DENIED) {
          errorMsg = 'GPS Permission Denied. Please enable location access in your browser/device settings.';
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          errorMsg = 'GPS Position Unavailable. Ensure location services/cellular GPS are active.';
        } else if (err.code === err.TIMEOUT) {
          errorMsg = 'GPS Request Timed Out.';
        }
        showToast(errorMsg);
        setSystemLogs(prev => [...prev, `GPS LINK FAULT: ${err.message.toUpperCase()}`]);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  // ==================== SIMULATION ENGINE TIMERS ====================
  const startSimulationTimer = () => {
    stopSimulationTimer();

    let currentIndex = simIndex;
    let coords = [...simCoordinates];

    if (coords.length === 0) {
      // Fallback if no presets loaded yet, load SF Marina
      const defaultPreset = SIMULATION_PRESETS[0];
      setSimPresetId(defaultPreset.id);
      
      // Interpolate points for fluid gliding
      let full: [number, number][] = [];
      for (let i = 0; i < defaultPreset.coordinates.length - 1; i++) {
        full = [...full, ...interpolatePoints(defaultPreset.coordinates[i], defaultPreset.coordinates[i+1], 15)];
      }
      coords = full;
      setSimCoordinates(full);
      currentIndex = 0;
      setSimIndex(0);
    }

    simIntervalRef.current = setInterval(() => {
      if (coords.length === 0) return;
      
      const pointIdx = currentIndex % coords.length;
      const coord = coords[pointIdx];
      
      // Calculate realistic speed fluctuations
      const basePreset = SIMULATION_PRESETS.find(p => p.id === simPresetId);
      const targetSpeed = basePreset ? basePreset.speedKmh : 22;
      const speedFluct = targetSpeed + (Math.sin(pointIdx * 0.15) * (targetSpeed * 0.15));
      
      const pt: PositionPoint = {
        lat: coord[0],
        lng: coord[1],
        timestamp: Date.now(),
        speed: speedFluct / 3.6, // m/s
        altitude: getSimulatedElevation(coord[0], coord[1]),
        accuracy: 3
      };

      handleNewPoint(pt, speedFluct);

      currentIndex++;
      setSimIndex(currentIndex);
    }, 1000); // 1-second update ticks
  };

  const stopSimulationTimer = () => {
    if (simIntervalRef.current) {
      clearInterval(simIntervalRef.current);
      simIntervalRef.current = null;
    }
  };

  // ==================== TRIP ACTIVE TIMER CLOCK ====================
  const startClockTimer = () => {
    stopClockTimer();
    clockIntervalRef.current = setInterval(() => {
      setAccDurationSec(prev => prev + 1);
    }, 1000);
  };

  const stopClockTimer = () => {
    if (clockIntervalRef.current) {
      clearInterval(clockIntervalRef.current);
      clockIntervalRef.current = null;
    }
  };

  // ==================== COMMON POINT ACCUMULATOR ====================
  const handleNewPoint = (pt: PositionPoint, speedKmh: number) => {
    setCurrentPoint(pt);

    setPath(prev => {
      if (prev.length === 0) {
        return [pt];
      }

      const prevPt = prev[prev.length - 1];
      const distAdded = calculateDistance(prevPt.lat, prevPt.lng, pt.lat, pt.lng);
      
      // Update accumulated stats
      setAccDistanceKm(d => d + distAdded);
      if (speedKmh > maxSpeedKmh) {
        setMaxSpeedKmh(speedKmh);
      }

      return [...prev, pt];
    });
  };

  // ==================== START / PAUSE / STOP ACTIONS ====================
  const handleStartTracking = () => {
    setTrackingMode('recording');
    setPreviewTripId(null); // Hide any historical trail
    
    // Reset stats
    setAccDistanceKm(0);
    setAccDurationSec(0);
    setMaxSpeedKmh(0);
    setPath([]);

    if (sourceMode === 'gps') {
      startGPSWatch();
    } else {
      startSimulationTimer();
    }
    
    startClockTimer();
  };

  const handlePauseTracking = () => {
    setTrackingMode('paused');
    stopGPSWatch();
    stopSimulationTimer();
    stopClockTimer();
  };

  const handleResumeTracking = () => {
    setTrackingMode('recording');
    if (sourceMode === 'gps') {
      startGPSWatch();
    } else {
      startSimulationTimer();
    }
    startClockTimer();
  };

  const handleStopAndSaveTracking = () => {
    // Stop engines
    stopGPSWatch();
    stopSimulationTimer();
    stopClockTimer();
    setTrackingMode('idle');

    if (path.length < 2) {
      showToast('Not enough tracking points recorded to save.');
      return;
    }

    // Save trip
    const defaultName = `Trip ${new Date().toLocaleDateString()} - ${TRAVEL_MODE_METADATA[travelMode].label}`;
    
    setSaveTripDialog({
      defaultName,
      onConfirm: (enteredName) => {
        const finalName = enteredName.trim() || defaultName;
        const avgSpeed = accDurationSec > 0 ? (accDistanceKm / (accDurationSec / 3600)) : 0;

        const newTrip: Trip = {
          id: 'trip_' + Date.now(),
          name: finalName,
          date: Date.now(),
          path,
          distance: accDistanceKm,
          duration: accDurationSec,
          maxSpeed: maxSpeedKmh,
          avgSpeed: avgSpeed
        };

        const updatedTrips = [newTrip, ...trips];
        setTrips(updatedTrips);
        safeStorage.setItem('recorded_trips', JSON.stringify(updatedTrips));
        
        // Switch to history tab to view results immediately!
        setPreviewTripId(newTrip.id);
        setCurrentTab('history');
        setSaveTripDialog(null);
        showToast(`Saved trip "${finalName}"`);
      }
    });
  };

  const handleReset = () => {
    setConfirmDialog({
      message: 'Are you sure you want to discard current recording state?',
      onConfirm: () => {
        stopGPSWatch();
        stopSimulationTimer();
        stopClockTimer();
        setTrackingMode('idle');
        setPath([]);
        setAccDistanceKm(0);
        setAccDurationSec(0);
        setMaxSpeedKmh(0);
        setConfirmDialog(null);
        showToast('Recording state discarded.');
      }
    });
  };

  const deleteTrip = (id: string) => {
    setConfirmDialog({
      message: 'Are you sure you want to delete this track history? This action is permanent.',
      onConfirm: () => {
        const updated = trips.filter(t => t.id !== id);
        setTrips(updated);
        safeStorage.setItem('recorded_trips', JSON.stringify(updated));
        if (previewTripId === id) {
          setPreviewTripId(null);
        }
        setConfirmDialog(null);
        showToast('Track history deleted.');
      }
    });
  };

  const handleLocatePhoneNumber = (number: string) => {
    const baseLat = currentPoint?.lat || 37.8077;
    const baseLng = currentPoint?.lng || -122.4750;

    // Generate a random position offset for the new target
    const angle = Math.random() * Math.PI * 2;
    const distance = 0.002 + Math.random() * 0.004; // beautifully offset
    const targetLat = baseLat + Math.sin(angle) * distance;
    const targetLng = baseLng + Math.cos(angle) * distance;

    const carriers = ['Verizon Wireless', 'AT&T Mobility', 'T-Mobile US', 'Vodafone', 'Orange'];
    const signals = ['Excellent (5/5)', 'Good (4/5)', 'Fair (3/5)'];
    
    const newTarget = {
      id: 'cell_' + Date.now(),
      name: `Cellular Target (${number})`,
      lat: targetLat,
      lng: targetLng,
      speedKmh: 0,
      role: 'Cellular Node Active',
      avatarColor: 'bg-amber-500',
      carrier: carriers[Math.floor(Math.random() * carriers.length)],
      battery: Math.floor(65 + Math.random() * 32),
      signalStrength: signals[Math.floor(Math.random() * signals.length)]
    };

    setCellularTargets(prev => [newTarget, ...prev]);
    
    // Auto center map on located target
    setFocusLocation({ lat: targetLat, lng: targetLng, trigger: Date.now() });
    setAutoCenter(false);

    setSystemLogs(prev => [
      ...prev,
      `CELL TRIANGULATION SUCCESS: Target ${number}`,
      `COORDS LOCKED: ${targetLat.toFixed(5)}, ${targetLng.toFixed(5)}`
    ]);

    showToast(`Target locked: ${number}`);
  };

  const handleRemoveCellularTarget = (id: string) => {
    setCellularTargets(prev => prev.filter(t => t.id !== id));
    setSystemLogs(prev => [...prev, 'CELLULAR LINK TERMINATED']);
    showToast('Cellular target link terminated.');
  };

  // Toggle between GPS & Simulation modes
  const handleSourceModeChange = (mode: SourceMode) => {
    if (trackingMode !== 'idle') {
      showToast('Please stop active tracking before shifting GPS signal source.');
      return;
    }
    setSourceMode(mode);
    if (mode === 'gps') {
      requestLiveLocation();
    }
  };

  // ==================== SIMULATION PRESET SELECTOR ====================
  const handleSelectPreset = (preset: SimulationRoutePreset) => {
    setSimPresetId(preset.id);
    
    // Interpolate preset points to glide smoothly
    let interpolated: [number, number][] = [];
    for (let i = 0; i < preset.coordinates.length - 1; i++) {
      interpolated = [...interpolated, ...interpolatePoints(preset.coordinates[i], preset.coordinates[i+1], 15)];
    }
    
    setSimCoordinates(interpolated);
    setSimIndex(0);
    
    const startCoord = preset.coordinates[0];
    const pt: PositionPoint = {
      lat: startCoord[0],
      lng: startCoord[1],
      timestamp: Date.now(),
      speed: 0,
      altitude: getSimulatedElevation(startCoord[0], startCoord[1]),
      accuracy: 3
    };
    setCurrentPoint(pt);
    
    // Focus map on preset start point
    setFocusLocation({ lat: startCoord[0], lng: startCoord[1], trigger: Date.now() });
    setAutoCenter(false); // Let user view the full preset route
  };

  // Start simulation along custom drawn waypoints
  const handleStartCustomRouteSimulation = () => {
    if (customWaypoints.length < 2) {
      showToast('Plot at least 2 waypoints on the map to run a custom path simulation.');
      return;
    }

    let fullPath: [number, number][] = [];
    for (let i = 0; i < customWaypoints.length - 1; i++) {
      fullPath = [...fullPath, ...interpolatePoints(customWaypoints[i], customWaypoints[i+1], 15)];
    }

    setSimCoordinates(fullPath);
    setSimIndex(0);
    setSimPresetId('custom_drawn');
    setSourceMode('simulation');
    
    // Stop active drawing
    setIsDrawingMode(false);

    // Start Recording immediately
    setTrackingMode('recording');
    setPreviewTripId(null);
    setAccDistanceKm(0);
    setAccDurationSec(0);
    setMaxSpeedKmh(0);
    setPath([]);

    const startCoord = fullPath[0];
    const pt: PositionPoint = {
      lat: startCoord[0],
      lng: startCoord[1],
      timestamp: Date.now(),
      speed: 0,
      altitude: getSimulatedElevation(startCoord[0], startCoord[1]),
      accuracy: 3
    };
    setCurrentPoint(pt);

    startSimulationTimer();
    startClockTimer();

    // Shift to tracking console
    setCurrentTab('tracker');
  };

  // GPX imported route handler
  const handleGPXImported = (name: string, parsedPath: PositionPoint[]) => {
    if (parsedPath.length < 2) return;

    const coords = parsedPath.map(p => [p.lat, p.lng] as [number, number]);
    setSimCoordinates(coords);
    setSimIndex(0);
    setSimPresetId('gpx_imported');
    setSourceMode('simulation');

    // Focus map on imported track start point
    setFocusLocation({ lat: parsedPath[0].lat, lng: parsedPath[0].lng, trigger: Date.now() });
    setAutoCenter(false);

    // Initialize point
    setCurrentPoint(parsedPath[0]);

    showToast(`Successfully loaded "${name}" (${parsedPath.length} track points). Press Start Simulation below.`);
    setCurrentTab('tracker');
  };
  // ==================== STAT COMPUTATION METADATA ====================
  const activeAvgSpeed = useMemo(() => {
    if (accDurationSec <= 0) return 0;
    return accDistanceKm / (accDurationSec / 3600);
  }, [accDistanceKm, accDurationSec]);

  // Sparkline data coordinates based on active path speeds
  const sparklinePoints = useMemo(() => {
    if (path.length < 2) return [];
    const recentPoints = path.slice(-12);
    const speeds = recentPoints.map(pt => (pt.speed || 0) * 3.6);
    const max = Math.max(...speeds, 5);
    const min = 0;
    const range = max - min;
    return speeds.map((s, i) => ({
      x: speeds.length > 1 ? (i / (speeds.length - 1)) * 100 : 0,
      y: 100 - ((s - min) / range) * 85
    }));
  }, [path]);

  // Current active unit name
  const activeUnitName = useMemo(() => {
    if (previewTripId) {
      const trip = trips.find(t => t.id === previewTripId);
      return trip ? `TRIP: ${trip.name.toUpperCase()}` : 'PREVIEW LOG';
    }
    if (trackingMode === 'recording' || trackingMode === 'paused') {
      if (sourceMode === 'simulation') {
        const preset = SIMULATION_PRESETS.find(p => p.id === simPresetId);
        return preset ? `SIM: ${preset.name.toUpperCase()}` : 'CUSTOM SIMULATION';
      }
      return 'LIVE DEVICE RECEIVER';
    }
    return 'STANDBY STATUS';
  }, [previewTripId, trackingMode, sourceMode, simPresetId, trips]);

  return (
    <div className="w-full h-screen flex flex-col bg-[#0b0c10] text-[#d1d5db] font-sans overflow-hidden select-none relative">
      
      {/* Remote Shutdown Security Screen */}
      {isShutdown && (
        <div className="absolute inset-0 bg-[#0e0202]/95 z-50 flex flex-col items-center justify-center p-6 text-center font-mono">
          <div className="w-16 h-16 rounded-full bg-rose-950/40 border border-rose-500/50 flex items-center justify-center animate-pulse mb-6 text-rose-500 font-extrabold text-2xl shadow-[0_0_15px_rgba(244,63,94,0.3)]">
            !
          </div>
          <h1 className="text-xl font-bold tracking-widest text-rose-100">LOCATE.OS / REMOTE SHUTDOWN INITIATED</h1>
          <p className="text-xs text-rose-400 mt-3 max-w-md uppercase tracking-wide leading-relaxed">
            All remote tracking connections have been severed. System telemetry logs have been securely archived. Diagnostic stream offline.
          </p>
          <button
            onClick={() => {
              setIsShutdown(false);
              setPath([]);
              setAccDistanceKm(0);
              setAccDurationSec(0);
              setMaxSpeedKmh(0);
              setTrackingMode('idle');
              setSystemLogs(prev => [...prev.slice(-3), 'SYSTEM REBOOT COMPLETE', 'TELEMETRY RE-ESTABLISHED']);
            }}
            className="mt-8 px-6 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-2xs uppercase tracking-widest rounded shadow-lg shadow-rose-900/30 transition-all border border-rose-500"
          >
            Power Cycle & Restart Link
          </button>
        </div>
      )}

      {/* ==================== THEME HEADER ==================== */}
      <header className="h-14 flex items-center justify-between px-4 sm:px-6 bg-[#16181d] border-b border-[#2d3139] shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center font-bold text-white shadow-lg shadow-blue-900/20 text-xs font-mono">LT</div>
          <h1 className="text-sm font-semibold tracking-tight text-slate-100 flex items-center gap-2">
            LOCATE.OS <span className="text-[9px] font-mono text-slate-500 bg-slate-800/40 px-1.5 py-0.5 rounded border border-[#2d3139]">V4.2.0-STABLE</span>
          </h1>
        </div>
        
        {/* Header Telemetry Pill Tags */}
        <div className="flex items-center gap-4 sm:gap-6">
          <div className="hidden md:flex gap-4 text-[10px] font-mono text-slate-400">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${trackingMode === 'recording' ? 'bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-650'}`}></span>
              {trackingMode === 'recording' ? 'ACTIVE STREAMING' : trackingMode === 'paused' ? 'PAUSED' : 'RECEIVER STANDBY'}
            </div>
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${sourceMode === 'simulation' ? 'bg-emerald-500' : 'bg-blue-500'}`}></span>
              {sourceMode === 'simulation' ? 'SIMULATOR ATTACHED' : 'LIVE RECEIVER CONNECTED'}
            </div>
          </div>
          <div className="h-8 w-px bg-slate-800 hidden md:block"></div>
          <div className="text-xs text-slate-400 font-mono">
            {new Date().toISOString().split('T')[1].slice(0, 8)} UTC
          </div>
        </div>
      </header>

      {/* ==================== TWO-COLUMN SPLIT ==================== */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* ==================== LEFT SIDEBAR ==================== */}
        <aside className="w-full md:w-[400px] h-full flex flex-col bg-[#111318] border-r border-[#2d3139] shrink-0 z-30 relative shadow-2xl">
          
          {/* Unit Toggle & Settings bar */}
          <div className="p-3 border-b border-[#2d3139] bg-[#16181d] flex items-center justify-between font-mono">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">CONTROL CONSOLE</span>
            <button
              onClick={() => setUseImperial(p => !p)}
              className="px-2.5 py-1 bg-[#1c1f26] border border-[#2d3139] text-slate-300 text-[9px] font-bold rounded hover:bg-[#22272e] transition-colors"
              title="Toggle Units"
            >
              {useImperial ? 'IMPERIAL: MI / MPH' : 'METRIC: KM / KMH'}
            </button>
          </div>

          {/* Global Signal Source Switch */}
          <div className="p-3 bg-[#111318] border-b border-[#2d3139] grid grid-cols-2 gap-2 font-mono">
            <button
              onClick={() => {
                handleSourceModeChange('simulation');
                setSystemLogs(prev => [...prev.slice(-3), 'SIGNAL SOURCE: SIMULATION']);
              }}
              className={`flex items-center justify-center gap-1.5 py-1.5 px-3 rounded border text-[10px] font-bold transition-colors ${
                sourceMode === 'simulation'
                  ? 'bg-[#22272e] border-emerald-500/50 text-emerald-400 font-bold border-l-4 border-l-emerald-500'
                  : 'bg-[#1c1f26] border-[#2d3139] text-slate-500 hover:text-slate-400'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Simulation Mode
            </button>
            <button
              onClick={() => {
                handleSourceModeChange('gps');
                setSystemLogs(prev => [...prev.slice(-3), 'SIGNAL SOURCE: HARDWARE GPS']);
              }}
              className={`flex items-center justify-center gap-1.5 py-1.5 px-3 rounded border text-[10px] font-bold transition-colors ${
                sourceMode === 'gps'
                  ? 'bg-[#22272e] border-blue-500/50 text-blue-400 font-bold border-l-4 border-l-blue-500'
                  : 'bg-[#1c1f26] border-[#2d3139] text-slate-500 hover:text-slate-400'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              Live GPS Watch
            </button>
          </div>

          {/* Navigation Tabs Bar */}
          <div className="grid grid-cols-4 border-b border-[#2d3139] bg-[#16181d] text-[10px] font-mono font-bold text-center select-none shrink-0">
            <button
              onClick={() => { setCurrentTab('tracker'); setPreviewTripId(null); }}
              className={`py-3 transition-colors relative ${
                currentTab === 'tracker' ? 'text-blue-400 font-extrabold bg-[#111318]' : 'text-slate-450 hover:text-slate-200'
              }`}
            >
              Console
              {currentTab === 'tracker' && <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-blue-500"></span>}
            </button>
            <button
              onClick={() => { setCurrentTab('simulation'); setPreviewTripId(null); }}
              className={`py-3 transition-colors relative ${
                currentTab === 'simulation' ? 'text-emerald-400 font-extrabold bg-[#111318]' : 'text-slate-450 hover:text-slate-200'
              }`}
            >
              Playground
              {currentTab === 'simulation' && <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-emerald-500"></span>}
            </button>
            <button
              onClick={() => { setCurrentTab('share'); setPreviewTripId(null); }}
              className={`py-3 transition-colors relative ${
                currentTab === 'share' ? 'text-sky-400 font-extrabold bg-[#111318]' : 'text-slate-450 hover:text-slate-200'
              }`}
            >
              Live Share
              {currentTab === 'share' && <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-sky-500"></span>}
            </button>
            <button
              onClick={() => { setCurrentTab('history'); }}
              className={`py-3 transition-colors relative ${
                currentTab === 'history' ? 'text-rose-400 font-extrabold bg-[#111318]' : 'text-slate-450 hover:text-slate-200'
              }`}
            >
              History
              {currentTab === 'history' && <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-rose-500"></span>}
            </button>
          </div>

          {/* ==================== ACTIVE SIDE PANEL CONTENT ==================== */}
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 bg-[#111318]">
            
            {/* TAB 1: TRACKING CONSOLE */}
            {currentTab === 'tracker' && (
              <div className="flex flex-col gap-4 animate-fadeIn">
                
                {/* Transport Activity Selector */}
                <div className="flex flex-col gap-1.5 font-mono">
                  <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest px-0.5">Activity Profile</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => { setTravelMode('walk'); setSystemLogs(prev => [...prev.slice(-3), 'PROFILE MOVED: WALKING']); }}
                      className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded border text-[10px] font-bold transition-colors ${
                        travelMode === 'walk'
                          ? 'bg-[#22272e] border-amber-500/40 text-amber-400 border-l-2 border-l-amber-500'
                          : 'bg-[#1c1f26] border-[#2d3139] text-slate-400 hover:bg-[#22272e]'
                      }`}
                    >
                      <Footprints className="w-3.5 h-3.5" />
                      Walking
                    </button>
                    <button
                      onClick={() => { setTravelMode('bike'); setSystemLogs(prev => [...prev.slice(-3), 'PROFILE MOVED: CYCLING']); }}
                      className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded border text-[10px] font-bold transition-colors ${
                        travelMode === 'bike'
                          ? 'bg-[#22272e] border-emerald-500/40 text-emerald-400 border-l-2 border-l-emerald-500'
                          : 'bg-[#1c1f26] border-[#2d3139] text-slate-400 hover:bg-[#22272e]'
                      }`}
                    >
                      <Bike className="w-3.5 h-3.5" />
                      Cycling
                    </button>
                    <button
                      onClick={() => { setTravelMode('drive'); setSystemLogs(prev => [...prev.slice(-3), 'PROFILE MOVED: DRIVING']); }}
                      className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded border text-[10px] font-bold transition-colors ${
                        travelMode === 'drive'
                          ? 'bg-[#22272e] border-sky-500/40 text-sky-400 border-l-2 border-l-sky-500'
                          : 'bg-[#1c1f26] border-[#2d3139] text-slate-400 hover:bg-[#22272e]'
                      }`}
                    >
                      <Car className="w-3.5 h-3.5" />
                      Driving
                    </button>
                  </div>
                </div>

                {/* Speedometer Gauge Display */}
                <div className="bg-[#1c1f26] border border-[#2d3139] rounded p-4 flex flex-col items-center">
                  <Speedometer
                    currentSpeedKmh={(currentPoint?.speed || 0) * 3.6}
                    maxSpeedKmh={maxSpeedKmh}
                    useImperial={useImperial}
                  />
                </div>

                {/* Accumulator Stat Box Grid */}
                <StatsGrid
                  distanceKm={accDistanceKm}
                  durationSec={accDurationSec}
                  avgSpeedKmh={activeAvgSpeed}
                  maxSpeedKmh={maxSpeedKmh}
                  currentAltitude={currentPoint?.altitude || null}
                  heading={currentPoint?.speed ? 180 : null}
                  accuracy={currentPoint?.accuracy || null}
                  travelMode={travelMode}
                  useImperial={useImperial}
                />

                {/* External Google Maps Link Card */}
                {currentPoint && (
                  <div className="bg-[#1c1f26] border border-[#2d3139] rounded p-3 font-mono flex flex-col gap-2">
                    <div className="flex items-center justify-between text-[9px] font-bold text-slate-500 uppercase tracking-widest border-b border-[#2d3139]/55 pb-1.5">
                      <span className="flex items-center gap-1.5 text-blue-400">
                        <MapIcon className="w-3 h-3 text-blue-500" />
                        Google Maps Integration
                      </span>
                      <span className="text-[8px] bg-blue-950 text-blue-400 px-1.5 py-0.5 rounded font-extrabold uppercase tracking-wide">Live Linked</span>
                    </div>
                    
                    <div className="flex flex-col gap-1 text-[10px] text-slate-400">
                      <div className="flex justify-between">
                        <span>Target Coords:</span>
                        <span className="font-bold text-slate-200">
                          {currentPoint.lat.toFixed(6)}°N, {currentPoint.lng.toFixed(6)}°E
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Region Anchor:</span>
                        <span className="text-slate-350 font-bold">India Map Grid</span>
                      </div>
                    </div>

                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${currentPoint.lat},${currentPoint.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full flex items-center justify-center gap-2 py-2 bg-gradient-to-r from-blue-700 to-indigo-800 hover:from-blue-600 hover:to-indigo-700 font-bold text-[10px] text-white rounded transition-all uppercase tracking-widest border border-blue-500/30 text-center"
                    >
                      <Compass className="w-3.5 h-3.5 animate-pulse" />
                      View Live on Google Maps
                    </a>
                  </div>
                )}

                {/* Record Actions Bar */}
                <div className="flex flex-col gap-2 mt-2 font-mono">
                  {trackingMode === 'idle' ? (
                    <button
                      onClick={() => {
                        handleStartTracking();
                        setSystemLogs(prev => [...prev.slice(-3), 'RECEIVER ATTACHED', 'DATA STREAM INITIATED']);
                      }}
                      className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-500 font-bold text-2xs text-slate-100 rounded transition-all uppercase tracking-widest shadow-lg shadow-blue-900/20 border border-blue-500"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      Start GPS Session
                    </button>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <div className="flex gap-2">
                        {trackingMode === 'recording' ? (
                          <button
                            onClick={() => {
                              handlePauseTracking();
                              setSystemLogs(prev => [...prev.slice(-3), 'STREAM PAUSED']);
                            }}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-[#1c1f26] hover:bg-[#22272e] font-semibold text-2xs rounded border border-[#2d3139] transition-colors text-slate-300 uppercase tracking-widest"
                          >
                            <Pause className="w-4 h-4 fill-current" />
                            Pause
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              handleResumeTracking();
                              setSystemLogs(prev => [...prev.slice(-3), 'STREAM RESUMED']);
                            }}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-blue-600 hover:bg-blue-500 font-semibold text-2xs rounded transition-colors text-slate-100 uppercase tracking-widest"
                          >
                            <Play className="w-4 h-4 fill-current" />
                            Resume
                          </button>
                        )}
                        
                        <button
                          onClick={() => {
                            handleStopAndSaveTracking();
                            setSystemLogs(prev => [...prev.slice(-3), 'STREAM CLOSED', 'LOG STORED']);
                          }}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-rose-600 hover:bg-rose-500 font-semibold text-2xs text-slate-100 rounded transition-colors uppercase tracking-widest border border-rose-500"
                        >
                          <Square className="w-3.5 h-3.5 fill-current" />
                          Finish & Save
                        </button>
                      </div>

                      <button
                        onClick={() => {
                          handleReset();
                          setSystemLogs(prev => [...prev.slice(-3), 'STATE FLUSHED', 'READY']);
                        }}
                        className="w-full flex items-center justify-center gap-1 py-1.5 bg-[#16181d] hover:bg-rose-950/20 hover:text-rose-400 text-3xs rounded border border-[#2d3139] text-slate-500 transition-colors"
                      >
                        <RotateCcw className="w-3 h-3" />
                        Reset Recording State
                      </button>
                    </div>
                  )}
                </div>

              </div>
            )}

            {/* TAB 2: PATH PLAYGROUND */}
            {currentTab === 'simulation' && (
              <div className="flex flex-col gap-4 animate-fadeIn">
                <SimulationControls
                  currentPresetId={simPresetId}
                  onSelectPreset={handleSelectPreset}
                  isDrawingMode={isDrawingMode}
                  onToggleDrawingMode={() => setIsDrawingMode(p => !p)}
                  onClearCustomRoute={() => { setCustomWaypoints([]); setSimPresetId(null); }}
                  customWaypointsCount={customWaypoints.length}
                  onGPXImported={handleGPXImported}
                  onStartSimulation={handleStartCustomRouteSimulation}
                  onStopSimulation={handleStopAndSaveTracking}
                  isSimulating={trackingMode === 'recording' && sourceMode === 'simulation'}
                  speedMultiplier={speedMultiplier}
                  onChangeSpeedMultiplier={setSpeedMultiplier}
                />

                {customWaypoints.length >= 2 && (
                  <button
                    onClick={handleStartCustomRouteSimulation}
                    className="w-full mt-2 flex items-center justify-center gap-2 py-2.5 bg-amber-500 hover:bg-amber-400 font-bold text-xs text-slate-900 rounded transition-colors uppercase tracking-widest"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    Simulate Custom Drawn Route
                  </button>
                )}
              </div>
            )}

            {/* TAB 3: LIVE BROADCAST ROOM */}
            {currentTab === 'share' && (
              <div className="flex flex-col gap-4 animate-fadeIn">
                <ShareCodePanel
                  roomCode={roomCode}
                  onCreateRoom={setRoomCode}
                  onJoinRoom={setRoomCode}
                  onLeaveRoom={() => setRoomCode(null)}
                  sharedDevices={sharedDevices}
                  onFocusDevice={(d) => {
                    setFocusLocation({ lat: d.lat, lng: d.lng, trigger: Date.now() });
                    setAutoCenter(false);
                  }}
                  cellularTargets={cellularTargets}
                  onLocateNumber={handleLocatePhoneNumber}
                  onRemoveCellularTarget={handleRemoveCellularTarget}
                />
              </div>
            )}

            {/* TAB 4: TRACKING HISTORY & PREVIEWS */}
            {currentTab === 'history' && (
              <div className="flex flex-col gap-4 animate-fadeIn">
                <PastTripsPanel
                  trips={trips}
                  onDeleteTrip={deleteTrip}
                  useImperial={useImperial}
                  onHoverPoint={setHoveredChartPoint}
                  onPreviewTripOnMap={(trip) => setPreviewTripId(trip ? trip.id : null)}
                  previewTripId={previewTripId}
                />
              </div>
            )}

          </div>

          {/* System status display at bottom of sidebar */}
          <div className="h-12 border-t border-[#2d3139] px-4 bg-[#16181d] flex items-center justify-between shrink-0 font-mono text-[10px]">
            <span className="font-bold text-slate-500 uppercase tracking-widest">
              CONSOLE LINK: {trackingMode === 'recording' ? 'ACTIVE' : 'NOMINAL'}
            </span>
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${trackingMode === 'recording' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse' : 'bg-emerald-400'}`}></span>
            </div>
          </div>

        </aside>

        {/* ==================== RIGHT VIEWPORT (MAP + LIVE TELEMETRY DASHBOARD) ==================== */}
        <main className="flex-1 flex flex-col relative bg-[#0a0b0e] overflow-hidden">
          
          {/* Map Layer takes top block */}
          <div className="flex-1 relative overflow-hidden min-h-[300px]">
            
            {/* Map Element DOM */}
            <InteractiveMap
              currentPoint={currentPoint}
              path={path}
              sourceMode={sourceMode}
              autoCenter={autoCenter}
              setAutoCenter={setAutoCenter}
              mapTheme={mapTheme}
              isDrawingMode={isDrawingMode}
              customWaypoints={customWaypoints}
              setCustomWaypoints={setCustomWaypoints}
              allTrackedDevices={allTrackedDevices}
              previewTripId={previewTripId}
              trips={trips}
              hoveredChartPoint={hoveredChartPoint}
              focusLocation={focusLocation}
            />

            {/* Floating Top Left overlay bar on Map */}
            <div className="absolute top-4 left-4 z-20 flex flex-col sm:flex-row gap-2 pointer-events-none select-none">
              
              {/* Receiver Status Capsule */}
              <div className="px-3 py-2 bg-[#1c1f26]/95 backdrop-blur border border-[#2d3139] rounded flex items-center gap-2.5 shadow-2xl pointer-events-auto font-mono text-[9px]">
                <span className="relative flex h-2 w-2">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${trackingMode === 'recording' ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
                  <span className={`relative inline-flex rounded-full h-2 w-2 ${trackingMode === 'recording' ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                </span>
                <div className="flex flex-col">
                  <span className="font-bold text-slate-300">
                    {trackingMode === 'recording' ? 'DATA STREAM INGESTION' : trackingMode === 'paused' ? 'STREAM PAUSED' : 'RECEIVER LINK READY'}
                  </span>
                  <span className="text-slate-500 text-[8px] uppercase">
                    Port: Standard / GPS: {sourceMode === 'gps' ? 'Device' : 'Simulated'}
                  </span>
                </div>
              </div>

              {/* Current coordinates Widget */}
              {currentPoint && (
                <div className="px-3 py-2 bg-[#1c1f26]/95 backdrop-blur border border-[#2d3139] rounded flex items-center gap-2 shadow-2xl font-mono text-[9px] text-slate-300 pointer-events-auto">
                  <MapPin className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <span>
                    LAT: {currentPoint.lat.toFixed(5)}°N
                  </span>
                  <span className="text-slate-650">/</span>
                  <span>
                    LNG: {currentPoint.lng.toFixed(5)}°W
                  </span>
                  <span className="text-slate-650">/</span>
                  <span className="text-emerald-400 font-bold">
                    ALT: {currentPoint.altitude ? `${Math.round(currentPoint.altitude)}m` : 'N/A'}
                  </span>
                </div>
              )}

            </div>

            {/* Floating Map controllers (Top Right) */}
            <div className="absolute top-4 right-4 z-20 flex flex-col gap-2 pointer-events-auto font-mono">
              
              {/* Lock Center Toggle */}
              <button
                onClick={() => setAutoCenter(p => !p)}
                className={`p-2.5 rounded border shadow-2xl transition-colors flex items-center justify-center ${
                  autoCenter 
                    ? 'bg-blue-600 text-white border-blue-500' 
                    : 'bg-[#1c1f26]/95 text-slate-400 border-[#2d3139] hover:text-slate-200 hover:bg-[#22272e]'
                }`}
                title={autoCenter ? "Auto Center Enabled" : "Auto Center Disabled"}
              >
                {autoCenter ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
              </button>

              {/* Locate Me GPS Request Button */}
              <button
                onClick={requestLiveLocation}
                disabled={isLocating}
                className={`p-2.5 rounded border shadow-2xl transition-all flex items-center justify-center bg-[#1c1f26]/95 border-[#2d3139] hover:bg-[#22272e] ${
                  isLocating ? 'text-blue-400 border-blue-500/50' : 'text-slate-400'
                }`}
                title="Locate Me (Request Live GPS)"
              >
                <Navigation className={`w-4 h-4 ${isLocating ? 'animate-pulse text-blue-400' : ''}`} />
              </button>

              {/* Map theme skins select popover */}
              <div className="relative group">
                <button
                  className="p-2.5 bg-[#1c1f26]/95 border border-[#2d3139] rounded shadow-2xl text-slate-400 hover:text-slate-200 hover:bg-[#22272e] flex items-center justify-center"
                  title="Change Map Styling Skin"
                >
                  <Palette className="w-4 h-4" />
                </button>
                <div className="hidden group-hover:flex group-focus-within:flex flex-col absolute right-0 top-11 bg-[#16181d] border border-[#2d3139] p-1.5 rounded shadow-2xl min-w-[130px] gap-1 animate-fadeIn text-[9px]">
                  <span className="font-bold text-slate-500 uppercase tracking-widest text-center py-1 border-b border-[#2d3139]">Console Skin</span>
                  <button
                    onClick={() => setMapTheme('dark')}
                    className={`text-left font-bold py-1 px-2.5 rounded transition-all ${mapTheme === 'dark' ? 'bg-[#22272e] text-blue-400 border-l-2 border-l-blue-500' : 'text-slate-400 hover:bg-[#1c1f26]'}`}
                  >
                    Charcoal Dark
                  </button>
                  <button
                    onClick={() => setMapTheme('midnight')}
                    className={`text-left font-bold py-1 px-2.5 rounded transition-all ${mapTheme === 'midnight' ? 'bg-[#22272e] text-blue-400 border-l-2 border-l-blue-500' : 'text-slate-400 hover:bg-[#1c1f26]'}`}
                  >
                    Midnight Neo
                  </button>
                  <button
                    onClick={() => setMapTheme('retro')}
                    className={`text-left font-bold py-1 px-2.5 rounded transition-all ${mapTheme === 'retro' ? 'bg-[#22272e] text-blue-400 border-l-2 border-l-blue-500' : 'text-slate-400 hover:bg-[#1c1f26]'}`}
                  >
                    Retro Sand
                  </button>
                  <button
                    onClick={() => setMapTheme('silver')}
                    className={`text-left font-bold py-1 px-2.5 rounded transition-all ${mapTheme === 'silver' ? 'bg-[#22272e] text-blue-400 border-l-2 border-l-blue-500' : 'text-slate-400 hover:bg-[#1c1f26]'}`}
                  >
                    Silver Muted
                  </button>
                  <button
                    onClick={() => setMapTheme('light')}
                    className={`text-left font-bold py-1 px-2.5 rounded transition-all ${mapTheme === 'light' ? 'bg-[#22272e] text-blue-400 border-l-2 border-l-blue-500' : 'text-slate-400 hover:bg-[#1c1f26]'}`}
                  >
                    Standard Map
                  </button>
                </div>
              </div>

            </div>

            {/* Quick floating active stats on bottom of map */}
            {trackingMode === 'recording' && (
              <div className="absolute bottom-4 left-4 z-20 px-3 py-2 bg-[#1c1f26]/95 border border-[#2d3139] rounded flex items-center gap-4 shadow-2xl select-none animate-fadeIn font-mono text-[9px]">
                <div className="flex flex-col">
                  <span className="text-slate-500 text-[8px] uppercase">Rec Distance</span>
                  <span className="font-bold text-blue-400">{formatDistance(accDistanceKm, useImperial)}</span>
                </div>
                <div className="h-6 w-px bg-slate-800"></div>
                <div className="flex flex-col">
                  <span className="text-slate-500 text-[8px] uppercase">Receiver Clock</span>
                  <span className="font-bold text-emerald-400">{formatDuration(accDurationSec)}</span>
                </div>
                <div className="h-6 w-px bg-slate-800"></div>
                <div className="flex flex-col">
                  <span className="text-slate-500 text-[8px] uppercase">Instant Speed</span>
                  <span className="font-bold text-slate-200">{formatSpeed((currentPoint?.speed || 0) * 3.6, useImperial)}</span>
                </div>
              </div>
            )}

          </div>

          {/* ==================== TELEMETRY BOTTOM DASHBOARD PANEL ==================== */}
          <div className="h-64 sm:h-52 bg-[#111318] border-t border-[#2d3139] flex flex-col sm:flex-row p-4 sm:p-5 gap-5 sm:gap-6 overflow-y-auto shrink-0 z-20 font-mono">
            
            {/* Identity Capsule */}
            <div className="flex flex-col gap-3 w-full sm:w-64 shrink-0 justify-between">
              <div>
                <h2 className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-2">Live Telemetry</h2>
                <div className="text-base font-extrabold text-slate-100 uppercase tracking-tight line-clamp-1">{activeUnitName}</div>
                <span className="text-[9px] text-slate-500">Receiver status nominal</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2 bg-[#1c1f26] border border-[#2d3139] rounded">
                  <div className="text-[8px] text-slate-500 uppercase mb-0.5">Battery</div>
                  <div className="text-sm font-bold text-emerald-400">92%</div>
                </div>
                <div className="p-2 bg-[#1c1f26] border border-[#2d3139] rounded">
                  <div className="text-[8px] text-slate-500 uppercase mb-0.5">Signal Strength</div>
                  <div className="text-sm font-bold text-blue-400">{sourceMode === 'gps' ? '-54 dBm' : '-41 dBm'}</div>
                </div>
              </div>
            </div>

            {/* Separation Vertical Divider */}
            <div className="hidden sm:block h-full w-px bg-slate-800"></div>

            {/* Trajectory Stream Panel */}
            <div className="flex-1 flex flex-col gap-2.5 min-w-[200px]">
              <div className="flex justify-between items-center">
                <h2 className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em]">Trajectory Stream</h2>
                <span className="text-[8px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded border border-[#2d3139]">Real-Time Feed</span>
              </div>

              {/* Trajectory Graph Area */}
              <div className="flex-1 border border-[#2d3139]/70 rounded bg-[#0b0c10] p-2 relative flex items-center justify-center overflow-hidden">
                {sparklinePoints.length >= 2 ? (
                  <div className="w-full h-full relative">
                    <svg className="w-full h-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="glowSparklineGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="rgb(59, 130, 246)" stopOpacity="0.25" />
                          <stop offset="100%" stopColor="rgb(59, 130, 246)" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      <path
                        d={`M 0 100 ${sparklinePoints.map(p => `L ${p.x} ${p.y}`).join(' ')} L 100 100 Z`}
                        fill="url(#glowSparklineGrad)"
                      />
                      <path
                        d={sparklinePoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')}
                        fill="none"
                        stroke="#3b82f6"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-1.5 opacity-50">
                    <div className="flex gap-1 items-end h-8">
                      <div className="w-1 bg-blue-500 h-2 animate-pulse"></div>
                      <div className="w-1 bg-blue-500 h-4 animate-pulse" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-1 bg-blue-500 h-6 animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                      <div className="w-1 bg-blue-500 h-3 animate-pulse" style={{ animationDelay: '0.3s' }}></div>
                      <div className="w-1 bg-blue-500 h-5 animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                    </div>
                    <span className="text-[8px] text-slate-500 uppercase tracking-widest text-center">Standby / Awaiting Coordinates</span>
                  </div>
                )}
              </div>
              <div className="flex justify-between text-[8px] text-slate-600">
                <span>00:00</span>
                <span>Active Track Speed Profile</span>
                <span className="text-blue-500 font-bold">{new Date().toISOString().split('T')[1].slice(0, 8)}</span>
              </div>
            </div>

            {/* Separation Vertical Divider */}
            <div className="hidden sm:block h-full w-px bg-slate-800"></div>

            {/* System Flags Panel */}
            <div className="w-full sm:w-64 shrink-0 flex flex-col gap-3 justify-between">
              <div>
                <h2 className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-2">System Flags</h2>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[10px] py-0.5 border-b border-slate-800">
                    <span className="text-slate-400">Encryption (AES-256)</span>
                    <span className="text-emerald-500 font-bold uppercase text-[8px]">Secure</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] py-0.5 border-b border-slate-800">
                    <span className="text-slate-400">G-Fence Boundary</span>
                    <span className="text-emerald-500 font-bold uppercase text-[8px]">Nominal</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] py-0.5">
                    <span className="text-slate-400">Speed Flag</span>
                    <span className={`font-bold uppercase text-[8px] ${(currentPoint?.speed || 0) * 3.6 > 80 ? 'text-rose-500 animate-pulse' : 'text-emerald-500'}`}>
                      {(currentPoint?.speed || 0) * 3.6 > 80 ? 'OVERSPEED' : 'NOMINAL'}
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  setIsShutdown(true);
                  setSystemLogs(prev => [...prev.slice(-3), 'CRITICAL: REMOTE SHUTDOWN SIGNAL SENT']);
                }}
                className="w-full bg-rose-600 hover:bg-rose-500 text-white font-bold text-[9px] py-2 rounded shadow-lg shadow-rose-900/30 uppercase tracking-widest transition-colors border border-rose-500 shrink-0"
              >
                Remote Shutdown Receiver
              </button>
            </div>

          </div>

        </main>

      </div>

      {/* ==================== FLOATING SAFE TOAST NOTIFICATIONS ==================== */}
      {toastMessage && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] px-4 py-3 bg-[#16181d] border border-amber-500/50 text-slate-100 rounded-lg shadow-2xl font-mono text-xs flex items-center gap-3 animate-fadeIn backdrop-blur-md max-w-sm">
          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
          <span>{toastMessage}</span>
          <button 
            onClick={() => setToastMessage(null)} 
            className="ml-auto text-slate-500 hover:text-slate-300 font-bold px-1.5 py-0.5 rounded"
          >
            ×
          </button>
        </div>
      )}

      {/* ==================== CUSTOM MODAL: SAVE TRIP ==================== */}
      {saveTripDialog && (
        <div className="fixed inset-0 bg-[#060709]/85 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 font-mono">
          <div className="bg-[#1c1f26] border border-[#2d3139] rounded-xl shadow-2xl max-w-md w-full p-6 flex flex-col gap-5 animate-scaleUp">
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">RECEIVER STORAGE SUCCESS</span>
              <h3 className="text-sm font-extrabold text-slate-100">Save Location Tracking Session</h3>
            </div>
            
            <div className="flex flex-col gap-2">
              <label className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">Session Name</label>
              <input
                id="custom-trip-name-input"
                type="text"
                defaultValue={saveTripDialog.defaultName}
                placeholder="Enter custom trip name..."
                className="w-full bg-[#0b0c10] border border-[#2d3139] rounded-lg px-3 py-2.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500/40"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const val = (document.getElementById('custom-trip-name-input') as HTMLInputElement)?.value;
                    saveTripDialog.onConfirm(val);
                  }
                }}
              />
            </div>

            <div className="flex gap-3 justify-end mt-2">
              <button
                onClick={() => setSaveTripDialog(null)}
                className="px-4 py-2 bg-transparent text-slate-400 hover:text-slate-200 text-xs font-semibold rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const val = (document.getElementById('custom-trip-name-input') as HTMLInputElement)?.value;
                  saveTripDialog.onConfirm(val);
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-slate-100 text-xs font-bold rounded-lg transition-colors border border-emerald-500 shadow-lg shadow-emerald-900/20"
              >
                Save Track Log
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== CUSTOM MODAL: CONFIRM ACTION ==================== */}
      {confirmDialog && (
        <div className="fixed inset-0 bg-[#060709]/85 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 font-mono">
          <div className="bg-[#1c1f26] border border-[#2d3139] rounded-xl shadow-2xl max-w-sm w-full p-6 flex flex-col gap-4 animate-scaleUp">
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] text-rose-400 font-bold uppercase tracking-widest">CONFIRM OPERATION</span>
              <h3 className="text-sm font-extrabold text-slate-100">Are you sure?</h3>
            </div>
            
            <p className="text-xs text-slate-400 leading-relaxed">
              {confirmDialog.message}
            </p>

            <div className="flex gap-3 justify-end mt-2">
              <button
                onClick={() => setConfirmDialog(null)}
                className="px-4 py-2 bg-transparent text-slate-400 hover:text-slate-200 text-xs font-semibold rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDialog.onConfirm}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-slate-100 text-xs font-bold rounded-lg transition-colors border border-rose-500 shadow-lg shadow-rose-900/20"
              >
                Confirm Discard
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
