import React, { useState, useRef } from 'react';
import { PRESET_SAMPLES, generateId } from '../utils/demoProject';
import { audioEngine } from '../utils/audioEngine';
import { Search, FolderClosed, Upload, Play, Plus, CheckCircle, Music, ChevronLeft } from 'lucide-react';
import { Clip } from '../types';

interface SampleBrowserProps {
  onAddClipToSelectedTrack: (clipName: string, durationBeats: number) => void;
  onMinimize?: () => void;
}

export default function SampleBrowser({ onAddClipToSelectedTrack, onMinimize }: SampleBrowserProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'drums' | 'bass' | 'synth' | 'vocals' | 'fx'>('all');
  const [samplesList, setSamplesList] = useState(PRESET_SAMPLES);
  const [playingSampleId, setPlayingSampleId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter chips list
  const filterChips: { id: typeof selectedFilter; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'drums', label: 'Drums' },
    { id: 'bass', label: 'Bass' },
    { id: 'synth', label: 'Synth' },
    { id: 'vocals', label: 'Vocals' },
    { id: 'fx', label: 'FX' },
  ];

  // Play sample preview
  const handlePlayPreview = (sampleId: string, sampleName: string, category: string) => {
    setPlayingSampleId(sampleId);
    audioEngine.playSamplePreview(sampleName, category);
    setTimeout(() => {
      setPlayingSampleId(null);
    }, 1500); // Reset after 1.5s visual feedback
  };

  // Add sample to the current track
  const handleAddToTrack = (sampleName: string, durationStr: string) => {
    const beatsCount = durationStr === '1B' ? 1 : durationStr === '2B' ? 2 : durationStr === '8B' ? 8 : 4;
    onAddClipToSelectedTrack(sampleName, beatsCount);
    
    // Quick toast feedback
    setSuccessMessage(`Added "${sampleName}" clip!`);
    setTimeout(() => setSuccessMessage(null), 2500);
  };

  // Handle upload of custom files
  const handleCustomAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    try {
      setSuccessMessage("Decoding audio file...");
      const sampleKeyName = await audioEngine.loadUserSampleFile(file);
      
      const newSample = {
        id: generateId(),
        name: file.name.replace(/\.[^/.]+$/, ""), // strip extension
        category: 'vocals' as const, // Put under vocals/custom by default
        duration: '4B',
        bpm: 120,
        color: '#10b981'
      };

      setSamplesList([newSample, ...samplesList]);
      setSuccessMessage(`Loaded custom sample: ${newSample.name}!`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      alert(`Error loading audio file: ${err}`);
      setSuccessMessage(null);
    }
  };

  // Filter list
  const filteredSamples = samplesList.filter((sample) => {
    const matchesSearch = sample.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedFilter === 'all' || sample.category === selectedFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div id="sample-browser-container" className="w-[310px] bg-[#121215] border-r border-[#2d2d34] flex flex-col h-full text-white shrink-0">
      
      {/* 1. Header with collapsible toggle */}
      <div className="flex items-center justify-between p-4 border-b border-[#2d2d34] bg-[#1a1a1f]">
        <h2 className="text-xs font-sans font-bold tracking-widest text-[#9c9cb4] uppercase flex items-center gap-2">
          <FolderClosed className="w-4 h-4 text-[#eab308]" />
          Sample Browser
        </h2>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-gray-400 bg-gray-800 px-1.5 py-0.5 rounded">
            {filteredSamples.length} samples
          </span>
          {onMinimize && (
            <button
              onClick={onMinimize}
              className="p-1 rounded text-gray-400 hover:text-white hover:bg-[#2c2c36] transition-colors cursor-pointer"
              title="Minimize panel"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* 2. File Import Actions */}
      <div className="p-3 grid grid-cols-2 gap-2 border-b border-[#2d2d34] bg-[#141417]">
        <button 
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center justify-center gap-1.5 py-2 px-3 bg-[#24242d] hover:bg-[#2c2c38] text-xs font-sans rounded-md border border-[#2d2d34] text-gray-200 transition-colors cursor-pointer"
        >
          <Upload className="w-3.5 h-3.5 text-emerald-400" />
          Import Audio
        </button>
        <button 
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center justify-center gap-1.5 py-2 px-3 bg-[#24242d] hover:bg-[#2c2c38] text-xs font-sans rounded-md border border-[#2d2d34] text-gray-200 transition-colors cursor-pointer"
        >
          <FolderClosed className="w-3.5 h-3.5 text-blue-400" />
          Import Folder
        </button>

        <input 
          type="file"
          ref={fileInputRef}
          onChange={handleCustomAudioUpload}
          accept="audio/*"
          className="hidden"
        />
      </div>

      {/* 3. Search input */}
      <div className="p-3 border-b border-[#2d2d34] bg-[#16161a]">
        <div className="relative flex items-center bg-[#0d0d0f] rounded-md border border-[#23232b]">
          <Search className="w-4 h-4 absolute left-3 text-gray-500" />
          <input
            type="text"
            placeholder="Search samples..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-transparent text-white placeholder-gray-500 focus:outline-none"
          />
        </div>
      </div>

      {/* 4. Filter chips */}
      <div className="px-3 py-2 border-b border-[#2d2d34] bg-[#141417] flex flex-wrap gap-1.5">
        {filterChips.map((chip) => {
          const isActive = selectedFilter === chip.id;
          return (
            <button
              key={chip.id}
              onClick={() => setSelectedFilter(chip.id)}
              className={`text-[10px] px-2.5 py-1 rounded-full font-sans font-semibold border transition-all ${
                isActive
                  ? 'bg-purple-600 text-white border-purple-500 shadow-md shadow-purple-600/20'
                  : 'bg-[#22222a] text-gray-400 border-transparent hover:text-white hover:bg-gray-800'
              }`}
            >
              {chip.label}
            </button>
          );
        })}
      </div>

      {/* Instant Notification Banner */}
      {successMessage && (
        <div className="bg-[#102a1b] border-y border-[#22c55e]/30 px-4 py-2 flex items-center gap-2 text-xs text-emerald-300 transition-all">
          <CheckCircle className="w-4 h-4 text-emerald-400 animate-bounce" />
          <span className="font-medium truncate">{successMessage}</span>
        </div>
      )}

      {/* 5. Scrollable Sample Items List */}
      <div className="flex-1 overflow-y-auto bg-[#0d0d0f] p-2 space-y-1">
        {filteredSamples.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center text-gray-500 px-4">
            <Music className="w-8 h-8 text-gray-700 mb-2" />
            <p className="text-xs">No samples found matching search criteria.</p>
          </div>
        ) : (
          filteredSamples.map((sample) => {
            const isPlaying = playingSampleId === sample.id;
            return (
              <div
                key={sample.id}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData("application/json", JSON.stringify({
                    name: sample.name,
                    duration: sample.duration
                  }));
                  e.dataTransfer.effectAllowed = "copy";
                }}
                className="group flex items-center justify-between p-2 rounded bg-[#16161b]/60 hover:bg-[#202029] border border-transparent hover:border-[#2d2d37] transition-all cursor-grab active:cursor-grabbing"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {/* Play audio preview */}
                  <button
                    onClick={() => handlePlayPreview(sample.id, sample.name, sample.category)}
                    className={`p-1.5 rounded-md flex items-center justify-center transition-all cursor-pointer ${
                      isPlaying 
                        ? 'bg-emerald-500 text-black' 
                        : 'bg-[#212128] text-gray-400 hover:text-white hover:bg-[#2c2c36]'
                    }`}
                  >
                    <Play className="w-3 h-3 fill-current" />
                  </button>

                  <div className="min-w-0">
                    <p className="text-xs font-sans font-semibold text-gray-200 group-hover:text-white truncate">
                      {sample.name}
                    </p>
                    <div className="flex items-center gap-1.5 text-[9.5px] text-gray-400 mt-0.5">
                      <span className="font-mono bg-[#282830] px-1 rounded font-semibold text-[#8e8ec4]">
                        {sample.duration}
                      </span>
                      <span>•</span>
                      <span className="font-mono">{sample.bpm} bpm</span>
                    </div>
                  </div>
                </div>

                {/* Highly visible, highly functional Add button */}
                <button
                  onClick={() => handleAddToTrack(sample.name, sample.duration)}
                  className="px-2.5 py-1.5 rounded bg-purple-600 hover:bg-purple-500 active:bg-purple-700 text-white font-sans font-bold text-[10px] tracking-wider transition-all flex items-center justify-center gap-1 cursor-pointer shrink-0 shadow-md border border-purple-500/20 uppercase"
                  title="Insert this sample clip directly into the selected track"
                >
                  <Plus className="w-3 h-3 stroke-[3px]" />
                  <span>ADD</span>
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Footer info line */}
      <div className="p-3 text-[10px] text-gray-500 bg-[#141418] border-t border-[#1d1d23]">
        <p className="leading-relaxed">
          Tip: Select any track on the grid, then click <Plus className="inline w-3 h-3 text-gray-400" /> to instantly insert sample clips at the current playhead position.
        </p>
      </div>

    </div>
  );
}
