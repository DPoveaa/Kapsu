import { useState, useEffect } from 'react'
import { useSearchParams, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { authService } from '../services/auth.service'
import { uploadService } from '../services/upload.service'
import { addressService, SavedAddress } from '../services/address.service'
import { cepService } from '../services/cep.service'
import { orderService } from '../services/order.service'
import { User, Camera, Lock, Phone, Save, X, Check, MapPin, Plus, Edit, Trash2, Star, Loader2, ChevronRight, Package, Calendar, CreditCard, ShoppingBag, Download } from 'lucide-react'
import { env } from '../config/env'

type ProfileSection = 'info' | 'password' | 'image' | 'addresses' | 'orders' | null

interface OrderItem {
  product_id?: string;
  name?: string;
  product_name?: string;
  quantity: number;
  price: number;
  image_url?: string;
}

interface Order {
  id: string;
  total: number;
  status: string;
  payment_method: string | null;
  shipping_address: string | null;
  created_at: Date | string;
  updated_at: Date | string;
  items?: OrderItem[];
  boleto_url?: string;
}

export default function Profile() {
  const { user, updateUser } = useAuth()
  const [searchParams] = useSearchParams()
  const location = useLocation()
  
  const initialSection = (searchParams.get('section') as ProfileSection) || 
                         (location.state?.section as ProfileSection) || 
                         null
                         
  const [activeSection, setActiveSection] = useState<ProfileSection>(initialSection)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Atualiza activeSection quando searchParams ou location.state mudar
  useEffect(() => {
    const section = (searchParams.get('section') as ProfileSection) || 
                    (location.state?.section as ProfileSection)
    if (section) {
      setActiveSection(section)
    }
  }, [searchParams, location.state])

  // Form states
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [profileImage, setProfileImage] = useState<string | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)

  // Address states
  const [addresses, setAddresses] = useState<SavedAddress[]>([])
  const [editingAddress, setEditingAddress] = useState<SavedAddress | null>(null)
  const [searchingCep, setSearchingCep] = useState(false)
  const [addressForm, setAddressForm] = useState({
    nickname: '',
    cep: '',
    address: '',
    number: '',
    complement: '',
    city: '',
    state: '',
    bairro: '',
    isDefault: false,
  })

  // Orders states
  const [orders, setOrders] = useState<Order[]>([])
  const [loadingOrders, setLoadingOrders] = useState(false)
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      setName(user.name || '')
      
      const userPhone = user.phone || ''
      if (userPhone.startsWith('55') && userPhone.length > 11) {
        setPhone(userPhone.substring(2))
      } else {
        setPhone(userPhone)
      }
      if (user.profile_image) {
        const baseUrl = env.apiUrl.replace('/api', '')
        const imageUrl = user.profile_image.startsWith('http') 
          ? user.profile_image 
          : `${baseUrl}${user.profile_image}`
        setProfileImage(imageUrl)
      } else {
        setProfileImage(null)
      }
    }
  }, [user])

  useEffect(() => {
    if (activeSection === 'addresses') {
      loadAddresses()
    } else if (activeSection === 'orders') {
      loadOrders()
    }
  }, [activeSection])

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => {
        setMessage(null)
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [message])

  const loadAddresses = async () => {
    try {
      const data = await addressService.getSavedAddresses()
      setAddresses(data)
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Erro ao carregar endereços' })
    }
  }

  const loadOrders = async () => {
    try {
      setLoadingOrders(true)
      const data = await orderService.getOrders()
      setOrders(data)
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Erro ao carregar pedidos' })
    } finally {
      setLoadingOrders(false)
    }
  }

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setMessage({ type: 'error', text: 'A imagem deve ter no máximo 5MB' })
        return
      }
      setImageFile(file)
      const reader = new FileReader()
      reader.readAsDataURL(file)
      setMessage(null)
    }
  }

  const handleSaveInfo = async () => {
    try {
      setLoading(true)
      setMessage(null)

      const cleanPhone = phone.replace(/\D/g, '')
      const finalPhone = cleanPhone ? (cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`) : ''

      const result = await authService.updateProfile({
        name: name.trim(),
        phone: finalPhone,
      })

      if (result.success && result.user) {
        updateUser(result.user)
        setMessage({ type: 'success', text: 'Informações atualizadas com sucesso!' })
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Erro ao atualizar informações' })
    } finally {
      setLoading(false)
    }
  }

  const handleSavePassword = async () => {
    try {
      setLoading(true)
      setMessage(null)

      if (newPassword !== confirmPassword) {
        setMessage({ type: 'error', text: 'As senhas não coincidem' })
        return
      }

      if (newPassword.length < 6) {
        setMessage({ type: 'error', text: 'A senha deve ter pelo menos 6 caracteres' })
        return
      }

      const result = await authService.updateProfile({
        currentPassword,
        newPassword,
      })

      if (result.success) {
        setMessage({ type: 'success', text: 'Senha atualizada com sucesso!' })
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Erro ao atualizar senha' })
    } finally {
      setLoading(false)
    }
  }

  const handleSaveImage = async () => {
    try {
      setLoading(true)
      setMessage(null)

      if (!imageFile) {
        setMessage({ type: 'error', text: 'Selecione uma imagem' })
        setLoading(false)
        return
      }

      const uploadResult = await uploadService.uploadProfileImage(imageFile)
      const result = await authService.updateProfileImage(uploadResult.data.path)

      if (result.success && result.user) {
        const baseUrl = env.apiUrl.replace('/api', '')
        const imageUrl = result.user.profile_image 
          ? (result.user.profile_image.startsWith('http') 
              ? result.user.profile_image 
              : `${baseUrl}${result.user.profile_image}`)
          : null
        
        setProfileImage(imageUrl)
        setImageFile(null)
        updateUser(result.user)
        setMessage({ type: 'success', text: 'Imagem de perfil atualizada com sucesso!' })
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Erro ao atualizar imagem de perfil' })
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveImage = async () => {
    try {
      setLoading(true)
      setMessage(null)

      const result = await authService.updateProfileImage('')

      if (result.success && result.user) {
        updateUser(result.user)
        setProfileImage(null)
        setImageFile(null)
        setMessage({ type: 'success', text: 'Imagem de perfil removida com sucesso!' })
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Erro ao remover imagem de perfil' })
    } finally {
      setLoading(false)
    }
  }

  const handleSaveAddress = async () => {
    try {
      setLoading(true)
      setMessage(null)

      if (!addressForm.nickname || !addressForm.cep || !addressForm.address || !addressForm.number || !addressForm.city || !addressForm.state) {
        setMessage({ type: 'error', text: 'Preencha todos os campos obrigatórios' })
        setLoading(false)
        return
      }

      if (editingAddress) {
        await addressService.updateSavedAddress(editingAddress.id, addressForm)
        setMessage({ type: 'success', text: 'Endereço atualizado com sucesso!' })
      } else {
        await addressService.createSavedAddress(addressForm)
        setMessage({ type: 'success', text: 'Endereço adicionado com sucesso!' })
      }

      await loadAddresses()
      setEditingAddress(null)
      setAddressForm({
        nickname: '', cep: '', address: '', number: '', complement: '', bairro: '', city: '', state: '', isDefault: false,
      })
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Erro ao salvar endereço' })
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteAddress = async (id: string) => {
    if (!confirm('Tem certeza que deseja remover este endereço?')) return

    try {
      setLoading(true)
      await addressService.deleteSavedAddress(id)
      setMessage({ type: 'success', text: 'Endereço removido com sucesso!' })
      await loadAddresses()
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Erro ao remover endereço' })
    } finally {
      setLoading(false)
    }
  }

  const handleSetDefaultAddress = async (id: string) => {
    try {
      setLoading(true)
      await addressService.setDefaultAddress(id)
      setMessage({ type: 'success', text: 'Endereço definido como padrão!' })
      await loadAddresses()
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Erro ao definir endereço padrão' })
    } finally {
      setLoading(false)
    }
  }

  const handleCEPChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '')
    if (value.length <= 8) {
      const formatted = value.length > 5 ? `${value.substring(0, 5)}-${value.substring(5)}` : value
      setAddressForm({ ...addressForm, cep: formatted })
      
      if (value.length === 8) {
        try {
          setSearchingCep(true)
          const cepData = await cepService.searchCep(value)
          
          if (cepData && !cepData.erro) {
            setAddressForm(prev => ({
              ...prev,
              cep: cepData.cep,
              address: cepData.logradouro || prev.address,
              bairro: cepData.bairro || prev.bairro,
              city: cepData.localidade || prev.city,
              state: cepData.uf || prev.state,
              complement: cepData.complemento || prev.complement,
            }))
          }
        } catch (error) {
          console.error('Erro ao buscar CEP:', error)
        } finally {
          setSearchingCep(false)
        }
      }
    }
  }

  const handleEditAddress = (address: SavedAddress) => {
    setEditingAddress(address)
    setAddressForm({
      nickname: address.nickname,
      cep: address.cep,
      address: address.address,
      number: address.number,
      complement: address.complement || '',
      bairro: (address as any).bairro || '',
      city: address.city,
      state: address.state,
      isDefault: address.is_default,
    })
  }

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)
  }

  const formatDate = (dateString: string | Date) => {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    }).format(new Date(dateString))
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
  }

  const renderShippingAddress = (addressStr: string | null) => {
    if (!addressStr) return 'Endereço não informado'
    try {
      const addr = JSON.parse(addressStr)
      return `${addr.address}, ${addr.number}${addr.complement ? ` - ${addr.complement}` : ''}\n${addr.bairro ? addr.bairro + ' - ' : ''}${addr.city} - ${addr.state}\nCEP: ${addr.cep}`
    } catch(e) {
      return addressStr 
    }
  }

  const translateStatus = (status: string) => {
    const statusMap: Record<string, string> = {
      'pending': 'Pendente',
      'paid': 'Pago',
      'shipped': 'Enviado',
      'delivered': 'Entregue',
      'cancelled': 'Cancelado',
      'processing': 'Processando'
    }
    return statusMap[status] || status
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': case 'delivered': return { bg: 'bg-green-100', text: 'text-green-600', badge: 'bg-green-100 text-green-700' }
      case 'pending': case 'processing': return { bg: 'bg-yellow-100', text: 'text-yellow-600', badge: 'bg-yellow-100 text-yellow-700' }
      case 'cancelled': return { bg: 'bg-red-100', text: 'text-red-600', badge: 'bg-red-100 text-red-700' }
      default: return { bg: 'bg-blue-100', text: 'text-blue-600', badge: 'bg-blue-100 text-blue-700' }
    }
  }

  const getOrderImage = (order: Order) => {
    if (order.items && order.items.length > 0) {
      const itemWithImage = order.items.find(item => item.image_url);
      if (itemWithImage && itemWithImage.image_url) {
         return itemWithImage.image_url.startsWith('http') ? itemWithImage.image_url : `${env.apiUrl.replace('/api', '')}${itemWithImage.image_url}`;
      }
    }
    return null;
  }

  const renderTimeline = (status: string) => {
    if (status === 'cancelled') {
      return (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-100 dark:border-red-900">
          <p className="text-red-600 dark:text-red-400 font-medium flex items-center gap-2">
            <X className="w-5 h-5" /> Pedido Cancelado
          </p>
        </div>
      )
    }

    const steps = [
      { key: 'pending', label: 'Realizado' },
      { key: 'paid', label: 'Pago' },
      { key: 'processing', label: 'Preparação' },
      { key: 'shipped', label: 'Enviado' },
      { key: 'delivered', label: 'Entregue' }
    ];

    const mapIndex: Record<string, number> = {
      'pending': 0, 'paid': 1, 'processing': 2, 'shipped': 3, 'delivered': 4
    };
    const currentIndex = mapIndex[status] !== undefined ? mapIndex[status] : 0;

    return (
      <div className="mt-4 mb-10 px-4 sm:px-8">
        <div className="relative flex items-center justify-between">
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
          <div 
            className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-primary-500 rounded-full transition-all duration-500"
            style={{ width: `${(currentIndex / (steps.length - 1)) * 100}%` }}
          ></div>
          {steps.map((step, idx) => {
            const isCompleted = idx <= currentIndex;
            const isActive = idx === currentIndex;
            return (
              <div key={step.key} className="relative z-10 flex flex-col items-center">
                <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-colors duration-300 ${
                  isCompleted ? 'bg-primary-500 text-white shadow-md shadow-primary-500/30' : 'bg-gray-200 dark:bg-gray-700 text-gray-400'
                }`}>
                  {isCompleted ? <Check className="w-3 h-3 sm:w-4 sm:h-4" /> : <div className="w-2 h-2 rounded-full bg-white dark:bg-gray-800"></div>}
                </div>
                <p className={`absolute top-8 sm:top-10 text-[10px] sm:text-xs text-center w-16 sm:w-20 -ml-8 sm:-ml-10 ${
                  isActive ? 'text-primary-600 dark:text-primary-400 font-bold' : isCompleted ? 'text-gray-800 dark:text-gray-200 font-medium' : 'text-gray-400'
                }`}>
                  {step.label}
                </p>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  const menuItems = [
    { id: 'info', label: 'Minha Conta', icon: User, description: 'Dados pessoais' },
    { id: 'image', label: 'Foto de Perfil', icon: Camera, description: 'Atualizar foto' },
    { id: 'password', label: 'Segurança', icon: Lock, description: 'Alterar senha' },
    { id: 'addresses', label: 'Endereços', icon: MapPin, description: 'Locais de entrega' },
    { id: 'orders', label: 'Meus Pedidos', icon: Package, description: 'Histórico de compras' },
  ]

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500 flex items-center gap-2"><Loader2 className="animate-spin w-5 h-5"/> Carregando...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-gray-900 py-6 sm:py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col lg:flex-row gap-6 relative">
          
          {/* Sidebar Menu */}
          <div className={`w-full lg:w-1/3 xl:w-1/4 ${activeSection ? 'hidden lg:block' : 'block'}`}>
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden lg:sticky lg:top-8">
              {/* User Header */}
              <div className="bg-gradient-to-br from-primary-50 to-primary-100 dark:from-gray-800 dark:to-[#0F828C] p-6 flex flex-col items-center text-center border-b border-gray-100 dark:border-gray-700">
                <div className="relative mb-4">
                  {profileImage ? (
                    <img src={profileImage} alt={user.name} className="w-24 h-24 rounded-full object-cover border-4 border-white dark:border-gray-800 shadow-md" />
                  ) : (
                    <div className="w-24 h-24 rounded-full flex items-center justify-center text-white text-3xl font-bold border-4 border-white dark:border-gray-800 shadow-md bg-[#67C090]">
                      {getInitials(user.name)}
                    </div>
                  )}
                </div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white break-words">{user.name}</h1>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{user.email}</p>
              </div>
              
              {/* Navigation */}
              <nav className="p-3 space-y-1">
                {menuItems.map(item => (
                  <button
                    key={item.id}
                    onClick={() => setActiveSection(item.id as ProfileSection)}
                    className={`w-full flex items-center p-3 rounded-xl transition-all duration-200 group ${activeSection === item.id ? 'bg-primary-50 dark:bg-primary-900/20 border border-primary-100 dark:border-primary-800' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50 border border-transparent'}`}
                  >
                    <div className={`p-2 rounded-lg ${activeSection === item.id ? 'bg-primary-100 dark:bg-primary-800/50 text-primary-600 dark:text-primary-400' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 group-hover:text-primary-600 dark:group-hover:text-primary-400'}`}>
                      <item.icon className="w-5 h-5" />
                    </div>
                    <div className="text-left ml-3 flex-1">
                      <p className={`font-medium ${activeSection === item.id ? 'text-primary-700 dark:text-primary-300' : 'text-gray-700 dark:text-gray-300 group-hover:text-primary-600 dark:group-hover:text-primary-400'}`}>{item.label}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{item.description}</p>
                    </div>
                    <ChevronRight className={`w-5 h-5 ${activeSection === item.id ? 'text-primary-500' : 'text-gray-400'}`} />
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Main Content Area */}
          <div className={`w-full lg:w-2/3 xl:w-3/4 ${!activeSection ? 'hidden lg:block' : 'block'}`}>
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-5 sm:p-8 min-h-[500px]">
              
              {/* Mobile Back Button */}
              <button 
                className="lg:hidden flex items-center gap-2 mb-6 text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 font-medium transition-colors"
                onClick={() => setActiveSection(null)}
              >
                <ChevronRight className="w-5 h-5 rotate-180" />
                Voltar para o Menu
              </button>

              {/* Global Messages */}
              {message && (
                <div className={`mb-6 p-4 rounded-xl flex items-start justify-between gap-3 ${message.type === 'success' ? 'bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-200 border border-green-100 dark:border-green-800' : 'bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-200 border border-red-100 dark:border-red-800'}`}>
                  <div className="flex items-center gap-2 mt-0.5">
                    {message.type === 'success' ? <Check className="w-5 h-5 flex-shrink-0" /> : <X className="w-5 h-5 flex-shrink-0" />}
                    <span>{message.text}</span>
                  </div>
                  <button onClick={() => setMessage(null)} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 flex-shrink-0"><X className="w-4 h-4" /></button>
                </div>
              )}

              {/* No section selected (Desktop empty state) */}
              {!activeSection && (
                <div className="hidden lg:flex flex-col items-center justify-center h-full min-h-[400px] text-gray-400 dark:text-gray-500">
                  <div className="p-6 bg-gray-50 dark:bg-gray-900/50 rounded-full mb-4">
                    <User className="w-12 h-12 text-gray-300 dark:text-gray-600" />
                  </div>
                  <p className="text-lg font-medium">Selecione uma opção no menu ao lado</p>
                  <p className="text-sm mt-1">Gerencie suas configurações e histórico de compras</p>
                </div>
              )}

              {/* Minha Conta Section */}
              {activeSection === 'info' && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                    <User className="text-primary-500" />
                    Informações Pessoais
                  </h2>
                  <div className="space-y-5">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Nome Completo</label>
                      <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none text-gray-900 dark:text-white" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2"><Phone className="w-4 h-4 text-gray-400" /> Telefone / WhatsApp</label>
                      <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(00) 00000-0000" className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none text-gray-900 dark:text-white" />
                    </div>
                    <div className="pt-4 flex gap-3">
                      <button onClick={handleSaveInfo} disabled={loading} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors font-medium shadow-sm shadow-primary-600/20 disabled:opacity-70"><Save className="w-5 h-5" /> Salvar Alterações</button>
                    </div>
                  </div>
                </div>
              )}

              {/* Segurança Section */}
              {activeSection === 'password' && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                    <Lock className="text-primary-500" />
                    Segurança e Senha
                  </h2>
                  <div className="space-y-5 max-w-md">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Senha Atual</label>
                      <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-gray-900 dark:text-white" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Nova Senha</label>
                      <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-gray-900 dark:text-white" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Confirmar Nova Senha</label>
                      <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-gray-900 dark:text-white" />
                    </div>
                    <div className="pt-4">
                      <button onClick={handleSavePassword} disabled={loading} className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors font-medium shadow-sm shadow-primary-600/20 disabled:opacity-70"><Save className="w-5 h-5" /> Atualizar Senha</button>
                    </div>
                  </div>
                </div>
              )}

              {/* Foto Section */}
              {activeSection === 'image' && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                    <Camera className="text-primary-500" />
                    Foto de Perfil
                  </h2>
                  <div className="flex flex-col sm:flex-row items-center sm:items-start gap-8">
                    <div className="relative group">
                      {imageFile ? (
                        <img src={URL.createObjectURL(imageFile)} alt="Preview" className="w-32 h-32 rounded-full object-cover border-4 border-gray-100 dark:border-gray-700 shadow-md" />
                      ) : profileImage ? (
                        <img src={profileImage} alt={user.name} className="w-32 h-32 rounded-full object-cover border-4 border-gray-100 dark:border-gray-700 shadow-md" />
                      ) : (
                        <div className="w-32 h-32 rounded-full flex items-center justify-center text-white text-3xl font-bold border-4 border-gray-100 dark:border-gray-700 shadow-md bg-[#67C090]">
                          {getInitials(user.name)}
                        </div>
                      )}
                      <label className="absolute bottom-0 right-0 p-3 bg-primary-600 text-white rounded-full shadow-lg cursor-pointer hover:bg-primary-700 transition-transform hover:scale-105 active:scale-95">
                        <Camera className="w-5 h-5" />
                        <input type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
                      </label>
                    </div>
                    <div className="flex-1 text-center sm:text-left">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Envie uma nova foto</h3>
                      <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">Formatos aceitos: JPG, PNG, GIF. Tamanho máximo: 5MB.</p>
                      <div className="flex flex-wrap gap-3 justify-center sm:justify-start">
                        <button onClick={handleSaveImage} disabled={loading || !imageFile} className="flex items-center gap-2 px-6 py-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors font-medium shadow-sm shadow-primary-600/20 disabled:opacity-50"><Save className="w-5 h-5" /> Salvar Imagem</button>
                        {user.profile_image && (
                          <button onClick={handleRemoveImage} disabled={loading} className="flex items-center gap-2 px-6 py-2.5 bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors font-medium"><Trash2 className="w-5 h-5" /> Remover Atual</button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Endereços Section */}
              {activeSection === 'addresses' && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      <MapPin className="text-primary-500" />
                      Endereços Salvos
                    </h2>
                    {!editingAddress && !addressForm.cep && (
                      <button onClick={() => setAddressForm({ ...addressForm, nickname: 'Novo' })} className="flex items-center justify-center gap-2 px-4 py-2 bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300 rounded-xl hover:bg-primary-100 dark:hover:bg-primary-900/50 transition-colors font-medium border border-primary-200 dark:border-primary-800">
                        <Plus className="w-5 h-5" /> Adicionar Novo
                      </button>
                    )}
                  </div>

                  {(editingAddress || addressForm.nickname || addressForm.cep) && (
                    <div className="bg-gray-50 dark:bg-gray-800/80 rounded-2xl p-5 sm:p-6 border border-gray-200 dark:border-gray-700 mb-8 relative">
                      <button onClick={() => { setEditingAddress(null); setAddressForm({ nickname: '', cep: '', address: '', number: '', complement: '', bairro: '', city: '', state: '', isDefault: false }) }} className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 bg-white dark:bg-gray-700 rounded-full shadow-sm"><X className="w-4 h-4" /></button>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-5">{editingAddress ? 'Editar Endereço' : 'Cadastrar Novo Endereço'}</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Apelido (Ex: Casa, Trabalho) *</label>
                          <input type="text" value={addressForm.nickname} onChange={(e) => setAddressForm({ ...addressForm, nickname: e.target.value })} className="w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">CEP *</label>
                          <div className="relative">
                            <input type="text" value={addressForm.cep} onChange={handleCEPChange} maxLength={9} className="w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none" />
                            {searchingCep && <Loader2 className="absolute right-3 top-3 w-5 h-5 animate-spin text-primary-500" />}
                          </div>
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Endereço *</label>
                          <input type="text" value={addressForm.address} onChange={(e) => setAddressForm({ ...addressForm, address: e.target.value })} className="w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Número *</label>
                          <input type="text" value={addressForm.number} onChange={(e) => setAddressForm({ ...addressForm, number: e.target.value })} className="w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Complemento</label>
                          <input type="text" value={addressForm.complement} onChange={(e) => setAddressForm({ ...addressForm, complement: e.target.value })} className="w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Bairro</label>
                          <input type="text" value={addressForm.bairro} onChange={(e) => setAddressForm({ ...addressForm, bairro: e.target.value })} className="w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Cidade *</label>
                          <input type="text" value={addressForm.city} onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })} className="w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Estado (UF) *</label>
                          <input type="text" value={addressForm.state} onChange={(e) => setAddressForm({ ...addressForm, state: e.target.value.toUpperCase().substring(0, 2) })} maxLength={2} className="w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none" />
                        </div>
                        <div className="md:col-span-2 mt-2">
                          <label className="flex items-center gap-3 cursor-pointer p-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-primary-300 transition-colors">
                            <input type="checkbox" checked={addressForm.isDefault} onChange={(e) => setAddressForm({ ...addressForm, isDefault: e.target.checked })} className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500" />
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Definir como endereço padrão para entregas</span>
                          </label>
                        </div>
                      </div>
                      <div className="mt-6 flex justify-end gap-3">
                        <button onClick={handleSaveAddress} disabled={loading} className="px-6 py-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-700 font-medium shadow-sm transition-colors disabled:opacity-70 flex items-center gap-2"><Save className="w-5 h-5" /> Salvar Endereço</button>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {addresses.length === 0 && !addressForm.nickname ? (
                      <div className="col-span-full py-10 text-center text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700">
                        <MapPin className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p className="font-medium text-lg text-gray-600 dark:text-gray-300">Nenhum endereço encontrado</p>
                        <p className="text-sm mt-1">Adicione um endereço para facilitar suas compras.</p>
                      </div>
                    ) : (
                      addresses.map((address) => (
                        <div key={address.id} className={`p-5 rounded-2xl border-2 transition-all ${address.is_default ? 'border-primary-500 bg-primary-50/50 dark:bg-primary-900/10 dark:border-primary-600 shadow-sm' : 'border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'}`}>
                          <div className="flex justify-between items-start mb-3">
                            <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                              {address.nickname}
                              {address.is_default && <span className="px-2.5 py-0.5 bg-primary-100 text-primary-700 text-xs rounded-full font-semibold flex items-center gap-1"><Star className="w-3 h-3 fill-primary-700" /> Padrão</span>}
                            </h3>
                            <div className="flex gap-1 bg-gray-50 dark:bg-gray-900 p-1 rounded-lg">
                              {!address.is_default && (
                                <button onClick={() => handleSetDefaultAddress(address.id)} className="p-1.5 text-gray-400 hover:text-primary-600 rounded-md hover:bg-white dark:hover:bg-gray-800 transition-colors" title="Tornar Padrão"><Star className="w-4 h-4" /></button>
                              )}
                              <button onClick={() => handleEditAddress(address)} className="p-1.5 text-gray-400 hover:text-blue-600 rounded-md hover:bg-white dark:hover:bg-gray-800 transition-colors" title="Editar"><Edit className="w-4 h-4" /></button>
                              <button onClick={() => handleDeleteAddress(address.id)} className="p-1.5 text-gray-400 hover:text-red-600 rounded-md hover:bg-white dark:hover:bg-gray-800 transition-colors" title="Excluir"><Trash2 className="w-4 h-4" /></button>
                            </div>
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                            <p className="font-medium text-gray-800 dark:text-gray-300">{address.address}, {address.number} {address.complement && `- ${address.complement}`}</p>
                            <p>{address.bairro && `${address.bairro}, `}{address.city} - {address.state}</p>
                            <p className="text-xs mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">CEP: {address.cep}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Meus Pedidos Section */}
              {activeSection === 'orders' && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                    <Package className="text-primary-500" />
                    Meus Pedidos
                  </h2>

                  {loadingOrders ? (
                    <div className="py-20 flex flex-col items-center justify-center text-primary-600 dark:text-primary-400">
                      <Loader2 className="w-10 h-10 animate-spin mb-4" />
                      <p className="font-medium text-gray-600 dark:text-gray-300">Buscando seus pedidos...</p>
                    </div>
                  ) : orders.length === 0 ? (
                    <div className="py-16 text-center bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700">
                      <ShoppingBag className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                      <p className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Você ainda não tem pedidos</p>
                      <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto">Explore nossos produtos e encontre as melhores opções para sua saúde.</p>
                      <a href="/produtos" className="inline-block mt-6 px-6 py-2.5 bg-primary-600 text-white font-medium rounded-xl hover:bg-primary-700 transition-colors">Ver Produtos</a>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {orders.map((order) => (
                        <div key={order.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden shadow-sm hover:border-primary-300 dark:hover:border-primary-700 transition-colors">
                          <div 
                            className="p-4 sm:p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center cursor-pointer bg-gray-50/50 dark:bg-gray-800/30 hover:bg-primary-50/30 dark:hover:bg-gray-800/80 transition-colors"
                            onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                          >
                            <div className="flex items-center gap-4 mb-4 sm:mb-0">
                               {getOrderImage(order) ? (
                                 <img src={getOrderImage(order)!} alt="Pedido" className="w-12 h-12 rounded-xl object-cover border border-gray-100 dark:border-gray-700 shadow-sm" />
                               ) : (
                                 <div className={`p-3 rounded-xl ${getStatusColor(order.status).bg}`}>
                                    <Package className={`w-6 h-6 ${getStatusColor(order.status).text}`} />
                                 </div>
                               )}
                               <div>
                                 <p className="font-bold text-gray-900 dark:text-white text-lg tracking-tight">Pedido #{order.id.substring(0, 8).toUpperCase()}</p>
                                 <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1.5 mt-0.5">
                                   <Calendar className="w-4 h-4" />
                                   {formatDate(order.created_at)}
                                 </p>
                               </div>
                            </div>
                            <div className="flex items-center justify-between w-full sm:w-auto sm:justify-end gap-5">
                               <div className="text-left sm:text-right">
                                 <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider mb-0.5">Total</p>
                                 <p className="font-bold text-gray-900 dark:text-white text-lg">{formatCurrency(order.total)}</p>
                               </div>
                               <div className={`px-3.5 py-1.5 rounded-lg text-sm font-semibold tracking-wide ${getStatusColor(order.status).badge}`}>
                                 {translateStatus(order.status)}
                               </div>
                               <div className={`p-2 rounded-full bg-white dark:bg-gray-700 shadow-sm border border-gray-100 dark:border-gray-600 transition-transform ${expandedOrder === order.id ? 'rotate-90 bg-primary-50 dark:bg-primary-900/50 border-primary-100 dark:border-primary-800' : ''}`}>
                                  <ChevronRight className={`w-5 h-5 ${expandedOrder === order.id ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400'}`} />
                               </div>
                            </div>
                          </div>
                          
                          {expandedOrder === order.id && (
                             <div className="p-5 sm:p-6 border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 animate-in slide-in-from-top-2">
                                {renderTimeline(order.status)}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                   <div className="bg-gray-50 dark:bg-gray-900/50 p-5 rounded-2xl border border-gray-100 dark:border-gray-800">
                                     <h4 className="font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                                       <MapPin className="w-5 h-5 text-primary-500" />
                                       Endereço de Entrega
                                     </h4>
                                     <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-line">
                                       {renderShippingAddress(order.shipping_address)}
                                     </p>
                                   </div>
                                   <div className="bg-gray-50 dark:bg-gray-900/50 p-5 rounded-2xl border border-gray-100 dark:border-gray-800">
                                     <h4 className="font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                                       <CreditCard className="w-5 h-5 text-primary-500" />
                                       Detalhes do Pagamento
                                     </h4>
                                     <div className="space-y-2">
                                       <div className="flex justify-between items-center text-sm">
                                         <span className="text-gray-500 dark:text-gray-400">Método:</span>
                                         <span className="font-semibold text-gray-900 dark:text-white">
                                            {order.payment_method === 'credit_card' ? 'Cartão de Crédito' : order.payment_method === 'pix' ? 'PIX' : order.payment_method === 'boleto' ? 'Boleto' : 'Não informado'}
                                         </span>
                                       </div>
                                       <div className="flex justify-between items-center text-sm">
                                         <span className="text-gray-500 dark:text-gray-400">Status Financeiro:</span>
                                         <span className="font-semibold text-gray-900 dark:text-white">{translateStatus(order.status)}</span>
                                       </div>
                                       {order.boleto_url && (
                                          <div className="flex justify-between items-center text-sm mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                                             <span className="text-gray-500 dark:text-gray-400">Boleto Bancário:</span>
                                             <a href={order.boleto_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-50 text-primary-600 hover:bg-primary-100 dark:bg-primary-900/30 dark:text-primary-400 dark:hover:bg-primary-900/50 rounded-lg font-semibold transition-colors">
                                               <Download className="w-4 h-4" />
                                               Baixar PDF
                                             </a>
                                          </div>
                                       )}
                                     </div>
                                   </div>
                                </div>
                                
                                {order.items && order.items.length > 0 && (
                                  <div className="mt-6">
                                     <h4 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                       <ShoppingBag className="w-5 h-5 text-primary-500" />
                                       Itens do Pedido ({order.items.length})
                                     </h4>
                                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                       {order.items.map((item, idx) => (
                                          <div key={idx} className="flex items-center gap-4 p-3 border border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/30 rounded-xl">
                                            {item.image_url ? (
                                              <img src={item.image_url.startsWith('http') ? item.image_url : `${env.apiUrl.replace('/api', '')}${item.image_url}`} alt="Produto" className="w-14 h-14 object-cover rounded-lg border border-gray-100 dark:border-gray-700 shadow-sm flex-shrink-0" />
                                            ) : (
                                              <div className="w-14 h-14 bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700 rounded-lg flex items-center justify-center flex-shrink-0">
                                                <Package className="w-7 h-7 text-gray-400" />
                                              </div>
                                            )}
                                            <div className="flex-1 min-w-0">
                                              <p className="font-medium text-gray-900 dark:text-white text-sm truncate">{item.product_name || item.name || 'Produto'}</p>
                                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Qtd: {item.quantity}</p>
                                            </div>
                                            <div className="text-right">
                                              <p className="font-bold text-gray-900 dark:text-white text-sm">{formatCurrency(item.price || 0)}</p>
                                            </div>
                                          </div>
                                       ))}
                                     </div>
                                  </div>
                                )}
                             </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
