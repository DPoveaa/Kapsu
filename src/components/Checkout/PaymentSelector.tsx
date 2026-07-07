import { QrCode, CreditCard, Barcode } from 'lucide-react'
import type { PaymentMethod } from '../../types/checkout'

interface PaymentSelectorProps {
  selectedMethod: PaymentMethod
  onSelectMethod: (method: PaymentMethod) => void
  disabled?: boolean
}

interface SelectorMethod {
  id: 'pix' | 'card' | 'boleto'
  title: string
  description: string
  icon: typeof QrCode
}

const METHODS: SelectorMethod[] = [
  { id: 'pix', title: 'PIX', description: 'Aprovação imediata', icon: QrCode },
  { id: 'card', title: 'Cartão de crédito', description: 'Aprovação imediata', icon: CreditCard },
  { id: 'boleto', title: 'Boleto', description: 'Até 3 dias úteis', icon: Barcode },
]

export default function PaymentSelector({
  selectedMethod,
  onSelectMethod,
  disabled = false,
}: PaymentSelectorProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {METHODS.map((method) => {
        const Icon = method.icon
        const isSelected =
          method.id === 'card'
            ? selectedMethod === 'credit_card'
            : selectedMethod === method.id

        return (
          <button
            key={method.id}
            type="button"
            disabled={disabled}
            onClick={() => {
              if (method.id === 'card') {
                onSelectMethod('credit_card')
              } else {
                onSelectMethod(method.id)
              }
            }}
            className={`text-left p-4 rounded-2xl border-2 transition-all duration-200 ${
              isSelected
                ? 'border-primary-500 bg-primary-50 dark:bg-gray-700/60 shadow-sm scale-[1.02]'
                : 'border-gray-200 bg-white hover:border-primary-300 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-primary-600'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  isSelected
                    ? 'bg-primary-600 text-white dark:bg-primary-500'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                }`}
              >
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-sm text-gray-900 dark:text-white">{method.title}</p>
                <p className={`text-xs mt-0.5 ${isSelected ? 'text-primary-600 dark:text-primary-400' : 'text-gray-500 dark:text-gray-400'}`}>{method.description}</p>
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}

