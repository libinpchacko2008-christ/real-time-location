import React, { useState, useRef, useMemo } from 'react';
import { PositionPoint } from '../types';
import { formatSpeed } from '../utils';

interface CustomChartProps {
  points: PositionPoint[];
  useImperial: boolean;
  onHoverPoint?: (point: PositionPoint | null) => void;
}

export default function CustomChart({ points, useImperial, onHoverPoint }: CustomChartProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Filter out any points that don't have timestamps, sort by time just in case
  const sortedPoints = useMemo(() => {
    return [...points].sort((a, b) => a.timestamp - b.timestamp);
  }, [points]);

  const stats = useMemo(() => {
    if (sortedPoints.length === 0) return { maxSpeed: 0, maxEle: 0, minEle: 0 };
    
    let maxSpeed = 0;
    let maxEle = -Infinity;
    let minEle = Infinity;

    sortedPoints.forEach(p => {
      const speedKmh = (p.speed || 0) * 3.6;
      if (speedKmh > maxSpeed) maxSpeed = speedKmh;
      
      const ele = p.altitude || 0;
      if (ele > maxEle) maxEle = ele;
      if (ele < minEle) minEle = ele;
    });

    if (minEle === Infinity) minEle = 0;
    if (maxEle === -Infinity) maxEle = 100;
    
    // Add margin to max values
    return {
      maxSpeed: maxSpeed || 10,
      maxEle: maxEle + 20,
      minEle: Math.max(0, minEle - 20)
    };
  }, [sortedPoints]);

  if (sortedPoints.length < 2) {
    return (
      <div className="h-40 flex items-center justify-center text-xs text-slate-500 bg-[#1c1f26] rounded border border-[#2d3139] font-mono">
        Record more track points to display analytical charts
      </div>
    );
  }

  const width = 500;
  const height = 150;
  const padding = 20;

  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  // Generate SVG path for Speed
  const speedPath = (() => {
    let d = '';
    sortedPoints.forEach((p, idx) => {
      const x = padding + (idx / (sortedPoints.length - 1)) * chartWidth;
      const speedKmh = (p.speed || 0) * 3.6;
      const y = height - padding - (speedKmh / stats.maxSpeed) * chartHeight;
      if (idx === 0) d += `M ${x} ${y}`;
      else d += ` L ${x} ${y}`;
    });
    return d;
  })();

  // Generate SVG path for Elevation
  const elePath = (() => {
    let d = '';
    const eleRange = stats.maxEle - stats.minEle || 1;
    sortedPoints.forEach((p, idx) => {
      const x = padding + (idx / (sortedPoints.length - 1)) * chartWidth;
      const ele = p.altitude || 0;
      const y = height - padding - ((ele - stats.minEle) / eleRange) * chartHeight;
      if (idx === 0) d += `M ${x} ${y}`;
      else d += ` L ${x} ${y}`;
    });
    return d;
  })();

  // Handle mouse move to find closest point
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement, MouseEvent>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left - padding;
    
    if (mouseX < 0 || mouseX > chartWidth) {
      setHoverIndex(null);
      if (onHoverPoint) onHoverPoint(null);
      return;
    }

    const percent = mouseX / chartWidth;
    const index = Math.min(
      sortedPoints.length - 1,
      Math.max(0, Math.round(percent * (sortedPoints.length - 1)))
    );

    setHoverIndex(index);
    if (onHoverPoint) onHoverPoint(sortedPoints[index]);
  };

  const handleMouseLeave = () => {
    setHoverIndex(null);
    if (onHoverPoint) onHoverPoint(null);
  };

  const hoveredPoint = hoverIndex !== null ? sortedPoints[hoverIndex] : null;
  const eleRange = stats.maxEle - stats.minEle || 1;

  const hoverX = hoverIndex !== null ? padding + (hoverIndex / (sortedPoints.length - 1)) * chartWidth : 0;
  const hoverSpeedY = hoveredPoint ? height - padding - (((hoveredPoint.speed || 0) * 3.6) / stats.maxSpeed) * chartHeight : 0;
  const hoverEleY = hoveredPoint ? height - padding - (((hoveredPoint.altitude || 0) - stats.minEle) / eleRange) * chartHeight : 0;

  return (
    <div ref={containerRef} className="w-full bg-[#1c1f26] p-4 rounded border border-[#2d3139] select-none font-mono">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Activity Profile</h4>
        <div className="flex gap-4 text-[10px] font-bold">
          <span className="flex items-center gap-1.5 text-blue-400">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
            SPEED
          </span>
          <span className="flex items-center gap-1.5 text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            ELEVATION
          </span>
        </div>
      </div>

      <div className="relative">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto overflow-visible cursor-crosshair"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          {/* Grid lines */}
          <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="rgba(255,255,255,0.03)" strokeWidth={1} />
          <line x1={padding} y1={height / 2} x2={width - padding} y2={height / 2} stroke="rgba(255,255,255,0.03)" strokeWidth={1} />
          <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="rgba(255,255,255,0.1)" strokeWidth={1} />

          {/* Elevation area (filled) */}
          <path
            d={`${elePath} L ${padding + chartWidth} ${height - padding} L ${padding} ${height - padding} Z`}
            fill="url(#elevationGradient)"
            opacity="0.1"
          />

          {/* Elevation curve */}
          <path d={elePath} fill="none" stroke="#10b981" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />

          {/* Speed curve */}
          <path d={speedPath} fill="none" stroke="#3b82f6" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />

          {/* Hover effects */}
          {hoverIndex !== null && hoveredPoint && (
            <>
              {/* Vertical tracking line */}
              <line x1={hoverX} y1={padding} x2={hoverX} y2={height - padding} stroke="rgba(148, 163, 184, 0.4)" strokeWidth={1} strokeDasharray="3 3" />

              {/* Speed point glow */}
              <circle cx={hoverX} cy={hoverSpeedY} r={5} fill="#3b82f6" stroke="#ffffff" strokeWidth={1.5} />
              
              {/* Elevation point glow */}
              <circle cx={hoverX} cy={hoverEleY} r={5} fill="#10b981" stroke="#ffffff" strokeWidth={1.5} />
            </>
          )}

          {/* Definitions for gradients */}
          <defs>
            <linearGradient id="elevationGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>

        {/* Floating live tooltip */}
        {hoveredPoint && (
          <div
            className="absolute top-0 bg-[#111318] border border-[#2d3139] text-slate-200 text-[10px] p-2 rounded shadow-2xl pointer-events-none flex flex-col gap-0.5"
            style={{
              left: `${Math.min(75, Math.max(5, (hoverX / width) * 100))}%`,
              transform: 'translateX(-50%) translateY(-110%)',
            }}
          >
            <span className="text-slate-500 font-bold text-center">
              T+{Math.round((hoveredPoint.timestamp - sortedPoints[0].timestamp) / 1000)}s
            </span>
            <div className="flex gap-3 mt-1 font-bold">
              <span className="text-blue-400">
                SPD: {formatSpeed((hoveredPoint.speed || 0) * 3.6, useImperial)}
              </span>
              <span className="text-emerald-400">
                ALT: {hoveredPoint.altitude !== null ? `${Math.round(hoveredPoint.altitude || 0)}m` : 'N/A'}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
