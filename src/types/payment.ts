export type NormalizedPaymentStatus =
  | 'confirmed'
  | 'awaiting_payment'
  | 'processing'
  | 'failed'
  | 'cancelled'
  | 'expired'

export type NormalizedOrderStatus = 'confirmed' | 'pending_payment' | 'cancelled'

export type CheckoutNextStep = 'confirmation' | 'payment' | 'retry'

export type PaymentProcessingVisualState =
  | 'processing'
  | 'confirmed'
  | 'failed'
  | 'awaiting_payment'

export interface NormalizedPaymentResult {
  success: true
  orderId: string
  paymentId?: string
  paymentAttemptId?: string
  paymentMethod: 'credit_card' | 'debit_card' | 'pix' | 'boleto'
  provider: 'asaas'
  providerStatus: string
  paymentStatus: NormalizedPaymentStatus
  orderStatus: NormalizedOrderStatus
  isFinal: boolean
  shouldAdvanceToConfirmation: boolean
  shouldClearCart: boolean
  nextStep: CheckoutNextStep
  message: string
  installments?: number
  pixQrCode?: string
  pixPayload?: string
  expirationDate?: string
  bankSlipUrl?: string
  identificationField?: string
  dueDate?: string
}

export function unwrapNormalizedPaymentResult(raw: unknown): NormalizedPaymentResult | null {
  if (!raw || typeof raw !== 'object') return null

  const candidate = raw as Record<string, unknown>

  // Legacy double-nested response from payWithCard
  if (candidate.data && typeof candidate.data === 'object') {
    const nested = candidate.data as Record<string, unknown>
    if (nested.paymentStatus) {
      return nested as unknown as NormalizedPaymentResult
    }
    if (nested.data && typeof nested.data === 'object') {
      const deep = nested.data as Record<string, unknown>
      if (deep.paymentStatus) {
        return deep as unknown as NormalizedPaymentResult
      }
    }
  }

  if (candidate.paymentStatus) {
    return candidate as unknown as NormalizedPaymentResult
  }

  // Legacy card response with raw Asaas status only
  if (candidate.status && candidate.orderId) {
    const status = String(candidate.status).toUpperCase()
    const paid = ['CONFIRMED', 'RECEIVED', 'RECEIVED_IN_CASH', 'APPROVED', 'AUTHORIZED'].includes(status)
    const failed = ['REFUSED', 'FAILED', 'DECLINED', 'CANCELLED'].includes(status)
    return {
      success: true,
      orderId: String(candidate.orderId),
      paymentId: candidate.paymentId ? String(candidate.paymentId) : undefined,
      paymentMethod: (candidate.paymentMethod as NormalizedPaymentResult['paymentMethod']) || 'credit_card',
      provider: 'asaas',
      providerStatus: status,
      paymentStatus: paid ? 'confirmed' : failed ? 'failed' : status === 'PENDING' ? 'awaiting_payment' : 'processing',
      orderStatus: paid ? 'confirmed' : failed ? 'cancelled' : 'pending_payment',
      isFinal: paid || failed,
      shouldAdvanceToConfirmation: paid,
      shouldClearCart: paid,
      nextStep: paid ? 'confirmation' : failed ? 'retry' : 'payment',
      message: paid ? 'Payment confirmed' : failed ? 'Payment was not approved' : 'Processing payment',
      installments: candidate.installments ? Number(candidate.installments) : undefined,
    }
  }

  return null
}

export function toProcessingVisualState(
  paymentStatus: NormalizedPaymentStatus
): PaymentProcessingVisualState {
  if (paymentStatus === 'confirmed') return 'confirmed'
  if (paymentStatus === 'failed' || paymentStatus === 'cancelled' || paymentStatus === 'expired') {
    return 'failed'
  }
  if (paymentStatus === 'awaiting_payment') return 'awaiting_payment'
  return 'processing'
}
