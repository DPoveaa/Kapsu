import { useParams, useNavigate } from 'react-router-dom'
import { ShoppingCart, Loader2, Truck, CheckCircle, AlertCircle } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useCart } from '../context/CartContext'
import { Product } from '../types'
import { productsService } from '../services/products.service'
import { env } from '../config/env'
import { PRODUCT_IMAGE_FALLBACK, handleImageError } from '../utils/imageFallback'

interface ProductDetails {
  id: string
  name: string
  description: string | null
  price: number
  image: string | null
  category: string | null
  compositions: string | null
  indication: string | null
  contraindication: string | null
}

export default function ProductDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { addProduct } = useCart()
  const [quantity, setQuantity] = useState(1)
  const [product, setProduct] = useState<Product | null>(null)
  const [productDetails, setProductDetails] = useState<ProductDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedImage, setSelectedImage] = useState(0)

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
        
        // Busca dados completos do produto (incluindo informações médicas)
        try {
          const response = await fetch(`${env.apiUrl}/products/${id}`)
          const text = await response.text()
          if (text) {
            const fullData = JSON.parse(text)
            if (fullData.success && fullData.data) {
              setProductDetails(fullData.data)
            }
          }
        } catch (err) {
          console.warn('Não foi possível carregar detalhes completos do produto')
        }
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
          <Loader2 className="animate-spin text-primary-600 dark:text-primary-400" size={48} />
        </div>
      </div>
    )
  }

  // Error State
  if (error || !product) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <p className="text-red-600 dark:text-red-400 text-lg font-semibold mb-2">
          {error || 'Produto não encontrado'}
        </p>
        <p className="text-gray-500 dark:text-gray-300 mb-4">
          O produto que você está procurando não existe ou foi removido.
        </p>
        <button onClick={() => navigate('/produtos')} className="btn-primary">
          Voltar para Produtos
        </button>
      </div>
    )
  }

  const handleAddToCart = () => {
    if (product) {
      addProduct(product, quantity)
      navigate('/carrinho')
    }
  }

  const handleBuyNow = () => {
    if (product) {
      addProduct(product, quantity)
      navigate('/checkout')
    }
  }

  // Calcula parcelamento (usa preço promocional se existir)
  const finalPrice = product?.promo_price || product?.price || 0
  const installmentValue = product ? (finalPrice / 12).toFixed(2) : '0.00'
  
  // Cria array de imagens (por enquanto usa a mesma imagem, mas pode ser expandido)
  const productImages = product ? [product.image, product.image, product.image] : []

  const handleProductImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    handleImageError(e, PRODUCT_IMAGE_FALLBACK)
  }

  // Breadcrumbs
  const getCategoryPath = () => {
    if (!product) return []
    const categoryMap: Record<string, string> = {
      vitamina: 'Vitaminas',
      mineral: 'Minerais',
      fitoterapico: 'Fitoterápicos',
      outros: 'Outros'
    }
    return [
      { label: 'Início', path: '/' },
      { label: 'Produtos', path: '/produtos' },
      { label: categoryMap[product.category] || 'Produtos', path: `/produtos?category=${product.category}` },
      { label: product.name, path: '' }
    ]
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Breadcrumbs */}
        <nav className="mb-4 text-sm">
          <div className="flex items-center space-x-2 text-gray-600 dark:text-white">
            {getCategoryPath().map((item, index) => (
              <div key={index} className="flex items-center">
                {index > 0 && <span className="mx-2">/</span>}
                {item.path ? (
                  <button
                    onClick={() => navigate(item.path)}
                    className="hover:text-primary-600 dark:hover:text-primary-300"
                  >
                    {item.label}
                  </button>
                ) : (
                  <span className="text-gray-900 dark:text-white font-medium">{item.label}</span>
                )}
              </div>
            ))}
          </div>
        </nav>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-lg p-4 lg:p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
            {/* Galeria de Imagens - Compacta */}
            <div>
              <div className="mb-2">
                <img
                  src={productImages[selectedImage] || product?.image || ''}
                  alt={product?.name}
                  className="w-full h-64 lg:h-80 object-cover rounded-lg border border-gray-200 dark:border-gray-700"
                  onError={handleProductImageError}
                />
              </div>
              {productImages.length > 1 && (
                <div className="flex space-x-2 mb-4">
                  {productImages.map((img, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedImage(index)}
                      className={`w-16 h-16 rounded-lg border-2 overflow-hidden ${
                        selectedImage === index ? 'border-primary-600 dark:border-primary-500' : 'border-gray-200 dark:border-gray-700'
                      }`}
                    >
                      <img
                        src={img}
                        alt={`${product?.name} ${index + 1}`}
                        className="w-full h-full object-cover"
                        onError={handleProductImageError}
                      />
                    </button>
                  ))}
                </div>
              )}

              {/* Informações Detalhadas - Abaixo das Imagens */}
              {productDetails && (
                <div className="mt-4 space-y-4">
                  {productDetails.compositions && (
                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-2 text-sm flex items-center">
                        <CheckCircle size={16} className="text-green-600 dark:text-primary-400 mr-2" />
                        Composição
                      </h3>
                      <p className="text-sm text-gray-700 dark:text-white whitespace-pre-line">{productDetails.compositions}</p>
                    </div>
                  )}
                  
                  {productDetails.indication && (
                    <div className="p-4 bg-blue-50 dark:bg-gray-800 rounded-lg border border-blue-200 dark:border-gray-700">
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-2 text-sm flex items-center">
                        <CheckCircle size={16} className="text-blue-600 dark:text-primary-400 mr-2" />
                        Indicações
                      </h3>
                      <p className="text-sm text-gray-700 dark:text-white whitespace-pre-line">{productDetails.indication}</p>
                    </div>
                  )}
                  
                  {productDetails.contraindication && (
                    <div className="p-4 bg-orange-50 dark:bg-gray-800 rounded-lg border border-orange-200 dark:border-gray-700">
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-2 text-sm flex items-center">
                        <AlertCircle size={16} className="text-orange-600 dark:text-primary-400 mr-2" />
                        Contraindicações
                      </h3>
                      <p className="text-sm text-gray-700 dark:text-white whitespace-pre-line">{productDetails.contraindication}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Informações do Produto - Compactas */}
            <div>
              {/* Status e Badges */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <span className="bg-green-100 dark:bg-[#ff6400] text-green-800 dark:text-white px-2 py-0.5 rounded text-xs font-medium border border-green-200 dark:border-gray-700">
                    Novo
                  </span>
                  <span className="text-gray-500 dark:text-gray-300 text-xs">+100 vendidos</span>
                </div>
              </div>

              {/* Título - Menor */}
              <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white mb-2">{product?.name}</h1>

              {/* Preço - Compacto */}
              <div className="mb-4">
                {product?.promo_price ? (
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <p className="text-3xl lg:text-4xl font-bold text-red-600 dark:text-red-400">
                        R$ {Number(product.promo_price).toFixed(2).replace('.', ',')}
                      </p>
                      <p className="text-xl lg:text-2xl font-semibold text-gray-500 dark:text-gray-400 line-through">
                        R$ {Number(product.price).toFixed(2).replace('.', ',')}
                      </p>
                      <span className="bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 px-2 py-1 rounded text-sm font-semibold">
                        {Math.round(((Number(product.price) - Number(product.promo_price)) / Number(product.price)) * 100)}% OFF
                      </span>
                    </div>
                    <p className="text-sm lg:text-base text-gray-600 dark:text-gray-300">
                      em 12x de R$ {installmentValue.replace('.', ',')} sem juros
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-1">
                      R$ {Number(product?.price || 0).toFixed(2).replace('.', ',')}
                    </p>
                    <p className="text-sm lg:text-base text-gray-600 dark:text-gray-300">
                      em 12x de R$ {installmentValue.replace('.', ',')} sem juros
                    </p>
                  </div>
                )}
              </div>

              {/* Frete - Compacto */}
              {product.free_shipping && (
                <div className="mb-4 p-3 bg-blue-50 dark:bg-gray-800 rounded-lg border border-blue-200 dark:border-gray-700">
                  <div className="flex items-center mb-1">
                    <Truck size={16} className="text-blue-600 dark:text-primary-400 mr-2" />
                    <span className="font-semibold text-blue-900 dark:text-white text-sm">FRETE GRÁTIS</span>
                  </div>
                  <p className="text-xs text-blue-700 dark:text-gray-300">
                    Receba grátis em 2-3 dias úteis
                  </p>
                </div>
              )}

              {/* Estoque e Quantidade - Compacto */}
              <div className="mb-4">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-xs font-semibold text-gray-700 dark:text-white">Quantidade:</span>
                  <select
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    className="border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg px-2 py-1.5 text-sm"
                  >
                    {[...Array(10)].map((_, i) => (
                      <option key={i + 1} value={i + 1}>
                        {i + 1}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Botões de Ação - PRINCIPAIS, VISÍVEIS NO TOPO */}
              <div className="space-y-2 mb-4">
                <button
                  onClick={handleBuyNow}
                  disabled={!product?.active}
                  className="w-full bg-blue-600 dark:bg-[#1eef69c2] hover:bg-blue-700 dark:hover:bg-primary-500 text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed flex items-center justify-center text-base"
                >
                  Comprar agora
                </button>
                <button
                  onClick={handleAddToCart}
                  disabled={!product?.active}
                  className="w-full bg-blue-600 dark:bg-primary-600 hover:bg-blue-700 dark:hover:bg-[#78b9b59c] text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed flex items-center justify-center text-base"
                >
                  <ShoppingCart size={18} className="mr-2" />
                  Adicionar ao carrinho
                </button>
                {!product?.active && (
                  <p className="text-red-600 dark:text-red-400 text-xs text-center">
                    Produto inativo
                  </p>
                )}
              </div>

              {/* Descrição do Produto - Compacta */}
              {productDetails && productDetails.description && (
                <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2 text-sm">
                    O que você precisa saber
                  </h3>
                  <p className="text-xs text-gray-700 dark:text-white">{productDetails.description}</p>
                </div>
              )}


            </div>
          </div>

        </div>
      </div>
    </div>
  )
}







