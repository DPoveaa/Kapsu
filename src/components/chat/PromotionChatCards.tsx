import { Loader2 } from 'lucide-react'
import { productsService } from '../../services/products.service'
import {
  PromotionCardProduct,
  selectTopPromotionProducts,
  NormalizedPromotionCard
} from '../../utils/promotionCards'

type Props = {
  items: PromotionCardProduct[]
  totalCount?: number
  hasMore?: boolean
  addingState: Record<string, 'loading' | 'success' | undefined>
  onViewProduct: (productId: string) => void
  onAddProduct: (product: PromotionCardProduct, fromElement?: HTMLElement | null) => void
  onViewAll: () => void
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

function PromotionCard({
  product,
  addingState,
  onViewProduct,
  onAddProduct
}: {
  product: NormalizedPromotionCard
  addingState: Record<string, 'loading' | 'success' | undefined>
  onViewProduct: (productId: string) => void
  onAddProduct: (product: PromotionCardProduct, fromElement?: HTMLElement | null) => void
}) {
  const addState = addingState[product.id]

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3 shadow-sm text-left overflow-hidden">
      <div className="flex gap-3 items-start">
        <div className="relative flex-shrink-0 w-[4.5rem] h-[4.5rem] sm:w-20 sm:h-20 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 flex items-center justify-center overflow-hidden">
          {product.image ? (
            <img
              src={productsService.getImageUrl(product.image)}
              alt={product.name}
              className="w-full h-full object-contain p-1.5"
            />
          ) : (
            <span className="text-[10px] text-gray-400 dark:text-gray-500 px-1 text-center">Sem foto</span>
          )}
          {product.discountPercent > 0 && (
            <span className="absolute top-1 left-1 text-[9px] font-bold leading-none bg-red-500 text-white px-1.5 py-1 rounded-md shadow-sm whitespace-nowrap">
              {product.discountPercent}% OFF
            </span>
          )}
        </div>

        <div className="flex-1 min-w-0 flex flex-col gap-1.5">
          {product.categoryLabel && (
            <span className="text-[10px] font-semibold text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-950/40 px-2 py-0.5 rounded-md w-fit max-w-full truncate">
              {product.categoryLabel}
            </span>
          )}
          <h4 className="font-semibold text-xs sm:text-sm text-gray-800 dark:text-gray-100 line-clamp-2 leading-snug break-words">
            {product.name}
          </h4>
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            {product.promoPrice !== null ? (
              <>
                <span className="text-[11px] sm:text-xs text-gray-400 dark:text-gray-500 line-through whitespace-nowrap">
                  {formatCurrency(product.originalPrice)}
                </span>
                <span className="text-sm font-bold text-green-600 dark:text-green-400 whitespace-nowrap">
                  {formatCurrency(product.promoPrice)}
                </span>
              </>
            ) : (
              <span className="text-sm font-bold text-gray-800 dark:text-gray-100 whitespace-nowrap">
                {formatCurrency(product.originalPrice)}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 min-[360px]:grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onViewProduct(product.id)}
          className="w-full min-h-[2rem] px-3 py-1.5 text-center bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg text-[11px] sm:text-xs font-semibold transition-colors cursor-pointer"
        >
          Ver Produto
        </button>
        <button
          type="button"
          onClick={(e) => onAddProduct(product, e.currentTarget)}
          disabled={addState === 'loading'}
          className={`w-full min-h-[2rem] px-3 py-1.5 text-center rounded-lg text-[11px] sm:text-xs font-semibold transition-colors flex items-center justify-center gap-1 cursor-pointer ${
            addState === 'success'
              ? 'bg-green-700 text-white border border-green-500'
              : addState === 'loading'
                ? 'bg-green-600 opacity-70 text-white cursor-not-allowed'
                : 'bg-green-600 hover:bg-green-700 text-white'
          }`}
        >
          {addState === 'loading' ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Adicionando...</span>
            </>
          ) : addState === 'success' ? (
            <span>Adicionado!</span>
          ) : (
            <span>Adicionar</span>
          )}
        </button>
      </div>
    </div>
  )
}

export function PromotionChatCards({
  items,
  totalCount,
  hasMore,
  addingState,
  onViewProduct,
  onAddProduct,
  onViewAll
}: Props) {
  const selection = selectTopPromotionProducts(items, 3)
  const resolvedTotal = totalCount ?? selection.totalCount
  const showViewAll = hasMore ?? selection.hasMore ?? resolvedTotal > 3

  if (selection.visible.length === 0) return null

  return (
    <div className="w-full max-w-[85%] sm:max-w-[80%] space-y-2">
      {selection.visible.map((product) => (
        <PromotionCard
          key={product.id}
          product={product}
          addingState={addingState}
          onViewProduct={onViewProduct}
          onAddProduct={onAddProduct}
        />
      ))}

      {showViewAll && (
        <button
          type="button"
          onClick={onViewAll}
          className="w-full min-h-[2.25rem] px-3 py-2 rounded-lg border border-green-200 dark:border-green-800 bg-green-50 hover:bg-green-100 dark:bg-green-950/30 dark:hover:bg-green-950/50 text-green-700 dark:text-green-300 text-xs font-semibold transition-colors cursor-pointer"
        >
          Ver todas as promoções
        </button>
      )}
    </div>
  )
}
