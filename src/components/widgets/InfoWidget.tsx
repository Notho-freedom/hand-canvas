import { useState, useEffect, useRef } from 'react';

interface InfoWidgetProps {
  handCount: number;
  widgetCount: number;
}

export default function InfoWidget({ handCount, widgetCount }: InfoWidgetProps) {
  const [fps, setFps] = useState(0);
  const frameRef = useRef({ count: 0, lastTime: performance.now() });

  useEffect(() => {
    let rafId: number;
    const tick = () => {
      frameRef.current.count++;
      const now = performance.now();
      if (now - frameRef.current.lastTime >= 1000) {
        setFps(frameRef.current.count);
        frameRef.current.count = 0;
        frameRef.current.lastTime = now;
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  const rows = [
    { label: 'FPS', value: fps.toString(), color: fps >= 50 ? 'hsl(90, 100%, 60%)' : fps >= 30 ? 'hsl(30, 100%, 55%)' : 'hsl(0, 84%, 60%)' },
    { label: 'Mains', value: handCount.toString(), color: 'hsl(180, 100%, 60%)' },
    { label: 'Widgets', value: widgetCount.toString(), color: 'hsl(270, 100%, 65%)' },
    { label: 'Résolution', value: `${window.innerWidth}×${window.innerHeight}`, color: 'hsl(0, 0%, 55%)' },
  ];

  return (
    <div className="flex flex-col gap-1.5 h-full justify-center">
      {rows.map(row => (
        <div key={row.label} className="flex items-center justify-between font-mono text-xs">
          <span style={{ color: 'hsl(0, 0%, 50%)' }}>{row.label}</span>
          <span style={{ color: row.color, textShadow: `0 0 6px ${row.color}40` }}>{row.value}</span>
        </div>
      ))}
    </div>
  );
}
