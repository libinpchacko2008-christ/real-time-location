import { PositionPoint, Trip } from './types';

// Calculate distance in kilometers between two coordinates using Haversine formula
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d;
}

function deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
}

// Format distance nicely
export function formatDistance(km: number, useImperial = false): string {
  if (useImperial) {
    const miles = km * 0.621371;
    if (miles < 0.1) {
      return `${Math.round(miles * 5280)} ft`;
    }
    return `${miles.toFixed(2)} mi`;
  } else {
    if (km < 0.1) {
      return `${Math.round(km * 1000)} m`;
    }
    return `${km.toFixed(2)} km`;
  }
}

// Format duration (seconds -> HH:MM:SS)
export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  const hStr = h > 0 ? `${h.toString().padStart(2, '0')}:` : '';
  const mStr = `${m.toString().padStart(2, '0')}:`;
  const sStr = s.toString().padStart(2, '0');

  return `${hStr}${mStr}${sStr}`;
}

// Format speed (km/h)
export function formatSpeed(kmh: number, useImperial = false): string {
  if (useImperial) {
    const mph = kmh * 0.621371;
    return `${mph.toFixed(1)} mph`;
  }
  return `${kmh.toFixed(1)} km/h`;
}

// Format pace (min/km or min/mile) from speed in km/h
export function formatPace(kmh: number, useImperial = false): string {
  if (kmh <= 0.5) return '--:--';
  const speed = useImperial ? kmh * 0.621371 : kmh; // miles/h or km/h
  const minPerUnit = 60 / speed;
  const mins = Math.floor(minPerUnit);
  const secs = Math.round((minPerUnit - mins) * 60);
  return `${mins}:${secs.toString().padStart(2, '0')} min/${useImperial ? 'mi' : 'km'}`;
}

// Export a trip to GPX format string
export function exportToGPX(trip: Trip): string {
  const dateStr = new Date(trip.date).toISOString();
  let gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="RealTimeLocationTracker" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>${trip.name}</name>
    <time>${dateStr}</time>
    <desc>Recorded on Real-Time Location Tracker</desc>
  </metadata>
  <trk>
    <name>${trip.name}</name>
    <trkseg>
`;

  trip.path.forEach((pt) => {
    const ptDate = new Date(pt.timestamp).toISOString();
    const eleTag = pt.altitude !== undefined && pt.altitude !== null ? `\n        <ele>${pt.altitude.toFixed(1)}</ele>` : '';
    gpx += `      <trkpt lat="${pt.lat.toFixed(6)}" lon="${pt.lng.toFixed(6)}">${eleTag}
        <time>${ptDate}</time>
      </trkpt>\n`;
  });

  gpx += `    </trkseg>
  </trk>
</gpx>`;

  return gpx;
}

// Simple GPX XML Parser to load points
export function parseGPX(gpxText: string): { name: string; path: PositionPoint[] } | null {
  try {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(gpxText, 'text/xml');

    const nameNode = xmlDoc.querySelector('metadata > name') || xmlDoc.querySelector('trk > name');
    const name = nameNode?.textContent || 'Imported GPX Track';

    const trkpts = xmlDoc.querySelectorAll('trkpt');
    if (trkpts.length === 0) return null;

    const path: PositionPoint[] = [];
    trkpts.forEach((pt, idx) => {
      const lat = parseFloat(pt.getAttribute('lat') || '0');
      const lng = parseFloat(pt.getAttribute('lon') || '0');
      
      const eleNode = pt.querySelector('ele');
      const altitude = eleNode ? parseFloat(eleNode.textContent || '0') : null;

      const timeNode = pt.querySelector('time');
      const timestamp = timeNode ? new Date(timeNode.textContent || '').getTime() : Date.now() + idx * 1000;

      path.push({
        lat,
        lng,
        timestamp,
        altitude,
      });
    });

    return { name, path };
  } catch (error) {
    console.error('Failed to parse GPX:', error);
    return null;
  }
}

// Generate intermediate points along a route segment for smoother animations
export function interpolatePoints(p1: [number, number], p2: [number, number], steps = 10): [number, number][] {
  const points: [number, number][] = [];
  for (let i = 1; i <= steps; i++) {
    const ratio = i / steps;
    const lat = p1[0] + (p2[0] - p1[0]) * ratio;
    const lng = p1[1] + (p2[1] - p1[1]) * ratio;
    points.push([lat, lng]);
  }
  return points;
}

// Generate simulated elevation (sinusoidal)
export function getSimulatedElevation(lat: number, lng: number): number {
  return 150 + Math.sin(lat * 100) * 80 + Math.cos(lng * 100) * 40;
}
