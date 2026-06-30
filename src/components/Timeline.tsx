import React, { useRef, useState, useEffect } from 'react';
import { Track, Clip, AutomationPoint, AutomationLane } from '../types';
import { Volume2, VolumeX, Guitar, Mic, Music, Drum, Sliders, Activity, Zap, Play, Square, Circle, Trash2, Copy, ArrowLeft, ArrowRight, CornerDownRight, ChevronDown, Plus, Upload, FolderPlus } from 'lucide-react';
import { audioEngine } from '../utils/audioEngine';

interface TimelineProps {
  tracks: Track[];
  clips: Clip[];
  currentBeat: number;
  selectedTrackId: string;
  onSelectTrack: (trackId: string) => void;
  onUpdateTrack: (updatedTrack: Track) => void;
  onClipDoubleTapped: (clip: Clip) => void;
  onUpdateClips: (updatedClips: Clip[]) => void;
  onAddTrack: (type: 'synth' | 'drum' | 'sampler') => void;
  onPlayheadMove: (beat: number) => void;
  onPlayFromBeat?: (beat: number) => void;
  onAddClipToTrackAtBeat?: (trackId: string, sampleName: string, durationBeats: number, beat: number) => void;
  isPlaying: boolean;
  isRecordingAutomation: boolean;
}

