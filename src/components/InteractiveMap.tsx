import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as L from 'leaflet';
import { APIProvider, Map, AdvancedMarker, InfoWindow, useMap } from '@vis.gl/react-google-maps';
import { MAP_STYLES } from '../mapStyles';
import { PositionPoint, SourceMode, MapTheme, Trip } from '../types';

// Polyline component for Google Maps
export function Polyline({ path, color = '#3b82f6', weight = 5, opacity = 0.85, isDashed = false }: {
  path: google.maps.LatLngLiteral[];
  color?: string;
  weight?: number;
  opacity?: number;
  isDashed?: boolean;
}) {
  const map = useMap();
  const polylineRef = useRef<google.maps.Polyline | null>(null);

  useEffect(() => {
    if (!map) return;

    const options: google.maps.PolylineOptions = {
      path,
      geodesic: true,
      strokeColor: color,
      strokeOpacity: isDashed ? 0 : opacity,
      strokeWeight: weight,
    };

    if (isDashed) {
      options.icons = [{
        icon: {
          path: 'M 0,-1 0,1',
          strokeOpacity: opacity,
          scale: 2,
          strokeWeight: weight
        },
        offset: '0',
        repeat: '10px'
      }];
    }

    const polyline = new google.maps.Polyline(options);
    polyline.setMap(map);
    polylineRef.current = polyline;

    return () => {
      polyline.setMap(null);
    };
  }, [map, path, color, weight, opacity, isDashed]);

  return null;
}

// Inner map handler component to reactively pan, zoom, fit bounds (Google Maps)
function MapEventHandler({
  currentPoint,
  autoCenter,
  previewTripId,
  trips,
  hoveredChartPoint,
  focusLocation
}: {
  currentPoint: PositionPoint | null;
  autoCenter: boolean;
  previewTripId: string | null;
  trips: Trip[];
  hoveredChartPoint: PositionPoint | null;
  focusLocation: { lat: number; lng: number; trigger: number } | null;
}) {
  const map = useMap();

  // Handle focusLocation centering
  useEffect(() => {
    if (map && focusLocation) {
      map.panTo({ lat: focusLocation.lat, lng: focusLocation.lng });
      map.setZoom(15);
    }
  }, [map, focusLocation]);

  // Handle active user auto-centering
  useEffect(() => {
    if (map && currentPoint && autoCenter) {
      map.panTo({ lat: currentPoint.lat, lng: currentPoint.lng });
    }
  }, [map, currentPoint, autoCenter]);

  // Handle historical trip fitBounds previewing
  useEffect(() => {
    if (!map || !previewTripId) return;
    const trip = trips.find(t => t.id === previewTripId);
    if (!trip || trip.path.length < 2) return;

    const bounds = new google.maps.LatLngBounds();
    trip.path.forEach(pt => {
      bounds.extend({ lat: pt.lat, lng: pt.lng });
    });
    map.fitBounds(bounds, 50); // with 50px padding
  }, [map, previewTripId, trips]);

  // Handle graph chart hover spot focus
  useEffect(() => {
    if (map && hoveredChartPoint) {
      map.panTo({ lat: hoveredChartPoint.lat, lng: hoveredChartPoint.lng });
    }
  }, [map, hoveredChartPoint]);

  return null;
}

interface InteractiveMapProps {
  currentPoint: PositionPoint | null;
  path: PositionPoint[];
  sourceMode: SourceMode;
  autoCenter: boolean;
  setAutoCenter: (val: boolean) => void;
  mapTheme: MapTheme;
  isDrawingMode: boolean;
  customWaypoints: [number, number][];
  setCustomWaypoints: React.Dispatch<React.SetStateAction<[number, number][]>>;
  allTrackedDevices: any[];
  previewTripId: string | null;
  trips: Trip[];
  hoveredChartPoint: PositionPoint | null;
  focusLocation: { lat: number; lng: number; trigger: number } | null;
}

