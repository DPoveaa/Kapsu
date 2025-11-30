import { useParams, useNavigate } from 'react-router-dom'
import { ShoppingCart, Sparkles, ArrowLeft, Plus, Minus, Loader2 } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useCart } from '../context/CartContext'
import { Product } from '../types'
import { productsService } from '../services/products.service'

export default function ProductDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { addProduct } = useCart()
  const [quantity, setQuantity] = useState(1)
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Carrega produto da API
  useEffect(() => {
    const loadProduct = async () => {
      if (!id) {
        setError('ID do produto não fornecido')
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)
        const data = await productsService.getById(id)
        setProduct(data)
      } catch (err: any) {
        console.error('Erro ao carregar produto:', err)
        setError(err.message || 'Erro ao carregar produto')
      } finally {
        setLoading(false)
      }
    }

    loadProduct()
  }, [id])

  // Loading State
  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center py-12">
          <Loader2 className="animate-spin text-primary-600" size={48} />
        </div>
      </div>
    )
  }

  // Error State
  if (error || !product) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <p className="text-red-600 text-lg font-semibold mb-2">
          {error || 'Produto não encontrado'}
        </p>
        <p className="text-gray-500 mb-4">
          O produto que você está procurando não existe ou foi removido.
        </p>
        <button onClick={() => navigate('/produtos')} className="btn-primary">
          Voltar para Produtos
        </button>
      </div>
    )
  }

  const handleAddToCart = () => {
    addProduct(product, quantity)
    navigate('/carrinho')
  }

  const increaseQuantity = () => setQuantity(q => q + 1)
  const decreaseQuantity = () => setQuantity(q => Math.max(1, q - 1))

  return (
    <div className="container mx-auto px-4 py-8">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft size={20} className="mr-2" />
        Voltar
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Image */}
        <div>
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-96 object-cover rounded-xl"
          />
        </div>

        {/* Details */}
        <div>
          <div className="mb-4">
            {product.isCustomizable && (
              <span className="inline-flex items-center bg-primary-100 text-primary-700 px-3 py-1 rounded-full text-sm font-medium mb-2">
                <Sparkles size={14} className="mr-1" />
                Personalizável
              </span>
            )}
            <h1 className="text-4xl font-bold text-gray-900 mb-2">{product.name}</h1>
            <p className="text-2xl font-bold text-primary-600 mb-4">
              R$ {product.price.toFixed(2).replace('.', ',')}
            </p>
          </div>

          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-2">Descrição</h2>
            <p className="text-gray-600">{product.description}</p>
          </div>

          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-2">Categoria</h2>
            <span className="inline-block bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm">
              {product.category.charAt(0).toUpperCase() + product.category.slice(1)}
            </span>
          </div>

          {product.isCustomizable && (
            <div className="mb-6 p-4 bg-primary-50 rounded-lg">
              <p className="text-sm text-primary-700">
                💡 Este produto pode ser personalizado! Você pode ajustar a dosagem e combinar com outros ativos.
                <button
                  onClick={() => navigate('/personalizar')}
                  className="ml-2 text-primary-600 hover:text-primary-700 font-semibold underline"
                >
                  Personalizar agora
                </button>
              </p>
            </div>
          )}

          {/* Quantity and Add to Cart */}
          <div className="border-t pt-6">
            <div className="flex items-center space-x-4 mb-6">
              <span className="font-semibold">Quantidade:</span>
              <div className="flex items-center border border-gray-300 rounded-lg">
                <button
                  onClick={decreaseQuantity}
                  className="p-2 hover:bg-gray-100 transition-colors"
                >
                  <Minus size={20} />
                </button>
                <span className="px-4 py-2 font-semibold">{quantity}</span>
                <button
                  onClick={increaseQuantity}
                  className="p-2 hover:bg-gray-100 transition-colors"
                >
                  <Plus size={20} />
                </button>
              </div>
            </div>

            <button
              onClick={handleAddToCart}
              disabled={!product.inStock}
              className="w-full btn-primary flex items-center justify-center disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              <ShoppingCart size={20} className="mr-2" />
              Adicionar ao Carrinho
            </button>

            {!product.inStock && (
              <p className="text-red-600 text-sm mt-2 text-center">
                Produto temporariamente fora de estoque
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}



