import { useRef, useEffect, useCallback, useState } from 'react';
import type { HandData, MadoxObject } from '@/types/madox';
import { 
  DEPTH_GRAB_THRESHOLD, 
  DEPTH_SCALE_MAX, 
  DEPTH_SCALE_MIN, 
  GRAB_RADIUS 
} from '@/types/madox';

interface MadoxCanvasProps {
  hands: HandData[];
  getObjects: () => MadoxObject[];
  updateObjects: (updater: (objs: MadoxObject[]) => MadoxObject[]) => void;
  onHandsUpdate: (hands: HandData[]) => void;
  handsRef: React.MutableRefObject<HandData[]>;
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
  hands, 
  getObjects, 
  updateObjects, 
  onHandsUpdate, 
  handsRef 
}: MadoxCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fpsRef = useRef({ frames: 0, lastTime: performance.now(), fps: 0 });
  const lastUpdateRef = useRef<number>(0);
  const UPDATE_INTERVAL = 1000 / 30;

  const depthToScale = useCallback((depth: number) => {
    return DEPTH_SCALE_MIN + (DEPTH_SCALE_MAX - DEPTH_SCALE_MIN) * depth;
  }, []);
  
  // État pour le debug
  const [debugInfo, setDebugInfo] = useState<{
    handPos: {x: number, y: number} | null;
    handDepth: number | null;
    nearestObj: {x: number, y: number, dist: number} | null;
  }>({ handPos: null, handDepth: null, nearestObj: null });

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;

    // Clear
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
    const currentHands = handsRef.current;
    const updatedHands = [...currentHands];
    const newObjects = objects.map(obj => ({ ...obj }));

    let debugHandPos: {x: number, y: number} | null = null;
    let debugHandDepth: number | null = null;
    let debugNearestObj: {x: number, y: number, dist: number} | null = null;

    // INTERACTION LOGIC
    updatedHands.forEach((hand, handIdx) => {
      // IMPORTANT: Les coordonnées sont déjà normalisées (0-1) et mirroirées dans le hook
      const hx = hand.indexTip.x * W;
      const hy = hand.indexTip.y * H;
      const handDepth = hand.depth;
      
      if (handIdx === 0) {
        debugHandPos = { x: hx, y: hy };
        debugHandDepth = handDepth;
      }

      const isGrabbingGesture = hand.isPinching || hand.isGrabbing;

      if (isGrabbingGesture) {
        // Already grabbing?
        if (hand.grabbedObjectId) {
          const obj = newObjects.find(o => o.id === hand.grabbedObjectId);
          if (obj) {
            obj.vx = hx - obj.x;
            obj.vy = hy - obj.y;
            obj.x = hx;
            obj.y = hy;
            obj.depth = handDepth;
            obj.grabbed = true;
            obj.grabbedByHand = handIdx;
          }
        } else {
          // Try to grab nearest object
          let nearest: MadoxObject | null = null;
          let minDist = GRAB_RADIUS;
          
          for (const obj of newObjects) {
            if (obj.grabbed) continue;
            if (Math.abs(obj.depth - handDepth) > DEPTH_GRAB_THRESHOLD) continue;
            const dx = hx - obj.x;
            const dy = hy - obj.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist < minDist) {
              minDist = dist;
              nearest = obj;
              
              if (handIdx === 0) {
                debugNearestObj = { x: obj.x, y: obj.y, dist };
              }
            }
          }
          
          if (nearest) {
            nearest.grabbed = true;
            nearest.grabbedByHand = handIdx;
            updatedHands[handIdx] = { ...hand, grabbedObjectId: nearest.id };
            console.log(`✨ GRABBED! Hand ${handIdx} grabbed object ${nearest.id}`);
          }
        }
      } else {
        // Release
        if (hand.grabbedObjectId) {
          const obj = newObjects.find(o => o.id === hand.grabbedObjectId);
          if (obj) {
            obj.grabbed = false;
            obj.grabbedByHand = null;
            console.log(`🔄 RELEASED! Hand ${handIdx} released object ${obj.id}`);
          }
          updatedHands[handIdx] = { ...hand, grabbedObjectId: null };
        }
      }
    });

    // Mettre à jour le debug info
    if (debugHandPos) {
      setDebugInfo({ handPos: debugHandPos, handDepth: debugHandDepth, nearestObj: debugNearestObj });
    }

    // PHYSICS
    for (const obj of newObjects) {
      const depthScale = depthToScale(obj.depth);
      const displayRadius = obj.radius * depthScale;
      if (!obj.grabbed) {
        obj.x += obj.vx;
        obj.y += obj.vy;
        obj.vx *= 0.92;
        obj.vy *= 0.92;

        // Bounce off walls
        if (obj.x - displayRadius < 0) { obj.x = displayRadius; obj.vx = Math.abs(obj.vx) * 0.5; }
        if (obj.x + displayRadius > W) { obj.x = W - displayRadius; obj.vx = -Math.abs(obj.vx) * 0.5; }
        if (obj.y - displayRadius < 0) { obj.y = displayRadius; obj.vy = Math.abs(obj.vy) * 0.5; }
        if (obj.y + displayRadius > H) { obj.y = H - displayRadius; obj.vy = -Math.abs(obj.vy) * 0.5; }

        if (Math.abs(obj.vx) < 0.1) obj.vx = 0;
        if (Math.abs(obj.vy) < 0.1) obj.vy = 0;
      }
    }

    // UPDATE STATE
    updateObjects(() => newObjects);
    handsRef.current = updatedHands;
    
    const now = performance.now();
    if (onHandsUpdate && now - lastUpdateRef.current > UPDATE_INTERVAL) {
      onHandsUpdate(updatedHands);
      lastUpdateRef.current = now;
    }

    // DRAW OBJECTS
    const sortedObjects = [...newObjects].sort((a, b) => a.depth - b.depth);
    for (const obj of sortedObjects) {
      ctx.save();
      const depthScale = depthToScale(obj.depth);
      const depthRadius = obj.radius * depthScale;

      // Find if any hand is close (highlight)
      let isNear = false;
      for (const hand of currentHands) {
        const hx = hand.indexTip.x * W;
        const hy = hand.indexTip.y * H;
        if (Math.abs(obj.depth - hand.depth) > DEPTH_GRAB_THRESHOLD) {
          continue;
        }
        const dx = hx - obj.x;
        const dy = hy - obj.y;
        if (Math.sqrt(dx * dx + dy * dy) < GRAB_RADIUS * 1.5) {
          isNear = true;
          break;
        }
      }

      // Glow
      const glowRadius = obj.grabbed ? depthRadius * 2.5 : isNear ? depthRadius * 2 : depthRadius * 1.5;
      const gradient = ctx.createRadialGradient(obj.x, obj.y, 0, obj.x, obj.y, glowRadius);
      gradient.addColorStop(0, obj.glowColor);
      gradient.addColorStop(1, 'transparent');
      ctx.fillStyle = gradient;
      ctx.fillRect(obj.x - glowRadius, obj.y - glowRadius, glowRadius * 2, glowRadius * 2);

      // Ball
      const displayRadius = obj.grabbed ? depthRadius * 1.2 : depthRadius;
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

    // DEBUG: Draw grab radius and connections
    for (const hand of currentHands) {
      const hx = hand.indexTip.x * W;
      const hy = hand.indexTip.y * H;
      
      // Grab radius circle (jaune)
      ctx.beginPath();
      ctx.arc(hx, hy, GRAB_RADIUS, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255, 255, 0, 0.3)';
      ctx.lineWidth = 1;
      ctx.stroke();
      
      // Main hand skeleton
      const landmarks = hand.landmarks;
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
      ctx.strokeStyle = hand.isPinching || hand.isGrabbing ? 'hsl(300, 100%, 60%)' : 'hsla(180, 100%, 50%, 0.5)';
      ctx.lineWidth = hand.isPinching ? 2.5 : 1.5;
      ctx.shadowBlur = hand.isPinching || hand.isGrabbing ? 15 : 5;
      ctx.shadowColor = hand.isPinching || hand.isGrabbing ? 'hsl(300, 100%, 60%)' : 'hsl(180, 100%, 50%)';
      ctx.stroke();
      ctx.shadowBlur = 0;
      
      // Red dot at index tip (for precise position)
      ctx.beginPath();
      ctx.arc(hx, hy, 6, 0, Math.PI * 2);
      ctx.fillStyle = hand.isPinching || hand.isGrabbing ? 'rgba(255, 0, 255, 0.8)' : 'rgba(255, 0, 0, 0.8)';
      ctx.fill();
      
      // Distance to nearest object text
      if (debugNearestObj) {
        ctx.fillStyle = 'white';
        ctx.font = '14px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`${Math.round(debugNearestObj.dist)}px`, hx, hy - 25);
      }
    }

    // FPS counter with debug info
    fpsRef.current.frames++;
    const nowTime = performance.now();
    if (nowTime - fpsRef.current.lastTime >= 1000) {
      fpsRef.current.fps = fpsRef.current.frames;
      fpsRef.current.frames = 0;
      fpsRef.current.lastTime = nowTime;
    }

    ctx.fillStyle = 'hsla(0, 0%, 80%, 0.8)';
    ctx.font = '14px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`${fpsRef.current.fps} FPS`, W - 20, 30);
    ctx.fillText(`${newObjects.length} objects`, W - 20, 50);
    ctx.fillText(`${currentHands.length} hand${currentHands.length !== 1 ? 's' : ''}`, W - 20, 70);
    
    // Debug info
    if (debugInfo.handPos) {
      ctx.textAlign = 'left';
      ctx.fillText(`Hand: (${Math.round(debugInfo.handPos.x)}, ${Math.round(debugInfo.handPos.y)})`, 20, 30);
      if (debugInfo.handDepth !== null) {
        ctx.fillText(`Depth: ${debugInfo.handDepth.toFixed(2)}`, 20, 45);
      }
      if (debugInfo.nearestObj) {
        ctx.fillText(`Nearest: ${Math.round(debugInfo.nearestObj.dist)}px`, 20, 65);
      }
    }
  }, [depthToScale, getObjects, updateObjects, onHandsUpdate, handsRef]);

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
    <>
      <canvas
        ref={canvasRef}
        className="fixed inset-0 w-full h-full"
        style={{ touchAction: 'none' }}
      />
      {/* Overlay debug */}
      <div className="fixed top-4 left-4 bg-black/70 text-white p-3 rounded text-sm font-mono">
        <div>Debug Info:</div>
        {debugInfo.handPos && (
          <>
            <div>Hand: ({Math.round(debugInfo.handPos.x)}, {Math.round(debugInfo.handPos.y)})</div>
            {debugInfo.handDepth !== null && (
              <div>Depth: {debugInfo.handDepth.toFixed(2)}</div>
            )}
            {debugInfo.nearestObj && (
              <div>Distance: {Math.round(debugInfo.nearestObj.dist)}px</div>
            )}
          </>
        )}
        <div className="mt-2 text-xs">
          <div>• Cercle jaune = zone de grab ({GRAB_RADIUS}px)</div>
          <div>• Point rouge = position index</div>
          <div>• Cercle magenta = pinch détecté</div>
        </div>
      </div>
    </>
  );
}
