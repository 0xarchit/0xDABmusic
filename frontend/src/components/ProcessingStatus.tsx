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
          className="flex items-center gap-3 bg-slate-950/80 backdrop-blur-md border border-slate-800 px-4 py-2.5 rounded-full shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-300"
          style={{
            animationDelay: `${index * 100}ms`,
          }}
        >
          <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
          <div className="flex flex-col">
            <span className="text-xs font-medium text-slate-100">
              {process.name}
            </span>
            <span className="text-[10px] text-slate-400 leading-none">
              Processing...
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
