import { Track, Clip, Note, MasterFX } from '../types';

export const INITIAL_TRACKS: Track[] = [
  {
    id: 'track-heavy-bass',
    name: 'Heavy Bass',
    type: 'synth',
    volume: 0.8,
    mute: false,
    solo: false,
    color: '#10b981', // green-500
    iconName: 'guitar',
    pan: -0.2
  },
  {
    id: 'track-drum-loops',
    name: 'Drum Loops',
    type: 'drum',
    volume: 0.9,
    mute: false,
    solo: false,
    color: '#a855f7', // purple-500
    iconName: 'drum',
    pan: 0.0
  },
  {
    id: 'track-synth-lead',
    name: 'Synth Lead',
    type: 'synth',
    volume: 0.7,
    mute: false,
    solo: false,
    color: '#06b6d4', // cyan-500
    iconName: 'music',
    pan: 0.3
  },
  {
    id: 'track-airy-synth',
    name: 'Airy Synth',
    type: 'synth',
    volume: 0.65,
    mute: false,
    solo: false,
    color: '#14b8a6', // teal-500
    iconName: 'sliders',
    pan: -0.4
  },
  {
    id: 'track-arp-synth',
    name: 'Arp Synth',
    type: 'synth',
    volume: 0.6,
    mute: false,
    solo: false,
    color: '#eab308', // yellow-500
    iconName: 'activity',
    pan: 0.4
  },
  {
    id: 'track-vocal-shouts',
    name: 'Vocal Shouts',
    type: 'sampler',
    volume: 0.75,
    mute: false,
    solo: false,
    color: '#3b82f6', // blue-500
    iconName: 'mic',
    pan: 0.1
  },
  {
    id: 'track-punch-bass',
    name: 'Punch Bass',
    type: 'synth',
    volume: 0.7,
    mute: false,
    solo: false,
    color: '#ec4899', // pink-500
    iconName: 'zap',
    pan: -0.1
  }
];

// Helper to generate a unique random ID
export const generateId = () => Math.random().toString(36).substring(2, 9);

