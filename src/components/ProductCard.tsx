import { Link } from 'react-router-dom'
import { ShoppingCart } from 'lucide-react'
import { Product } from '../types'
import { useCart } from '../context/CartContext'
import { PRODUCT_IMAGE_FALLBACK, handleImageError } from '../utils/imageFallback'

interface ProductCardProps {
  product: Product
}

export default function ProductCard({ product }: ProductCardProps) {
  const { addProduct } = useCart()

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    addProduct(product, 1)
  }

  // Garante que sempre temos uma URL de imagem válida
  const imageUrl = product.image && product.image.trim() !== '' 
    ? product.image 
    : PRODUCT_IMAGE_FALLBACK

  return (
    <Link to={`/produtos/${product.id}`} className="block">
      {/* Mobile Layout - Horizontal (Mercado Livre style) */}
      <div className="flex sm:flex-col bg-white dark:bg-gray-800 border-b sm:border sm:border-gray-200 dark:border-gray-700 sm:rounded-lg overflow-hidden sm:shadow-sm dark:sm:shadow-lg transition-all hover:bg-gray-50 dark:hover:bg-gray-600 sm:hover:shadow-md dark:sm:hover:shadow-xl">
        {/* Image Container */}
        <div className="relative flex-shrink-0 sm:w-full p-2 sm:p-0 sm:mb-0">
          <div className="w-24 h-24 sm:w-full sm:h-40 lg:h-48 bg-gray-100 dark:bg-gray-700 rounded-lg sm:rounded-none sm:rounded-t-lg overflow-hidden flex items-center justify-center">
            <img
              src={imageUrl}
              alt={product.name}
              className="w-full h-full object-cover"
              onError={(e) => handleImageError(e, PRODUCT_IMAGE_FALLBACK)}
            />
          </div>

          {!product.inStock && (
            <div className="absolute inset-0 bg-gray-900 bg-opacity-50 rounded-lg sm:rounded-none sm:rounded-t-lg flex items-center justify-center">
              <span className="text-white font-semibold text-xs sm:text-sm lg:text-base">Fora de Estoque</span>
            </div>
          )}
        </div>

        {/* Content Container */}
        <div className="flex-1 min-w-0 sm:w-full flex flex-col justify-between p-3 sm:p-4 lg:p-6">
          {/* Product Info */}
          <div className="flex-1 mb-2 sm:mb-0">
            <h3 className="text-sm sm:text-base lg:text-lg xl:text-xl font-semibold text-gray-900 dark:text-white mb-1 sm:mb-2 line-clamp-2 sm:line-clamp-3">{product.name}</h3>
            <p className="text-[10px] sm:text-xs lg:text-sm text-gray-600 dark:text-gray-300 mb-2 sm:mb-3 lg:mb-4 line-clamp-2 hidden sm:block">{product.description}</p>
            
            {/* Frete grátis badge - Mobile */}
            {product.free_shipping && (
              <div className="sm:hidden mb-2">
                <span className="text-[10px] text-green-600 dark:text-green-400 font-medium">Frete grátis</span>
              </div>
            )}
          </div>

          {/* Price and Action */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
              {product.promo_price ? (
                <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-base sm:text-lg lg:text-xl xl:text-2xl font-bold text-red-600 dark:text-red-400">
                      R$ {Number(product.promo_price || 0).toFixed(2).replace('.', ',')}
                    </span>
                    <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 line-through">
                      R$ {Number(product.price || 0).toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                  <span className="text-[10px] sm:text-xs text-red-600 dark:text-red-400 font-medium">
                    {Math.round(((Number(product.price) - Number(product.promo_price)) / Number(product.price)) * 100)}% OFF
                  </span>
                </div>
              ) : (
                <span className="text-base sm:text-lg lg:text-xl xl:text-2xl font-bold text-primary-600 dark:text-primary-400">
                  R$ {Number(product.price || 0).toFixed(2).replace('.', ',')}
                </span>
              )}
              {/* Frete grátis badge - Desktop */}
              {product.free_shipping && (
                <span className="hidden sm:inline text-xs text-green-600 dark:text-green-400 font-medium">Frete grátis</span>
              )}
            </div>
            <button
              onClick={handleAddToCart}
              disabled={!product.inStock}
              className="disabled:bg-gray-300 disabled:cursor-not-allowed text-white p-2 sm:p-2.5 rounded-lg transition-colors hover:opacity-90 flex-shrink-0"
              style={{ backgroundColor: product.inStock ? '#67C090' : undefined }}
            >
              <ShoppingCart size={16} className="sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>
      </div>
    </Link>
  )
}