export default function Timeline({
  tracks,
  clips,
  currentBeat,
  selectedTrackId,
  onSelectTrack,
  onUpdateTrack,
  onClipDoubleTapped,
  onUpdateClips,
  onAddTrack,
  onPlayheadMove,
  onPlayFromBeat,
  onAddClipToTrackAtBeat,
  isPlaying,
  isRecordingAutomation
}: TimelineProps) {
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [expandedAutomationTracks, setExpandedAutomationTracks] = useState<Record<string, boolean>>({});
  const [selectedAutomationParams, setSelectedAutomationParams] = useState<Record<string, 'volume' | 'filterCutoff' | 'pan'>>({});
  const [draggingPoint, setDraggingPoint] = useState<{ trackId: string; parameter: 'volume' | 'filterCutoff' | 'pan'; pointId: string } | null>(null);

  const gridContainerRef = useRef<HTMLDivElement>(null);
  const addTrackDropdownRef = useRef<HTMLDivElement>(null);

  // Touch/Double-tap tracker for clips
  const lastTapRef = useRef<{ clipId: string; time: number } | null>(null);
  
  // Touch/Double-tap tracker for background grid canvas
  const lastCanvasTapRef = useRef<{ trackId: string; time: number } | null>(null);

  const totalBeats = 64;
  const [beatWidthPx, setBeatWidthPx] = useState<number>(110); // Standardized horizontal spacing for track grids (Lengthy racks)
  const timelineWidthPx = totalBeats * beatWidthPx;

  const [isAddTrackDropdownOpen, setIsAddTrackDropdownOpen] = useState(false);

  // --- AUTOMATION HELPERS ---
  
  const getSelectedParam = (trackId: string): 'volume' | 'filterCutoff' | 'pan' => {
    return selectedAutomationParams[trackId] || 'volume';
  };

  const getLanePoints = (track: Track, param: 'volume' | 'filterCutoff' | 'pan'): AutomationPoint[] => {
    const lane = track.automationLanes?.find(l => l.parameter === param);
    return lane ? lane.points : [];
  };

  const formatActiveVal = (track: Track, param: 'volume' | 'filterCutoff' | 'pan'): string => {
    const activeVal = audioEngine.getInterpolatedAutomationValue(track.id, param, currentBeat, param === 'filterCutoff' ? 1.0 : param === 'pan' ? 0.5 : track.volume / 1.5);
    
    if (param === 'volume') {
      return `${Math.round(activeVal * 150)}%`;
    } else if (param === 'pan') {
      const panVal = activeVal * 2.0 - 1.0;
      if (Math.abs(panVal) < 0.05) return 'C';
      return panVal < 0 ? `L${Math.round(Math.abs(panVal) * 100)}` : `R${Math.round(panVal * 100)}`;
    } else {
      const freq = 100 * Math.pow(200, activeVal);
      if (freq >= 1000) return `${(freq / 1000).toFixed(1)}kHz`;
      return `${Math.round(freq)}Hz`;
    }
  };

  const isLaneEnabled = (track: Track, param: 'volume' | 'filterCutoff' | 'pan'): boolean => {
    const lane = track.automationLanes?.find(l => l.parameter === param);
    return lane ? lane.enabled : true;
  };

  const toggleLaneEnabled = (track: Track, param: 'volume' | 'filterCutoff' | 'pan') => {
    const existingLanes = track.automationLanes || [];
    let updatedLanes = [...existingLanes];
    const laneIdx = updatedLanes.findIndex(l => l.parameter === param);
    
    if (laneIdx >= 0) {
      updatedLanes[laneIdx] = { ...updatedLanes[laneIdx], enabled: !updatedLanes[laneIdx].enabled };
    } else {
      updatedLanes.push({
        id: `lane-${Date.now()}`,
        trackId: track.id,
        parameter: param,
        points: [],
        enabled: false
      });
    }
    
    onUpdateTrack({ ...track, automationLanes: updatedLanes });
  };

  const clearLanePoints = (track: Track, param: 'volume' | 'filterCutoff' | 'pan') => {
    const existingLanes = track.automationLanes || [];
    let updatedLanes = existingLanes.map(l => {
      if (l.parameter === param) {
        return { ...l, points: [] };
      }
      return l;
    });
    
    onUpdateTrack({ ...track, automationLanes: updatedLanes });
  };

  const deletePoint = (track: Track, param: 'volume' | 'filterCutoff' | 'pan', pointId: string) => {
    const existingLanes = track.automationLanes || [];
    let updatedLanes = existingLanes.map(l => {
      if (l.parameter === param) {
        return { ...l, points: l.points.filter(p => p.id !== pointId) };
      }
      return l;
    });
    
    onUpdateTrack({ ...track, automationLanes: updatedLanes });
  };

  const handleSvgClick = (e: React.MouseEvent<SVGSVGElement>, track: Track, param: 'volume' | 'filterCutoff' | 'pan') => {
    if (e.target !== e.currentTarget) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    
    const rawBeat = clickX / beatWidthPx;
    const snappedBeat = Math.min(64, Math.max(0, Math.round(rawBeat * 4) / 4));
    const value = Math.min(1.0, Math.max(0.0, 1 - (clickY / 90)));
    
    const existingLanes = track.automationLanes || [];
    let updatedLanes = [...existingLanes];
    const laneIdx = updatedLanes.findIndex(l => l.parameter === param);
    
    const newPoint = {
      id: `pt-${Date.now()}-${Math.random().toString(36).substring(2,6)}`,
      beat: snappedBeat,
      value
    };
    
    if (laneIdx >= 0) {
      const filteredPoints = updatedLanes[laneIdx].points.filter(p => p.beat !== snappedBeat);
      updatedLanes[laneIdx] = {
        ...updatedLanes[laneIdx],
        points: [...filteredPoints, newPoint].sort((a,b) => a.beat - b.beat)
      };
    } else {
      updatedLanes.push({
        id: `lane-${Date.now()}`,
        trackId: track.id,
        parameter: param,
        points: [newPoint],
        enabled: true
      });
    }
    
    onUpdateTrack({ ...track, automationLanes: updatedLanes });
  };

  const handleSvgMouseMove = (e: React.MouseEvent<HTMLDivElement>, track: Track, param: 'volume' | 'filterCutoff' | 'pan') => {
    if (!draggingPoint || draggingPoint.trackId !== track.id || draggingPoint.parameter !== param) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const moveX = e.clientX - rect.left;
    const moveY = e.clientY - rect.top;
    
    const rawBeat = moveX / beatWidthPx;
    const snappedBeat = Math.min(64, Math.max(0, Math.round(rawBeat * 4) / 4));
    const value = Math.min(1.0, Math.max(0.0, 1 - (moveY / 90)));
    
    const existingLanes = track.automationLanes || [];
    let updatedLanes = existingLanes.map(l => {
      if (l.parameter === param) {
        const pts = l.points.map(p => {
          if (p.id === draggingPoint.pointId) {
            return { ...p, beat: snappedBeat, value };
          }
          return p;
        });
        const otherPts = pts.filter(p => p.id === draggingPoint.pointId || p.beat !== snappedBeat);
        return { ...l, points: otherPts.sort((a,b) => a.beat - b.beat) };
      }
      return l;
    });
    
    onUpdateTrack({ ...track, automationLanes: updatedLanes });
  };

  const handleSvgMouseUp = () => {
    setDraggingPoint(null);
  };

  const getSvgPath = (points: AutomationPoint[], width: number, height: number) => {
    if (points.length === 0) {
      return `M 0 ${height / 2} L ${width} ${height / 2}`;
    }
    const sorted = [...points].sort((a, b) => a.beat - b.beat);
    const pathParts: string[] = [];
    
    const firstX = sorted[0].beat * beatWidthPx;
    const firstY = (1 - sorted[0].value) * height;
    
    pathParts.push(`M 0 ${firstY}`);
    pathParts.push(`L ${firstX} ${firstY}`);
    
    for (let i = 1; i < sorted.length; i++) {
      const x = sorted[i].beat * beatWidthPx;
      const y = (1 - sorted[i].value) * height;
      pathParts.push(`L ${x} ${y}`);
    }
    
    const lastX = sorted[sorted.length - 1].beat * beatWidthPx;
    const lastY = (1 - sorted[sorted.length - 1].value) * height;
    pathParts.push(`L ${width} ${lastY}`);
    
    return pathParts.join(' ');
  };

  const getDisplayedVolume = (track: Track): number => {
    const volumeLane = track.automationLanes?.find(l => l.parameter === 'volume' && l.enabled);
    if (isPlaying && volumeLane && volumeLane.points.length > 0) {
      return audioEngine.getInterpolatedAutomationValue(track.id, 'volume', currentBeat, track.volume / 1.5) * 1.5;
    }
    return track.volume;
  };

  const getDisplayedPan = (track: Track): number => {
    const panLane = track.automationLanes?.find(l => l.parameter === 'pan' && l.enabled);
    if (isPlaying && panLane && panLane.points.length > 0) {
      const automatedVal = audioEngine.getInterpolatedAutomationValue(track.id, 'pan', currentBeat, (track.pan + 1) / 2);
      return automatedVal * 2.0 - 1.0;
    }
    return track.pan;
  };

  const getDisplayedCutoff = (track: Track): number => {
    const filterLane = track.automationLanes?.find(l => l.parameter === 'filterCutoff' && l.enabled);
    if (isPlaying && filterLane && filterLane.points.length > 0) {
      return audioEngine.getInterpolatedAutomationValue(track.id, 'filterCutoff', currentBeat, 1.0);
    }
    return 1.0;
  };

  const recordPointOnTheFly = (track: Track, param: 'volume' | 'filterCutoff' | 'pan', value: number) => {
    const snappedBeat = Math.min(64, Math.max(0, Math.round(currentBeat * 4) / 4));
    
    const existingLanes = track.automationLanes || [];
    let updatedLanes = [...existingLanes];
    const laneIdx = updatedLanes.findIndex(l => l.parameter === param);
    
    const newPoint = {
      id: `pt-rec-${Date.now()}-${Math.random().toString(36).substring(2,6)}`,
      beat: snappedBeat,
      value
    };
    
    if (laneIdx >= 0) {
      const filteredPoints = updatedLanes[laneIdx].points.filter(p => p.beat !== snappedBeat);
      updatedLanes[laneIdx] = {
        ...updatedLanes[laneIdx],
        points: [...filteredPoints, newPoint].sort((a, b) => a.beat - b.beat),
        enabled: true
      };
    } else {
      updatedLanes.push({
        id: `lane-rec-${Date.now()}`,
        trackId: track.id,
        parameter: param,
        points: [newPoint],
        enabled: true
      });
    }
    
    if (param === 'volume') {
      onUpdateTrack({ ...track, volume: value * 1.5, automationLanes: updatedLanes });
    } else if (param === 'pan') {
      onUpdateTrack({ ...track, pan: value * 2.0 - 1.0, automationLanes: updatedLanes });
    } else {
      onUpdateTrack({ ...track, automationLanes: updatedLanes });
    }
  };

  const handleVolumeChangeAndRecord = (track: Track, volumeValue: number) => {
    if (isPlaying && isRecordingAutomation) {
      const normVal = Math.min(1.0, Math.max(0.0, volumeValue / 1.5));
      recordPointOnTheFly(track, 'volume', normVal);
    } else {
      handleVolumeChange(track, volumeValue);
    }
  };

  const handlePanChangeAndRecord = (track: Track, panValue: number) => {
    if (isPlaying && isRecordingAutomation) {
      const normVal = (panValue + 1) / 2;
      recordPointOnTheFly(track, 'pan', normVal);
    } else {
      onUpdateTrack({ ...track, pan: panValue });
    }
  };

  const handleCutoffChangeAndRecord = (track: Track, cutoffValue: number) => {
    if (isPlaying && isRecordingAutomation) {
      recordPointOnTheFly(track, 'filterCutoff', cutoffValue);
    } else {
      recordPointOnTheFly(track, 'filterCutoff', cutoffValue);
    }
  };

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (addTrackDropdownRef.current && !addTrackDropdownRef.current.contains(e.target as Node)) {
        setIsAddTrackDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, []);

  // Track Icon Mapper
  const renderTrackIcon = (iconName: string, color: string) => {
    const props = { className: "w-4 h-4", style: { color } };
    switch (iconName) {
      case 'guitar': return <Guitar {...props} />;
      case 'drum': return <Drum {...props} />;
      case 'music': return <Music {...props} />;
      case 'sliders': return <Sliders {...props} />;
      case 'activity': return <Activity {...props} />;
      case 'mic': return <Mic {...props} />;
      case 'zap': return <Zap {...props} />;
      default: return <Music {...props} />;
    }
  };

  // Mute & Solo switches
  const toggleMute = (track: Track) => {
    onUpdateTrack({ ...track, mute: !track.mute });
  };

  const toggleSolo = (track: Track) => {
    onUpdateTrack({ ...track, solo: !track.solo });
  };

  const handleVolumeChange = (track: Track, volume: number) => {
    onUpdateTrack({ ...track, volume });
  };

  // Timeline click and scrub playhead movement
  const handleTimelineMouseDown = (e: React.MouseEvent) => {
    if (!gridContainerRef.current) return;
    setIsScrubbing(true);
    updatePlayheadWithEvent(e.clientX);
  };

  const handleTimelineMouseMove = (e: MouseEvent) => {
    if (!isScrubbing) return;
    updatePlayheadWithEvent(e.clientX);
  };

  const handleTimelineMouseUp = () => {
    setIsScrubbing(false);
  };

  useEffect(() => {
    if (isScrubbing) {
      window.addEventListener('mousemove', handleTimelineMouseMove);
      window.addEventListener('mouseup', handleTimelineMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleTimelineMouseMove);
      window.removeEventListener('mouseup', handleTimelineMouseUp);
    };
  }, [isScrubbing]);

  const updatePlayheadWithEvent = (clientX: number) => {
    if (!gridContainerRef.current) return;
    const rect = gridContainerRef.current.getBoundingClientRect();
    // Account for track headers column width (135px)
    const relativeX = clientX - rect.left - 135 + gridContainerRef.current.scrollLeft;
    const clampedX = Math.max(0, Math.min(timelineWidthPx, relativeX));
    const beat = clampedX / beatWidthPx;
    onPlayheadMove(beat);
  };

  const getNewClipNotesForTrackType = (type: 'synth' | 'drum' | 'sampler'): any[] => {
    const timestamp = Date.now();
    if (type === 'synth') {
      return [
        { id: `note-${timestamp}-1`, pitch: 'C4', startBeat: 0.0, durationBeats: 1.0, velocity: 0.8 },
        { id: `note-${timestamp}-2`, pitch: 'E4', startBeat: 1.0, durationBeats: 1.0, velocity: 0.8 },
        { id: `note-${timestamp}-3`, pitch: 'G4', startBeat: 2.0, durationBeats: 1.0, velocity: 0.8 },
        { id: `note-${timestamp}-4`, pitch: 'C5', startBeat: 3.0, durationBeats: 1.0, velocity: 0.8 }
      ];
    } else if (type === 'drum') {
      return [
        { id: `note-${timestamp}-d1`, pitch: 'C3', startBeat: 0.0, durationBeats: 0.25, velocity: 0.95 },
        { id: `note-${timestamp}-d2`, pitch: 'E3', startBeat: 0.5, durationBeats: 0.25, velocity: 0.7 },
        { id: `note-${timestamp}-d3`, pitch: 'D3', startBeat: 1.0, durationBeats: 0.25, velocity: 0.9 },
        { id: `note-${timestamp}-d4`, pitch: 'E3', startBeat: 1.5, durationBeats: 0.25, velocity: 0.7 },
        { id: `note-${timestamp}-d5`, pitch: 'C3', startBeat: 2.0, durationBeats: 0.25, velocity: 0.95 },
        { id: `note-${timestamp}-d6`, pitch: 'E3', startBeat: 2.5, durationBeats: 0.25, velocity: 0.7 },
        { id: `note-${timestamp}-d7`, pitch: 'D3', startBeat: 3.0, durationBeats: 0.25, velocity: 0.9 },
        { id: `note-${timestamp}-d8`, pitch: 'E3', startBeat: 3.5, durationBeats: 0.25, velocity: 0.7 }
      ];
    } else {
      return [
        { id: `note-${timestamp}-s1`, pitch: 'C4', startBeat: 0.0, durationBeats: 4.0, velocity: 0.9 }
      ];
    }
  };

  // Double click and Double tap handler for clips (patches)
  const handleClipInteraction = (clip: Clip) => {
    onClipDoubleTapped(clip);
  };

  const handleClipTouchStart = (clip: Clip) => {
    const now = Date.now();
    const lastTap = lastTapRef.current;

    if (lastTap && lastTap.clipId === clip.id && now - lastTap.time < 300) {
      // Detected Double Tap!
      handleClipInteraction(clip);
      lastTapRef.current = null;
    } else {
      lastTapRef.current = { clipId: clip.id, time: now };
    }
  };

  return (
    <div id="timeline-container" className="flex-1 flex flex-col bg-[#0f0f12] overflow-hidden select-none border-b border-[#23232b]">
      
      {/* 1. Add Track & Quick Toolbar */}
      <div className="flex flex-wrap items-center justify-between px-4 py-2.5 gap-2 border-b border-[#202026] bg-[#141419] select-none">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="text-[11px] text-[#8e8e9f] font-sans flex items-center gap-1.5 bg-[#202028] px-2.5 py-1.5 rounded border border-[#23232c]">
            <span>Grid Snap: <strong>1/16 Beat</strong></span>
          </div>
          <span className="text-[10px] text-gray-500 hidden sm:inline">
            ✨ Lengthy Track Lanes enabled
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Instructions */}
          <span className="text-[10px] text-gray-500 hidden xl:inline">
            💡 Tip: Click on the timeline header to move the playhead position
          </span>

          <div className="text-[11px] text-[#717185] font-mono bg-[#111115] border border-[#1d1d24] px-3 py-1.5 rounded-md">
            Playhead: <strong className="text-emerald-400 font-bold">{currentBeat.toFixed(2)}</strong> / {totalBeats}.00 Beats
          </div>
        </div>
      </div>

      {/* 2. Scrollable Tracks Workspace */}
      <div 
        ref={gridContainerRef}
        className="flex-1 overflow-auto flex flex-col relative"
      >
        
        {/* Timeline Header Bar (Tick Marks) */}
        <div 
          className="flex bg-[#121216] border-b border-[#202026] sticky top-0 z-30 shrink-0 h-10"
          style={{ width: `${135 + timelineWidthPx}px` }}
        >
          {/* Empty spacer for Track Headers with + Add Track Dropdown */}
          <div 
            ref={addTrackDropdownRef}
            className="w-[135px] shrink-0 border-r border-[#202026] flex items-center px-1 bg-[#111115] sticky left-0 z-40 shadow-[2px_0_5px_rgba(0,0,0,0.3)] relative"
          >
            <button
              onClick={() => {
                setIsAddTrackDropdownOpen(!isAddTrackDropdownOpen);
              }}
              className="w-full flex items-center justify-between gap-1 px-2.5 py-1.5 bg-[#6d28d9] hover:bg-[#5b21b6] active:bg-[#4c1d95] text-white font-sans font-black text-[10px] rounded border border-purple-500/20 uppercase tracking-widest transition-all cursor-pointer shadow-md shadow-purple-900/20"
            >
              <div className="flex items-center gap-1">
                <Plus className="w-3 h-3 text-white stroke-[3px]" />
                <span>Add Track</span>
              </div>
              <ChevronDown className="w-3 h-3 text-purple-200 stroke-[3px]" />
            </button>

            {isAddTrackDropdownOpen && (
              <div className="absolute left-2 top-9 w-[164px] bg-[#141419] rounded-lg border border-[#2e2e38] shadow-[0_10px_30px_rgba(0,0,0,0.8)] z-50 py-1 flex flex-col">
                <button
                  onClick={() => {
                    onAddTrack('synth');
                    setIsAddTrackDropdownOpen(false);
                  }}
                  className="flex items-center gap-2 px-3 py-2 text-left text-[11px] font-sans font-extrabold hover:bg-white/[0.04] text-emerald-400 transition-colors"
                >
                  <Zap className="w-3.5 h-3.5" />
                  🎹 SYNTH LEAD
                </button>
                <button
                  onClick={() => {
                    onAddTrack('drum');
                    setIsAddTrackDropdownOpen(false);
                  }}
                  className="flex items-center gap-2 px-3 py-2 text-left text-[11px] font-sans font-extrabold hover:bg-white/[0.04] text-purple-400 transition-colors"
                >
                  <Drum className="w-3.5 h-3.5" />
                  🥁 DRUM RACK
                </button>
                <button
                  onClick={() => {
                    onAddTrack('sampler');
                    setIsAddTrackDropdownOpen(false);
                  }}
                  className="flex items-center gap-2 px-3 py-2 text-left text-[11px] font-sans font-extrabold hover:bg-white/[0.04] text-cyan-400 transition-colors"
                >
                  <Music className="w-3.5 h-3.5" />
                  🎙️ SAMPLER
                </button>
              </div>
            )}
          </div>

          {/* Beats Grid Tick Marks */}
          <div 
            onClick={handleTimelineMouseDown}
            className="shrink-0 relative h-full cursor-ew-resize bg-[#141419]"
            style={{ width: `${timelineWidthPx}px` }}
          >
            {Array.from({ length: totalBeats }).map((_, beatIdx) => (
              <div 
                key={`beat-tick-${beatIdx}`}
                className="absolute flex flex-col justify-end pb-1 pl-1.5 border-l border-[#2c2c36]/40 h-full"
                style={{ left: `${beatIdx * beatWidthPx}px`, width: `${beatWidthPx}px` }}
              >
                <span className="text-[10px] font-mono font-bold text-gray-400">
                  {beatIdx + 1}
                </span>
                <div className="flex gap-1.5 mt-0.5">
                  <span className="w-0.5 h-1 bg-gray-700" />
                  <span className="w-0.5 h-1 bg-gray-700" />
                  <span className="w-0.5 h-1 bg-gray-700" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 3. Rows Canvas */}
        <div className="flex-1 relative flex flex-col">
          
          {/* Visual vertical playhead marker */}
          <div 
            className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20 pointer-events-none shadow-[0_0_8px_rgba(239,68,68,0.8)]"
            style={{ left: `${135 + currentBeat * beatWidthPx}px` }}
          />

          {tracks.map((track) => {
            const isSelected = track.id === selectedTrackId;
            const trackClips = clips.filter((clip) => clip.trackId === track.id);
            const isAutomationExpanded = !!expandedAutomationTracks[track.id];
            const param = getSelectedParam(track.id);

            return (
              <React.Fragment key={track.id}>
                <div 
                  onClick={() => onSelectTrack(track.id)}
                  className={`flex border-b border-[#1c1c22] transition-colors relative min-h-[50px] shrink-0 ${
                    isSelected ? 'bg-white/[0.03]' : 'bg-transparent hover:bg-white/[0.01]'
                  }`}
                  style={{ width: `${135 + timelineWidthPx}px` }}
                >
                  {/* A. LEFT COLUMN: TRACK PARAMETERS */}
                  <div 
                    className={`w-[135px] shrink-0 border-r border-[#202026] flex flex-col p-1.5 justify-between sticky left-0 z-30 bg-[#121215] shadow-[2px_0_5px_rgba(0,0,0,0.3)] cursor-pointer select-none ${
                      isSelected ? 'border-l-2' : ''
                    }`}
                    style={{ borderLeftColor: isSelected ? track.color : 'transparent' }}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      onAddTrack(track.type);
                    }}
                    onTouchStart={(e) => {
                      const now = Date.now();
                      if (lastCanvasTapRef.current && lastCanvasTapRef.current.trackId === `track-rack-${track.id}` && (now - lastCanvasTapRef.current.time) < 300) {
                        onAddTrack(track.type);
                        lastCanvasTapRef.current = null;
                      } else {
                        lastCanvasTapRef.current = { trackId: `track-rack-${track.id}`, time: now };
                      }
                    }}
                  >
                    {/* Track Info (Title and Icon) */}
                    <div className="flex items-center justify-between min-w-0">
                      <div className="flex items-center gap-1.5 min-w-0 flex-1 mr-1">
                        {renderTrackIcon(track.iconName, track.color)}
                        <span className="text-[10px] font-sans font-black text-gray-200 truncate group-hover:text-white">
                          {track.name}
                        </span>
                      </div>

                      {/* Automation Lane Toggle Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedAutomationTracks(prev => ({
                            ...prev,
                            [track.id]: !prev[track.id]
                          }));
                        }}
                        className={`text-[9px] w-4.5 h-4.5 flex items-center justify-center rounded transition-all cursor-pointer ${
                          isAutomationExpanded
                            ? 'bg-indigo-600 text-white shadow shadow-indigo-600/30'
                            : 'bg-white/5 text-gray-400 hover:text-indigo-400 hover:bg-indigo-500/10'
                        }`}
                        title="Toggle Automation"
                      >
                        <Zap className="w-2.5 h-2.5" />
                      </button>
                    </div>

                    {/* Track volume fader & mini-controls */}
                    <div className="flex items-center gap-1.5 mt-1 justify-between min-w-0">
                      <input
                        type="range"
                        min="0.0"
                        max="1.5"
                        step="0.05"
                        value={getDisplayedVolume(track)}
                        onChange={(e) => handleVolumeChangeAndRecord(track, parseFloat(e.target.value))}
                        className="flex-1 accent-emerald-500 h-1 rounded bg-[#1e1e24] cursor-pointer"
                        title={`Volume: ${Math.round(getDisplayedVolume(track) * 100)}%`}
                      />

                      <div className="flex items-center gap-0.5 shrink-0">
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleMute(track); }}
                          className={`text-[8.5px] font-mono font-black w-4 h-4 flex items-center justify-center rounded transition-all cursor-pointer ${
                            track.mute 
                              ? 'bg-red-500 text-white shadow shadow-red-500/20' 
                              : 'bg-white/5 text-gray-400 hover:text-white'
                          }`}
                          title="Mute"
                        >
                          M
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleSolo(track); }}
                          className={`text-[8.5px] font-mono font-black w-4 h-4 flex items-center justify-center rounded transition-all cursor-pointer ${
                            track.solo 
                              ? 'bg-amber-500 text-black shadow shadow-amber-500/20' 
                              : 'bg-white/5 text-gray-400 hover:text-white'
                          }`}
                          title="Solo"
                        >
                          S
                        </button>

                        {/* Sampler Load Audio Shortcut */}
                        {track.type === 'sampler' && (
                          <label className="w-4 h-4 flex items-center justify-center rounded bg-cyan-500/10 hover:bg-cyan-500/25 border border-cyan-500/20 text-cyan-400 cursor-pointer transition-colors">
                            <Upload className="w-2.5 h-2.5" />
                            <input
                              type="file"
                              accept="audio/*"
                              className="hidden"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  try {
                                    const sampleKey = await audioEngine.loadUserSampleFile(file);
                                    const cleanName = file.name.replace(/\.[^/.]+$/, ""); // strip extension
                                    
                                    // Create a premium 4-beat clip containing this audio buffer
                                    const newClip: Clip = {
                                      id: `clip-user-${Date.now()}`,
                                      trackId: track.id,
                                      name: cleanName,
                                      startBeat: Math.floor(currentBeat),
                                      durationBeats: 4,
                                      color: track.color,
                                      notes: [
                                        {
                                          id: `note-user-${Date.now()}`,
                                          pitch: 'C4',
                                          startBeat: 0,
                                          durationBeats: 4,
                                          velocity: 1.0
                                        }
                                      ],
                                      sampleName: cleanName,
                                      audioUrl: sampleKey
                                    };
                                    onUpdateClips([...clips, newClip]);
                                  } catch (err) {
                                    alert(`Audio load error: ${err}`);
                                  }
                                }
                              }}
                            />
                          </label>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* B. RIGHT COLUMN: CLIPS GRID CANVAS */}
                  <div 
                    className="shrink-0 bg-[#101014] relative overflow-hidden cursor-pointer"
                    style={{ width: `${timelineWidthPx}px` }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = "copy";
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      try {
                        const rawData = e.dataTransfer.getData('application/json');
                        if (!rawData) return;
                        const { name, duration } = JSON.parse(rawData);
                        const beatsCount = duration === '1B' ? 1 : duration === '2B' ? 2 : duration === '8B' ? 8 : 4;
                        
                        const rect = e.currentTarget.getBoundingClientRect();
                        const dropX = e.clientX - rect.left;
                        const beat = Math.floor(dropX / beatWidthPx);
                        
                        if (onAddClipToTrackAtBeat) {
                          onAddClipToTrackAtBeat(track.id, name, beatsCount, beat);
                        }
                      } catch (err) {
                        console.error("Failed to parse dragged sample data", err);
                      }
                    }}
                    onDoubleClick={(e) => {
                      // Only trigger if double clicked exactly the grid canvas background
                      if (e.target !== e.currentTarget) return;

                      const rect = e.currentTarget.getBoundingClientRect();
                      const clickX = e.clientX - rect.left;
                      const beat = Math.floor(clickX / beatWidthPx);

                      const defaultDuration = 4;
                      const cleanName = track.type === 'synth' ? 'Synth Lead' : track.type === 'drum' ? 'Drum Loop' : 'Vocal Hook';
                      const notes = getNewClipNotesForTrackType(track.type);

                      const newClip: Clip = {
                        id: `clip-created-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                        trackId: track.id,
                        name: cleanName,
                        startBeat: beat,
                        durationBeats: defaultDuration,
                        color: track.color,
                        notes: notes,
                        sampleName: track.type === 'sampler' ? 'vocal_hey' : undefined
                      };

                      onUpdateClips([...clips, newClip]);
                    }}
                    onTouchStart={(e) => {
                      // Only trigger if tapped exactly the grid canvas background
                      if (e.target !== e.currentTarget) return;
                      
                      const now = Date.now();
                      if (lastCanvasTapRef.current && lastCanvasTapRef.current.trackId === track.id && (now - lastCanvasTapRef.current.time) < 300) {
                        // Double tap detected!
                        const rect = e.currentTarget.getBoundingClientRect();
                        const touchX = e.touches[0].clientX - rect.left;
                        const beat = Math.floor(touchX / beatWidthPx);

                        const defaultDuration = 4;
                        const cleanName = track.type === 'synth' ? 'Synth Lead' : track.type === 'drum' ? 'Drum Loop' : 'Vocal Hook';
                        const notes = getNewClipNotesForTrackType(track.type);

                        const newClip: Clip = {
                          id: `clip-created-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                          trackId: track.id,
                          name: cleanName,
                          startBeat: beat,
                          durationBeats: defaultDuration,
                          color: track.color,
                          notes: notes,
                          sampleName: track.type === 'sampler' ? 'vocal_hey' : undefined
                        };

                        onUpdateClips([...clips, newClip]);
                        lastCanvasTapRef.current = null;
                      } else {
                        lastCanvasTapRef.current = { trackId: track.id, time: now };
                      }
                    }}
                  >
                    {/* Subtle 16th-note background subdivision grid lines */}
                    <div className="absolute inset-0 flex pointer-events-none">
                      {Array.from({ length: totalBeats * 4 }).map((_, lineIdx) => (
                        <div 
                          key={`grid-line-${lineIdx}`}
                          className={`h-full border-r ${
                            lineIdx % 4 === 0 
                              ? 'border-[#23232b]/50' 
                              : 'border-[#1b1b22]/20'
                          }`}
                          style={{ width: `${beatWidthPx / 4}px` }}
                        />
                      ))}
                    </div>

                    {/* Render patches/clips on timeline */}
                    {trackClips.map((clip) => {
                      const widthPx = clip.durationBeats * beatWidthPx;
                      const leftPx = clip.startBeat * beatWidthPx;

                      // Duplicate Clip Handler
                      const handleDuplicate = (e: React.MouseEvent) => {
                        e.stopPropagation();
                        const newClip: Clip = {
                          ...clip,
                          id: `clip-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                          startBeat: clip.startBeat + clip.durationBeats,
                          notes: clip.notes.map(n => ({
                            ...n,
                            id: `note-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`
                          }))
                        };
                        onUpdateClips([...clips, newClip]);
                      };

                      // Delete Clip Handler
                      const handleDelete = (e: React.MouseEvent) => {
                        e.stopPropagation();
                        onUpdateClips(clips.filter(c => c.id !== clip.id));
                      };

                      // Move Clip Handler (+/- beats)
                      const handleMove = (beats: number, e: React.MouseEvent) => {
                        e.stopPropagation();
                        const newStart = Math.max(0, clip.startBeat + beats);
                        onUpdateClips(clips.map(c => c.id === clip.id ? { ...c, startBeat: newStart } : c));
                      };

                      return (
                        <div
                          key={clip.id}
                          onDoubleClick={() => handleClipInteraction(clip)}
                          onTouchStart={() => handleClipTouchStart(clip)}
                          className="absolute inset-y-1 rounded-md cursor-pointer select-none transition-all border flex flex-col justify-between group overflow-hidden shadow-md duration-100 hover:shadow-lg hover:border-white/30"
                          style={{
                            left: `${leftPx}px`,
                            width: `${widthPx}px`,
                            backgroundColor: `${clip.color}dd`, // Solid rich colored background matching attached
                            borderColor: `${clip.color}`,
                            boxShadow: `inset 0 1px 1px rgba(255,255,255,0.25), 0 2px 4px rgba(0,0,0,0.3)`
                          }}
                          title="Double-click or double-tap to open Piano Roll"
                        >
                          {/* Elegant subtle top border glow */}
                          <div 
                            className="absolute left-0 right-0 top-0 h-[2px] opacity-60"
                            style={{ backgroundColor: '#ffffff' }}
                          />

                          {/* Top: Clip Title and Hover Quick Actions */}
                          <div className="flex items-center justify-between min-w-0 px-2 pt-1 z-10">
                            <span 
                              className="text-[9.5px] font-sans font-black truncate pr-1 tracking-tight text-white select-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]"
                            >
                              {clip.name}
                            </span>
                            
                            {/* QUICK ACTIONS TOOLBAR (Appears on Hover) */}
                            <div className="hidden group-hover:flex items-center gap-0.5 bg-black/90 px-1 py-0.5 rounded border border-white/10 shrink-0 select-none z-20">
                              <button
                                onClick={(e) => handleMove(-1, e)}
                                className="p-0.5 text-gray-400 hover:text-white hover:bg-white/10 rounded transition-colors"
                                title="Move Left 1 Beat"
                              >
                                <ArrowLeft className="w-2.5 h-2.5" />
                              </button>
                              <button
                                onClick={handleDuplicate}
                                className="p-0.5 text-gray-400 hover:text-emerald-400 hover:bg-white/10 rounded transition-colors"
                                title="Duplicate Loop"
                              >
                                <Copy className="w-2.5 h-2.5" />
                              </button>
                              <button
                                onClick={(e) => handleMove(1, e)}
                                className="p-0.5 text-gray-400 hover:text-white hover:bg-white/10 rounded transition-colors"
                                title="Move Right 1 Beat"
                              >
                                <ArrowRight className="w-2.5 h-2.5" />
                              </button>
                              <button
                                onClick={handleDelete}
                                className="p-0.5 text-gray-400 hover:text-red-400 hover:bg-red-500/20 rounded transition-colors ml-0.5 border-l border-white/10 pl-1"
                                title="Delete Clip"
                              >
                                <Trash2 className="w-2.5 h-2.5" />
                              </button>
                            </div>

                            <span className="text-[7.5px] font-mono font-black text-white/80 group-hover:hidden shrink-0 select-none drop-shadow-[0_1px_1px_rgba(0,0,0,0.4)]">
                              {clip.durationBeats}B
                            </span>
                          </div>

                          {/* Beautiful, authentic visual contents inside each patch/clip based on track type */}
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none px-1 py-1 overflow-hidden">
                            {track.type === 'drum' ? (
                              // Render step indicator dots
                              <div className="flex items-center justify-around w-full h-full opacity-90 px-1.5 pt-3">
                                {Array.from({ length: Math.min(16, clip.durationBeats * 2) }).map((_, idx) => {
                                  const isKick = track.name.toLowerCase().includes('kick');
                                  const isSnare = track.name.toLowerCase().includes('snare');
                                  const isHat = track.name.toLowerCase().includes('hat');
                                  
                                  let isActive = false;
                                  if (isKick) {
                                    isActive = idx % 4 === 0; // Beats 1 and 3
                                  } else if (isSnare) {
                                    isActive = idx % 4 === 2; // Beats 2 and 4
                                  } else if (isHat) {
                                    isActive = true; // All active
                                  } else {
                                    isActive = idx % 2 === 0; // Alternate active
                                  }

                                  return (
                                    <div 
                                      key={`dot-${idx}`}
                                      className={`rounded-full transition-all ${
                                        isActive 
                                          ? 'w-1.5 h-1.5 bg-white shadow-[0_0_4px_rgba(255,255,255,0.9)]' 
                                          : 'w-1 h-1 bg-white/20'
                                      }`}
                                    />
                                  );
                                })}
                              </div>
                            ) : track.type === 'synth' ? (
                              // Render midi notes representation
                              <div className="relative w-full h-full opacity-90 pt-3 px-1">
                                {clip.notes.slice(0, 10).map((n, idx) => {
                                  const pitchChar = n.pitch.charCodeAt(0) - 65;
                                  const verticalOffset = 14 + (pitchChar % 4) * 3;
                                  const noteWidthPct = (n.durationBeats / clip.durationBeats) * 100;
                                  const noteLeftPct = (n.startBeat / clip.durationBeats) * 100;

                                  return (
                                    <div 
                                      key={`midi-note-${idx}`}
                                      className="absolute h-1 rounded-sm bg-white shadow-[0_0_3px_rgba(255,255,255,0.6)]"
                                      style={{
                                        left: `${noteLeftPct}%`,
                                        width: `${Math.max(4, noteWidthPct)}%`,
                                        top: `${verticalOffset}px`,
                                        opacity: 0.5 + (n.velocity || 0.8) * 0.5
                                      }}
                                    />
                                  );
                                })}
                              </div>
                            ) : (
                              // Render organic audio waveform
                              <div className="flex items-end justify-between w-full h-full opacity-80 pt-3 px-1">
                                {Array.from({ length: Math.floor(clip.durationBeats * 6) }).map((_, idx) => {
                                  const waveHeight = 8 + Math.sin(idx * 0.8) * 6 + Math.cos(idx * 0.45) * 4;
                                  return (
                                    <div 
                                      key={`wave-bar-${idx}`}
                                      className="w-[1.5px] bg-white rounded-full transition-all"
                                      style={{
                                        height: `${Math.max(2, waveHeight)}px`,
                                        opacity: 0.45 + Math.sin(idx * 0.4) * 0.45
                                      }}
                                    />
                                  );
                                })}
                              </div>
                            )}
                          </div>

                          {/* Tiny subtle instructions indicator */}
                          <div className="text-[7px] font-sans font-bold text-right text-white/45 uppercase tracking-wider px-2 pb-0.5 select-none pointer-events-none opacity-0 group-hover:opacity-100 transition-all flex items-center justify-end gap-0.5 z-10">
                            <span>Double-tap to edit</span>
                            <CornerDownRight className="w-2 h-2 text-white/65" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* AUTOMATION LANE ROW */}
                {isAutomationExpanded && (
                  <div 
                    className="flex border-b border-[#1c1c22] bg-[#07070a] min-h-[90px] shrink-0"
                    style={{ width: `${135 + timelineWidthPx}px` }}
                  >
                    {/* LEFT PANEL: CONTROLS */}
                    <div className="w-[135px] shrink-0 border-r border-[#1a1a20] flex flex-col p-2 justify-between sticky left-0 z-30 bg-[#0c0c0f] shadow-[2px_0_5px_rgba(0,0,0,0.3)] select-none">
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] font-sans font-extrabold text-indigo-400 flex items-center gap-0.5 uppercase tracking-wider">
                            <Zap className="w-3 h-3 animate-pulse text-indigo-400" /> Automation
                          </span>
                          <span className="text-[9px] font-mono text-gray-400 bg-gray-900/40 px-1 rounded">
                            {formatActiveVal(track, param)}
                          </span>
                        </div>
                        
                        <select
                          value={param}
                          onChange={(e) => {
                            const newParam = e.target.value as 'volume' | 'filterCutoff' | 'pan';
                            setSelectedAutomationParams(prev => ({ ...prev, [track.id]: newParam }));
                          }}
                          className="bg-[#14141a] text-[10px] text-gray-200 border border-gray-800 rounded px-1.5 py-0.5 font-sans font-bold cursor-pointer hover:border-gray-700 focus:outline-none w-full"
                        >
                          <option value="volume">Volume (Fader)</option>
                          <option value="filterCutoff">Filter Cutoff (Lowpass)</option>
                          <option value="pan">Stereo Pan</option>
                        </select>
                      </div>

                      <div className="flex items-center justify-between gap-2 mt-1">
                        <button
                          onClick={() => toggleLaneEnabled(track, param)}
                          className={`text-[8.5px] font-sans font-black px-1.5 py-0.5 rounded border transition-colors cursor-pointer ${
                            isLaneEnabled(track, param)
                              ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/20'
                              : 'bg-gray-800/40 border-transparent text-gray-500'
                          }`}
                        >
                          {isLaneEnabled(track, param) ? 'ENABLED' : 'BYPASSED'}
                        </button>
                        
                        <button
                          onClick={() => clearLanePoints(track, param)}
                          className="text-[8.5px] font-sans font-black text-gray-400 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 px-1.5 py-0.5 rounded transition-colors cursor-pointer flex items-center gap-0.5"
                          title="Clear all points"
                        >
                          <Trash2 className="w-2.5 h-2.5" /> CLEAR
                        </button>
                      </div>
                    </div>

                    {/* RIGHT PANEL: GRID & SVG DRAWING */}
                    <div 
                      className="shrink-0 bg-[#050507] relative overflow-hidden select-none"
                      style={{ width: `${timelineWidthPx}px` }}
                      onMouseMove={(e) => handleSvgMouseMove(e, track, param)}
                      onMouseUp={handleSvgMouseUp}
                      onMouseLeave={handleSvgMouseUp}
                    >
                      {/* Grid lines subdivision */}
                      <div className="absolute inset-0 flex pointer-events-none opacity-20">
                        {Array.from({ length: totalBeats * 4 }).map((_, lineIdx) => (
                          <div 
                            key={`auto-grid-line-${lineIdx}`}
                            className={`h-full border-r ${
                              lineIdx % 4 === 0 
                                ? 'border-indigo-400' 
                                : 'border-gray-700/50'
                            }`}
                            style={{ width: `${beatWidthPx / 4}px` }}
                          />
                        ))}
                      </div>

                      {/* Moving automation playhead vertical marker */}
                      <div 
                        className="absolute top-0 bottom-0 w-0.5 bg-red-500/45 z-10 pointer-events-none"
                        style={{ left: `${currentBeat * beatWidthPx}px` }}
                      />

                      <svg 
                        className="absolute inset-0 w-full h-full cursor-crosshair"
                        onClick={(e) => handleSvgClick(e, track, param)}
                      >
                        {/* Shaded Area */}
                        <path
                          d={`${getSvgPath(getLanePoints(track, param), timelineWidthPx, 90)} L ${timelineWidthPx} 90 L 0 90 Z`}
                          fill={`url(#grad-${track.id})`}
                          className="opacity-10 pointer-events-none"
                        />

                        {/* Line Curve */}
                        <path
                          d={getSvgPath(getLanePoints(track, param), timelineWidthPx, 90)}
                          fill="none"
                          stroke={track.color}
                          strokeWidth="2"
                          className="opacity-80"
                        />

                        {/* Defs Gradient */}
                        <defs>
                          <linearGradient id={`grad-${track.id}`} x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor={track.color} />
                            <stop offset="100%" stopColor="transparent" />
                          </linearGradient>
                        </defs>

                        {/* Points circles */}
                        {getLanePoints(track, param).map((point) => {
                          const cx = point.beat * beatWidthPx;
                          const cy = (1 - point.value) * 90;
                          const isDraggingThis = draggingPoint?.trackId === track.id && draggingPoint?.parameter === param && draggingPoint?.pointId === point.id;

                          return (
                            <g key={point.id}>
                              <circle
                                cx={cx}
                                cy={cy}
                                r="12"
                                fill="transparent"
                                className="cursor-pointer"
                                onMouseDown={(e) => {
                                  e.stopPropagation();
                                  setDraggingPoint({ trackId: track.id, parameter: param, pointId: point.id });
                                }}
                                onDoubleClick={(e) => {
                                  e.stopPropagation();
                                  deletePoint(track, param, point.id);
                                }}
                              />
                              <circle
                                cx={cx}
                                cy={cy}
                                r={isDraggingThis ? "6" : "4.5"}
                                fill={track.color}
                                stroke="#050507"
                                strokeWidth="2.5"
                                className={`transition-all ${isDraggingThis ? 'scale-125 stroke-white ring-2 ring-indigo-500' : 'hover:scale-125 hover:stroke-white'}`}
                                onMouseDown={(e) => {
                                  e.stopPropagation();
                                  setDraggingPoint({ trackId: track.id, parameter: param, pointId: point.id });
                                }}
                                onDoubleClick={(e) => {
                                  e.stopPropagation();
                                  deletePoint(track, param, point.id);
                                }}
                              />
                            </g>
                          );
                        })}
                      </svg>

                      <div className="absolute right-3.5 bottom-2 text-[8px] font-mono text-gray-500 pointer-events-none select-none uppercase tracking-widest opacity-60">
                        Click to Add point • Drag to Move • Double click point to Delete
                      </div>
                    </div>
                  </div>
                )}
              </React.Fragment>
            );
          })}

          {/* Ghost Track Header Slot for double tap to add new instrument / track */}
          <div 
            className="flex border-b border-[#1c1c22]/50 hover:bg-white/[0.01] transition-all relative min-h-[44px] shrink-0 select-none group cursor-pointer"
            style={{ width: `${135 + timelineWidthPx}px` }}
            onDoubleClick={() => {
              onAddTrack('synth');
            }}
            onTouchStart={(e) => {
              const now = Date.now();
              if (lastCanvasTapRef.current && lastCanvasTapRef.current.trackId === 'ghost-track-add' && (now - lastCanvasTapRef.current.time) < 300) {
                onAddTrack('synth');
                lastCanvasTapRef.current = null;
              } else {
                lastCanvasTapRef.current = { trackId: 'ghost-track-add', time: now };
              }
            }}
          >
            {/* Left Ghost Parameters Column */}
            <div className="w-[135px] shrink-0 border-r border-[#202026] flex flex-col p-1.5 justify-center items-center sticky left-0 z-30 bg-[#0d0d10]/40 border-dashed border border-white/5 text-gray-500 hover:text-purple-400 hover:bg-purple-950/10 transition-colors">
              <Plus className="w-3.5 h-3.5 mb-0.5 animate-pulse" />
              <span className="text-[8.5px] font-sans font-black tracking-wider text-center uppercase opacity-80">
                Double-tap to add
              </span>
            </div>
            {/* Right empty canvas area */}
            <div className="flex-1 bg-[#09090c]/20 relative pointer-events-none" />
          </div>
        </div>

      </div>
    </div>
  );
}
