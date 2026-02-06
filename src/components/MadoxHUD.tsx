import { Plus, Trash2, Hand } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MadoxHUDProps {
  isLoading: boolean;
  error: string | null;
  objectCount: number;
  handCount: number;
  onAddObject: () => void;
  onClearAll: () => void;
}

export default function MadoxHUD({
  isLoading,
  error,
  objectCount,
  handCount,
  onAddObject,
  onClearAll,
}: MadoxHUDProps) {
  return (
    <div className="fixed inset-0 pointer-events-none z-10">
      {/* Title */}
      <div className="absolute top-6 left-6">
        <h1 className="text-lg font-mono font-bold tracking-widest text-foreground/80">
          MADOX
        </h1>
        <p className="text-xs font-mono text-muted-foreground mt-1">
          hand interaction engine
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
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 pointer-events-auto">
            <Button
              onClick={onAddObject}
              variant="outline"
              size="sm"
              className="font-mono text-xs bg-background/40 backdrop-blur-sm border-border/50 hover:bg-primary/10 hover:border-primary/40 hover:text-primary"
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Ajouter
            </Button>
            <Button
              onClick={onClearAll}
              variant="outline"
              size="sm"
              className="font-mono text-xs bg-background/40 backdrop-blur-sm border-border/50 hover:bg-destructive/10 hover:border-destructive/40 hover:text-destructive"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1.5" />
              Effacer
            </Button>
          </div>

          {/* Instructions */}
          {handCount === 0 && (
            <div className="absolute bottom-20 left-1/2 -translate-x-1/2 text-center">
              <div className="flex items-center gap-2 text-muted-foreground/60">
                <Hand className="w-4 h-4" />
                <p className="text-xs font-mono">
                  Montrez vos mains à la webcam • Pincez pour saisir les objets
                </p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
