import { useCallback, useRef, useState, useEffect } from 'react';
import { useHandTracking } from '@/hooks/useHandTracking';
import { useObjectManager } from '@/hooks/useObjectManager';
import MadoxCanvas from '@/components/MadoxCanvas';
import MadoxHUD from '@/components/MadoxHUD';
import type { HandData } from '@/types/madox';

const Index = () => {
  const { hands, isLoading, error, handsRef } = useHandTracking(); // Récupère handsRef au lieu de setHands
  const { addObject, clearAll, getObjects, updateObjects } = useObjectManager();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // État local pour synchroniser les mains avec l'UI si besoin
  const [localHands, setLocalHands] = useState<HandData[]>(hands);

  // Synchroniser les mains du hook avec l'état local
  useEffect(() => {
    setLocalHands(hands);
  }, [hands]);

  const handleAddObject = useCallback(() => {
    addObject(window.innerWidth, window.innerHeight);
  }, [addObject]);

  const handleHandsUpdate = useCallback(
    (updatedHands: HandData[]) => {
      // Utilise la ref pour les mises à jour en temps réel
      if (handsRef.current) {
        handsRef.current = updatedHands;
      }
      // Si tu as besoin de déclencher un render, utilise l'état local
      // Mais attention : ça peut ralentir les performances
      // setLocalHands(updatedHands);
    },
    [handsRef]
  );

  // Fonction pour forcer une mise à jour si nécessaire
  const forceUpdateHands = useCallback(() => {
    if (handsRef.current) {
      setLocalHands([...handsRef.current]);
    }
  }, [handsRef]);

  return (
    <div className="relative w-screen h-screen overflow-hidden">
      <MadoxCanvas
        hands={localHands} // Utilise les mains locales
        getObjects={getObjects}
        updateObjects={updateObjects}
        onHandsUpdate={handleHandsUpdate}
        handsRef={handsRef} // Passe la ref au canvas pour accès direct
      />
      <MadoxHUD
        isLoading={isLoading}
        error={error}
        objectCount={getObjects().length}
        handCount={localHands.length} // Utilise le compte local
        onAddObject={handleAddObject}
        onClearAll={clearAll}
      />
    </div>
  );
};

export default Index;