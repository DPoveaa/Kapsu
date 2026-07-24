type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
  createdAt: number;
}

export interface ConfirmItem {
  id: string;
  message: string;
  onConfirm: () => void;
  onCancel?: () => void;
  confirmText?: string;
  cancelText?: string;
}

type ToastListener = (toast: ToastItem) => void;
type ConfirmListener = (confirm: ConfirmItem) => void;

class ToastManager {
  private toastListeners = new Set<ToastListener>();
  private recentMessages = new Map<string, number>();

  subscribeToast(listener: ToastListener) {
    this.toastListeners.add(listener);
    return () => {
      this.toastListeners.delete(listener);
    };
  }

  show(message: string, type: ToastType = 'info', duration = 1800) {
    const trimmed = (message || '').trim();
    if (!trimmed) return '';

    const now = Date.now();
    const lastSeen = this.recentMessages.get(trimmed);

    // Evita popups duplicados disparados no mesmo segundo (janela de 1.2s)
    if (lastSeen && now - lastSeen < 1200) {
      return '';
    }

    this.recentMessages.set(trimmed, now);
    // Limpar cache antigo
    setTimeout(() => {
      this.recentMessages.delete(trimmed);
    }, 2000);

    const id = Math.random().toString(36).substring(2, 9);
    const item: ToastItem = { id, message: trimmed, type, duration, createdAt: now };
    this.toastListeners.forEach((listener) => listener(item));
    return id;
  }

  success(message: string, duration = 1800) {
    return this.show(message, 'success', duration);
  }

  error(message: string, duration = 2400) {
    return this.show(message, 'error', duration);
  }

  info(message: string, duration = 1800) {
    return this.show(message, 'info', duration);
  }

  warning(message: string, duration = 2200) {
    return this.show(message, 'warning', duration);
  }
}

class ConfirmManager {
  private listeners = new Set<ConfirmListener>();

  subscribe(listener: ConfirmListener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  show(
    message: string,
    onConfirm: () => void,
    onCancel?: () => void,
    confirmText = 'Confirmar',
    cancelText = 'Cancelar'
  ) {
    const id = Math.random().toString(36).substring(2, 9);
    const item: ConfirmItem = { id, message, onConfirm, onCancel, confirmText, cancelText };
    this.listeners.forEach((listener) => listener(item));
    return id;
  }
}

export const toast = new ToastManager();
export const confirm = new ConfirmManager();
