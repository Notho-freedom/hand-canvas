import { useRef, useEffect, useCallback } from 'react';
import type { HandData, MadoxWidget } from '@/types/madox';

interface MadoxCanvasProps {
  handsRef: React.MutableRefObject<HandData[]>;
  getWidgets: () => MadoxWidget[];
  updateWidgets: (updater: (widgets: MadoxWidget[]) => MadoxWidget[]) => void;
  onHandsUpdate: (hands: HandData[]) => void;
  processInteractions: (
    hands: HandData[],
    widgets: MadoxWidget[],
    canvasWidth: number,
    canvasHeight: number,
  ) => { updatedWidgets: MadoxWidget[]; updatedHands: HandData[] };
}

const HAND_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [0, 9], [9, 10], [10, 11], [11, 12],
  [0, 13], [13, 14], [14, 15], [15, 16],
  [0, 17], [17, 18], [18, 19], [19, 20],
  [5, 9], [9, 13], [13, 17],
];

export default function MadoxCanvas({
  handsRef,
  getWidgets,
  updateWidgets,
  onHandsUpdate,
  processInteractions,
}: MadoxCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fpsRef = useRef({ frames: 0, lastTime: performance.now(), fps: 0 });
  const lastUIUpdateRef = useRef<number>(0);
  const UI_UPDATE_INTERVAL = 1000 / 30;

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;

    // Clear with dark bg
    ctx.fillStyle = 'hsl(240, 15%, 3%)';
    ctx.fillRect(0, 0, W, H);

    // Grid
    ctx.strokeStyle = 'hsla(240, 10%, 10%, 0.5)';
    ctx.lineWidth = 0.5;
    const gridSize = 60;
    for (let x = 0; x < W; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
    for (let y = 0; y < H; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }

    // Process hand-widget interactions
    const currentHands = handsRef.current;
    const widgets = getWidgets();
    const { updatedWidgets, updatedHands } = processInteractions(currentHands, widgets, W, H);

    // Update state
    updateWidgets(() => updatedWidgets);
    handsRef.current = updatedHands;

    const now = performance.now();
    if (now - lastUIUpdateRef.current > UI_UPDATE_INTERVAL) {
      onHandsUpdate(updatedHands);
      lastUIUpdateRef.current = now;
    }

    // Draw hands
    for (const hand of currentHands) {
      const landmarks = hand.landmarks;
      if (!landmarks || landmarks.length < 21) continue;

      // Connections
      ctx.strokeStyle = 'hsla(180, 100%, 50%, 0.3)';
      ctx.lineWidth = 1.5;
      for (const [a, b] of HAND_CONNECTIONS) {
        ctx.beginPath();
        ctx.moveTo(landmarks[a].x * W, landmarks[a].y * H);
        ctx.lineTo(landmarks[b].x * W, landmarks[b].y * H);
        ctx.stroke();
      }

      // Landmark points
      for (let i = 0; i < landmarks.length; i++) {
        const lx = landmarks[i].x * W;
        const ly = landmarks[i].y * H;
        const isFingerTip = [4, 8, 12, 16, 20].includes(i);

        ctx.beginPath();
        ctx.arc(lx, ly, isFingerTip ? 5 : 3, 0, Math.PI * 2);
        ctx.fillStyle = isFingerTip ? 'hsl(180, 100%, 60%)' : 'hsl(180, 100%, 40%)';
        ctx.shadowBlur = isFingerTip ? 12 : 6;
        ctx.shadowColor = 'hsl(180, 100%, 50%)';
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // Pinch indicator
      const tx = hand.thumbTip.x * W;
      const ty = hand.thumbTip.y * H;
      const ix = hand.indexTip.x * W;
      const iy = hand.indexTip.y * H;
      const midX = (tx + ix) / 2;
      const midY = (ty + iy) / 2;
      const pinchVisualRadius = hand.pinchDistance * W * 0.5;

      ctx.beginPath();
      ctx.arc(midX, midY, Math.max(4, pinchVisualRadius), 0, Math.PI * 2);
      ctx.strokeStyle = hand.isPinching || hand.isGrabbing
        ? 'hsl(300, 100%, 60%)'
        : 'hsla(180, 100%, 50%, 0.5)';
      ctx.lineWidth = hand.isPinching ? 2.5 : 1.5;
      ctx.shadowBlur = hand.isPinching || hand.isGrabbing ? 15 : 5;
      ctx.shadowColor = hand.isPinching || hand.isGrabbing
        ? 'hsl(300, 100%, 60%)'
        : 'hsl(180, 100%, 50%)';
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Index tip cursor
      const hx = hand.indexTip.x * W;
      const hy = hand.indexTip.y * H;
      ctx.beginPath();
      ctx.arc(hx, hy, 6, 0, Math.PI * 2);
      ctx.fillStyle = hand.isPinching || hand.isGrabbing
        ? 'hsla(300, 100%, 60%, 0.8)'
        : 'hsla(180, 100%, 50%, 0.8)';
      ctx.shadowBlur = 10;
      ctx.shadowColor = hand.isPinching ? 'hsl(300, 100%, 60%)' : 'hsl(180, 100%, 50%)';
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // FPS
    fpsRef.current.frames++;
    const nowTime = performance.now();
    if (nowTime - fpsRef.current.lastTime >= 1000) {
      fpsRef.current.fps = fpsRef.current.frames;
      fpsRef.current.frames = 0;
      fpsRef.current.lastTime = nowTime;
    }

    ctx.fillStyle = 'hsla(0, 0%, 80%, 0.8)';
    ctx.font = '12px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`${fpsRef.current.fps} FPS`, W - 16, 24);
  }, [handsRef, getWidgets, updateWidgets, onHandsUpdate, processInteractions]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    let rafId: number;
    const loop = () => {
      render();
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(rafId);
    };
  }, [render]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full"
      style={{ touchAction: 'none', zIndex: 0 }}
    />
  );
}
