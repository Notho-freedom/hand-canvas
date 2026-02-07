import { useState } from 'react';
import { NEON_COLORS } from '@/types/madox';

export default function ColorsWidget() {
  const [selected, setSelected] = useState<number | null>(null);

  return (
    <div className="flex flex-col gap-2 h-full justify-center">
      <div className="grid grid-cols-3 gap-1.5">
        {NEON_COLORS.map((color, i) => (
          <button
            key={i}
            onClick={() => setSelected(i)}
            className="w-full aspect-square rounded-md pointer-events-auto transition-transform"
            style={{
              background: color.fill,
              boxShadow: selected === i
                ? `0 0 12px ${color.glow}, inset 0 0 8px hsla(0, 0%, 100%, 0.3)`
                : `0 0 6px ${color.glow}`,
              border: selected === i ? '2px solid white' : '2px solid transparent',
              transform: selected === i ? 'scale(1.1)' : 'scale(1)',
            }}
          />
        ))}
      </div>
      {selected !== null && (
        <div className="font-mono text-xs text-center" style={{ color: NEON_COLORS[selected].fill }}>
          {NEON_COLORS[selected].fill}
        </div>
      )}
    </div>
  );
}
