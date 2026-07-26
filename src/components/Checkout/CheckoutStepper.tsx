import { Check } from 'lucide-react'
import { CHECKOUT_STEPS, CheckoutStep, getStepIndex } from '../../types/checkout'

interface CheckoutStepperProps {
  currentStep: CheckoutStep
  maxReachableStep: CheckoutStep
  onStepClick: (step: CheckoutStep) => void
}

export default function CheckoutStepper({
  currentStep,
  maxReachableStep,
  onStepClick,
}: CheckoutStepperProps) {
  const currentIndex = getStepIndex(currentStep)
  const maxIndex = getStepIndex(maxReachableStep)

  return (
    <div className="mb-6 sm:mb-8 animate-fade-in">
      <nav className="relative max-w-3xl mx-auto" aria-label="Progresso do checkout">
        {[0, 1, 2].map((i) => {
          const targetIndex = i + 1
          const colorClass =
            currentIndex >= targetIndex
              ? 'bg-[#00A86B]'
              : 'bg-gray-300 dark:bg-gray-700'

          const leftPercent = 12.5 + i * 25
          return (
            <div
              key={i}
              aria-hidden="true"
              className={`absolute top-4 sm:top-5 h-[3px] -translate-y-1/2 z-0 transition-all duration-500 ease-out ${colorClass}`}
              style={{ left: `${leftPercent}%`, width: '25%' }}
            />
          )
        })}

        <div className="relative z-10 grid grid-cols-4 gap-1 sm:gap-2">
          {CHECKOUT_STEPS.map((step, index) => {
            const isCurrent = step.id === currentStep
            const hasBeenReached = index <= maxIndex
            const isComplete = index < currentIndex
            const isPending = index > currentIndex
            const canClick =
              hasBeenReached &&
              !isCurrent &&
              step.id !== 'confirmed'

            return (
              <button
                key={step.id}
                type="button"
                disabled={!canClick}
                onClick={() => canClick && onStepClick(step.id)}
                className={`flex flex-col items-center gap-1.5 rounded-lg transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900 ${
                  canClick ? 'cursor-pointer hover:scale-105' : 'cursor-default'
                }`}
                aria-current={isCurrent ? 'step' : undefined}
                aria-label={`${step.label}: ${
                  isCurrent
                    ? 'etapa atual'
                    : isComplete
                      ? 'concluída'
                      : canClick
                        ? 'disponível'
                        : 'não iniciada'
                }`}
              >
                <span
                  className={`flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full font-black text-xs sm:text-sm border-4 border-gray-50 dark:border-gray-900 transition-all duration-300 ${
                    isCurrent
                      ? 'bg-primary-600 text-white shadow-md ring-2 ring-primary-300 dark:ring-primary-700 scale-105'
                      : isComplete
                        ? 'bg-[#00A86B] text-white shadow-md shadow-[#00A86B]/25 hover:shadow-[#00A86B]/40'
                        : isPending
                          ? 'bg-gray-100 dark:bg-gray-800/50 text-gray-400 dark:text-gray-600 border-gray-200 dark:border-gray-800'
                          : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700'
                  }`}
                >
                  {isComplete ? <Check className="w-4 h-4" aria-hidden="true" /> : index + 1}
                </span>
                <span
                  className={`text-[9px] sm:text-[11px] font-extrabold uppercase tracking-wide text-center leading-tight px-0.5 transition-colors ${
                    isCurrent
                      ? 'text-primary-600 dark:text-primary-400'
                      : isComplete
                        ? 'text-[#00A86B] dark:text-green-400'
                        : 'text-gray-400 dark:text-gray-500'
                  }`}
                >
                  {step.label}
                </span>
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
