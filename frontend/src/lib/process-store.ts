import { create } from "zustand";

interface Process {
  id: string;
  name: string;
}

interface ProcessStore {
  processes: Process[];
  addProcess: (id: string, name: string) => void;
  removeProcess: (id: string) => void;
}

export const useProcessStore = create<ProcessStore>((set) => ({
  processes: [],
  addProcess: (id, name) =>
    set((state) => ({
      processes: [...state.processes, { id, name }],
    })),
  removeProcess: (id) =>
    set((state) => ({
      processes: state.processes.filter((p) => p.id !== id),
    })),
}));
