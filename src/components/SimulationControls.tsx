import React, { useState, useRef } from 'react';
import { SIMULATION_PRESETS } from '../presets';
import { SimulationRoutePreset, PositionPoint } from '../types';
import { parseGPX } from '../utils';
import { 
  Play, 
  Trash2, 
  Upload, 
  MapPin, 
  Route, 
  AlertCircle 
} from 'lucide-react';

interface SimulationControlsProps {
  currentPresetId: string | null;
  onSelectPreset: (preset: SimulationRoutePreset) => void;
  isDrawingMode: boolean;
  onToggleDrawingMode: () => void;
  onClearCustomRoute: () => void;
  customWaypointsCount: number;
  onGPXImported: (name: string, path: PositionPoint[]) => void;
  onStartSimulation: () => void;
  onStopSimulation: () => void;
  isSimulating: boolean;
  speedMultiplier: number;
  onChangeSpeedMultiplier: (val: number) => void;
}

export default function SimulationControls({
  currentPresetId,
  onSelectPreset,
  isDrawingMode,
  onToggleDrawingMode,
  onClearCustomRoute,
  customWaypointsCount,
  onGPXImported,
  onStartSimulation,
  onStopSimulation,
  isSimulating,
  speedMultiplier,
  onChangeSpeedMultiplier,
}: SimulationControlsProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // File drop/upload handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const processGPXFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const gpxText = event.target?.result as string;
      const parsed = parseGPX(gpxText);
      if (parsed) {
        onGPXImported(parsed.name, parsed.path);
        setImportError(null);
      } else {
        setImportError('Invalid GPX format or no trackpoints found.');
      }
    };
    reader.onerror = () => {
      setImportError('Error reading GPX file.');
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.gpx') || file.type === 'application/gpx+xml')) {
      processGPXFile(file);
    } else {
      setImportError('Please upload a valid .gpx file.');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processGPXFile(file);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Simulation Controls Info */}
      <div className="bg-[#1c1f26] p-3 rounded border border-[#2d3139] text-xs text-slate-400 flex items-start gap-2">
        <AlertCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
        <p>
          Simulate location journeys on your browser. Choose a real-world preset route, draw a custom path, or upload a GPX file.
        </p>
      </div>

      {/* Preset Route Selectors */}
      <div className="flex flex-col gap-1.5 font-mono">
        <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest px-0.5">Preset Paths</label>
        <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-1">
          {SIMULATION_PRESETS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => onSelectPreset(preset)}
              className={`text-left p-2.5 rounded border transition-colors flex flex-col gap-1 ${
                currentPresetId === preset.id
                  ? 'bg-[#22272e] border-emerald-500/50 text-slate-100 border-l-4 border-l-emerald-500'
                  : 'bg-[#1c1f26] border-[#2d3139] text-slate-300 hover:bg-[#22272e]'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className="font-bold text-xs">{preset.name}</span>
                <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                  {preset.travelMode}
                </span>
              </div>
              <p className="text-[10px] text-slate-500 line-clamp-1">{preset.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Draw Custom Route Tool */}
      <div className="flex flex-col gap-1.5 font-mono">
        <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest px-0.5">Route Builder</label>
        <div className="flex gap-2">
          <button
            onClick={onToggleDrawingMode}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded border text-xs font-semibold transition-colors ${
              isDrawingMode
                ? 'bg-[#22272e] border-amber-500/50 text-amber-300 border-l-4 border-l-amber-500'
                : 'bg-[#1c1f26] border-[#2d3139] text-slate-300 hover:bg-[#22272e]'
            }`}
          >
            <Route className="w-4 h-4" />
            {isDrawingMode ? 'Drawing on Map...' : 'Draw Custom Path'}
          </button>
          {customWaypointsCount > 0 && (
            <button
              onClick={onClearCustomRoute}
              className="px-2.5 py-2 bg-[#1c1f26] border border-[#2d3139] hover:bg-[#22272e] hover:text-red-400 text-slate-400 rounded transition-colors"
              title="Clear custom path"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
        {isDrawingMode && (
          <span className="text-[9px] text-amber-400 font-mono px-0.5 italic">
            * Click anywhere on the map to add custom simulation waypoints ({customWaypointsCount} points added)
          </span>
        )}
      </div>

      {/* GPX File Upload */}
      <div className="flex flex-col gap-1.5 font-mono">
        <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest px-0.5">Import Track</label>
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded p-3 text-center cursor-pointer transition-colors flex flex-col items-center justify-center gap-1.5 ${
            isDragging
              ? 'border-emerald-500 bg-emerald-500/5'
              : 'border-[#2d3139] bg-[#111318] hover:bg-[#22272e]'
          }`}
        >
          <Upload className="w-5 h-5 text-slate-400" />
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] font-bold text-slate-300">Drag & Drop GPX file</span>
            <span className="text-[9px] text-slate-500">or click to choose file (.gpx)</span>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".gpx"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
        {importError && (
          <p className="text-[9px] text-red-400 font-mono px-0.5 flex items-center gap-1">
            <span>⚠️ {importError}</span>
          </p>
        )}
      </div>

      {/* Speed Multiplier Slider */}
      <div className="flex flex-col gap-1.5 bg-[#1c1f26] p-3 rounded border border-[#2d3139] font-mono">
        <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-widest text-slate-500">
          <span>Simulation Speed</span>
          <span className="text-emerald-400 font-bold">{speedMultiplier}x</span>
        </div>
        <input
          type="range"
          min="1"
          max="20"
          step="1"
          value={speedMultiplier}
          onChange={(e) => onChangeSpeedMultiplier(parseInt(e.target.value))}
          className="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-emerald-500"
        />
        <div className="flex justify-between text-[8px] text-slate-600">
          <span>1x (Real speed)</span>
          <span>10x</span>
          <span>20x (Fast)</span>
        </div>
      </div>
    </div>
  );
}
