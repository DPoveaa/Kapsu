import { CreditCard, Barcode, QrCode } from 'lucide-react'

export interface CreditCardData {
  holderName: string
  number: string
  expiryMonth: string
  expiryYear: string
  ccv: string
}

interface CheckoutPaymentProps {
  selectedMethod: 'pix' | 'boleto' | 'credit_card'
  onSelectMethod: (method: 'pix' | 'boleto' | 'credit_card') => void
}

export function CheckoutPayment({
  selectedMethod,
  onSelectMethod,
}: CheckoutPaymentProps) {
  const optionClass = (method: 'pix' | 'boleto' | 'credit_card') =>
    `w-full text-left flex items-start gap-3 p-4 border-2 rounded-xl cursor-pointer transition-all ${
      selectedMethod === method
        ? 'border-primary-500 bg-primary-50 dark:bg-gray-800'
        : 'border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-400 bg-white dark:bg-gray-800'
    }`

  return (
    <div>
      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
        Forma de Pagamento
      </h3>
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => onSelectMethod('pix')}
          className={optionClass('pix')}
        >
          <span
            className={`mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${
              selectedMethod === 'pix' ? 'border-primary-600' : 'border-gray-300'
            }`}
          >
            {selectedMethod === 'pix' && <span className="h-2 w-2 rounded-full bg-primary-600" />}
          </span>
          <div className="flex-1">
            <div className="flex items-center gap-2 font-semibold text-gray-900 dark:text-white">
              <QrCode className="w-5 h-5 text-primary-600" />
              PIX
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Aprovação imediata.</p>
          </div>
        </button>

        <div className={`border-2 rounded-xl transition-all overflow-hidden ${
          selectedMethod === 'credit_card'
            ? 'border-primary-500 bg-primary-50 dark:bg-gray-800'
            : 'border-gray-200 dark:border-gray-700 hover:border-primary-300 bg-white dark:bg-gray-800'
        }`}>
          <button
            type="button"
            onClick={() => onSelectMethod('credit_card')}
            className="w-full text-left flex items-start gap-3 p-4 cursor-pointer"
          >
            <span
              className={`mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${
                selectedMethod === 'credit_card' ? 'border-primary-600' : 'border-gray-300'
              }`}
            >
              {selectedMethod === 'credit_card' && <span className="h-2 w-2 rounded-full bg-primary-600" />}
            </span>
            <div className="flex-1">
              <div className="flex items-center gap-2 font-semibold text-gray-900 dark:text-white">
                <CreditCard className="w-5 h-5 text-primary-600" />
                Cartão de Crédito
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Pague em até 12x.</p>
            </div>
          </button>

          {selectedMethod === 'credit_card' && (
            <div className="px-4 pb-4 border-t border-primary-200 dark:border-gray-700">
              <p className="text-sm text-gray-700 dark:text-gray-300 mt-4 text-center">
                Você será redirecionado para inserir os dados do cartão após clicar em{' '}
                <strong>Continuar para Cartão</strong>.
              </p>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => onSelectMethod('boleto')}
          className={optionClass('boleto')}
        >
          <span
            className={`mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${
              selectedMethod === 'boleto' ? 'border-primary-600' : 'border-gray-300'
            }`}
          >
            {selectedMethod === 'boleto' && <span className="h-2 w-2 rounded-full bg-primary-600" />}
          </span>
          <div className="flex-1">
            <div className="flex items-center gap-2 font-semibold text-gray-900 dark:text-white">
              <Barcode className="w-5 h-5 text-primary-600" />
              Boleto Bancário
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Aprovação em até 3 dias úteis.</p>
          </div>
        </button>
      </div>
    </div>
  )
}
