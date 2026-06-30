import React, { useState, useEffect, useRef } from 'react';
import { Track, Clip, MasterFX, SavedProject, TrackType } from './types';
import { 
  INITIAL_TRACKS, 
  INITIAL_FX, 
  createDemoClips, 
  generateId,
  PRESET_SAMPLES
} from './utils/demoProject';
import { audioEngine } from './utils/audioEngine';

// Components
import SampleBrowser from './components/SampleBrowser';
import Timeline from './components/Timeline';
import PianoRoll from './components/PianoRoll';
import Mixer from './components/Mixer';

// Icons
import { 
  Music, 
  ChevronDown, 
  Play, 
  Square, 
  RotateCcw, 
  Plus, 
  Download, 
  FileText, 
  Sparkles, 
  Trash2,
  ListFilter,
  Eye,
  Sliders,
  FolderClosed,
  Save,
  CheckCircle,
  HelpCircle,
  ArrowRight,
  Info,
  Zap,
  Circle
} from 'lucide-react';

export default function App() {
  // --- 1. State Variables ---
  const [projectName, setProjectName] = useState<string>('Untitled Project');
  const [bpm, setBpm] = useState<number>(120);
  const [tracks, setTracks] = useState<Track[]>(INITIAL_TRACKS);
  const [clips, setClips] = useState<Clip[]>([]);
  const [selectedTrackId, setSelectedTrackId] = useState<string>('track-heavy-bass');
  const [masterFX, setMasterFX] = useState<MasterFX>(INITIAL_FX);
  
  // Playback state
  const [currentBeat, setCurrentBeat] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isLoopEnabled, setIsLoopEnabled] = useState<boolean>(true);
  const [isRecordingAutomation, setIsRecordingAutomation] = useState<boolean>(false);
  
  // Active Piano Roll State
  const [activePianoRollClip, setActivePianoRollClip] = useState<Clip | null>(null);

  // Layout toggles
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  const [isMixerOpen, setIsMixerOpen] = useState<boolean>(true);
  
  // Dropdowns & Tabs
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState<boolean>(false);
  const [projectDropdownTab, setProjectDropdownTab] = useState<'project' | 'saved'>('project');
  const [savedProjects, setSavedProjects] = useState<SavedProject[]>([]);
  const [isHelpOpen, setIsHelpOpen] = useState<boolean>(false);

  // Studio Project Desk Modal State
  const [isProjectManagerOpen, setIsProjectManagerOpen] = useState<boolean>(false);
  const [projectManagerTab, setProjectManagerTab] = useState<'templates' | 'library' | 'export'>('templates');

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const projectDropdownRef = useRef<HTMLDivElement>(null);

  // --- 2. Initial Setup ---
  useEffect(() => {
    // Generate initial demo project content
    const demoClips = createDemoClips();
    setClips(demoClips);

    // Initialize Web Audio API nodes in background
    audioEngine.init();

    // Load list of saved projects from local storage
    loadProjectsFromLocalStorage();

    // Close project dropdown on outside click
    const handleClickOutside = (e: MouseEvent) => {
      if (projectDropdownRef.current && !projectDropdownRef.current.contains(e.target as Node)) {
        setIsProjectDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // --- 3. Synchronize Web Audio Parameters ---
  useEffect(() => {
    // Keep audioEngine synced with live clips and tracks
    audioEngine.updateActiveData(clips, tracks);
  }, [clips, tracks]);

  useEffect(() => {
    // Keep audioEngine synced with live BPM state
    audioEngine.setBpm(bpm);
  }, [bpm]);

  useEffect(() => {
    // Update all tracks volume, mute, solo in Web Audio API nodes
    const hasSolo = tracks.some(t => t.solo);
    tracks.forEach(track => {
      audioEngine.updateTrackParams(track, hasSolo);
    });
  }, [tracks]);

  useEffect(() => {
    // Update Master FX in real-time
    audioEngine.updateMasterFX(masterFX);
  }, [masterFX]);

  // Handle Playhead loop boundary
  useEffect(() => {
    if (isPlaying && currentBeat >= 64) {
      if (isLoopEnabled) {
        audioEngine.setPlayhead(0);
        setCurrentBeat(0);
      } else {
        handleStop();
      }
    }
  }, [currentBeat, isPlaying, isLoopEnabled]);

  // --- 4. Manual Save System ---
  // Autosave has been removed as per user preference. All saves are manual via header Save button or Project menu.

  // --- 5. Project Loading & Saving ---
  const loadProjectsFromLocalStorage = () => {
    try {
      const data = localStorage.getItem('hercules_daw_projects');
      if (data) {
        setSavedProjects(JSON.parse(data));
      }
    } catch (e) {
      console.error("Error loading saved projects:", e);
    }
  };

  const saveProjectToLocalStorage = (isAutoSave = false) => {
    try {
      const existingStr = localStorage.getItem('hercules_daw_projects');
      let existingList: SavedProject[] = [];
      if (existingStr) {
        existingList = JSON.parse(existingStr);
      }

      // Filter out older auto-saves for this project name to keep things clean
      existingList = existingList.filter(p => !(p.name === projectName && isAutoSave));

      const newProject: SavedProject = {
        id: generateId(),
        name: projectName,
        bpm,
        tracks,
        clips: clips.map(c => ({
          ...c,
          // clear temporary audio buffers for circular references storage
          audioUrl: undefined
        })),
        createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      const updatedList = [newProject, ...existingList].slice(0, 15); // keep last 15 saves
      localStorage.setItem('hercules_daw_projects', JSON.stringify(updatedList));
      setSavedProjects(updatedList);

      showToast(isAutoSave ? "Auto-saved project!" : "Project saved successfully!");
    } catch (e) {
      console.error("Error saving project:", e);
    }
  };

  const handleLoadSavedProject = (saved: SavedProject) => {
    setProjectName(saved.name);
    setBpm(saved.bpm);
    setTracks(saved.tracks);
    setClips(saved.clips);
    setIsProjectDropdownOpen(false);
    setActivePianoRollClip(null);
    audioEngine.setPlayhead(0);
    setCurrentBeat(0);
    showToast(`Loaded "${saved.name}"!`);
  };

  const handleDeleteSavedProject = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const filtered = savedProjects.filter(p => p.id !== id);
    localStorage.setItem('hercules_daw_projects', JSON.stringify(filtered));
    setSavedProjects(filtered);
    showToast("Deleted saved session.");
  };

  const handleNewProject = () => {
    if (confirm("Reset layout and start a fresh project?")) {
      setProjectName('Untitled Project');
      setBpm(120);
      setTracks(INITIAL_TRACKS);
      setClips([]);
      setActivePianoRollClip(null);
      setCurrentBeat(0);
      audioEngine.setPlayhead(0);
      setIsProjectDropdownOpen(false);
      showToast("Fresh canvas created.");
    }
  };

  // --- 6. Export Functions ---
  const handleExportDawProject = () => {
    const rawData = {
      projectName,
      bpm,
      tracks,
      clips,
      masterFX
    };
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(rawData, null, 2))}`;
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', jsonString);
    downloadAnchor.setAttribute('download', `${projectName.toLowerCase().replace(/\s+/g, '_')}.dawproject`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    setIsProjectDropdownOpen(false);
    showToast("Exported project metadata.");
  };

  const handleExportWav = async () => {
    showToast("Synthesizing audio nodes to WAV...");
    try {
      const wavBlob = await audioEngine.exportProjectWav(clips, tracks, bpm);
      const url = URL.createObjectURL(wavBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${projectName.toLowerCase().replace(/\s+/g, '_')}.wav`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setIsProjectDropdownOpen(false);
      showToast("WAV Export complete!");
    } catch (err) {
      alert(`Export error: ${err}`);
    }
  };

  // Import .dawproject / JSON session files
  const handleImportDawProjectFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const parsed = JSON.parse(text);
        if (parsed.projectName && parsed.tracks) {
          setProjectName(parsed.projectName || 'Imported Session');
          setBpm(parsed.bpm || 120);
          setTracks(parsed.tracks || []);
          setClips(parsed.clips || []);
          if (parsed.masterFX) {
            setMasterFX(parsed.masterFX);
          }
          showToast(`Imported "${parsed.projectName}" successfully!`);
          setIsProjectManagerOpen(false);
        } else {
          alert("Invalid project file structure. Make sure it is a valid .dawproject JSON export.");
        }
      } catch (err) {
        alert("Error parsing project file: " + err);
      }
    };
    reader.readAsText(file);
  };

  // Export MIDI events text list representation
  const handleExportMidiNotes = () => {
    let output = `=========================================\n`;
    output += ` HERCULES STUDIO DAW: MIDI NOTE EXPORT\n`;
    output += ` Project: ${projectName}\n`;
    output += ` Tempo: ${bpm} BPM\n`;
    output += ` Date Exported: ${new Date().toLocaleString()}\n`;
    output += `=========================================\n\n`;

    tracks.forEach(track => {
      output += `TRACK: [${track.type.toUpperCase()}] ${track.name} (Vol: ${Math.round(track.volume * 100)}%)\n`;
      const trackClips = clips.filter(c => c.trackId === track.id);
      if (trackClips.length === 0) {
        output += `  (No clips/MIDI notes on this track)\n`;
      } else {
        trackClips.forEach(clip => {
          output += `  CLIP: "${clip.name}" (Starts at beat ${clip.startBeat}, duration: ${clip.durationBeats} beats)\n`;
          if (clip.notes.length === 0) {
            output += `    [No MIDI notes inside clip]\n`;
          } else {
            clip.notes.forEach(note => {
              output += `    - Note: ${note.pitch} | Starts: beat ${note.startBeat} (Absolute beat: ${clip.startBeat + note.startBeat}) | Dur: ${note.durationBeats} beats | Vel: ${Math.round(note.velocity * 127)}\n`;
            });
          }
        });
      }
      output += `\n-----------------------------------------\n\n`;
    });

    const blob = new Blob([output], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectName.toLowerCase().replace(/\s+/g, '_')}_midi_notation.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToast("MIDI Notation exported.");
  };

  // --- 7. Timeline Playback Triggers ---
  const handlePlay = () => {
    if (isPlaying) {
      handleStop();
    } else {
      audioEngine.setBpm(bpm);
      audioEngine.startPlayback(
        bpm,
        currentBeat,
        (beat) => {
          // Beat integer boundary trigger
        },
        (exactBeat) => {
          setCurrentBeat(exactBeat);
        },
        clips,
        tracks
      );
      setIsPlaying(true);
    }
  };

  const handleStop = () => {
    audioEngine.stopPlayback();
    setIsPlaying(false);
  };

  const handleResetPlayhead = () => {
    audioEngine.setPlayhead(0);
    setCurrentBeat(0);
    if (!isPlaying) {
      showToast("Playhead reset to Bar 1.");
    }
  };

  const handlePlayFromBeat = (beat: number) => {
    // 1. Move playhead
    setCurrentBeat(beat);
    audioEngine.setPlayhead(beat);

    // 2. Restart playback from the new beat position
    audioEngine.stopPlayback();
    audioEngine.setBpm(bpm);
    audioEngine.startPlayback(
      bpm,
      beat,
      (b) => {},
      (exactBeat) => {
        setCurrentBeat(exactBeat);
      },
      clips,
      tracks
    );
    setIsPlaying(true);
    showToast(`Jumped & playing from Beat ${beat.toFixed(1)}`);
  };

  // --- 8. Clip/Track Addition Utilities ---
  const handleAddTrack = (type?: TrackType) => {
    const selectedType = type || 'synth';
    
    const colors = ['#10b981', '#a855f7', '#06b6d4', '#14b8a6', '#eab308', '#ec4899', '#3b82f6'];
    const randomColor = colors[tracks.length % colors.length];

    let iconName = 'music';
    if (selectedType === 'synth') iconName = 'zap';
    if (selectedType === 'drum') iconName = 'drum';
    if (selectedType === 'sampler') iconName = 'activity';

    const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
    const newTrack: Track = {
      id: `track-custom-${Date.now()}`,
      name: `Custom ${capitalize(selectedType)} ${tracks.length + 1}`,
      type: selectedType,
      volume: 0.8,
      mute: false,
      solo: false,
      color: randomColor,
      iconName: iconName,
      pan: 0
    };

    setTracks([...tracks, newTrack]);
    setSelectedTrackId(newTrack.id);
    showToast(`Created new ${selectedType} track!`);
  };

  // Add a clip from the Sidebar browser directly onto the selected track timeline
  const handleAddClipToSelectedTrack = (sampleName: string, durationBeats: number) => {
    let trackId = selectedTrackId;
    if (!trackId && tracks.length > 0) {
      trackId = tracks[0].id;
      setSelectedTrackId(trackId);
    }
    const track = tracks.find(t => t.id === trackId);
    if (!track) {
      showToast("Please select or add an instrument track first!");
      return;
    }

    // Since this is a clip added from the sample browser, we trigger the sample once at the start so the loop plays perfectly
    const newClipNotes: any[] = [
      {
        id: `n-${generateId()}`,
        pitch: 'C4', // Standard pitch
        startBeat: 0,
        durationBeats: durationBeats,
        velocity: 0.95
      }
    ];

    const newClip: Clip = {
      id: `clip-${Date.now()}`,
      trackId: trackId,
      name: sampleName,
      startBeat: Math.floor(currentBeat), // snap to nearest beat
      durationBeats,
      color: track.color,
      notes: newClipNotes,
      sampleName: sampleName
    };

    setClips([...clips, newClip]);
  };

  // Add a clip from the Sidebar browser directly onto a specified track at a precise beat (drag-and-drop support)
  const handleAddClipToTrackAtBeat = (trackId: string, sampleName: string, durationBeats: number, beat: number) => {
    const track = tracks.find(t => t.id === trackId);
    if (!track) return;

    // Trigger the sample once at the start so the loop plays perfectly
    const newClipNotes: any[] = [
      {
        id: `n-${generateId()}`,
        pitch: 'C4', // Standard pitch
        startBeat: 0,
        durationBeats: durationBeats,
        velocity: 0.95
      }
    ];

    const newClip: Clip = {
      id: `clip-${Date.now()}`,
      trackId: trackId,
      name: sampleName,
      startBeat: Math.max(0, Math.floor(beat)), // Snap to dropped beat location
      durationBeats,
      color: track.color,
      notes: newClipNotes,
      sampleName: sampleName
    };

    setClips([...clips, newClip]);
    setSelectedTrackId(trackId); // focus the target track automatically
    showToast(`Added "${sampleName}" to ${track.name} at Beat ${Math.floor(beat) + 1}`);
  };

  const handleUpdateClip = (updatedClip: Clip) => {
    setClips(clips.map(c => c.id === updatedClip.id ? updatedClip : c));
    if (activePianoRollClip && activePianoRollClip.id === updatedClip.id) {
      setActivePianoRollClip(updatedClip);
    }
  };

  // Show status toasts
  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(null);
    }, 2500);
  };

  const selectedTrack = tracks.find(t => t.id === selectedTrackId);

  return (
    <div className="flex flex-col h-screen w-screen bg-[#0d0d10] text-white font-sans overflow-hidden">
      
      {/* 1. MAIN SYSTEM CONTROL BAR (IMPROVED & MADE BIGGER) */}
      <header className="flex items-center justify-between h-[64px] bg-[#121216] border-b border-[#23232a] px-4 shrink-0 z-50">
        
        {/* Left: Project title with Dropdown selector */}
        <div className="flex items-center gap-3 relative" ref={projectDropdownRef}>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-purple-500/20 shrink-0">
            <Zap className="w-5 h-5 fill-current text-yellow-300 animate-pulse" />
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <button 
                onClick={() => {
                  setIsProjectManagerOpen(true);
                  setProjectManagerTab('templates');
                }}
                className="flex items-center gap-1.5 hover:bg-[#202028] px-2.5 py-1 rounded-lg transition-all cursor-pointer text-left focus:outline-none group border border-transparent hover:border-[#2d2d38]"
                title="Open Studio Project Desk"
              >
                <span className="font-sans font-black text-base text-white tracking-tight group-hover:text-purple-400 transition-colors">
                  {projectName}
                </span>
                <ChevronDown className="w-4 h-4 text-gray-400 group-hover:text-purple-400 transition-colors" />
              </button>

              <span className="text-[9px] text-purple-400 font-sans font-black bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20 uppercase tracking-widest hidden md:inline">
                STUDIO SESSION
              </span>
            </div>

            {/* Quick real-time dashboard details under the big project name */}
            <div className="flex items-center gap-2 text-[10.5px] text-gray-400 pl-2.5 mt-0.5 font-sans font-medium">
              <span>Tracks: <strong className="text-gray-200">{tracks.length}</strong></span>
              <span className="text-gray-600">•</span>
              <span>BPM: <strong className="text-gray-200">{bpm}</strong></span>
              <span className="text-gray-600">•</span>
              <span className="text-[#a78bfa] font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
                Live Session
              </span>
            </div>
          </div>
        </div>

        {/* Middle: Sleek, high-performance Transport Control Center */}
        <div className="flex items-center bg-[#16161c] px-4 py-1.5 rounded-xl border border-[#2d2d38] shadow-lg shadow-black/30 gap-4">
          {/* Button Group: Rewind, Play, Loop */}
          <div className="flex items-center gap-1 bg-[#0f0f13] px-2 py-1 rounded-lg border border-[#23232c]">
            {/* Rewind */}
            <button 
              onClick={handleResetPlayhead}
              className="p-1.5 hover:bg-[#1a1a24] text-gray-400 hover:text-white rounded-md transition-colors cursor-pointer"
              title="Reset playhead to start (0.0)"
            >
              <RotateCcw className="w-4 h-4 text-purple-400" />
            </button>

            {/* Play/Pause */}
            <button 
              onClick={handlePlay}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md font-sans font-black text-xs uppercase tracking-wider transition-all cursor-pointer ${
                isPlaying 
                  ? 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 shadow-[0_0_12px_rgba(239,68,68,0.15)]' 
                  : 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-[0_0_12px_rgba(16,185,129,0.25)] hover:scale-[1.02]'
              }`}
              title={isPlaying ? "Stop Playback" : "Start Playback"}
            >
              {isPlaying ? (
                <>
                  <Square className="w-3 h-3 fill-current" />
                  <span>STOP</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>PLAY</span>
                </>
              )}
            </button>

            {/* Loop Toggle */}
            <button 
              onClick={() => {
                setIsLoopEnabled(!isLoopEnabled);
                showToast(isLoopEnabled ? "Timeline loop disabled." : "Timeline loop enabled.");
              }}
              className={`p-1.5 rounded-md transition-all cursor-pointer ${
                isLoopEnabled 
                  ? 'bg-[#a78bfa]/10 text-purple-400 border border-purple-500/20' 
                  : 'text-gray-500 hover:text-gray-300'
              }`}
              title="Toggle Timeline Looping"
            >
              <RotateCcw className="w-3.5 h-3.5 scale-x-[-1]" />
            </button>

            {/* Record Automation */}
            <button 
              onClick={() => {
                setIsRecordingAutomation(!isRecordingAutomation);
                showToast(isRecordingAutomation ? "Automation recording disabled." : "Automation recording enabled! Move volume, pan, or cutoff during playback to record!");
              }}
              className={`p-1.5 rounded-md transition-all cursor-pointer flex items-center justify-center ${
                isRecordingAutomation 
                  ? 'bg-red-500/25 text-red-400 border border-red-500/40 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.4)]' 
                  : 'text-gray-500 hover:text-red-400'
              }`}
              title="Record Automation (Live Capture)"
            >
              <Circle className="w-3.5 h-3.5 fill-current" />
            </button>
          </div>

          {/* BPM Hub */}
          <div className="flex items-center gap-2 bg-[#0f0f13] px-3 py-1.5 rounded-lg border border-[#23232c]">
            <span className="text-[10px] font-sans font-black text-[#8e8e9f] tracking-widest uppercase mr-1">Tempo</span>
            
            <button
              onClick={() => {
                const newVal = Math.max(60, bpm - 1);
                setBpm(newVal);
                audioEngine.setBpm(newVal);
              }}
              className="w-5 h-5 flex items-center justify-center bg-[#1d1d25] hover:bg-[#2c2c38] rounded text-gray-400 hover:text-white transition-all text-xs font-bold font-mono border border-white/5 cursor-pointer select-none"
              title="Decrease tempo by 1 BPM"
            >
              -
            </button>

            <input
              type="number"
              min="60"
              max="240"
              value={bpm}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                if (!isNaN(val)) {
                  const clamped = Math.min(240, Math.max(60, val));
                  setBpm(clamped);
                  audioEngine.setBpm(clamped);
                }
              }}
              onBlur={(e) => {
                let val = parseInt(e.target.value);
                if (isNaN(val) || val < 60) val = 60;
                if (val > 240) val = 240;
                setBpm(val);
                audioEngine.setBpm(val);
              }}
              className="font-mono text-emerald-400 font-extrabold text-sm bg-[#141419] border border-[#1e1e24] px-1 py-0.5 rounded w-12 text-center outline-none focus:border-emerald-500/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              title="Type BPM value directly (60 - 240)"
            />

            <button
              onClick={() => {
                const newVal = Math.min(240, bpm + 1);
                setBpm(newVal);
                audioEngine.setBpm(newVal);
              }}
              className="w-5 h-5 flex items-center justify-center bg-[#1d1d25] hover:bg-[#2c2c38] rounded text-gray-400 hover:text-white transition-all text-xs font-bold font-mono border border-white/5 cursor-pointer select-none"
              title="Increase tempo by 1 BPM"
            >
              +
            </button>

            <span className="text-[10px] text-gray-500 font-sans font-bold uppercase tracking-wider">BPM</span>
          </div>
        </div>

        {/* Right: Layout Toggle Controls */}
        <div className="flex items-center gap-2">
          
          {/* Direct Manual Save Button */}
          <button
            onClick={() => saveProjectToLocalStorage(false)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-sans font-extrabold text-xs rounded-lg transition-all shadow-md shadow-blue-600/10 cursor-pointer mr-2 border border-blue-500/30"
            title="Save Project (Manual)"
          >
            <Save className="w-3.5 h-3.5" />
            <span className="hidden sm:inline uppercase tracking-wider text-[10px] font-black">Save Project</span>
          </button>
          
          {/* Help Button */}
          <button
            onClick={() => setIsHelpOpen(!isHelpOpen)}
            className={`p-2 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
              isHelpOpen ? 'bg-purple-600 text-white' : 'hover:bg-[#202028] text-gray-400 hover:text-white'
            }`}
            title="Help instructions"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          {/* Sidebar Toggle */}
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className={`p-2 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
              isSidebarOpen ? 'bg-purple-600 text-white' : 'hover:bg-[#202028] text-gray-400 hover:text-white'
            }`}
            title="Toggle Sidebar"
          >
            <ListFilter className="w-4 h-4" />
          </button>

          {/* Mixer Toggle */}
          <button 
            onClick={() => setIsMixerOpen(!isMixerOpen)}
            className={`p-2 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
              isMixerOpen ? 'bg-purple-600 text-white' : 'hover:bg-[#202028] text-gray-400 hover:text-white'
            }`}
            title="Toggle Mixer"
          >
            <Sliders className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* 2. LIVE STATUS TOAST ALERTS */}
      {toastMessage && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-[#1b1b22] border-2 border-purple-500 px-5 py-2.5 rounded-full text-xs text-purple-300 flex items-center gap-2.5 shadow-2xl z-50 animate-bounce">
          <Sparkles className="w-4 h-4 text-purple-400 fill-current" />
          <span className="font-bold tracking-tight">{toastMessage}</span>
        </div>
      )}

      {/* 3. HELP POPUP SCREEN */}
      {isHelpOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#18181c] border border-[#2f2f3d] rounded-2xl max-w-lg p-6 text-white shadow-2xl">
            <h3 className="font-sans font-extrabold text-lg text-emerald-400 flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5" />
              Hercules DAW Guide
            </h3>
            
            <div className="space-y-3.5 text-xs text-gray-300 leading-relaxed">
              <p>
                Welcome to the full-featured, browser-native <strong>Hercules Digital Audio Workstation</strong>!
              </p>
              
              <div className="p-3 bg-[#0f0f13] rounded-lg border border-[#202028] space-y-2">
                <p className="text-emerald-300 font-bold flex items-center gap-1.5">
                  <ArrowRight className="w-3.5 h-3.5" />
                  How to trigger Piano Roll
                </p>
                <p>
                  As requested, <strong>double-tapping or double-clicking</strong> on any active clip patch on the timeline (e.g. "Analog Pluck Melody", "House Tech Loop") opens the Piano Roll panel below for precise MIDI notes editing.
                </p>
              </div>

              <ul className="list-disc pl-5 space-y-1.5 text-gray-400">
                <li>Press <Play className="inline w-3 h-3 text-emerald-400" /> to start playing the demo song. It generates real synth, bass, and beats!</li>
                <li>Add samples or vocals from the left sidebar directly to tracks.</li>
                <li>Mute (M) or Solo (S) tracks, or slide the volume to adjust the mix.</li>
                <li>Toggle on EQ Eight or Glue Compressor at the bottom to hear the Master FX Chain changes in real-time.</li>
              </ul>
            </div>

            <button
              onClick={() => setIsHelpOpen(false)}
              className="mt-6 w-full py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-sans font-extrabold rounded-lg transition-colors cursor-pointer"
            >
              Get Grooving
            </button>
          </div>
        </div>
      )}

      {/* 4. MAIN WORKSPACE PANELS */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* A. Left Sidebar: Sample Browser */}
        {isSidebarOpen ? (
          <SampleBrowser 
            onAddClipToSelectedTrack={handleAddClipToSelectedTrack} 
            onMinimize={() => setIsSidebarOpen(false)}
          />
        ) : (
          <div 
            onClick={() => setIsSidebarOpen(true)}
            className="w-10 bg-[#121215] hover:bg-[#181820] border-r border-[#2d2d34] flex flex-col items-center py-4 cursor-pointer transition-all select-none group shrink-0"
            title="Expand Sample Packs Sidebar"
          >
            <button className="p-1.5 rounded-md bg-purple-600/20 text-purple-400 group-hover:bg-purple-600 group-hover:text-white transition-all mb-4">
              <Plus className="w-3.5 h-3.5" />
            </button>
            <div className="flex-1 flex items-center justify-center">
              <p className="text-[10px] font-sans font-bold tracking-[0.2em] text-gray-400 group-hover:text-white uppercase [writing-mode:vertical-lr] rotate-180">
                📂 SAMPLE BROWSER
              </p>
            </div>
          </div>
        )}

        {/* B. Center: Timeline Grid and Piano Roll */}
        <div className="flex-1 flex flex-col overflow-hidden">
          
          <Timeline
            tracks={tracks}
            clips={clips}
            currentBeat={currentBeat}
            selectedTrackId={selectedTrackId}
            onSelectTrack={setSelectedTrackId}
            onUpdateTrack={(updatedTrack) => {
              setTracks(tracks.map(t => t.id === updatedTrack.id ? updatedTrack : t));
            }}
            onClipDoubleTapped={(clip) => {
              setActivePianoRollClip(clip);
              // Focus active track as well
              setSelectedTrackId(clip.trackId);
            }}
            onUpdateClips={setClips}
            onAddTrack={handleAddTrack}
            onPlayheadMove={(beat) => {
              setCurrentBeat(beat);
              audioEngine.setPlayhead(beat);
            }}
            onPlayFromBeat={handlePlayFromBeat}
            onAddClipToTrackAtBeat={handleAddClipToTrackAtBeat}
            isPlaying={isPlaying}
            isRecordingAutomation={isRecordingAutomation}
          />

          {/* Interactive Collapsible Piano Roll (when a clip is double-tapped) */}
          {activePianoRollClip && (
            <PianoRoll
              clip={activePianoRollClip}
              trackType={selectedTrack?.type || 'synth'}
              trackColor={selectedTrack?.color || '#a855f7'}
              onUpdateClip={handleUpdateClip}
              onClose={() => setActivePianoRollClip(null)}
              isProjectPlaying={isPlaying}
              onPreviewStart={() => {
                if (isPlaying) {
                  handleStop();
                }
              }}
            />
          )}

        </div>

      </div>

      {/* 5. BOTTOM MIXER / MASTER FX CHAIN PANEL */}
      {isMixerOpen && (
        <Mixer
          fx={masterFX}
          selectedTrack={selectedTrack}
          onUpdateFX={setMasterFX}
          isPlaying={isPlaying}
        />
      )}

      {/* 6. STUDIO PROJECT DESK MODAL */}
      {isProjectManagerOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-[#121216] border border-[#2d2d3a] rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl text-white">
            
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#23232c] bg-[#16161b]">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-gradient-to-tr from-purple-600 to-indigo-500 text-white shadow-lg shadow-purple-500/10">
                  <FolderClosed className="w-5 h-5 text-purple-200" />
                </div>
                <div>
                  <h2 className="font-sans font-black text-sm md:text-base text-white leading-none">Studio Project Desk</h2>
                  <p className="text-[11px] text-gray-400 mt-1">Manage, template, export, and load your custom DAW sessions</p>
                </div>
              </div>
              <button 
                onClick={() => setIsProjectManagerOpen(false)}
                className="px-3 py-1.5 hover:bg-[#202028] rounded-lg text-gray-300 hover:text-white transition-all cursor-pointer font-bold text-xs border border-white/10"
              >
                ✕ CLOSE
              </button>
            </div>

            {/* Modal Body with Sidebar */}
            <div className="flex-1 flex overflow-hidden min-h-[350px]">
              {/* Tabs list */}
              <div className="w-44 bg-[#0d0d10] border-r border-[#1c1c24] p-3 flex flex-col gap-1.5 shrink-0 select-none">
                <button
                  onClick={() => setProjectManagerTab('templates')}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all text-left cursor-pointer ${
                    projectManagerTab === 'templates'
                      ? 'bg-purple-600/15 text-purple-400 border border-purple-500/30'
                      : 'text-gray-400 hover:text-white hover:bg-white/[0.02]'
                  }`}
                >
                  <Sparkles className="w-4 h-4 text-purple-400 animate-pulse" />
                  New Project
                </button>
                <button
                  onClick={() => setProjectManagerTab('library')}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all text-left cursor-pointer ${
                    projectManagerTab === 'library'
                      ? 'bg-purple-600/15 text-purple-400 border border-purple-500/30'
                      : 'text-gray-400 hover:text-white hover:bg-white/[0.02]'
                  }`}
                >
                  <Save className="w-4 h-4 text-blue-400" />
                  Save & Load
                </button>
                <button
                  onClick={() => setProjectManagerTab('export')}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all text-left cursor-pointer ${
                    projectManagerTab === 'export'
                      ? 'bg-purple-600/15 text-purple-400 border border-purple-500/30'
                      : 'text-gray-400 hover:text-white hover:bg-white/[0.02]'
                  }`}
                >
                  <Download className="w-4 h-4 text-pink-400" />
                  Export Options
                </button>
              </div>

              {/* Tab Contents */}
              <div className="flex-1 p-6 overflow-y-auto bg-[#101014]">
                
                {/* 1. Templates Tab */}
                {projectManagerTab === 'templates' && (
                  <div className="space-y-5">
                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-wider">Select a Session Template</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      
                      {/* Blank Slate Card */}
                      <div 
                        onClick={() => {
                          setProjectName('Blank Canvas');
                          setTracks([]);
                          setClips([]);
                          setActivePianoRollClip(null);
                          setCurrentBeat(0);
                          audioEngine.setPlayhead(0);
                          setIsProjectManagerOpen(false);
                          showToast("Truly empty project started.");
                        }}
                        className="p-5 rounded-xl border border-[#24242e] bg-[#0c0c0f] hover:bg-[#15151a] hover:border-purple-500/40 transition-all cursor-pointer group flex flex-col justify-between h-44 shadow"
                      >
                        <div>
                          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 mb-3 border border-emerald-500/20">
                            <Zap className="w-4.5 h-4.5 animate-bounce" />
                          </div>
                          <h4 className="font-extrabold text-sm text-white group-hover:text-emerald-400 transition-colors">Truly Blank Slate</h4>
                          <p className="text-[11px] text-gray-400 mt-1.5 leading-relaxed">Starts with 0 tracks and 0 clips. Absolute full freedom to design your instruments from scratch.</p>
                        </div>
                        <span className="text-[9px] font-mono text-emerald-500 uppercase tracking-widest font-black flex items-center gap-1">Start Fresh →</span>
                      </div>

                      {/* Studio Starter Card */}
                      <div 
                        onClick={() => {
                          setProjectName('Empty Studio Grid');
                          setBpm(120);
                          setTracks(INITIAL_TRACKS);
                          setClips([]);
                          setActivePianoRollClip(null);
                          setCurrentBeat(0);
                          audioEngine.setPlayhead(0);
                          setIsProjectManagerOpen(false);
                          showToast("Standard empty grid loaded.");
                        }}
                        className="p-5 rounded-xl border border-[#24242e] bg-[#0c0c0f] hover:bg-[#15151a] hover:border-purple-500/40 transition-all cursor-pointer group flex flex-col justify-between h-44 shadow"
                      >
                        <div>
                          <div className="w-9 h-9 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-400 mb-3 border border-cyan-500/20">
                            <Sliders className="w-4.5 h-4.5" />
                          </div>
                          <h4 className="font-extrabold text-sm text-white group-hover:text-cyan-400 transition-colors">Empty Studio Grid</h4>
                          <p className="text-[11px] text-gray-400 mt-1.5 leading-relaxed">Loads 4 standard tracks (Synth Lead, Heavy Bass, Drum Beats, Vocal sampler) with 0 clips. Perfect for drawing notes.</p>
                        </div>
                        <span className="text-[9px] font-mono text-cyan-500 uppercase tracking-widest font-black flex items-center gap-1">Start Blank →</span>
                      </div>

                      {/* Groove Preset Card */}
                      <div 
                        onClick={() => {
                          setProjectName('Electronic Groove Demo');
                          setBpm(120);
                          setTracks(INITIAL_TRACKS);
                          setClips(createDemoClips());
                          setActivePianoRollClip(null);
                          setCurrentBeat(0);
                          audioEngine.setPlayhead(0);
                          setIsProjectManagerOpen(false);
                          showToast("Loaded Electronic Demo Project!");
                        }}
                        className="p-5 rounded-xl border border-purple-500/30 bg-[#161220] hover:bg-[#1e192c] hover:border-purple-400 transition-all cursor-pointer group flex flex-col justify-between h-44 shadow-lg shadow-purple-950/20"
                      >
                        <div>
                          <div className="w-9 h-9 rounded-lg bg-purple-500/20 flex items-center justify-center text-purple-400 mb-3 border border-purple-400/30">
                            <Music className="w-4.5 h-4.5 fill-current text-purple-300" />
                          </div>
                          <h4 className="font-extrabold text-sm text-white group-hover:text-purple-300 transition-colors">Electronic Demo</h4>
                          <p className="text-[11px] text-purple-200 mt-1.5 leading-relaxed">Loads our premium fully sequenced starter loop! Great to learn the synth routing, Master FX, and layout.</p>
                        </div>
                        <span className="text-[9px] font-mono text-purple-300 uppercase tracking-widest font-black flex items-center gap-1">Load Preset →</span>
                      </div>

                    </div>
                  </div>
                )}

                {/* 2. Library Tab (Save & Load) */}
                {projectManagerTab === 'library' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
                    
                    {/* Left Pane: Save Current Session */}
                    <div className="p-4 rounded-xl border border-[#22222a] bg-[#0c0c0f] flex flex-col justify-between">
                      <div className="space-y-4">
                        <h4 className="font-black text-xs uppercase tracking-wider text-purple-400">Save Current Session</h4>
                        
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-bold text-gray-500 uppercase">Rename Project</label>
                          <input
                            type="text"
                            value={projectName}
                            onChange={(e) => setProjectName(e.target.value)}
                            placeholder="My House Project..."
                            className="w-full bg-[#131318] border border-[#2d2d3a] rounded-lg px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:border-purple-500"
                          />
                        </div>

                        <div className="p-3 rounded-lg bg-purple-600/10 border border-purple-500/20 text-[10.5px] text-purple-300 leading-relaxed">
                          Saving stores your tracks, BPM, volume, panning, Master FX parameters, and precise MIDI notation keys inside your browser's persistent library.
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          saveProjectToLocalStorage(false);
                          setIsProjectManagerOpen(false);
                        }}
                        className="w-full mt-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-sans font-extrabold text-xs rounded-lg transition-all shadow-md shadow-purple-600/10 cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <Save className="w-3.5 h-3.5" />
                        SAVE CURRENT PROJECT
                      </button>
                    </div>

                    {/* Right Pane: Load Local Project & File Import */}
                    <div className="flex flex-col gap-4">
                      
                      {/* Dotted JSON File Uploader */}
                      <div className="border border-dashed border-[#343444] rounded-xl p-4 bg-[#0d0d10] hover:bg-[#141419] transition-all relative group text-center cursor-pointer">
                        <input 
                          type="file"
                          accept=".json, .dawproject"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleImportDawProjectFile(file);
                          }}
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        />
                        <div className="flex flex-col items-center justify-center gap-1 pointer-events-none select-none">
                          <Download className="w-5 h-5 text-gray-500 group-hover:text-purple-400 transition-colors" />
                          <p className="text-xs font-extrabold text-gray-300">Drag & Drop .dawproject file</p>
                          <p className="text-[9px] text-gray-500">or click to browse your PC templates</p>
                        </div>
                      </div>

                      <div className="flex-1 flex flex-col">
                        <h4 className="font-black text-xs uppercase tracking-wider text-gray-400 mb-2">Saved Sessions ({savedProjects.length})</h4>
                        
                        <div className="flex-1 overflow-y-auto max-h-[160px] space-y-2 pr-1">
                          {savedProjects.length === 0 ? (
                            <div className="py-8 text-center text-xs text-gray-500 bg-[#0d0d10]/40 rounded-lg border border-[#1b1b22]">
                              No saved projects found in local library.
                            </div>
                          ) : (
                            savedProjects.map((saved) => (
                              <div
                                key={saved.id}
                                onClick={() => {
                                  handleLoadSavedProject(saved);
                                  setIsProjectManagerOpen(false);
                                }}
                                className="group flex items-center justify-between p-2 rounded-lg bg-[#0d0d10] hover:bg-[#181820] border border-[#202028] hover:border-[#2d2d3a] transition-all cursor-pointer"
                              >
                                <div className="min-w-0">
                                  <p className="text-xs font-black text-white truncate">{saved.name}</p>
                                  <span className="text-[9px] text-gray-500 block mt-0.5">Saved {saved.createdAt} • {saved.bpm} BPM • {saved.tracks?.length || 0} Tracks</span>
                                </div>
                                <button
                                  onClick={(e) => handleDeleteSavedProject(saved.id, e)}
                                  className="p-1 rounded text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100"
                                  title="Delete saved project"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                    </div>
                  </div>
                )}

                {/* 3. Export Tab */}
                {projectManagerTab === 'export' && (
                  <div className="space-y-5">
                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-wider">Export Studio Deliverables</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      
                      {/* Export WAV Card */}
                      <div 
                        onClick={() => {
                          setIsProjectManagerOpen(false);
                          handleExportWav();
                        }}
                        className="p-5 rounded-xl border border-[#24242e] bg-[#0c0c0f] hover:bg-[#15151a] hover:border-pink-500/40 transition-all cursor-pointer group flex flex-col justify-between h-44 shadow"
                      >
                        <div>
                          <div className="w-9 h-9 rounded-lg bg-pink-500/10 flex items-center justify-center text-pink-400 mb-3 border border-pink-500/20">
                            <Download className="w-4.5 h-4.5 animate-pulse" />
                          </div>
                          <h4 className="font-extrabold text-sm text-white group-hover:text-pink-400 transition-colors">Render Stereo WAV</h4>
                          <p className="text-[11px] text-gray-400 mt-1.5 leading-relaxed">Renders and decodes all MIDI notation tracks and sample files into a stereo master WAV file for instant play.</p>
                        </div>
                        <span className="text-[9px] font-mono text-pink-500 uppercase tracking-widest font-black flex items-center gap-1">Compile WAV →</span>
                      </div>

                      {/* Export JSON Card */}
                      <div 
                        onClick={() => {
                          setIsProjectManagerOpen(false);
                          handleExportDawProject();
                        }}
                        className="p-5 rounded-xl border border-[#24242e] bg-[#0c0c0f] hover:bg-[#15151a] hover:border-purple-500/40 transition-all cursor-pointer group flex flex-col justify-between h-44 shadow"
                      >
                        <div>
                          <div className="w-9 h-9 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400 mb-3 border border-purple-500/20">
                            <FileText className="w-4.5 h-4.5" />
                          </div>
                          <h4 className="font-extrabold text-sm text-white group-hover:text-purple-400 transition-colors">Download .dawproject</h4>
                          <p className="text-[11px] text-gray-400 mt-1.5 leading-relaxed">Export the JSON project file containing notes, track routings, and effect settings to your local computer.</p>
                        </div>
                        <span className="text-[9px] font-mono text-purple-400 uppercase tracking-widest font-black flex items-center gap-1">Download JSON →</span>
                      </div>

                      {/* Export MIDI Card */}
                      <div 
                        onClick={() => {
                          setIsProjectManagerOpen(false);
                          handleExportMidiNotes();
                        }}
                        className="p-5 rounded-xl border border-[#24242e] bg-[#0c0c0f] hover:bg-[#15151a] hover:border-yellow-500/40 transition-all cursor-pointer group flex flex-col justify-between h-44 shadow"
                      >
                        <div>
                          <div className="w-9 h-9 rounded-lg bg-yellow-500/10 flex items-center justify-center text-yellow-400 mb-3 border border-yellow-500/20">
                            <Music className="w-4.5 h-4.5" />
                          </div>
                          <h4 className="font-extrabold text-sm text-white group-hover:text-yellow-400 transition-colors">MIDI Notation text</h4>
                          <p className="text-[11px] text-gray-400 mt-1.5 leading-relaxed">Generates a detailed text file listing all tracks, clips, and precise MIDI note events for easy importing into Ableton or Logic.</p>
                        </div>
                        <span className="text-[9px] font-mono text-yellow-500 uppercase tracking-widest font-black flex items-center gap-1">Export Notation →</span>
                      </div>

                    </div>
                  </div>
                )}

              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
