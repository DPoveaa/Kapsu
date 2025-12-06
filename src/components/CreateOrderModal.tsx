import { useState, useEffect } from 'react'
import { X, Plus, Trash2, Loader2, Search } from 'lucide-react'
import { adminService, User } from '../services/admin.service'
import { productsService } from '../services/products.service'
import { Product } from '../types'

interface OrderItem {
  productId: string
  quantity: number
  product?: Product
}

interface CreateOrderModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

const paymentMethods = [
  { value: 'credit', label: 'Cartão de Crédito' },
  { value: 'debit', label: 'Cartão de Débito' },
  { value: 'pix', label: 'PIX' },
  { value: 'cash', label: 'Dinheiro' },
]

const orderStatuses = [
  { value: 'PENDING', label: 'Pendente' },
  { value: 'CONFIRMED', label: 'Confirmado' },
  { value: 'PROCESSING', label: 'Processando' },
  { value: 'SHIPPED', label: 'Enviado' },
  { value: 'DELIVERED', label: 'Entregue' },
  { value: 'CANCELLED', label: 'Cancelado' },
]

export default function CreateOrderModal({ isOpen, onClose, onSuccess }: CreateOrderModalProps) {
  const [loading, setLoading] = useState(false)
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [loadingProducts, setLoadingProducts] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [userSearch, setUserSearch] = useState('')
  const [productSearch, setProductSearch] = useState('')
  const [selectedUserId, setSelectedUserId] = useState('')
  const [showUserDropdown, setShowUserDropdown] = useState(false)
  const [selectedProductId, setSelectedProductId] = useState('')
  const [orderItems, setOrderItems] = useState<OrderItem[]>([])
  const [paymentMethod, setPaymentMethod] = useState('')
  const [shippingAddress, setShippingAddress] = useState('')
  const [status, setStatus] = useState('PENDING')

  // Carrega usuários e produtos quando o modal abre
  useEffect(() => {
    if (isOpen) {
      loadAllUsers()
      loadProducts()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  // Fecha dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('.user-dropdown-container')) {
        setShowUserDropdown(false)
      }
    }

    if (showUserDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showUserDropdown])

  const loadAllUsers = async () => {
    try {
      setLoadingUsers(true)
      // Carrega todos os usuários sem filtro
      const response = await adminService.listUsers(1, 1000, '')
      if (response.success) {
        setUsers(response.users)
      }
    } catch (err: any) {
      console.error('Erro ao carregar usuários:', err)
    } finally {
      setLoadingUsers(false)
    }
  }

  const loadProducts = async () => {
    try {
      setLoadingProducts(true)
      const data = await productsService.getAll()
      setProducts(data)
    } catch (err: any) {
      console.error('Erro ao carregar produtos:', err)
    } finally {
      setLoadingProducts(false)
    }
  }

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(userSearch.toLowerCase()) ||
    user.email.toLowerCase().includes(userSearch.toLowerCase())
  )

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(productSearch.toLowerCase())
  )

  const addProduct = () => {
    if (!selectedProductId) {
      setError('Selecione um produto')
      return
    }

    const product = products.find(p => p.id === selectedProductId)
    if (!product) {
      setError('Produto não encontrado')
      return
    }

    const existingItem = orderItems.find(item => item.productId === selectedProductId)
    if (existingItem) {
      setOrderItems(orderItems.map(item =>
        item.productId === selectedProductId
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ))
    } else {
      setOrderItems([...orderItems, { productId: selectedProductId, quantity: 1, product }])
    }

    setSelectedProductId('')
    setProductSearch('')
    setError(null)
  }

  const removeItem = (productId: string) => {
    setOrderItems(orderItems.filter(item => item.productId !== productId))
  }

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity < 1) return
    setOrderItems(orderItems.map(item =>
      item.productId === productId ? { ...item, quantity } : item
    ))
  }

  const calculateTotal = () => {
    return orderItems.reduce((total, item) => {
      const product = item.product || products.find(p => p.id === item.productId)
      if (product) {
        return total + (product.price * item.quantity)
      }
      return total
    }, 0)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!selectedUserId) {
      setError('Selecione um usuário')
      return
    }

    if (orderItems.length === 0) {
      setError('Adicione pelo menos um produto ao pedido')
      return
    }

    try {
      setLoading(true)
      const response = await adminService.createOrder({
        userId: selectedUserId,
        items: orderItems.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
        paymentMethod: paymentMethod || undefined,
        shippingAddress: shippingAddress || undefined,
        status: status,
      })

      if (response.success) {
        onSuccess()
        handleClose()
      }
    } catch (err: any) {
      console.error('Erro ao criar pedido:', err)
      setError(err.message || 'Erro ao criar pedido')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setSelectedUserId('')
    setOrderItems([])
    setPaymentMethod('')
    setShippingAddress('')
    setStatus('PENDING')
    setUserSearch('')
    setProductSearch('')
    setSelectedProductId('')
    setShowUserDropdown(false)
    setError(null)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Criar Pedido Manual</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-600">{error}</p>
            </div>
          )}

          {/* Seleção de Usuário */}
          <div className="user-dropdown-container">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cliente <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 z-10" size={18} />
              <input
                type="text"
                placeholder="Digite para buscar ou selecione um cliente..."
                value={selectedUserId ? (users.find(u => u.id === selectedUserId)?.name || userSearch) : userSearch}
                onChange={(e) => {
                  setUserSearch(e.target.value)
                  setSelectedUserId('')
                  setShowUserDropdown(true)
                }}
                onFocus={() => setShowUserDropdown(true)}
                className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              {selectedUserId && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedUserId('')
                    setUserSearch('')
                    setShowUserDropdown(false)
                  }}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X size={18} />
                </button>
              )}
              
              {/* Dropdown de usuários */}
              {showUserDropdown && (
                <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {loadingUsers ? (
                    <div className="p-4 text-center text-gray-500">
                      <Loader2 className="animate-spin mx-auto mb-2" size={20} />
                      Carregando...
                    </div>
                  ) : filteredUsers.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">Nenhum usuário encontrado</div>
                  ) : (
                    filteredUsers.map(user => (
                      <button
                        key={user.id}
                        type="button"
                        onClick={() => {
                          setSelectedUserId(user.id)
                          setUserSearch(user.name)
                          setShowUserDropdown(false)
                        }}
                        className={`w-full text-left px-4 py-2 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 ${
                          selectedUserId === user.id ? 'bg-blue-50' : ''
                        }`}
                      >
                        <div className="font-medium text-gray-900">{user.name}</div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                        {user.phone && (
                          <div className="text-xs text-gray-400">{user.phone}</div>
                        )}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
            {selectedUserId && (
              <div className="mt-2 text-sm text-green-600">
                ✓ Usuário selecionado: {users.find(u => u.id === selectedUserId)?.name} ({users.find(u => u.id === selectedUserId)?.email})
              </div>
            )}
          </div>

          {/* Adicionar Produtos */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Produtos <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="Buscar produto..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">Selecione um produto</option>
                {filteredProducts.map(product => (
                  <option key={product.id} value={product.id}>
                    {product.name} - R$ {product.price.toFixed(2).replace('.', ',')}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={addProduct}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2"
              >
                <Plus size={18} />
                Adicionar
              </button>
            </div>

            {/* Lista de Itens */}
            {orderItems.length > 0 && (
              <div className="mt-4 space-y-2">
                {orderItems.map((item) => {
                  const product = item.product || products.find(p => p.id === item.productId)
                  return (
                    <div
                      key={item.productId}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{product?.name || 'Produto'}</div>
                        <div className="text-sm text-gray-500">
                          R$ {product?.price.toFixed(2).replace('.', ',')} x {item.quantity} = R$ {(product?.price || 0) * item.quantity}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                          className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300"
                        >
                          -
                        </button>
                        <span className="w-12 text-center">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                          className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300"
                        >
                          +
                        </button>
                        <button
                          type="button"
                          onClick={() => removeItem(item.productId)}
                          className="ml-2 text-red-600 hover:text-red-800"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  )
                })}
                <div className="mt-4 p-3 bg-primary-50 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-gray-900">Total:</span>
                    <span className="text-2xl font-bold text-primary-600">
                      R$ {calculateTotal().toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Método de Pagamento */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Método de Pagamento
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="">Selecione um método</option>
              {paymentMethods.map(method => (
                <option key={method.value} value={method.value}>
                  {method.label}
                </option>
              ))}
            </select>
          </div>

          {/* Endereço de Entrega */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Endereço de Entrega
            </label>
            <textarea
              value={shippingAddress}
              onChange={(e) => setShippingAddress(e.target.value)}
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Rua, número, complemento, cidade - estado, CEP"
            />
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status Inicial
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              {orderStatuses.map(statusOption => (
                <option key={statusOption.value} value={statusOption.value}>
                  {statusOption.label}
                </option>
              ))}
            </select>
          </div>

          {/* Botões */}
          <div className="flex justify-end gap-4 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={handleClose}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  Criando...
                </>
              ) : (
                'Criar Pedido'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

