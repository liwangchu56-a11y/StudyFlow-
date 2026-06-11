import { create } from "zustand";

export type ModalKind = null | "summary" | "break" | "importText" | "cardEditor" | "settings" | "extractConcepts";

export interface UiState {
  modal: ModalKind;
  modalData: unknown;
  toast: string | null;
  toastId: number;
  drawerOpen: boolean;
  openModal: (kind: ModalKind, data?: unknown) => void;
  closeModal: () => void;
  showToast: (msg: string) => void;
  setDrawerOpen: (open: boolean) => void;
}

let toastTimer: ReturnType<typeof setTimeout> | null = null;

export const useUiStore = create<UiState>((set) => ({
  modal: null,
  modalData: null,
  toast: null,
  toastId: 0,
  drawerOpen: false,
  openModal: (modal, modalData) => set({ modal, modalData }),
  closeModal: () => set({ modal: null, modalData: null }),
  showToast: (toast) => {
    if (toastTimer) clearTimeout(toastTimer);
    const id = Date.now();
    set({ toast, toastId: id });
    toastTimer = setTimeout(() => {
      set((s) => (s.toastId === id ? { toast: null } : s));
    }, 2500);
  },
  setDrawerOpen: (drawerOpen) => set({ drawerOpen }),
}));