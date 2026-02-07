import { useState } from 'react';

export default function CounterWidget() {
  const [count, setCount] = useState(0);

  return (
    <div className="flex flex-col items-center justify-center h-full gap-3">
      <div
        className="font-mono text-4xl font-bold tabular-nums"
        style={{
          color: 'hsl(30, 100%, 60%)',
          textShadow: '0 0 12px hsla(30, 100%, 55%, 0.4)',
        }}
      >
        {count}
      </div>
      <div className="flex gap-2 pointer-events-auto">
        <button
          onClick={() => setCount(c => c - 1)}
          className="w-10 h-8 rounded font-mono text-sm font-bold transition-colors"
          style={{
            background: 'hsla(0, 84%, 60%, 0.15)',
            border: '1px solid hsla(0, 84%, 60%, 0.4)',
            color: 'hsl(0, 84%, 65%)',
          }}
        >
          −
        </button>
        <button
          onClick={() => setCount(0)}
          className="w-10 h-8 rounded font-mono text-xs transition-colors"
          style={{
            background: 'hsla(0, 0%, 50%, 0.1)',
            border: '1px solid hsla(0, 0%, 50%, 0.3)',
            color: 'hsl(0, 0%, 55%)',
          }}
        >
          RST
        </button>
        <button
          onClick={() => setCount(c => c + 1)}
          className="w-10 h-8 rounded font-mono text-sm font-bold transition-colors"
          style={{
            background: 'hsla(90, 100%, 50%, 0.15)',
            border: '1px solid hsla(90, 100%, 50%, 0.4)',
            color: 'hsl(90, 100%, 60%)',
          }}
        >
          +
        </button>
      </div>
    </div>
  );
}
