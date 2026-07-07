export type CheckoutStep = 'cart' | 'delivery' | 'payment' | 'confirmed'

export type PaymentMethod = 'pix' | 'boleto' | 'credit_card'

export const CHECKOUT_STEPS: { id: CheckoutStep; label: string }[] = [
  { id: 'cart', label: 'Carrinho' },
  { id: 'delivery', label: 'Entrega' },
  { id: 'payment', label: 'Pagamento' },
  { id: 'confirmed', label: 'Concluído' },
]

export function getStepIndex(step: CheckoutStep): number {
  return CHECKOUT_STEPS.findIndex((s) => s.id === step)
}

export function parseCheckoutStep(value: string | null): CheckoutStep | null {
  if (value === 'cart' || value === 'delivery' || value === 'payment' || value === 'confirmed') {
    return value
  }
  return null
}
