import { Link } from 'react-router-dom'
import { Minus, Plus, Trash2 } from 'lucide-react'
import { CartItem } from '../../types'
import { PRODUCT_IMAGE_FALLBACK, handleImageError } from '../../utils/imageFallback'
import { generateProductUrl } from '../../utils/productUrl'

interface CartItemCardProps {
  item: CartItem
  onUpdateQuantity: (id: string, quantity: number) => void
  onRemove: (id: string) => void
  getImageUrl: (image: string | null | undefined) => string
}

function getEffectivePrice(item: CartItem): { current: number; original: number; hasPromo: boolean } {
  const product = item.product
  if (!product) return { current: 0, original: 0, hasPromo: false }

  const original = product.price
  const promo = product.promo_price != null && product.promo_price > 0 ? product.promo_price : null
  const current = promo ?? original

  return {
    current,
    original,
    hasPromo: promo != null && promo < original,
  }
}

export default function CartItemCard({
  item,
  onUpdateQuantity,
  onRemove,
  getImageUrl,
}: CartItemCardProps) {
  const { current, original, hasPromo } = getEffectivePrice(item)
  const lineTotal = current * item.quantity
  const lineOriginal = original * item.quantity
  const savings = hasPromo ? lineOriginal - lineTotal : 0

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl sm:rounded-3xl shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all duration-300 overflow-hidden animate-fade-in">
      <div className="p-4 sm:p-5 flex gap-4 items-center">
        {item.product && (
          <Link
            to={generateProductUrl(item.product)}
            className="w-20 h-20 sm:w-24 sm:h-24 bg-white rounded-xl flex items-center justify-center p-2 flex-shrink-0 border border-gray-100 dark:border-gray-700"
          >
            <img
              src={getImageUrl(item.product.image)}
              alt={item.product.name}
              className="max-w-full max-h-full object-contain"
              onError={(e) => handleImageError(e, PRODUCT_IMAGE_FALLBACK)}
            />
          </Link>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              {item.product ? (
                <Link
                  to={generateProductUrl(item.product)}
                  className="text-sm sm:text-base font-extrabold text-gray-900 dark:text-white line-clamp-2 hover:text-primary-600 transition-colors"
                >
                  {item.product.name}
                </Link>
              ) : (
                <h3 className="text-sm font-extrabold text-gray-900 dark:text-white">Produto indisponível</h3>
              )}
            </div>
            <button
              type="button"
              onClick={() => onRemove(item.id)}
              className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/10 rounded-xl transition-all flex-shrink-0"
              aria-label="Remover"
            >
              <Trash2 size={15} />
            </button>
          </div>

          <div className="flex flex-wrap items-end justify-between gap-3 mt-3">
            <div className="flex items-center bg-gray-50 dark:bg-gray-900 rounded-xl p-1 border border-gray-100 dark:border-gray-700">
              <button
                type="button"
                onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                disabled={item.quantity <= 1}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white dark:hover:bg-gray-800 disabled:opacity-30 transition-all"
              >
                <Minus size={12} />
              </button>
              <span className="w-8 text-center text-xs font-black text-gray-900 dark:text-white">
                {item.quantity}
              </span>
              <button
                type="button"
                onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white dark:hover:bg-gray-800 transition-all"
              >
                <Plus size={12} />
              </button>
            </div>

            <div className="text-right">
              {hasPromo && (
                <p className="text-[10px] text-gray-400 line-through">
                  R$ {lineOriginal.toFixed(2).replace('.', ',')}
                </p>
              )}
              <p className="text-base sm:text-lg font-black text-primary-700 dark:text-primary-400">
                R$ {lineTotal.toFixed(2).replace('.', ',')}
              </p>
              {savings > 0 && (
                <p className="text-[10px] font-bold text-green-600 dark:text-green-400">
                  Economia R$ {savings.toFixed(2).replace('.', ',')}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
