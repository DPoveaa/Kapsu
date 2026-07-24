import { useState, useEffect, useRef } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, HelpCircle } from 'lucide-react';
import { toast, confirm, ToastItem, ConfirmItem } from '../utils/toast';

function ToastCard({ toastItem, onRemove }: { toastItem: ToastItem; onRemove: (id: string) => void }) {
  const [isHovered, setIsHovered] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const remainingTimeRef = useRef(toastItem.duration || 1800);
  const startTimeRef = useRef(Date.now());
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startTimer = () => {
    startTimeRef.current = Date.now();
    timerRef.current = setTimeout(() => {
      handleDismiss();
    }, remainingTimeRef.current);
  };

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => {
    startTimer();
    return () => clearTimer();
  }, []);

  const handleMouseEnter = () => {
    setIsHovered(true);
    clearTimer();
    const elapsed = Date.now() - startTimeRef.current;
    remainingTimeRef.current = Math.max(0, remainingTimeRef.current - elapsed);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    if (remainingTimeRef.current > 0) {
      startTimer();
    } else {
      handleDismiss();
    }
  };

  const handleDismiss = () => {
    if (isExiting) return;
    setIsExiting(true);
    setTimeout(() => {
      onRemove(toastItem.id);
    }, 220);
  };

  const typeConfig = {
    success: {
      cardBg: 'bg-white/95 dark:bg-gray-900/95 border-emerald-200/90 dark:border-emerald-800/80 shadow-emerald-500/10',
      icon: <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0" />,
      barBg: 'bg-gradient-to-r from-emerald-500 to-teal-400',
    },
    error: {
      cardBg: 'bg-white/95 dark:bg-gray-900/95 border-rose-200/90 dark:border-rose-800/80 shadow-rose-500/10',
      icon: <AlertCircle className="h-5 w-5 text-rose-500 flex-shrink-0" />,
      barBg: 'bg-gradient-to-r from-rose-500 to-red-400',
    },
    warning: {
      cardBg: 'bg-white/95 dark:bg-gray-900/95 border-amber-200/90 dark:border-amber-800/80 shadow-amber-500/10',
      icon: <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0" />,
      barBg: 'bg-gradient-to-r from-amber-500 to-yellow-400',
    },
    info: {
      cardBg: 'bg-white/95 dark:bg-gray-900/95 border-sky-200/90 dark:border-sky-800/80 shadow-sky-500/10',
      icon: <Info className="h-5 w-5 text-sky-500 flex-shrink-0" />,
      barBg: 'bg-gradient-to-r from-sky-500 to-blue-400',
    },
  }[toastItem.type];

  return (
    <div
      onClick={handleDismiss}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`group relative flex items-center gap-3 p-3.5 px-4 rounded-2xl border shadow-xl backdrop-blur-md cursor-pointer select-none pointer-events-auto transition-all duration-300 transform-gpu overflow-hidden origin-top-right ${
        isExiting ? 'animate-toast-out' : 'animate-toast-in'
      } ${
        isHovered
          ? 'scale-[1.08] shadow-2xl ring-2 ring-primary-500/30 border-primary-400 dark:border-primary-500 z-50'
          : 'hover:scale-[1.03]'
      } ${typeConfig.cardBg}`}
      title="Clique para fechar | Passe o mouse para congelar"
    >
      <div className="flex items-center gap-3 w-full min-w-0 pr-1">
        {typeConfig.icon}
        <p className="text-xs font-semibold leading-relaxed tracking-tight break-words text-gray-800 dark:text-gray-200 flex-1">
          {toastItem.message}
        </p>
      </div>

      {/* Dynamic In-Card Progress Bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 overflow-hidden rounded-b-2xl pointer-events-none">
        <div
          className={`h-full ${typeConfig.barBg}`}
          style={{
            animation: `shrink ${toastItem.duration || 1800}ms linear forwards`,
            animationPlayState: isHovered ? 'paused' : 'running',
          }}
        />
      </div>
    </div>
  );
}

export default function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [confirmRequest, setConfirmRequest] = useState<ConfirmItem | null>(null);

  useEffect(() => {
    const unsubscribeToast = toast.subscribeToast((item) => {
      setToasts((prev) => {
        // Limita a no máximo 3 toasts visíveis por vez para não poluir a tela
        const updated = [...prev, item];
        return updated.length > 3 ? updated.slice(updated.length - 3) : updated;
      });
    });

    const unsubscribeConfirm = confirm.subscribe((item) => {
      setConfirmRequest(item);
    });

    return () => {
      unsubscribeToast();
      unsubscribeConfirm();
    };
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const handleConfirm = () => {
    if (confirmRequest) {
      confirmRequest.onConfirm();
      setConfirmRequest(null);
    }
  };

  const handleCancel = () => {
    if (confirmRequest) {
      if (confirmRequest.onCancel) {
        confirmRequest.onCancel();
      }
      setConfirmRequest(null);
    }
  };

  return (
    <>
      {/* Toast Notifications Stack */}
      <div className="fixed top-4 right-4 z-[99999] flex flex-col gap-2.5 w-full max-w-sm pointer-events-none">
        {toasts.map((t) => (
          <ToastCard key={t.id} toastItem={t} onRemove={removeToast} />
        ))}
      </div>

      {/* Confirm Modal Dialog */}
      {confirmRequest && (
        <div className="fixed inset-0 z-[999999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 p-6 max-w-md w-full shadow-2xl space-y-5 animate-scale-in text-center sm:text-left">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 text-amber-500 rounded-2xl flex-shrink-0 border border-amber-200/60 dark:border-amber-900/60">
                <HelpCircle size={26} />
              </div>
              
              <div className="space-y-1.5 flex-1">
                <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
                  Confirmação
                </h3>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-line">
                  {confirmRequest.message}
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-end gap-2.5 pt-2 border-t border-gray-100 dark:border-gray-800">
              <button
                type="button"
                onClick={handleCancel}
                className="w-full sm:w-auto px-5 py-2.5 border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 font-semibold rounded-xl text-xs sm:text-sm transition-all active:scale-98"
              >
                {confirmRequest.cancelText}
              </button>
              
              <button
                type="button"
                onClick={handleConfirm}
                className="w-full sm:w-auto px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl text-xs sm:text-sm transition-all shadow-md active:scale-98"
              >
                {confirmRequest.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
