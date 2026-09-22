import { useMemo } from 'react';
import { formatDistance, formatDuration, formatSpeed } from '../utils';
import { 
  Compass, 
  MapPin, 
  Timer, 
  TrendingUp, 
  Zap, 
  Gauge 
} from 'lucide-react';

interface StatsGridProps {
  distanceKm: number;
  durationSec: number;
  avgSpeedKmh: number;
  maxSpeedKmh: number;
  currentAltitude: number | null;
  heading: number | null;
  accuracy: number | null;
  travelMode: 'walk' | 'bike' | 'drive';
  useImperial: boolean;
}

export default function StatsGrid({
  distanceKm,
  durationSec,
  avgSpeedKmh,
  maxSpeedKmh,
  currentAltitude,
  heading,
  accuracy,
  travelMode,
  useImperial
}: StatsGridProps) {
  // Estimated Calories:
  // Walking: ~65 kcal/km
  // Cycling: ~35 kcal/km
  // Driving: 0 kcal/km
  const caloriesBurned = useMemo(() => {
    let factor = 65;
    if (travelMode === 'bike') factor = 35;
    if (travelMode === 'drive') factor = 0;
    return Math.round(distanceKm * factor);
  }, [distanceKm, travelMode]);

  // Heading string representation
  const headingDirection = useMemo(() => {
    if (heading === null) return '---';
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const index = Math.round(((heading % 360) + 360) % 360 / 45) % 8;
    return `${directions[index]} (${Math.round(heading)}°)`;
  }, [heading]);

  const stats = [
    {
      label: 'Distance',
      value: formatDistance(distanceKm, useImperial),
      icon: MapPin,
      color: 'text-blue-400',
      bgColor: 'bg-[#1c1f26] border-[#2d3139] border-l-4 border-l-blue-500'
    },
    {
      label: 'Elapsed Time',
      value: formatDuration(durationSec),
      icon: Timer,
      color: 'text-emerald-400',
      bgColor: 'bg-[#1c1f26] border-[#2d3139] border-l-4 border-l-emerald-500'
    },
    {
      label: 'Avg Speed',
      value: formatSpeed(avgSpeedKmh, useImperial),
      icon: Gauge,
      color: 'text-indigo-400',
      bgColor: 'bg-[#1c1f26] border-[#2d3139] border-l-4 border-l-indigo-500'
    },
    {
      label: 'Max Speed',
      value: formatSpeed(maxSpeedKmh, useImperial),
      icon: Zap,
      color: 'text-amber-400',
      bgColor: 'bg-[#1c1f26] border-[#2d3139] border-l-4 border-l-amber-500'
    },
    {
      label: 'Altitude',
      value: currentAltitude !== null 
        ? useImperial 
          ? `${Math.round(currentAltitude * 3.28084)} ft`
          : `${Math.round(currentAltitude)} m`
        : '---',
      icon: TrendingUp,
      color: 'text-pink-400',
      bgColor: 'bg-[#1c1f26] border-[#2d3139] border-l-4 border-l-pink-500'
    },
    {
      label: 'Direction',
      value: headingDirection,
      icon: Compass,
      color: 'text-sky-400',
      bgColor: 'bg-[#1c1f26] border-[#2d3139] border-l-4 border-l-sky-500'
    }
  ];

  return (
    <div className="grid grid-cols-2 gap-2 w-full font-mono">
      {stats.map((stat, idx) => {
        const Icon = stat.icon;
        return (
          <div 
            key={idx} 
            className={`p-2.5 rounded border flex flex-col gap-1 transition-colors hover:bg-[#22272e] ${stat.bgColor}`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{stat.label}</span>
              <Icon className={`w-3.5 h-3.5 ${stat.color}`} />
            </div>
            <span className="text-base font-bold tracking-tight text-slate-100">
              {stat.value}
            </span>
          </div>
        );
      })}

      {/* Energy Burn Card */}
      {travelMode !== 'drive' && distanceKm > 0 && (
        <div className="col-span-2 p-2.5 bg-[#1c1f26] border border-[#2d3139] border-l-4 border-l-rose-500 rounded flex items-center justify-between transition-colors hover:bg-[#22272e]">
          <div className="flex flex-col gap-0.5">
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Est. Active Energy</span>
            <span className="text-xs font-bold text-rose-400">
              {caloriesBurned} Kcal Burned
            </span>
          </div>
          <span className="text-[9px] text-slate-500 font-mono">Based on {travelMode === 'bike' ? 'Cycling' : 'Walking'}</span>
        </div>
      )}

      {/* Accuracy Status */}
      <div className="col-span-2 flex items-center justify-between text-[9px] font-mono text-slate-500 px-1 mt-0.5">
        <span>Signal Quality: {accuracy !== null ? `${accuracy.toFixed(1)}m accuracy` : 'No Signal'}</span>
        <span className="flex items-center gap-1">
          <span className={`w-1.5 h-1.5 rounded-full ${accuracy !== null && accuracy < 15 ? 'bg-emerald-500' : accuracy !== null ? 'bg-amber-500' : 'bg-rose-500 animate-pulse'}`}></span>
          {accuracy !== null && accuracy < 15 ? 'GPS High Precision' : accuracy !== null ? 'GPS Low Precision' : 'GPS Disconnected'}
        </span>
      </div>
    </div>
  );
}
