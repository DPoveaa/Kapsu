import React from 'react'
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

// Funções de máscara
const formatCardNumber = (val: string) => {
  const v = val.replace(/\D/g, '').substring(0, 16)
  return v.replace(/(\d{4})(?=\d)/g, '$1 ')
}

const formatExpiry = (val: string) => {
  const v = val.replace(/\D/g, '').substring(0, 4)
  if (v.length >= 2) {
    return `${v.substring(0, 2)}/${v.substring(2)}`
  }
  return v
}

export function CheckoutPayment({
  selectedMethod,
  onSelectMethod
}: CheckoutPaymentProps) {

  return (
    <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
        Forma de Pagamento
      </h3>
      <div className="space-y-3">
        {/* PIX */}
        <label className={`flex items-start gap-3 p-4 border-2 rounded-xl cursor-pointer transition-all ${selectedMethod === 'pix' ? 'border-primary-500 bg-primary-50 dark:bg-gray-800' : 'border-gray-200 dark:border-gray-700 hover:border-primary-300'}`}>
          <input type="radio" name="paymentMethod" value="pix" checked={selectedMethod === 'pix'} onChange={() => onSelectMethod('pix')} className="mt-1" />
          <div className="flex-1">
            <div className="flex items-center gap-2 font-semibold text-gray-900 dark:text-white">
              <QrCode className="w-5 h-5 text-primary-600" />
              PIX
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Aprovação imediata.</p>
          </div>
        </label>

        {/* Cartão de Crédito */}
        <div className={`border-2 rounded-xl transition-all overflow-hidden ${selectedMethod === 'credit_card' ? 'border-primary-500 bg-primary-50 dark:bg-gray-800' : 'border-gray-200 dark:border-gray-700 hover:border-primary-300 bg-white dark:bg-gray-800'}`}>
          <label className="flex items-start gap-3 p-4 cursor-pointer">
            <input type="radio" name="paymentMethod" value="credit_card" checked={selectedMethod === 'credit_card'} onChange={() => onSelectMethod('credit_card')} className="mt-1" />
            <div className="flex-1">
              <div className="flex items-center gap-2 font-semibold text-gray-900 dark:text-white">
                <CreditCard className="w-5 h-5 text-primary-600" />
                Cartão de Crédito
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Pague em até 12x.</p>
            </div>
          </label>
          
          {selectedMethod === 'credit_card' && (
            <div className="p-4 pt-0 border-t border-primary-200 dark:border-gray-700 mt-2">
              <p className="text-sm text-gray-700 dark:text-gray-300 mt-4 text-center">
                Você será redirecionado para um ambiente seguro para inserir os dados do seu cartão após clicar em <strong>"Continuar para Cartão"</strong>.
              </p>
            </div>
          )}
        </div>

        {/* Boleto */}
        <label className={`flex items-start gap-3 p-4 border-2 rounded-xl cursor-pointer transition-all ${selectedMethod === 'boleto' ? 'border-primary-500 bg-primary-50 dark:bg-gray-800' : 'border-gray-200 dark:border-gray-700 hover:border-primary-300'}`}>
          <input type="radio" name="paymentMethod" value="boleto" checked={selectedMethod === 'boleto'} onChange={() => onSelectMethod('boleto')} className="mt-1" />
          <div className="flex-1">
            <div className="flex items-center gap-2 font-semibold text-gray-900 dark:text-white">
              <Barcode className="w-5 h-5 text-primary-600" />
              Boleto Bancário
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Aprovação em até 3 dias úteis.</p>
          </div>
        </label>
      </div>
    </div>
  )
}
