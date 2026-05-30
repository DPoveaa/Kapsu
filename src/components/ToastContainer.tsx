import { useState, useEffect } from 'react'
import { CheckCircle, AlertCircle, AlertTriangle, Info, X, HelpCircle } from 'lucide-react'
import { toast, confirm, ToastItem, ConfirmItem } from '../utils/toast'

export default function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const [confirmRequest, setConfirmRequest] = useState<ConfirmItem | null>(null)

  useEffect(() => {
    const unsubscribeToast = toast.subscribeToast((item) => {
      setToasts((prev) => [...prev, item])
      
      const duration = item.duration || 3000
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== item.id))
      }, duration)
    })

    const unsubscribeConfirm = confirm.subscribe((item) => {
      setConfirmRequest(item)
    })

    return () => {
      unsubscribeToast()
      unsubscribeConfirm()
    }
  }, [])

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  const handleConfirm = () => {
    if (confirmRequest) {
      confirmRequest.onConfirm()
      setConfirmRequest(null)
    }
  }

  const handleCancel = () => {
    if (confirmRequest) {
      if (confirmRequest.onCancel) {
        confirmRequest.onCancel()
      }
      setConfirmRequest(null)
    }
  }

  return (
    <>
      {/* Toast Notifications */}
      <div className="fixed top-5 right-5 z-[99999] flex flex-col gap-3 w-full max-w-sm pointer-events-none">
        {toasts.map((t) => {
          const typeStyles = {
            success: {
              bg: 'bg-white dark:bg-gray-800 border-green-200 dark:border-green-900',
              icon: <CheckCircle className="text-green-500 flex-shrink-0" size={18} />,
              bar: 'bg-green-500',
            },
            error: {
              bg: 'bg-white dark:bg-gray-800 border-red-200 dark:border-red-900',
              icon: <AlertCircle className="text-red-500 flex-shrink-0" size={18} />,
              bar: 'bg-red-500',
            },
            warning: {
              bg: 'bg-white dark:bg-gray-800 border-orange-200 dark:border-orange-900',
              icon: <AlertTriangle className="text-orange-500 flex-shrink-0" size={18} />,
              bar: 'bg-orange-500',
            },
            info: {
              bg: 'bg-white dark:bg-gray-800 border-blue-200 dark:border-blue-900',
              icon: <Info className="text-blue-500 flex-shrink-0" size={18} />,
              bar: 'bg-blue-500',
            },
          }[t.type]

          return (
            <div
              key={t.id}
              className={`relative flex items-center justify-between gap-3 p-4 rounded-2xl border shadow-lg pointer-events-auto transition-all duration-300 transform translate-x-0 animate-slide-in-right ${typeStyles.bg}`}
            >
              <div className="flex items-center gap-3 pr-2">
                {typeStyles.icon}
                <p className="text-xs sm:text-sm font-semibold text-gray-800 dark:text-gray-300 leading-snug whitespace-pre-line">
                  {t.message}
                </p>
              </div>

              <button
                onClick={() => removeToast(t.id)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 dark:text-gray-500 rounded-lg transition-colors flex-shrink-0"
              >
                <X size={14} />
              </button>

              {/* Progress bar */}
              <div
                className={`absolute bottom-0 left-0 h-[3px] rounded-b-2xl ${typeStyles.bar}`}
                style={{
                  animation: `shrink ${t.duration || 3000}ms linear forwards`,
                }}
              />
            </div>
          )
        })}
      </div>

      {/* Confirm Modal Dialog */}
      {confirmRequest && (
        <div className="fixed inset-0 z-[999999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-200 dark:border-gray-700 p-6 max-w-md w-full shadow-2xl space-y-5 animate-scale-in text-center sm:text-left">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
              <div className="p-3 bg-amber-50 dark:bg-amber-950/20 text-amber-500 rounded-2xl flex-shrink-0">
                <HelpCircle size={28} />
              </div>
              
              <div className="space-y-2 flex-1">
                <h3 className="text-base sm:text-lg font-extrabold text-gray-900 dark:text-white">
                  Confirmação
                </h3>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-line">
                  {confirmRequest.message}
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-end gap-2.5 pt-2">
              <button
                onClick={handleCancel}
                className="w-full sm:w-auto px-5 py-2.5 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold rounded-xl text-xs sm:text-sm transition-all active:scale-98"
              >
                {confirmRequest.cancelText}
              </button>
              
              <button
                onClick={handleConfirm}
                className="w-full sm:w-auto px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl text-xs sm:text-sm transition-all shadow-md active:scale-98"
              >
                {confirmRequest.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
