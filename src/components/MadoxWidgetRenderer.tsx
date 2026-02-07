import type { MadoxWidget } from '@/types/madox';
import WidgetWrapper from '@/components/widgets/WidgetWrapper';
import ClockWidget from '@/components/widgets/ClockWidget';
import NotesWidget from '@/components/widgets/NotesWidget';
import InfoWidget from '@/components/widgets/InfoWidget';
import CounterWidget from '@/components/widgets/CounterWidget';
import ImageWidget from '@/components/widgets/ImageWidget';
import ColorsWidget from '@/components/widgets/ColorsWidget';

interface MadoxWidgetRendererProps {
  widgets: MadoxWidget[];
  handCount: number;
  onRemoveWidget: (id: string) => void;
}

function WidgetContent({ widget, handCount, widgetCount }: { widget: MadoxWidget; handCount: number; widgetCount: number }) {
  switch (widget.type) {
    case 'clock':
      return <ClockWidget />;
    case 'notes':
      return <NotesWidget />;
    case 'info':
      return <InfoWidget handCount={handCount} widgetCount={widgetCount} />;
    case 'counter':
      return <CounterWidget />;
    case 'image':
      return <ImageWidget />;
    case 'colors':
      return <ColorsWidget />;
    default:
      return <div className="font-mono text-xs" style={{ color: 'hsl(0, 0%, 50%)' }}>Widget inconnu</div>;
  }
}

export default function MadoxWidgetRenderer({ widgets, handCount, onRemoveWidget }: MadoxWidgetRendererProps) {
  return (
    <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 1 }}>
      {widgets.map(widget => (
        <WidgetWrapper key={widget.id} widget={widget} onClose={onRemoveWidget}>
          <WidgetContent widget={widget} handCount={handCount} widgetCount={widgets.length} />
        </WidgetWrapper>
      ))}
    </div>
  );
}
