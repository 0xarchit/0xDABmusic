import { useProcessStore } from "@/lib/process-store";
import { Loader2 } from "lucide-react";

export function ProcessingStatus() {
  const processes = useProcessStore((state) => state.processes);

  if (processes.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 items-end">
      {processes.map((process, index) => (
        <div
          key={process.id}
          className={`flex items-center gap-3 bg-card/90 backdrop-blur-md border border-border/60 px-4 py-2.5 rounded-full animate-in fade-in slide-in-from-bottom-4 duration-300 ${
            index === 0
              ? "animate-delay-0"
              : index === 1
              ? "animate-delay-150"
              : "animate-delay-300"
          }`}
        >
          <Loader2 className="w-4 h-4 text-primary animate-spin" />
          <div className="flex flex-col">
            <span className="text-xs font-medium text-foreground">
              {process.name}
            </span>
            <span className="text-[10px] text-muted-foreground leading-none">
              Processing...
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