// Create standard demo clips with MIDI notes
export const createDemoClips = (): Clip[] => {
  const clips: Clip[] = [];

  // --- 1. Heavy Bass Clips (E2 -> G2 -> A2 -> C3 progression) ---
  const bassNotes: Note[] = [
    { id: 'b1', pitch: 'E2', startBeat: 0.0, durationBeats: 3.5, velocity: 1.0 },
    { id: 'b2', pitch: 'E2', startBeat: 4.0, durationBeats: 3.5, velocity: 1.0 },
    { id: 'b3', pitch: 'A2', startBeat: 8.0, durationBeats: 3.5, velocity: 1.0 },
    { id: 'b4', pitch: 'G2', startBeat: 12.0, durationBeats: 3.5, velocity: 1.0 }
  ];
  clips.push({
    id: 'clip-bass-main',
    trackId: 'track-heavy-bass',
    name: 'Heavy Sub Growl',
    startBeat: 0.0,
    durationBeats: 16.0,
    color: '#10b981',
    notes: bassNotes
  });

  // --- 2. Drum Loops Clips (Full 16-beat sequence) ---
  const drumNotes: Note[] = [];
  
  // Kicks on C3 (beat 0, 1, 2, 3...)
  for (let b = 0; b < 16; b += 1.0) {
    drumNotes.push({
      id: `dk-${b}`,
      pitch: 'C3', // Kick trigger
      startBeat: b,
      durationBeats: 0.25,
      velocity: 1.0
    });
  }

  // Snares on D3 (beat 1, 3, 5, 7...)
  for (let b = 1; b < 16; b += 2.0) {
    drumNotes.push({
      id: `ds-${b}`,
      pitch: 'D3', // Snare trigger
      startBeat: b,
      durationBeats: 0.25,
      velocity: 0.95
    });
  }

  // Hi-hats on E3/F3 (beat 0.5, 1.5, 2.5...)
  for (let b = 0.5; b < 16; b += 1.0) {
    drumNotes.push({
      id: `dh-${b}`,
      pitch: 'E3', // Closed Hi-hat trigger
      startBeat: b,
      durationBeats: 0.15,
      velocity: 0.7
    });
  }
  // Add some double 16th-note hats on beat subdivisions
  for (let b = 2.25; b < 16; b += 4.0) {
    drumNotes.push({
      id: `dh-sub-${b}`,
      pitch: 'E3',
      startBeat: b,
      durationBeats: 0.15,
      velocity: 0.6
    });
    drumNotes.push({
      id: `dh-sub2-${b}`,
      pitch: 'E3',
      startBeat: b + 0.5,
      durationBeats: 0.15,
      velocity: 0.6
    });
  }

  clips.push({
    id: 'clip-drums-main',
    trackId: 'track-drum-loops',
    name: 'House Tech Loop 01',
    startBeat: 0.0,
    durationBeats: 16.0,
    color: '#a855f7',
    notes: drumNotes
  });

  // --- 3. Synth Lead Clips (Pluck melody in A Minor Pentatonic) ---
  const leadNotes: Note[] = [
    { id: 'l1', pitch: 'E4', startBeat: 0.0, durationBeats: 0.5, velocity: 0.8 },
    { id: 'l2', pitch: 'G4', startBeat: 0.5, durationBeats: 0.5, velocity: 0.8 },
    { id: 'l3', pitch: 'A4', startBeat: 1.0, durationBeats: 1.0, velocity: 0.9 },
    { id: 'l4', pitch: 'C5', startBeat: 2.5, durationBeats: 0.5, velocity: 0.8 },
    { id: 'l5', pitch: 'A4', startBeat: 3.0, durationBeats: 1.0, velocity: 0.85 },
    
    { id: 'l6', pitch: 'E4', startBeat: 4.0, durationBeats: 0.5, velocity: 0.8 },
    { id: 'l7', pitch: 'G4', startBeat: 4.5, durationBeats: 0.5, velocity: 0.8 },
    { id: 'l8', pitch: 'A4', startBeat: 5.0, durationBeats: 1.0, velocity: 0.9 },
    { id: 'l9', pitch: 'D5', startBeat: 6.5, durationBeats: 0.5, velocity: 0.85 },
    { id: 'l10', pitch: 'C5', startBeat: 7.0, durationBeats: 1.0, velocity: 0.8 },

    { id: 'l11', pitch: 'E4', startBeat: 8.0, durationBeats: 0.5, velocity: 0.8 },
    { id: 'l12', pitch: 'G4', startBeat: 8.5, durationBeats: 0.5, velocity: 0.8 },
    { id: 'l13', pitch: 'A4', startBeat: 9.0, durationBeats: 1.0, velocity: 0.9 },
    { id: 'l14', pitch: 'C5', startBeat: 10.5, durationBeats: 0.5, velocity: 0.8 },
    { id: 'l15', pitch: 'D5', startBeat: 11.0, durationBeats: 1.0, velocity: 0.9 },

    { id: 'l16', pitch: 'E5', startBeat: 12.0, durationBeats: 0.75, velocity: 1.0 },
    { id: 'l17', pitch: 'D5', startBeat: 12.75, durationBeats: 0.75, velocity: 0.9 },
    { id: 'l18', pitch: 'C5', startBeat: 13.5, durationBeats: 1.0, velocity: 0.85 },
    { id: 'l19', pitch: 'A4', startBeat: 14.5, durationBeats: 1.5, velocity: 0.8 }
  ];
  clips.push({
    id: 'clip-lead-main',
    trackId: 'track-synth-lead',
    name: 'Analog Pluck Melody',
    startBeat: 0.0,
    durationBeats: 16.0,
    color: '#06b6d4',
    notes: leadNotes
  });

  // --- 4. Airy Synth (Chords/Pads supporting the groove) ---
  const padNotes: Note[] = [
    { id: 'p1', pitch: 'C4', startBeat: 0.0, durationBeats: 4.0, velocity: 0.7 },
    { id: 'p2', pitch: 'E4', startBeat: 0.0, durationBeats: 4.0, velocity: 0.7 },
    { id: 'p3', pitch: 'G4', startBeat: 0.0, durationBeats: 4.0, velocity: 0.7 },
    
    { id: 'p4', pitch: 'B3', startBeat: 4.0, durationBeats: 4.0, velocity: 0.7 },
    { id: 'p5', pitch: 'D4', startBeat: 4.0, durationBeats: 4.0, velocity: 0.7 },
    { id: 'p6', pitch: 'G4', startBeat: 4.0, durationBeats: 4.0, velocity: 0.7 },

    { id: 'p7', pitch: 'C4', startBeat: 8.0, durationBeats: 4.0, velocity: 0.7 },
    { id: 'p8', pitch: 'E4', startBeat: 8.0, durationBeats: 4.0, velocity: 0.7 },
    { id: 'p9', pitch: 'A4', startBeat: 8.0, durationBeats: 4.0, velocity: 0.7 },

    { id: 'p10', pitch: 'C4', startBeat: 12.0, durationBeats: 4.0, velocity: 0.7 },
    { id: 'p11', pitch: 'F4', startBeat: 12.0, durationBeats: 4.0, velocity: 0.7 },
    { id: 'p12', pitch: 'A4', startBeat: 12.0, durationBeats: 4.0, velocity: 0.7 }
  ];
  clips.push({
    id: 'clip-pad-main',
    trackId: 'track-airy-synth',
    name: 'Ambient Warm Pad',
    startBeat: 0.0,
    durationBeats: 16.0,
    color: '#14b8a6',
    notes: padNotes
  });

  // --- 5. Vocal Shouts Clips ("Hey" vocal hits on upbeat transition) ---
  const vocalNotes: Note[] = [
    { id: 'v1', pitch: 'C4', startBeat: 3.5, durationBeats: 0.5, velocity: 0.9 },
    { id: 'v2', pitch: 'C4', startBeat: 7.5, durationBeats: 0.5, velocity: 0.9 },
    { id: 'v3', pitch: 'C4', startBeat: 11.5, durationBeats: 0.5, velocity: 0.9 },
    { id: 'v4', pitch: 'C4', startBeat: 15.5, durationBeats: 0.5, velocity: 0.9 }
  ];
  clips.push({
    id: 'clip-vocal-main',
    trackId: 'track-vocal-shouts',
    name: 'Uptempo Vocal Hey',
    startBeat: 0.0,
    durationBeats: 16.0,
    color: '#3b82f6',
    notes: vocalNotes
  });

  // --- 6. Punch Bass Clips (Short FM Pluck bass hits) ---
  const punchBassNotes: Note[] = [
    { id: 'pb1', pitch: 'E2', startBeat: 2.0, durationBeats: 0.5, velocity: 1.0 },
    { id: 'pb2', pitch: 'E2', startBeat: 2.5, durationBeats: 0.5, velocity: 1.0 },
    { id: 'pb3', pitch: 'E2', startBeat: 6.0, durationBeats: 0.5, velocity: 1.0 },
    { id: 'pb4', pitch: 'E2', startBeat: 6.5, durationBeats: 0.5, velocity: 1.0 },
    { id: 'pb5', pitch: 'A2', startBeat: 10.0, durationBeats: 0.5, velocity: 1.0 },
    { id: 'pb6', pitch: 'A2', startBeat: 10.5, durationBeats: 0.5, velocity: 1.0 },
    { id: 'pb7', pitch: 'G2', startBeat: 14.0, durationBeats: 0.5, velocity: 1.0 },
    { id: 'pb8', pitch: 'G2', startBeat: 14.5, durationBeats: 0.5, velocity: 1.0 }
  ];
  clips.push({
    id: 'clip-punch-main',
    trackId: 'track-punch-bass',
    name: 'FM Punch Bass',
    startBeat: 0.0,
    durationBeats: 16.0,
    color: '#ec4899',
    notes: punchBassNotes
  });

  return clips;
};

