import { Clock, StickyNote, Info, Hash, Image, Palette, Plus, Trash2, Hand } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { WidgetType } from '@/types/madox';

interface MadoxHUDProps {
  isLoading: boolean;
  error: string | null;
  widgetCount: number;
  handCount: number;
  onAddWidget: (type: WidgetType) => void;
  onClearAll: () => void;
}

const WIDGET_MENU: { type: WidgetType; icon: React.ReactNode; label: string }[] = [
  { type: 'clock',   icon: <Clock className="w-3.5 h-3.5" />,      label: 'Horloge' },
  { type: 'notes',   icon: <StickyNote className="w-3.5 h-3.5" />,  label: 'Notes' },
  { type: 'info',    icon: <Info className="w-3.5 h-3.5" />,        label: 'Infos' },
  { type: 'counter', icon: <Hash className="w-3.5 h-3.5" />,       label: 'Compteur' },
  { type: 'image',   icon: <Image className="w-3.5 h-3.5" />,      label: 'Image' },
  { type: 'colors',  icon: <Palette className="w-3.5 h-3.5" />,    label: 'Palette' },
];

export default function MadoxHUD({
  isLoading,
  error,
  widgetCount,
  handCount,
  onAddWidget,
  onClearAll,
}: MadoxHUDProps) {
  return (
    <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 10 }}>
      {/* Title */}
      <div className="absolute top-6 left-6">
        <h1 className="text-lg font-mono font-bold tracking-widest text-foreground/80">
          MADOX
        </h1>
        <p className="text-xs font-mono text-muted-foreground mt-1">
          widget interaction engine
        </p>
      </div>

      {/* Status */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-sm font-mono text-muted-foreground">
              Initialisation caméra & modèle...
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center max-w-md px-6">
            <p className="text-sm font-mono text-destructive mb-2">Erreur</p>
            <p className="text-xs font-mono text-muted-foreground">{error}</p>
            <p className="text-xs font-mono text-muted-foreground mt-4">
              Vérifiez que votre webcam est accessible et autorisée.
            </p>
          </div>
        </div>
      )}

      {/* Controls */}
      {!isLoading && !error && (
        <>
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 pointer-events-auto">
            {WIDGET_MENU.map(item => (
              <Button
                key={item.type}
                onClick={() => onAddWidget(item.type)}
                variant="outline"
                size="sm"
                className="font-mono text-xs bg-background/40 backdrop-blur-sm border-border/50 hover:bg-primary/10 hover:border-primary/40 hover:text-primary"
              >
                {item.icon}
                <span className="ml-1 hidden sm:inline">{item.label}</span>
              </Button>
            ))}
            <div className="w-px h-6 bg-border/30 mx-1" />
            <Button
              onClick={onClearAll}
              variant="outline"
              size="sm"
              className="font-mono text-xs bg-background/40 backdrop-blur-sm border-border/50 hover:bg-destructive/10 hover:border-destructive/40 hover:text-destructive"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>

          {/* Stats */}
          <div className="absolute top-6 right-6 text-right">
            <p className="text-xs font-mono text-muted-foreground">
              {widgetCount} widget{widgetCount !== 1 ? 's' : ''} • {handCount} main{handCount !== 1 ? 's' : ''}
            </p>
          </div>

          {/* Instructions */}
          {handCount === 0 && (
            <div className="absolute bottom-20 left-1/2 -translate-x-1/2 text-center">
              <div className="flex items-center gap-2 text-muted-foreground/60">
                <Hand className="w-4 h-4" />
                <p className="text-xs font-mono">
                  Montrez vos mains • Pincez pour saisir les widgets
                </p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
