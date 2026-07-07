import { useState, useEffect } from 'react'
import { useSearchParams, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { authService } from '../services/auth.service'
import { uploadService } from '../services/upload.service'
import { addressService, SavedAddress } from '../services/address.service'
import { cepService } from '../services/cep.service'
import { orderService } from '../services/order.service'
import { productsService } from '../services/products.service'
import { paymentService, PaymentResult } from '../services/payment.service'
import { useFavorites } from '../context/FavoritesContext'
import { reviewsService, Review } from '../services/reviews.service'
import { Product } from '../types'
import { User, Camera, Phone, Save, X, Check, MapPin, Plus, Edit, Trash2, Star, Loader2, ChevronRight, Package, Calendar, CreditCard, ShoppingBag, Download, ArrowLeft, Mail, FileText, Heart, Bell, HelpCircle, LogOut, Copy, QrCode, Barcode, ShieldCheck } from 'lucide-react'
import { env } from '../config/env'
import { confirm, toast } from '../utils/toast'
import { getOrderStatusLabel, getOrderStatusBadgeClass, isInvoiceEligibleStatus } from '../utils/orderStatus'

type ProfileSection = 'info' | 'password' | 'image' | 'addresses' | 'orders' | 'favorites' | 'reviews' | 'notifications' | 'help' | 'connected-accounts' | null

const TAB_TO_SECTION: Record<string, ProfileSection> = {
  info: 'info',
  addresses: 'addresses',
  orders: 'orders',
  favorites: 'favorites',
  reviews: 'reviews',
  notifications: 'notifications',
  help: 'help',
  'connected-accounts': 'connected-accounts',
}

function resolveProfileSection(
  searchParams: URLSearchParams,
  locationSection?: ProfileSection | null
): ProfileSection | null {
  const tab = searchParams.get('tab')
  if (tab && TAB_TO_SECTION[tab]) {
    return TAB_TO_SECTION[tab]
  }
  const section = searchParams.get('section') as ProfileSection | null
  if (section) return section
  return locationSection ?? null
}

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
  payment_url?: string;
}

