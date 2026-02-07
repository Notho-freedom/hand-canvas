export interface MadoxObject {
  id: string;
  x: number;
  y: number;
  radius: number;
  depth: number;
  color: string;
  glowColor: string;
  grabbed: boolean;
  grabbedByHand: number | null;
  vx: number;
  vy: number;
}

export interface HandData {
  landmarks: { x: number; y: number; z: number }[];
  indexTip: { x: number; y: number; z: number };
  thumbTip: { x: number; y: number; z: number };
  pinchDistance: number;
  isPinching: boolean;
  isGrabbing: boolean;
  depth: number;
  grabbedObjectId: string | null;
}

export const NEON_COLORS = [
  { fill: 'hsl(180, 100%, 50%)', glow: 'hsla(180, 100%, 50%, 0.6)' },   // cyan
  { fill: 'hsl(300, 100%, 60%)', glow: 'hsla(300, 100%, 60%, 0.6)' },   // magenta
  { fill: 'hsl(90, 100%, 50%)', glow: 'hsla(90, 100%, 50%, 0.6)' },     // lime
  { fill: 'hsl(30, 100%, 55%)', glow: 'hsla(30, 100%, 55%, 0.6)' },     // orange
  { fill: 'hsl(270, 100%, 65%)', glow: 'hsla(270, 100%, 65%, 0.6)' },   // purple
  { fill: 'hsl(330, 100%, 60%)', glow: 'hsla(330, 100%, 60%, 0.6)' },   // pink
];

export const PINCH_THRESHOLD = 0.08;
export const PINCH_RELEASE_THRESHOLD = 0.1;
export const GRIP_CLOSE_THRESHOLD = 0.09;
export const GRIP_OPEN_THRESHOLD = 0.12;
export const GRAB_RADIUS = 60;
export const SMOOTHING_FACTOR = 0.35;
export const DEPTH_Z_MIN = -0.3;
export const DEPTH_Z_MAX = 0.3;
export const DEPTH_GRAB_THRESHOLD = 0.18;
export const DEPTH_SCALE_MIN = 0.65;
export const DEPTH_SCALE_MAX = 1.45;
