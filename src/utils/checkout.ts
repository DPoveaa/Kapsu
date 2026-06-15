export const PENDING_CHECKOUT_ORDER_KEY = 'sanare_pending_checkout_order_id'

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
