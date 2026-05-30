type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface ToastItem {
  id: string
  message: string
  type: ToastType
  duration?: number
}

export interface ConfirmItem {
  id: string
  message: string
  onConfirm: () => void
  onCancel?: () => void
  confirmText?: string
  cancelText?: string
}

type ToastListener = (toast: ToastItem) => void
type ConfirmListener = (confirm: ConfirmItem) => void

class ToastManager {
  private toastListeners = new Set<ToastListener>()
  private confirmListeners = new Set<ConfirmListener>()

  subscribeToast(listener: ToastListener) {
    this.toastListeners.add(listener)
    return () => {
      this.toastListeners.delete(listener)
    }
  }

  subscribeConfirm(listener: ConfirmListener) {
    this.confirmListeners.add(listener)
    return () => {
      this.confirmListeners.delete(listener)
    }
  }

  show(message: string, type: ToastType = 'info', duration = 3000) {
    const id = Math.random().toString(36).substring(2, 9)
    const item: ToastItem = { id, message, type, duration }
    this.toastListeners.forEach(listener => listener(item))
    return id
  }

  success(message: string, duration = 3000) {
    return this.show(message, 'success', duration)
  }

  error(message: string, duration = 4000) {
    return this.show(message, 'error', duration)
  }

  info(message: string, duration = 3000) {
    return this.show(message, 'info', duration)
  }

  warning(message: string, duration = 4000) {
    return this.show(message, 'warning', duration)
  }
}

class ConfirmManager {
  private listeners = new Set<ConfirmListener>()

  subscribe(listener: ConfirmListener) {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  show(message: string, onConfirm: () => void, onCancel?: () => void, confirmText = 'Confirmar', cancelText = 'Cancelar') {
    const id = Math.random().toString(36).substring(2, 9)
    const item: ConfirmItem = { id, message, onConfirm, onCancel, confirmText, cancelText }
    this.listeners.forEach(listener => listener(item))
    return id
  }
}

export const toast = new ToastManager()
export const confirm = new ConfirmManager()
