import { useCallback, useRef } from 'react';
import type { HandData, MadoxWidget } from '@/types/madox';

const FRICTION = 0.92;
const MIN_VELOCITY = 0.1;

export function useHandInteraction() {
  const lastUpdateRef = useRef<number>(0);

  const hitTest = useCallback((hx: number, hy: number, widgets: MadoxWidget[]): MadoxWidget | null => {
    // Test from highest zIndex to lowest
    const sorted = [...widgets].sort((a, b) => b.zIndex - a.zIndex);
    for (const w of sorted) {
      if (w.minimized) continue;
      const sw = w.width * w.scale;
      const sh = w.height * w.scale;
      if (hx >= w.x && hx <= w.x + sw && hy >= w.y && hy <= w.y + sh) {
        return w;
      }
    }
    return null;
  }, []);

  const processInteractions = useCallback((
    hands: HandData[],
    widgets: MadoxWidget[],
    canvasWidth: number,
    canvasHeight: number,
  ): { updatedWidgets: MadoxWidget[]; updatedHands: HandData[] } => {
    const newWidgets = widgets.map(w => ({ ...w, selected: false }));
    const updatedHands = hands.map(h => ({ ...h }));

    // Hand interaction
    updatedHands.forEach((hand, handIdx) => {
      const hx = hand.indexTip.x * canvasWidth;
      const hy = hand.indexTip.y * canvasHeight;
      const isGrabbingGesture = hand.isPinching || hand.isGrabbing;

      // Hover highlight
      const hovered = hitTest(hx, hy, newWidgets);
      if (hovered) {
        const w = newWidgets.find(w => w.id === hovered.id);
        if (w) w.selected = true;
      }

      if (isGrabbingGesture) {
        if (hand.grabbedWidgetId) {
          // Continue dragging
          const w = newWidgets.find(w => w.id === hand.grabbedWidgetId);
          if (w) {
            w.vx = hx - w.x - (w.width * w.scale) / 2;
            w.vy = hy - w.y - (w.height * w.scale) / 2;
            w.x = hx - (w.width * w.scale) / 2;
            w.y = hy - (w.height * w.scale) / 2;
            w.grabbed = true;
            w.grabbedByHand = handIdx;
            w.selected = true;
          }
        } else {
          // Try to grab
          const target = hitTest(hx, hy, newWidgets);
          if (target && !target.grabbed) {
            const w = newWidgets.find(w => w.id === target.id);
            if (w) {
              w.grabbed = true;
              w.grabbedByHand = handIdx;
              w.selected = true;
              // Bring to front
              const maxZ = Math.max(...newWidgets.map(ww => ww.zIndex));
              w.zIndex = maxZ + 1;
              updatedHands[handIdx] = { ...updatedHands[handIdx], grabbedWidgetId: w.id };
            }
          }
        }
      } else {
        // Release
        if (hand.grabbedWidgetId) {
          const w = newWidgets.find(w => w.id === hand.grabbedWidgetId);
          if (w) {
            w.grabbed = false;
            w.grabbedByHand = null;
          }
          updatedHands[handIdx] = { ...updatedHands[handIdx], grabbedWidgetId: null };
        }
      }
    });

    // Physics for non-grabbed widgets
    for (const w of newWidgets) {
      if (w.grabbed) continue;

      w.x += w.vx;
      w.y += w.vy;
      w.vx *= FRICTION;
      w.vy *= FRICTION;

      const sw = w.width * w.scale;
      const sh = w.height * w.scale;

      // Boundary bouncing
      if (w.x < 0) { w.x = 0; w.vx = Math.abs(w.vx) * 0.5; }
      if (w.x + sw > canvasWidth) { w.x = canvasWidth - sw; w.vx = -Math.abs(w.vx) * 0.5; }
      if (w.y < 0) { w.y = 0; w.vy = Math.abs(w.vy) * 0.5; }
      if (w.y + sh > canvasHeight) { w.y = canvasHeight - sh; w.vy = -Math.abs(w.vy) * 0.5; }

      if (Math.abs(w.vx) < MIN_VELOCITY) w.vx = 0;
      if (Math.abs(w.vy) < MIN_VELOCITY) w.vy = 0;
    }

    return { updatedWidgets: newWidgets, updatedHands };
  }, [hitTest]);

  return { processInteractions, hitTest };
}
