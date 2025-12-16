import { create } from 'zustand';

export type ModalType =
  | 'application'
  | 'confirm-delete'
  | 'import-data'
  | 'export-data'
  | 'settings'
  | null;

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  description?: string;
  duration?: number;
}

interface UIState {
  // Modal state
  activeModal: ModalType;
  modalData: unknown;

  // Toast notifications
  toasts: Toast[];

  // Sidebar
  sidebarOpen: boolean;

  // Command palette
  commandPaletteOpen: boolean;

  // Loading states
  globalLoading: boolean;
  loadingMessage: string;

  // Actions
  openModal: (modal: ModalType, data?: unknown) => void;
  closeModal: () => void;

  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  clearToasts: () => void;

  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;

  toggleCommandPalette: () => void;
  setCommandPaletteOpen: (open: boolean) => void;

  setGlobalLoading: (loading: boolean, message?: string) => void;
}

export const useUIStore = create<UIState>((set, get) => ({
  activeModal: null,
  modalData: null,
  toasts: [],
  sidebarOpen: true,
  commandPaletteOpen: false,
  globalLoading: false,
  loadingMessage: '',

  openModal: (modal, data) => {
    set({ activeModal: modal, modalData: data });
  },

  closeModal: () => {
    set({ activeModal: null, modalData: null });
  },

  addToast: (toast) => {
    const id = crypto.randomUUID();
    const newToast: Toast = {
      ...toast,
      id,
      duration: toast.duration ?? 4000,
    };

    set((state) => ({
      toasts: [...state.toasts, newToast],
    }));

    // Auto-remove toast after duration
    if (newToast.duration && newToast.duration > 0) {
      setTimeout(() => {
        get().removeToast(id);
      }, newToast.duration);
    }
  },

  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },

  clearToasts: () => {
    set({ toasts: [] });
  },

  toggleSidebar: () => {
    set((state) => ({ sidebarOpen: !state.sidebarOpen }));
  },

  setSidebarOpen: (open) => {
    set({ sidebarOpen: open });
  },

  toggleCommandPalette: () => {
    set((state) => ({ commandPaletteOpen: !state.commandPaletteOpen }));
  },

  setCommandPaletteOpen: (open) => {
    set({ commandPaletteOpen: open });
  },

  setGlobalLoading: (loading, message = '') => {
    set({ globalLoading: loading, loadingMessage: message });
  },
}));

// Helper functions for common toast patterns
export const toast = {
  success: (title: string, description?: string) => {
    useUIStore.getState().addToast({ type: 'success', title, description });
  },
  error: (title: string, description?: string) => {
    useUIStore.getState().addToast({ type: 'error', title, description });
  },
  info: (title: string, description?: string) => {
    useUIStore.getState().addToast({ type: 'info', title, description });
  },
  warning: (title: string, description?: string) => {
    useUIStore.getState().addToast({ type: 'warning', title, description });
  },
};
