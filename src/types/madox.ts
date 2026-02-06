export interface MadoxObject {
  id: string;
  x: number;
  y: number;
  radius: number;
  color: string;
  glowColor: string;
  grabbed: boolean;
  grabbedByHand: number | null;
  vx: number;
  vy: number;
}

export interface HandData {
  landmarks: { x: number; y: number; z: number }[];
  indexTip: { x: number; y: number };
  thumbTip: { x: number; y: number };
  pinchDistance: number;
  isPinching: boolean;
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

export const PINCH_THRESHOLD = 0.06;
export const GRAB_RADIUS = 60;
export const SMOOTHING_FACTOR = 0.35;
