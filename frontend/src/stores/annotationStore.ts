import { create } from 'zustand';

interface AnnotationState {
  annotator: string;
  setAnnotator: (name: string) => void;
  currentStage: number;
  setCurrentStage: (stage: number) => void;
  currentDataset: string;
  setCurrentDataset: (ds: string) => void;
}

export const useAnnotationStore = create<AnnotationState>((set) => ({
  annotator: localStorage.getItem('annotator') || '',
  setAnnotator: (name: string) => {
    localStorage.setItem('annotator', name);
    set({ annotator: name });
  },
  currentStage: 1,
  setCurrentStage: (stage: number) => set({ currentStage: stage }),
  currentDataset: '',
  setCurrentDataset: (ds: string) => set({ currentDataset: ds }),
}));
