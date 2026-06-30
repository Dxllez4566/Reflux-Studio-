import { useEffect, useState } from 'react';
import { MasterFX, Track } from '../types';
import { Sliders, Volume2, Music, Check, Settings, Shield, Activity, Power, Zap, ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from 'lucide-react';
import { audioEngine } from '../utils/audioEngine';

interface MixerProps {
  fx: MasterFX;
  selectedTrack: Track | undefined;
  onUpdateFX: (updatedFX: MasterFX) => void;
  isPlaying: boolean;
}

export default function Mixer({
  fx,
  selectedTrack,
  onUpdateFX,
  isPlaying,
}: MixerProps) {
  // Live amplitude levels for the VU meter (0 to 1)
  const [meterLevels, setMeterLevels] = useState<number[]>([0.02, 0.03]);
  const [compressorReduction, setCompressorReduction] = useState<number>(0);

  // Section minimization state
  const [isMixdownMinimized, setIsMixdownMinimized] = useState<boolean>(false);
  const [isMasterFXMinimized, setIsMasterFXMinimized] = useState<boolean>(false);
  const [isMixerMinimized, setIsMixerMinimized] = useState<boolean>(false);

  // Poll analyser data from Web Audio API Engine
  useEffect(() => {
    let animFrameId: number;

    const updateMeters = () => {
      if (isPlaying) {
        // Read live spectrum or envelope from audio engine
        const spectrum = audioEngine.getAnalyserData();
        // Sample two average bands for left/right meters
        const leftVal = Math.max(...spectrum.slice(0, 8)) || 0.02;
        const rightVal = Math.max(...spectrum.slice(8, 16)) || 0.03;
        
        // Add a bit of natural decay bounce
        setMeterLevels((prev) => [
          leftVal * 0.95 + prev[0] * 0.05,
          rightVal * 0.95 + prev[1] * 0.05
        ]);

        // Simulating glue compression needle reduction
        if (fx.compressor.enabled && (leftVal > 0.4 || rightVal > 0.4)) {
          const excess = Math.max(leftVal, rightVal) - 0.4;
          setCompressorReduction(excess * 15); // decibels of gain reduction (e.g. 0 to 6dB)
        } else {
          setCompressorReduction((prev) => Math.max(0, prev - 0.5));
        }
      } else {
        // Decay back to rest slowly
        setMeterLevels((prev) => [
          Math.max(0.01, prev[0] - 0.05),
          Math.max(0.01, prev[1] - 0.05)
        ]);
        setCompressorReduction((prev) => Math.max(0, prev - 0.4));
      }

      animFrameId = requestAnimationFrame(updateMeters);
    };

    updateMeters();

    return () => {
      cancelAnimationFrame(animFrameId);
    };
  }, [isPlaying, fx.compressor.enabled]);

  // Handle master FX parameters change
  const toggleFXEnable = (module: 'eq' | 'compressor' | 'limiter' | 'multiband') => {
    const updated = {
      ...fx,
      [module]: {
        ...fx[module],
        enabled: !fx[module].enabled,
      },
    };
    onUpdateFX(updated);
  };

  const updateEQBand = (band: 'low' | 'mid' | 'high', value: number) => {
    const updated = {
      ...fx,
      eq: {
        ...fx.eq,
        [band]: value,
      },
    };
    onUpdateFX(updated);
  };

  const updateCompressor = (param: string, value: number) => {
    const updated = {
      ...fx,
      compressor: {
        ...fx.compressor,
        [param]: value,
      },
    };
    onUpdateFX(updated);
  };

  const updateLimiter = (param: string, value: number) => {
    const updated = {
      ...fx,
      limiter: {
        ...fx.limiter,
        [param]: value,
      },
    };
    onUpdateFX(updated);
  };

  if (isMixerMinimized) {
    return (
      <div 
        onClick={() => setIsMixerMinimized(false)}
        className="bg-[#141417] border-t border-[#23232a] flex items-center justify-between h-[38px] px-4 w-full text-white cursor-pointer hover:bg-[#1a1a22] transition-colors select-none shrink-0"
        title="Expand Mixer & Master Panel"
      >
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-purple-400" />
            <span className="text-[11px] font-sans font-bold tracking-widest text-[#9c9cb4] uppercase">
              MIXER & MASTER (MINIMIZED)
            </span>
          </div>
          <span className="text-[10px] text-gray-400 hidden md:inline">
            Focused track: <span className="font-bold text-emerald-400">{selectedTrack?.name || 'Master'}</span>
          </span>
        </div>

        {/* Mini live VU level animation in the collapsed bar */}
        <div className="flex items-center gap-3">
          <div className="flex gap-1 bg-[#09090b] px-2 py-0.5 rounded border border-[#202026] h-5 items-center">
            {[0, 1].map((channelIdx) => {
              const level = meterLevels[channelIdx];
              return (
                <div key={channelIdx} className="w-6 h-1.5 bg-[#1c1c22] rounded-sm relative overflow-hidden">
                  <div 
                    className="h-full absolute left-0 transition-all duration-75"
                    style={{
                      width: `${level * 100}%`,
                      background: 'linear-gradient(to right, #10b981, #eab308, #ef4444)'
                    }}
                  />
                </div>
              );
            })}
          </div>

          <button 
            onClick={(e) => {
              e.stopPropagation();
              setIsMixerMinimized(false);
            }}
            className="p-1 rounded text-purple-400 hover:text-white hover:bg-purple-600/20 transition-all cursor-pointer"
            title="Expand panel"
          >
            <ChevronUp className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div id="mixer-container" className="bg-[#141417] border-t border-[#23232a] flex flex-col h-[280px] w-full text-white select-none shrink-0">
      
      {/* 1. Sub Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[#23232a] bg-[#1a1a20]">
        <div className="flex items-center gap-6">
          <span className="text-xs font-sans font-bold tracking-widest text-[#9898b3] uppercase">
            MIXER & MASTER
          </span>

          {/* Quick minimize toggle options */}
          <div className="flex items-center gap-2 bg-[#121216] p-1 rounded-lg border border-[#23232a]">
            <button
              onClick={() => setIsMixdownMinimized(!isMixdownMinimized)}
              className={`text-[10px] px-2 py-1 rounded transition-colors flex items-center gap-1 cursor-pointer font-sans font-semibold ${
                isMixdownMinimized 
                  ? 'bg-purple-600 text-white' 
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
              title="Minimize/Restore Mixdown (Fader & VU Meter)"
            >
              <Volume2 className="w-3 h-3" />
              <span>{isMixdownMinimized ? 'Show Mixdown' : 'Minimise Mixdown'}</span>
            </button>

            <button
              onClick={() => setIsMasterFXMinimized(!isMasterFXMinimized)}
              className={`text-[10px] px-2 py-1 rounded transition-colors flex items-center gap-1 cursor-pointer font-sans font-semibold ${
                isMasterFXMinimized 
                  ? 'bg-purple-600 text-white' 
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
              title="Minimize/Restore Master Effects Section"
            >
              <Activity className="w-3 h-3" />
              <span>{isMasterFXMinimized ? 'Show Master FX' : 'Minimise Master FX'}</span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Branding Badge: Built with Hercules */}
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-[#121215] border border-[#23232c] rounded-full text-xs font-sans text-white shadow-inner select-none">
            <Zap className="w-3.5 h-3.5 text-yellow-400 fill-current" />
            <span className="font-semibold tracking-tight text-gray-200">
              Built with <span className="font-sans font-extrabold text-white italic">Hercules</span>
            </span>
          </div>

          <button
            onClick={() => setIsMixerMinimized(true)}
            className="p-1 rounded text-gray-400 hover:text-white hover:bg-gray-800 transition-colors cursor-pointer"
            title="Minimize Entire Panel"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Main Content Grid (VU Meter & Channel Strip Left + Master FX Chain Right) */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* A. VU LEVEL METERS AND FOCUSED STRIP */}
        {!isMixdownMinimized && (
          <div className="w-[180px] border-r border-[#23232a] flex items-center p-3 gap-3 shrink-0 bg-[#101012]">
          
          {/* Dynamic LED Volume Meters */}
          <div className="flex gap-1.5 h-full bg-[#09090b] px-2 py-3 rounded-lg border border-[#202026] relative flex-1 justify-center">
            {[0, 1].map((channelIdx) => {
              const level = meterLevels[channelIdx];
              return (
                <div key={channelIdx} className="w-3.5 h-full rounded bg-[#1c1c22] relative overflow-hidden flex flex-col justify-end">
                  {/* LED Segments indicator */}
                  <div 
                    className="w-full absolute bottom-0 transition-all duration-75"
                    style={{
                      height: `${level * 100}%`,
                      background: 'linear-gradient(to top, #10b981 0%, #10b981 60%, #eab308 80%, #ef4444 100%)',
                      boxShadow: '0 0 10px rgba(16, 185, 129, 0.4)'
                    }}
                  />
                  {/* Ledger grid lines */}
                  <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20">
                    {Array.from({ length: 8 }).map((_, idx) => (
                      <div key={idx} className="w-full h-[1px] bg-white" />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Master Strip label */}
          <div className="flex flex-col justify-between h-full py-1">
            <div className="text-center">
              <span className="text-[10px] font-sans font-extrabold tracking-wider text-gray-500 uppercase block">FOCUSED</span>
              <p className="text-xs font-bold text-emerald-400 truncate max-w-[80px] mt-1" title={selectedTrack?.name || 'Master'}>
                {selectedTrack?.name || 'Master'}
              </p>
            </div>

            <div className="text-center bg-[#1c1c24] px-1.5 py-2.5 rounded border border-[#2d2d38] shadow-md">
              <span className="text-[11px] font-mono font-bold text-gray-300 block">
                {selectedTrack ? `${Math.round(selectedTrack.volume * 100)}%` : '100%'}
              </span>
              <span className="text-[8px] font-sans text-gray-500 uppercase block mt-0.5">Gain</span>
            </div>
          </div>
        </div>
        )}

        {/* B. MASTER EFFECTS CHAIN */}
        {!isMasterFXMinimized && (
          <div className="flex-1 overflow-x-auto p-4 flex gap-4 bg-[#121215]">
          
          {/* --- 1. EQ EIGHT --- */}
          <div className="w-[200px] bg-[#1a1a20] rounded-xl border border-[#2a2a35] p-3 flex flex-col justify-between shrink-0 shadow-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleFXEnable('eq')}
                  className={`w-5 h-5 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                    fx.eq.enabled 
                      ? 'bg-emerald-500 text-black shadow-md shadow-emerald-500/20' 
                      : 'bg-gray-800 text-gray-500'
                  }`}
                >
                  <Power className="w-3 h-3" />
                </button>
                <span className="text-xs font-sans font-bold text-gray-200">EQ Eight</span>
              </div>
              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: fx.eq.enabled ? '#10b981' : '#4b5563' }} />
            </div>

            {/* EQ Knobs/Sliders */}
            <div className="grid grid-cols-3 gap-2 mt-2">
              <div className="flex flex-col items-center">
                <span className="text-[9px] text-gray-400 font-mono">LOW</span>
                <input
                  type="range"
                  min="-12"
                  max="12"
                  step="0.5"
                  value={fx.eq.low}
                  disabled={!fx.eq.enabled}
                  onChange={(e) => updateEQBand('low', parseFloat(e.target.value))}
                  className="h-16 w-1 vertical-slider accent-emerald-500 my-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                  style={{ writingMode: 'bt-lr', WebkitAppearance: 'slider-vertical' } as any}
                />
                <span className="text-[9px] font-mono text-emerald-400 font-bold">{fx.eq.low > 0 ? `+${fx.eq.low}` : fx.eq.low}dB</span>
              </div>

              <div className="flex flex-col items-center">
                <span className="text-[9px] text-gray-400 font-mono">MID</span>
                <input
                  type="range"
                  min="-12"
                  max="12"
                  step="0.5"
                  value={fx.eq.mid}
                  disabled={!fx.eq.enabled}
                  onChange={(e) => updateEQBand('mid', parseFloat(e.target.value))}
                  className="h-16 w-1 vertical-slider accent-emerald-500 my-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                  style={{ writingMode: 'bt-lr', WebkitAppearance: 'slider-vertical' } as any}
                />
                <span className="text-[9px] font-mono text-emerald-400 font-bold">{fx.eq.mid > 0 ? `+${fx.eq.mid}` : fx.eq.mid}dB</span>
              </div>

              <div className="flex flex-col items-center">
                <span className="text-[9px] text-gray-400 font-mono">HI</span>
                <input
                  type="range"
                  min="-12"
                  max="12"
                  step="0.5"
                  value={fx.eq.high}
                  disabled={!fx.eq.enabled}
                  onChange={(e) => updateEQBand('high', parseFloat(e.target.value))}
                  className="h-16 w-1 vertical-slider accent-emerald-500 my-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                  style={{ writingMode: 'bt-lr', WebkitAppearance: 'slider-vertical' } as any}
                />
                <span className="text-[9px] font-mono text-emerald-400 font-bold">{fx.eq.high > 0 ? `+${fx.eq.high}` : fx.eq.high}dB</span>
              </div>
            </div>
          </div>

          {/* --- 2. GLUE COMPRESSOR --- */}
          <div className="w-[240px] bg-[#1a1a20] rounded-xl border border-[#2a2a35] p-3 flex flex-col justify-between shrink-0 shadow-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleFXEnable('compressor')}
                  className={`w-5 h-5 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                    fx.compressor.enabled 
                      ? 'bg-[#f59e0b] text-black shadow-md shadow-amber-500/20' 
                      : 'bg-gray-800 text-gray-500'
                  }`}
                >
                  <Power className="w-3 h-3" />
                </button>
                <span className="text-xs font-sans font-bold text-gray-200">Glue Compressor</span>
              </div>
              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: fx.compressor.enabled ? '#f59e0b' : '#4b5563' }} />
            </div>

            {/* Compressor controls & VU compression needle meter */}
            <div className="flex gap-3 mt-2 items-center">
              {/* Needle Gain Reduction Meter */}
              <div className="w-12 h-16 bg-[#101012] border border-[#2d2d38] rounded-md relative overflow-hidden flex flex-col items-center justify-end p-1">
                <div className="absolute top-1 text-[7.5px] font-mono text-gray-500">G.RED</div>
                <div 
                  className="w-1 bg-[#f59e0b] absolute top-1 transition-all duration-100 rounded-full"
                  style={{
                    bottom: '4px',
                    height: `${Math.min(90, compressorReduction * 15)}%`,
                    boxShadow: '0 0 8px #f59e0b'
                  }}
                />
                <span className="text-[8px] font-mono text-amber-500 mt-1">
                  {Math.round(compressorReduction)}dB
                </span>
              </div>

              {/* Sliders */}
              <div className="flex-1 space-y-1.5 text-[10px]">
                {/* Threshold slider */}
                <div className="flex flex-col">
                  <div className="flex justify-between font-mono text-gray-400">
                    <span>Thresh:</span>
                    <span className="text-amber-400 font-bold">{fx.compressor.threshold} dB</span>
                  </div>
                  <input
                    type="range"
                    min="-40"
                    max="0"
                    step="1"
                    value={fx.compressor.threshold}
                    disabled={!fx.compressor.enabled}
                    onChange={(e) => updateCompressor('threshold', parseInt(e.target.value))}
                    className="w-full accent-amber-500 h-1 bg-gray-700 rounded-lg cursor-pointer"
                  />
                </div>

                {/* Ratio dropdown */}
                <div className="flex justify-between items-center bg-[#121215] p-1.5 rounded border border-[#2b2b35]">
                  <span className="text-gray-400">Ratio:</span>
                  <select
                    value={fx.compressor.ratio}
                    disabled={!fx.compressor.enabled}
                    onChange={(e) => updateCompressor('ratio', parseFloat(e.target.value))}
                    className="bg-transparent text-amber-400 focus:outline-none cursor-pointer font-mono font-bold"
                  >
                    <option value="2">2.0:1</option>
                    <option value="3">3.0:1</option>
                    <option value="4">4.0:1</option>
                    <option value="10">10.0:1</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* --- 3. LIMITER --- */}
          <div className="w-[180px] bg-[#1a1a20] rounded-xl border border-[#2a2a35] p-3 flex flex-col justify-between shrink-0 shadow-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleFXEnable('limiter')}
                  className={`w-5 h-5 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                    fx.limiter.enabled 
                      ? 'bg-[#ef4444] text-white shadow-md shadow-red-500/20' 
                      : 'bg-gray-800 text-gray-500'
                  }`}
                >
                  <Power className="w-3 h-3" />
                </button>
                <span className="text-xs font-sans font-bold text-gray-200">Limiter</span>
              </div>
              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: fx.limiter.enabled ? '#ef4444' : '#4b5563' }} />
            </div>

            <div className="space-y-2 mt-2 text-[10px]">
              {/* Ceiling */}
              <div className="flex flex-col">
                <div className="flex justify-between font-mono text-gray-400">
                  <span>Ceiling:</span>
                  <span className="text-red-400 font-bold">{fx.limiter.ceiling} dB</span>
                </div>
                <input
                  type="range"
                  min="-12"
                  max="0"
                  step="0.1"
                  value={fx.limiter.ceiling}
                  disabled={!fx.limiter.enabled}
                  onChange={(e) => updateLimiter('ceiling', parseFloat(e.target.value))}
                  className="w-full accent-red-500 h-1 bg-gray-700 rounded-lg cursor-pointer"
                />
              </div>

              {/* Release */}
              <div className="flex flex-col">
                <div className="flex justify-between font-mono text-gray-400">
                  <span>Release:</span>
                  <span className="text-red-400 font-bold">{Math.round(fx.limiter.release * 1000)} ms</span>
                </div>
                <input
                  type="range"
                  min="0.01"
                  max="0.5"
                  step="0.01"
                  value={fx.limiter.release}
                  disabled={!fx.limiter.enabled}
                  onChange={(e) => updateLimiter('release', parseFloat(e.target.value))}
                  className="w-full accent-red-500 h-1 bg-gray-700 rounded-lg cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* --- 4. MULTIBAND DYNAMICS --- */}
          <div className="w-[180px] bg-[#1a1a20] rounded-xl border border-[#2a2a35] p-3 flex flex-col justify-between shrink-0 shadow-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleFXEnable('multiband')}
                  className={`w-5 h-5 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                    fx.multiband.enabled 
                      ? 'bg-purple-500 text-white shadow-md shadow-purple-500/20' 
                      : 'bg-gray-800 text-gray-500'
                  }`}
                >
                  <Power className="w-3 h-3" />
                </button>
                <span className="text-xs font-sans font-bold text-gray-200">Multiband</span>
              </div>
              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: fx.multiband.enabled ? '#a855f7' : '#4b5563' }} />
            </div>

            {/* Bands selectors */}
            <div className="grid grid-cols-3 gap-1 mt-2 text-[9.5px]">
              <button 
                onClick={() => {
                  if (fx.multiband.enabled) {
                    onUpdateFX({ ...fx, multiband: { ...fx.multiband, lowBand: !fx.multiband.lowBand } });
                  }
                }}
                className={`py-2 px-1 rounded-md font-semibold text-center border transition-all ${
                  fx.multiband.enabled && fx.multiband.lowBand
                    ? 'bg-purple-600 border-purple-400 text-white shadow'
                    : 'bg-[#22222a] border-transparent text-gray-500'
                }`}
              >
                LOW
              </button>
              <button 
                onClick={() => {
                  if (fx.multiband.enabled) {
                    onUpdateFX({ ...fx, multiband: { ...fx.multiband, midBand: !fx.multiband.midBand } });
                  }
                }}
                className={`py-2 px-1 rounded-md font-semibold text-center border transition-all ${
                  fx.multiband.enabled && fx.multiband.midBand
                    ? 'bg-purple-600 border-purple-400 text-white shadow'
                    : 'bg-[#22222a] border-transparent text-gray-500'
                }`}
              >
                MID
              </button>
              <button 
                onClick={() => {
                  if (fx.multiband.enabled) {
                    onUpdateFX({ ...fx, multiband: { ...fx.multiband, highBand: !fx.multiband.highBand } });
                  }
                }}
                className={`py-2 px-1 rounded-md font-semibold text-center border transition-all ${
                  fx.multiband.enabled && fx.multiband.highBand
                    ? 'bg-purple-600 border-purple-400 text-white shadow'
                    : 'bg-[#22222a] border-transparent text-gray-500'
                }`}
              >
                HIGH
              </button>
            </div>
          </div>

        </div>
        )}

        {/* C. ALL MINIMIZED FALLBACK PLACEHOLDER */}
        {isMixdownMinimized && isMasterFXMinimized && (
          <div className="flex-1 flex flex-col items-center justify-center text-center gap-2 text-gray-500 bg-[#121215] p-6 select-none">
            <Sliders className="w-8 h-8 text-purple-500 animate-pulse" />
            <p className="text-xs font-semibold text-gray-400">Mixdown and Master sections are both minimized.</p>
            <p className="text-[10px] text-gray-500 max-w-xs leading-relaxed">
              Use the top-left toggle bar buttons inside the Mixer panel to restore specific views or view focused levels.
            </p>
            <button
              onClick={() => {
                setIsMixdownMinimized(false);
                setIsMasterFXMinimized(false);
              }}
              className="mt-2 text-xs text-purple-400 hover:text-purple-300 font-bold underline cursor-pointer"
            >
              Restore Sections
            </button>
          </div>
        )}

      </div>

    </div>
  );
}
