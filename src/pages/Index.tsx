import { useCallback, useState, useEffect } from 'react';
import { useHandTracking } from '@/hooks/useHandTracking';
import { useWidgetManager } from '@/hooks/useWidgetManager';
import { useHandInteraction } from '@/hooks/useHandInteraction';
import MadoxCanvas from '@/components/MadoxCanvas';
import MadoxWidgetRenderer from '@/components/MadoxWidgetRenderer';
import MadoxHUD from '@/components/MadoxHUD';
import type { HandData, WidgetType } from '@/types/madox';

const Index = () => {
  const { hands, isLoading, error, handsRef } = useHandTracking();
  const { addWidget, removeWidget, clearAll, getWidgets, updateWidgets } = useWidgetManager();
  const { processInteractions } = useHandInteraction();

  const [localHands, setLocalHands] = useState<HandData[]>(hands);
  const [widgetSnapshot, setWidgetSnapshot] = useState(getWidgets());

  useEffect(() => {
    setLocalHands(hands);
  }, [hands]);

  // Sync widget snapshot for React rendering at a reasonable rate
  useEffect(() => {
    const interval = setInterval(() => {
      setWidgetSnapshot([...getWidgets()]);
    }, 1000 / 30);
    return () => clearInterval(interval);
  }, [getWidgets]);

  const handleAddWidget = useCallback((type: WidgetType) => {
    addWidget(type);
  }, [addWidget]);

  const handleHandsUpdate = useCallback(
    (updatedHands: HandData[]) => {
      handsRef.current = updatedHands;
    },
    [handsRef]
  );

  return (
    <div className="relative w-screen h-screen overflow-hidden">
      <MadoxCanvas
        handsRef={handsRef}
        getWidgets={getWidgets}
        updateWidgets={updateWidgets}
        onHandsUpdate={handleHandsUpdate}
        processInteractions={processInteractions}
      />
      <MadoxWidgetRenderer
        widgets={widgetSnapshot}
        handCount={localHands.length}
        onRemoveWidget={removeWidget}
      />
      <MadoxHUD
        isLoading={isLoading}
        error={error}
        widgetCount={widgetSnapshot.length}
        handCount={localHands.length}
        onAddWidget={handleAddWidget}
        onClearAll={clearAll}
      />
    </div>
  );
};

export default Index;
