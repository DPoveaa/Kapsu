import { ReactNode } from 'react'
import { ArrowRight, Calendar, Check, ChevronLeft, ChevronRight, Loader2, Tag, X } from 'lucide-react'
import type { PaymentMethod } from '../../types/checkout'
import type { CartItem } from '../../types'
import type { MultiplePromoCodesValidation } from '../../services/promo-codes.service'
import type { ShippingOption } from '../../services/shipping.service'

export interface OrderSummaryProps {
  mode: 'cart' | 'checkout'
  items: CartItem[]
  baseTotal: number
  promotionDiscount: number
  promoCodesValidation: MultiplePromoCodesValidation | null
  appliedPromoCodes: string[]
  promoCode: string
  onPromoCodeChange: (value: string) => void
  onValidatePromoCode: () => void
  onRemovePromoCode: (code: string) => void
  validatingPromoCode: boolean
  promoCodeError: string | null
  currentCouponIndex: number
  onCouponIndexChange: (index: number) => void
  freeShippingThreshold: number
  isFreeShippingApplicable: boolean
  hasFreeShipping: boolean
  totalAfterPromotions: number
  shippingCep: string
  calculatingShipping: boolean
  hasInvalidCep: boolean
  shippingFee: number | null
  shippingCost: number
  displayedDeliveryTime: number | null
  displayedDeliveryTimeType: 'business' | 'calendar' | null
  displayedEstimatedDate: string
  service: string | null
  currentTotal: number
  selectedPaymentMethod?: PaymentMethod
  cardInstallmentLabel?: string
  quotedShippingFee?: number | null
  options?: ShippingOption[]
  primaryAction?: ReactNode
  secondaryAction?: ReactNode
}