export const INITIAL_FX: MasterFX = {
  eq: {
    enabled: true,
    low: 3.5, // slightly boost sub-bass (dB)
    mid: -1.0, // scoop middle frequencies
    high: 2.0 // crisp highs
  },
  compressor: {
    enabled: true,
    threshold: -14, // dB
    ratio: 4.0,
    attack: 0.02, // sec
    release: 0.12, // sec
    makeup: 3 // dB gain make-up
  },
  limiter: {
    enabled: true,
    ceiling: -0.8, // dB
    release: 0.08 // sec
  },
  multiband: {
    enabled: true,
    lowBand: true,
    midBand: true,
    highBand: true
  }
};

// Preset samples for left Sidebar Sample Browser list
export const PRESET_SAMPLES = [
  { id: 's1', name: 'Rising Tension Beat', category: 'drums' as const, duration: '4B', bpm: 89, color: '#3b82f6' },
  { id: 's2', name: 'Rough Night Beat', category: 'drums' as const, duration: '2B', bpm: 139, color: '#3b82f6' },
  { id: 's3', name: 'Slice and Dice Beat', category: 'drums' as const, duration: '4B', bpm: 98, color: '#3b82f6' },
  { id: 's4', name: 'Slow Flow Beat', category: 'drums' as const, duration: '4B', bpm: 86, color: '#10b981' },
  { id: 's5', name: 'Meta Mind Snare Fill', category: 'drums' as const, duration: '2B', bpm: 132, color: '#3b82f6' },
  { id: 's6', name: 'Mystery Science Beat', category: 'drums' as const, duration: '2B', bpm: 94, color: '#f59e0b' },
  { id: 's7', name: 'Staggering Sticks Beat 01', category: 'drums' as const, duration: '4B', bpm: 127, color: '#3b82f6' },
  { id: 's8', name: 'Bubble Gum Beat', category: 'drums' as const, duration: '4B', bpm: 117, color: '#ec4899' },
  { id: 's9', name: 'Deep In It Beat 01', category: 'drums' as const, duration: '4B', bpm: 130, color: '#a855f7' },
  { id: 's10', name: 'Deep In It Beat 02', category: 'drums' as const, duration: '4B', bpm: 130, color: '#a855f7' },
  { id: 's11', name: 'Heavy Bass Drop Loop', category: 'bass' as const, duration: '4B', bpm: 120, color: '#10b981' },
  { id: 's12', name: 'Sub Octave Puncher', category: 'bass' as const, duration: '2B', bpm: 120, color: '#10b981' },
  { id: 's13', name: 'Cyberpunk Acid Synth', category: 'synth' as const, duration: '4B', bpm: 128, color: '#06b6d4' },
  { id: 's14', name: 'Celestial Pad Choir', category: 'synth' as const, duration: '8B', bpm: 120, color: '#14b8a6' },
  { id: 's15', name: 'Stellar Arp Run', category: 'synth' as const, duration: '2B', bpm: 128, color: '#eab308' },
  { id: 's16', name: 'Hyper Shout \"Hey!\"', category: 'vocals' as const, duration: '1B', bpm: 120, color: '#3b82f6' },
  { id: 's17', name: 'Glitch vocal rise', category: 'vocals' as const, duration: '2B', bpm: 120, color: '#ec4899' },
  { id: 's18', name: 'Cyber Sub-Drop FX', category: 'fx' as const, duration: '4B', bpm: 120, color: '#ef4444' }
];
