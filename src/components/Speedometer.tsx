import { useMemo } from 'react';
import { formatPace } from '../utils';

interface SpeedometerProps {
  currentSpeedKmh: number; // in km/h
  maxSpeedKmh: number; // in km/h, to gauge the dial
  useImperial: boolean;
}

export default function Speedometer({ currentSpeedKmh, maxSpeedKmh, useImperial }: SpeedometerProps) {
  const displaySpeed = useMemo(() => {
    const speed = useImperial ? currentSpeedKmh * 0.621371 : currentSpeedKmh;
    return speed.toFixed(1);
  }, [currentSpeedKmh, useImperial]);

  const unit = useImperial ? 'mph' : 'km/h';

  // Determine a reasonable limit for the dial gauge.
  const maxDialLimit = useMemo(() => {
    if (maxSpeedKmh <= 10) return 10;
    if (maxSpeedKmh <= 25) return 25;
    if (maxSpeedKmh <= 60) return 60;
    if (maxSpeedKmh <= 130) return 130;
    return 240;
  }, [maxSpeedKmh]);

  // Calculate gauge fill ratio
  const fillRatio = Math.min(1, Math.max(0, currentSpeedKmh / maxDialLimit));

  // Circle path parameters
  const size = 180;
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  
  // Custom dial arch (leaving bottom open)
  // We use 270 degrees of a circle. (3/4 of circle)
  const angleRange = 270; 
  const strokeDasharray = `${circumference}`;
  const strokeDashoffset = `${circumference - (fillRatio * (angleRange / 360) * circumference)}`;

  const rotationAngle = 135; // aligns the open part to the bottom

  // Pace formatting
  const paceStr = useMemo(() => {
    return formatPace(currentSpeedKmh, useImperial);
  }, [currentSpeedKmh, useImperial]);

  // Alert/danger pulse for extremely high speeds (driving simulator!)
  const isHighSpeed = currentSpeedKmh > 100;

  return (
    <div className="flex flex-col items-center justify-center py-4 relative">
      <div className="relative" style={{ width: size, height: size }}>
        {/* Background Dial Track */}
        <svg width={size} height={size} className="transform -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="rgba(255, 255, 255, 0.05)"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={circumference - (angleRange / 360) * circumference}
            style={{
              transformOrigin: '50% 50%',
              transform: `rotate(${rotationAngle}deg)`,
            }}
            strokeLinecap="round"
          />

          {/* Active Colored Fill with gradient */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="url(#speedometerGradient)"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={parseFloat(strokeDashoffset)}
            style={{
              transformOrigin: '50% 50%',
              transform: `rotate(${rotationAngle}deg)`,
              transition: 'stroke-dashoffset 0.3s ease-out',
            }}
            strokeLinecap="round"
          />

          {/* Glow filter definition and Gradients */}
          <defs>
            <linearGradient id="speedometerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="60%" stopColor="#10b981" />
              <stop offset="100%" stopColor={isHighSpeed ? '#ef4444' : '#10b981'} />
            </linearGradient>
          </defs>
        </svg>

        {/* Digital Readout Centered */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center select-none font-mono">
          <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500">
            SPEED
          </span>
          <span className={`text-4xl font-extrabold tracking-tight ${isHighSpeed ? 'text-red-400 animate-pulse' : 'text-slate-100'}`}>
            {displaySpeed}
          </span>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            {unit}
          </span>
        </div>
      </div>

      {/* Pace readouts and gauge indicator */}
      <div className="flex flex-col items-center gap-1 -mt-4 z-10 bg-[#1c1f26] px-3 py-1.5 rounded border border-[#2d3139] shadow-lg font-mono">
        <span className="text-[8px] text-slate-500 uppercase tracking-widest font-bold">Live Pace</span>
        <span className="text-xs font-bold text-emerald-400">{paceStr}</span>
      </div>

      {/* Dial Max indicator */}
      <span className="text-[9px] text-slate-500 font-mono mt-2 uppercase tracking-wide">
        Scale: 0 - {maxDialLimit} {unit}
      </span>
    </div>
  );
}
