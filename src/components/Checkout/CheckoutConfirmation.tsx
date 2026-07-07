import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle, Package, ShoppingBag, ArrowRight, Clock } from 'lucide-react'
import CheckoutStepper from './CheckoutStepper'
import type { CheckoutStep } from '../../types/checkout'
import {
  clearConfirmedCheckoutPayment,
  clearStoredCheckoutState,
  type CheckoutConfirmationType,
} from '../../utils/checkout'

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
    title: 'Obrigado pela compra!',
    subtitle: 'Pagamento aprovado. Seu pedido já está em andamento.',
    statusTitle: 'Pagamento confirmado',
    statusBody: '',
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
  const isPaid = confirmationType === 'paid'

  useEffect(() => {
    return () => {
      clearConfirmedCheckoutPayment()
      clearStoredCheckoutState()
    }
  }, [])

  const leaveConfirmation = (target: string) => {
    clearConfirmedCheckoutPayment()
    clearStoredCheckoutState()
    navigate(target)
  }

  return (
    <div className="animate-fade-in space-y-5 max-w-2xl mx-auto">
      <CheckoutStepper
        currentStep="confirmed"
        maxReachableStep={maxReachableStep}
        onStepClick={onStepClick ?? (() => {})}
      />

      <div className="bg-white dark:bg-gray-800 rounded-2xl sm:rounded-3xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="p-6 sm:p-8 flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-full bg-[#00A86B]/10 flex items-center justify-center mb-5 ring-8 ring-[#00A86B]/5">
            <CheckCircle className="w-9 h-9 text-[#00A86B]" />
          </div>

          <h2 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white mb-2 leading-tight">
            {copy.title}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
            {copy.subtitle}
          </p>

          {isPaid ? (
            <div className="mb-6 flex flex-wrap items-center justify-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              {paymentResult.orderId && (
                <span className="font-mono">
                  #{paymentResult.orderId.length > 12 ? `${paymentResult.orderId.substring(0, 12)}...` : paymentResult.orderId}
                </span>
              )}
              {methodLabel && (
                <span className="rounded-full bg-[#00A86B]/10 px-2.5 py-1 font-semibold text-[#008A57] dark:text-[#00C97D]">
                  {methodLabel}
                </span>
              )}
            </div>
          ) : (
            <div className="w-full max-w-sm bg-[#00A86B]/5 border border-[#00A86B]/20 rounded-2xl p-4 mb-6 flex items-start gap-3 text-left">
              <StatusIcon className="w-5 h-5 text-[#00A86B] mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-bold text-gray-800 dark:text-gray-100">{copy.statusTitle}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{copy.statusBody}</p>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-2.5 w-full max-w-md">
            <button
              type="button"
              onClick={() => leaveConfirmation('/perfil?section=orders')}
              className="flex-1 inline-flex items-center justify-center gap-1.5 whitespace-nowrap bg-[#00A86B] hover:bg-[#008A57] text-white font-bold rounded-lg py-2.5 px-3 text-xs sm:text-sm transition-colors"
            >
              Acompanhar pedido
              <ArrowRight size={15} />
            </button>
            <button
              type="button"
              onClick={() => leaveConfirmation('/produtos')}
              className="flex-1 inline-flex items-center justify-center gap-1.5 whitespace-nowrap border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 font-bold rounded-lg py-2.5 px-3 text-xs sm:text-sm hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <ShoppingBag size={15} />
              Comprar mais
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
