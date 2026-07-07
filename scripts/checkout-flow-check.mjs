import assert from 'node:assert/strict'

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

const PENDING_PAYMENT_STATUSES = new Set([
  'PENDING',
  'PENDING_PAYMENT',
  'AWAITING_RISK_ANALYSIS',
  'OVERDUE',
  'DUNNING_REQUESTED',
  'DUNNING_RECEIVED',
])

function isPaidOrderStatus(status) {
  const normalized = String(status || '').toUpperCase()
  return PAID_ORDER_STATUSES.has(normalized) || FULFILLMENT_STARTED_STATUSES.has(normalized)
}

function isPendingPaymentOrderStatus(status) {
  return PENDING_PAYMENT_STATUSES.has(String(status || '').toUpperCase())
}

function resolveCheckoutStep(checkoutStep, pendingPayment, confirmedPayment) {
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

function shouldClearCartAfterPayment(paymentMethod, paymentStatus) {
  if (paymentMethod === 'pix' || paymentMethod === 'boleto') return false
  return paymentStatus === 'confirmed'
}

function resolveCheckoutState({ cartId, cartItems, storedCheckoutState, confirmedPayment }) {
  const hasCartItems = cartItems.length > 0
  if (hasCartItems && confirmedPayment) {
    const belongsToCurrentCart =
      storedCheckoutState?.cartId != null &&
      cartId != null &&
      storedCheckoutState.cartId === cartId &&
      storedCheckoutState.confirmedOrderId === confirmedPayment.orderId
    if (!belongsToCurrentCart) {
      return { shouldReset: true, clearConfirmed: true, clearPending: true, clearStoredState: true }
    }
  }
  if (storedCheckoutState?.cartId && cartId && storedCheckoutState.cartId !== cartId) {
    return { shouldReset: true, clearConfirmed: true, clearPending: true, clearStoredState: true }
  }
  return { shouldReset: false, clearConfirmed: false, clearPending: false, clearStoredState: false }
}

function unwrapNormalizedPaymentResult(raw) {
  if (!raw || typeof raw !== 'object') return null
  if (raw.paymentStatus) return raw
  if (raw.data?.paymentStatus) return raw.data
  if (raw.data?.data?.paymentStatus) return raw.data.data
  if (raw.status && raw.orderId) {
    const status = String(raw.status).toUpperCase()
    const paid = ['CONFIRMED', 'RECEIVED', 'RECEIVED_IN_CASH', 'APPROVED', 'AUTHORIZED'].includes(status)
    return {
      paymentStatus: paid ? 'confirmed' : 'processing',
      shouldAdvanceToConfirmation: paid,
      shouldClearCart: paid,
    }
  }
  return null
}

assert.equal(
  resolveCheckoutStep('payment', { orderId: 'o1', paymentMethod: 'pix' }, null),
  'payment'
)
assert.equal(
  resolveCheckoutStep('payment', null, { orderId: 'o1', paymentMethod: 'pix', isPaid: true, confirmationType: 'paid' }),
  'confirmed'
)
assert.equal(
  resolveCheckoutStep('payment', null, { orderId: 'o1', paymentMethod: 'boleto', isPaid: false, confirmationType: 'awaiting_boleto' }),
  'confirmed'
)
assert.equal(
  resolveCheckoutStep('confirmed', { orderId: 'o1', paymentMethod: 'pix' }, null),
  'payment'
)

assert.equal(shouldClearCartAfterPayment('pix'), false)
assert.equal(shouldClearCartAfterPayment('boleto'), false)
assert.equal(shouldClearCartAfterPayment('credit_card', 'processing'), false)
assert.equal(shouldClearCartAfterPayment('credit_card', 'confirmed'), true)

assert.equal(isPaidOrderStatus('CONFIRMED'), true)
assert.equal(isPaidOrderStatus('PROCESSING'), true)
assert.equal(isPendingPaymentOrderStatus('PENDING'), true)
assert.equal(isPendingPaymentOrderStatus('CONFIRMED'), false)

const stale = resolveCheckoutState({
  cartId: 'cart-2',
  cartItems: [{ id: 'item-1' }],
  storedCheckoutState: { cartId: 'cart-1', confirmedOrderId: 'order-1' },
  confirmedPayment: { orderId: 'order-1', isPaid: true, confirmationType: 'paid' },
})
assert.equal(stale.shouldReset, true)
assert.equal(stale.clearConfirmed, true)

const confirmedCard = unwrapNormalizedPaymentResult({
  success: true,
  data: {
    success: true,
    data: {
      orderId: 'order-1',
      providerStatus: 'CONFIRMED',
      paymentStatus: 'confirmed',
      shouldAdvanceToConfirmation: true,
      shouldClearCart: true,
    },
  },
})
assert.equal(confirmedCard.paymentStatus, 'confirmed')
assert.equal(confirmedCard.shouldAdvanceToConfirmation, true)

const legacyConfirmed = unwrapNormalizedPaymentResult({
  orderId: 'order-1',
  status: 'CONFIRMED',
  paymentMethod: 'credit_card',
})
assert.equal(legacyConfirmed.paymentStatus, 'confirmed')
assert.equal(legacyConfirmed.shouldAdvanceToConfirmation, true)

console.log('checkout-flow-check: all assertions passed')
