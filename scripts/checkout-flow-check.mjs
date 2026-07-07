import assert from 'node:assert/strict'

const PAID_ORDER_STATUSES = new Set([
  'CONFIRMED',
  'RECEIVED',
  'RECEIVED_IN_CASH',
  'PAID',
  'APPROVED',
  'AUTHORIZED',
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
  return PAID_ORDER_STATUSES.has(String(status || '').toUpperCase())
}

function isPendingPaymentOrderStatus(status) {
  return PENDING_PAYMENT_STATUSES.has(String(status || '').toUpperCase())
}

function resolveCheckoutStep(checkoutStep, pendingPayment, confirmedPayment) {
  if (confirmedPayment?.isPaid) return 'confirmed'
  if (pendingPayment) return 'payment'
  if (checkoutStep === 'cart' || checkoutStep === 'delivery' || checkoutStep === 'payment' || checkoutStep === 'confirmed') {
    return checkoutStep === 'confirmed' ? 'payment' : checkoutStep
  }
  return 'cart'
}

function shouldClearCartAfterPayment(paymentMethod, status) {
  if (paymentMethod === 'pix' || paymentMethod === 'boleto') return false
  if (paymentMethod === 'credit_card' || paymentMethod === 'debit') {
    return isPaidOrderStatus(status || '')
  }
  return isPaidOrderStatus(status || '')
}

assert.equal(
  resolveCheckoutStep('payment', { orderId: 'o1', paymentMethod: 'pix' }, null),
  'payment'
)
assert.equal(
  resolveCheckoutStep('payment', null, { orderId: 'o1', paymentMethod: 'pix', isPaid: true }),
  'confirmed'
)
assert.equal(
  resolveCheckoutStep('confirmed', { orderId: 'o1', paymentMethod: 'pix' }, null),
  'payment'
)

assert.equal(shouldClearCartAfterPayment('pix'), false)
assert.equal(shouldClearCartAfterPayment('boleto'), false)
assert.equal(shouldClearCartAfterPayment('credit_card', 'PENDING'), false)
assert.equal(shouldClearCartAfterPayment('debit', 'PENDING'), false)
assert.equal(shouldClearCartAfterPayment('credit_card', 'CONFIRMED'), true)
assert.equal(shouldClearCartAfterPayment('debit', 'RECEIVED'), true)

assert.equal(isPaidOrderStatus('CONFIRMED'), true)
assert.equal(isPendingPaymentOrderStatus('PENDING'), true)
assert.equal(isPendingPaymentOrderStatus('CONFIRMED'), false)

console.log('checkout-flow-check: all assertions passed')
