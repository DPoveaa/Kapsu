import { Link } from 'react-router-dom'
import { ShoppingCart, Sparkles } from 'lucide-react'
import { Product } from '../types'
import { useCart } from '../context/CartContext'

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

  const defaultImage = 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400'
  
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const target = e.target as HTMLImageElement
    // Evita loop infinito se o placeholder também falhar
    if (target.src !== defaultImage) {
      target.src = defaultImage
    }
  }

  // Garante que sempre temos uma URL de imagem válida
  const imageUrl = product.image && product.image.trim() !== '' 
    ? product.image 
    : defaultImage

  return (
    <Link to={`/produtos/${product.id}`} className="card p-6 block">
      <div className="relative mb-4">
        <div className="w-full h-48 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
          <img
            src={imageUrl}
            alt={product.name}
            className="w-full h-full object-cover"
            onError={handleImageError}
          />
        </div>
        {product.isCustomizable && (
          <div className="absolute top-2 right-2 bg-primary-600 text-white px-2 py-1 rounded-full text-xs flex items-center">
            <Sparkles size={12} className="mr-1" />
            Personalizável
          </div>
        )}
        {!product.inStock && (
          <div className="absolute inset-0 bg-gray-900 bg-opacity-50 rounded-lg flex items-center justify-center">
            <span className="text-white font-semibold">Fora de Estoque</span>
          </div>
        )}
      </div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">{product.name}</h3>
      <p className="text-gray-600 text-sm mb-4 line-clamp-2">{product.description}</p>
      <div className="flex items-center justify-between">
        <span className="text-2xl font-bold text-primary-600">
          R$ {product.price.toFixed(2).replace('.', ',')}
        </span>
        <button
          onClick={handleAddToCart}
          disabled={!product.inStock}
          className="bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white p-2 rounded-lg transition-colors"
        >
          <ShoppingCart size={20} />
        </button>
      </div>
    </Link>
  )
}







