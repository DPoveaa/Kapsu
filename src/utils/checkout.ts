export const PENDING_CHECKOUT_ORDER_KEY = 'sanare_pending_checkout_order_id'
export const PENDING_CHECKOUT_PAYMENT_KEY = 'cart_pending_payment'
export const CONFIRMED_CHECKOUT_PAYMENT_KEY = 'cart_payment_result'

export interface PendingCheckoutPayment {
  orderId: string
  paymentMethod: 'pix' | 'boleto'
  isPaid?: false
  pixQrCode?: string
  pixPayload?: string
  expirationDate?: string
  bankSlipUrl?: string
  identificationField?: string
  dueDate?: string
  paymentId?: string
}

export interface ConfirmedCheckoutPayment {
  orderId: string
  paymentMethod: string
  isPaid: true
  status?: string
}

export function getPendingCheckoutPayment(): PendingCheckoutPayment | null {
  try {
    const saved = sessionStorage.getItem(PENDING_CHECKOUT_PAYMENT_KEY)
    if (saved) {
      const parsed = JSON.parse(saved) as PendingCheckoutPayment
      if (parsed?.orderId && parsed?.paymentMethod) return parsed
    }

    // Migração: sessões antigas guardavam PIX/boleto pendente em cart_payment_result
    const legacy = sessionStorage.getItem(CONFIRMED_CHECKOUT_PAYMENT_KEY)
    if (legacy) {
      const parsed = JSON.parse(legacy) as PendingCheckoutPayment & { isPaid?: boolean }
      if (
        parsed?.orderId &&
        (parsed.paymentMethod === 'pix' || parsed.paymentMethod === 'boleto') &&
        !parsed.isPaid
      ) {
        const pending: PendingCheckoutPayment = {
          orderId: parsed.orderId,
          paymentMethod: parsed.paymentMethod,
          pixQrCode: parsed.pixQrCode,
          pixPayload: parsed.pixPayload,
          expirationDate: parsed.expirationDate,
          bankSlipUrl: parsed.bankSlipUrl,
          identificationField: parsed.identificationField,
          dueDate: parsed.dueDate,
          paymentId: parsed.paymentId,
        }
        setPendingCheckoutPayment(pending)
        sessionStorage.removeItem(CONFIRMED_CHECKOUT_PAYMENT_KEY)
        return pending
      }
    }
    return null
  } catch {
    return null
  }
}

export function setPendingCheckoutPayment(payment: PendingCheckoutPayment): void {
  sessionStorage.setItem(PENDING_CHECKOUT_PAYMENT_KEY, JSON.stringify(payment))
}

export function clearPendingCheckoutPayment(): void {
  sessionStorage.removeItem(PENDING_CHECKOUT_PAYMENT_KEY)
}

export function getConfirmedCheckoutPayment(): ConfirmedCheckoutPayment | null {
  try {
    const saved = sessionStorage.getItem(CONFIRMED_CHECKOUT_PAYMENT_KEY)
    if (!saved) return null
    const parsed = JSON.parse(saved) as ConfirmedCheckoutPayment
    if (!parsed?.orderId || parsed.isPaid !== true) return null
    return parsed
  } catch {
    return null
  }
}

export function setConfirmedCheckoutPayment(payment: ConfirmedCheckoutPayment): void {
  sessionStorage.setItem(CONFIRMED_CHECKOUT_PAYMENT_KEY, JSON.stringify(payment))
}

export function clearConfirmedCheckoutPayment(): void {
  sessionStorage.removeItem(CONFIRMED_CHECKOUT_PAYMENT_KEY)
}

/** Step 4 só após pagamento confirmado; step 3 enquanto aguarda PIX/boleto. */
export function resolveCheckoutStep(
  checkoutStep: string,
  pendingPayment: PendingCheckoutPayment | null,
  confirmedPayment: ConfirmedCheckoutPayment | null
): 'cart' | 'delivery' | 'payment' | 'confirmed' {
  if (confirmedPayment?.isPaid) return 'confirmed'
  if (pendingPayment) return 'payment'
  if (checkoutStep === 'cart' || checkoutStep === 'delivery' || checkoutStep === 'payment' || checkoutStep === 'confirmed') {
    return checkoutStep === 'confirmed' ? 'payment' : checkoutStep
  }
  return 'cart'
}

export function shouldClearCartAfterPayment(
  paymentMethod: string,
  status?: string | null
): boolean {
  if (paymentMethod === 'pix' || paymentMethod === 'boleto') return false
  if (paymentMethod === 'credit_card') {
    return isPaidOrderStatus(status || '')
  }
  return isPaidOrderStatus(status || '')
}

const PAID_ORDER_STATUSES = new Set([
  'CONFIRMED',
  'RECEIVED',
  'RECEIVED_IN_CASH',
  'PAID',
  'APPROVED',
  'AUTHORIZED',
])

const CANCELLED_ORDER_STATUSES = new Set([
  'CANCELLED',
  'CANCELED',
  'REFUNDED',
  'DELETED',
  'EXPIRED',
])

const PENDING_PAYMENT_STATUSES = new Set([
  'PENDING',
  'PENDING_PAYMENT',
  'AWAITING_RISK_ANALYSIS',
  'OVERDUE',
  'DUNNING_REQUESTED',
  'DUNNING_RECEIVED',
])

export function normalizeOrderStatus(status?: string | null): string {
  return (status || '').toUpperCase()
}

export function isPaidOrderStatus(status?: string | null): boolean {
  return PAID_ORDER_STATUSES.has(normalizeOrderStatus(status))
}

export function isCancelledOrderStatus(status?: string | null): boolean {
  return CANCELLED_ORDER_STATUSES.has(normalizeOrderStatus(status))
}

export function isPendingPaymentOrderStatus(status?: string | null): boolean {
  return PENDING_PAYMENT_STATUSES.has(normalizeOrderStatus(status))
}

export function getPendingCheckoutOrderId(): string | null {
  return sessionStorage.getItem(PENDING_CHECKOUT_ORDER_KEY)
}

export function setPendingCheckoutOrderId(orderId: string): void {
  sessionStorage.setItem(PENDING_CHECKOUT_ORDER_KEY, orderId)
}

export function clearPendingCheckoutOrderId(): void {
  sessionStorage.removeItem(PENDING_CHECKOUT_ORDER_KEY)
}
