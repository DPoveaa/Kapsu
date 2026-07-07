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
  { id: 'card', title: 'Cartão de crédito', description: '', icon: CreditCard },
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
                ? 'border-[#00A86B] bg-[#00A86B]/5 dark:bg-[#00A86B]/10 shadow-sm scale-[1.02]'
                : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-primary-300 dark:hover:border-primary-600'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  isSelected
                    ? 'bg-[#00A86B] text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                }`}
              >
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-gray-900 dark:text-white text-sm">{method.title}</p>
                {method.description && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{method.description}</p>
                )}
                {method.id === 'card' && (
                  <p className="text-[11px] font-semibold text-green-600 dark:text-green-400 mt-0.5">Aprovação imediata</p>
                )}
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}

