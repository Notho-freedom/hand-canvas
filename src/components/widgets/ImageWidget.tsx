export default function ImageWidget() {
  return (
    <div className="flex items-center justify-center h-full">
      <div
        className="w-full h-full rounded flex items-center justify-center font-mono text-xs"
        style={{
          background: 'linear-gradient(135deg, hsla(270, 100%, 65%, 0.2), hsla(180, 100%, 50%, 0.15))',
          border: '1px dashed hsla(270, 100%, 65%, 0.3)',
          color: 'hsl(270, 100%, 70%)',
        }}
      >
        <div className="text-center">
          <div className="text-2xl mb-1">🖼️</div>
          <div>Image placeholder</div>
        </div>
      </div>
    </div>
  );
}
