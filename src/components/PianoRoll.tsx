import { useState, useRef, useEffect } from 'react';
import { PIANO_KEYS, NOTE_FREQ, audioEngine } from '../utils/audioEngine';
import { Clip, Note, TrackType } from '../types';
import { Play, Square, Trash2, X, Plus, Info, Minimize2, Maximize2, ChevronDown, ChevronUp, Volume2 } from 'lucide-react';

interface PianoRollProps {
  clip: Clip;
  trackType: TrackType;
  trackColor: string;
  onUpdateClip: (updatedClip: Clip) => void;
  onClose: () => void;
  isProjectPlaying?: boolean;
  onPreviewStart?: () => void;
}

export default function PianoRoll({
  clip,
  trackType,
  trackColor,
  onUpdateClip,
  onClose,
  isProjectPlaying = false,
  onPreviewStart,
}: PianoRollProps) {
  const [selectedNoteLength, setSelectedNoteLength] = useState<number>(0.5); // Default 0.5 beat (eighth note)
  const [selectedVelocity, setSelectedVelocity] = useState<number>(0.8);
  const [isLoopingPreview, setIsLoopingPreview] = useState<boolean>(false);
  const [previewTimer, setPreviewTimer] = useState<any>(null);
  const [localPlayhead, setLocalPlayhead] = useState<number>(-1);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [isMaximized, setIsMaximized] = useState<boolean>(false);

  const gridRef = useRef<HTMLDivElement>(null);

  // Grid settings: 16 beats total, subdivided into 16th notes (4 steps per beat)
  const beatsCount = clip.durationBeats || 16;
  const stepsPerBeat = 4; // 16th note resolution
  const totalSteps = beatsCount * stepsPerBeat;
  const [stepWidthPx, setStepWidthPx] = useState<number>(44); // width of each step cell (supports dynamic zoom)

  // Stop piano roll preview if main project starts playing
  useEffect(() => {
    if (isProjectPlaying && isLoopingPreview) {
      if (previewTimer) {
        clearInterval(previewTimer);
        setPreviewTimer(null);
      }
      setIsLoopingPreview(false);
      setLocalPlayhead(-1);
    }
  }, [isProjectPlaying, isLoopingPreview, previewTimer]);

  // Play preview inside Piano Roll
  const togglePreviewLoop = () => {
    if (isLoopingPreview) {
      if (previewTimer) {
        clearInterval(previewTimer);
        setPreviewTimer(null);
      }
      setIsLoopingPreview(false);
      setLocalPlayhead(-1);
    } else {
      // Notify to stop the main timeline playhead if it's currently playing
      if (onPreviewStart) {
        onPreviewStart();
      }

      setIsLoopingPreview(true);
      let step = 0;
      setLocalPlayhead(0);
      
      const timer = setInterval(() => {
        const beatPosition = step * 0.25;
        setLocalPlayhead(beatPosition);

        // Find notes that start at this specific beat position
        const notesToPlay = clip.notes.filter(
          (n) => Math.abs(n.startBeat - beatPosition) < 0.05
        );

        notesToPlay.forEach((note) => {
          audioEngine.playNotePreview(note.pitch, trackType, note.velocity);
        });

        step = (step + 1) % totalSteps;
      }, 125); // 120 bpm eighth-note is 250ms, 16th is 125ms

      setPreviewTimer(timer);
    }
  };

  useEffect(() => {
    return () => {
      if (previewTimer) {
        clearInterval(previewTimer);
      }
    };
  }, [previewTimer]);

  // Play all notes programmed at a specific beat column
  const playNotesAtBeat = (beat: number) => {
    const notesToPlay = clip.notes.filter(
      (n) => Math.abs(n.startBeat - beat) < 0.12
    );
    if (notesToPlay.length > 0) {
      notesToPlay.forEach((note) => {
        audioEngine.playNotePreview(note.pitch, trackType, note.velocity);
      });
    }
  };

  // Key click preview
  const handleKeyClick = (pitch: string) => {
    audioEngine.playNotePreview(pitch, trackType, 0.8);
  };

  // Click on grid cell
  const handleGridCellClick = (pitch: string, stepIndex: number) => {
    const startBeat = stepIndex / stepsPerBeat;
    
    // Check if a note already exists at this pitch and startBeat
    const noteIndex = clip.notes.findIndex(
      (n) => n.pitch === pitch && Math.abs(n.startBeat - startBeat) < 0.05
    );

    if (noteIndex > -1) {
      // Note exists -> REMOVE IT
      const updatedNotes = clip.notes.filter((_, idx) => idx !== noteIndex);
      onUpdateClip({
        ...clip,
        notes: updatedNotes,
      });
    } else {
      // Note doesn't exist -> ADD IT
      const newNote: Note = {
        id: `note-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
        pitch,
        startBeat,
        durationBeats: selectedNoteLength,
        velocity: selectedVelocity,
      };

      // Play note instantly on add
      audioEngine.playNotePreview(pitch, trackType, selectedVelocity);

      onUpdateClip({
        ...clip,
        notes: [...clip.notes, newNote],
      });
    }
  };

  // Clear all notes
  const handleClearAll = () => {
    if (confirm("Are you sure you want to clear all notes in this patch?")) {
      onUpdateClip({
        ...clip,
        notes: [],
      });
    }
  };

  // Check if a cell contains a note or part of a note
  const getNoteAtCell = (pitch: string, stepIndex: number) => {
    const beat = stepIndex / stepsPerBeat;
    return clip.notes.find((n) => {
      if (n.pitch !== pitch) return false;
      // Note covers the cell if the cell beat lies between note start and note end
      const noteEnd = n.startBeat + n.durationBeats;
      return beat >= n.startBeat && beat < noteEnd - 0.01;
    });
  };

  if (isMinimized) {
    return (
      <div 
        onClick={() => {
          setIsMinimized(false);
        }}
        className="bg-[#18181c] border-t border-[#2d2d34] flex items-center justify-between h-[38px] px-4 w-full text-white cursor-pointer hover:bg-[#202026] transition-colors select-none shrink-0 z-40"
        title="Expand Piano Roll Editor"
      >
        <div className="flex items-center gap-3">
          <div 
            className="w-2.5 h-2.5 rounded-full animate-pulse" 
            style={{ backgroundColor: trackColor }}
          />
          <span className="text-[11px] font-sans font-bold tracking-widest text-[#9c9cb4] uppercase">
            PIANO ROLL: {clip.name} (MINIMIZED)
          </span>
          <span className="text-[10px] text-gray-500 hidden sm:inline font-mono">
            ({clip.notes.length} notes programmed • Click anywhere to expand)
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsMinimized(false);
            }}
            className="p-1 rounded text-purple-400 hover:text-white hover:bg-purple-600/20 transition-all cursor-pointer"
            title="Expand Piano Roll"
          >
            <ChevronUp className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="p-1 rounded text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-all cursor-pointer"
            title="Close Piano Roll"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div 
      id="piano-roll-container" 
      className="bg-[#18181c] border-t border-[#2d2d34] flex flex-col w-full text-white overflow-hidden shadow-2xl relative z-40 select-none shrink-0"
      style={{ height: isMaximized ? '540px' : '380px' }}
    >
      
      {/* 1. Header Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[#2d2d34] bg-[#1e1e24]">
        <div className="flex items-center gap-3">
          <div 
            className="w-3 h-3 rounded-full shadow-md animate-pulse" 
            style={{ backgroundColor: trackColor }}
          />
          <h3 className="font-sans font-semibold text-sm tracking-tight flex items-center gap-2">
            Piano Roll <span className="text-[#8e8e9f] font-normal">({clip.name})</span>
          </h3>
          <span className="text-[10px] font-mono bg-[#2e2e38] text-[#9a9ab0] px-2 py-0.5 rounded uppercase">
            {trackType} Engine
          </span>
        </div>

        {/* Toolbar parameters */}
        <div className="flex items-center gap-4 text-xs">
          {/* Zoom Level Control */}
          <div className="flex items-center gap-2 bg-[#121215] px-2.5 py-1 rounded-md border border-[#2d2d34]">
            <span className="text-gray-400 font-medium">Zoom:</span>
            <input 
              type="range" 
              min="20" 
              max="120" 
              step="4"
              value={stepWidthPx}
              onChange={(e) => setStepWidthPx(parseInt(e.target.value))}
              className="w-16 accent-purple-500 h-1 rounded-lg bg-gray-700 cursor-pointer"
              title="Drag to zoom horizontally inside Piano Roll grid"
            />
            <span className="font-mono text-purple-400 font-semibold w-10 text-right text-[11px]">
              {Math.round((stepWidthPx / 44) * 100)}%
            </span>
          </div>

          {/* Note length selector */}
          <div className="flex items-center gap-2 bg-[#121215] px-2.5 py-1 rounded-md border border-[#2d2d34]">
            <span className="text-gray-400 font-medium">Len:</span>
            <select 
              value={selectedNoteLength} 
              onChange={(e) => setSelectedNoteLength(parseFloat(e.target.value))}
              className="bg-transparent text-white focus:outline-none cursor-pointer font-mono font-medium text-xs"
            >
              <option value="0.25">1/16 Beat</option>
              <option value="0.5">1/8 Beat</option>
              <option value="1.0">1/4 Beat</option>
              <option value="2.0">1/2 Beat</option>
              <option value="4.0">1 Beat (Full)</option>
            </select>
          </div>

          {/* Note velocity selector */}
          <div className="flex items-center gap-2 bg-[#121215] px-2.5 py-1 rounded-md border border-[#2d2d34]">
            <span className="text-gray-400 font-medium">Velocity:</span>
            <input 
              type="range" 
              min="0.1" 
              max="1.0" 
              step="0.1"
              value={selectedVelocity}
              onChange={(e) => setSelectedVelocity(parseFloat(e.target.value))}
              className="w-16 accent-emerald-500 h-1 rounded-lg bg-gray-700 cursor-pointer"
            />
            <span className="font-mono text-emerald-400 font-semibold w-6 text-right">
              {Math.round(selectedVelocity * 100)}
            </span>
          </div>

          {/* Loop Preview Player */}
          <button
            onClick={togglePreviewLoop}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-all ${
              isLoopingPreview 
                ? 'bg-[#ec4899] text-white shadow-lg shadow-pink-500/20' 
                : 'bg-[#2a2a35] hover:bg-[#343442] text-gray-200'
            }`}
          >
            {isLoopingPreview ? <Square className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current" />}
            {isLoopingPreview ? 'Stop' : 'Loop Test'}
          </button>

          {/* Clear Button */}
          <button
            onClick={handleClearAll}
            className="flex items-center gap-1 text-gray-400 hover:text-red-400 hover:bg-red-500/10 px-2.5 py-1 rounded transition-colors"
            title="Clear all notes in clip"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear
          </button>
        </div>

        {/* Actions (Minimize, Maximize, Close) */}
        <div className="flex items-center gap-1.5 ml-2 border-l border-[#2d2d34] pl-2">
          {/* Minimize Button */}
          <button
            onClick={() => setIsMinimized(true)}
            className="text-gray-400 hover:text-white hover:bg-gray-800 p-1.5 rounded-md transition-colors cursor-pointer"
            title="Minimize Piano Roll to bottom bar"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>

          {/* Maximize/Restore Button */}
          <button
            onClick={() => setIsMaximized(!isMaximized)}
            className="text-gray-400 hover:text-white hover:bg-gray-800 p-1.5 rounded-md transition-colors cursor-pointer"
            title={isMaximized ? "Restore standard size" : "Maximize editor size"}
          >
            {isMaximized ? (
              <Minimize2 className="w-3.5 h-3.5" />
            ) : (
              <Maximize2 className="w-3.5 h-3.5" />
            )}
          </button>

          {/* Close Button */}
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-red-400 hover:bg-red-500/10 p-1.5 rounded-md transition-colors ml-1 cursor-pointer"
            title="Close Piano Roll"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 2. Interactive Scrollable Grid Area */}
      <div className="flex flex-1 overflow-auto bg-[#101012] relative">
        
        {/* Left Side: Sticky Piano Keyboard */}
        <div className="sticky left-0 z-30 flex flex-col w-20 bg-[#121215] border-r border-[#2d2d34] shadow-lg">
          {PIANO_KEYS.map((key) => {
            const isBlack = key.includes('#');
            return (
              <button
                key={key}
                onClick={() => handleKeyClick(key)}
                className={`flex items-center justify-between px-2 text-[10px] font-mono h-6 border-b border-[#202026] text-right shrink-0 transition-colors ${
                  isBlack 
                    ? 'bg-[#15151a] hover:bg-[#202026] text-[#e0a96d]' 
                    : 'bg-[#ffffff] hover:bg-[#e0e0e0] text-[#121215] font-semibold'
                }`}
              >
                <span>{key}</span>
                <span className={`w-1.5 h-1.5 rounded-full ${isBlack ? 'bg-[#e0a96d]/40' : 'bg-[#121215]/25'}`} />
              </button>
            );
          })}
        </div>

        {/* Right Side: Scrollable Grid Canvas */}
        <div 
          ref={gridRef}
          className="relative flex-1 flex flex-col"
          style={{ width: `${totalSteps * stepWidthPx}px` }}
        >
          {/* Vertical Playhead Line for Preview Loop */}
          {isLoopingPreview && localPlayhead >= 0 && (
            <div 
              className="absolute top-0 bottom-0 w-0.5 bg-[#ec4899] z-20 pointer-events-none transition-all duration-100 ease-linear shadow-[0_0_10px_#ec4899]"
              style={{ left: `${localPlayhead * stepsPerBeat * stepWidthPx}px` }}
            />
          )}

          {/* Grid rows matching the piano keys */}
          {PIANO_KEYS.map((key) => {
            return (
              <div 
                key={`row-${key}`}
                className="flex h-6 border-b border-[#1d1d24] shrink-0"
              >
                {Array.from({ length: totalSteps }).map((_, stepIndex) => {
                  const beatIndex = Math.floor(stepIndex / stepsPerBeat);
                  const isBeatStart = stepIndex % stepsPerBeat === 0;
                  const isBarStart = stepIndex % (stepsPerBeat * 4) === 0;
                  
                  // Query if a note occupies this grid cell
                  const note = getNoteAtCell(key, stepIndex);
                  const isNoteHead = note && Math.abs(note.startBeat - (stepIndex / stepsPerBeat)) < 0.05;

                  return (
                    <div
                      key={`cell-${key}-${stepIndex}`}
                      onClick={() => handleGridCellClick(key, stepIndex)}
                      className={`h-full shrink-0 relative border-r border-[#15151a] cursor-pointer transition-colors hover:bg-white/5 ${
                        isBarStart 
                          ? 'bg-white/[0.04]' 
                          : isBeatStart 
                            ? 'bg-white/[0.015]' 
                            : 'bg-transparent'
                      }`}
                      style={{ width: `${stepWidthPx}px` }}
                    >
                      {/* Render note element inside cell */}
                      {note && (
                        <div
                          className="absolute inset-y-[2px] left-[2px] right-[2px] rounded-sm flex items-center justify-start px-1 text-[8px] font-mono font-semibold select-none shadow-[0_1px_5px_rgba(0,0,0,0.3)] pointer-events-none"
                          style={{
                            backgroundColor: trackColor,
                            color: '#121215',
                            opacity: isNoteHead ? 1.0 : 0.75,
                            borderLeft: isNoteHead ? '3px solid rgba(255,255,255,0.7)' : 'none'
                          }}
                        >
                          {isNoteHead && (
                            <span className="truncate">
                              {note.pitch} (V:{Math.round(note.velocity * 100)})
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}

          {/* Timeline marker tags at bottom */}
          <div className="flex h-8 bg-[#16161c] border-t border-[#2a2a35] shrink-0 text-[10px] font-mono text-gray-500 items-center select-none sticky bottom-0 z-10">
            {Array.from({ length: beatsCount }).map((_, b) => (
              <div 
                key={`beat-lbl-${b}`} 
                onClick={() => playNotesAtBeat(b)}
                className="flex items-center justify-between px-3 border-r border-[#24242e] h-full shrink-0 hover:bg-[#202028] hover:text-white cursor-pointer transition-all group select-none"
                style={{ width: `${stepWidthPx * stepsPerBeat}px` }}
                title={`Click to play section hit at Beat ${b + 1}`}
              >
                <div className="flex items-center">
                  <span className="text-emerald-500 font-bold mr-1.5">Bar {Math.floor(b / 4) + 1}</span>
                  <span>Beat {b + 1}</span>
                </div>
                
                {/* Micro Speaker hit cue */}
                <div className="flex items-center gap-1 bg-purple-500/10 px-1.5 py-0.5 rounded border border-purple-500/20 text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Volume2 className="w-3 h-3 text-purple-400" />
                  <span className="text-[8px] font-sans font-black tracking-widest uppercase">HIT</span>
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>

      {/* Help tooltip banner */}
      <div className="flex items-center gap-1.5 bg-[#121216] px-4 py-1.5 text-[10.5px] text-[#8e8e9f] border-t border-[#23232a]">
        <Info className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
        <span>Double-tap/double-click on any grid cell to quickly place/remove a MIDI note. Use <strong>Len</strong> to change note length prior to placing.</span>
      </div>

    </div>
  );
}
