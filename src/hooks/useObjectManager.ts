import { useCallback, useRef } from 'react';
import type { MadoxObject } from '@/types/madox';
import { NEON_COLORS } from '@/types/madox';

let nextId = 0;

export function useObjectManager() {
  const objectsRef = useRef<MadoxObject[]>([]);

  const addObject = useCallback((canvasWidth: number, canvasHeight: number) => {
    const color = NEON_COLORS[nextId % NEON_COLORS.length];
    const padding = 80;
    const obj: MadoxObject = {
      id: `obj-${nextId++}`,
      x: padding + Math.random() * (canvasWidth - padding * 2),
      y: padding + Math.random() * (canvasHeight - padding * 2),
      radius: 20 + Math.random() * 25,
      color: color.fill,
      glowColor: color.glow,
      grabbed: false,
      grabbedByHand: null,
      vx: 0,
      vy: 0,
    };
    objectsRef.current = [...objectsRef.current, obj];
    return obj;
  }, []);

  const removeObject = useCallback((id: string) => {
    objectsRef.current = objectsRef.current.filter(o => o.id !== id);
  }, []);

  const clearAll = useCallback(() => {
    objectsRef.current = [];
  }, []);

  const getObjects = useCallback(() => objectsRef.current, []);

  const updateObjects = useCallback((updater: (objs: MadoxObject[]) => MadoxObject[]) => {
    objectsRef.current = updater(objectsRef.current);
  }, []);

  return { addObject, removeObject, clearAll, getObjects, updateObjects };
}
