import { X, Minus } from 'lucide-react';
import type { MadoxWidget } from '@/types/madox';

interface WidgetWrapperProps {
  widget: MadoxWidget;
  onClose: (id: string) => void;
  children: React.ReactNode;
}

export default function WidgetWrapper({ widget, onClose, children }: WidgetWrapperProps) {
  const isActive = widget.grabbed || widget.selected;

  return (
    <div
      className="absolute select-none"
      style={{
        left: widget.x,
        top: widget.y,
        width: widget.width * widget.scale,
        height: widget.minimized ? 32 * widget.scale : widget.height * widget.scale,
        zIndex: widget.zIndex,
        transform: `scale(1)`,
        transition: widget.grabbed ? 'none' : 'box-shadow 0.2s ease',
        pointerEvents: 'none', // Interaction is handled by hand tracking
      }}
    >
      <div
        className="w-full h-full rounded-lg overflow-hidden flex flex-col"
        style={{
          background: 'hsla(240, 15%, 8%, 0.85)',
          backdropFilter: 'blur(12px)',
          border: `1px solid ${isActive ? 'hsl(180, 100%, 50%)' : 'hsla(240, 10%, 25%, 0.6)'}`,
          boxShadow: widget.grabbed
            ? '0 0 30px hsla(300, 100%, 60%, 0.4), 0 0 60px hsla(300, 100%, 60%, 0.15), inset 0 0 20px hsla(300, 100%, 60%, 0.05)'
            : widget.selected
              ? '0 0 20px hsla(180, 100%, 50%, 0.3), 0 0 40px hsla(180, 100%, 50%, 0.1)'
              : '0 4px 20px hsla(0, 0%, 0%, 0.4)',
        }}
      >
        {/* Title bar */}
        <div
          className="flex items-center justify-between px-2 py-1 shrink-0"
          style={{
            background: isActive
              ? 'linear-gradient(90deg, hsla(180, 100%, 50%, 0.15), hsla(300, 100%, 60%, 0.1))'
              : 'hsla(240, 10%, 12%, 0.6)',
            borderBottom: '1px solid hsla(240, 10%, 20%, 0.5)',
          }}
        >
          <span
            className="text-xs font-mono tracking-wider truncate"
            style={{ color: isActive ? 'hsl(180, 100%, 70%)' : 'hsl(0, 0%, 60%)' }}
          >
            {widget.title}
          </span>
          <div className="flex items-center gap-1 pointer-events-auto">
            <button
              onClick={() => onClose(widget.id)}
              className="w-4 h-4 flex items-center justify-center rounded-sm hover:bg-destructive/20 transition-colors"
            >
              <X className="w-2.5 h-2.5" style={{ color: 'hsl(0, 0%, 50%)' }} />
            </button>
          </div>
        </div>

        {/* Content */}
        {!widget.minimized && (
          <div className="flex-1 overflow-hidden p-2">
            {children}
          </div>
        )}
      </div>
    </div>
  );
}
