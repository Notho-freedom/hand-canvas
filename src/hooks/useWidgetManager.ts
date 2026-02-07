import { useCallback, useRef, useState } from 'react';
import type { MadoxWidget, WidgetType } from '@/types/madox';
import { WIDGET_DEFAULTS } from '@/types/madox';

let nextId = 0;
let nextZIndex = 1;

export function useWidgetManager() {
  const widgetsRef = useRef<MadoxWidget[]>([]);
  const [, forceRender] = useState(0);

  const triggerRender = useCallback(() => {
    forceRender(n => n + 1);
  }, []);

  const addWidget = useCallback((type: WidgetType, x?: number, y?: number) => {
    const defaults = WIDGET_DEFAULTS[type];
    const padding = 80;
    const widget: MadoxWidget = {
      id: `widget-${nextId++}`,
      type,
      title: defaults.title,
      x: x ?? padding + Math.random() * (window.innerWidth - padding * 2 - defaults.width),
      y: y ?? padding + Math.random() * (window.innerHeight - padding * 2 - defaults.height),
      width: defaults.width,
      height: defaults.height,
      scale: 1,
      zIndex: nextZIndex++,
      grabbed: false,
      grabbedByHand: null,
      selected: false,
      minimized: false,
      vx: 0,
      vy: 0,
    };
    widgetsRef.current = [...widgetsRef.current, widget];
    triggerRender();
    return widget;
  }, [triggerRender]);

  const removeWidget = useCallback((id: string) => {
    widgetsRef.current = widgetsRef.current.filter(w => w.id !== id);
    triggerRender();
  }, [triggerRender]);

  const updateWidget = useCallback((id: string, updates: Partial<MadoxWidget>) => {
    widgetsRef.current = widgetsRef.current.map(w =>
      w.id === id ? { ...w, ...updates } : w
    );
  }, []);

  const bringToFront = useCallback((id: string) => {
    const z = nextZIndex++;
    widgetsRef.current = widgetsRef.current.map(w =>
      w.id === id ? { ...w, zIndex: z } : w
    );
  }, []);

  const clearAll = useCallback(() => {
    widgetsRef.current = [];
    triggerRender();
  }, [triggerRender]);

  const getWidgets = useCallback(() => widgetsRef.current, []);

  const updateWidgets = useCallback((updater: (widgets: MadoxWidget[]) => MadoxWidget[]) => {
    widgetsRef.current = updater(widgetsRef.current);
  }, []);

  return { addWidget, removeWidget, updateWidget, bringToFront, clearAll, getWidgets, updateWidgets, triggerRender };
}
