export type WidgetType = 'clock' | 'notes' | 'info' | 'counter' | 'image' | 'colors';

export interface MadoxWidget {
  id: string;
  type: WidgetType;
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  scale: number;
  zIndex: number;
  grabbed: boolean;
  grabbedByHand: number | null;
  selected: boolean;
  minimized: boolean;
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
  grabbedWidgetId: string | null;
}

export const WIDGET_DEFAULTS: Record<WidgetType, { width: number; height: number; title: string }> = {
  clock:   { width: 220, height: 120, title: 'Horloge' },
  notes:   { width: 260, height: 200, title: 'Notes' },
  info:    { width: 240, height: 160, title: 'Infos système' },
  counter: { width: 200, height: 140, title: 'Compteur' },
  image:   { width: 240, height: 200, title: 'Image' },
  colors:  { width: 200, height: 180, title: 'Palette' },
};

export const NEON_COLORS = [
  { fill: 'hsl(180, 100%, 50%)', glow: 'hsla(180, 100%, 50%, 0.6)' },
  { fill: 'hsl(300, 100%, 60%)', glow: 'hsla(300, 100%, 60%, 0.6)' },
  { fill: 'hsl(90, 100%, 50%)',  glow: 'hsla(90, 100%, 50%, 0.6)' },
  { fill: 'hsl(30, 100%, 55%)',  glow: 'hsla(30, 100%, 55%, 0.6)' },
  { fill: 'hsl(270, 100%, 65%)', glow: 'hsla(270, 100%, 65%, 0.6)' },
  { fill: 'hsl(330, 100%, 60%)', glow: 'hsla(330, 100%, 60%, 0.6)' },
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
