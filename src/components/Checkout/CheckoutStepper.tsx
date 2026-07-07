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
      <div className="relative max-w-3xl mx-auto">
        {/* Linhas de conexão segmentadas */}
        {[0, 1, 2].map((i) => {
          const targetIndex = i + 1
          let colorClass = 'bg-gray-900 dark:bg-gray-950' // Preto se ainda não fiz nada

          if (maxIndex >= targetIndex) {
            if (currentIndex >= targetIndex) {
              colorClass = 'bg-[#00A86B]' // Verde se estou nela ou passei dela
            } else {
              colorClass = 'bg-gray-400 dark:bg-gray-600' // Cinza se já passei mas voltei
            }
          }

          const leftPercent = 12.5 + i * 25
          return (
            <div
              key={i}
              className={`absolute top-4 sm:top-5 h-[3px] -translate-y-1/2 z-0 transition-all duration-500 ease-out ${colorClass}`}
              style={{ left: `${leftPercent}%`, width: '25%' }}
            />
          )
        })}

        <div className="relative z-10 grid grid-cols-4 gap-1 sm:gap-2">
          {CHECKOUT_STEPS.map((step, index) => {
            const isCurrent = step.id === currentStep
            const hasBeenReached = index <= maxIndex
            const isVisited = hasBeenReached && !isCurrent
            const isPending = !hasBeenReached
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
                className={`flex flex-col items-center gap-1.5 focus:outline-none transition-transform ${
                  canClick ? 'cursor-pointer hover:scale-105' : 'cursor-default'
                }`}
                aria-current={isCurrent ? 'step' : undefined}
              >
                <span
                  className={`flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full font-black text-xs sm:text-sm border-4 border-gray-50 dark:border-gray-900 transition-all duration-300 ${
                    isCurrent
                      ? 'bg-primary-600 text-white shadow-md ring-2 ring-primary-300 dark:ring-primary-700 scale-105'
                      : isVisited
                        ? 'bg-[#00A86B] text-white shadow-md shadow-[#00A86B]/25 hover:shadow-[#00A86B]/40'
                        : isPending
                          ? 'bg-gray-100 dark:bg-gray-800/50 text-gray-400 dark:text-gray-600 border-gray-200 dark:border-gray-800'
                          : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700'
                  }`}
                >
                  {isVisited ? <Check className="w-4 h-4" /> : index + 1}
                </span>
                <span
                  className={`text-[9px] sm:text-[11px] font-extrabold uppercase tracking-wide text-center leading-tight px-0.5 transition-colors ${
                    isCurrent
                      ? 'text-primary-600 dark:text-primary-400'
                      : isVisited
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
      </div>
    </div>
  )
}