export default function OrderSummary({
  mode,
  items,
  baseTotal,
  promotionDiscount,
  promoCodesValidation,
  appliedPromoCodes,
  promoCode,
  onPromoCodeChange,
  onValidatePromoCode,
  onRemovePromoCode,
  validatingPromoCode,
  promoCodeError,
  currentCouponIndex,
  onCouponIndexChange,
  freeShippingThreshold,
  hasFreeShipping,
  totalAfterPromotions,
  shippingCep,
  calculatingShipping,
  hasInvalidCep,
  shippingFee,
  shippingCost,
  displayedDeliveryTime,
  displayedDeliveryTimeType,
  displayedEstimatedDate,
  service,
  currentTotal,
  selectedPaymentMethod,
  cardInstallmentLabel,
  quotedShippingFee,
  options = [],
  primaryAction,
  secondaryAction,
}: OrderSummaryProps) {
  const showCoupons = mode === 'cart' || mode === 'checkout'

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl sm:rounded-3xl shadow-lg border border-gray-200 dark:border-gray-700 p-5 sm:p-6 lg:sticky lg:top-24 animate-fade-in">
      <h2 className="text-sm sm:text-base font-black text-gray-900 dark:text-white mb-4 uppercase tracking-wider">
        Resumo do pedido
      </h2>

      {mode === 'checkout' && (
        <div className="space-y-2 mb-4 max-h-[180px] overflow-y-auto pr-1">
          {items.map((item) => {
            const price = item.product?.promo_price ?? item.product?.price ?? 0
            return (
              <div key={item.id} className="text-xs pb-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                <p className="font-semibold text-gray-800 dark:text-gray-200 line-clamp-2">{item.product?.name}</p>
                <div className="flex justify-between text-gray-500 mt-1">
                  <span>Qtd: {item.quantity}</span>
                  <span className="font-bold">R$ {(price * item.quantity).toFixed(2).replace('.', ',')}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showCoupons && freeShippingThreshold > 0 && mode === 'cart' && (
        <div className="mb-5 p-4 bg-gray-50/50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl">
          <span className="text-xs font-black text-gray-800 dark:text-gray-200 block">
            {hasFreeShipping || totalAfterPromotions >= freeShippingThreshold ? (
              <span className="text-green-600 dark:text-green-400">Você ganhou Frete Grátis!</span>
            ) : (
              <span>
                Adicione mais{' '}
                <strong className="text-primary-600">
                  R$ {Math.max(0, freeShippingThreshold - totalAfterPromotions).toFixed(2).replace('.', ',')}
                </strong>{' '}
                para Frete Grátis
              </span>
            )}
          </span>
          <div className="w-full bg-gray-200 dark:bg-gray-800 h-2 rounded-full overflow-hidden mt-3">
            <div
              className={`h-full rounded-full transition-all ${hasFreeShipping || totalAfterPromotions >= freeShippingThreshold ? 'bg-green-500' : 'bg-primary-600'}`}
              style={{
                width: `${hasFreeShipping || totalAfterPromotions >= freeShippingThreshold ? 100 : Math.min(100, (totalAfterPromotions / freeShippingThreshold) * 100)}%`,
              }}
            />
          </div>
        </div>
      )}

      {showCoupons && (
        <div className="mb-5 pb-5 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-xs font-extrabold text-gray-900 dark:text-white mb-3 flex items-center uppercase tracking-wider">
            <Tag className="w-4 h-4 mr-2 text-gray-500" />
            Cupom
          </h3>
          {appliedPromoCodes.length === 0 ? (
            <div className="flex gap-2">
              <input
                type="text"
                value={promoCode}
                onChange={(e) => onPromoCodeChange(e.target.value.toUpperCase())}
                placeholder="CÓDIGO"
                className="flex-1 px-3 py-2 text-xs border border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white rounded-xl uppercase font-bold focus:ring-2 focus:ring-primary-500 outline-none"
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), onValidatePromoCode())}
              />
              <button
                type="button"
                onClick={onValidatePromoCode}
                disabled={validatingPromoCode || !promoCode.trim()}
                className="px-4 py-2 text-xs font-bold bg-primary-600 text-white rounded-xl hover:bg-primary-700 disabled:opacity-50"
              >
                {validatingPromoCode ? <Loader2 className="animate-spin w-4 h-4" /> : 'Aplicar'}
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {promoCodesValidation?.promoCodes.map((pc, index) => (
                <div
                  key={pc.id}
                  className={`flex items-center justify-between gap-2 p-2 rounded-xl bg-green-50 dark:bg-green-950/20 ${index === currentCouponIndex ? '' : 'hidden'
                    }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                    <span className="text-xs font-bold text-green-800 dark:text-green-300 truncate">{pc.code}</span>
                  </div>
                  <button type="button" onClick={() => onRemovePromoCode(pc.code)} className="text-red-500 p-1">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {appliedPromoCodes.length > 1 && (
                <div className="flex justify-center gap-2">
                  <button type="button" onClick={() => onCouponIndexChange(Math.max(0, currentCouponIndex - 1))}>
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      onCouponIndexChange(Math.min(appliedPromoCodes.length - 1, currentCouponIndex + 1))
                    }
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}
          {promoCodeError && <p className="text-xs text-red-500 mt-2">{promoCodeError}</p>}
        </div>
      )}

      <div className="space-y-2.5 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-500 dark:text-gray-400">Subtotal</span>
          <span className="font-bold text-gray-900 dark:text-white">R$ {baseTotal.toFixed(2).replace('.', ',')}</span>
        </div>

        {promotionDiscount > 0 && (
          <div className="flex justify-between text-pink-600 dark:text-pink-400">
            <span>Promoções</span>
            <span className="font-bold">- R$ {promotionDiscount.toFixed(2).replace('.', ',')}</span>
          </div>
        )}

        {promoCodesValidation && promoCodesValidation.totalDiscount > 0 && (
          <div className="flex justify-between text-green-600 dark:text-green-400">
            <span>Cupom</span>
            <span className="font-bold">- R$ {promoCodesValidation.totalDiscount.toFixed(2).replace('.', ',')}</span>
          </div>
        )}

        {(mode === 'checkout' || shippingCep.replace(/\D/g, '').length === 8) && (
          <div className="flex justify-between items-center pt-2 border-t border-gray-100 dark:border-gray-700">
            <span className="text-gray-500 dark:text-gray-400">
              Frete
            </span>
            <div className="font-bold flex items-center justify-end gap-1.5">
              {calculatingShipping ? (
                <Loader2 className="w-4 h-4 animate-spin inline" />
              ) : hasInvalidCep ? (
                <span className="text-red-500 text-xs">Inválido</span>
              ) : (
                <>
                  {(() => {
                    const quoted = quotedShippingFee ?? (options && options[0]?.quotedFee) ?? (options && options[0]?.pricing?.quotedFee) ?? (options && options[0]?.originalFee) ?? null
                    const showOriginal = quoted != null && quoted > (hasFreeShipping ? 0 : shippingCost)
                    return showOriginal ? (
                      <span className="text-xs font-normal text-gray-400 dark:text-gray-500 line-through">
                        R$ {quoted.toFixed(2).replace('.', ',')}
                      </span>
                    ) : null
                  })()}
                  {hasFreeShipping ? (
                    <span className="text-green-600">Grátis</span>
                  ) : shippingFee != null ? (
                    <span>R$ {shippingCost.toFixed(2).replace('.', ',')}</span>
                  ) : (
                    '-'
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {displayedDeliveryTime != null && mode === 'checkout' && !hasInvalidCep && (
          <p className="text-[11px] text-gray-500 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            {displayedDeliveryTime}{' '}
            {displayedDeliveryTimeType === 'business' ? 'dias úteis' : 'dias corridos'}
            {displayedEstimatedDate ? ` • ${displayedEstimatedDate}` : ''}
            {service ? ` • ${service}` : ''}
          </p>
        )}

        {selectedPaymentMethod && mode === 'checkout' && (
          <div className="flex justify-between text-xs text-gray-500">

            <span className="font-semibold capitalize">
              {selectedPaymentMethod === 'credit_card' ? 'Crédito' : selectedPaymentMethod}
              {cardInstallmentLabel ? ` • ${cardInstallmentLabel}` : ''}
            </span>
          </div>
        )}

        <div className="flex justify-between items-center border-t border-gray-200 dark:border-gray-700 pt-3 mt-2">
          <span className="text-base font-extrabold text-gray-900 dark:text-white">Total</span>
          <div className="text-right flex items-baseline justify-end gap-2">
            {(() => {
              const baseTotalOriginal = items.reduce((sum, i) => sum + (i.product ? i.product.price * i.quantity : 0), 0)
              const quotedShipping = quotedShippingFee ?? (options && options[0]?.quotedFee) ?? (options && options[0]?.pricing?.quotedFee) ?? (options && options[0]?.originalFee) ?? (shippingFee || 0)
              const originalTotal = baseTotalOriginal + (hasFreeShipping ? 0 : quotedShipping)
              return originalTotal > currentTotal ? (
                <span className="text-xs sm:text-sm font-normal text-gray-400 dark:text-gray-500 line-through">
                  R$ {originalTotal.toFixed(2).replace('.', ',')}
                </span>
              ) : null
            })()}
            <span className="text-xl sm:text-2xl font-black text-primary-600 dark:text-primary-400">
              R$ {currentTotal.toFixed(2).replace('.', ',')}
            </span>
          </div>
        </div>
      </div>

      {primaryAction && <div className="mt-7 sm:mt-8">{primaryAction}</div>}
      {secondaryAction && <div className="mt-3">{secondaryAction}</div>}
    </div>
  )
}

export function SummaryPrimaryButton({
  onClick,
  disabled,
  loading,
  loadingText,
  children,
}: {
  onClick: () => void
  disabled?: boolean
  loading?: boolean
  loadingText?: string
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className="w-full bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white font-black py-4 px-6 rounded-2xl transition-all flex items-center justify-center gap-2 text-sm shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {loading ? (
        <>
          <Loader2 size={18} className="animate-spin" />
          {loadingText || 'Processando...'}
        </>
      ) : (
        <>
          {children}
          <ArrowRight size={16} />
        </>
      )}
    </button>
  )
}
