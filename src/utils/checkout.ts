export const PENDING_CHECKOUT_ORDER_KEY = 'sanare_pending_checkout_order_id'
export const PENDING_CHECKOUT_PAYMENT_KEY = 'cart_pending_payment'
export const CONFIRMED_CHECKOUT_PAYMENT_KEY = 'cart_payment_result'
export const CHECKOUT_STATE_KEY = 'cart_checkout_state'

import type { NormalizedPaymentStatus } from '../types/payment'

export interface PendingCheckoutPayment {
  orderId: string
  paymentMethod: 'pix' | 'boleto'
  isPaid?: false
  paymentStatus?: NormalizedPaymentStatus
  pixQrCode?: string
  pixPayload?: string
  expirationDate?: string
  bankSlipUrl?: string
  identificationField?: string
  dueDate?: string
  paymentId?: string
  paymentAttemptId?: string
  boletoOpened?: boolean
}

export type CheckoutConfirmationType = 'paid' | 'awaiting_boleto' | 'awaiting_payment'

export interface ConfirmedCheckoutPayment {
  orderId: string
  paymentMethod: string
  isPaid: boolean
  confirmationType: CheckoutConfirmationType
  paymentStatus?: NormalizedPaymentStatus
  status?: string
  paymentId?: string
  paymentAttemptId?: string
  cartId?: string | null
}

export interface StoredCheckoutState {
  cartId?: string | null
  orderId?: string
  paymentAttemptId?: string
  confirmedOrderId?: string
}

export function getStoredCheckoutState(): StoredCheckoutState | null {
  try {
    const saved = sessionStorage.getItem(CHECKOUT_STATE_KEY)
    if (!saved) return null
    return JSON.parse(saved) as StoredCheckoutState
  } catch {
    return null
  }
}

export function setStoredCheckoutState(state: StoredCheckoutState): void {
  sessionStorage.setItem(CHECKOUT_STATE_KEY, JSON.stringify(state))
}

export function clearStoredCheckoutState(): void {
  sessionStorage.removeItem(CHECKOUT_STATE_KEY)
}

export function getPendingCheckoutPayment(): PendingCheckoutPayment | null {
  try {
    const saved = sessionStorage.getItem(PENDING_CHECKOUT_PAYMENT_KEY)
    if (saved) {
      const parsed = JSON.parse(saved) as PendingCheckoutPayment
      if (parsed?.orderId && parsed?.paymentMethod) return parsed
    }

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
    if (!parsed?.orderId) return null
    if (parsed.confirmationType) return parsed
    if (parsed.isPaid === true) {
      return {
        ...parsed,
        isPaid: true,
        confirmationType: 'paid',
      }
    }
    return null
  } catch {
    return null
  }
}

export function setConfirmedCheckoutPayment(payment: ConfirmedCheckoutPayment): void {
  sessionStorage.setItem(CONFIRMED_CHECKOUT_PAYMENT_KEY, JSON.stringify(payment))
  setStoredCheckoutState({
    cartId: payment.cartId,
    orderId: payment.orderId,
    paymentAttemptId: payment.paymentAttemptId,
    confirmedOrderId: payment.isPaid ? payment.orderId : undefined,
  })
}

export function clearConfirmedCheckoutPayment(): void {
  sessionStorage.removeItem(CONFIRMED_CHECKOUT_PAYMENT_KEY)
}

export function resolveCheckoutState(input: {
  cartId: string | null
  orderId?: string | null
  cartItems: Array<{ id: string }>
  storedCheckoutState: StoredCheckoutState | null
  confirmedPayment: ConfirmedCheckoutPayment | null
  pendingPayment: PendingCheckoutPayment | null
}): {
  shouldReset: boolean
  clearConfirmed: boolean
  clearPending: boolean
  clearStoredState: boolean
} {
  const { cartId, cartItems, storedCheckoutState, confirmedPayment, pendingPayment } = input
  const hasCartItems = cartItems.length > 0

  if (hasCartItems && confirmedPayment) {
    const belongsToCurrentCart =
      storedCheckoutState?.cartId != null &&
      cartId != null &&
      storedCheckoutState.cartId === cartId &&
      storedCheckoutState.confirmedOrderId === confirmedPayment.orderId

    if (!belongsToCurrentCart) {
      return {
        shouldReset: true,
        clearConfirmed: true,
        clearPending: true,
        clearStoredState: true,
      }
    }
  }

  if (hasCartItems && pendingPayment && storedCheckoutState?.orderId) {
    const pendingBelongsToCart =
      storedCheckoutState.cartId != null && cartId != null && storedCheckoutState.cartId === cartId
    if (!pendingBelongsToCart && !confirmedPayment) {
      return {
        shouldReset: true,
        clearConfirmed: false,
        clearPending: true,
        clearStoredState: true,
      }
    }
  }

  if (storedCheckoutState?.cartId && cartId && storedCheckoutState.cartId !== cartId) {
    return {
      shouldReset: true,
      clearConfirmed: true,
      clearPending: true,
      clearStoredState: true,
    }
  }

  return {
    shouldReset: false,
    clearConfirmed: false,
    clearPending: false,
    clearStoredState: false,
  }
}

/** Step 4 após pagamento confirmado ou boleto aberto; step 3 enquanto aguarda PIX/boleto. */
export function resolveCheckoutStep(
  checkoutStep: string,
  pendingPayment: PendingCheckoutPayment | null,
  confirmedPayment: ConfirmedCheckoutPayment | null
): 'cart' | 'delivery' | 'payment' | 'confirmed' {
  if (confirmedPayment?.confirmationType === 'paid' || confirmedPayment?.confirmationType === 'awaiting_boleto') {
    return 'confirmed'
  }
  if (confirmedPayment?.isPaid) return 'confirmed'
  if (pendingPayment) return 'payment'
  if (checkoutStep === 'cart' || checkoutStep === 'delivery' || checkoutStep === 'payment' || checkoutStep === 'confirmed') {
    return checkoutStep === 'confirmed' ? 'payment' : checkoutStep
  }
  return 'cart'
}

export function shouldClearCartAfterPayment(
  paymentMethod: string,
  paymentStatus?: string | null
): boolean {
  if (paymentMethod === 'pix' || paymentMethod === 'boleto') return false
  return paymentStatus === 'confirmed'
}

const PAID_ORDER_STATUSES = new Set([
  'CONFIRMED',
  'RECEIVED',
  'RECEIVED_IN_CASH',
  'PAID',
  'APPROVED',
  'AUTHORIZED',
])

const FULFILLMENT_STARTED_STATUSES = new Set([
  'PROCESSING',
  'READY_FOR_SHIPPING',
  'SHIPPED',
  'DELIVERED',
  'DISTRIBUTOR_INFORMED',
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
  const normalized = normalizeOrderStatus(status)
  return PAID_ORDER_STATUSES.has(normalized) || FULFILLMENT_STARTED_STATUSES.has(normalized)
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

export function createPaymentIdempotencyKey(orderId: string): string {
  return `${orderId}:${Date.now()}`
}
