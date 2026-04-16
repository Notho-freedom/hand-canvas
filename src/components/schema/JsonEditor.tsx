import { useEffect, useState } from "react";
import { Textarea } from "@/components/ui/textarea";

interface Props {
  value: string;
  onChange: (v: string) => void;
  error?: string | null;
}

export default function JsonEditor({ value, onChange, error }: Props) {
  const [local, setLocal] = useState(value);
  useEffect(() => setLocal(value), [value]);
  return (
    <div className="flex flex-col h-full">
      <Textarea
        value={local}
        onChange={(e) => {
          setLocal(e.target.value);
          onChange(e.target.value);
        }}
        spellCheck={false}
        className="flex-1 font-mono text-xs resize-none rounded-none border-0 focus-visible:ring-0 bg-card text-card-foreground"
      />
      {error && (
        <div className="border-t border-destructive/40 bg-destructive/10 text-destructive text-xs font-mono px-3 py-2 max-h-32 overflow-auto whitespace-pre-wrap">
          {error}
        </div>
      )}
    </div>
  );
}
