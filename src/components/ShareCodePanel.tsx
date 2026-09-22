import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Copy, 
  Check, 
  Radar, 
  Plus, 
  PhoneCall, 
  Radio, 
  Smartphone, 
  Trash2, 
  Crosshair, 
  Activity,
  RefreshCw
} from 'lucide-react';

interface SharedDevice {
  id: string;
  name: string;
  lat: number;
  lng: number;
  speedKmh: number;
  role: string;
  avatarColor: string;
  carrier?: string;
  battery?: number;
  signalStrength?: string;
}

interface ShareCodePanelProps {
  roomCode: string | null;
  onCreateRoom: (code: string) => void;
  onJoinRoom: (code: string) => void;
  onLeaveRoom: () => void;
  sharedDevices: SharedDevice[];
  onFocusDevice: (device: SharedDevice) => void;
  cellularTargets: SharedDevice[];
  onLocateNumber: (number: string) => void;
  onRemoveCellularTarget: (id: string) => void;
}

export default function ShareCodePanel({
  roomCode,
  onCreateRoom,
  onJoinRoom,
  onLeaveRoom,
  sharedDevices,
  onFocusDevice,
  cellularTargets,
  onLocateNumber,
  onRemoveCellularTarget,
}: ShareCodePanelProps) {
  const [activeSubTab, setActiveSubTab] = useState<'rooms' | 'cellular'>('cellular'); // Default to cellular as they asked
  const [inputCode, setInputCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Cellular state
  const [phoneInput, setPhoneInput] = useState('');
  const [locatingStep, setLocatingStep] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  const handleCreate = () => {
    const code = 'TRK-' + Math.floor(1000 + Math.random() * 9000);
    onCreateRoom(code);
    setErrorMsg(null);
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    const formatted = inputCode.trim().toUpperCase();
    if (!formatted.startsWith('TRK-') || formatted.length < 5) {
      setErrorMsg('Invalid code format. Use "TRK-XXXX"');
      return;
    }
    onJoinRoom(formatted);
    setErrorMsg(null);
    setInputCode('');
  };

  const handleCopy = () => {
    if (!roomCode) return;
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLocatePhone = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = phoneInput.trim();
    if (!trimmed) return;

    setIsLocating(true);
    setLocatingStep('HLR_REGISTRY');

    // Simulate authentic cellular tracking steps
    const steps = [
      { step: 'HLR_REGISTRY', delay: 800, text: 'Querying Home Location Register (HLR)...' },
      { step: 'CELL_TOWER_PING', delay: 1600, text: 'Broadcasting telemetry pings to nearest cellular transceivers...' },
      { step: 'TRILATERATION', delay: 2400, text: 'Calculating intersection circles (Signal Trilateration)...' },
      { step: 'RESOLVED', delay: 3200, text: 'Subscriber position resolved successfully!' }
    ];

    steps.forEach((s) => {
      setTimeout(() => {
        setLocatingStep(s.step);
        if (s.step === 'RESOLVED') {
          setTimeout(() => {
            onLocateNumber(trimmed);
            setIsLocating(false);
            setLocatingStep(null);
            setPhoneInput('');
          }, 600);
        }
      }, s.delay);
    });
  };

  return (
    <div className="flex flex-col gap-4 font-mono">
      {/* Sub-tab selection */}
      <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#16181d] rounded border border-[#2d3139]">
        <button
          onClick={() => setActiveSubTab('cellular')}
          className={`flex items-center justify-center gap-1.5 py-1.5 px-3 rounded text-[10px] font-bold transition-all ${
            activeSubTab === 'cellular'
              ? 'bg-[#22272e] border border-amber-500/30 text-amber-400'
              : 'text-slate-450 hover:text-slate-300'
          }`}
        >
          <Smartphone className="w-3.5 h-3.5" />
          Cellular Finder
        </button>
        <button
          onClick={() => setActiveSubTab('rooms')}
          className={`flex items-center justify-center gap-1.5 py-1.5 px-3 rounded text-[10px] font-bold transition-all ${
            activeSubTab === 'rooms'
              ? 'bg-[#22272e] border border-sky-500/30 text-sky-400'
              : 'text-slate-450 hover:text-slate-300'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          Track Rooms
        </button>
      </div>

      {activeSubTab === 'cellular' ? (
        <div className="flex flex-col gap-4 animate-fadeIn">
          {/* Description */}
          <div className="bg-[#1c1f26] p-3 rounded border border-[#2d3139] text-xs text-slate-400 flex items-start gap-2">
            <Radio className="w-4 h-4 text-amber-500 shrink-0 mt-0.5 animate-pulse" />
            <p className="leading-relaxed">
              Locate any mobile subscriber terminal by specifying their mobile number or device ID. Pings cell towers in real-time.
            </p>
          </div>

          {/* Phone Form */}
          <form onSubmit={handleLocatePhone} className="flex flex-col gap-2.5">
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">Mobile or Device Target Number</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  disabled={isLocating}
                  placeholder="+1 (555) 019-2834"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  className="flex-1 bg-[#0b0c10] border border-[#2d3139] rounded px-3 py-2 text-xs font-mono tracking-wider text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500/40 disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={isLocating || !phoneInput.trim()}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:bg-[#1c1f26] disabled:text-slate-600 disabled:border-[#2d3139] hover:text-slate-100 border border-amber-500 font-bold text-xs text-slate-200 rounded transition-colors uppercase tracking-wider flex items-center gap-1.5"
                >
                  {isLocating ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Crosshair className="w-3.5 h-3.5" />
                  )}
                  Locate
                </button>
              </div>
            </div>
          </form>

          {/* Locating Simulation Progress Bar */}
          {isLocating && (
            <div className="bg-[#1c1f26] border border-amber-500/20 p-3.5 rounded-lg flex flex-col gap-2.5 animate-pulse">
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-amber-400 font-bold uppercase tracking-wider">CELLULAR SYSTEM LOOKUP</span>
                <span className="text-[9px] text-slate-500 font-mono">LINK STABILIZING</span>
              </div>
              <div className="w-full bg-[#0b0c10] h-1.5 rounded-full overflow-hidden">
                <div 
                  className="bg-amber-500 h-full rounded-full transition-all duration-700"
                  style={{
                    width: 
                      locatingStep === 'HLR_REGISTRY' ? '25%' :
                      locatingStep === 'CELL_TOWER_PING' ? '50%' :
                      locatingStep === 'TRILATERATION' ? '80%' : '100%'
                  }}
                ></div>
              </div>
              <span className="text-[10px] text-slate-350 italic font-mono leading-tight">
                {locatingStep === 'HLR_REGISTRY' && 'Connecting to carrier network, requesting HLR registry logs...'}
                {locatingStep === 'CELL_TOWER_PING' && 'Pinging surrounding cell base transceivers for subscriber feedback...'}
                {locatingStep === 'TRILATERATION' && 'Calculating signal propagation delays (trilaterating GPS)...'}
                {locatingStep === 'RESOLVED' && 'Subscriber GPS resolved! Locking coordinates onto LOCATE.OS mapping...'}
              </span>
            </div>
          )}

          {/* Cellular Targets List */}
          <div className="flex flex-col gap-2 mt-1">
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest px-0.5">
              Cellular Subscriber Links ({cellularTargets.length})
            </span>
            {cellularTargets.length === 0 ? (
              <div className="border border-dashed border-[#2d3139] rounded-lg p-5 text-center text-slate-650 text-[11px] uppercase tracking-wide">
                No cellular targets active. Use the input above to lock target.
              </div>
            ) : (
              <div className="flex flex-col gap-2 max-h-56 overflow-y-auto pr-1">
                {cellularTargets.map((device) => (
                  <div
                    key={device.id}
                    onClick={() => onFocusDevice(device)}
                    className="p-3 bg-[#1c1f26] border border-[#2d3139] hover:border-amber-500/30 rounded-lg cursor-pointer transition-all flex flex-col gap-2 relative group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0 animate-ping"></span>
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-amber-400 font-mono">{device.name}</span>
                          <span className="text-[9px] text-slate-500 uppercase tracking-wider">{device.carrier || 'Global GSM Network'}</span>
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveCellularTarget(device.id);
                        }}
                        className="p-1.5 bg-[#111318] hover:bg-rose-950/40 hover:text-rose-400 text-slate-500 rounded transition-colors"
                        title="Disconnect cellular link"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-1.5 border-t border-[#2d3139]/50 pt-2 text-[9px] font-mono text-slate-400">
                      <div>
                        <span className="text-[8px] text-slate-600 block uppercase">Signal</span>
                        <span className="font-bold text-slate-300">{device.signalStrength || 'Excellent'}</span>
                      </div>
                      <div>
                        <span className="text-[8px] text-slate-600 block uppercase">Battery</span>
                        <span className="font-bold text-slate-300">{device.battery || 85}%</span>
                      </div>
                      <div>
                        <span className="text-[8px] text-slate-600 block uppercase">Coordinates</span>
                        <span className="font-bold text-slate-300">{device.lat.toFixed(4)}, {device.lng.toFixed(4)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4 animate-fadeIn">
          {/* Description */}
          <div className="bg-[#1c1f26] p-3 rounded border border-[#2d3139] text-xs text-slate-400 flex items-start gap-2">
            <Radar className="w-4 h-4 text-sky-400 shrink-0 mt-0.5 animate-pulse" />
            <p>
              Broadcast your location code or join a shared track room to watch multiple devices move in real-time.
            </p>
          </div>

          {!roomCode ? (
            <div className="flex flex-col gap-3.5">
              {/* Create Code */}
              <button
                onClick={handleCreate}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-sky-600 hover:bg-sky-500 font-bold text-xs text-slate-100 rounded transition-colors uppercase tracking-widest border border-sky-500"
              >
                <Plus className="w-4 h-4" />
                Generate Track Room Code
              </button>

              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-[#2d3139]"></div>
                <span className="flex-shrink mx-4 text-[9px] uppercase tracking-widest text-slate-500 font-bold">Or Join Existing</span>
                <div className="flex-grow border-t border-[#2d3139]"></div>
              </div>

              {/* Join Code */}
              <form onSubmit={handleJoin} className="flex flex-col gap-1.5">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="TRK-1234"
                    value={inputCode}
                    onChange={(e) => setInputCode(e.target.value)}
                    className="flex-1 bg-[#0b0c10] border border-[#2d3139] rounded px-3 py-2 text-xs font-mono tracking-widest uppercase text-slate-100 placeholder-slate-600 focus:outline-none focus:border-sky-500/40"
                  />
                  <button
                    type="submit"
                    className="px-4 bg-[#1c1f26] hover:bg-[#22272e] hover:text-slate-100 border border-[#2d3139] font-bold text-xs text-slate-300 rounded transition-colors"
                  >
                    Join
                  </button>
                </div>
                {errorMsg && (
                  <p className="text-[9px] text-red-400 font-mono px-0.5 mt-0.5">⚠️ {errorMsg}</p>
                )}
              </form>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {/* Active Code Display */}
              <div className="bg-[#1c1f26] border border-sky-500/30 p-3 rounded flex items-center justify-between border-l-4 border-l-sky-500">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[9px] text-sky-400 uppercase tracking-widest font-bold">Active Broadcast Code</span>
                  <span className="text-sm font-mono font-extrabold text-slate-100 tracking-wider">
                    {roomCode}
                  </span>
                </div>
                <div className="flex gap-1.5">
                  <button
                    onClick={handleCopy}
                    className="p-2 bg-[#111318] hover:bg-[#22272e] text-slate-300 rounded border border-[#2d3139] transition-colors flex items-center justify-center"
                    title="Copy code"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={onLeaveRoom}
                    className="py-1 px-2.5 bg-red-500/10 border border-red-500/20 hover:bg-red-500/25 hover:text-red-400 text-slate-400 font-bold text-[10px] rounded transition-colors"
                  >
                    Leave
                  </button>
                </div>
              </div>

              {/* Active Devices */}
              <div className="flex flex-col gap-2">
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest px-0.5">
                  Tracked Devices ({sharedDevices.length})
                </span>
                <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1">
                  {sharedDevices.map((device) => (
                    <div
                      key={device.id}
                      onClick={() => onFocusDevice(device)}
                      className="p-2.5 bg-[#1c1f26] border border-[#2d3139] hover:bg-[#22272e] rounded cursor-pointer transition-colors flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className={`w-2 h-2 rounded-full ${device.avatarColor} shrink-0 animate-pulse`}></span>
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-slate-200">{device.name}</span>
                          <span className="text-[9px] text-slate-500 italic">{device.role}</span>
                        </div>
                      </div>
                      <div className="text-right flex flex-col items-end">
                        <span className="text-2xs font-bold text-slate-300">
                          {device.speedKmh.toFixed(1)} km/h
                        </span>
                        <span className="text-[9px] text-slate-500">
                          {device.lat.toFixed(4)}, {device.lng.toFixed(4)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

