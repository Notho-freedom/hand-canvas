import { useRef, useEffect, useCallback } from 'react';
import type { HandData, MadoxObject } from '@/types/madox';
import { GRAB_RADIUS } from '@/types/madox';

interface MadoxCanvasProps {
  hands: HandData[];
  getObjects: () => MadoxObject[];
  updateObjects: (updater: (objs: MadoxObject[]) => MadoxObject[]) => void;
  onHandsUpdate: (hands: HandData[]) => void;
}

// Hand skeleton connections (MediaPipe indices)
const HAND_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4],       // thumb
  [0, 5], [5, 6], [6, 7], [7, 8],       // index
  [0, 9], [9, 10], [10, 11], [11, 12],  // middle
  [0, 13], [13, 14], [14, 15], [15, 16],// ring
  [0, 17], [17, 18], [18, 19], [19, 20],// pinky
  [5, 9], [9, 13], [13, 17],            // palm
];

export default function MadoxCanvas({ hands, getObjects, updateObjects, onHandsUpdate }: MadoxCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fpsRef = useRef({ frames: 0, lastTime: performance.now(), fps: 0 });

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;

    // -- Background with subtle grid
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

    const objects = getObjects();

    // -- Interaction logic: pinch grab/release
    const updatedHands = [...hands];
    const newObjects = objects.map(obj => ({ ...obj }));

    updatedHands.forEach((hand, handIdx) => {
      const hx = hand.indexTip.x * W;
      const hy = hand.indexTip.y * H;

      if (hand.isPinching) {
        // Already grabbing?
        if (hand.grabbedObjectId) {
          const obj = newObjects.find(o => o.id === hand.grabbedObjectId);
          if (obj) {
            obj.vx = hx - obj.x;
            obj.vy = hy - obj.y;
            obj.x = hx;
            obj.y = hy;
            obj.grabbed = true;
            obj.grabbedByHand = handIdx;
          }
        } else {
          // Try to grab nearest object
          let nearest: MadoxObject | null = null;
          let minDist = GRAB_RADIUS;
          for (const obj of newObjects) {
            if (obj.grabbed) continue;
            const dx = hx - obj.x;
            const dy = hy - obj.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < minDist) {
              minDist = dist;
              nearest = obj;
            }
          }
          if (nearest) {
            nearest.grabbed = true;
            nearest.grabbedByHand = handIdx;
            updatedHands[handIdx] = { ...hand, grabbedObjectId: nearest.id };
          }
        }
      } else {
        // Release
        if (hand.grabbedObjectId) {
          const obj = newObjects.find(o => o.id === hand.grabbedObjectId);
          if (obj) {
            obj.grabbed = false;
            obj.grabbedByHand = null;
            // Keep velocity for inertia
          }
          updatedHands[handIdx] = { ...hand, grabbedObjectId: null };
        }
      }
    });

    // Physics: apply friction to free objects
    for (const obj of newObjects) {
      if (!obj.grabbed) {
        obj.x += obj.vx;
        obj.y += obj.vy;
        obj.vx *= 0.92;
        obj.vy *= 0.92;

        // Bounce off walls
        if (obj.x - obj.radius < 0) { obj.x = obj.radius; obj.vx = Math.abs(obj.vx) * 0.5; }
        if (obj.x + obj.radius > W) { obj.x = W - obj.radius; obj.vx = -Math.abs(obj.vx) * 0.5; }
        if (obj.y - obj.radius < 0) { obj.y = obj.radius; obj.vy = Math.abs(obj.vy) * 0.5; }
        if (obj.y + obj.radius > H) { obj.y = H - obj.radius; obj.vy = -Math.abs(obj.vy) * 0.5; }

        // Stop if very slow
        if (Math.abs(obj.vx) < 0.1) obj.vx = 0;
        if (Math.abs(obj.vy) < 0.1) obj.vy = 0;
      }
    }

    updateObjects(() => newObjects);
    onHandsUpdate(updatedHands);

    // -- Draw objects
    for (const obj of newObjects) {
      ctx.save();

      // Find if any hand is close (highlight)
      let isNear = false;
      for (const hand of hands) {
        const hx = hand.indexTip.x * W;
        const hy = hand.indexTip.y * H;
        const dx = hx - obj.x;
        const dy = hy - obj.y;
        if (Math.sqrt(dx * dx + dy * dy) < GRAB_RADIUS) {
          isNear = true;
          break;
        }
      }

      // Glow effect
      const glowRadius = obj.grabbed ? obj.radius * 2.5 : isNear ? obj.radius * 2 : obj.radius * 1.5;
      const gradient = ctx.createRadialGradient(obj.x, obj.y, 0, obj.x, obj.y, glowRadius);
      gradient.addColorStop(0, obj.glowColor);
      gradient.addColorStop(1, 'transparent');
      ctx.fillStyle = gradient;
      ctx.fillRect(obj.x - glowRadius, obj.y - glowRadius, glowRadius * 2, glowRadius * 2);

      // Ball
      const displayRadius = obj.grabbed ? obj.radius * 1.2 : obj.radius;
      ctx.beginPath();
      ctx.arc(obj.x, obj.y, displayRadius, 0, Math.PI * 2);
      ctx.fillStyle = obj.color;
      ctx.shadowBlur = obj.grabbed ? 30 : isNear ? 20 : 10;
      ctx.shadowColor = obj.glowColor;
      ctx.fill();
      ctx.shadowBlur = 0;

      // Inner highlight
      const innerGrad = ctx.createRadialGradient(
        obj.x - displayRadius * 0.3, obj.y - displayRadius * 0.3, 0,
        obj.x, obj.y, displayRadius
      );
      innerGrad.addColorStop(0, 'hsla(0, 0%, 100%, 0.4)');
      innerGrad.addColorStop(0.5, 'hsla(0, 0%, 100%, 0.05)');
      innerGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = innerGrad;
      ctx.fill();

      ctx.restore();
    }

    // -- Draw hands
    for (const hand of hands) {
      const landmarks = hand.landmarks;

      // Draw connections
      ctx.strokeStyle = 'hsla(180, 100%, 50%, 0.3)';
      ctx.lineWidth = 1.5;
      for (const [a, b] of HAND_CONNECTIONS) {
        ctx.beginPath();
        ctx.moveTo(landmarks[a].x * W, landmarks[a].y * H);
        ctx.lineTo(landmarks[b].x * W, landmarks[b].y * H);
        ctx.stroke();
      }

      // Draw landmark points
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

      // Pinch indicator between thumb and index
      const tx = hand.thumbTip.x * W;
      const ty = hand.thumbTip.y * H;
      const ix = hand.indexTip.x * W;
      const iy = hand.indexTip.y * H;
      const midX = (tx + ix) / 2;
      const midY = (ty + iy) / 2;
      const pinchVisualRadius = hand.pinchDistance * W * 0.5;

      ctx.beginPath();
      ctx.arc(midX, midY, Math.max(4, pinchVisualRadius), 0, Math.PI * 2);
      ctx.strokeStyle = hand.isPinching ? 'hsl(300, 100%, 60%)' : 'hsla(180, 100%, 50%, 0.5)';
      ctx.lineWidth = hand.isPinching ? 2.5 : 1.5;
      ctx.shadowBlur = hand.isPinching ? 15 : 5;
      ctx.shadowColor = hand.isPinching ? 'hsl(300, 100%, 60%)' : 'hsl(180, 100%, 50%)';
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // -- FPS counter
    fpsRef.current.frames++;
    const now = performance.now();
    if (now - fpsRef.current.lastTime >= 1000) {
      fpsRef.current.fps = fpsRef.current.frames;
      fpsRef.current.frames = 0;
      fpsRef.current.lastTime = now;
    }

    ctx.fillStyle = 'hsla(0, 0%, 60%, 0.6)';
    ctx.font = '12px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`${fpsRef.current.fps} FPS`, W - 16, 24);
    ctx.fillText(`${newObjects.length} objects`, W - 16, 40);
    ctx.fillText(`${hands.length} hand${hands.length !== 1 ? 's' : ''}`, W - 16, 56);
  }, [hands, getObjects, updateObjects, onHandsUpdate]);

  // Resize canvas & render loop
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
      style={{ touchAction: 'none' }}
    />
  );
}
