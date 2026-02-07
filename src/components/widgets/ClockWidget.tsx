import { useState, useEffect } from 'react';

export default function ClockWidget() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const hours = time.getHours().toString().padStart(2, '0');
  const minutes = time.getMinutes().toString().padStart(2, '0');
  const seconds = time.getSeconds().toString().padStart(2, '0');

  return (
    <div className="flex flex-col items-center justify-center h-full gap-1">
      <div
        className="font-mono text-3xl tracking-widest"
        style={{
          color: 'hsl(180, 100%, 60%)',
          textShadow: '0 0 10px hsla(180, 100%, 50%, 0.5), 0 0 30px hsla(180, 100%, 50%, 0.2)',
        }}
      >
        {hours}:{minutes}:{seconds}
      </div>
      <div className="font-mono text-xs" style={{ color: 'hsl(0, 0%, 45%)' }}>
        {time.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
      </div>
    </div>
  );
}