export default function InteractiveMap({
  currentPoint,
  path,
  sourceMode,
  autoCenter,
  setAutoCenter,
  mapTheme,
  isDrawingMode,
  customWaypoints,
  setCustomWaypoints,
  allTrackedDevices,
  previewTripId,
  trips,
  hoveredChartPoint,
  focusLocation,
}: InteractiveMapProps) {

  const [selectedDevice, setSelectedDevice] = useState<any | null>(null);

  const API_KEY =
    process.env.GOOGLE_MAPS_PLATFORM_KEY ||
    (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
    (globalThis as any).GOOGLE_MAPS_PLATFORM_KEY ||
    '';

  const hasValidKey = Boolean(API_KEY) && API_KEY !== 'YOUR_API_KEY';

  // Format paths to Google LatLng literals
  const activeGooglePath = useMemo(() => {
    return path.map(pt => ({ lat: pt.lat, lng: pt.lng }));
  }, [path]);

  const customWaypointsGooglePath = useMemo(() => {
    return customWaypoints.map(pt => ({ lat: pt[0], lng: pt[1] }));
  }, [customWaypoints]);

  const previewGooglePath = useMemo(() => {
    if (!previewTripId) return [];
    const trip = trips.find(t => t.id === previewTripId);
    if (!trip) return [];
    return trip.path.map(pt => ({ lat: pt.lat, lng: pt.lng }));
  }, [previewTripId, trips]);

  // ==================== LEAFLET MAP ELEMENT STATE & HOOKS ====================
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  const userMarkerRef = useRef<L.Marker | null>(null);
  const trailPolylineRef = useRef<L.Polyline | null>(null);
  const customRouteMarkersRef = useRef<L.Marker[]>([]);
  const customRoutePolylineRef = useRef<L.Polyline | null>(null);
  const previewPolylineRef = useRef<L.Polyline | null>(null);
  const hoveredPointMarkerRef = useRef<L.Marker | null>(null);
  const simulatedMarkersRef = useRef<{ [id: string]: L.Marker }>({});

  // 1. Initialize Leaflet Map
  useEffect(() => {
    if (hasValidKey || !mapContainerRef.current || leafletMapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: true
    }).setView([28.6129, 77.2295], 13); // Centered on India (New Delhi) by default

    leafletMapRef.current = map;

    // Add zoom control at bottom right
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, [hasValidKey]);

  // 2. Manage Dynamic Tile Themes
  useEffect(() => {
    const map = leafletMapRef.current;
    if (!map || hasValidKey) return;

    if (tileLayerRef.current) {
      tileLayerRef.current.remove();
    }

    let tileUrl = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
    let attribution = '© OpenStreetMap contributors © CartoDB';

    if (mapTheme === 'light' || mapTheme === 'silver') {
      tileUrl = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
    } else if (mapTheme === 'retro') {
      tileUrl = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
    }

    const layer = L.tileLayer(tileUrl, {
      maxZoom: 19,
      attribution
    }).addTo(map);

    tileLayerRef.current = layer;
  }, [mapTheme, hasValidKey]);

  // 3. User Current GPS / Sim Location Marker
  useEffect(() => {
    const map = leafletMapRef.current;
    if (!map || !currentPoint || hasValidKey) return;

    const { lat, lng } = currentPoint;
    const iconClass = sourceMode === 'gps' ? 'pulsing-gps-glow' : 'pulsing-sim-glow';
    
    // Create custom pulsing divIcon matching Tailwind style
    const customIcon = L.divIcon({
      className: 'custom-user-marker-wrapper',
      html: `<div class="${iconClass}" style="width: 14px; height: 14px;"></div>`,
      iconSize: [14, 14],
      iconAnchor: [7, 7]
    });

    if (userMarkerRef.current) {
      userMarkerRef.current.setLatLng([lat, lng]);
      userMarkerRef.current.setIcon(customIcon);
    } else {
      userMarkerRef.current = L.marker([lat, lng], { icon: customIcon }).addTo(map);
    }

    if (autoCenter) {
      map.panTo([lat, lng]);
    }
  }, [currentPoint, sourceMode, autoCenter, hasValidKey]);

  // 4. Trail Breadcrumbs Path
  useEffect(() => {
    const map = leafletMapRef.current;
    if (!map || hasValidKey) return;

    if (!trailPolylineRef.current) {
      trailPolylineRef.current = L.polyline([], {
        color: sourceMode === 'gps' ? '#3b82f6' : '#10b981',
        weight: 5,
        opacity: 0.85
      }).addTo(map);
    }

    const latLngs = path.map(pt => [pt.lat, pt.lng] as [number, number]);
    trailPolylineRef.current.setLatLngs(latLngs);
    trailPolylineRef.current.setStyle({
      color: sourceMode === 'gps' ? '#3b82f6' : '#10b981'
    });
  }, [path, sourceMode, hasValidKey]);

  // 5. Custom Drawn Waypoints
  useEffect(() => {
    const map = leafletMapRef.current;
    if (!map || hasValidKey) return;

    // Clear old route markers
    customRouteMarkersRef.current.forEach(m => m.remove());
    customRouteMarkersRef.current = [];

    // Clear old line
    if (customRoutePolylineRef.current) {
      customRoutePolylineRef.current.remove();
      customRoutePolylineRef.current = null;
    }

    if (customWaypoints.length === 0) return;

    customWaypoints.forEach((pt, idx) => {
      const ptIcon = L.divIcon({
        className: 'custom-waypoint',
        html: `<div class="w-5 h-5 rounded-full bg-amber-500 border border-white text-white font-mono text-[9px] font-bold flex items-center justify-center shadow-md select-none">${idx + 1}</div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      });

      const marker = L.marker(pt, { icon: ptIcon }).addTo(map);
      customRouteMarkersRef.current.push(marker);
    });

    if (customWaypoints.length >= 2) {
      customRoutePolylineRef.current = L.polyline(customWaypoints, {
        color: '#f59e0b',
        weight: 3.5,
        dashArray: '6, 8',
        opacity: 0.8
      }).addTo(map);
    }
  }, [customWaypoints, hasValidKey]);

  // 6. Map Clicks for drawing custom route builder
  useEffect(() => {
    const map = leafletMapRef.current;
    if (!map || hasValidKey) return;

    const handleMapClick = (e: L.LeafletMouseEvent) => {
      if (!isDrawingMode) return;
      const { lat, lng } = e.latlng;
      setCustomWaypoints(prev => [...prev, [lat, lng]]);
    };

    map.on('click', handleMapClick);
    return () => {
      map.off('click', handleMapClick);
    };
  }, [isDrawingMode, hasValidKey, setCustomWaypoints]);

  // 7. Tracked Cellular and Sim targets
  useEffect(() => {
    const map = leafletMapRef.current;
    if (!map || hasValidKey) return;

    // Remove obsolete device markers
    Object.keys(simulatedMarkersRef.current).forEach(id => {
      if (!allTrackedDevices.some(d => d.id === id)) {
        simulatedMarkersRef.current[id].remove();
        delete simulatedMarkersRef.current[id];
      }
    });

    // Spawn or update device markers
    allTrackedDevices.forEach(d => {
      const marker = simulatedMarkersRef.current[d.id];
      const isCell = d.id.startsWith('cell_');
      const colorClass = isCell ? 'bg-amber-500' : d.id === 'dev-emma' ? 'bg-pink-500' : d.id === 'dev-marcus' ? 'bg-emerald-500' : 'bg-blue-500';
      const pulseGlow = isCell ? 'shadow-amber-500/50' : d.id === 'dev-emma' ? 'shadow-pink-500/50' : d.id === 'dev-marcus' ? 'shadow-emerald-500/50' : 'shadow-blue-500/50';

      let popupText = `
        <div class="font-sans text-xs p-1" style="color:#1e293b;">
          <strong class="font-bold text-slate-900 block mb-0.5">${d.name}</strong>
          <p class="m-0 text-[11px]">Activity: ${d.role || 'Active'}</p>
          <p class="m-0 text-[11px]">Speed: ${d.speedKmh ? d.speedKmh.toFixed(1) : 0} km/h</p>
        </div>
      `;

      if (isCell && d.carrier) {
        popupText = `
          <div class="font-mono text-[10px] flex flex-col gap-1 p-1 text-slate-800">
            <span class="text-amber-600 font-bold text-xs uppercase tracking-wider block mb-0.5">${d.name}</span>
            <span>Carrier: <strong>${d.carrier}</strong></span>
            <span>Battery: <strong>${d.battery}%</strong></span>
            <span>Signal: <strong>${d.signalStrength}</strong></span>
            <span>Coords: <strong>${d.lat.toFixed(4)}, ${d.lng.toFixed(4)}</strong></span>
          </div>
        `;
      }

      if (marker) {
        marker.setLatLng([d.lat, d.lng]);
        marker.setPopupContent(popupText);
      } else {
        const deviceIcon = L.divIcon({
          className: `custom-device-wrapper-${d.id}`,
          html: `<div class="w-[14px] h-[14px] rounded-full border-2 border-white shadow-lg animate-pulse cursor-pointer ${colorClass} ${pulseGlow}"></div>`,
          iconSize: [14, 14],
          iconAnchor: [7, 7]
        });

        const newMarker = L.marker([d.lat, d.lng], { icon: deviceIcon })
          .bindPopup(popupText)
          .addTo(map);

        simulatedMarkersRef.current[d.id] = newMarker;
      }
    });
  }, [allTrackedDevices, hasValidKey]);

  // 8. Historical trip line & Auto bounds zoom
  useEffect(() => {
    const map = leafletMapRef.current;
    if (!map || hasValidKey) return;

    if (previewPolylineRef.current) {
      previewPolylineRef.current.remove();
      previewPolylineRef.current = null;
    }

    if (!previewTripId) return;

    const trip = trips.find(t => t.id === previewTripId);
    if (!trip || trip.path.length < 2) return;

    const latLngs = trip.path.map(pt => [pt.lat, pt.lng] as [number, number]);
    
    previewPolylineRef.current = L.polyline(latLngs, {
      color: '#f43f5e',
      weight: 6,
      opacity: 0.9
    }).addTo(map);

    const bounds = L.latLngBounds(latLngs);
    map.fitBounds(bounds, { padding: [50, 50] });
    setAutoCenter(false);
  }, [previewTripId, trips, hasValidKey, setAutoCenter]);

  // 9. Focus updates (like locating cellular target)
  useEffect(() => {
    const map = leafletMapRef.current;
    if (!map || !focusLocation || hasValidKey) return;

    map.setView([focusLocation.lat, focusLocation.lng], 15);
  }, [focusLocation, hasValidKey]);

  // 10. Graph node hover highlight bouncer
  useEffect(() => {
    const map = leafletMapRef.current;
    if (!map || hasValidKey) return;

    if (hoveredPointMarkerRef.current) {
      hoveredPointMarkerRef.current.remove();
      hoveredPointMarkerRef.current = null;
    }

    if (!hoveredChartPoint) return;

    const { lat, lng } = hoveredChartPoint;
    const ptIcon = L.divIcon({
      className: 'hovered-pt-bounce',
      html: `<div class="w-5 h-5 rounded-full bg-rose-500 border-2 border-white flex items-center justify-center animate-bounce shadow-xl">
        <div class="w-2 h-2 rounded-full bg-white"></div>
      </div>`,
      iconSize: [20, 20],
      iconAnchor: [10, 20]
    });

    hoveredPointMarkerRef.current = L.marker([lat, lng], { icon: ptIcon }).addTo(map);
    map.panTo([lat, lng]);
  }, [hoveredChartPoint, hasValidKey]);

  // If no Google Maps key is provided, seamlessly render the high-fidelity OpenStreetMap view!
  if (!hasValidKey) {
    return (
      <div className="w-full h-full relative z-10">
        {/* Leaflet DOM map container */}
        <div ref={mapContainerRef} className="w-full h-full" style={{ background: '#0b0c10' }} />

        {/* Live Fallback Notification bar */}
        <div className="absolute bottom-2 left-2 z-[1000] pointer-events-none">
          <div className="bg-[#111318]/95 border border-[#2d3139]/80 rounded px-2.5 py-1 flex items-center gap-1.5 shadow-2xl">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping shrink-0" />
            <span className="text-[8.5px] font-mono text-slate-400 font-medium uppercase tracking-wider">
              India Grid Layer Active (OSM Fallback)
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Google Maps Renderer (if key exists)
  const currentMapStyles = MAP_STYLES[mapTheme] || [];

  return (
    <APIProvider apiKey={API_KEY} version="weekly">
      <div className="w-full h-full relative z-10">
        <Map
          defaultCenter={{ lat: 28.6129, lng: 77.2295 }}
          defaultZoom={13}
          styles={currentMapStyles}
          disableDefaultUI={true}
          zoomControl={true}
          mapTypeControl={false}
          scaleControl={false}
          streetViewControl={false}
          rotateControl={false}
          fullscreenControl={false}
          gestureHandling="greedy"
          mapId="LOCATE_OS_MAP"
          internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
          style={{ width: '100%', height: '100%' }}
          onClick={(e) => {
            if (!isDrawingMode || !e.detail.latLng) return;
            const { lat, lng } = e.detail.latLng;
            setCustomWaypoints(prev => [...prev, [lat, lng]]);
          }}
        >
          {/* Inner events logic wrapper */}
          <MapEventHandler
            currentPoint={currentPoint}
            autoCenter={autoCenter}
            previewTripId={previewTripId}
            trips={trips}
            hoveredChartPoint={hoveredChartPoint}
            focusLocation={focusLocation}
          />

          {/* User Active GPS Marker */}
          {currentPoint && (
            <AdvancedMarker position={{ lat: currentPoint.lat, lng: currentPoint.lng }}>
              <div 
                className={sourceMode === 'gps' ? 'pulsing-gps-glow' : 'pulsing-sim-glow'} 
                style={{ width: '14px', height: '14px' }}
              />
            </AdvancedMarker>
          )}

          {/* Active Breadcrumb Trail Line */}
          {activeGooglePath.length >= 2 && (
            <Polyline
              path={activeGooglePath}
              color={sourceMode === 'gps' ? '#3b82f6' : '#10b981'}
              weight={5}
              opacity={0.85}
            />
          )}

          {/* Custom drawing waypoints */}
          {customWaypoints.map((pt, idx) => (
            <AdvancedMarker key={`wp-${idx}`} position={{ lat: pt[0], lng: pt[1] }}>
              <div 
                className="w-5 h-5 rounded-full bg-amber-500 border border-white text-white font-mono text-[9px] font-bold flex items-center justify-center shadow-md select-none"
                style={{ width: '20px', height: '20px' }}
              >
                {idx + 1}
              </div>
            </AdvancedMarker>
          ))}

          {/* Custom Waypoints Connecting Path */}
          {customWaypointsGooglePath.length >= 2 && (
            <Polyline
              path={customWaypointsGooglePath}
              color="#f59e0b"
              weight={3.5}
              opacity={0.8}
              isDashed={true}
            />
          )}

          {/* Previewing historical trip trail */}
          {previewGooglePath.length >= 2 && (
            <Polyline
              path={previewGooglePath}
              color="#f43f5e"
              weight={6}
              opacity={0.9}
            />
          )}

          {/* Hovered chart node highlight spot */}
          {hoveredChartPoint && (
            <AdvancedMarker position={{ lat: hoveredChartPoint.lat, lng: hoveredChartPoint.lng }}>
              <div 
                className="w-5 h-5 rounded-full bg-rose-500 border-2 border-white flex items-center justify-center animate-bounce shadow-xl"
                style={{ width: '20px', height: '20px' }}
              >
                <div className="w-2 h-2 rounded-full bg-white"></div>
              </div>
            </AdvancedMarker>
          )}

          {/* Shared / Tracked / Cellular targets markers */}
          {allTrackedDevices.map(d => {
            const isCell = d.id.startsWith('cell_');
            const colorClass = isCell ? 'bg-amber-500' : d.id === 'dev-emma' ? 'bg-pink-500' : d.id === 'dev-marcus' ? 'bg-emerald-500' : 'bg-blue-500';
            const pulseGlow = isCell ? 'shadow-amber-500/50' : d.id === 'dev-emma' ? 'shadow-pink-500/50' : d.id === 'dev-marcus' ? 'shadow-emerald-500/50' : 'shadow-blue-500/50';

            return (
              <AdvancedMarker 
                key={d.id} 
                position={{ lat: d.lat, lng: d.lng }}
                onClick={() => setSelectedDevice(d)}
              >
                <div 
                  className={`w-[14px] h-[14px] rounded-full border-2 border-white shadow-lg animate-pulse cursor-pointer ${colorClass} ${pulseGlow}`}
                  style={{ width: '14px', height: '14px' }}
                  title={d.name}
                />
              </AdvancedMarker>
            );
          })}

          {/* Info Window for selected Tracked/Cellular targets */}
          {selectedDevice && (
            <InfoWindow
              position={{ lat: selectedDevice.lat, lng: selectedDevice.lng }}
              onCloseClick={() => setSelectedDevice(null)}
            >
              {selectedDevice.id.startsWith('cell_') ? (
                <div className="font-mono text-[10px] flex flex-col gap-1 p-1 text-slate-800">
                  <span className="text-amber-600 font-bold text-xs uppercase tracking-wider">{selectedDevice.name}</span>
                  <span>Carrier: <strong>{selectedDevice.carrier}</strong></span>
                  <span>Battery: <strong>{selectedDevice.battery}%</strong></span>
                  <span>Signal: <strong>{selectedDevice.signalStrength}</strong></span>
                  <span>Coords: <strong>{selectedDevice.lat.toFixed(4)}, {selectedDevice.lng.toFixed(4)}</strong></span>
                </div>
              ) : (
                <div className="font-sans text-xs p-1 text-slate-800">
                  <strong className="text-slate-900 block font-bold mb-1">{selectedDevice.name}</strong>
                  <p className="m-0">Activity: {selectedDevice.role}</p>
                  <p className="m-0">Speed: {selectedDevice.speedKmh.toFixed(1)} km/h</p>
                </div>
              )}
            </InfoWindow>
          )}

        </Map>
      </div>
    </APIProvider>
  );
}
