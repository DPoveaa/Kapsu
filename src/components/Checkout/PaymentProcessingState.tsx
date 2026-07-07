import { CheckCircle, Loader2, XCircle, Clock } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { PaymentProcessingVisualState } from '../../types/payment'

interface PaymentProcessingStateProps {
  state: PaymentProcessingVisualState
  onRetry?: () => void
}

const STATE_COPY: Record<PaymentProcessingVisualState, string> = {
  processing: 'Processando pagamento...',
  confirmed: 'Pagamento confirmado',
  failed: 'Pagamento não aprovado',
  awaiting_payment: 'Aguardando pagamento',
}

export default function PaymentProcessingState({ state, onRetry }: PaymentProcessingStateProps) {
  const [progress, setProgress] = useState(12)

  useEffect(() => {
    if (state === 'confirmed') {
      setProgress(100)
      return
    }

    if (state === 'failed') {
      setProgress(0)
      return
    }

    setProgress(12)
    const interval = window.setInterval(() => {
      setProgress((current) => {
        if (current >= 92) return current
        return current + 4
      })
    }, 180)

    return () => window.clearInterval(interval)
  }, [state])

  const Icon =
    state === 'confirmed'
      ? CheckCircle
      : state === 'failed'
        ? XCircle
        : state === 'awaiting_payment'
          ? Clock
          : Loader2

  const iconClass =
    state === 'confirmed'
      ? 'text-[#00A86B]'
      : state === 'failed'
        ? 'text-red-500'
        : state === 'awaiting_payment'
          ? 'text-amber-500'
          : 'text-[#00A86B] animate-spin'

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 sm:p-8 animate-fade-in">
      <div className="flex flex-col items-center text-center gap-4">
        <div className="w-16 h-16 rounded-full bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
          <Icon className={`w-8 h-8 ${iconClass}`} />
        </div>

        <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
          {STATE_COPY[state]}
        </p>

        <div className="w-full max-w-xs h-2 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ease-out ${
              state === 'failed' ? 'bg-red-400' : 'bg-[#00A86B]'
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>

        {state === 'failed' && onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-2 text-sm font-bold text-[#00A86B] hover:underline"
          >
            Tentar novamente
          </button>
        )}
      </div>
    </div>
  )
}
