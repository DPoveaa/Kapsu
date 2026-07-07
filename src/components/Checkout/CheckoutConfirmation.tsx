import CheckoutStepper from './CheckoutStepper'
import type { CheckoutStep } from '../../types/checkout'
import type { CheckoutConfirmationType } from '../../utils/checkout'
import { CheckCircle, Package, ShoppingBag, ArrowRight, Clock } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface CheckoutConfirmationProps {
  paymentResult: {
    orderId?: string
    paymentMethod?: string
    isPaid?: boolean
    confirmationType?: CheckoutConfirmationType
  }
  maxReachableStep: CheckoutStep
  onStepClick?: (step: CheckoutStep) => void
}

const METHOD_LABELS: Record<string, string> = {
  credit_card: 'Cartão de crédito',
  pix: 'PIX',
  boleto: 'Boleto',
}

const COPY: Record<
  CheckoutConfirmationType,
  { title: string; subtitle: string; statusTitle: string; statusBody: string }
> = {
  paid: {
    title: 'Pedido confirmado',
    subtitle: 'Seu pagamento foi confirmado.',
    statusTitle: 'Pagamento confirmado',
    statusBody: 'Você receberá um e-mail com os detalhes do envio.',
  },
  awaiting_boleto: {
    title: 'Pedido criado',
    subtitle: 'Seu pedido foi registrado com sucesso.',
    statusTitle: 'Aguardando pagamento do boleto',
    statusBody: 'O pagamento pode levar até 3 dias úteis para ser confirmado após o pagamento.',
  },
  awaiting_payment: {
    title: 'Aguardando pagamento',
    subtitle: 'Estamos aguardando a confirmação do pagamento.',
    statusTitle: 'Pagamento pendente',
    statusBody: 'Você pode acompanhar o status do pedido a qualquer momento.',
  },
}

export default function CheckoutConfirmation({
  paymentResult,
  maxReachableStep,
  onStepClick,
}: CheckoutConfirmationProps) {
  const navigate = useNavigate()
  const methodLabel = paymentResult.paymentMethod
    ? METHOD_LABELS[paymentResult.paymentMethod] || paymentResult.paymentMethod
    : null

  const confirmationType: CheckoutConfirmationType =
    paymentResult.confirmationType ||
    (paymentResult.isPaid ? 'paid' : 'awaiting_payment')

  const copy = COPY[confirmationType]

  const StatusIcon = confirmationType === 'paid' ? Package : Clock

  return (
    <div className="animate-fade-in space-y-6 max-w-2xl mx-auto">
      <CheckoutStepper
        currentStep="confirmed"
        maxReachableStep={maxReachableStep}
        onStepClick={onStepClick ?? (() => {})}
      />

      <div className="bg-white dark:bg-gray-800 rounded-2xl sm:rounded-3xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="p-8 sm:p-10 flex flex-col items-center text-center">
          <div className="w-20 h-20 rounded-full bg-[#00A86B]/10 flex items-center justify-center mb-6 ring-8 ring-[#00A86B]/5">
            <CheckCircle className="w-10 h-10 text-[#00A86B]" />
          </div>

          <h2 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white mb-2">
            {copy.title}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
            {copy.subtitle}
          </p>
          {paymentResult.orderId && (
            <p className="text-xs text-gray-400 dark:text-gray-500 font-mono mb-8">
              #{paymentResult.orderId.length > 16 ? `${paymentResult.orderId.substring(0, 16)}…` : paymentResult.orderId}
            </p>
          )}

          <div className="w-full max-w-sm bg-[#00A86B]/5 border border-[#00A86B]/20 rounded-2xl p-4 mb-8 flex items-start gap-3 text-left">
            <StatusIcon className="w-5 h-5 text-[#00A86B] mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-bold text-gray-800 dark:text-gray-100">{copy.statusTitle}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {copy.statusBody}
                {methodLabel && confirmationType === 'paid' && (
                  <span className="block mt-0.5 text-[#00A86B] font-medium">
                    Pago via {methodLabel}
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm">
            <button
              type="button"
              onClick={() => navigate('/perfil?section=orders')}
              className="flex-1 inline-flex items-center justify-center gap-2 bg-[#00A86B] hover:bg-[#008A57] text-white font-bold rounded-xl py-3 px-4 text-sm transition-colors"
            >
              Acompanhar pedido
              <ArrowRight size={15} />
            </button>
            <button
              type="button"
              onClick={() => navigate('/produtos')}
              className="flex-1 inline-flex items-center justify-center gap-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 font-bold rounded-xl py-3 px-4 text-sm hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <ShoppingBag size={15} />
              Continuar comprando
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
