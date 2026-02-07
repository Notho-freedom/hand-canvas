import { useState } from 'react';

export default function NotesWidget() {
  const [text, setText] = useState('Tapez vos notes ici...');

  return (
    <textarea
      value={text}
      onChange={e => setText(e.target.value)}
      className="w-full h-full resize-none border-none outline-none font-mono text-xs leading-relaxed pointer-events-auto"
      style={{
        background: 'transparent',
        color: 'hsl(90, 100%, 70%)',
        caretColor: 'hsl(90, 100%, 50%)',
      }}
    />
  );
}