export default function Profile() {
  const navigate = useNavigate()
  const { user, logout, updateUser } = useAuth()
  const { favorites } = useFavorites()
  const [searchParams] = useSearchParams()
  const location = useLocation()

  const initialSection = resolveProfileSection(
    searchParams,
    (location.state?.section as ProfileSection) || null
  )

  const [activeSection, setActiveSection] = useState<ProfileSection>(() => {
    if (initialSection) return initialSection
    if (typeof window !== 'undefined' && window.innerWidth >= 1024) return 'info'
    return null
  })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Atualiza activeSection quando searchParams ou location.state mudar
  useEffect(() => {
    const section = resolveProfileSection(
      searchParams,
      (location.state?.section as ProfileSection) || null
    )
    if (section) {
      setActiveSection(section)
      if (section === 'notifications') {
        setTimeout(() => {
          document.getElementById('profile-notifications-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }, 150)
      }
    }
  }, [searchParams, location.state])

  // Form states
  const [phone, setPhone] = useState('')
  const [profileImage, setProfileImage] = useState<string | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editName, setEditName] = useState('')
  const [editPhone, setEditPhone] = useState('')

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
  const [invoices, setInvoices] = useState<Record<string, any>>({})
  const [loadingInvoices, setLoadingInvoices] = useState<Record<string, boolean>>({})
  const [ordersPage, setOrdersPage] = useState(1)
  const ordersPerPage = 5
  const [updatingPaymentLoading, setUpdatingPaymentLoading] = useState<Record<string, boolean>>({})
  const [orderPaymentPreview, setOrderPaymentPreview] = useState<Record<string, PaymentResult>>({})
  const [copiedPixOrderId, setCopiedPixOrderId] = useState<string | null>(null)

  // Favorites & Reviews states
  const [favoriteProducts, setFavoriteProducts] = useState<Product[]>([])
  const [loadingFavorites, setLoadingFavorites] = useState(false)
  const [myReviews, setMyReviews] = useState<Review[]>([])
  const [loadingReviews, setLoadingReviews] = useState(false)

  // Connected Accounts states
  const [connectedProviders, setConnectedProviders] = useState<string[]>([])
  const [loadingProviders, setLoadingProviders] = useState(false)
  const [loadingSocialAction, setLoadingSocialAction] = useState(false)

  // Notification states derived from auth context user settings
  const notifWhatsApp = user?.whatsapp_notifications_enabled ?? true
  const notifEmail = user?.email_notifications_enabled ?? true
  const notifOrderStatus = user?.order_status_notifications_enabled ?? true
  const notifPromotions = user?.promotions_notifications_enabled ?? true
  const notifWhatsAppOrder = user?.whatsapp_order_confirmation_enabled ?? false

  const updatePreference = async (key: string, value: boolean) => {
    try {
      const updates: any = { [key]: value }

      // If turning off WhatsApp globally, disable WhatsApp order confirmation
      if (key === 'whatsapp_notifications_enabled' && !value) {
        updates.whatsapp_order_confirmation_enabled = false
      }

      // Synchronize WhatsApp order updates to match the global order notification setting
      if (key === 'order_status_notifications_enabled') {
        updates.whatsapp_order_confirmation_enabled = value
      }

      const result = await authService.updateProfile(updates)
      if (result.success && result.user) {
        updateUser(result.user)
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Erro ao atualizar preferências' })
    }
  }

  useEffect(() => {
    if (user) {
      setEditName(user.name || '')

      const userPhone = user.phone || ''
      let formattedPhone = ''
      if (userPhone.startsWith('55') && userPhone.length > 11) {
        formattedPhone = userPhone.substring(2)
      } else {
        formattedPhone = userPhone
      }
      setPhone(formattedPhone)
      setEditPhone(formattedPhone)

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

  // Garante que no desktop tenhamos sempre uma seção ativa
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024 && activeSection === null) {
        setActiveSection('info')
      }
    }
    window.addEventListener('resize', handleResize)
    handleResize()
    return () => window.removeEventListener('resize', handleResize)
  }, [activeSection])

  // Carrega dados iniciais
  useEffect(() => {
    if (user) {
      loadOrders()
      loadFavorites()
      loadReviews()
      loadAddresses()
    }
  }, [user])

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    if (activeSection === 'addresses') {
      loadAddresses()
    } else if (activeSection === 'orders') {
      loadOrders()

      intervalId = setInterval(() => {
        orderService.getOrders()
          .then(data => setOrders(data))
          .catch(err => console.error('Erro ao atualizar pedidos:', err))
      }, 10000)
    } else if (activeSection === 'favorites') {
      loadFavorites()
    } else if (activeSection === 'reviews') {
      loadReviews()
    } else if (activeSection === 'connected-accounts') {
      loadConnectedProviders()
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    }
  }, [activeSection])

  const loadConnectedProviders = async () => {
    try {
      setLoadingProviders(true)
      const data = await authService.getLinkedProviders()
      if (data.success && data.providers) {
        setConnectedProviders(data.providers)
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Erro ao carregar provedores conectados' })
    } finally {
      setLoadingProviders(false)
    }
  }

  useEffect(() => {
    console.log('[GSI LINK DIAGNOSTICS] useEffect disparado. Estado:', {
      activeSection,
      googleConnected: connectedProviders.includes('google'),
      googleClientId: env.googleClientId || 'NÃO DEFINIDO/VAZIO'
    });

    if (activeSection === 'connected-accounts' && !connectedProviders.includes('google')) {
      const initializeGoogleLink = () => {
        const hasGoogle = typeof window !== 'undefined' && !!(window as any).google;
        const hasClientId = !!env.googleClientId;

        console.log('[GSI LINK DIAGNOSTICS] Executando initializeGoogleLink...', {
          scriptLoaded: hasGoogle,
          hasClientId,
          clientIdValue: env.googleClientId
        });

        if (!hasGoogle) {
          console.warn('[GSI LINK DIAGNOSTICS] AVISO: window.google está undefined.');
          return;
        }

        if (!hasClientId) {
          console.error('[GSI LINK DIAGNOSTICS] ERRO CRÍTICO: Google Client ID está vazio no frontend.');
          return;
        }

        try {
          console.log('[GSI LINK DIAGNOSTICS] Chamando google.accounts.id.initialize...');
          (window as any).google.accounts.id.initialize({
            client_id: env.googleClientId,
            callback: handleGoogleLinkResponse,
            auto_select: false,
            itp_support: true
          });

          const linkContainer = document.getElementById('google-link-btn-container');
          console.log('[GSI LINK DIAGNOSTICS] Buscando elemento google-link-btn-container:', {
            found: !!linkContainer
          });

          if (linkContainer) {
            console.log('[GSI LINK DIAGNOSTICS] Chamando google.accounts.id.renderButton para link...');
            const isDark = document.documentElement.classList.contains('dark');
            linkContainer.innerHTML = ''; // Limpa botões antigos/duplicados!
            (window as any).google.accounts.id.renderButton(linkContainer, {
              theme: isDark ? 'filled_black' : 'outline',
              size: 'medium',
              text: 'signup_with',
              shape: 'rectangular'
            });
            console.log('[GSI LINK DIAGNOSTICS] renderButton para link concluído.');
          } else {
            console.error('[GSI LINK DIAGNOSTICS] ERRO: Elemento google-link-btn-container não encontrado no DOM.');
          }
        } catch (e: any) {
          console.error('[GSI LINK DIAGNOSTICS] EXCEÇÃO capturada:', e.message, e);
        }
      };

      initializeGoogleLink();

      // Configura polling/timeout apenas se o script do Google ainda não estiver pronto
      let checkInterval: any = null;
      if (typeof window !== 'undefined' && !(window as any).google) {
        checkInterval = setInterval(() => {
          if ((window as any).google) {
            console.log('[GSI LINK DIAGNOSTICS] Script carregado tardiamente. Inicializando...');
            initializeGoogleLink();
            clearInterval(checkInterval);
          }
        }, 500);
      }

      return () => {
        console.log('[GSI LINK DIAGNOSTICS] Limpando interval.');
        if (checkInterval) {
          clearInterval(checkInterval);
        }
      };
    }
  }, [activeSection, connectedProviders, env.googleClientId])

  const handleGoogleLinkResponse = async (response: any) => {
    try {
      setLoadingSocialAction(true)
      const res = await authService.linkSocial('google', response.credential)
      if (res.success) {
        toast.success('Conta Google vinculada com sucesso!')
        loadConnectedProviders()
      } else {
        toast.error(res.message || 'Erro ao vincular conta Google')
      }
    } catch (e: any) {
      toast.error(e.message || 'Erro de conexão ao vincular conta')
    } finally {
      setLoadingSocialAction(false)
    }
  }

  const handleUnlinkProvider = async (provider: string) => {
    confirm.show(
      `Tem certeza de que deseja desvincular o provedor ${provider === 'google' ? 'Google' : provider}?`,
      async () => {
        try {
          setLoadingSocialAction(true)
          const res = await authService.unlinkSocial(provider)
          if (res.success) {
            toast.success('Provedor desvinculado com sucesso!')
            loadConnectedProviders()
          } else {
            toast.error(res.message || 'Erro ao desvincular provedor')
          }
        } catch (e: any) {
          toast.error(e.message || 'Erro de conexão ao desvincular')
        } finally {
          setLoadingSocialAction(false)
        }
      }
    )
  }

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
      setOrdersPage(1)
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Erro ao carregar pedidos' })
    } finally {
      setLoadingOrders(false)
    }
  }

  const handleChangePaymentMethod = async (
    orderId: string,
    method: 'pix' | 'boleto' | 'credit_card'
  ) => {
    try {
      setUpdatingPaymentLoading(prev => ({ ...prev, [orderId]: true }))

      if (method === 'credit_card') {
        navigate(`/carrinho/payment/card?orderId=${orderId}`)
        return
      }

      const result = await paymentService.changePaymentMethod(orderId, method)
      setOrderPaymentPreview(prev => ({ ...prev, [orderId]: result }))
      await loadOrders()
      toast.success('Forma de pagamento atualizada para este pedido.')
    } catch (error: any) {
      console.error('Erro ao alterar método de pagamento:', error)
      setMessage({ type: 'error', text: error.message || 'Erro ao alterar método de pagamento' })
    } finally {
      setUpdatingPaymentLoading(prev => ({ ...prev, [orderId]: false }))
    }
  }

  const handleCopyOrderPix = (orderId: string, payload: string) => {
    navigator.clipboard.writeText(payload)
    setCopiedPixOrderId(orderId)
    setTimeout(() => setCopiedPixOrderId(null), 2000)
  }

  const loadFavorites = async () => {
    setLoadingFavorites(true)
    setFavoriteProducts(favorites)
    setLoadingFavorites(false)
  }

  useEffect(() => {
    setFavoriteProducts(favorites)
  }, [favorites])

  const loadReviews = async () => {
    if (!user?.name) return
    try {
      setLoadingReviews(true)
      const allReviews = await reviewsService.getAll(false)
      setMyReviews(allReviews.filter(r => r.name === user.name))
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Erro ao carregar avaliações' })
    } finally {
      setLoadingReviews(false)
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

  const maskCPF = (cpf: string) => {
    if (!cpf) return 'Não cadastrado'
    const clean = cpf.replace(/\D/g, '')
    if (clean.length < 11) return cpf
    return `${clean.substring(0, 3)}.***.***-${clean.substring(9, 11)}`
  }

  const maskPhone = (phone: string) => {
    if (!phone) return 'Não cadastrado'
    const clean = phone.replace(/\D/g, '')
    const number = clean.startsWith('55') ? clean.substring(2) : clean
    if (number.length === 11) {
      return `(${number.substring(0, 2)}) ${number.substring(2, 7)}-${number.substring(7)}`
    } else if (number.length === 10) {
      return `(${number.substring(0, 2)}) ${number.substring(2, 6)}-${number.substring(6)}`
    }
    return phone
  }

  const handleSaveInfoModal = async () => {
    try {
      setLoading(true)
      setMessage(null)

      const cleanPhone = editPhone.replace(/\D/g, '')
      const finalPhone = cleanPhone ? (cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`) : ''

      const result = await authService.updateProfile({
        name: editName.trim(),
        phone: finalPhone,
      })

      if (result.success && result.user) {
        updateUser(result.user)
        setMessage({ type: 'success', text: 'Informações atualizadas com sucesso!' })
        setIsEditModalOpen(false)
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Erro ao atualizar informações' })
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

      const redirectUrl = searchParams.get('redirect')
      if (redirectUrl) {
        setTimeout(() => {
          navigate(redirectUrl)
        }, 1500)
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Erro ao salvar endereço' })
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteAddress = (id: string) => {
    confirm.show('Tem certeza que deseja remover este endereço?', async () => {
      try {
        setLoading(true)
        await addressService.deleteSavedAddress(id)
        await loadAddresses()
      } catch (error: any) {
        setMessage({ type: 'error', text: error.message || 'Erro ao remover endereço' })
      } finally {
        setLoading(false)
      }
    })
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
    } catch (e) {
      return addressStr
    }
  }

  const getOrderImage = (order: Order) => {
    if (order.items && order.items.length > 0) {
      const itemWithImage = order.items.find(item => item.image_url);
      if (itemWithImage && itemWithImage.image_url) {
        return productsService.getImageUrl(itemWithImage.image_url);
      }
    }
    return null;
  }

  const handleSendEmail = () => {
    if (!user) return
    const email = 'kapsultda@gmail.com'
    const latestOrder = orders && orders.length > 0 ? orders[0] : null

    let subject = `Suporte Sanare - Cliente: ${user.name}`
    if (latestOrder) {
      subject = `Ajuda com o Pedido #${latestOrder.id.substring(0, 8)} - Sanare`
    }

    let body = `Olá Suporte Sanare,\n\nPreciso de ajuda com o meu pedido.\n\n`
    body += `Dados do Cliente:\n`
    body += `- Nome: ${user.name}\n`
    body += `- E-mail: ${user.email}\n`
    if (user.phone) {
      body += `- Telefone: ${maskPhone(user.phone)}\n`
    }
    body += `\n`

    if (latestOrder) {
      body += `Dados do Último Pedido:\n`
      body += `- Código do Pedido: ${latestOrder.id}\n`
      body += `- Data: ${formatDate(latestOrder.created_at)}\n`
      body += `- Valor Total: ${formatCurrency(latestOrder.total)}\n`
      body += `- Status: ${getOrderStatusLabel(latestOrder.status)}\n\n`
    }

    body += `[Descreva sua dúvida ou problema aqui]`

    const mailtoUrl = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`

    try {
      navigator.clipboard.writeText(email)
      toast.success('E-mail copiado para a área de transferência! Abrindo seu aplicativo...')
    } catch (err) {
      console.error('Erro ao copiar e-mail:', err)
    }

    window.location.href = mailtoUrl
  }

  const renderTimeline = (status: string) => {
    const normalized = (status || '').toUpperCase()

    const isCancelled = ['CANCELLED', 'REJECTED', 'OVERDUE', 'REFUNDED', 'REFUND_REQUESTED', 'REFUND_IN_PROGRESS', 'CHARGEBACK_REQUESTED', 'CHARGEBACK_DISPUTE', 'AWAITING_CHARGEBACK_REVERSAL'].includes(normalized);

    if (isCancelled) {
      return null
    }

    const steps = [
      { key: 'PENDING', label: 'Confirmado' },
      { key: 'CONFIRMED', label: 'Pago' },
      { key: 'PROCESSING', label: 'Preparação' },
      { key: 'SHIPPED', label: 'Enviado' },
      { key: 'DELIVERED', label: 'Entregue' }
    ];

    const mapIndex: Record<string, number> = {
      'PENDING': 0, 'AWAITING_RISK_ANALYSIS': 0, 'DUNNING_REQUESTED': 0, 'DUNNING_RECEIVED': 0,
      'PAID': 1, 'CONFIRMED': 1, 'RECEIVED': 1, 'RECEIVED_IN_CASH': 1,
      'PROCESSING': 2, 'DISTRIBUTOR_INFORMED': 2, 'SHIPPED': 3, 'DELIVERED': 4
    };

    const currentIndex = mapIndex[normalized] !== undefined ? mapIndex[normalized] : 0;

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
                <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-colors duration-300 ${isCompleted ? 'bg-primary-500 text-white shadow-md' : 'bg-gray-200 dark:bg-gray-700 text-gray-400'
                  }`}>
                  {isCompleted ? <Check className="w-3 h-3 sm:w-4 sm:h-4" /> : <div className="w-2 h-2 rounded-full bg-white dark:bg-gray-800"></div>}
                </div>
                <p className={`absolute top-8 sm:top-10 left-1/2 -translate-x-1/2 text-[10px] sm:text-xs text-center w-20 sm:w-28 ${isActive ? 'text-primary-600 dark:text-primary-400 font-bold' : isCompleted ? 'text-gray-700 dark:text-gray-300 font-medium' : 'text-gray-400 dark:text-gray-500'
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
    { id: 'info', label: 'Meu Perfil', icon: User, desc: 'Suas informações cadastrais e dados de contato' },
    { id: 'addresses', label: 'Endereços', icon: MapPin, desc: 'Gerencie seus endereços salvos de entrega' },
    { id: 'orders', label: 'Meus Pedidos', icon: Package, desc: 'Acompanhe suas compras e histórico de pedidos' },
    { id: 'favorites', label: 'Favoritos', icon: Heart, desc: 'Produtos salvos na sua lista de desejos' },
    { id: 'reviews', label: 'Avaliações', icon: Star, desc: 'Seu histórico de comentários e notas enviadas' },
    { id: 'notifications', label: 'Notificações', icon: Bell, desc: 'Avisos sobre seus pedidos e ofertas exclusivas' },
    { id: 'help', label: 'Ajuda', icon: HelpCircle, desc: 'Perguntas frequentes e central de suporte' },
    { id: 'connected-accounts', label: 'Contas conectadas', icon: ShieldCheck, desc: 'Gerencie logins vinculados à sua conta' },
  ]

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <p className="text-gray-500 dark:text-gray-400 flex items-center gap-2">
          <Loader2 className="animate-spin w-5 h-5 text-primary-500" /> Carregando...
        </p>
      </div>
    )
  }

  // Estatísticas de pedidos reais
  const stats = (() => {
    const delivered = orders.filter(o => ['DELIVERED', 'PAID', 'CONFIRMED', 'RECEIVED', 'RECEIVED_IN_CASH'].includes((o.status || '').toUpperCase())).length;
    const pending = orders.filter(o => ['PENDING', 'PROCESSING', 'SHIPPED', 'AWAITING_RISK_ANALYSIS'].includes((o.status || '').toUpperCase())).length;
    const cancelled = orders.filter(o => ['CANCELLED', 'OVERDUE', 'REFUNDED'].includes((o.status || '').toUpperCase())).length;
    const total = orders.length;
    return {
      delivered, pending, cancelled, total,
      deliveredPct: Math.round((delivered / total) * 100) || 0,
      pendingPct: Math.round((pending / total) * 100) || 0,
      cancelledPct: Math.round((cancelled / total) * 100) || 0,
    }
  })();

  const getFormattedJoinDate = () => {
    const userCreatedAt = (user as any).created_at;
    if (!userCreatedAt) return 'Janeiro de 2026';
    try {
      const date = new Date(userCreatedAt);
      const month = date.toLocaleDateString('pt-BR', { month: 'long' });
      const capitalizedMonth = month.charAt(0).toUpperCase() + month.slice(1);
      return `${capitalizedMonth} de ${date.getFullYear()}`;
    } catch (e) {
      return 'Janeiro de 2026';
    }
  }

  // ─── Input field base class ───────────────────────────────────────────────
  const inputClass = "w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none text-sm transition-all"

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-6 sm:py-10 px-4 sm:px-6 lg:px-8 transition-colors duration-300">
      <div className="max-w-6xl mx-auto">

        {/* ── Cabeçalho / Profile Banner ─────────────────────────── */}
        <div className="mb-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 sm:p-6 shadow-sm dark:shadow-xl overflow-hidden relative">
          {/* Faixa topo */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary-500 to-primary-400" />

          <div className="flex flex-col lg:flex-row items-center lg:items-center justify-between gap-5">
            {/* Avatar + dados */}
            <div className="flex flex-col sm:flex-row items-center sm:items-center gap-5 text-center sm:text-left w-full lg:w-auto">
              <div className="relative flex-shrink-0">
                {imageFile ? (
                  <img src={URL.createObjectURL(imageFile)} alt="Preview" className="w-[72px] h-[72px] rounded-full object-cover border-2 border-primary-400 shadow-lg" />
                ) : profileImage ? (
                  <img src={profileImage} alt={user?.name} className="w-[72px] h-[72px] rounded-full object-cover border-2 border-primary-400 shadow-lg" />
                ) : (
                  <div className="w-[72px] h-[72px] rounded-full flex items-center justify-center text-white text-2xl font-extrabold bg-primary-500 border-2 border-primary-400 shadow-lg">
                    {user ? getInitials(user.name) : '?'}
                  </div>
                )}
                <label className="absolute bottom-0 right-0 w-6 h-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full flex items-center justify-center cursor-pointer hover:bg-primary-500 hover:border-primary-500 hover:text-white transition-colors shadow-md group">
                  <Camera className="w-3.5 h-3.5 text-gray-500 group-hover:text-white transition-colors" />
                  <input type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
                </label>
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white leading-tight">{user?.name}</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{user?.email}</p>
                <p className="flex items-center gap-1.5 justify-center sm:justify-start text-xs text-gray-400 dark:text-gray-500 mt-1.5 font-semibold">
                  <Calendar className="w-3.5 h-3.5 flex-shrink-0 text-primary-500" />
                  Cliente desde {getFormattedJoinDate()}
                </p>
                {imageFile && (
                  <div className="flex gap-2 mt-2 justify-center sm:justify-start">
                    <button onClick={handleSaveImage} disabled={loading} className="flex items-center gap-1 px-3 py-1 bg-primary-500 hover:bg-primary-600 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer disabled:opacity-50">
                      <Check className="w-3.5 h-3.5" /> Salvar
                    </button>
                    <button onClick={() => setImageFile(null)} disabled={loading} className="flex items-center gap-1 px-3 py-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg text-xs font-bold transition-colors cursor-pointer disabled:opacity-50">
                      <X className="w-3.5 h-3.5" /> Descartar
                    </button>
                  </div>
                )}
                {user?.profile_image && !imageFile && (
                  <button onClick={handleRemoveImage} disabled={loading} className="text-xs text-red-500 hover:text-red-600 transition-colors mt-1.5 underline cursor-pointer block mx-auto sm:mx-0">
                    Remover foto
                  </button>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="flex items-center justify-center sm:justify-start gap-3 w-full lg:w-auto flex-wrap sm:flex-nowrap">
              <div onClick={() => setActiveSection('orders')} className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-5 py-3 text-center flex-1 sm:flex-initial min-w-[80px] hover:border-primary-400 dark:hover:border-primary-600 cursor-pointer transition-all hover:scale-105">
                <ShoppingBag className="w-4 h-4 text-primary-500 mx-auto mb-1" />
                <span className="block text-lg font-bold text-gray-900 dark:text-white leading-none">{stats.total}</span>
                <span className="block text-[10px] text-gray-500 dark:text-gray-400 font-semibold mt-1 uppercase">Pedidos</span>
              </div>
              <div onClick={() => setActiveSection('favorites')} className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-5 py-3 text-center flex-1 sm:flex-initial min-w-[80px] hover:border-rose-400 dark:hover:border-rose-600 cursor-pointer transition-all hover:scale-105">
                <Heart className="w-4 h-4 text-rose-500 mx-auto mb-1" />
                <span className="block text-lg font-bold text-gray-900 dark:text-white leading-none">{favorites.length}</span>
                <span className="block text-[10px] text-gray-500 dark:text-gray-400 font-semibold mt-1 uppercase">Favoritos</span>
              </div>
              <div onClick={() => setActiveSection('reviews')} className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-5 py-3 text-center flex-1 sm:flex-initial min-w-[80px] hover:border-amber-400 dark:hover:border-amber-600 cursor-pointer transition-all hover:scale-105">
                <Star className="w-4 h-4 text-amber-500 mx-auto mb-1" />
                <span className="block text-lg font-bold text-gray-900 dark:text-white leading-none">{myReviews.length}</span>
                <span className="block text-[10px] text-gray-500 dark:text-gray-400 font-semibold mt-1 uppercase">Avaliações</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6 relative lg:items-start">

          {/* ── Sidebar Desktop ─────────────────────────────────────── */}
          <div className="w-full lg:w-60 xl:w-64 flex-shrink-0 hidden lg:block">
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden lg:sticky lg:top-24 shadow-sm dark:shadow-xl">
              <nav className="p-3 pt-4 space-y-0.5">
                {menuItems.map(item => (
                  <button
                    key={item.id}
                    onClick={() => setActiveSection(item.id as ProfileSection)}
                    className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl transition-all duration-200 ${activeSection === item.id
                      ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 border border-primary-200 dark:border-primary-800 font-bold'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 border border-transparent'
                      }`}
                  >
                    <item.icon className={`w-4 h-4 flex-shrink-0 ${activeSection === item.id ? 'text-primary-500' : 'text-gray-400 dark:text-gray-500'}`} />
                    <span className="font-medium text-sm">{item.label}</span>
                  </button>
                ))}
                <div className="pt-2 mt-2 border-t border-gray-100 dark:border-gray-800">
                  <button
                    onClick={logout}
                    className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl transition-all duration-200 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 border border-transparent font-medium"
                  >
                    <LogOut className="w-4 h-4 flex-shrink-0 text-red-400" />
                    <span className="text-sm">Sair da Conta</span>
                  </button>
                </div>
              </nav>
            </div>
          </div>

          {/* ── Main Content ─────────────────────────────────────────── */}
          <div className="flex-1 min-w-0">
            <div>

              {/* Botão voltar - Mobile */}
              {activeSection !== null && (
                <div className="lg:hidden mb-4">
                  <button
                    onClick={() => setActiveSection(null)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-300 rounded-xl hover:text-gray-900 dark:hover:text-white transition-all font-bold text-xs cursor-pointer shadow-sm"
                  >
                    <ArrowLeft className="w-4 h-4 text-primary-500" />
                    <span>Voltar para as Opções</span>
                  </button>
                </div>
              )}

              {/* Menu Mobile - cards */}
              {activeSection === null && (
                <div className="lg:hidden space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-300">
                  {menuItems.map(item => (
                    <button
                      key={item.id}
                      onClick={() => setActiveSection(item.id as ProfileSection)}
                      className="w-full flex items-center justify-between p-4 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 hover:border-primary-300 dark:hover:border-primary-700 transition-all text-left shadow-sm group cursor-pointer"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-primary-50 dark:bg-primary-900/20 text-primary-500 rounded-xl group-hover:scale-110 transition-transform duration-200">
                          <item.icon className="w-5 h-5 text-primary-500" />
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-900 dark:text-white text-sm leading-tight">{item.label}</h3>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-snug">{item.desc}</p>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-200 group-hover:translate-x-1 transition-all" />
                    </button>
                  ))}
                  <button
                    onClick={logout}
                    className="w-full flex items-center justify-between p-4 bg-red-50 dark:bg-red-900/10 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-2xl border border-red-200 dark:border-red-900/30 transition-all text-left group cursor-pointer"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-red-100 dark:bg-red-900/20 text-red-500 rounded-xl group-hover:scale-110 transition-transform duration-200">
                        <LogOut className="w-5 h-5 text-red-500" />
                      </div>
                      <div>
                        <h3 className="font-bold text-red-500 text-sm leading-tight">Sair da Conta</h3>
                        <p className="text-xs text-red-400/70 mt-1 leading-snug">Encerrar sua sessão atual com segurança</p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-red-400/60 group-hover:text-red-500 group-hover:translate-x-1 transition-all" />
                  </button>
                </div>
              )}

              {/* Global Messages */}
              {message && (
                <div className={`mb-4 p-4 rounded-xl flex items-start justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-300 ${message.type === 'success'
                  ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800/50'
                  : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800/50'
                  }`}>
                  <div className="flex items-center gap-2 mt-0.5">
                    {message.type === 'success' ? <Check className="w-5 h-5 text-green-500 flex-shrink-0" /> : <X className="w-5 h-5 text-red-500 flex-shrink-0" />}
                    <span className="text-sm font-medium">{message.text}</span>
                  </div>
                  <button onClick={() => setMessage(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex-shrink-0"><X className="w-4 h-4" /></button>
                </div>
              )}

              {/* ─────────────────────────────────────────────────────── */}
              {/* MEU PERFIL                                              */}
              {/* ─────────────────────────────────────────────────────── */}
              {activeSection === 'info' && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-4">
                  <div className="w-full max-w-4xl mx-auto">
                    {/* Dados Pessoais */}
                    <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm dark:shadow-xl">
                      <div className="flex items-center justify-between mb-5">
                        <div>
                          <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <User className="w-4 h-4 text-primary-500" />
                            Dados Pessoais
                          </h3>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Gerencie suas informações cadastrais.</p>
                        </div>
                        <button
                          onClick={() => { setEditName(user.name || ''); setEditPhone(phone || ''); setIsEditModalOpen(true) }}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-50 dark:bg-primary-900/20 hover:bg-primary-100 dark:hover:bg-primary-900/30 text-primary-600 dark:text-primary-400 rounded-xl transition-colors font-semibold border border-primary-200 dark:border-primary-800 text-xs cursor-pointer"
                        >
                          <Edit className="w-3.5 h-3.5" /> Editar
                        </button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="p-4 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl">
                          <span className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
                            <User className="w-3 h-3 text-primary-400" /> Nome completo
                          </span>
                          <span className="block text-sm font-semibold text-gray-900 dark:text-white truncate">{user.name || 'Não informado'}</span>
                        </div>
                        <div className="p-4 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl">
                          <span className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
                            <Mail className="w-3 h-3 text-primary-400" /> E-mail
                          </span>
                          <span className="block text-sm font-semibold text-gray-900 dark:text-white break-all truncate">{user.email}</span>
                        </div>
                        <div className="p-4 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl">
                          <span className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
                            <FileText className="w-3 h-3 text-primary-400" /> CPF
                          </span>
                          {user.cpf ? (
                            <span className="block text-sm font-semibold text-gray-900 dark:text-white">{maskCPF(user.cpf)}</span>
                          ) : (
                            <span className="block text-xs font-medium text-gray-400 dark:text-gray-500 italic">Não cadastrado</span>
                          )}
                        </div>
                        <div className="p-4 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl">
                          <span className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
                            <Phone className="w-3 h-3 text-primary-400" /> WhatsApp
                          </span>
                          {phone ? (
                            <span className="block text-sm font-semibold text-gray-900 dark:text-white">{maskPhone(phone)}</span>
                          ) : (
                            <span className="block text-xs font-medium text-gray-400 dark:text-gray-500 italic">Não cadastrado</span>
                          )}
                        </div>
                      </div>
                    </div>


                  </div>
                </div>
              )}

              {/* ─────────────────────────────────────────────────────── */}
              {/* ENDEREÇOS                                               */}
              {/* ─────────────────────────────────────────────────────── */}
              {activeSection === 'addresses' && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-6 bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm dark:shadow-xl">
                  {searchParams.get('redirect') && (
                    <button
                      onClick={() => navigate(searchParams.get('redirect')!)}
                      className="flex items-center gap-1.5 text-xs text-primary-600 dark:text-primary-400 hover:underline font-bold cursor-pointer"
                    >
                      <ArrowLeft size={14} />
                      Voltar para o Carrinho
                    </button>
                  )}

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <MapPin className="text-primary-500" />
                        Endereços Salvos
                      </h2>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Gerencie seus locais de entrega padrão e alternativos.</p>
                    </div>
                    {!editingAddress && !addressForm.cep && (
                      <button
                        onClick={() => setAddressForm({ ...addressForm, nickname: 'Casa' })}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 border border-primary-200 dark:border-primary-800 rounded-xl hover:bg-primary-100 dark:hover:bg-primary-900/30 transition-all font-semibold text-sm cursor-pointer"
                      >
                        <Plus className="w-4 h-4" /> Adicionar Novo
                      </button>
                    )}
                  </div>

                  {(editingAddress || addressForm.nickname || addressForm.cep) && (
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 relative animate-in zoom-in-95 duration-200">
                      <button
                        onClick={() => { setEditingAddress(null); setAddressForm({ nickname: '', cep: '', address: '', number: '', complement: '', bairro: '', city: '', state: '', isDefault: false }) }}
                        className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-white bg-gray-100 dark:bg-gray-700 rounded-full"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      <h3 className="text-base font-bold text-gray-900 dark:text-white mb-4">{editingAddress ? 'Editar Endereço' : 'Cadastrar Novo Endereço'}</h3>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                          <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">Identificação (Ex: Casa, Trabalho) *</label>
                          <input type="text" value={addressForm.nickname} onChange={(e) => setAddressForm({ ...addressForm, nickname: e.target.value })} className={inputClass} />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">CEP *</label>
                          <div className="relative">
                            <input type="text" value={addressForm.cep} onChange={handleCEPChange} maxLength={9} className={inputClass} />
                            {searchingCep && <Loader2 className="absolute right-3 top-3 w-4 h-4 animate-spin text-primary-500" />}
                          </div>
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">Endereço *</label>
                          <input type="text" value={addressForm.address} onChange={(e) => setAddressForm({ ...addressForm, address: e.target.value })} className={inputClass} />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">Número *</label>
                          <input type="text" value={addressForm.number} onChange={(e) => setAddressForm({ ...addressForm, number: e.target.value })} className={inputClass} />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">Complemento</label>
                          <input type="text" value={addressForm.complement} onChange={(e) => setAddressForm({ ...addressForm, complement: e.target.value })} className={inputClass} />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">Bairro</label>
                          <input type="text" value={addressForm.bairro} onChange={(e) => setAddressForm({ ...addressForm, bairro: e.target.value })} className={inputClass} />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">Cidade *</label>
                          <input type="text" value={addressForm.city} onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })} className={inputClass} />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">Estado (UF) *</label>
                          <input type="text" value={addressForm.state} onChange={(e) => setAddressForm({ ...addressForm, state: e.target.value.toUpperCase().substring(0, 2) })} maxLength={2} className={inputClass} />
                        </div>
                        <div className="md:col-span-2 mt-1">
                          <label className="flex items-center gap-3 cursor-pointer p-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-primary-400 dark:hover:border-primary-600 transition-colors">
                            <input type="checkbox" checked={addressForm.isDefault} onChange={(e) => setAddressForm({ ...addressForm, isDefault: e.target.checked })} className="w-4 h-4 text-primary-500 border-gray-300 dark:border-gray-600 rounded focus:ring-0 focus:ring-offset-0" />
                            <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">Definir como endereço padrão para entregas</span>
                          </label>
                        </div>
                      </div>

                      <div className="mt-5 flex justify-end gap-3">
                        <button onClick={handleSaveAddress} disabled={loading} className="px-5 py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-bold transition-all text-xs flex items-center gap-1.5 shadow-md disabled:opacity-50 cursor-pointer">
                          <Save className="w-4 h-4" /> Salvar Endereço
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {addresses.length === 0 && !addressForm.nickname ? (
                      <div className="col-span-full py-12 text-center bg-gray-50 dark:bg-gray-800 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
                        <MapPin className="w-10 h-10 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                        <p className="font-bold text-sm text-gray-500 dark:text-gray-400">Nenhum endereço cadastrado</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 max-w-xs mx-auto">Adicione seus endereços para facilitar no fechamento de suas compras.</p>
                      </div>
                    ) : (
                      addresses.map((address) => (
                        <div key={address.id} className={`p-5 rounded-xl border-2 transition-all ${address.is_default
                          ? 'border-primary-400 dark:border-primary-600 bg-primary-50 dark:bg-primary-900/10 shadow-sm'
                          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
                          }`}>
                          <div className="flex justify-between items-start mb-3">
                            <h3 className="font-bold text-gray-900 dark:text-white text-sm flex items-center gap-1.5">
                              {address.nickname}
                              {address.is_default && <span className="px-2 py-0.5 bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 text-[9px] rounded-full font-bold flex items-center gap-0.5"><Star className="w-2.5 h-2.5 fill-primary-500" /> Padrão</span>}
                            </h3>
                            <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
                              {!address.is_default && (
                                <button onClick={() => handleSetDefaultAddress(address.id)} className="p-1.5 text-gray-400 hover:text-primary-500 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors" title="Tornar Padrão"><Star className="w-3.5 h-3.5" /></button>
                              )}
                              <button onClick={() => handleEditAddress(address)} className="p-1.5 text-gray-400 hover:text-blue-500 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors" title="Editar"><Edit className="w-3.5 h-3.5" /></button>
                              <button onClick={() => handleDeleteAddress(address.id)} className="p-1.5 text-gray-400 hover:text-red-500 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors" title="Excluir"><Trash2 className="w-3.5 h-3.5" /></button>
                            </div>
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                            <p className="font-semibold text-gray-700 dark:text-gray-300">{address.address}, {address.number} {address.complement && `- ${address.complement}`}</p>
                            <p>{address.bairro && `${address.bairro}, `}{address.city} - {address.state}</p>
                            <p className="text-[10px] mt-2 pt-2 border-t border-gray-100 dark:border-gray-700 text-gray-400 dark:text-gray-500">CEP: {address.cep}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* ─────────────────────────────────────────────────────── */}
              {/* PEDIDOS                                                 */}
              {/* ─────────────────────────────────────────────────────── */}
              {activeSection === 'orders' && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-6 bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm dark:shadow-xl">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      <Package className="text-primary-500" />
                      Meus Pedidos
                    </h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Consulte o status das suas compras e acesse notas fiscais.</p>
                  </div>

                  {loadingOrders ? (
                    <div className="py-20 flex flex-col items-center justify-center text-primary-500">
                      <Loader2 className="w-8 h-8 animate-spin mb-3" />
                      <p className="text-sm text-gray-500 dark:text-gray-400">Buscando seus pedidos...</p>
                    </div>
                  ) : orders.length === 0 ? (
                    <div className="py-16 text-center bg-gray-50 dark:bg-gray-800 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
                      <ShoppingBag className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                      <p className="text-base font-bold text-gray-700 dark:text-white">Você ainda não fez nenhum pedido</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 max-w-xs mx-auto mb-5">Navegue pelas nossas opções de saúde e faça seu primeiro pedido!</p>
                      <a href="/produtos" className="inline-block px-5 py-2 bg-primary-500 hover:bg-primary-600 text-white font-bold rounded-xl transition-all text-xs">Ver Produtos</a>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {orders.slice((ordersPage - 1) * ordersPerPage, ordersPage * ordersPerPage).map((order) => (
                        <div key={order.id} className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-sm hover:border-primary-300 dark:hover:border-primary-700 transition-colors">
                          <div
                            className="p-4 sm:p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center cursor-pointer bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                            onClick={() => {
                              const newExpanded = expandedOrder === order.id ? null : order.id;
                              setExpandedOrder(newExpanded);

                              if (newExpanded && !invoices[newExpanded] && !loadingInvoices[newExpanded]) {
                                setLoadingInvoices(prev => ({ ...prev, [newExpanded]: true }));
                                orderService.getOrderInvoice(newExpanded).then(invoice => {
                                  if (invoice) {
                                    setInvoices(prev => ({ ...prev, [newExpanded]: invoice }));
                                  }
                                }).finally(() => {
                                  setLoadingInvoices(prev => ({ ...prev, [newExpanded]: false }));
                                });
                              }
                            }}
                          >
                            <div className="flex items-center gap-4 mb-4 sm:mb-0">
                              {getOrderImage(order) ? (
                                <img src={getOrderImage(order)!} alt="Pedido" className="w-12 h-12 rounded-xl object-cover border border-gray-200 dark:border-gray-700 shadow-sm" />
                              ) : (
                                <div className="p-3 rounded-xl bg-primary-50 dark:bg-primary-900/20 text-primary-500">
                                  <Package className="w-5 h-5" />
                                </div>
                              )}
                              <div>
                                <p className="font-bold text-gray-900 dark:text-white text-base tracking-tight">Pedido #{order.id.substring(0, 8).toUpperCase()}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5 mt-0.5">
                                  <Calendar className="w-3.5 h-3.5 text-primary-500" />
                                  {formatDate(order.created_at)}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center justify-between w-full sm:w-auto sm:justify-end gap-5">
                              <div className="text-left sm:text-right">
                                <p className="text-[9px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider mb-0.5">Total</p>
                                <p className="font-bold text-gray-900 dark:text-white text-base">{formatCurrency(order.total)}</p>
                              </div>
                              <div className={`px-2.5 py-1 rounded-full text-xs font-bold ${getOrderStatusBadgeClass(order.status)}`}>
                                {getOrderStatusLabel(order.status)}
                              </div>
                              <div className={`p-1.5 rounded-full bg-gray-100 dark:bg-gray-700 shadow-sm border border-gray-200 dark:border-gray-600 transition-transform ${expandedOrder === order.id ? 'rotate-90 bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-800 text-primary-500' : 'text-gray-400'}`}>
                                <ChevronRight className="w-4 h-4" />
                              </div>
                            </div>
                          </div>

                          {expandedOrder === order.id && (
                            <div className="p-5 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 animate-in slide-in-from-top-2">
                              {renderTimeline(order.status)}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-4">
                                <div className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
                                  <h4 className="font-bold text-gray-900 dark:text-white text-sm mb-3 flex items-center gap-1.5">
                                    <MapPin className="w-4 h-4 text-primary-500" />
                                    Endereço de Entrega
                                  </h4>
                                  <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed whitespace-pre-line">
                                    {renderShippingAddress(order.shipping_address)}
                                  </p>
                                </div>
                                <div className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
                                  <h4 className="font-bold text-gray-900 dark:text-white text-sm mb-3 flex items-center gap-1.5">
                                    <CreditCard className="w-4 h-4 text-primary-500" />
                                    Detalhes do Pagamento
                                  </h4>
                                  <div className="space-y-2 text-xs">
                                    <div className="flex justify-between items-center">
                                      <span className="text-gray-500 dark:text-gray-400">Método:</span>
                                      <span className="font-semibold text-gray-700 dark:text-gray-300">
                                        {order.payment_method === 'credit_card' ? 'Cartão de Crédito' : order.payment_method === 'pix' ? 'PIX' : order.payment_method === 'boleto' ? 'Boleto' : 'Não informado'}
                                      </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                      <span className="text-gray-500 dark:text-gray-400">Status Financeiro:</span>
                                      <span className="font-semibold text-gray-700 dark:text-gray-300">{getOrderStatusLabel(order.status)}</span>
                                    </div>

                                    {(order.status || '').toUpperCase() === 'PENDING' && (
                                      <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                                        <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-bold mb-2 tracking-wider">
                                          Alterar forma de pagamento
                                        </p>
                                        <div className="flex flex-col gap-2">
                                          <button
                                            type="button"
                                            onClick={() => void handleChangePaymentMethod(order.id, 'pix')}
                                            disabled={!!updatingPaymentLoading[order.id]}
                                            className={`flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${order.payment_method === 'pix'
                                                ? 'bg-primary-50 border-primary-200 text-primary-600 dark:bg-primary-900/20 dark:border-primary-800 dark:text-primary-400'
                                                : 'bg-white border-gray-200 hover:bg-gray-50 text-gray-700 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700'
                                              }`}
                                          >
                                            {updatingPaymentLoading[order.id] ? (
                                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                            ) : (
                                              <QrCode className="w-3.5 h-3.5" />
                                            )}
                                            PIX
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => void handleChangePaymentMethod(order.id, 'credit_card')}
                                            disabled={!!updatingPaymentLoading[order.id]}
                                            className={`flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${order.payment_method === 'credit_card'
                                                ? 'bg-primary-50 border-primary-200 text-primary-600 dark:bg-primary-900/20 dark:border-primary-800 dark:text-primary-400'
                                                : 'bg-white border-gray-200 hover:bg-gray-50 text-gray-700 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700'
                                              }`}
                                          >
                                            <CreditCard className="w-3.5 h-3.5" />
                                            Cartão de Crédito
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => void handleChangePaymentMethod(order.id, 'boleto')}
                                            disabled={!!updatingPaymentLoading[order.id]}
                                            className={`flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${order.payment_method === 'boleto'
                                                ? 'bg-primary-50 border-primary-200 text-primary-600 dark:bg-primary-900/20 dark:border-primary-800 dark:text-primary-400'
                                                : 'bg-white border-gray-200 hover:bg-gray-50 text-gray-700 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700'
                                              }`}
                                          >
                                            {updatingPaymentLoading[order.id] ? (
                                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                            ) : (
                                              <Barcode className="w-3.5 h-3.5" />
                                            )}
                                            Boleto Bancário
                                          </button>
                                        </div>

                                        {orderPaymentPreview[order.id]?.paymentMethod === 'pix' && (
                                          <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700">
                                            <p className="text-xs font-bold text-gray-900 dark:text-white mb-3 text-center">Pague via PIX</p>
                                            <div className="bg-white p-2 rounded-lg flex justify-center mb-3">
                                              <img
                                                src={`data:image/png;base64,${(orderPaymentPreview[order.id] as any).pixQrCode}`}
                                                alt="QR Code PIX"
                                                className="w-36 h-36"
                                              />
                                            </div>
                                            <input
                                              type="text"
                                              readOnly
                                              value={(orderPaymentPreview[order.id] as any).pixPayload}
                                              className="w-full text-[10px] p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-500 mb-2"
                                            />
                                            <button
                                              type="button"
                                              onClick={() => handleCopyOrderPix(order.id, (orderPaymentPreview[order.id] as any).pixPayload)}
                                              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg text-xs font-bold"
                                            >
                                              <Copy className="w-3.5 h-3.5" />
                                              {copiedPixOrderId === order.id ? 'Copiado!' : 'Copiar código PIX'}
                                            </button>
                                          </div>
                                        )}

                                        {orderPaymentPreview[order.id]?.paymentMethod === 'boleto' && (
                                          <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 text-center">
                                            <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">Boleto gerado para este pedido.</p>
                                            <a
                                              href={(orderPaymentPreview[order.id] as any).bankSlipUrl}
                                              target="_blank"
                                              rel="noreferrer"
                                              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg text-xs font-bold"
                                            >
                                              <Download className="w-3.5 h-3.5" />
                                              Baixar Boleto
                                            </a>
                                          </div>
                                        )}
                                      </div>
                                    )}

                                    {order.boleto_url && (
                                      <div className="flex justify-between items-center pt-2 border-t border-gray-100 dark:border-gray-700">
                                        <span className="text-gray-500 dark:text-gray-400">Boleto Bancário:</span>
                                        <a href={order.boleto_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 px-2.5 py-1 bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 border border-primary-200 dark:border-primary-800 hover:bg-primary-100 dark:hover:bg-primary-900/30 rounded-lg font-bold transition-colors">
                                          <Download className="w-3.5 h-3.5" /> Baixar
                                        </a>
                                      </div>
                                    )}
                                    {order.payment_url && (
                                      <div className="flex justify-between items-center pt-2 border-t border-gray-100 dark:border-gray-700">
                                        <span className="text-gray-500 dark:text-gray-400">
                                          {order.payment_method === 'credit_card' ? 'Cartão de Crédito:' : order.payment_method === 'pix' ? 'PIX:' : 'Pagamento Online:'}
                                        </span>
                                        <a href={order.payment_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 px-2.5 py-1 bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 border border-primary-200 dark:border-primary-800 hover:bg-primary-100 dark:hover:bg-primary-900/30 rounded-lg font-bold transition-colors">
                                          <CreditCard className="w-3.5 h-3.5" /> Visualizar
                                        </a>
                                      </div>
                                    )}
                                    {isInvoiceEligibleStatus(order.status) && loadingInvoices[order.id] && (
                                      <div className="flex justify-between items-center pt-2 border-t border-gray-100 dark:border-gray-700">
                                        <span className="text-gray-500 dark:text-gray-400">Nota Fiscal:</span>
                                        <span className="text-gray-400 dark:text-gray-500 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Buscando...</span>
                                      </div>
                                    )}
                                    {isInvoiceEligibleStatus(order.status) && !loadingInvoices[order.id] && invoices[order.id] && (
                                      <div className="flex justify-between items-center pt-2 border-t border-gray-100 dark:border-gray-700">
                                        <span className="text-gray-500 dark:text-gray-400">Nota Fiscal:</span>
                                        {invoices[order.id].status === 'AUTHORIZED' && invoices[order.id].pdfUrl ? (
                                          <a href={invoices[order.id].pdfUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 px-2.5 py-1 bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 border border-primary-200 dark:border-primary-800 hover:bg-primary-100 dark:hover:bg-primary-900/30 rounded-lg font-bold transition-colors">
                                            <Download className="w-3.5 h-3.5" /> Baixar PDF
                                          </a>
                                        ) : invoices[order.id].status === 'ERROR' ? (
                                          <span className="text-red-500 text-xs font-semibold">Erro ao emitir</span>
                                        ) : (
                                          <span className="text-yellow-600 dark:text-yellow-400 text-xs bg-yellow-50 dark:bg-yellow-900/20 px-2 py-0.5 rounded font-bold uppercase tracking-wider">Aguardando emissão</span>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {order.items && order.items.length > 0 && (
                                <div className="mt-5">
                                  <h4 className="font-bold text-gray-900 dark:text-white text-sm mb-3 flex items-center gap-1.5">
                                    <ShoppingBag className="w-4 h-4 text-primary-500" />
                                    Itens do Pedido ({order.items.length})
                                  </h4>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {order.items.map((item, idx) => (
                                      <div key={idx} className="flex items-center gap-3.5 p-3 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-xl">
                                        {item.image_url ? (
                                          <img src={productsService.getImageUrl(item.image_url)} alt="Produto" className="w-12 h-12 object-contain bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 flex-shrink-0 p-0.5" />
                                        ) : (
                                          <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 rounded-lg flex items-center justify-center flex-shrink-0">
                                            <Package className="w-6 h-6 text-gray-400 dark:text-gray-600" />
                                          </div>
                                        )}
                                        <div className="flex-1 min-w-0 text-xs">
                                          <p className="font-bold text-gray-900 dark:text-white truncate">{item.product_name || item.name || 'Produto'}</p>
                                          <p className="text-gray-500 dark:text-gray-400 mt-0.5">Qtd: {item.quantity}</p>
                                        </div>
                                        <div className="text-right text-xs">
                                          <p className="font-bold text-gray-900 dark:text-white">{formatCurrency(item.price || 0)}</p>
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

                      {Math.ceil(orders.length / ordersPerPage) > 1 && (
                        <div className="flex items-center justify-between border-t border-gray-100 dark:border-gray-800 pt-4 mt-6">
                          <button
                            disabled={ordersPage === 1}
                            onClick={() => {
                              setOrdersPage(prev => Math.max(prev - 1, 1));
                              window.scrollTo({ top: 300, behavior: 'smooth' });
                            }}
                            className="px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-305 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-all font-semibold text-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                          >
                            Anterior
                          </button>
                          <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                            Página {ordersPage} de {Math.ceil(orders.length / ordersPerPage)}
                          </span>
                          <button
                            disabled={ordersPage === Math.ceil(orders.length / ordersPerPage)}
                            onClick={() => {
                              setOrdersPage(prev => Math.min(prev + 1, Math.ceil(orders.length / ordersPerPage)));
                              window.scrollTo({ top: 300, behavior: 'smooth' });
                            }}
                            className="px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-350 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-all font-semibold text-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                          >
                            Próxima
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ─────────────────────────────────────────────────────── */}
              {/* FAVORITOS                                               */}
              {/* ─────────────────────────────────────────────────────── */}
              {activeSection === 'favorites' && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-6 bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm dark:shadow-xl">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      <Heart className="text-primary-500 fill-primary-100 dark:fill-primary-900/30" />
                      Meus Favoritos
                    </h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Produtos que você salvou para comprar depois.</p>
                  </div>

                  {loadingFavorites ? (
                    <div className="py-20 flex flex-col items-center justify-center text-primary-500">
                      <Loader2 className="w-8 h-8 animate-spin mb-3" />
                      <p className="text-sm text-gray-500 dark:text-gray-400">Buscando seus favoritos...</p>
                    </div>
                  ) : favoriteProducts.length === 0 ? (
                    <div className="py-16 text-center bg-gray-50 dark:bg-gray-800 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
                      <Heart className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                      <p className="text-base font-bold text-gray-700 dark:text-white">Você não tem favoritos ainda</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 max-w-xs mx-auto mb-5">Navegue pelos produtos e clique no coração para salvar seus favoritos.</p>
                      <button onClick={() => navigate('/produtos')} className="inline-block px-5 py-2 bg-primary-500 hover:bg-primary-600 text-white font-bold rounded-xl transition-all text-xs cursor-pointer">Ver Produtos</button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                      {favoriteProducts.map((product) => {
                        const originalPrice = product.promo_price ? product.price : null;
                        const currentPrice = product.promo_price || product.price;
                        return (
                          <div key={product.id} className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 flex flex-col justify-between hover:border-primary-300 dark:hover:border-primary-700 transition-all duration-300 relative group">
                            <button
                              className="absolute top-3 right-3 p-1.5 bg-rose-50 dark:bg-rose-900/20 text-rose-500 rounded-full hover:bg-rose-100 dark:hover:bg-rose-900/30 z-10 cursor-pointer"
                            >
                              <Heart className="w-3.5 h-3.5 fill-rose-500" />
                            </button>
                            <div className="text-center pt-2">
                              <div className="w-20 h-20 mx-auto mb-3 flex items-center justify-center group-hover:scale-105 transition-transform">
                                <img src={product.image || ''} alt={product.name} className="w-full h-full object-contain drop-shadow-lg" />
                              </div>
                              <h4 className="font-bold text-gray-900 dark:text-white text-sm line-clamp-2" title={product.name}>{product.name}</h4>
                            </div>
                            <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <div>
                                {originalPrice && (
                                  <span className="block text-[10px] text-gray-400 dark:text-gray-500 line-through">
                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(originalPrice)}
                                  </span>
                                )}
                                <span className="font-extrabold text-gray-900 dark:text-white text-sm">
                                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(currentPrice)}
                                </span>
                              </div>
                              <button onClick={() => navigate(`/produto/${product.id}`)} className="px-3 py-1.5 bg-primary-500 hover:bg-primary-600 text-white rounded-lg text-[10px] font-bold transition-all uppercase tracking-wider text-center cursor-pointer">
                                Ver
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ─────────────────────────────────────────────────────── */}
              {/* AVALIAÇÕES                                              */}
              {/* ─────────────────────────────────────────────────────── */}
              {activeSection === 'reviews' && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-6 bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm dark:shadow-xl">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      <Star className="text-primary-500 fill-primary-100 dark:fill-primary-900/30" />
                      Minhas Avaliações
                    </h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Seu histórico de opiniões enviadas sobre produtos.</p>
                  </div>

                  {loadingReviews ? (
                    <div className="py-20 flex flex-col items-center justify-center text-primary-500">
                      <Loader2 className="w-8 h-8 animate-spin mb-3" />
                      <p className="text-sm text-gray-500 dark:text-gray-400">Buscando suas avaliações...</p>
                    </div>
                  ) : myReviews.length === 0 ? (
                    <div className="py-16 text-center bg-gray-50 dark:bg-gray-800 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
                      <Star className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                      <p className="text-base font-bold text-gray-700 dark:text-white">Você não avaliou nenhum produto</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 max-w-xs mx-auto mb-5">Quando você avaliar um produto, a avaliação aparecerá aqui.</p>
                      <button onClick={() => navigate('/produtos')} className="inline-block px-5 py-2 bg-primary-500 hover:bg-primary-600 text-white font-bold rounded-xl transition-all text-xs cursor-pointer">Ver Produtos</button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {myReviews.map((review) => (
                        <div key={review.id} className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-primary-50 dark:bg-primary-900/20 rounded-full flex items-center justify-center text-primary-500 border border-primary-200 dark:border-primary-800">
                                <Star className="w-4 h-4 text-primary-500 fill-primary-500" />
                              </div>
                              <div>
                                <h4 className="font-bold text-gray-900 dark:text-white text-sm">{review.product || 'Produto'}</h4>
                                <div className="flex items-center gap-0.5 mt-0.5">
                                  {[...Array(5)].map((_, i) => (
                                    <Star key={i} className={`w-3 h-3 ${i < review.rating ? 'fill-amber-400 text-amber-400' : 'fill-gray-200 dark:fill-gray-700 text-gray-200 dark:text-gray-700'}`} />
                                  ))}
                                </div>
                              </div>
                            </div>
                            <span className="text-[10px] text-gray-400 dark:text-gray-500 font-semibold">{review.date || formatDate(review.created_at)}</span>
                          </div>
                          <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed mt-3 bg-white dark:bg-gray-900 p-3 rounded-lg border border-gray-100 dark:border-gray-700">
                            "{review.comment}"
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ─────────────────────────────────────────────────────── */}
              {/* NOTIFICAÇÕES                                            */}
              {/* ─────────────────────────────────────────────────────── */}
              {activeSection === 'notifications' && (
                <div id="profile-notifications-section" className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-4">
                  <div className="w-full max-w-4xl mx-auto">
                    <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm dark:shadow-xl">
                      <div className="flex items-center justify-between mb-6">
                        <div>
                          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <Bell className="text-primary-500" />
                            Preferências de Notificação
                          </h2>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Configure como e o que você deseja receber de avisos.</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Canais */}
                        <div>
                          <h3 className="text-sm font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-800 pb-2 mb-4 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary-500"></span>
                            Canais de Recebimento
                          </h3>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Como você prefere receber nossos avisos:</p>
                          <div className="space-y-3">
                            {/* WhatsApp toggle */}
                            <div className="space-y-2">
                              <div
                                onClick={() => updatePreference('whatsapp_notifications_enabled', !notifWhatsApp)}
                                className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl cursor-pointer hover:border-primary-300 dark:hover:border-primary-700 hover:bg-gray-100 dark:hover:bg-gray-750 transition-all duration-300 select-none group"
                              >
                                <div className="flex items-center gap-3.5 pr-2">
                                  <div className="p-3 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-xl group-hover:scale-105 transition-transform duration-300 flex-shrink-0">
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.513 2.262 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.42 9.864-9.864.002-2.637-1.023-5.116-2.887-6.98C16.526 1.897 14.05 .87 11.417.87c-5.438 0-9.863 4.42-9.867 9.864-.001 1.761.463 3.479 1.344 5.015L1.822 21.43l5.825-1.526zM16.648 13.62c-.27-.135-1.597-.788-1.846-.877-.25-.09-.432-.135-.613.135-.18.27-.7.877-.857 1.058-.158.18-.316.2-.587.065-2.228-1.112-3.673-2.127-5.14-4.636-.312-.533.312-.495.89-1.646.09-.18.045-.338-.022-.473-.068-.135-.613-1.477-.84-2.018-.22-.532-.442-.46-.613-.468-.158-.008-.339-.01-.52-.01-.18 0-.475.067-.723.338-.25.27-.95.925-.95 2.256s.97 2.617 1.105 2.8c.135.18 1.91 2.916 4.628 4.088.647.278 1.152.445 1.545.57.65.207 1.24.177 1.707.108.52-.078 1.597-.652 1.824-1.25.227-.597.227-1.11.158-1.218-.067-.108-.25-.18-.52-.315z" />
                                    </svg>
                                  </div>
                                  <div className="min-w-0">
                                    <span className="block text-sm font-bold text-gray-900 dark:text-white">WhatsApp</span>
                                    <span className="block text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-snug">Mensagens rápidas e diretas no seu celular.</span>
                                  </div>
                                </div>
                                <div className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-300 ease-in-out ${notifWhatsApp ? 'bg-primary-500' : 'bg-gray-200 dark:bg-gray-700'}`}>
                                  <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition duration-300 ease-in-out ${notifWhatsApp ? 'translate-x-5' : 'translate-x-0'}`} />
                                </div>
                              </div>

                              {notifWhatsApp && (
                                <div
                                  onClick={() => updatePreference('whatsapp_order_confirmation_enabled', !notifWhatsAppOrder)}
                                  className="flex items-center justify-between p-3.5 ml-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl cursor-pointer hover:border-primary-300 dark:hover:border-primary-700 hover:bg-gray-100 dark:hover:bg-gray-750 transition-all duration-300 select-none group"
                                >
                                  <div className="flex items-center gap-3 pr-2">
                                    <div className="p-1.5 bg-primary-50/50 dark:bg-primary-900/10 text-primary-500 rounded-lg group-hover:scale-105 transition-transform duration-300 flex-shrink-0">
                                      <Package className="w-4 h-4" />
                                    </div>
                                    <div className="min-w-0">
                                      <span className="block text-xs font-bold text-gray-900 dark:text-white">Pedidos no WhatsApp</span>
                                      <span className="block text-[10px] text-gray-500 dark:text-gray-400 mt-0.5 leading-snug">Receber atualizações do andamento dos pedidos por WhatsApp.</span>
                                    </div>
                                  </div>
                                  <div className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-300 ease-in-out ${notifWhatsAppOrder ? 'bg-primary-500' : 'bg-gray-200 dark:bg-gray-700'}`}>
                                    <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition duration-300 ease-in-out ${notifWhatsAppOrder ? 'translate-x-4' : 'translate-x-0'}`} />
                                  </div>
                                </div>
                              )}
                            </div>
                            {/* Email toggle */}
                            <div
                              onClick={() => updatePreference('email_notifications_enabled', !notifEmail)}
                              className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl cursor-pointer hover:border-primary-300 dark:hover:border-primary-700 hover:bg-gray-100 dark:hover:bg-gray-750 transition-all duration-300 select-none group"
                            >
                              <div className="flex items-center gap-3.5 pr-2">
                                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-500 dark:text-blue-400 rounded-xl group-hover:scale-105 transition-transform duration-300 flex-shrink-0">
                                  <Mail className="w-5 h-5" />
                                </div>
                                <div className="min-w-0">
                                  <span className="block text-sm font-bold text-gray-900 dark:text-white">E-mail</span>
                                  <span className="block text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-snug">Avisos detalhados enviados para sua caixa de entrada.</span>
                                </div>
                              </div>
                              <div className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-300 ease-in-out ${notifEmail ? 'bg-primary-500' : 'bg-gray-200 dark:bg-gray-700'}`}>
                                <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition duration-300 ease-in-out ${notifEmail ? 'translate-x-5' : 'translate-x-0'}`} />
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Tipos de Avisos */}
                        <div>
                          <h3 className="text-sm font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-800 pb-2 mb-4 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary-500"></span>
                            O que deseja receber?
                          </h3>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Selecione os tipos de conteúdo do seu interesse:</p>
                          <div className="space-y-3">
                            {/* Pedidos toggle */}
                            <div
                              onClick={() => updatePreference('order_status_notifications_enabled', !notifOrderStatus)}
                              className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl cursor-pointer hover:border-primary-300 dark:hover:border-primary-700 hover:bg-gray-100 dark:hover:bg-gray-750 transition-all duration-300 select-none group"
                            >
                              <div className="flex items-center gap-3.5 pr-2">
                                <div className="p-3 bg-primary-50 dark:bg-primary-900/20 text-primary-500 rounded-xl group-hover:scale-105 transition-transform duration-300 flex-shrink-0">
                                  <Package className="w-5 h-5" />
                                </div>
                                <div className="min-w-0">
                                  <span className="block text-sm font-bold text-gray-900 dark:text-white">Andamento do Pedido</span>
                                  <span className="block text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-snug">Avisos de pagamento, preparação, envio e entrega.</span>
                                </div>
                              </div>
                              <div className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-300 ease-in-out ${notifOrderStatus ? 'bg-primary-500' : 'bg-gray-200 dark:bg-gray-700'}`}>
                                <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition duration-300 ease-in-out ${notifOrderStatus ? 'translate-x-5' : 'translate-x-0'}`} />
                              </div>
                            </div>
                            {/* Promoções toggle */}
                            <div
                              onClick={() => updatePreference('promotions_notifications_enabled', !notifPromotions)}
                              className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl cursor-pointer hover:border-primary-300 dark:hover:border-primary-700 hover:bg-gray-100 dark:hover:bg-gray-750 transition-all duration-300 select-none group"
                            >
                              <div className="flex items-center gap-3.5 pr-2">
                                <div className="p-3 bg-rose-50 dark:bg-rose-900/20 text-rose-500 rounded-xl group-hover:scale-105 transition-transform duration-300 flex-shrink-0">
                                  <Heart className="w-5 h-5 fill-rose-100 dark:fill-rose-900/30" />
                                </div>
                                <div className="min-w-0">
                                  <span className="block text-sm font-bold text-gray-900 dark:text-white">Promoções e Favoritos</span>
                                  <span className="block text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-snug">Produtos favoritados quando entrarem em promoção ou novidades.</span>
                                </div>
                              </div>
                              <div className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-300 ease-in-out ${notifPromotions ? 'bg-primary-500' : 'bg-gray-200 dark:bg-gray-700'}`}>
                                <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition duration-300 ease-in-out ${notifPromotions ? 'translate-x-5' : 'translate-x-0'}`} />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ─────────────────────────────────────────────────────── */}
              {/* AJUDA                                                   */}
              {/* ─────────────────────────────────────────────────────── */}
              {activeSection === 'help' && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-6 bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm dark:shadow-xl">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      <HelpCircle className="text-primary-500" />
                      Ajuda & FAQ
                    </h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Dúvidas frequentes e suporte direto.</p>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-800 pb-2">Dúvidas Frequentes</h3>

                    <div className="space-y-3">
                      {[
                        {
                          q: 'Como funciona a assinatura de cápsulas?',
                          a: 'A assinatura mensal permite que você escolha suas fórmulas e as receba automaticamente no conforto de sua caixa a cada 30 dias. Assinantes possuem 10% de desconto recorrente e frete grátis em todas as caixas.'
                        },
                        {
                          q: 'Qual o prazo de entrega dos pedidos?',
                          a: 'O prazo médio é de 2 a 5 dias úteis para capitais da região Sudeste e Sul, e de 5 a 10 dias úteis para as demais regiões do Brasil. Você receberá um código de rastreamento no WhatsApp e no e-mail cadastrado.'
                        },
                        {
                          q: 'Como posso trocar ou cancelar meu pedido?',
                          a: 'Conforme o Código de Defesa do Consumidor, você tem o direito de solicitar a devolução ou troca de produtos não lacrados em até 7 dias corridos após o recebimento. Para cancelar ou iniciar a devolução, fale com nossa central de suporte.'
                        },
                      ].map((faq, i) => (
                        <details key={i} className="group bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 transition-all duration-300 [&_summary::-webkit-details-marker]:hidden">
                          <summary className="flex items-center justify-between font-bold text-gray-900 dark:text-white text-xs cursor-pointer">
                            <span>{faq.q}</span>
                            <span className="transition-transform duration-300 group-open:rotate-90 text-primary-500 flex-shrink-0 ml-3">
                              <ChevronRight className="w-4 h-4" />
                            </span>
                          </summary>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 leading-relaxed">
                            {faq.a}
                          </p>
                        </details>
                      ))}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                      {/* WhatsApp Channel */}
                      <div className="bg-green-50/50 dark:bg-green-950/10 border border-green-200 dark:border-green-900/30 rounded-2xl p-5 flex flex-col items-center text-center justify-between">
                        <div className="p-3 rounded-full bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400 mb-3">
                          <Phone size={24} />
                        </div>
                        <h4 className="font-bold text-gray-900 dark:text-white text-sm">Suporte via WhatsApp</h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 mb-4 leading-relaxed">Atendimento rápido e personalizado diretamente no celular.</p>
                        <a
                          href={env.supportWhatsAppUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-bold transition-all shadow-md hover:scale-[1.02] active:scale-[0.98]"
                        >
                          Chamar no WhatsApp
                        </a>
                      </div>

                      {/* Email Channel */}
                      <div className="bg-blue-50/50 dark:bg-blue-950/10 border border-blue-200 dark:border-blue-900/30 rounded-2xl p-5 flex flex-col items-center text-center justify-between">
                        <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 mb-3">
                          <Mail size={24} />
                        </div>
                        <h4 className="font-bold text-gray-900 dark:text-white text-sm">Suporte via E-mail</h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 mb-4 leading-relaxed">Envie suas dúvidas, sugestões ou solicitações para nosso e-mail.</p>
                        <button
                          type="button"
                          onClick={handleSendEmail}
                          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                        >
                          Enviar E-mail
                        </button>
                      </div>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 text-center text-xs text-gray-500 dark:text-gray-400 mt-4 leading-relaxed">
                      Respondemos em até 1 dia útil.
                    </div>
                  </div>
                </div>
              )}

              {/* ─────────────────────────────────────────────────────── */}
              {/* CONTAS CONECTADAS                                       */}
              {/* ─────────────────────────────────────────────────────── */}
              {activeSection === 'connected-accounts' && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-6 bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm dark:shadow-xl">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      <ShieldCheck className="text-primary-500" />
                      Contas Conectadas
                    </h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Gerencie as contas de provedores externos vinculadas à sua conta Kapsu.
                    </p>
                  </div>

                  {loadingProviders ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="animate-spin w-6 h-6 text-primary-500" />
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Google Connection Card */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl gap-4">
                        <div className="flex items-center gap-3.5">
                          {/* Google Icon SVG */}
                          <div className="p-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm flex items-center justify-center flex-shrink-0">
                            <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
                              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
                            </svg>
                          </div>
                          <div className="min-w-0">
                            <span className="block text-sm font-bold text-gray-900 dark:text-white">Google</span>
                            <span className="block text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-snug">
                              {connectedProviders.includes('google')
                                ? 'Conta vinculada e ativa para login social.'
                                : 'Conecte sua conta Google para fazer login com um clique.'}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {connectedProviders.includes('google') ? (
                            <button
                              type="button"
                              onClick={() => handleUnlinkProvider('google')}
                              disabled={loadingSocialAction}
                              className="px-3.5 py-2 border border-red-250 hover:border-red-300 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-950/20 text-red-600 dark:text-red-400 rounded-xl text-xs font-bold transition-all disabled:opacity-50 cursor-pointer animate-in fade-in"
                            >
                              {loadingSocialAction ? 'Aguarde...' : 'Desvincular'}
                            </button>
                          ) : (
                            <div id="google-link-btn-container" className="min-h-[38px] flex items-center"></div>
                          )}
                        </div>
                      </div>

                      {/* Microsoft Connection Card (Placeholder) */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-50/50 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700/50 rounded-2xl gap-4 opacity-75">
                        <div className="flex items-center gap-3.5">
                          <div className="p-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm flex items-center justify-center flex-shrink-0">
                            <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 23 23" xmlns="http://www.w3.org/2000/svg">
                              <path fill="#F25022" d="M1 1h10v10H1z" />
                              <path fill="#7FBA00" d="M12 1h10v10H12z" />
                              <path fill="#00A4EF" d="M1 12h10v10H1z" />
                              <path fill="#FFB900" d="M12 12h10v10H12z" />
                            </svg>
                          </div>
                          <div className="min-w-0">
                            <span className="block text-sm font-bold text-gray-900 dark:text-white">Microsoft</span>
                            <span className="block text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-snug">
                              Entrar com conta pessoal ou corporativa Microsoft. (Em breve)
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          disabled
                          className="px-3.5 py-2 bg-gray-100 dark:bg-gray-800 text-gray-400 rounded-xl text-xs font-bold cursor-not-allowed"
                        >
                          Conectar
                        </button>
                      </div>

                      {/* Apple Connection Card (Placeholder) */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-50/50 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700/50 rounded-2xl gap-4 opacity-75">
                        <div className="flex items-center gap-3.5">
                          <div className="p-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm flex items-center justify-center flex-shrink-0">
                            <svg className="w-5 h-5 flex-shrink-0 fill-current text-gray-900 dark:text-white" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 4.17c.66-.81 1.11-1.93.99-3.06-1 .04-2.22.67-2.94 1.5-.62.71-1.16 1.85-1.02 2.96 1.1.09 2.23-.55 2.97-1.4z" />
                            </svg>
                          </div>
                          <div className="min-w-0">
                            <span className="block text-sm font-bold text-gray-900 dark:text-white">Apple</span>
                            <span className="block text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-snug">
                              Entrar com o ID Apple de forma segura. (Em breve)
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          disabled
                          className="px-3.5 py-2 bg-gray-100 dark:bg-gray-800 text-gray-400 rounded-xl text-xs font-bold cursor-not-allowed"
                        >
                          Conectar
                        </button>
                      </div>

                      {/* GitHub Connection Card (Placeholder) */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-50/50 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700/50 rounded-2xl gap-4 opacity-75">
                        <div className="flex items-center gap-3.5">
                          <div className="p-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm flex items-center justify-center flex-shrink-0">
                            <svg className="w-5 h-5 flex-shrink-0 fill-current text-gray-900 dark:text-white" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.87 7.65 6.84 8.97.5.09.68-.22.68-.48 0-.24-.01-.87-.01-1.7-2.78.6-3.37-1.34-3.37-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.9 1.52 2.34 1.08 2.91.83.09-.65.35-1.09.64-1.34-2.22-.25-4.55-1.11-4.55-4.94 0-1.1.39-1.99 1.03-2.69-.1-.25-.45-1.27.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.37.2 2.39.1 2.64.64.7 1.03 1.59 1.03 2.69 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.85 0 1.34-.01 2.42-.01 2.75 0 .27.18.58.69.48C19.14 19.65 22 15.92 22 12c0-5.523-4.477-10-10-10z" />
                            </svg>
                          </div>
                          <div className="min-w-0">
                            <span className="block text-sm font-bold text-gray-900 dark:text-white">GitHub</span>
                            <span className="block text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-snug">
                              Vincule sua conta de desenvolvedor do GitHub. (Em breve)
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          disabled
                          className="px-3.5 py-2 bg-gray-100 dark:bg-gray-800 text-gray-400 rounded-xl text-xs font-bold cursor-not-allowed"
                        >
                          Conectar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>

        </div>
      </div>

      {/* ── Modal Editar Dados ───────────────────────────────────── */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800">
              <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Edit className="w-4 h-4 text-primary-500" />
                Editar Dados Pessoais
              </h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-white bg-gray-100 dark:bg-gray-800 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">Nome Completo</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className={inputClass}
                  placeholder="Seu nome completo"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" /> Telefone / WhatsApp
                </label>
                <input
                  type="text"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className={inputClass}
                  placeholder="(00) 00000-0000"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-5 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-xl transition-colors font-bold text-xs cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveInfoModal}
                disabled={loading || !editName.trim()}
                className="flex items-center justify-center gap-1.5 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-xl transition-all font-bold text-xs shadow-md disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    Salvar Alterações
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}


    </div>
  )
}
