import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ShoppingCart, Check } from 'lucide-react'
import { Product } from '../types'
import { useCart } from '../context/CartContext'
import { PRODUCT_IMAGE_FALLBACK, handleImageError } from '../utils/imageFallback'

interface ProductCardProps {
  product: Product
}

export default function ProductCard({ product }: ProductCardProps) {
  const { addProduct } = useCart()
  const [isAdded, setIsAdded] = useState(false)

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    addProduct(product, 1)
    setIsAdded(true)
    setTimeout(() => {
      setIsAdded(false)
    }, 1500)
  }

  // Garante que sempre temos uma URL de imagem válida
  const imageUrl = product.image && product.image.trim() !== '' 
    ? product.image 
    : PRODUCT_IMAGE_FALLBACK

  return (
    <Link to={`/produtos/${product.id}`} className="block h-full">
      {/* Mobile Layout - Horizontal (Mercado Livre style) / Desktop - Vertical (Equal Height) */}
      <div className="flex sm:flex-col h-full bg-white dark:bg-gray-800 border-b sm:border sm:border-gray-200 dark:border-gray-700 sm:rounded-lg overflow-hidden sm:shadow-sm dark:sm:shadow-lg transition-all hover:bg-gray-50 dark:hover:bg-gray-600 sm:hover:shadow-md dark:sm:hover:shadow-xl">
        {/* Image Container */}
        <div className="relative flex-shrink-0 sm:w-full p-2 sm:p-0">
          <div className="w-24 h-24 sm:w-full sm:h-40 lg:h-48 bg-white dark:bg-gray-900 overflow-hidden flex items-center justify-center border-b border-gray-200 dark:border-gray-700">
            <img
              src={imageUrl}
              alt={product.name}
              className="w-full h-full object-contain p-3 hover:scale-105 transition-transform duration-300"
              onError={(e) => handleImageError(e, PRODUCT_IMAGE_FALLBACK)}
            />
          </div>

          {!product.active && (
            <div className="absolute inset-0 bg-gray-900 bg-opacity-50 rounded-lg sm:rounded-none sm:rounded-t-lg flex items-center justify-center">
              <span className="text-white font-semibold text-xs sm:text-sm">Inativo</span>
            </div>
          )}
        </div>

        {/* Content Container (Simplified & Standardized Height) */}
        <div className="flex-1 min-w-0 sm:w-full flex flex-col justify-between p-3 sm:p-4">
          {/* Product Info */}
          <div className="flex-1 mb-2 sm:mb-3">
            <h3 className="text-xs sm:text-sm lg:text-base font-semibold text-gray-900 dark:text-white line-clamp-2">{product.name}</h3>
            
            <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 line-clamp-3 mt-1 mb-1">
              {product.description || 'Fórmula manipulada com alto padrão de qualidade e eficácia.'}
            </p>
            
            {/* Frete grátis badge - Mobile */}
            {product.free_shipping && (
              <div className="sm:hidden mb-1">
                <span className="text-[9px] text-green-600 dark:text-green-400 font-semibold bg-green-50 dark:bg-green-900/30 px-1.5 py-0.5 rounded">Frete grátis</span>
              </div>
            )}
          </div>

          {/* Price and Action */}
          <div className="flex items-center justify-between gap-1.5 pt-2 border-t border-gray-50 dark:border-gray-700/30">
            <div className="flex flex-col">
              {product.promo_price ? (
                <div className="flex flex-col">
                  <span className="text-[10px] text-gray-400 line-through">
                    R$ {Number(product.price || 0).toFixed(2).replace('.', ',')}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm sm:text-base font-bold text-red-650 dark:text-red-400">
                      R$ {Number(product.promo_price || 0).toFixed(2).replace('.', ',')}
                    </span>
                    <span className="text-[9px] text-red-500 font-semibold">
                      {Math.round(((Number(product.price) - Number(product.promo_price)) / Number(product.price)) * 100)}% OFF
                    </span>
                  </div>
                </div>
              ) : (
                <span className="text-sm sm:text-base font-bold text-primary-600 dark:text-primary-400">
                  R$ {Number(product.price || 0).toFixed(2).replace('.', ',')}
                </span>
              )}
              {/* Frete grátis badge - Desktop */}
              {product.free_shipping && (
                <span className="hidden sm:inline text-[10px] text-green-600 dark:text-green-400 font-semibold mt-0.5">Frete grátis</span>
              )}
            </div>
            <button
              onClick={handleAddToCart}
              disabled={!product.active}
              className={`disabled:bg-gray-300 disabled:cursor-not-allowed text-white p-2 rounded-lg transition-all flex-shrink-0 flex items-center justify-center ${
                isAdded 
                  ? 'bg-green-500 scale-110 active:scale-95' 
                  : 'bg-primary-600 hover:scale-105 active:scale-95'
              }`}
            >
              {isAdded ? (
                <Check size={14} className="sm:w-4.5 sm:h-4.5" />
              ) : (
                <ShoppingCart size={14} className="sm:w-4.5 sm:h-4.5" />
              )}
            </button>
          </div>
        </div>
      </div>
    </Link>
  )
}







