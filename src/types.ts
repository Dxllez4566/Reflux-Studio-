export interface Note {
  id: string;
  pitch: string; // e.g. "C4", "D#4", "G3"
  startBeat: number; // grid position (e.g. 0, 0.25, 1.5)
  durationBeats: number; // e.g. 1 (quarter note), 0.25 (16th note)
  velocity: number; // 0 to 1
}

export interface Clip {
  id: string;
  trackId: string;
  name: string;
  startBeat: number;
  durationBeats: number;
  color: string;
  notes: Note[]; // Used for synth and drum tracks
  audioUrl?: string; // Used for sampler tracks if loaded with an audio file
  sampleName?: string; // Reference to a loaded/preset sample
}

export type TrackType = 'synth' | 'drum' | 'sampler';

export interface AutomationPoint {
  id: string;
  beat: number; // timeline position (0 to 64 beats)
  value: number; // normalized value (0.0 to 1.0)
}

export interface AutomationLane {
  id: string;
  trackId: string;
  parameter: 'volume' | 'filterCutoff' | 'pan';
  points: AutomationPoint[];
  enabled: boolean;
}

export interface Track {
  id: string;
  name: string;
  type: TrackType;
  volume: number; // 0 to 1.5
  mute: boolean;
  solo: boolean;
  color: string; // hex or tailwind color
  iconName: string; // e.g. "guitar", "music", "drum"
  pan: number; // -1 (left) to 1 (right)
  automationLanes?: AutomationLane[];
}

export interface SavedProject {
  id: string;
  name: string;
  bpm: number;
  tracks: Track[];
  clips: Clip[];
  createdAt: string;
}

export interface EQState {
  enabled: boolean;
  low: number; // dB (-12 to 12)
  mid: number; // dB (-12 to 12)
  high: number; // dB (-12 to 12)
}

export interface CompressorState {
  enabled: boolean;
  threshold: number; // dB (-60 to 0)
  ratio: number; // 1 to 20
  attack: number; // ms (0.01 to 0.1)
  release: number; // ms (0.01 to 1)
  makeup: number; // dB (0 to 12)
}

export interface LimiterState {
  enabled: boolean;
  ceiling: number; // dB (-12 to 0)
  release: number; // ms (0.01 to 0.5)
}

export interface MultibandState {
  enabled: boolean;
  lowBand: boolean;
  midBand: boolean;
  highBand: boolean;
}

export interface MasterFX {
  eq: EQState;
  compressor: CompressorState;
  limiter: LimiterState;
  multiband: MultibandState;
}

export interface SampleItem {
  id: string;
  name: string;
  category: 'drums' | 'bass' | 'synth' | 'vocals' | 'fx';
  duration: string; // e.g. "4B", "2B"
  bpm: number;
  color: string;
}
