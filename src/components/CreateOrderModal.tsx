import { useState, useEffect } from 'react'
import { X, Plus, Trash2, Loader2, Search, FileText, Upload, FileCheck, ExternalLink, MapPin } from 'lucide-react'
import { adminService, User } from '../services/admin.service'
import { productsService } from '../services/products.service'
import { shippingService } from '../services/shipping.service'
import { uploadService } from '../services/upload.service'
import { cepService } from '../services/cep.service'
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
  { value: 'pix', label: 'PIX' },
  { value: 'cash', label: 'Dinheiro' },
  { value: 'mercado_pago', label: 'Mercado Pago' },
]

const orderStatuses = [
  { value: 'PENDING', label: 'Aguardando pagamento' },
  { value: 'CONFIRMED', label: 'Pago' },
  { value: 'PROCESSING', label: 'Preparação' },
  { value: 'SHIPPED', label: 'Enviado' },
  { value: 'DELIVERED', label: 'Entregue' },
  { value: 'CANCELLED', label: 'Cancelado' },
]

const emptyShippingAddress = {
  postalCode: '', street: '', number: '', complement: '', neighborhood: '', city: '', state: '',
}

export default function CreateOrderModal({ isOpen, onClose, onSuccess }: CreateOrderModalProps) {
  const [loading, setLoading] = useState(false)
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [userSearch, setUserSearch] = useState('')
  const [productSearch, setProductSearch] = useState('')
  const [selectedUserId, setSelectedUserId] = useState('')
  const [showUserDropdown, setShowUserDropdown] = useState(false)
  const [selectedProductId, setSelectedProductId] = useState('')
  const [showProductDropdown, setShowProductDropdown] = useState(false)
  const [orderItems, setOrderItems] = useState<OrderItem[]>([])
  const [paymentMethod, setPaymentMethod] = useState('')
  const [shippingMethod, setShippingMethod] = useState('')
  const [shippingMethods, setShippingMethods] = useState<string[]>([])
  const [customShippingMethod, setCustomShippingMethod] = useState('')
  const [shippingAddress, setShippingAddress] = useState(emptyShippingAddress)
  const [loadingCep, setLoadingCep] = useState(false)
  const [status, setStatus] = useState('PENDING')
  const [invoiceUrl, setInvoiceUrl] = useState('')
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [shippingLabelUrl, setShippingLabelUrl] = useState('')
  const [mlPickupDeadline, setMlPickupDeadline] = useState('')

  // Upload de arquivos
  const [uploadingInvoice, setUploadingInvoice] = useState(false)

  const handleCepChange = async (value: string) => {
    // Mask: keep only digits and format as 00000-000
    const digits = value.replace(/\D/g, '').slice(0, 8)
    const formatted = digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits
    setShippingAddress(prev => ({ ...prev, postalCode: formatted }))

    if (digits.length === 8) {
      setLoadingCep(true)
      try {
        const data = await cepService.searchCep(digits)
        if (data && !data.erro) {
          setShippingAddress(prev => ({
            ...prev,
            street: data.logradouro || prev.street,
            neighborhood: data.bairro || prev.neighborhood,
            city: data.localidade || prev.city,
            state: data.uf || prev.state,
            complement: data.complemento || prev.complement,
          }))
        }
      } finally {
        setLoadingCep(false)
      }
    }
  }
  const [invoiceFileName, setInvoiceFileName] = useState('')
  const [uploadingShippingLabel, setUploadingShippingLabel] = useState(false)
  const [shippingLabelFileName, setShippingLabelFileName] = useState('')

  // Novo cliente inline
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false)
  const [newCustomerName, setNewCustomerName] = useState('')
  const [newCustomerCpf, setNewCustomerCpf] = useState('')
  const [newCustomerEmail, setNewCustomerEmail] = useState('')
  const [newCustomerPhone, setNewCustomerPhone] = useState('')
  const [creatingCustomer, setCreatingCustomer] = useState(false)

  const handleInvoiceFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      setUploadingInvoice(true)
      setError(null)
      const res = await uploadService.uploadOrderDoc(file)
      if (res.success && res.data?.url) {
        setInvoiceUrl(res.data.url)
        setInvoiceFileName(file.name)
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao enviar arquivo da Nota Fiscal')
    } finally {
      setUploadingInvoice(false)
    }
  }

  const handleShippingLabelFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      setUploadingShippingLabel(true)
      setError(null)
      const res = await uploadService.uploadOrderDoc(file)
      if (res.success && res.data?.url) {
        setShippingLabelUrl(res.data.url)
        setShippingLabelFileName(file.name)
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao enviar arquivo da Etiqueta do Mercado Livre')
    } finally {
      setUploadingShippingLabel(false)
    }
  }

  // Carrega usuários e produtos quando o modal abre
  useEffect(() => {
    if (isOpen) {
      loadAllUsers()
      loadProducts()
      shippingService.getShippingMethods('internal')
        .then(methods => setShippingMethods(methods.map(method => method.name)))
        .catch(() => setShippingMethods([]))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  // Fecha dropdowns ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('.user-dropdown-container')) {
        setShowUserDropdown(false)
      }
      if (!target.closest('.product-dropdown-container')) {
        setShowProductDropdown(false)
      }
    }

    if (showUserDropdown || showProductDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showUserDropdown, showProductDropdown])

  useEffect(() => {
    if (shippingMethod.toLowerCase().includes('mercado livre') || customShippingMethod.toLowerCase().includes('mercado livre')) {
      setPaymentMethod('mercado_pago')
    }
  }, [shippingMethod, customShippingMethod])

  const loadAllUsers = async () => {
    try {
      setLoadingUsers(true)
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
      const data = await productsService.getAll()
      setProducts(data)
    } catch (err: any) {
      console.error('Erro ao carregar produtos:', err)
    }
  }

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(userSearch.toLowerCase()) ||
    user.email.toLowerCase().includes(userSearch.toLowerCase()) ||
    (user.cpf && user.cpf.includes(userSearch.replace(/\D/g, '')))
  )

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(productSearch.toLowerCase())
  )

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCustomerName.trim()) {
      setError('Informe o nome do cliente.')
      return
    }

    try {
      setCreatingCustomer(true)
      setError(null)
      const res = await adminService.createUser({
        name: newCustomerName.trim(),
        cpf: newCustomerCpf.trim() || undefined,
        email: newCustomerEmail.trim() || undefined,
        phone: newCustomerPhone.trim() || undefined,
        role: 'user',
      })

      if (res.success && res.user) {
        setUsers(prev => [res.user, ...prev.filter(u => u.id !== res.user.id)])
        setSelectedUserId(res.user.id)
        setUserSearch(res.user.name)
        setShowNewCustomerForm(false)
        setNewCustomerName('')
        setNewCustomerCpf('')
        setNewCustomerEmail('')
        setNewCustomerPhone('')
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao cadastrar cliente')
    } finally {
      setCreatingCustomer(false)
    }
  }

  const addProduct = () => {
    let targetProductId = selectedProductId
    if (!targetProductId && productSearch.trim() && filteredProducts.length > 0) {
      targetProductId = filteredProducts[0].id
    }

    if (!targetProductId) {
      setError('Selecione um produto ou digite o nome de um produto válido.')
      return
    }

    const product = products.find(p => p.id === targetProductId)
    if (!product) {
      setError('Produto não encontrado.')
      return
    }

    const existingItem = orderItems.find(item => item.productId === targetProductId)
    if (existingItem) {
      setOrderItems(orderItems.map(item =>
        item.productId === targetProductId
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ))
    } else {
      setOrderItems([...orderItems, { productId: targetProductId, quantity: 1, product }])
    }

    setSelectedProductId('')
    setProductSearch('')
    setShowProductDropdown(false)
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

    if (shippingMethod === 'Outro' && !customShippingMethod.trim()) {
      setError('Informe o nome do método de envio.')
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
        shippingMethod: shippingMethod === 'Outro' ? customShippingMethod.trim() : (shippingMethod || undefined),
        shippingAddress: Object.values(shippingAddress).some(Boolean) ? shippingAddress : undefined,
        status: status,
        invoiceUrl: invoiceUrl.trim() || undefined,
        invoiceNumber: invoiceNumber.trim() || undefined,
        shippingLabelUrl: shippingLabelUrl.trim() || undefined,
        mlPickupDeadline: mlPickupDeadline ? mlPickupDeadline : undefined,
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
    setShippingMethod('')
    setCustomShippingMethod('')
    setShippingAddress(emptyShippingAddress)
    setStatus('PENDING')
    setInvoiceUrl('')
    setInvoiceNumber('')
    setShippingLabelUrl('')
    setMlPickupDeadline('')
    setInvoiceFileName('')
    setShippingLabelFileName('')
    setUserSearch('')
    setProductSearch('')
    setSelectedProductId('')
    setShowUserDropdown(false)
    setShowProductDropdown(false)
    setShowNewCustomerForm(false)
    setNewCustomerName('')
    setNewCustomerCpf('')
    setNewCustomerEmail('')
    setNewCustomerPhone('')
    setError(null)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl dark:shadow-2xl max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-700">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-3 sm:px-4 lg:px-6 py-3 sm:py-4 flex items-center justify-between z-30">
          <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">Criar Pedido Manual</h2>
          <button
            type="button"
            onClick={handleClose}
            className="text-gray-400 dark:text-gray-300 hover:text-gray-600 dark:hover:text-white flex-shrink-0 ml-2"
          >
            <X size={20} className="sm:w-6 sm:h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-5 lg:space-y-6">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-3 sm:p-4">
              <p className="text-xs sm:text-sm text-red-600 dark:text-red-300">{error}</p>
            </div>
          )}

          {/* Seleção de Usuário */}
          <div className="user-dropdown-container">
            <div className="flex items-center justify-between mb-1.5 sm:mb-2">
              <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
                Cliente <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={() => {
                  setShowNewCustomerForm(!showNewCustomerForm)
                  if (!newCustomerName && userSearch) {
                    setNewCustomerName(userSearch)
                  }
                }}
                className="text-xs text-primary-600 dark:text-primary-400 hover:underline font-semibold flex items-center gap-1"
              >
                <Plus size={14} />
                {showNewCustomerForm ? 'Cancelar cadastro' : 'Criar Novo Cliente'}
              </button>
            </div>

            {showNewCustomerForm && (
              <div className="bg-primary-50/60 dark:bg-primary-950/30 border border-primary-200 dark:border-primary-800/60 rounded-xl p-3.5 space-y-3 mb-3">
                <div className="text-xs font-semibold text-primary-900 dark:text-primary-200 flex items-center justify-between">
                  <span>Cadastrar Novo Cliente (ex: Mercado Livre)</span>
                  <span className="text-[10px] text-gray-500 dark:text-gray-400 font-normal">Vinculará pelo CPF quando registrar conta</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-gray-700 dark:text-gray-300 mb-1">Nome Completo *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: João da Silva"
                      value={newCustomerName}
                      onChange={e => setNewCustomerName(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-gray-700 dark:text-gray-300 mb-1">
                      CPF <span className="text-primary-600 dark:text-primary-400 font-normal">(Recomendado p/ vínculo)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="000.000.000-00"
                      value={newCustomerCpf}
                      onChange={e => setNewCustomerCpf(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-gray-700 dark:text-gray-300 mb-1">E-mail (Opcional)</label>
                    <input
                      type="email"
                      placeholder="joao@email.com"
                      value={newCustomerEmail}
                      onChange={e => setNewCustomerEmail(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-gray-700 dark:text-gray-300 mb-1">Telefone / WhatsApp (Opcional)</label>
                    <input
                      type="text"
                      placeholder="(11) 99999-9999"
                      value={newCustomerPhone}
                      onChange={e => setNewCustomerPhone(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowNewCustomerForm(false)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    disabled={creatingCustomer}
                    onClick={handleCreateCustomer}
                    className="px-3.5 py-1.5 rounded-lg text-xs font-medium bg-primary-600 hover:bg-primary-700 text-white disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {creatingCustomer && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Salvar e Selecionar Cliente</span>
                  </button>
                </div>
              </div>
            )}

            <div className="relative">
              <Search className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 z-10 w-4 h-4 sm:w-[18px] sm:h-[18px]" />
              <input
                type="text"
                placeholder="Digite para buscar por nome, email ou CPF..."
                value={selectedUserId ? (users.find(u => u.id === selectedUserId)?.name || userSearch) : userSearch}
                onChange={(e) => {
                  setUserSearch(e.target.value)
                  setSelectedUserId('')
                  setShowUserDropdown(true)
                }}
                onFocus={() => setShowUserDropdown(true)}
                className="w-full pl-8 sm:pl-10 pr-8 sm:pr-10 py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-400 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-900 dark:text-white"
              />
              {selectedUserId && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedUserId('')
                    setUserSearch('')
                    setShowUserDropdown(false)
                  }}
                  className="absolute right-2 sm:right-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-300 hover:text-gray-600 dark:hover:text-white"
                >
                  <X size={16} className="sm:w-[18px] sm:h-[18px]" />
                </button>
              )}
              
              {/* Dropdown de usuários */}
              {showUserDropdown && (
                <div className="absolute z-20 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg dark:shadow-xl max-h-48 sm:max-h-60 overflow-y-auto">
                  {loadingUsers ? (
                    <div className="p-3 sm:p-4 text-center text-gray-500 dark:text-gray-400">
                      <Loader2 className="animate-spin mx-auto mb-2 w-4 h-4 sm:w-5 sm:h-5" />
                      <span className="text-xs sm:text-sm">Carregando...</span>
                    </div>
                  ) : filteredUsers.length === 0 ? (
                    <div className="p-3 sm:p-4 text-center text-xs sm:text-sm text-gray-500 dark:text-gray-400 space-y-2">
                      <p>Nenhum cliente encontrado com esse termo.</p>
                      <button
                        type="button"
                        onClick={() => {
                          setNewCustomerName(userSearch)
                          setShowNewCustomerForm(true)
                          setShowUserDropdown(false)
                        }}
                        className="px-3 py-1.5 rounded-lg bg-primary-600 text-white font-medium text-xs hover:bg-primary-700 inline-flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Cadastrar &quot;{userSearch}&quot; como novo cliente
                      </button>
                    </div>
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
                        className={`w-full text-left px-3 sm:px-4 py-2 hover:bg-gray-50 dark:hover:bg-[#065084] border-b border-gray-100 dark:border-gray-700 last:border-b-0 ${
                          selectedUserId === user.id ? 'bg-blue-50 dark:bg-blue-900/30' : ''
                        }`}
                      >
                        <div className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white break-words flex items-center justify-between">
                          <span>{user.name}</span>
                          {user.cpf && <span className="font-mono text-[10px] text-gray-400">CPF: {user.cpf}</span>}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-300 break-words">{user.email}</div>
                        {user.phone && (
                          <div className="text-[10px] sm:text-xs text-gray-400 dark:text-gray-400">{user.phone}</div>
                        )}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
            {selectedUserId && (
              <div className="mt-2 text-xs sm:text-sm text-green-600 dark:text-green-400 break-words font-medium">
                ✓ Cliente selecionado: {users.find(u => u.id === selectedUserId)?.name} {users.find(u => u.id === selectedUserId)?.cpf ? `(CPF: ${users.find(u => u.id === selectedUserId)?.cpf})` : `(${users.find(u => u.id === selectedUserId)?.email})`}
              </div>
            )}
          </div>

          {/* Adicionar Produtos */}
          <div className="product-dropdown-container">
            <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2">
              Produtos <span className="text-red-500">*</span>
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 z-10 w-4 h-4 sm:w-[18px] sm:h-[18px]" />
                <input
                  type="text"
                  placeholder="Buscar produto por nome..."
                  value={productSearch}
                  onChange={(e) => {
                    setProductSearch(e.target.value)
                    setSelectedProductId('')
                    setShowProductDropdown(true)
                  }}
                  onFocus={() => setShowProductDropdown(true)}
                  className="w-full pl-8 sm:pl-10 pr-8 sm:pr-10 py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-400 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-900 dark:text-white"
                />
                {productSearch && (
                  <button
                    type="button"
                    onClick={() => {
                      setProductSearch('')
                      setSelectedProductId('')
                      setShowProductDropdown(false)
                    }}
                    className="absolute right-2 sm:right-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-300 hover:text-gray-600 dark:hover:text-white"
                  >
                    <X size={16} className="sm:w-[18px] sm:h-[18px]" />
                  </button>
                )}

                {/* Autocomplete Dropdown de Produtos */}
                {showProductDropdown && productSearch.trim() && (
                  <div className="absolute z-20 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg dark:shadow-xl max-h-48 sm:max-h-60 overflow-y-auto">
                    {filteredProducts.length === 0 ? (
                      <div className="p-3 text-center text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                        Nenhum produto encontrado com &quot;{productSearch}&quot;.
                      </div>
                    ) : (
                      filteredProducts.map(product => (
                        <button
                          key={product.id}
                          type="button"
                          onClick={() => {
                            setSelectedProductId(product.id)
                            setProductSearch(product.name)
                            setShowProductDropdown(false)
                          }}
                          className={`w-full text-left px-3 sm:px-4 py-2 hover:bg-gray-50 dark:hover:bg-[#065084] border-b border-gray-100 dark:border-gray-700 last:border-b-0 flex items-center justify-between text-xs sm:text-sm ${
                            selectedProductId === product.id ? 'bg-blue-50 dark:bg-blue-900/30 font-semibold' : ''
                          }`}
                        >
                          <span className="text-gray-900 dark:text-white truncate mr-2">{product.name}</span>
                          <span className="text-primary-600 dark:text-primary-400 font-bold shrink-0">
                            R$ {product.price.toFixed(2).replace('.', ',')}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              <select
                value={selectedProductId}
                onChange={(e) => {
                  const pId = e.target.value
                  setSelectedProductId(pId)
                  if (pId) {
                    const p = products.find(prod => prod.id === pId)
                    if (p) setProductSearch(p.name)
                  }
                  setShowProductDropdown(false)
                }}
                className="flex-1 border border-gray-300 dark:border-gray-400 rounded-lg px-2 sm:px-4 py-2 text-sm sm:text-base focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-900 dark:text-white"
              >
                <option value="">Selecione na lista ({products.length} produtos)</option>
                {(productSearch.trim() ? filteredProducts : products).map(product => (
                  <option key={product.id} value={product.id}>
                    {product.name} - R$ {product.price.toFixed(2).replace('.', ',')}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={addProduct}
                className="px-3 sm:px-4 py-2 text-sm sm:text-base bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 flex items-center justify-center gap-1.5 sm:gap-2 shrink-0"
              >
                <Plus size={16} className="sm:w-[18px] sm:h-[18px]" />
                Adicionar
              </button>
            </div>

            {/* Lista de Itens */}
            {orderItems.length > 0 && (
              <div className="mt-3 sm:mt-4 space-y-2">
                {orderItems.map((item) => {
                  const product = item.product || products.find(p => p.id === item.productId)
                  return (
                    <div
                      key={item.productId}
                      className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-2.5 sm:p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 gap-2 sm:gap-0"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white break-words">{product?.name || 'Produto'}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-300">
                          R$ {product?.price.toFixed(2).replace('.', ',')} x {item.quantity} = R$ {((product?.price || 0) * item.quantity).toFixed(2).replace('.', ',')}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 justify-end sm:justify-start">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                          className="px-2 sm:px-2.5 py-1 text-sm sm:text-base bg-gray-200 dark:bg-gray-800 dark:border dark:border-gray-700 dark:text-white rounded hover:bg-gray-300 dark:hover:bg-[#065084]"
                        >
                          -
                        </button>
                        <span className="w-8 sm:w-12 text-center text-xs sm:text-sm dark:text-white">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                          className="px-2 sm:px-2.5 py-1 text-sm sm:text-base bg-gray-200 dark:bg-gray-800 dark:border dark:border-gray-700 dark:text-white rounded hover:bg-gray-300 dark:hover:bg-[#065084]"
                        >
                          +
                        </button>
                        <button
                          type="button"
                          onClick={() => removeItem(item.productId)}
                          className="p-1 text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                        >
                          <Trash2 size={16} className="sm:w-[18px] sm:h-[18px]" />
                        </button>
                      </div>
                    </div>
                  )
                })}

                <div className="pt-2 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
                  <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">Total dos Produtos:</span>
                  <span className="text-base sm:text-lg font-bold text-green-600 dark:text-green-400">
                    R$ {calculateTotal().toFixed(2).replace('.', ',')}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Dados de Pagamento e Envio */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Forma de Pagamento
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-400 rounded-lg px-3 py-2 text-xs sm:text-sm dark:bg-gray-900 dark:text-white"
              >
                <option value="">Selecione</option>
                {paymentMethods.map((pm) => (
                  <option key={pm.value} value={pm.value}>
                    {pm.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Status Inicial do Pedido
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-400 rounded-lg px-3 py-2 text-xs sm:text-sm dark:bg-gray-900 dark:text-white"
              >
                {orderStatuses.map((st) => (
                  <option key={st.value} value={st.value}>
                    {st.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Método de Envio
                </label>
                <select
                  value={shippingMethod}
                  onChange={(e) => setShippingMethod(e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-400 rounded-lg px-3 py-2 text-xs sm:text-sm dark:bg-gray-900 dark:text-white"
                >
                  <option value="">Selecione</option>
                  {shippingMethods.map((sm) => (
                    <option key={sm} value={sm}>
                      {sm}
                    </option>
                  ))}
                  <option value="Outro">Outro...</option>
                </select>

                {shippingMethod === 'Outro' && (
                  <input
                    type="text"
                    placeholder="Informe o método de envio personalizado"
                    value={customShippingMethod}
                    onChange={(e) => setCustomShippingMethod(e.target.value)}
                    className="w-full border border-gray-300 dark:border-gray-400 rounded-lg px-3 py-2 text-xs sm:text-sm mt-2 dark:bg-gray-900 dark:text-white"
                  />
                )}
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Prazo de Envio (Opcional)
                </label>
                <input
                  type="date"
                  value={mlPickupDeadline}
                  onChange={(e) => setMlPickupDeadline(e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-400 rounded-lg px-3 py-2 text-xs sm:text-sm dark:bg-gray-900 dark:text-white"
                />
              </div>
            </div>

          {/* Endereço de Entrega */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-3">
            <h3 className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white">Endereço de Entrega (Opcional)</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="relative">
                <input
                  type="text"
                  placeholder="CEP"
                  value={shippingAddress.postalCode}
                  onChange={(e) => handleCepChange(e.target.value)}
                  maxLength={9}
                  className="w-full border border-gray-300 dark:border-gray-400 rounded-lg px-3 py-2 text-xs sm:text-sm dark:bg-gray-900 dark:text-white pr-8"
                />
                {loadingCep ? (
                  <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-500 animate-spin" />
                ) : shippingAddress.postalCode.replace(/\D/g, '').length === 8 ? (
                  <MapPin className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />
                ) : null}
              </div>
              <div className="sm:col-span-2">
                <input
                  type="text"
                  placeholder="Rua / Logradouro"
                  value={shippingAddress.street}
                  onChange={(e) => setShippingAddress({ ...shippingAddress, street: e.target.value })}
                  className="w-full border border-gray-300 dark:border-gray-400 rounded-lg px-3 py-2 text-xs sm:text-sm dark:bg-gray-900 dark:text-white"
                />
              </div>
              <div>
                <input
                  type="text"
                  placeholder="Número"
                  value={shippingAddress.number}
                  onChange={(e) => setShippingAddress({ ...shippingAddress, number: e.target.value })}
                  className="w-full border border-gray-300 dark:border-gray-400 rounded-lg px-3 py-2 text-xs sm:text-sm dark:bg-gray-900 dark:text-white"
                />
              </div>
              <div>
                <input
                  type="text"
                  placeholder="Complemento"
                  value={shippingAddress.complement}
                  onChange={(e) => setShippingAddress({ ...shippingAddress, complement: e.target.value })}
                  className="w-full border border-gray-300 dark:border-gray-400 rounded-lg px-3 py-2 text-xs sm:text-sm dark:bg-gray-900 dark:text-white"
                />
              </div>
              <div>
                <input
                  type="text"
                  placeholder="Bairro"
                  value={shippingAddress.neighborhood}
                  onChange={(e) => setShippingAddress({ ...shippingAddress, neighborhood: e.target.value })}
                  className="w-full border border-gray-300 dark:border-gray-400 rounded-lg px-3 py-2 text-xs sm:text-sm dark:bg-gray-900 dark:text-white"
                />
              </div>
              <div>
                <input
                  type="text"
                  placeholder="Cidade"
                  value={shippingAddress.city}
                  onChange={(e) => setShippingAddress({ ...shippingAddress, city: e.target.value })}
                  className="w-full border border-gray-300 dark:border-gray-400 rounded-lg px-3 py-2 text-xs sm:text-sm dark:bg-gray-900 dark:text-white"
                />
              </div>
              <div>
                <input
                  type="text"
                  placeholder="UF (Estado)"
                  maxLength={2}
                  value={shippingAddress.state}
                  onChange={(e) => setShippingAddress({ ...shippingAddress, state: e.target.value })}
                  className="w-full border border-gray-300 dark:border-gray-400 rounded-lg px-3 py-2 text-xs sm:text-sm dark:bg-gray-900 dark:text-white uppercase"
                />
              </div>
            </div>
          </div>

          {/* Nota Fiscal (NFe) */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-3">
            <h3 className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-1.5">
              <FileText size={16} className="text-gray-500 dark:text-gray-400" />
              <span>Nota Fiscal / NFe (Opcional)</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Arquivo da Nota Fiscal (PDF, XML ou Imagem)
                </label>
                {uploadingInvoice ? (
                  <div className="flex items-center gap-2 p-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-xs text-gray-600 dark:text-gray-400">
                    <Loader2 className="w-4 h-4 animate-spin text-primary-600" />
                    <span>Fazendo upload da Nota Fiscal...</span>
                  </div>
                ) : invoiceUrl ? (
                  <div className="flex items-center justify-between p-2.5 bg-emerald-50 border border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800 rounded-lg">
                    <div className="flex items-center gap-2 text-xs font-medium text-emerald-800 dark:text-emerald-300 truncate min-w-0">
                      <FileCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="truncate">{invoiceFileName || 'Nota Fiscal anexada'}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <a
                        href={invoiceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 text-emerald-700 hover:text-emerald-900 dark:text-emerald-300 dark:hover:text-white"
                        title="Ver Arquivo"
                      >
                        <ExternalLink size={14} />
                      </a>
                      <button
                        type="button"
                        onClick={() => {
                          setInvoiceUrl('')
                          setInvoiceFileName('')
                        }}
                        className="p-1 text-red-600 hover:text-red-800 dark:text-red-400"
                        title="Remover Nota Fiscal"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className="flex items-center justify-center gap-2 px-3 py-2.5 border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-primary-500 rounded-lg cursor-pointer bg-gray-50 dark:bg-gray-900 hover:bg-primary-50/50 text-xs font-medium text-gray-700 dark:text-gray-300 transition-colors">
                    <Upload className="w-4 h-4 text-gray-500" />
                    <span>Selecionar Arquivo (PDF, XML ou Foto)</span>
                    <input
                      type="file"
                      accept=".pdf,.xml,image/*"
                      onChange={handleInvoiceFileChange}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
              <div>
                <label className="block text-[11px] font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Número / Chave da NFe (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ex: NF-001234 ou Chave de Acesso"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-400 rounded-lg px-3 py-2 text-xs sm:text-sm dark:bg-gray-900 dark:text-white"
                />
              </div>
            </div>

            {/* Etiqueta Mercado Livre */}
            <div className="pt-2">
              <label className="block text-[11px] font-medium text-gray-700 dark:text-gray-300 mb-1">
                Etiqueta de Envio Mercado Livre (Arquivo PDF / Imagem)
              </label>
              {uploadingShippingLabel ? (
                <div className="flex items-center gap-2 p-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-xs text-gray-600 dark:text-gray-400">
                  <Loader2 className="w-4 h-4 animate-spin text-primary-600" />
                  <span>Fazendo upload da etiqueta Mercado Livre...</span>
                </div>
              ) : shippingLabelUrl ? (
                <div className="flex items-center justify-between p-2.5 bg-emerald-50 border border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800 rounded-lg">
                  <div className="flex items-center gap-2 text-xs font-medium text-emerald-800 dark:text-emerald-300 truncate min-w-0">
                    <FileCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="truncate">{shippingLabelFileName || 'Etiqueta Mercado Livre anexada'}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <a
                      href={shippingLabelUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 text-emerald-700 hover:text-emerald-900 dark:text-emerald-300 dark:hover:text-white"
                      title="Ver Etiqueta"
                    >
                      <ExternalLink size={14} />
                    </a>
                    <button
                      type="button"
                      onClick={() => {
                        setShippingLabelUrl('')
                        setShippingLabelFileName('')
                      }}
                      className="p-1 text-red-600 hover:text-red-800 dark:text-red-400"
                      title="Remover Etiqueta"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ) : (
                <label className="flex items-center justify-center gap-2 px-3 py-2.5 border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-primary-500 rounded-lg cursor-pointer bg-gray-50 dark:bg-gray-900 hover:bg-primary-50/50 text-xs font-medium text-gray-700 dark:text-gray-300 transition-colors">
                  <Upload className="w-4 h-4 text-gray-500" />
                  <span>Selecionar Arquivo de Etiqueta (PDF ou Foto)</span>
                  <input
                    type="file"
                    accept=".pdf,image/*"
                    onChange={handleShippingLabelFileChange}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-sm rounded-lg bg-primary-600 hover:bg-primary-700 text-white font-medium disabled:opacity-50 flex items-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Criar Pedido</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
