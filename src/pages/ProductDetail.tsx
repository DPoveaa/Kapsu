import { useParams, useNavigate } from 'react-router-dom'
import { ShoppingCart, Sparkles, ArrowLeft, Plus, Minus } from 'lucide-react'
import { useState } from 'react'
import { useCart } from '../context/CartContext'
import { Product } from '../types'

// Mock data - em produção viria de uma API
const products: Product[] = [
  {
    id: '1',
    name: 'Vitamina D3 2000UI',
    description: 'Suplemento de vitamina D3 para fortalecimento ósseo e sistema imunológico. Ideal para pessoas com deficiência de vitamina D, promove a absorção de cálcio e fortalece o sistema imunológico.',
    price: 45.90,
    image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=800',
    category: 'vitamina',
    inStock: true,
    isCustomizable: true
  },
  {
    id: '2',
    name: 'Magnésio Quelato',
    description: 'Magnésio de alta absorção para relaxamento muscular e saúde cardiovascular',
    price: 38.50,
    image: 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=800',
    category: 'mineral',
    inStock: true,
    isCustomizable: true
  },
  {
    id: '3',
    name: 'Extrato de Ginkgo Biloba',
    description: 'Fitoterápico para memória, concentração e circulação',
    price: 52.00,
    image: 'https://images.unsplash.com/photo-1607619056574-7b8d3ee536b2?w=800',
    category: 'fitoterapico',
    inStock: true,
    isCustomizable: false
  }
]

export default function ProductDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { addProduct } = useCart()
  const [quantity, setQuantity] = useState(1)

  const product = products.find(p => p.id === id)

  if (!product) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <p className="text-gray-600 text-lg">Produto não encontrado.</p>
        <button onClick={() => navigate('/produtos')} className="btn-primary mt-4">
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




