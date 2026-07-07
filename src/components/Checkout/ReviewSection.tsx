import { Edit2 } from 'lucide-react'
import type { PaymentMethod } from '../../types/checkout'
import type { CartItem } from '../../types'
import type { SavedAddress } from '../../services/address.service'

interface ReviewSectionProps {
  items: CartItem[]
  formData: {
    address: string
    number: string
    complement: string
    bairro: string
    city: string
    state: string
    cep: string
  }
  selectedAddressId: string | null
  savedAddresses: SavedAddress[]
  paymentMethod: PaymentMethod
  paymentMethodLabel: string
  shippingService: string | null
  shippingCost: number
  hasFreeShipping: boolean
  currentTotal: number
  promoCodeDiscount: number
  promotionDiscount: number
  appliedPromoCodes: string[]
  cardInstallments?: number
  onEditStep: (step: 'cart' | 'delivery' | 'payment') => void
}

const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  pix: 'PIX',
  credit_card: 'Cartão de crédito',
  boleto: 'Boleto bancário',
}

export default function ReviewSection({
  items,
  formData,
  selectedAddressId,
  savedAddresses,
  paymentMethod,
  paymentMethodLabel,
  shippingService,
  shippingCost,
  hasFreeShipping,
  currentTotal,
  promoCodeDiscount,
  promotionDiscount,
  appliedPromoCodes,
  cardInstallments,
  onEditStep,
}: ReviewSectionProps) {
  const addressNickname = selectedAddressId
    ? savedAddresses.find((a) => a.id === selectedAddressId)?.nickname
    : null

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 p-4 sm:p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-gray-900 dark:text-white">Produtos</h3>
          <button
            type="button"
            onClick={() => onEditStep('cart')}
            className="text-xs font-bold text-[#00A86B] hover:underline flex items-center gap-1"
          >
            <Edit2 size={12} /> Editar
          </button>
        </div>
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.id} className="flex justify-between text-sm gap-3">
              <span className="text-gray-700 dark:text-gray-300 line-clamp-1">
                {item.quantity}x {item.product?.name || 'Produto'}
              </span>
              <span className="font-bold text-gray-900 dark:text-white flex-shrink-0">
                R$ {((item.product?.promo_price ?? item.product?.price ?? 0) * item.quantity)
                  .toFixed(2)
                  .replace('.', ',')}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 p-4 sm:p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-gray-900 dark:text-white">Entrega</h3>
          <button
            type="button"
            onClick={() => onEditStep('delivery')}
            className="text-xs font-bold text-[#00A86B] hover:underline flex items-center gap-1"
          >
            <Edit2 size={12} /> Editar
          </button>
        </div>
        <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
          {addressNickname || 'Endereço de entrega'}
        </p>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          {formData.address}, {formData.number}
          {formData.complement ? ` - ${formData.complement}` : ''}
        </p>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {formData.bairro ? `${formData.bairro}, ` : ''}
          {formData.city} - {formData.state} • CEP {formData.cep}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
          Frete: {hasFreeShipping ? 'Grátis' : `R$ ${shippingCost.toFixed(2).replace('.', ',')}`}
          {shippingService ? ` via ${shippingService}` : ''}
        </p>
      </div>

      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 p-4 sm:p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-gray-900 dark:text-white">Pagamento</h3>
          <button
            type="button"
            onClick={() => onEditStep('payment')}
            className="text-xs font-bold text-[#00A86B] hover:underline flex items-center gap-1"
          >
            <Edit2 size={12} /> Editar
          </button>
        </div>
        <p className="text-sm text-gray-700 dark:text-gray-300">
          {paymentMethodLabel || PAYMENT_LABELS[paymentMethod]}
          {paymentMethod === 'credit_card' && cardInstallments
            ? ` • ${cardInstallments}x`
            : ''}
        </p>
      </div>

      {(promoCodeDiscount > 0 || promotionDiscount > 0) && (
        <div className="rounded-2xl border border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/10 p-4 sm:p-5">
          <h3 className="font-bold text-gray-900 dark:text-white mb-2">Descontos</h3>
          {appliedPromoCodes.length > 0 && promoCodeDiscount > 0 && (
            <p className="text-sm text-green-700 dark:text-green-400">
              Cupom ({appliedPromoCodes.join(', ')}): - R$ {promoCodeDiscount.toFixed(2).replace('.', ',')}
            </p>
          )}
          {promotionDiscount > 0 && (
            <p className="text-sm text-green-700 dark:text-green-400">
              Promoções: - R$ {promotionDiscount.toFixed(2).replace('.', ',')}
            </p>
          )}
        </div>
      )}

      <div className="rounded-2xl border-2 border-primary-200 dark:border-primary-800 bg-primary-50/30 dark:bg-primary-950/10 p-4 sm:p-5">
        <div className="flex justify-between items-center">
          <span className="text-lg font-extrabold text-gray-900 dark:text-white">Total</span>
          <span className="text-2xl font-black text-primary-600 dark:text-primary-400">
            R$ {currentTotal.toFixed(2).replace('.', ',')}
          </span>
        </div>
      </div>
    </div>
  )
}
