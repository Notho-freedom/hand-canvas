import { useCallback, useRef } from 'react';
import { useHandTracking } from '@/hooks/useHandTracking';
import { useObjectManager } from '@/hooks/useObjectManager';
import MadoxCanvas from '@/components/MadoxCanvas';
import MadoxHUD from '@/components/MadoxHUD';
import type { HandData } from '@/types/madox';

const Index = () => {
  const { hands, isLoading, error, setHands } = useHandTracking();
  const { addObject, clearAll, getObjects, updateObjects } = useObjectManager();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleAddObject = useCallback(() => {
    addObject(window.innerWidth, window.innerHeight);
  }, [addObject]);

  const handleHandsUpdate = useCallback(
    (updatedHands: HandData[]) => {
      setHands(updatedHands);
    },
    [setHands]
  );

  return (
    <div className="relative w-screen h-screen overflow-hidden">
      <MadoxCanvas
        hands={hands}
        getObjects={getObjects}
        updateObjects={updateObjects}
        onHandsUpdate={handleHandsUpdate}
      />
      <MadoxHUD
        isLoading={isLoading}
        error={error}
        objectCount={getObjects().length}
        handCount={hands.length}
        onAddObject={handleAddObject}
        onClearAll={clearAll}
      />
    </div>
  );
};

export default Index;
