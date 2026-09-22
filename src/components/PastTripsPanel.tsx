import React, { useState } from 'react';
import { Trip, PositionPoint } from '../types';
import { formatDistance, formatDuration, formatSpeed, exportToGPX } from '../utils';
import CustomChart from './CustomChart';
import { 
  Download, 
  Trash2, 
  Calendar, 
  ChevronDown, 
  ChevronUp, 
  Activity,
  History
} from 'lucide-react';

interface PastTripsPanelProps {
  trips: Trip[];
  onDeleteTrip: (id: string) => void;
  useImperial: boolean;
  onHoverPoint?: (point: PositionPoint | null) => void;
  onPreviewTripOnMap?: (trip: Trip | null) => void;
  previewTripId: string | null;
}

export default function PastTripsPanel({
  trips,
  onDeleteTrip,
  useImperial,
  onHoverPoint,
  onPreviewTripOnMap,
  previewTripId
}: PastTripsPanelProps) {
  const [expandedTripId, setExpandedTripId] = useState<string | null>(null);

  const toggleExpand = (tripId: string) => {
    if (expandedTripId === tripId) {
      setExpandedTripId(null);
      if (onPreviewTripOnMap) onPreviewTripOnMap(null);
    } else {
      setExpandedTripId(tripId);
      const trip = trips.find(t => t.id === tripId);
      if (trip && onPreviewTripOnMap) {
        onPreviewTripOnMap(trip);
      }
    }
  };

  const handleDownloadGPX = (e: React.MouseEvent, trip: Trip) => {
    e.stopPropagation();
    const gpxString = exportToGPX(trip);
    const blob = new Blob([gpxString], { type: 'application/gpx+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${trip.name.replace(/\s+/g, '_')}.gpx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (trips.length === 0) {
    return (
      <div className="h-48 flex flex-col items-center justify-center text-center p-4 bg-[#1c1f26] border border-[#2d3139] rounded font-mono">
        <History className="w-8 h-8 text-slate-650 mb-2" />
        <span className="text-xs font-bold text-slate-400">No Saved Activity History</span>
        <span className="text-[9px] text-slate-500 mt-1.5 max-w-[200px]">
          Record your first track or simulate a route to save a GPS session.
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 font-mono">
      <div className="flex items-center justify-between px-0.5">
        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
          Saved Journeys ({trips.length})
        </span>
      </div>

      <div className="flex flex-col gap-2.5 max-h-[420px] overflow-y-auto pr-1">
        {trips.map((trip) => {
          const isExpanded = expandedTripId === trip.id;
          const isPreviewing = previewTripId === trip.id;
          const dateStr = new Date(trip.date).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          });

          return (
            <div
              key={trip.id}
              className={`rounded border transition-colors ${
                isPreviewing
                  ? 'bg-[#22272e] border-blue-500/50 border-l-4 border-l-blue-500'
                  : 'bg-[#1c1f26] border-[#2d3139] hover:bg-[#22272e]'
              }`}
            >
              {/* Expandable Header block */}
              <div
                onClick={() => toggleExpand(trip.id)}
                className="p-3 cursor-pointer flex flex-col gap-2 select-none"
              >
                <div className="flex items-start justify-between">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-bold text-xs text-slate-200 line-clamp-1 uppercase">
                      {trip.name}
                    </span>
                    <div className="flex items-center gap-1.5 text-[9px] text-slate-500 font-mono">
                      <Calendar className="w-3 h-3 text-slate-600" />
                      {dateStr}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={(e) => handleDownloadGPX(e, trip)}
                      className="p-1.5 bg-[#111318] hover:bg-[#22272e] hover:text-blue-400 text-slate-450 rounded border border-[#2d3139] transition-colors"
                      title="Export GPX"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteTrip(trip.id);
                      }}
                      className="p-1.5 bg-[#111318] hover:bg-rose-950/40 hover:text-rose-400 text-slate-450 rounded border border-[#2d3139] transition-colors"
                      title="Delete trip"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-slate-500" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-500" />
                    )}
                  </div>
                </div>

                {/* Micro Stats */}
                <div className="grid grid-cols-3 gap-2 bg-[#111318] p-2 rounded border border-[#2d3139] text-center font-mono">
                  <div className="flex flex-col">
                    <span className="text-[8px] text-slate-500 uppercase">Dist</span>
                    <span className="text-[10px] font-bold text-slate-300">
                      {formatDistance(trip.distance, useImperial)}
                    </span>
                  </div>
                  <div className="flex flex-col border-x border-[#2d3139]">
                    <span className="text-[8px] text-slate-500 uppercase">Duration</span>
                    <span className="text-[10px] font-bold text-slate-300">
                      {formatDuration(trip.duration)}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[8px] text-slate-500 uppercase">Avg Speed</span>
                    <span className="text-[10px] font-bold text-emerald-400">
                      {formatSpeed(trip.avgSpeed, useImperial)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Collapsed analytics block */}
              {isExpanded && (
                <div className="px-3 pb-3 pt-1 border-t border-[#2d3139] flex flex-col gap-3">
                  <div className="flex items-center gap-1.5 text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                    <Activity className="w-3.5 h-3.5 text-blue-400" />
                    Performance Charts
                  </div>

                  <CustomChart
                    points={trip.path}
                    useImperial={useImperial}
                    onHoverPoint={onHoverPoint}
                  />

                  <div className="flex justify-between items-center text-[8px] text-slate-500 font-mono px-1">
                    <span>Max Speed: {formatSpeed(trip.maxSpeed, useImperial)}</span>
                    <span>Points: {trip.path.length} recorded</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
