import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, RefreshCw, CheckCircle2, XCircle, Send, Loader2, QrCode, LogOut, AlertTriangle, MessageSquare, Phone, User, Paperclip, X, Lock, Unlock, ZoomIn, Info, ChevronDown, ChevronUp, Trash2, Download, Plus, Settings, Bot, Power, Clock } from 'lucide-react'
import { whatsappService, WhatsAppStatus } from '../services/whatsapp.service'
import { env } from '../config/env'
import { useAuth } from '../context/AuthContext'

interface WhatsAppMessage {
  id: string
  from: string
  to: string
  body: string
  timestamp: number
  type: 'text' | 'image' | 'video' | 'audio' | 'document' | 'other'
  isFromMe: boolean
  contactName?: string
  mediaUrl?: string
  mediaMimetype?: string
  fileExtension?: string
}

interface Conversation {
  phone: string
  contactName?: string
  lastMessage: WhatsAppMessage
  unreadCount: number
  messages: WhatsAppMessage[]
  needsResponse?: boolean // true se a última mensagem foi do cliente
  needsPharmacist?: boolean
  isAssumed?: boolean
  assumedBy?: string | null
  assumedAt?: Date | null
  assumptionReason?: string | null
  awaitingControlledConfirmation?: boolean
}

export default function WhatsAppConnection() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [status, setStatus] = useState<WhatsAppStatus | null>(null)
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [initializing, setInitializing] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const [showDisconnectModal, setShowDisconnectModal] = useState(false)
  const [showFinalConfirm, setShowFinalConfirm] = useState(false)
  const [sending, setSending] = useState(false)
  const [testMessage, setTestMessage] = useState({ phone: '', message: '' })
  const [messageStatus, setMessageStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' })
  
  // Conversas e mensagens
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [conversationsNeedingResponse, setConversationsNeedingResponse] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null)
  const [showNeedingResponse, setShowNeedingResponse] = useState(false) // Toggle para mostrar fila
  const [messages, setMessages] = useState<WhatsAppMessage[]>([])
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const currentConversationRef = useRef<string | null>(null)
  const loadingMessagesRef = useRef<boolean>(false)
  const messagesCacheRef = useRef<Map<string, { messages: WhatsAppMessage[], timestamp: number }>>(new Map()) // Cache de mensagens
  const [conversationMessage, setConversationMessage] = useState('')
  const [sendingConversationMessage, setSendingConversationMessage] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [filePreview, setFilePreview] = useState<string | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null) // Para preview de imagens no modal
  const [searchTerm, setSearchTerm] = useState('')
  const [showMessagesOnMobile, setShowMessagesOnMobile] = useState(false) // Para mobile: controla se mostra lista ou mensagens
  const [selectedFilters, setSelectedFilters] = useState<{
    cliente: boolean
    farmaceutico: boolean
    assumida: boolean
    controlado: boolean
  }>({
    cliente: false,
    farmaceutico: false,
    assumida: false,
    controlado: false
  })
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Estado para teste de IA - Chat completo
  const [testAIMessage, setTestAIMessage] = useState('')
  const [testAIPhone, setTestAIPhone] = useState('') // Número de telefone para teste
  const [testAIChatHistory, setTestAIChatHistory] = useState<Array<{
    role: 'user' | 'assistant'
    content: string
    timestamp: number
    metadata?: {
      isControlled?: boolean
      controlledSubstance?: string | null
      needsPharmacist?: boolean
      infoMessage?: string | null
      confirmationMessage?: string | null
      extractedMessage?: any
      processingDetails?: any
      pharmacistNotified?: boolean
      notifiedNumbers?: Array<{ phone: string; name: string | null }>
      // Informações do carrinho
      purchaseLink?: string | null
      cartInfo?: {
        itemCount: number
        total: number
        items?: Array<{ name: string; quantity: number; price: number }>
      } | null
    }
  }>>([])
  const [testingAI, setTestingAI] = useState(false)
  const [showTestPanel, setShowTestPanel] = useState(false)
  const [processingStatus, setProcessingStatus] = useState<string>('')
  const [selectedMessageForDetails, setSelectedMessageForDetails] = useState<number | null>(null)
  const testChatContainerRef = useRef<HTMLDivElement>(null)
  
  // Estado para modal de confirmação de encaminhamento para farmacêutico
  const [showPharmacistConfirmation, setShowPharmacistConfirmation] = useState(false)
  const [pendingPharmacistNotification, setPendingPharmacistNotification] = useState<{
    phone: string
    message: string
    originalMessage?: string // Mensagem original que iniciou o processo
    controlledSubstance: string
    extractedMessage: any
    messageIndex: number
  } | null>(null)

  // Estados para gerenciar números de farmacêuticos
  const [showPharmacistConfig, setShowPharmacistConfig] = useState(false)
  const [pharmacistNumbers, setPharmacistNumbers] = useState<Array<{
    id: string
    phone: string
    name: string | null
    userId: string | null
    userEmail: string | null
    isActive: boolean
    createdAt: string
    updatedAt: string
  }>>([])
  const [loadingPharmacistNumbers, setLoadingPharmacistNumbers] = useState(false)
  const [showAddPharmacistModal, setShowAddPharmacistModal] = useState(false)
  const [newPharmacistPhone, setNewPharmacistPhone] = useState('')
  const [newPharmacistUserId, setNewPharmacistUserId] = useState<string | null>(null)
  const [newPharmacistName, setNewPharmacistName] = useState('')
  const [usersWithPhone, setUsersWithPhone] = useState<Array<{
    id: string
    name: string
    email: string
    phone: string
  }>>([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [addingPharmacist, setAddingPharmacist] = useState(false)

  // Estados para gerenciar números da distribuidora
  const [showDistributorConfig, setShowDistributorConfig] = useState(false)
  const [distributorNumbers, setDistributorNumbers] = useState<Array<{
    id: string
    phone: string
    name: string | null
    userId: string | null
    userEmail: string | null
    isActive: boolean
    createdAt: string
    updatedAt: string
  }>>([])
  const [loadingDistributorNumbers, setLoadingDistributorNumbers] = useState(false)
  const [showAddDistributorModal, setShowAddDistributorModal] = useState(false)
  const [newDistributorPhone, setNewDistributorPhone] = useState('')
  const [newDistributorUserId, setNewDistributorUserId] = useState<string | null>(null)
  const [newDistributorName, setNewDistributorName] = useState('')
  const [addingDistributor, setAddingDistributor] = useState(false)

  // Chave para armazenamento no localStorage
  const TEST_CHAT_STORAGE_KEY = 'sanare_ai_test_chat_history'
  const TEST_PHONE_STORAGE_KEY = 'sanare_ai_test_phone'
  const isInitialLoadRef = useRef(true) // Flag para evitar salvar no primeiro carregamento

  // Carrega histórico de teste salvo do localStorage ao montar o componente
  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem(TEST_CHAT_STORAGE_KEY)
      if (savedHistory) {
        const parsed = JSON.parse(savedHistory)
        if (Array.isArray(parsed) && parsed.length > 0) {
          setTestAIChatHistory(parsed)
        }
      }
      
      const savedPhone = localStorage.getItem(TEST_PHONE_STORAGE_KEY)
      if (savedPhone) {
        setTestAIPhone(savedPhone)
      }
      
      // Marca que o carregamento inicial foi concluído
      setTimeout(() => {
        isInitialLoadRef.current = false
      }, 100)
    } catch (error) {
      console.error('Erro ao carregar histórico de teste do localStorage:', error)
      isInitialLoadRef.current = false
    }
  }, []) // Executa apenas uma vez ao montar

  // Salva histórico no localStorage sempre que ele mudar (mas não no primeiro carregamento)
  useEffect(() => {
    // Evita salvar durante o carregamento inicial
    if (isInitialLoadRef.current) {
      return
    }
    
    try {
      if (testAIChatHistory.length > 0) {
        localStorage.setItem(TEST_CHAT_STORAGE_KEY, JSON.stringify(testAIChatHistory))
      } else {
        // Se o histórico estiver vazio, remove do localStorage
        localStorage.removeItem(TEST_CHAT_STORAGE_KEY)
      }
    } catch (error) {
      console.error('Erro ao salvar histórico de teste no localStorage:', error)
    }
  }, [testAIChatHistory])

  // Salva número de telefone no localStorage quando mudar (mas não no primeiro carregamento)
  useEffect(() => {
    // Evita salvar durante o carregamento inicial
    if (isInitialLoadRef.current) {
      return
    }
    
    try {
      if (testAIPhone.trim()) {
        localStorage.setItem(TEST_PHONE_STORAGE_KEY, testAIPhone.trim())
      } else {
        localStorage.removeItem(TEST_PHONE_STORAGE_KEY)
      }
    } catch (error) {
      console.error('Erro ao salvar telefone de teste no localStorage:', error)
    }
  }, [testAIPhone])

  useEffect(() => {
    // Apenas verifica o status, não inicializa automaticamente
    checkStatus()
    
    // Atualiza status periodicamente apenas se estiver conectado ou em processo de conexão
    const statusInterval = setInterval(() => {
      if (status?.connected || status?.status === 'CONNECTED' || status?.status === 'QRCODE_GENERATED' || status?.status === 'CONNECTING') {
        checkStatus()
      }
    }, 3000)

    return () => clearInterval(statusInterval)
  }, [status?.connected, status?.status])

  // Busca conversas quando conectado
  useEffect(() => {
    if (status?.connected || status?.status === 'CONNECTED') {
      // Carrega conversas existentes na primeira vez que conectar
      const loadExistingChats = async () => {
        try {
          await whatsappService.loadChats()
          loadConversations()
        } catch (error) {
          // Se falhar, apenas carrega as conversas atuais
          loadConversations()
        }
      }
      
      // Aguarda 5 segundos após conectar para carregar conversas existentes
      const timeout = setTimeout(() => {
        loadExistingChats()
      }, 5000)
      
      // Depois atualiza periodicamente
      const conversationsInterval = setInterval(() => {
        loadConversations()
        loadConversationsNeedingResponse() // Também atualiza a fila
      }, 2000) // Atualiza conversas a cada 2 segundos

      return () => {
        clearTimeout(timeout)
        clearInterval(conversationsInterval)
      }
    }
  }, [status?.connected, status?.status])

  // Carrega mensagens quando uma conversa é selecionada
  useEffect(() => {
    // Atualiza a ref com a conversa atual
    currentConversationRef.current = selectedConversation
    
    if (selectedConversation) {
      // Limpa mensagens anteriores imediatamente ao trocar de conversa
      setMessages([])
      loadingMessagesRef.current = false
      
      // Carrega mensagens da nova conversa
      const currentPhone = selectedConversation
      
      // Pequeno delay para garantir que o estado foi atualizado
      setTimeout(() => {
        if (currentConversationRef.current === currentPhone) {
          loadMessages(currentPhone)
        }
      }, 50)
      
      const messagesInterval = setInterval(() => {
        // Verifica se ainda é a conversa selecionada usando a ref (sempre atualizada)
        if (currentConversationRef.current === currentPhone && !loadingMessagesRef.current) {
          loadMessages(currentPhone)
        }
      }, 1000) // Atualiza mensagens a cada 1 segundo

      return () => {
        clearInterval(messagesInterval)
        // Limpa mensagens ao sair da conversa
        setMessages([])
        loadingMessagesRef.current = false
      }
    } else {
      // Se não há conversa selecionada, limpa as mensagens
      setMessages([])
      loadingMessagesRef.current = false
    }
  }, [selectedConversation])

  // Fecha modal de preview com ESC
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && imagePreview) {
        setImagePreview(null)
      }
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [imagePreview])

  // Listener para recarregar mensagens após re-download de mídia
  useEffect(() => {
    const handleReloadMessages = (event: CustomEvent) => {
      const { messageId } = event.detail
      if (selectedConversation && messageId) {
        // Remove a marcação de erro do sessionStorage para o áudio específico
        sessionStorage.removeItem(`audio-error-${messageId}`)
        
        // Remove do cache para forçar recarregar
        messagesCacheRef.current.delete(selectedConversation)
        
        // Recarrega mensagens após um pequeno delay
        setTimeout(() => {
          if (currentConversationRef.current === selectedConversation) {
            loadMessages(selectedConversation)
          }
        }, 1000)
      }
    }

    window.addEventListener('reloadMessages', handleReloadMessages as EventListener)
    return () => window.removeEventListener('reloadMessages', handleReloadMessages as EventListener)
  }, [selectedConversation])

  // Scroll automático para última mensagem (apenas quando há novas mensagens)
  const [previousMessageCount, setPreviousMessageCount] = useState(0)
  const [isNumberAllowed, setIsNumberAllowed] = useState<boolean>(false)
  const [allowedNumberId, setAllowedNumberId] = useState<string | null>(null)
  const [loadingAllowedCheck, setLoadingAllowedCheck] = useState(false)
  
  useEffect(() => {
    if (messages.length > 0 && selectedConversation && messagesContainerRef.current) {
      // Scroll instantâneo para o final quando há mensagens
      // Se for primeira vez carregando (previousMessageCount === 0), scroll instantâneo
      // Se houver novas mensagens, também scroll instantâneo
      if (previousMessageCount === 0 || messages.length > previousMessageCount) {
        // Scroll instantâneo sem delay ou animação
        messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight
        setPreviousMessageCount(messages.length)
      }
    }
  }, [messages.length, selectedConversation, previousMessageCount])
  
  // Reset contador quando troca de conversa e scroll instantâneo para o final
  useEffect(() => {
    setPreviousMessageCount(0)
    // Scroll instantâneo para o final quando troca de conversa (sem animação)
    if (messagesContainerRef.current) {
      // Scroll instantâneo sem delay
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight
    }
    
    // Verifica se o número está na lista de permitidos quando seleciona uma conversa
    if (selectedConversation) {
      checkIfNumberIsAllowed(selectedConversation)
    } else {
      setIsNumberAllowed(false)
      setAllowedNumberId(null)
    }
  }, [selectedConversation])

  const initializeWhatsApp = async () => {
    try {
      setInitializing(true)
      setLoading(true)
      setQrCode(null) // Limpa QR Code anterior
      
      // Inicializa o WhatsApp
      const response = await whatsappService.initialize()
      setStatus(response)
      
      // Se já veio com QR Code, usa ele
      if (response.qrCode) {
        setQrCode(response.qrCode)
        setInitializing(false)
        setLoading(false)
        return
      }
      
      // Se não veio com QR Code, faz polling para obter
      // O QR Code pode demorar alguns segundos para ser gerado
      let attempts = 0
      const maxAttempts = 40 // 20 segundos (40 * 500ms) - aumentado para dar mais tempo
      let foundQRCode = false
      
      while (attempts < maxAttempts && !foundQRCode) {
        await new Promise(resolve => setTimeout(resolve, 500))
        
        try {
          const qrResponse = await whatsappService.getQRCode()
          setStatus(qrResponse)
          
          if (qrResponse.qrCode) {
            setQrCode(qrResponse.qrCode)
            foundQRCode = true
            setInitializing(false)
            setLoading(false)
            return
          }
          
          // Se o status mudou para CONNECTED, para o polling
          if (qrResponse.status === 'CONNECTED' || qrResponse.connected) {
            setStatus(qrResponse)
            foundQRCode = true
            setInitializing(false)
            setLoading(false)
            return
          }
        } catch (error: any) {
          // Se for erro de conexão, para o polling e mostra erro
          if (error?.message?.includes('Failed to fetch') || 
              error?.message?.includes('ERR_CONNECTION_REFUSED') ||
              error?.message?.includes('NetworkError')) {
            console.error('Erro de conexão durante polling:', error)
            foundQRCode = true // Para o loop
            setStatus({
              success: false,
              status: 'DISCONNECTED',
              connected: false,
              message: 'Erro de conexão. Verifique se o servidor está rodando.',
            })
            setInitializing(false)
            setLoading(false)
            return
          }
          // Continua tentando para outros erros
          console.warn('Erro ao obter QR Code durante polling:', error)
        }
        
        attempts++
      }
      
      // Se chegou aqui e não obteve QR Code, verifica status final
      try {
        const finalStatus = await whatsappService.getStatus()
        setStatus(finalStatus)
        if (finalStatus.qrCode) {
          setQrCode(finalStatus.qrCode)
        }
      } catch (error) {
        console.error('Erro ao verificar status final:', error)
        // Se não conseguiu obter status, tenta mais uma vez após um delay
        setTimeout(async () => {
          try {
            const retryStatus = await whatsappService.getStatus()
            setStatus(retryStatus)
            if (retryStatus.qrCode) {
              setQrCode(retryStatus.qrCode)
            }
          } catch (retryError) {
            // Ignora erro no retry
          }
        }, 2000)
      }
      
    } catch (error: any) {
      console.error('Erro ao inicializar WhatsApp:', error)
      
      // Verifica se é erro de conexão
      const isConnectionError = 
        error?.message?.includes('Failed to fetch') ||
        error?.message?.includes('ERR_CONNECTION_REFUSED') ||
        error?.message?.includes('NetworkError') ||
        error?.message?.includes('fetch')
      
      setStatus({
        success: false,
        status: 'DISCONNECTED',
        connected: false,
        message: isConnectionError 
          ? 'Erro de conexão. Verifique se o servidor está rodando na porta correta.'
          : (error?.message || 'Erro ao inicializar WhatsApp'),
      })
    } finally {
      // Sempre para o loading, mesmo em caso de erro
      setInitializing(false)
      setLoading(false)
    }
  }

  const checkStatus = async () => {
    try {
      const statusData = await whatsappService.getStatus()
      setStatus(statusData)
      setLoading(false) // Para o carregamento após primeira verificação

      // Se estiver conectado, limpa QR Code
      if (statusData.connected || statusData.status === 'CONNECTED') {
        setQrCode(null)
        return
      }

      // Se o statusData já vier com QR Code (do getStatus), usa ele
      if (statusData.qrCode) {
        setQrCode(statusData.qrCode)
        return
      }

      // Se já tiver QR Code gerado, tenta obter (apenas se já estiver em processo de conexão)
      if (statusData.status === 'QRCODE_GENERATED' || statusData.status === 'CONNECTING') {
        try {
          const qrData = await whatsappService.getQRCode()
          if (qrData.qrCode) {
            setQrCode(qrData.qrCode)
            if (qrData.status === 'QRCODE_GENERATED') {
              setStatus(qrData)
            }
          }
        } catch (error) {
          // Ignora erros silenciosamente
        }
      } else {
        // Se desconectado, limpa QR Code e não tenta obter automaticamente
        setQrCode(null)
      }
    } catch (error) {
      setLoading(false) // Para o carregamento mesmo em caso de erro
      // Ignora erros silenciosamente
    }
  }

  const loadConversations = async () => {
    try {
      const response = await whatsappService.getConversations()
      if (response.success) {
        setConversations(response.conversations)
      }
    } catch (error) {
      // Ignora erros silenciosamente
    }
  }

  const loadConversationsNeedingResponse = async () => {
    try {
      const response = await whatsappService.getConversationsNeedingResponse()
      if (response.success) {
        setConversationsNeedingResponse(response.conversations)
      }
    } catch (error) {
      // Ignora erros silenciosamente
    }
  }

  const loadMessages = async (phone: string) => {
    try {
      // Previne múltiplas requisições simultâneas
      if (loadingMessagesRef.current) {
        return
      }
      
      // Verifica se ainda é a conversa selecionada antes de atualizar
      if (currentConversationRef.current !== phone) {
        return // Ignora se a conversa mudou
      }
      
      loadingMessagesRef.current = true
      
      // OTIMIZAÇÃO: Mostra mensagens do cache primeiro (instantâneo) apenas se houver cache válido
      const cached = messagesCacheRef.current.get(phone)
      if (cached && cached.messages && cached.messages.length > 0 && (Date.now() - cached.timestamp < 5000)) {
        // Cache válido por 5 segundos e tem mensagens
        setMessages(cached.messages)
      }
      
      const response = await whatsappService.getConversationMessages(phone)
      
      // Verifica novamente após a requisição (pode ter mudado durante o async)
      if (currentConversationRef.current !== phone) {
        loadingMessagesRef.current = false
        return // Ignora se a conversa mudou durante a requisição
      }
      
      if (response && response.success) {
        const loadedMessages = response.messages || []
        
        // Remove duplicatas baseado no ID (segurança extra caso o backend retorne duplicatas)
        const uniqueMessages = Array.from(
          new Map(loadedMessages.map(msg => [msg.id, msg])).values()
        ).sort((a, b) => a.timestamp - b.timestamp)
        
        setMessages(uniqueMessages)
        
        // Atualiza cache apenas se houver mensagens
        if (loadedMessages.length > 0) {
          messagesCacheRef.current.set(phone, {
            messages: loadedMessages,
            timestamp: Date.now()
          })
        } else {
          // Remove do cache se não houver mensagens
          messagesCacheRef.current.delete(phone)
        }
        
        // Marca como lida
        await whatsappService.markConversationAsRead(phone).catch(() => {
          // Ignora erros ao marcar como lida
        })
      } else {
        // Se não teve sucesso, limpa mensagens e cache
        setMessages([])
        messagesCacheRef.current.delete(phone)
      }
      
      loadingMessagesRef.current = false
    } catch (error: any) {
      loadingMessagesRef.current = false
      console.error('Erro ao carregar mensagens:', error)
      // Limpa mensagens em caso de erro
      setMessages([])
      messagesCacheRef.current.delete(phone)
    }
  }

  const checkIfNumberIsAllowed = async (phone: string) => {
    try {
      setLoadingAllowedCheck(true)
      const result = await whatsappService.isNumberAllowed(phone)
      setIsNumberAllowed(result.isAllowed)
      setAllowedNumberId(result.allowedNumber?.id || null)
    } catch (error: any) {
      console.error('Erro ao verificar número permitido:', error)
      setIsNumberAllowed(false)
      setAllowedNumberId(null)
    } finally {
      setLoadingAllowedCheck(false)
    }
  }

  const handleToggleAllowedAINumber = async () => {
    if (!selectedConversation || loadingAllowedCheck) return

    // Verifica se o token existe antes de fazer a requisição
    const token = localStorage.getItem('sanare_token')
    if (!token) {
      alert('Você precisa estar logado para usar esta funcionalidade. Por favor, faça login novamente.')
      navigate('/login')
      return
    }

    try {
      const selectedConv = conversations.find(c => c.phone === selectedConversation)
      if (isNumberAllowed && allowedNumberId) {
        // Remove da lista
        await whatsappService.removeAllowedAINumber(allowedNumberId)
        setIsNumberAllowed(false)
        setAllowedNumberId(null)
        alert('Número removido da lista de permitidos. A IA não responderá mais automaticamente (a menos que AI_AUTO_RESPOND=true no .env).')
      } else {
        // Adiciona à lista
        const contactName = selectedConv?.contactName || 'Cliente'
        const result = await whatsappService.addAllowedAINumber(
          selectedConversation,
          `Adicionado via interface - ${contactName}`
        )
        setIsNumberAllowed(true)
        setAllowedNumberId(result.id)
        alert('Número adicionado à lista de permitidos! A IA responderá automaticamente mesmo com AI_AUTO_RESPOND=false.')
      }
    } catch (error: any) {
      console.error('Erro ao alterar número permitido:', error)
      const errorMessage = error.message || 'Erro desconhecido'
      
      // Se for erro de autenticação (token não encontrado ou sessão expirada)
      if (errorMessage.includes('Sessão expirada') || errorMessage.includes('Token') || errorMessage.includes('login')) {
        const currentToken = localStorage.getItem('sanare_token')
        if (!currentToken) {
          alert('Sua sessão expirou. Por favor, faça login novamente.')
          navigate('/login')
        } else {
          // Token existe mas pode ter expirado - não remove automaticamente
          alert('Erro de autenticação. Por favor, tente novamente. Se o problema persistir, faça login novamente.')
        }
      } else {
        alert('Erro ao alterar número permitido: ' + errorMessage)
      }
    }
  }

  const handleBlockConversation = async (phone: string) => {
    try {
      const userName = user?.name || 'Administrador'
      await whatsappService.markConversationAsAssumed(
        phone,
        userName,
        'Conversa assumida manualmente'
      )
      alert('Conversa assumida com sucesso! A IA foi bloqueada.')
      // Recarrega as conversas para atualizar o status
      loadConversations()
      loadConversationsNeedingResponse()
    } catch (error: any) {
      console.error('Erro ao assumir conversa:', error)
      alert('Erro ao assumir conversa: ' + error.message)
    }
  }

  const handleUnblockConversation = async (phone: string) => {
    try {
      await whatsappService.unmarkConversationAsAssumed(phone)
      alert('Conversa desbloqueada com sucesso! A IA voltará a responder.')
      // Recarrega as conversas para atualizar o status
      loadConversations()
      loadConversationsNeedingResponse()
    } catch (error: any) {
      console.error('Erro ao desbloquear conversa:', error)
      alert('Erro ao desbloquear conversa: ' + error.message)
    }
  }

  const formatPhone = (phone: string): string => {
    // Remove @c.us se presente
    const clean = phone.replace('@c.us', '').replace('@s.whatsapp.net', '')
    // Formata para exibição
    if (clean.length === 13 && clean.startsWith('55')) {
      const ddd = clean.substring(2, 4)
      const number = clean.substring(4)
      return `(${ddd}) ${number.substring(0, 5)}-${number.substring(5)}`
    }
    return clean
  }

  // Função auxiliar para formatar o texto da mensagem baseado no tipo
  const formatMessageBody = (message: WhatsAppMessage): string => {
    // Se for texto, retorna o texto normalmente
    if (message.type === 'text') {
      return message.body || ''
    }
    
    // Para mídias, retorna ícone e tipo ao invés de placeholder
    switch (message.type) {
      case 'audio':
        return '🎵 Áudio'
      case 'image':
        return '🖼️ Imagem'
      case 'video':
        return '🎬 Vídeo'
      case 'document':
        // Tenta identificar o tipo de documento
        if (message.mediaMimetype?.includes('pdf')) return '📄 PDF'
        if (message.mediaMimetype?.includes('word') || message.mediaMimetype?.includes('document')) return '📝 Documento'
        if (message.mediaMimetype?.includes('excel') || message.mediaMimetype?.includes('spreadsheet')) return '📊 Planilha'
        return '📎 Arquivo'
      case 'other':
        return '📎 Arquivo'
      default:
        return '📎 Arquivo'
    }
  }

  const renderMessageContent = (msg: WhatsAppMessage) => {
    // Verifica se o body contém base64 (imagem) - mesmo que não seja tipo 'image'
    const bodyTrimmed = (msg.body || '').trim()
    const isBase64Image = bodyTrimmed && (
      bodyTrimmed.startsWith('/9j/') || // JPEG
      bodyTrimmed.startsWith('iVBORw0KGgo') || // PNG
      bodyTrimmed.startsWith('data:image/') || // Data URL
      bodyTrimmed.startsWith('R0lGODlh') || // GIF
      (bodyTrimmed.length > 100 && /^[A-Za-z0-9+/=]+$/.test(bodyTrimmed.replace(/\s/g, ''))) // Base64 genérico
    )
    
    // Se for imagem OU se o body contém base64, trata como imagem
    if (msg.type === 'image' || isBase64Image) {
      let mediaUrl = msg.mediaUrl
      
      // Se o body contém base64, usa ele como imagem
      if (isBase64Image && !mediaUrl) {
        // Se já começa com data:, usa direto
        if (bodyTrimmed.startsWith('data:')) {
          mediaUrl = bodyTrimmed
        } else {
          // Senão, adiciona o prefixo data:image/jpeg;base64,
          // Tenta detectar o tipo pela assinatura
          let mimeType = 'image/jpeg'
          if (bodyTrimmed.startsWith('iVBORw0KGgo')) {
            mimeType = 'image/png'
          } else if (bodyTrimmed.startsWith('R0lGODlh')) {
            mimeType = 'image/gif'
          }
          mediaUrl = `data:${mimeType};base64,${bodyTrimmed}`
        }
      }
      
      // Se mediaUrl for relativa (começa com /), converte para URL completa
      if (mediaUrl && mediaUrl.startsWith('/') && !mediaUrl.startsWith('data:')) {
        let baseUrl = env.apiUrl
        if (baseUrl.endsWith('/api')) {
          baseUrl = baseUrl.slice(0, -4)
        }
        baseUrl = baseUrl.replace(/\/$/, '')
        mediaUrl = `${baseUrl}${mediaUrl}`
      }
      
      // Se não tiver mediaUrl mas tiver ID, constrói URL do endpoint
      if (!mediaUrl && msg.id) {
        let baseUrl = env.apiUrl
        if (baseUrl.endsWith('/api')) {
          baseUrl = baseUrl.slice(0, -4)
        }
        baseUrl = baseUrl.replace(/\/$/, '')
        mediaUrl = `${baseUrl}/api/whatsapp/media/${msg.id}`
      }
      
      if (mediaUrl) {
        // Função para baixar imagem
        const handleDownload = async (e: React.MouseEvent) => {
          e.stopPropagation()
          try {
            // Se for base64, converte para blob
            if (mediaUrl.startsWith('data:')) {
              const response = await fetch(mediaUrl)
              const blob = await response.blob()
              const url = window.URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url
              a.download = `imagem-${msg.id || Date.now()}.${msg.fileExtension || 'jpg'}`
              document.body.appendChild(a)
              a.click()
              document.body.removeChild(a)
              window.URL.revokeObjectURL(url)
            } else {
              // Para URLs remotas, faz fetch e baixa
              const response = await fetch(mediaUrl)
              const blob = await response.blob()
              const url = window.URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url
              a.download = `imagem-${msg.id || Date.now()}.${msg.fileExtension || 'jpg'}`
              document.body.appendChild(a)
              a.click()
              document.body.removeChild(a)
              window.URL.revokeObjectURL(url)
            }
          } catch (error) {
            console.error('Erro ao baixar imagem:', error)
            // Fallback: abre em nova aba
            window.open(mediaUrl, '_blank')
          }
        }

        return (
          <div className="space-y-2">
            <div className="relative">
              <div 
                className="relative group cursor-pointer"
                  onClick={() => {
                    // Abre preview da imagem em modal
                    setImagePreview(mediaUrl)
                  }}
              >
                <img 
                  src={mediaUrl} 
                  alt={msg.isFromMe ? "Imagem enviada por você" : "Imagem recebida"} 
                  className="w-full max-w-[240px] sm:max-w-[280px] lg:max-w-[320px] h-auto rounded-lg hover:opacity-90 transition-opacity block pointer-events-none"
                  onError={(e) => {
                    // Fallback se a imagem não carregar
                    const target = e.target as HTMLImageElement
                    const parent = target.parentElement
                    if (parent) {
                      parent.innerHTML = '<p class="text-xs sm:text-sm p-3 text-gray-500">Erro ao carregar imagem</p>'
                    }
                  }}
                />
                {/* Ícone de zoom ao passar o mouse */}
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none">
                  <ZoomIn className="w-8 h-8 text-white" />
                </div>
                {/* Botão de download na imagem pequena */}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDownload(e)
                  }}
                  className="absolute bottom-2 right-2 bg-black bg-opacity-60 hover:bg-opacity-80 text-white p-2 rounded-full transition-all opacity-0 group-hover:opacity-100 z-10"
                  title="Baixar imagem"
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>
            </div>
            {/* Legenda da imagem - só mostra se não for base64 */}
            {msg.body && !isBase64Image && (
              <p className="text-xs sm:text-sm whitespace-pre-wrap break-words px-2 pt-1">{msg.body}</p>
            )}
          </div>
        )
      }
      // Se não tiver mediaUrl nem ID, mostra placeholder
      return <p className="text-xs sm:text-sm text-gray-500 italic">(imagem não disponível)</p>
    }

    // Se for áudio, sempre tenta mostrar player
    if (msg.type === 'audio') {
      // Normaliza o ID removendo prefixos true_/false_ antes de fazer requisição
      // Os IDs no banco não têm esses prefixos, mas podem vir do frontend com eles
      let normalizedMessageId = msg.id || ''
      if (normalizedMessageId.startsWith('true_') || normalizedMessageId.startsWith('false_')) {
        normalizedMessageId = normalizedMessageId.replace(/^(true|false)_/, '')
      }
      
      // Tenta usar mediaUrl direto, ou busca do endpoint
      let mediaUrl = msg.mediaUrl
      
      // Se mediaUrl for relativa (começa com /), converte para URL completa
      if (mediaUrl && mediaUrl.startsWith('/')) {
        let baseUrl = env.apiUrl
        if (baseUrl.endsWith('/api')) {
          baseUrl = baseUrl.slice(0, -4)
        }
        baseUrl = baseUrl.replace(/\/$/, '')
        mediaUrl = `${baseUrl}${mediaUrl}`
      }
      
      // Se não tiver mediaUrl mas tiver ID, constrói URL do endpoint
      // IMPORTANTE: Sempre tenta construir URL do endpoint se tiver ID, mesmo que tenha mediaUrl
      // Isso garante que mensagens recentes funcionem mesmo se mediaUrl não estiver disponível ainda
      if (!mediaUrl && normalizedMessageId) {
        let baseUrl = env.apiUrl
        if (baseUrl.endsWith('/api')) {
          baseUrl = baseUrl.slice(0, -4)
        }
        baseUrl = baseUrl.replace(/\/$/, '')
        if (!baseUrl || baseUrl === '') {
          baseUrl = 'http://localhost:3001'
        }
        mediaUrl = `${baseUrl}/api/whatsapp/media/${normalizedMessageId}`
      }
      
      // Se ainda não tem mediaUrl mas tem ID da mensagem, tenta usar o ID original
      if (!mediaUrl && msg.id) {
        let messageIdToUse = msg.id
        if (messageIdToUse.startsWith('true_') || messageIdToUse.startsWith('false_')) {
          messageIdToUse = messageIdToUse.replace(/^(true|false)_/, '')
        }
        let baseUrl = env.apiUrl
        if (baseUrl.endsWith('/api')) {
          baseUrl = baseUrl.slice(0, -4)
        }
        baseUrl = baseUrl.replace(/\/$/, '')
        if (!baseUrl || baseUrl === '') {
          baseUrl = 'http://localhost:3001'
        }
        mediaUrl = `${baseUrl}/api/whatsapp/media/${messageIdToUse}`
      }
      
      if (mediaUrl) {
        // Determina o tipo MIME correto
        const mimeType = msg.mediaMimetype || 'audio/ogg; codecs=opus'
        
        // Usa um hash estável baseado no ID da mensagem para cache-busting (não muda a cada renderização)
        // Isso evita requisições infinitas
        const messageIdHash = normalizedMessageId.split('').reduce((acc, char) => {
          return ((acc << 5) - acc) + char.charCodeAt(0) | 0;
        }, 0);
        const cacheBuster = `?v=${Math.abs(messageIdHash)}`
        const mediaUrlWithCache = mediaUrl.includes('?') ? `${mediaUrl.split('?')[0]}${cacheBuster}` : `${mediaUrl}${cacheBuster}`
        
        return (
          <div className="space-y-2">
            <audio 
              key={`audio-${normalizedMessageId}`}
              controls 
              className="w-full max-w-md min-w-[240px] sm:min-w-[280px]"
              preload="metadata"
              crossOrigin="anonymous"
              src={mediaUrlWithCache}
              onError={(e) => {
                const target = e.target as HTMLAudioElement
                
                // Verifica se já tentou carregar múltiplas vezes
                const errorKey = `audio-error-${normalizedMessageId}`
                const errorCount = parseInt(sessionStorage.getItem(`${errorKey}-count`) || '0', 10)
                
                // Se já tentou mais de 2 vezes, para de tentar
                if (errorCount >= 2) {
                  target.style.display = 'none'
                  if (!target.dataset.errorShown) {
                    target.dataset.errorShown = 'true'
                    const parent = target.parentElement
                    if (parent) {
                      const errorDiv = document.createElement('div')
                      errorDiv.className = 'space-y-2'
                      errorDiv.innerHTML = `
                        <p class="text-xs sm:text-sm text-red-600 mb-2">Áudio não disponível. A mídia pode não ter sido baixada quando a mensagem foi recebida.</p>
                      `
                      const button = document.createElement('button')
                      button.className = 'text-xs sm:text-sm text-blue-600 hover:text-blue-700 underline flex items-center space-x-2 px-3 py-2 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors cursor-pointer'
                      button.innerHTML = '<span>🎵</span><span>Tentar baixar áudio</span>'
                      button.onclick = async () => {
                        try {
                          const baseUrl = env.apiUrl.replace('/api', '')
                          const response = await fetch(`${baseUrl}/api/whatsapp/media/${normalizedMessageId}/force-redownload`, {
                            method: 'POST',
                            headers: {
                              'Authorization': `Bearer ${localStorage.getItem('sanare_token')}`,
                            },
                          })
                          
                          if (response.ok) {
                            sessionStorage.removeItem(errorKey)
                            sessionStorage.removeItem(`${errorKey}-count`)
                            window.dispatchEvent(new CustomEvent('reloadMessages', { detail: { messageId: normalizedMessageId } }))
                          } else {
                            const error = await response.json()
                            alert(`Erro ao baixar áudio: ${error.message || 'Mídia não disponível'}`)
                          }
                        } catch (error: any) {
                          console.error('Erro ao forçar re-download:', error)
                          alert('Erro ao baixar áudio. Tente novamente.')
                        }
                      }
                      errorDiv.appendChild(button)
                      parent.appendChild(errorDiv)
                    }
                  }
                  return
                }
                
                // Incrementa contador de erros
                sessionStorage.setItem(`${errorKey}-count`, String(errorCount + 1))
                sessionStorage.setItem(errorKey, 'true')
                
                console.error('❌ Erro ao carregar áudio:', {
                  error: e,
                  mediaUrl: mediaUrl?.substring(0, 80) + '...',
                  mimeType,
                  messageId: normalizedMessageId,
                  errorCount: errorCount + 1,
                  networkState: target.networkState,
                  readyState: target.readyState,
                  errorCode: target.error?.code,
                  errorMessage: target.error?.message
                })
                
                // Se falhar completamente, mostra mensagem de erro (apenas uma vez)
                if (!target.dataset.errorShown) {
                  target.dataset.errorShown = 'true'
                const parent = target.parentElement
                if (parent) {
                    // Esconde o player de áudio e mostra mensagem de erro
                    target.style.display = 'none'
                    const errorDiv = document.createElement('div')
                    errorDiv.className = 'space-y-2'
                    const baseUrl = env.apiUrl.replace('/api', '')
                    const button = document.createElement('button')
                    button.className = 'text-xs sm:text-sm text-blue-600 hover:text-blue-700 underline flex items-center space-x-2 px-3 py-2 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors cursor-pointer'
                    button.innerHTML = '<span>🎵</span><span>Tentar baixar áudio</span>'
                    button.onclick = async () => {
                      try {
                        const response = await fetch(`${baseUrl}/api/whatsapp/media/${msg.id}/force-redownload`, {
                          method: 'POST',
                          headers: {
                            'Authorization': `Bearer ${localStorage.getItem('token')}`,
                          },
                        })
                        
                        if (response.ok) {
                          const blob = await response.blob()
                          const url = window.URL.createObjectURL(blob)
                          const a = document.createElement('a')
                          a.href = url
                          a.download = `audio-${msg.id}.${blob.type.includes('ogg') ? 'ogg' : 'mp3'}`
                          document.body.appendChild(a)
                          a.click()
                          document.body.removeChild(a)
                          window.URL.revokeObjectURL(url)
                          
                          // Remove a marcação de erro do sessionStorage
                          if (msg.id) {
                            sessionStorage.removeItem(`audio-error-${msg.id}`)
                          }
                          
                          // Dispara evento customizado para recarregar mensagens
                          window.dispatchEvent(new CustomEvent('reloadMessages', { detail: { messageId: msg.id } }))
                        } else {
                          const error = await response.json()
                          alert(`Erro ao baixar áudio: ${error.message || 'Mídia não disponível'}`)
                        }
                      } catch (error: any) {
                        console.error('Erro ao forçar re-download:', error)
                        alert('Erro ao baixar áudio. Tente novamente.')
                      }
                    }
                    
                    errorDiv.innerHTML = `
                      <p class="text-xs sm:text-sm text-red-600 mb-2">Áudio não disponível. A mídia pode não ter sido baixada quando a mensagem foi recebida.</p>
                  `
                    errorDiv.appendChild(button)
                    parent.insertBefore(errorDiv, target)
                  }
                }
              }}
              onLoadStart={() => {
                // Log removido para reduzir poluição do console
              }}
              onCanPlay={() => {
                // Quando o áudio carrega com sucesso, limpa a marcação de erro
                if (msg.id) {
                  sessionStorage.removeItem(`audio-error-${msg.id}`)
                }
              }}
              onLoadedMetadata={() => {
                // Quando os metadados são carregados, também limpa a marcação de erro
                if (msg.id) {
                  sessionStorage.removeItem(`audio-error-${msg.id}`)
                }
              }}
              onStalled={(e) => {
                // Evita múltiplas tentativas simultâneas
                const target = e.target as HTMLAudioElement
                if (target.dataset.retrying === 'true') return
                target.dataset.retrying = 'true'
                setTimeout(() => {
                  if (target && target.readyState < HTMLMediaElement.HAVE_FUTURE_DATA) {
                    target.load()
                  }
                  target.dataset.retrying = 'false'
                }, 2000) // Aumenta o delay para evitar "piscamento"
              }}
            >
              <source src={mediaUrlWithCache} type={mimeType} />
              <source src={mediaUrlWithCache} type="audio/mpeg" />
              <source src={mediaUrlWithCache} type="audio/wav" />
              <source src={mediaUrlWithCache} type="audio/ogg; codecs=opus" />
              <source src={mediaUrlWithCache} type="audio/webm; codecs=opus" />
              <source src={mediaUrlWithCache} type="audio/ogg" />
              <source src={mediaUrlWithCache} type="audio/webm" />
              Seu navegador não suporta o elemento de áudio.
            </audio>
            {msg.body && (
              <p className="text-xs sm:text-sm whitespace-pre-wrap break-words">{msg.body}</p>
            )}
          </div>
        )
      }
      // Se não tiver mediaUrl nem ID, mostra link para baixar
      return (
        <div className="space-y-2">
          <p className="text-xs sm:text-sm text-gray-500 italic mb-2">Áudio não disponível ainda. Aguarde alguns segundos...</p>
          {msg.id && (
          <a 
              href={`${env.apiUrl.replace('/api', '')}/api/whatsapp/media/${msg.id}`}
            download
            className="text-xs sm:text-sm text-blue-600 hover:text-blue-700 underline flex items-center space-x-2 px-3 py-2 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
          >
            <span>🎵</span>
            <span>Baixar áudio</span>
          </a>
          )}
          {msg.body && (
            <p className="text-xs sm:text-sm whitespace-pre-wrap break-words">{msg.body}</p>
          )}
        </div>
      )
    }

    // Se for vídeo, sempre tenta mostrar player
    if (msg.type === 'video') {
      // Normaliza o ID da mensagem (remove prefixos true_/false_)
      let normalizedMessageId = msg.id || ''
      if (normalizedMessageId.startsWith('true_') || normalizedMessageId.startsWith('false_')) {
        normalizedMessageId = normalizedMessageId.replace(/^(true|false)_/, '')
      }
      
      // Tenta usar mediaUrl direto, ou busca do endpoint
      let mediaUrl = msg.mediaUrl
      
      // Se mediaUrl for relativa (começa com /), converte para URL completa
      if (mediaUrl && mediaUrl.startsWith('/')) {
        let baseUrl = env.apiUrl
        if (baseUrl.endsWith('/api')) {
          baseUrl = baseUrl.slice(0, -4)
        }
        baseUrl = baseUrl.replace(/\/$/, '')
        mediaUrl = `${baseUrl}${mediaUrl}`
      }
      
      // Se não tiver mediaUrl mas tiver ID, constrói URL do endpoint
      if (!mediaUrl && normalizedMessageId) {
        let baseUrl = env.apiUrl
        if (baseUrl.endsWith('/api')) {
          baseUrl = baseUrl.slice(0, -4)
        }
        baseUrl = baseUrl.replace(/\/$/, '')
        if (!baseUrl || baseUrl === '') {
          baseUrl = 'http://localhost:3001'
        }
        mediaUrl = `${baseUrl}/api/whatsapp/media/${normalizedMessageId}`
      }
      
      // Se ainda não tem mediaUrl mas tem ID da mensagem, tenta usar o ID original
      if (!mediaUrl && msg.id) {
        let messageIdToUse = msg.id
        if (messageIdToUse.startsWith('true_') || messageIdToUse.startsWith('false_')) {
          messageIdToUse = messageIdToUse.replace(/^(true|false)_/, '')
        }
        let baseUrl = env.apiUrl
        if (baseUrl.endsWith('/api')) {
          baseUrl = baseUrl.slice(0, -4)
        }
        baseUrl = baseUrl.replace(/\/$/, '')
        if (!baseUrl || baseUrl === '') {
          baseUrl = 'http://localhost:3001'
        }
        mediaUrl = `${baseUrl}/api/whatsapp/media/${messageIdToUse}`
      }
      
      if (mediaUrl) {
        // Determina o tipo MIME correto
        const mimeType = msg.mediaMimetype || 'video/mp4'
        
        // Usa um hash estável baseado no ID da mensagem para cache-busting
        const messageIdHash = normalizedMessageId.split('').reduce((acc, char) => {
          return ((acc << 5) - acc) + char.charCodeAt(0) | 0;
        }, 0);
        const cacheBuster = `?v=${Math.abs(messageIdHash)}`
        const mediaUrlWithCache = mediaUrl.includes('?') ? `${mediaUrl.split('?')[0]}${cacheBuster}` : `${mediaUrl}${cacheBuster}`
        
        return (
          <div className="space-y-2">
            <video 
              key={`video-${normalizedMessageId}`}
              controls 
              className="max-w-full rounded-lg"
              preload="metadata"
              crossOrigin="anonymous"
              onError={(e) => {
                const target = e.target as HTMLVideoElement
                const errorKey = `video-error-${normalizedMessageId}`
                const errorCount = parseInt(sessionStorage.getItem(`${errorKey}-count`) || '0', 10)
                
                // Se já tentou mais de 2 vezes, para de tentar
                if (errorCount >= 2) {
                  target.style.display = 'none'
                  if (!target.dataset.errorShown) {
                    target.dataset.errorShown = 'true'
                const parent = target.parentElement
                if (parent) {
                      const errorDiv = document.createElement('div')
                      errorDiv.className = 'space-y-2'
                      errorDiv.innerHTML = `
                        <p class="text-xs sm:text-sm text-red-600 mb-2">Vídeo não disponível. A mídia pode não ter sido baixada quando a mensagem foi recebida.</p>
                      `
                      const button = document.createElement('button')
                      button.className = 'text-xs sm:text-sm text-blue-600 hover:text-blue-700 underline flex items-center space-x-2 px-3 py-2 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors cursor-pointer'
                      button.innerHTML = '<span>🎬</span><span>Tentar baixar vídeo</span>'
                      button.onclick = async () => {
                        try {
                          const baseUrl = env.apiUrl.replace('/api', '')
                          const response = await fetch(`${baseUrl}/api/whatsapp/media/${normalizedMessageId}/force-redownload`, {
                            method: 'POST',
                            headers: {
                              'Authorization': `Bearer ${localStorage.getItem('sanare_token')}`,
                            },
                          })
                          
                          if (response.ok) {
                            sessionStorage.removeItem(errorKey)
                            sessionStorage.removeItem(`${errorKey}-count`)
                            window.dispatchEvent(new CustomEvent('reloadMessages', { detail: { messageId: normalizedMessageId } }))
                          } else {
                            const error = await response.json()
                            alert(`Erro ao baixar vídeo: ${error.message || 'Mídia não disponível'}`)
                          }
                        } catch (error: any) {
                          console.error('Erro ao forçar re-download:', error)
                          alert('Erro ao baixar vídeo. Tente novamente.')
                        }
                      }
                      errorDiv.appendChild(button)
                      parent.appendChild(errorDiv)
                    }
                  }
                  return
                }
                
                // Incrementa contador de erros
                sessionStorage.setItem(`${errorKey}-count`, String(errorCount + 1))
                sessionStorage.setItem(errorKey, 'true')
              }}
              onCanPlay={() => {
                // Quando o vídeo carrega com sucesso, limpa a marcação de erro
                if (normalizedMessageId) {
                  sessionStorage.removeItem(`video-error-${normalizedMessageId}`)
                  sessionStorage.removeItem(`video-error-${normalizedMessageId}-count`)
                }
              }}
              onLoadedMetadata={() => {
                // Quando os metadados são carregados, também limpa a marcação de erro
                if (normalizedMessageId) {
                  sessionStorage.removeItem(`video-error-${normalizedMessageId}`)
                  sessionStorage.removeItem(`video-error-${normalizedMessageId}-count`)
                }
              }}
            >
              <source src={mediaUrlWithCache} type={mimeType} />
              <source src={mediaUrlWithCache} type="video/mp4" />
              <source src={mediaUrlWithCache} type="video/webm" />
              <source src={mediaUrlWithCache} type="video/ogg" />
              <source src={mediaUrlWithCache} type="video/quicktime" />
              Seu navegador não suporta o elemento de vídeo.
            </video>
            {msg.body && (
              <p className="text-xs sm:text-sm whitespace-pre-wrap break-words">{msg.body}</p>
            )}
          </div>
        )
      }
      // Se não tiver mediaUrl nem ID, mostra link para baixar
      return (
        <div className="space-y-2">
          <a 
            href={msg.id ? `${env.apiUrl.replace('/api', '')}/api/whatsapp/media/${msg.id}` : '#'}
            download
            className="text-xs sm:text-sm text-blue-600 hover:text-blue-700 underline flex items-center space-x-2 px-3 py-2 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
          >
            <span>🎬</span>
            <span>Baixar vídeo</span>
          </a>
          {msg.body && (
            <p className="text-xs sm:text-sm whitespace-pre-wrap break-words">{msg.body}</p>
          )}
        </div>
      )
    }

    // Se for documento ou outro tipo de arquivo, sempre mostra link para download
    if (msg.type === 'document' || msg.type === 'other') {
      let mediaUrl = msg.mediaUrl
      
      // Se mediaUrl for relativa (começa com /), converte para URL completa
      if (mediaUrl && mediaUrl.startsWith('/')) {
        let baseUrl = env.apiUrl
        if (baseUrl.endsWith('/api')) {
          baseUrl = baseUrl.slice(0, -4)
        }
        baseUrl = baseUrl.replace(/\/$/, '')
        mediaUrl = `${baseUrl}${mediaUrl}`
      }
      
      // Se não tiver mediaUrl mas tiver ID, constrói URL do endpoint
      if (!mediaUrl && msg.id) {
        let baseUrl = env.apiUrl
        if (baseUrl.endsWith('/api')) {
          baseUrl = baseUrl.slice(0, -4)
        }
        baseUrl = baseUrl.replace(/\/$/, '')
        mediaUrl = `${baseUrl}/api/whatsapp/media/${msg.id}`
      }
      
      // Determina o nome do arquivo baseado no mimetype
      const getFileIcon = (mimetype?: string) => {
        if (!mimetype) return '📎'
        if (mimetype.includes('pdf')) return '📄'
        if (mimetype.includes('word') || mimetype.includes('document')) return '📝'
        if (mimetype.includes('excel') || mimetype.includes('spreadsheet')) return '📊'
        if (mimetype.includes('powerpoint') || mimetype.includes('presentation')) return '📽️'
        if (mimetype.includes('zip') || mimetype.includes('rar') || mimetype.includes('archive')) return '📦'
        return '📎'
      }

      const getFileName = (mimetype?: string) => {
        if (!mimetype) return 'arquivo'
        if (mimetype.includes('pdf')) return 'PDF'
        if (mimetype.includes('word') || mimetype.includes('document')) return 'Documento Word'
        if (mimetype.includes('excel') || mimetype.includes('spreadsheet')) return 'Planilha Excel'
        if (mimetype.includes('powerpoint') || mimetype.includes('presentation')) return 'Apresentação'
        if (mimetype.includes('zip') || mimetype.includes('rar')) return 'Arquivo compactado'
        return 'Arquivo'
      }
      
      if (mediaUrl || msg.id) {
        return (
          <div className="space-y-2">
            <a 
              href={mediaUrl || `${env.apiUrl.replace('/api', '')}/api/whatsapp/media/${msg.id}`}
              download
              className="text-xs sm:text-sm text-blue-600 hover:text-blue-700 underline flex items-center space-x-2 px-3 py-2 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <span className="text-lg">{getFileIcon(msg.mediaMimetype)}</span>
              <span className="font-medium">{getFileName(msg.mediaMimetype)}</span>
              <span className="text-gray-500">(clique para baixar)</span>
            </a>
            {msg.body && (
              <p className="text-xs sm:text-sm whitespace-pre-wrap break-words">{msg.body}</p>
            )}
          </div>
        )
      }
      // Se não tiver mediaUrl nem ID, mostra placeholder
      return (
        <div className="space-y-2">
          <p className="text-xs sm:text-sm text-gray-500 italic flex items-center space-x-2">
            <span>📎</span>
            <span>(arquivo não disponível)</span>
          </p>
          {msg.body && (
            <p className="text-xs sm:text-sm whitespace-pre-wrap break-words">{msg.body}</p>
          )}
        </div>
      )
    }

    // Para texto, verifica se contém base64 (imagem) antes de mostrar como texto
    if (msg.type === 'text') {
      const bodyTrimmed = (msg.body || '').trim()
      const isBase64Image = bodyTrimmed && (
        bodyTrimmed.startsWith('/9j/') || // JPEG
        bodyTrimmed.startsWith('iVBORw0KGgo') || // PNG
        bodyTrimmed.startsWith('data:image/') || // Data URL
        bodyTrimmed.startsWith('R0lGODlh') || // GIF
        (bodyTrimmed.length > 100 && /^[A-Za-z0-9+/=]+$/.test(bodyTrimmed.replace(/\s/g, ''))) // Base64 genérico
      )
      
      // Se for base64, renderiza como imagem
      if (isBase64Image) {
        let mediaUrl = bodyTrimmed
        if (!mediaUrl.startsWith('data:')) {
          let mimeType = 'image/jpeg'
          if (bodyTrimmed.startsWith('iVBORw0KGgo')) {
            mimeType = 'image/png'
          } else if (bodyTrimmed.startsWith('R0lGODlh')) {
            mimeType = 'image/gif'
          }
          mediaUrl = `data:${mimeType};base64,${bodyTrimmed}`
        }
        
        return (
          <div className="space-y-2">
            <img 
              src={mediaUrl} 
              alt="Imagem" 
              className="w-full max-w-[280px] sm:max-w-[320px] h-auto rounded-lg"
              onError={(e) => {
                // Se falhar, mostra como texto
                const target = e.target as HTMLImageElement
                const parent = target.parentElement
                if (parent) {
                  parent.innerHTML = '<p class="text-xs sm:text-sm p-3 text-gray-500">Erro ao carregar imagem</p>'
                }
              }}
            />
          </div>
        )
      }
      
      // Se não for base64, mostra como texto normal
      return <p className="text-xs sm:text-sm whitespace-pre-wrap break-words">{msg.body || ''}</p>
    }

    // Para qualquer outro tipo não identificado, tenta buscar como mídia
    const mediaUrl = msg.mediaUrl || (msg.id ? `${env.apiUrl.replace('/api', '')}/api/whatsapp/media/${msg.id}` : null)
    if (mediaUrl || msg.id) {
      return (
        <div className="space-y-2">
          <a 
            href={mediaUrl || `${env.apiUrl.replace('/api', '')}/api/whatsapp/media/${msg.id}`}
            download
            className="text-xs sm:text-sm text-blue-600 hover:text-blue-700 underline flex items-center space-x-2 px-3 py-2 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
          >
            <span>📎</span>
            <span>Baixar arquivo</span>
          </a>
          {msg.body && (
            <p className="text-xs sm:text-sm whitespace-pre-wrap break-words">{msg.body}</p>
          )}
        </div>
      )
    }

    // Fallback final
    return <p className="text-xs sm:text-sm whitespace-pre-wrap break-words">{msg.body || formatMessageBody(msg)}</p>
  }

  // Função para filtrar conversas por busca e tags
  const filterConversations = (conversations: Conversation[], search: string): Conversation[] => {
    return conversations.filter(conversation => {
      // Filtro de busca por texto
      if (search && search.trim()) {
        const searchLower = search.toLowerCase().trim()
        const normalizedSearch = searchLower.replace(/\D/g, '') // Remove caracteres não numéricos
        const normalizedPhone = conversation.phone.replace(/\D/g, '') // Remove caracteres não numéricos do telefone
        
        const matchesSearch = (
          // Busca por nome do contato
          (conversation.contactName || '').toLowerCase().includes(searchLower) ||
          // Busca por número normalizado (apenas dígitos)
          normalizedPhone.includes(normalizedSearch) ||
          // Busca por número formatado
          formatPhone(conversation.phone).toLowerCase().includes(searchLower) ||
          // Busca por número original (caso tenha @c.us ou outros sufixos)
          conversation.phone.toLowerCase().includes(searchLower) ||
          // Busca no conteúdo da última mensagem
          formatMessageBody(conversation.lastMessage).toLowerCase().includes(searchLower)
        )
        if (!matchesSearch) return false
      }
      
      // Filtro por tags
      const hasActiveFilters = selectedFilters.cliente || selectedFilters.farmaceutico || selectedFilters.assumida || selectedFilters.controlado
      
      if (!hasActiveFilters) return true // Se não há filtros ativos, mostra todas
      
      // Verifica se a conversa atende aos filtros selecionados
      const matchesCliente = !selectedFilters.cliente || !conversation.lastMessage.isFromMe
      const matchesFarmaceutico = !selectedFilters.farmaceutico || conversation.needsPharmacist
      const matchesAssumida = !selectedFilters.assumida || conversation.isAssumed
      const matchesControlado = !selectedFilters.controlado || conversation.awaitingControlledConfirmation
      
      return matchesCliente && matchesFarmaceutico && matchesAssumida && matchesControlado
    })
  }

  const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return 'Agora'
    if (minutes < 60) return `${minutes}m atrás`
    if (hours < 24) return `${hours}h atrás`
    if (days < 7) return `${days}d atrás`
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
  }

  const handleRegenerateQR = async () => {
    try {
      setRegenerating(true)
      setQrCode(null)
      const response = await whatsappService.regenerateQRCode()
      setStatus(response)
      if (response.qrCode) {
        setQrCode(response.qrCode)
      }
    } catch (error: any) {
      setMessageStatus({ type: 'error', message: error.message || 'Erro ao regenerar QR Code' })
    } finally {
      setRegenerating(false)
    }
  }

  const handleDisconnect = async () => {
    try {
      setDisconnecting(true)
      await whatsappService.disconnect()
      
      setStatus({
        success: true,
        status: 'DISCONNECTED',
        connected: false,
        message: 'WhatsApp desconectado. Sessão removida completamente.',
      })
      setQrCode(null)
      setConversations([])
      setMessages([])
      setSelectedConversation(null)
      setShowDisconnectModal(false)
      setShowFinalConfirm(false)
      setMessageStatus({ type: 'success', message: 'WhatsApp desconectado e sessão removida com sucesso' })
      
      setTimeout(() => {
        checkStatus()
      }, 1000)
    } catch (error: any) {
      setStatus({
        success: false,
        status: 'DISCONNECTED',
        connected: false,
        message: 'WhatsApp desconectado',
      })
      setQrCode(null)
      setMessageStatus({ type: 'error', message: error.message || 'Erro ao desconectar WhatsApp' })
    } finally {
      setDisconnecting(false)
    }
  }

  const handleSendTest = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!testMessage.phone || !testMessage.message) {
      setMessageStatus({ type: 'error', message: 'Preencha todos os campos' })
      return
    }

    setSending(true)
    setMessageStatus({ type: null, message: '' })

    try {
      await whatsappService.sendMessage(testMessage.phone, testMessage.message)
      setMessageStatus({ type: 'success', message: 'Mensagem enviada com sucesso!' })
      setTestMessage({ phone: '', message: '' })
      // Recarrega conversas após enviar
      setTimeout(() => {
        loadConversations()
        if (selectedConversation) {
          loadMessages(selectedConversation)
        }
      }, 500)
    } catch (error: any) {
      setMessageStatus({ type: 'error', message: error.message || 'Erro ao enviar mensagem' })
    } finally {
      setSending(false)
    }
  }

  const handleTestAI = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!testAIMessage.trim() || testingAI) return

    const userMessage = testAIMessage.trim()
    setTestAIMessage('')
    setTestingAI(true)
    setMessageStatus({ type: null, message: '' })

    // Adiciona mensagem do usuário ao histórico
    const userMessageEntry = {
      role: 'user' as const,
      content: userMessage,
      timestamp: Date.now(),
    }
    setTestAIChatHistory(prev => [...prev, userMessageEntry])

    try {
      setProcessingStatus('🔍 Extraindo informações da mensagem...')
      
      // Prepara histórico para enviar (apenas role e content)
      // Envia apenas as últimas 5 mensagens (total, não 5 de cada tipo)
      const historyForAPI = testAIChatHistory
        .slice(-5)
        .map(msg => ({
          role: msg.role,
          content: msg.content,
          timestamp: msg.timestamp,
        }))

      setProcessingStatus('🤖 Gerando resposta da IA...')
      // Usa o telefone fornecido ou TEST_PHONE como padrão (para consistência com o backend)
      const phoneToUse = testAIPhone.trim() || 'TEST_PHONE'
      const result = await whatsappService.testAI(userMessage, phoneToUse, historyForAPI)
      const aiData = result.data

      setProcessingStatus('✅ Processamento concluído!')

      // Determina a resposta da IA
      let aiResponseContent = aiData.aiResponse || ''
      
      // Se for medicamento controlado, usa a mensagem apropriada
      if (aiData.isControlled) {
        if (aiData.needsPharmacist && aiData.confirmationMessage) {
          aiResponseContent = aiData.confirmationMessage
        } else if (aiData.infoMessage) {
          aiResponseContent = aiData.infoMessage
        }
      }

      // Adiciona resposta da IA ao histórico com todos os dados
      const aiMessageEntry = {
        role: 'assistant' as const,
        content: aiResponseContent || 'Nenhuma resposta gerada',
        timestamp: Date.now(),
        metadata: {
          isControlled: aiData.isControlled,
          controlledSubstance: aiData.controlledSubstance,
          needsPharmacist: aiData.needsPharmacist,
          infoMessage: aiData.infoMessage,
          confirmationMessage: aiData.confirmationMessage,
          extractedMessage: aiData.extractedMessage,
          processingDetails: aiData.processingDetails,
          purchaseLink: (aiData as any).purchaseLink,
          cartInfo: (aiData as any).cartInfo,
        },
      }
      const messageIndex = testAIChatHistory.length // Índice da mensagem que será adicionada
      setTestAIChatHistory(prev => [...prev, aiMessageEntry])
      
      // Se for medicamento controlado confirmado (needsPharmacist && confirmationMessage), mostra modal de confirmação
      if (aiData.needsPharmacist && aiData.confirmationMessage && aiData.controlledSubstance) {
        // Busca a mensagem original que iniciou o processo (não a confirmação)
        // Procura no histórico a mensagem do usuário que mencionou o medicamento
        let originalMessage = userMessage;
        const history = testAIChatHistory;
        if (history.length > 0) {
          // Procura a última mensagem do usuário antes da resposta da IA sobre medicamento controlado
          for (let i = history.length - 1; i >= 0; i--) {
            const msg = history[i];
            if (msg.role === 'user' && msg.content && msg.content.length > 10) {
              // Verifica se não é uma confirmação
              const confirmationKeywords = ['sim', 'quero', 'prosseguir', 'prossiga', 'chamar', 'chame', 
                'farmacêutico', 'farmaceutico', 'ok', 'okay', 'pode', 'confirmo', 'confirmar', 
                'aceito', 'aceitar', 'vamos', 'pode chamar', 'quero sim'];
              const isConfirmation = confirmationKeywords.some(keyword => 
                msg.content.toLowerCase().trim() === keyword || 
                msg.content.toLowerCase().trim().startsWith(keyword + ' ')
              );
              if (!isConfirmation) {
                originalMessage = msg.content;
                break;
              }
            }
          }
        }
        
        setPendingPharmacistNotification({
          phone: phoneToUse || 'TEST_PHONE',
          message: userMessage, // Mensagem de confirmação atual
          originalMessage: originalMessage, // Mensagem original que iniciou o processo
          controlledSubstance: aiData.controlledSubstance,
          extractedMessage: aiData.extractedMessage,
          messageIndex,
        })
        setShowPharmacistConfirmation(true)
      } else {
        setMessageStatus({ type: 'success', message: 'Mensagem processada!' })
        setTimeout(() => {
          setProcessingStatus('')
        }, 500)
      }
    } catch (error: any) {
      setMessageStatus({ type: 'error', message: error.message || 'Erro ao testar IA' })
      setProcessingStatus('')
      // Adiciona mensagem de erro ao histórico
      const errorMessageEntry = {
        role: 'assistant' as const,
        content: `❌ Erro: ${error.message || 'Erro ao processar mensagem'}`,
        timestamp: Date.now(),
      }
      setTestAIChatHistory(prev => [...prev, errorMessageEntry])
    } finally {
      setTestingAI(false)
      setTimeout(() => {
        setProcessingStatus('')
      }, 500)
    }
  }

  // Função para confirmar e notificar o farmacêutico
  const handleConfirmPharmacistNotification = async () => {
    if (!pendingPharmacistNotification) return

    try {
      setProcessingStatus('📤 Enviando notificação para farmacêutico...')
      const result = await whatsappService.testNotifyPharmacist(
        pendingPharmacistNotification.phone,
        pendingPharmacistNotification.message,
        pendingPharmacistNotification.controlledSubstance,
        pendingPharmacistNotification.extractedMessage
      )

      if (result.success) {
        // Atualiza a mensagem no histórico para indicar que foi notificado
        setTestAIChatHistory(prev => {
          const updated = [...prev]
          if (updated[pendingPharmacistNotification.messageIndex]) {
            updated[pendingPharmacistNotification.messageIndex] = {
              ...updated[pendingPharmacistNotification.messageIndex],
              metadata: {
                ...updated[pendingPharmacistNotification.messageIndex].metadata,
                pharmacistNotified: true,
                notifiedNumbers: result.notifiedNumbers,
              },
            }
          }
          return updated
        })
        setMessageStatus({ type: 'success', message: result.message })
      } else {
        setMessageStatus({ type: 'error', message: result.message })
      }
    } catch (error: any) {
      setMessageStatus({ type: 'error', message: error.message || 'Erro ao notificar farmacêutico' })
    } finally {
      setShowPharmacistConfirmation(false)
      setPendingPharmacistNotification(null)
      setProcessingStatus('')
    }
  }

  const handleClearTestChat = async () => {
    if (confirm('Deseja limpar o histórico do chat de teste? Isso irá limpar o carrinho, contexto e todas as informações - simulando um cliente totalmente novo.')) {
      // Guarda o telefone ANTES de limpar qualquer coisa
      const phoneToReset = testAIPhone.trim() || 'TEST_PHONE'
      console.log('🧹 [CLEAR_CHAT] Iniciando limpeza para telefone:', phoneToReset)
      
      // PRIMEIRO: Reseta a sessão no backend ANTES de limpar os estados do frontend
      // Isso garante que o telefone ainda está disponível quando fazemos o reset
      try {
        setProcessingStatus('🧹 Limpando sessão no servidor...')
        
        // Reseta o telefone usado (ou TEST_PHONE se não tinha)
        console.log('🧹 [CLEAR_CHAT] Resetando telefone:', phoneToReset)
        const result1 = await whatsappService.resetTestSession(phoneToReset)
        console.log('✅ [CLEAR_CHAT] Sessão resetada para', phoneToReset, ':', result1)
        
        // SEMPRE também limpa o TEST_PHONE para garantir (mesmo que seja o mesmo)
        // Isso garante que se o telefone mudou ou houve alguma inconsistência, tudo será limpo
        console.log('🧹 [CLEAR_CHAT] Resetando também TEST_PHONE')
        const result2 = await whatsappService.resetTestSession('TEST_PHONE')
        console.log('✅ [CLEAR_CHAT] Sessão TEST_PHONE também resetada:', result2)
        
        // Aguarda um pouco para garantir que o banco processou tudo
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        console.log('✅ [CLEAR_CHAT] Limpeza do backend concluída')
      } catch (error) {
        console.error('❌ [CLEAR_CHAT] Erro ao resetar sessão no servidor:', error)
        setProcessingStatus('❌ Erro ao limpar. Tente novamente.')
        setTimeout(() => {
          setProcessingStatus('')
        }, 3000)
        return // Para aqui se deu erro
      }
      
      // SEGUNDO: Limpa estados do frontend APÓS o backend estar limpo
      console.log('🧹 [CLEAR_CHAT] Limpando estados do frontend')
      setTestAIChatHistory([])
      setTestAIMessage('')
      setMessageStatus({ type: null, message: '' })
      setSelectedMessageForDetails(null)
      
      // Remove do localStorage
      try {
        localStorage.removeItem(TEST_CHAT_STORAGE_KEY)
        localStorage.removeItem(TEST_PHONE_STORAGE_KEY)
        console.log('✅ [CLEAR_CHAT] LocalStorage limpo')
      } catch (error) {
        console.error('❌ [CLEAR_CHAT] Erro ao limpar histórico do localStorage:', error)
      }
      
      // Limpa o telefone por último
      setTestAIPhone('')
      console.log('✅ [CLEAR_CHAT] Telefone limpo do estado')
      
      setProcessingStatus('✅ Chat limpo com sucesso!')
      
      // Limpa o status após 2 segundos
      setTimeout(() => {
        setProcessingStatus('')
      }, 2000)
    }
  }

  // Scroll automático para última mensagem no chat de teste
  useEffect(() => {
    if (testChatContainerRef.current && testAIChatHistory.length > 0) {
      testChatContainerRef.current.scrollTop = testChatContainerRef.current.scrollHeight
    }
  }, [testAIChatHistory])

  const handleSendConversationMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedConversation || (!conversationMessage.trim() && !selectedFile)) {
      return
    }

    setSendingConversationMessage(true)

    try {
      // Se houver arquivo selecionado, envia mídia
      if (selectedFile) {
        const fileType = selectedFile.type
        let mediaType: 'image' | 'video' | 'audio' | 'document' = 'document'
        
        if (fileType.startsWith('image/')) {
          mediaType = 'image'
        } else if (fileType.startsWith('video/')) {
          mediaType = 'video'
        } else if (fileType.startsWith('audio/')) {
          mediaType = 'audio'
        }

        // Converte arquivo para base64
        const reader = new FileReader()
        reader.onloadend = async () => {
          try {
            const base64 = reader.result as string
            await whatsappService.sendMedia(
              selectedConversation,
              base64,
              mediaType,
              conversationMessage.trim() || undefined,
              selectedFile.name
            )
            setConversationMessage('')
            setSelectedFile(null)
            setFilePreview(null)
            if (fileInputRef.current) {
              fileInputRef.current.value = ''
            }
            // Recarrega as mensagens e conversas após enviar
            await loadMessages(selectedConversation)
            loadConversations()
            // Scroll instantâneo para o final após enviar
            if (messagesContainerRef.current) {
              messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight
            }
          } catch (error: any) {
            setMessageStatus({ type: 'error', message: error.message || 'Erro ao enviar mídia' })
          } finally {
            setSendingConversationMessage(false)
          }
        }
        reader.readAsDataURL(selectedFile)
        return
      }

      // Se não houver arquivo, envia mensagem de texto normal
      await whatsappService.sendMessage(selectedConversation, conversationMessage.trim())
      setConversationMessage('')
      // Recarrega as mensagens e conversas após enviar
      await loadMessages(selectedConversation)
      loadConversations()
      // Scroll instantâneo para o final após enviar
      if (messagesContainerRef.current) {
        messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight
      }
    } catch (error: any) {
      setMessageStatus({ type: 'error', message: error.message || 'Erro ao enviar mensagem' })
    } finally {
      setSendingConversationMessage(false)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      // Cria preview para imagens
      if (file.type.startsWith('image/')) {
        const reader = new FileReader()
        reader.onloadend = () => {
          setFilePreview(reader.result as string)
        }
        reader.readAsDataURL(file)
      } else {
        setFilePreview(null)
      }
    }
  }

  const removeFile = () => {
    setSelectedFile(null)
    setFilePreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // Funções para gerenciar números de farmacêuticos
  const loadPharmacistNumbers = async () => {
    setLoadingPharmacistNumbers(true)
    try {
      const numbers = await whatsappService.getPharmacistNumbers()
      setPharmacistNumbers(numbers)
    } catch (error: any) {
      console.error('Erro ao carregar números de farmacêuticos:', error)
      alert('Erro ao carregar números de farmacêuticos: ' + error.message)
    } finally {
      setLoadingPharmacistNumbers(false)
    }
  }

  const loadUsersWithPhone = async () => {
    setLoadingUsers(true)
    try {
      const users = await whatsappService.getUsersWithPhone()
      setUsersWithPhone(users)
    } catch (error: any) {
      console.error('Erro ao carregar usuários:', error)
    } finally {
      setLoadingUsers(false)
    }
  }

  const handleOpenAddPharmacistModal = async () => {
    setShowAddPharmacistModal(true)
    setNewPharmacistPhone('')
    setNewPharmacistUserId(null)
    setNewPharmacistName('')
    await loadUsersWithPhone()
  }

  const handleAddPharmacist = async () => {
    if (!newPharmacistPhone.trim() && !newPharmacistUserId) {
      alert('Por favor, selecione um usuário ou digite um número de telefone')
      return
    }

    setAddingPharmacist(true)
    try {
      await whatsappService.addPharmacistNumber(
        newPharmacistPhone.trim(),
        newPharmacistUserId || undefined,
        newPharmacistName.trim() || undefined
      )
      await loadPharmacistNumbers()
      setShowAddPharmacistModal(false)
      setNewPharmacistPhone('')
      setNewPharmacistUserId(null)
      setNewPharmacistName('')
    } catch (error: any) {
      alert('Erro ao adicionar número: ' + error.message)
    } finally {
      setAddingPharmacist(false)
    }
  }

  const handleRemovePharmacist = async (id: string) => {
    if (!confirm('Tem certeza que deseja remover este número?')) {
      return
    }

    try {
      await whatsappService.removePharmacistNumber(id)
      await loadPharmacistNumbers()
    } catch (error: any) {
      alert('Erro ao remover número: ' + error.message)
    }
  }

  const handleUserSelect = (userId: string) => {
    const user = usersWithPhone.find(u => u.id === userId)
    if (user) {
      setNewPharmacistUserId(userId)
      setNewPharmacistPhone(user.phone)
      setNewPharmacistName(user.name)
    }
  }

  // Carrega números de farmacêuticos quando o painel é aberto
  useEffect(() => {
    if (showPharmacistConfig) {
      loadPharmacistNumbers()
    }
  }, [showPharmacistConfig])

  // Funções para gerenciar números da distribuidora
  const loadDistributorNumbers = async () => {
    setLoadingDistributorNumbers(true)
    try {
      const numbers = await whatsappService.getDistributorNumbers()
      setDistributorNumbers(numbers)
    } catch (error: any) {
      console.error('Erro ao carregar números da distribuidora:', error)
      alert('Erro ao carregar números da distribuidora: ' + error.message)
    } finally {
      setLoadingDistributorNumbers(false)
    }
  }

  const handleOpenAddDistributorModal = async () => {
    setShowAddDistributorModal(true)
    setNewDistributorPhone('')
    setNewDistributorUserId(null)
    setNewDistributorName('')
    await loadUsersWithPhone()
  }

  const handleAddDistributor = async () => {
    if (!newDistributorPhone.trim() && !newDistributorUserId) {
      alert('Por favor, selecione um usuário ou digite um número de telefone')
      return
    }

    setAddingDistributor(true)
    try {
      await whatsappService.addDistributorNumber(
        newDistributorPhone.trim(),
        newDistributorUserId || undefined,
        newDistributorName.trim() || undefined
      )
      await loadDistributorNumbers()
      setShowAddDistributorModal(false)
      setNewDistributorPhone('')
      setNewDistributorUserId(null)
      setNewDistributorName('')
    } catch (error: any) {
      alert('Erro ao adicionar número: ' + error.message)
    } finally {
      setAddingDistributor(false)
    }
  }

  const handleRemoveDistributor = async (id: string) => {
    if (!confirm('Tem certeza que deseja remover este número?')) {
      return
    }

    try {
      await whatsappService.removeDistributorNumber(id)
      await loadDistributorNumbers()
    } catch (error: any) {
      alert('Erro ao remover número: ' + error.message)
    }
  }

  const handleDistributorUserSelect = (userId: string) => {
    const user = usersWithPhone.find(u => u.id === userId)
    if (user) {
      setNewDistributorUserId(userId)
      setNewDistributorPhone(user.phone)
      setNewDistributorName(user.name)
    }
  }

  // Carrega números da distribuidora quando o painel é aberto
  useEffect(() => {
    if (showDistributorConfig) {
      loadDistributorNumbers()
    }
  }, [showDistributorConfig])

  return (
    <>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-3 sm:py-4 lg:py-6 xl:py-8">
        {/* Header */}
        <div className="mb-4 sm:mb-6 lg:mb-8">
          <button
            onClick={() => navigate('/admin')}
            className="flex items-center text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white mb-3 sm:mb-4 text-sm sm:text-base"
          >
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2" />
            Voltar ao painel
          </button>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">Conexão WhatsApp</h1>
          <p className="mt-1 sm:mt-2 text-xs sm:text-sm lg:text-base text-gray-600 dark:text-gray-300">Conecte seu WhatsApp para enviar e receber mensagens</p>
        </div>

        {/* Status Card */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-lg p-3 sm:p-4 lg:p-6 mb-4 sm:mb-6 border border-gray-200 dark:border-gray-700">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 sm:mb-4 gap-2 sm:gap-3">
            <h2 className="text-base sm:text-lg lg:text-xl font-semibold text-gray-900 dark:text-white">Status da Conexão</h2>
            <button
              onClick={checkStatus}
              disabled={loading || initializing}
              className="flex items-center justify-center text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 disabled:opacity-50 text-xs sm:text-sm lg:text-base"
            >
              <RefreshCw className={`w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-5 lg:h-5 mr-1.5 sm:mr-2 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </button>
          </div>

          {loading && !status ? (
            <div className="flex items-center justify-center py-6 sm:py-8">
              <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 animate-spin text-blue-600 dark:text-blue-400" />
              <p className="ml-2 sm:ml-3 text-gray-600 dark:text-gray-300 text-xs sm:text-sm lg:text-base">Carregando...</p>
            </div>
          ) : initializing ? (
            <div className="flex items-center justify-center py-6 sm:py-8">
              <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 animate-spin text-blue-600 dark:text-blue-400" />
              <p className="ml-2 sm:ml-3 text-gray-600 dark:text-gray-300 text-xs sm:text-sm lg:text-base">Inicializando WhatsApp... Aguarde alguns segundos</p>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
              <div className="flex items-center space-x-2 sm:space-x-3 lg:space-x-4">
                {status?.status === 'CONNECTED' || status?.connected ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-green-600 dark:text-green-400 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm sm:text-base lg:text-lg font-medium text-green-600 dark:text-green-400">Conectado</p>
                      <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 break-words">{status.message}</p>
                    </div>
                  </>
                ) : status?.status === 'CONNECTING' ? (
                  <>
                    <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 animate-spin text-blue-600 dark:text-blue-400 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm sm:text-base lg:text-lg font-medium text-blue-600 dark:text-blue-400">Conectando...</p>
                      <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 break-words">{status.message}</p>
                    </div>
                  </>
                ) : status?.status === 'QRCODE_GENERATED' ? (
                  <>
                    <QrCode className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm sm:text-base lg:text-lg font-medium text-yellow-600 dark:text-yellow-400">QR Code Disponível</p>
                      <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 break-words">{status.message}</p>
                    </div>
                  </>
                ) : (
                  <>
                    <XCircle className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-red-600 dark:text-red-400 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm sm:text-base lg:text-lg font-medium text-red-600 dark:text-red-400">Desconectado</p>
                      <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 break-words">{status?.message || 'Clique no botão abaixo para conectar seu WhatsApp'}</p>
                    </div>
                  </>
                )}
              </div>
              {status?.status === 'CONNECTED' || status?.connected ? (
                <button
                  onClick={() => setShowDisconnectModal(true)}
                  className="flex items-center justify-center px-2.5 sm:px-3 lg:px-4 py-1.5 sm:py-2 text-xs sm:text-sm lg:text-base text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors w-full sm:w-auto mt-2 sm:mt-0"
                >
                  <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-5 lg:h-5 mr-1.5 sm:mr-2" />
                  Desconectar
                </button>
              ) : (
                // Mostra botão de conectar quando desconectado (sem QR Code em processo)
                (!qrCode && status?.status !== 'QRCODE_GENERATED' && status?.status !== 'CONNECTING') && (
                  <button
                    onClick={initializeWhatsApp}
                    disabled={initializing}
                    className="flex items-center justify-center px-2.5 sm:px-3 lg:px-4 py-1.5 sm:py-2 text-xs sm:text-sm lg:text-base bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors w-full sm:w-auto mt-2 sm:mt-0"
                  >
                    {initializing ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-5 lg:h-5 mr-1.5 sm:mr-2 animate-spin" />
                        Conectando...
                      </>
                    ) : (
                      <>
                        <Phone className="w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-5 lg:h-5 mr-1.5 sm:mr-2" />
                        Conectar WhatsApp
                      </>
                    )}
                  </button>
                )
              )}
            </div>
          )}
        </div>

        {/* QR Code Card - Mostra apenas quando há QR Code ou está gerando */}
        {!status?.connected && (qrCode || status?.status === 'QRCODE_GENERATED' || status?.status === 'CONNECTING') && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-lg p-3 sm:p-4 lg:p-6 mb-4 sm:mb-6 border border-gray-200 dark:border-gray-700">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 sm:mb-4 gap-2 sm:gap-3">
              <h2 className="text-base sm:text-lg lg:text-xl font-semibold text-gray-900 dark:text-white">QR Code para Conectar</h2>
              <button
                onClick={handleRegenerateQR}
                disabled={regenerating || initializing}
                className="flex items-center justify-center text-xs sm:text-sm lg:text-base text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 disabled:opacity-50"
              >
                {regenerating ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-5 lg:h-5 mr-1.5 sm:mr-2 animate-spin" />
                    Regenerando...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-5 lg:h-5 mr-1.5 sm:mr-2" />
                    Regenerar QR Code
                  </>
                )}
              </button>
            </div>
            <div className="flex flex-col items-center">
              {qrCode ? (
                <>
                  <div className="bg-white dark:bg-white p-2 sm:p-3 lg:p-4 rounded-lg border-2 border-gray-200 dark:border-gray-300 mb-3 sm:mb-4">
                    <img 
                      src={qrCode} 
                      alt="QR Code WhatsApp" 
                      className="w-40 h-40 sm:w-48 sm:h-48 lg:w-64 lg:h-64"
                    />
                  </div>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 text-center max-w-md px-2">
                    Abra o WhatsApp no seu celular, vá em Configurações → Aparelhos conectados → Conectar um aparelho
                    e escaneie este código
                  </p>
                </>
              ) : (
                <div className="flex flex-col items-center py-6 sm:py-8">
                  <Loader2 className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 animate-spin text-blue-600 dark:text-blue-400 mb-3 sm:mb-4" />
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 text-center px-3 sm:px-4">
                    {regenerating ? 'Regenerando QR Code...' : status?.status === 'QRCODE_GENERATED' ? 'QR Code disponível, carregando...' : 'Gerando QR Code... Aguarde'}
                  </p>
                  {status?.status === 'QRCODE_GENERATED' && !qrCode && (
                    <button
                      onClick={checkStatus}
                      className="mt-3 sm:mt-4 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                    >
                      Atualizar QR Code
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Modal de Confirmação de Desconexão */}
        {showDisconnectModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full border border-gray-200 dark:border-gray-700">
              <div className="p-3 sm:p-4 lg:p-6">
                {!showFinalConfirm ? (
                  <>
                    <div className="flex items-center mb-3 sm:mb-4">
                      <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-600 dark:text-yellow-400 mr-1.5 sm:mr-2" />
                      <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">Desconectar WhatsApp?</h3>
                    </div>
                    <p className="text-xs sm:text-sm lg:text-base text-gray-600 dark:text-gray-300 mb-4 sm:mb-6">
                      Você está prestes a desconectar o WhatsApp. Esta ação irá remover a sessão atual e você precisará escanear o QR Code novamente para reconectar.
                    </p>
                    <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
                      <button
                        onClick={() => setShowDisconnectModal(false)}
                        className="flex-1 px-3 sm:px-4 py-2 text-xs sm:text-sm lg:text-base border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-white rounded-lg hover:bg-gray-50 dark:hover:bg-[#065084] transition-colors"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={() => setShowFinalConfirm(true)}
                        className="flex-1 px-3 sm:px-4 py-2 text-xs sm:text-sm lg:text-base bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
                      >
                        Continuar
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center mb-3 sm:mb-4">
                      <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-red-600 dark:text-red-400 mr-1.5 sm:mr-2" />
                      <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">Confirmação Final</h3>
                    </div>
                    <p className="text-xs sm:text-sm lg:text-base text-gray-600 dark:text-gray-300 mb-4 sm:mb-6">
                      <strong>ATENÇÃO:</strong> Esta ação é irreversível. A sessão será completamente removida e você precisará escanear um novo QR Code para reconectar.
                    </p>
                    <p className="text-xs sm:text-sm text-red-600 dark:text-red-400 mb-4 sm:mb-6 font-medium">
                      Tem certeza que deseja desconectar e remover a sessão?
                    </p>
                    <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
                      <button
                        onClick={() => {
                          setShowFinalConfirm(false)
                          setShowDisconnectModal(false)
                        }}
                        className="flex-1 px-3 sm:px-4 py-2 text-xs sm:text-sm lg:text-base border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-white rounded-lg hover:bg-gray-50 dark:hover:bg-[#065084] transition-colors"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={handleDisconnect}
                        disabled={disconnecting}
                        className="flex-1 px-3 sm:px-4 py-2 text-xs sm:text-sm lg:text-base bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                      >
                        {disconnecting ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-5 lg:h-5 mr-1.5 sm:mr-2 animate-spin" />
                            Desconectando...
                          </>
                        ) : (
                          <>
                            <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-5 lg:h-5 mr-1.5 sm:mr-2" />
                            Sim, Desconectar
                          </>
                        )}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Test Message e Conversas */}
        {status?.connected && (
          <div className="space-y-3 sm:space-y-4 lg:space-y-6">
            {/* Painel de Teste de IA */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-lg p-3 sm:p-4 lg:p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <h2 className="text-base sm:text-lg lg:text-xl font-semibold text-gray-900 dark:text-white flex items-center">
                  <AlertTriangle className="w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-5 lg:h-5 mr-1.5 sm:mr-2 text-yellow-600 dark:text-yellow-400" />
                  Teste de IA
                </h2>
                <button
                  onClick={() => setShowTestPanel(!showTestPanel)}
                  className="text-xs sm:text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
                >
                  {showTestPanel ? 'Ocultar' : 'Mostrar'}
                </button>
              </div>
              
              {showTestPanel && (
                <div className="flex flex-col" style={{ height: '500px', maxHeight: '70vh' }}>
                  {/* Configuração do Telefone de Teste */}
                  <div className="mb-2 sm:mb-3 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                    <label className="block text-xs font-medium text-gray-700 dark:text-white mb-1">
                      Telefone de Teste (opcional)
                    </label>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                      <input
                        type="text"
                        value={testAIPhone}
                        onChange={(e) => setTestAIPhone(e.target.value)}
                        placeholder="TEST_PHONE (padrão)"
                        className="flex-1 text-xs sm:text-sm px-2 sm:px-3 py-1.5 border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                      {testAIPhone && (
                        <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                          Usando: {testAIPhone}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      Deixe vazio para usar "TEST_PHONE" como padrão. O telefone define qual carrinho será usado.
                    </p>
                  </div>

                  {/* Header do Chat */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-2 sm:pb-3 border-b gap-2 sm:gap-0">
                    <div className="flex items-center space-x-2">
                      <div className="w-7 h-7 sm:w-8 sm:h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
                      </div>
                      <div>
                        <h3 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white">Chat de Teste - IA</h3>
                        <p className="text-xs text-gray-500">Teste como se fosse um cliente</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1.5 sm:space-x-2 flex-wrap gap-1.5 sm:gap-0">
                      {/* Carrinho Atual */}
                      {(() => {
                        // Busca o último cartInfo do histórico
                        const lastCartInfo = [...testAIChatHistory].reverse().find(msg => msg.metadata?.cartInfo)?.metadata?.cartInfo
                        if (lastCartInfo && lastCartInfo.itemCount > 0) {
                          return (
                            <div className="flex items-center space-x-1 sm:space-x-2 bg-orange-50 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg border border-orange-200">
                              <span className="text-orange-600 text-sm sm:text-base">🛒</span>
                              <div className="text-xs">
                                <span className="font-medium text-orange-800">{lastCartInfo.itemCount} item(ns)</span>
                                <span className="text-orange-600 ml-1 sm:ml-2">R$ {lastCartInfo.total.toFixed(2)}</span>
                              </div>
                            </div>
                          )
                        }
                        return null
                      })()}
                      {testAIChatHistory.length > 0 && (
                        <button
                          onClick={handleClearTestChat}
                          className="flex items-center space-x-1 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 px-1.5 sm:px-2 py-1 sm:py-1.5 rounded transition-colors"
                          title="Limpar todo o histórico do chat"
                        >
                          <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          <span className="hidden sm:inline">Limpar Chat</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Área de Mensagens */}
                  <div
                    ref={testChatContainerRef}
                    className="flex-1 overflow-y-auto p-2 sm:p-3 lg:p-4 space-y-3 sm:space-y-4 bg-gray-50 dark:bg-gray-800"
                    style={{ minHeight: 0 }}
                  >
                    {testAIChatHistory.length === 0 ? (
                      <div className="flex items-center justify-center h-full text-center">
                        <div>
                          <MessageSquare className="w-10 h-10 sm:w-12 sm:h-12 text-gray-300 mx-auto mb-2" />
                          <p className="text-gray-500 text-xs sm:text-sm">Nenhuma mensagem ainda</p>
                          <p className="text-gray-400 text-xs mt-1">
                            Digite uma mensagem abaixo para começar o teste
                          </p>
                        </div>
                      </div>
                    ) : (
                      testAIChatHistory.map((msg, index) => (
                        <div
                          key={index}
                          className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[85%] sm:max-w-[80%] lg:max-w-[70%] rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 ${
                              msg.role === 'user'
                                ? 'bg-purple-600 text-white'
                                : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700'
                            }`}
                          >
                            <p className="text-xs sm:text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                            {msg.metadata && (
                              <div className="mt-2 pt-2 border-t border-gray-200 border-opacity-20">
                                {msg.metadata.isControlled && (
                                  <div className="text-xs">
                                    <span className="font-semibold">⚠️ Medicamento Controlado:</span>{' '}
                                    {msg.metadata.controlledSubstance}
                                    {msg.metadata.needsPharmacist && (
                                      <span className="ml-2 text-green-600">✅ Redirecionado para farmacêutico</span>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                            <div className="flex items-center justify-between mt-1">
                              <p className="text-xs opacity-70">
                                {new Date(msg.timestamp).toLocaleTimeString('pt-BR', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </p>
                              {msg.role === 'assistant' && msg.metadata && (msg.metadata.extractedMessage || msg.metadata.processingDetails) && (
                                <button
                                  onClick={() => setSelectedMessageForDetails(selectedMessageForDetails === index ? null : index)}
                                  className="text-xs text-blue-600 hover:text-blue-700 flex items-center space-x-1 ml-2"
                                  title="Ver detalhes do processamento"
                                >
                                  <Info className="w-3 h-3" />
                                  <span>Detalhes</span>
                                  {selectedMessageForDetails === index ? (
                                    <ChevronUp className="w-3 h-3" />
                                  ) : (
                                    <ChevronDown className="w-3 h-3" />
                                  )}
                                </button>
                              )}
                            </div>
                            {selectedMessageForDetails === index && msg.metadata && (
                              <div className="mt-3 pt-3 border-t border-gray-200 space-y-3">
                                {/* Dados Extraídos */}
                                {msg.metadata.extractedMessage && (
                                  <div className="bg-blue-50 rounded p-3 border border-blue-200">
                                    <h4 className="text-xs font-semibold text-blue-900 mb-2 flex items-center">
                                      <span className="mr-1">🔍</span>
                                      Dados Extraídos pela IA
                                    </h4>
                                    <div className="text-xs space-y-2">
                                      <div>
                                        <span className="font-medium text-blue-800">Intenção:</span>{' '}
                                        <span className="text-blue-700 bg-blue-100 px-2 py-0.5 rounded">
                                          {msg.metadata.extractedMessage.intent || 'N/A'}
                                        </span>
                                      </div>
                                      {msg.metadata.extractedMessage.entities && (
                                        <div>
                                          <span className="font-medium text-blue-800 block mb-1">Entidades Extraídas:</span>
                                          <div className="bg-white p-2 rounded border border-blue-100 max-h-48 overflow-auto">
                                            {Object.keys(msg.metadata.extractedMessage.entities).length > 0 ? (
                                              <div className="space-y-1">
                                                {Object.entries(msg.metadata.extractedMessage.entities).map(([key, value]: [string, any]) => {
                                                  if (!value || (typeof value === 'object' && Object.keys(value).length === 0)) return null
                                                  return (
                                                    <div key={key} className="flex items-start">
                                                      <span className="font-medium text-blue-700 min-w-[100px]">{key}:</span>
                                                      <span className="text-blue-900 break-words">
                                                        {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                                                      </span>
                                                    </div>
                                                  )
                                                })}
                                              </div>
                                            ) : (
                                              <span className="text-gray-500 italic">Nenhuma entidade extraída</span>
                                            )}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}
                                
                                {/* Detalhes do Processamento */}
                                {msg.metadata.processingDetails && (
                                  <div className="bg-green-50 rounded p-3 border border-green-200">
                                    <h4 className="text-xs font-semibold text-green-900 mb-2 flex items-center">
                                      <span className="mr-1">⚙️</span>
                                      Detalhes do Processamento
                                    </h4>
                                    <div className="text-xs space-y-1.5">
                                      <div className="flex items-center justify-between">
                                        <span className="font-medium text-green-800">Extração realizada:</span>
                                        <span className={`px-2 py-0.5 rounded ${
                                          msg.metadata.processingDetails.hasExtractedMessage 
                                            ? 'bg-green-200 text-green-800' 
                                            : 'bg-gray-200 text-gray-600'
                                        }`}>
                                          {msg.metadata.processingDetails.hasExtractedMessage ? '✓ Sim' : '✗ Não'}
                                        </span>
                                      </div>
                                      {msg.metadata.processingDetails.extractedIntent && (
                                        <div className="flex items-center justify-between">
                                          <span className="font-medium text-green-800">Intenção detectada:</span>
                                          <span className="text-green-700 bg-green-100 px-2 py-0.5 rounded">
                                            {msg.metadata.processingDetails.extractedIntent}
                                          </span>
                                        </div>
                                      )}
                                      <div className="flex items-center justify-between">
                                        <span className="font-medium text-green-800">Resposta gerada:</span>
                                        <span className={`px-2 py-0.5 rounded ${
                                          msg.metadata.processingDetails.aiResponseGenerated 
                                            ? 'bg-green-200 text-green-800' 
                                            : 'bg-gray-200 text-gray-600'
                                        }`}>
                                          {msg.metadata.processingDetails.aiResponseGenerated ? '✓ Sim' : '✗ Não'}
                                          {msg.metadata.processingDetails.aiResponseLength > 0 && (
                                            <span className="ml-1 text-xs">
                                              ({msg.metadata.processingDetails.aiResponseLength} chars)
                                            </span>
                                          )}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                )}
                                
                                {/* Prompt Final Enviado para a IA */}
                                {msg.metadata?.processingDetails?.finalPrompt && (
                                  <div className="bg-gray-50 dark:bg-gray-800 rounded p-3 border border-gray-200 dark:border-gray-700">
                                    <h4 className="text-xs font-semibold text-gray-900 dark:text-white mb-2 flex items-center">
                                      <span className="mr-1">📝</span>
                                      Prompt Final Enviado para a IA
                                    </h4>
                                    <div className="bg-white dark:bg-gray-800 p-2 rounded border border-gray-100 dark:border-gray-700 max-h-96 overflow-auto">
                                      <pre className="text-xs text-gray-800 whitespace-pre-wrap break-words font-mono">
                                        {msg.metadata.processingDetails.finalPrompt}
                                      </pre>
                                    </div>
                                  </div>
                                )}

                                {/* Resposta Completa da IA */}
                                <div className="bg-purple-50 rounded p-3 border border-purple-200">
                                  <h4 className="text-xs font-semibold text-purple-900 mb-2 flex items-center">
                                    <span className="mr-1">🤖</span>
                                    Resposta Final da IA
                                  </h4>
                                  <p className="text-xs text-purple-800 whitespace-pre-wrap break-words bg-white p-2 rounded border border-purple-100">
                                    {msg.content}
                                  </p>
                                </div>
                                
                                {/* Informações de Medicamento Controlado */}
                                {msg.metadata.isControlled && (
                                  <div className="bg-red-50 rounded p-3 border border-red-200">
                                    <h4 className="text-xs font-semibold text-red-900 mb-2 flex items-center">
                                      <span className="mr-1">⚠️</span>
                                      Medicamento Controlado
                                    </h4>
                                    <div className="text-xs space-y-1">
                                      <div>
                                        <span className="font-medium text-red-800">Substância:</span>{' '}
                                        <span className="text-red-700">{msg.metadata.controlledSubstance || 'N/A'}</span>
                                      </div>
                                      <div>
                                        <span className="font-medium text-red-800">Status:</span>{' '}
                                        <span className={msg.metadata.needsPharmacist ? 'text-green-700' : 'text-orange-700'}>
                                          {msg.metadata.needsPharmacist ? '✓ Redirecionado para farmacêutico' : '⏳ Aguardando confirmação'}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {/* Informações do Carrinho */}
                                {msg.metadata.cartInfo && (
                                  <div className="bg-orange-50 rounded p-3 border border-orange-200">
                                    <h4 className="text-xs font-semibold text-orange-900 mb-2 flex items-center">
                                      <span className="mr-1">🛒</span>
                                      Carrinho Após Esta Mensagem
                                    </h4>
                                    <div className="text-xs space-y-2">
                                      <div className="flex items-center justify-between">
                                        <span className="font-medium text-orange-800">Itens:</span>
                                        <span className="text-orange-700 bg-orange-100 px-2 py-0.5 rounded">
                                          {msg.metadata.cartInfo.itemCount} item(ns)
                                        </span>
                                      </div>
                                      <div className="flex items-center justify-between">
                                        <span className="font-medium text-orange-800">Total:</span>
                                        <span className="text-orange-700 font-bold">
                                          R$ {msg.metadata.cartInfo.total.toFixed(2)}
                                        </span>
                                      </div>
                                      {msg.metadata.cartInfo.items && msg.metadata.cartInfo.items.length > 0 && (
                                        <div>
                                          <span className="font-medium text-orange-800 block mb-1">Produtos:</span>
                                          <div className="bg-white p-2 rounded border border-orange-100 space-y-1">
                                            {msg.metadata.cartInfo.items.map((item: { name: string; quantity: number; price: number }, idx: number) => (
                                              <div key={idx} className="flex justify-between items-center text-xs">
                                                <span className="text-orange-900">
                                                  {item.name} ({item.quantity}x)
                                                </span>
                                                <span className="text-orange-700 font-medium">
                                                  R$ {(item.price * item.quantity).toFixed(2)}
                                                </span>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                      {msg.metadata.purchaseLink && (
                                        <div className="mt-2 pt-2 border-t border-orange-200">
                                          <span className="font-medium text-orange-800 block mb-1">Link de Finalização:</span>
                                          <a 
                                            href={msg.metadata.purchaseLink} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="text-blue-600 hover:text-blue-700 underline break-all text-xs"
                                          >
                                            {msg.metadata.purchaseLink}
                                          </a>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                    {testingAI && processingStatus && (
                      <div className="flex justify-start">
                        <div className="bg-blue-50 text-gray-900 border border-blue-200 rounded-lg px-4 py-3 max-w-[85%]">
                          <div className="flex items-start space-x-2">
                            <Loader2 className="w-4 h-4 animate-spin text-blue-600 mt-0.5 flex-shrink-0" />
                            <div className="flex-1">
                              <span className="text-sm font-medium text-blue-900">{processingStatus}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Input de Mensagem */}
                  <form onSubmit={handleTestAI} className="border-t bg-white dark:bg-gray-800 p-2 sm:p-3">
                    <div className="flex items-end space-x-1.5 sm:space-x-2">
                      <div className="flex-1">
                        <textarea
                          id="testAIMessage"
                          value={testAIMessage}
                          onChange={(e) => setTestAIMessage(e.target.value)}
                          placeholder="Digite sua mensagem..."
                          rows={1}
                          className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault()
                              if (testAIMessage.trim() && !testingAI) {
                                handleTestAI(e as any)
                              }
                            }
                          }}
                          disabled={testingAI}
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={testingAI || !testAIMessage.trim()}
                        className="px-2.5 sm:px-3 lg:px-4 py-1.5 sm:py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center flex-shrink-0"
                        title="Enviar mensagem (Enter)"
                      >
                        {testingAI ? (
                          <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4 sm:w-5 sm:h-5" />
                        )}
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Pressione Enter para enviar • Shift+Enter para nova linha
                    </p>
                  </form>
                </div>
              )}
            </div>

            {/* Painel de Configuração de Números de Farmacêuticos */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-lg p-3 sm:p-4 lg:p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <h2 className="text-base sm:text-lg lg:text-xl font-semibold text-gray-900 dark:text-white flex items-center">
                  <Settings className="w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-5 lg:h-5 mr-1.5 sm:mr-2 text-blue-600" />
                  Números de Farmacêuticos
                </h2>
                <button
                  onClick={() => setShowPharmacistConfig(!showPharmacistConfig)}
                  className="text-xs sm:text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  {showPharmacistConfig ? 'Ocultar' : 'Mostrar'}
                </button>
              </div>
              
              {showPharmacistConfig && (
                <div className="space-y-3 sm:space-y-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 flex-1">
                      Configure os números que receberão notificações quando uma conversa precisar de farmacêutico
                    </p>
                    <button
                      onClick={handleOpenAddPharmacistModal}
                      className="flex items-center space-x-1.5 sm:space-x-2 px-2.5 sm:px-3 py-1.5 sm:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs sm:text-sm whitespace-nowrap"
                    >
                      <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      <span>Adicionar</span>
                    </button>
                  </div>

                  {loadingPharmacistNumbers ? (
                    <div className="flex items-center justify-center py-6 sm:py-8">
                      <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 animate-spin text-blue-600" />
                      <p className="ml-2 text-xs sm:text-sm text-gray-600 dark:text-gray-300">Carregando...</p>
                    </div>
                  ) : pharmacistNumbers.length === 0 ? (
                    <div className="text-center py-6 sm:py-8 text-gray-500">
                      <Phone className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-2 text-gray-300" />
                      <p className="text-xs sm:text-sm">Nenhum número configurado</p>
                      <p className="text-xs sm:text-sm mt-1">Adicione um número para receber notificações</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {pharmacistNumbers.map((pharmacist) => (
                        <div
                          key={pharmacist.id}
                          className="flex items-center justify-between p-2.5 sm:p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 gap-2"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-1.5 sm:space-x-2 flex-wrap gap-1">
                              <Phone className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-600 dark:text-gray-300 flex-shrink-0" />
                              <p className="font-medium text-xs sm:text-sm text-gray-900 dark:text-white break-words">{pharmacist.phone}</p>
                              {pharmacist.name && (
                                <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">({pharmacist.name})</span>
                              )}
                            </div>
                            {pharmacist.userEmail && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 break-words">Usuário: {pharmacist.userEmail}</p>
                            )}
                          </div>
                          <button
                            onClick={() => handleRemovePharmacist(pharmacist.id)}
                            className="ml-2 p-1.5 sm:p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                            title="Remover"
                          >
                            <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Painel de Configuração de Números da Distribuidora */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-lg p-3 sm:p-4 lg:p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <h2 className="text-base sm:text-lg lg:text-xl font-semibold text-gray-900 dark:text-white flex items-center">
                  <Settings className="w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-5 lg:h-5 mr-1.5 sm:mr-2 text-green-600" />
                  Números da Distribuidora
                </h2>
                <button
                  onClick={() => setShowDistributorConfig(!showDistributorConfig)}
                  className="text-xs sm:text-sm text-green-600 hover:text-green-700 font-medium"
                >
                  {showDistributorConfig ? 'Ocultar' : 'Mostrar'}
                </button>
              </div>
              
              {showDistributorConfig && (
                <div className="space-y-3 sm:space-y-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 flex-1">
                      Configure os números que receberão mensagens automáticas quando um pedido for marcado como pago. A mensagem será enviada apenas uma vez por pedido para todos os números configurados.
                    </p>
                    <button
                      onClick={handleOpenAddDistributorModal}
                      className="flex items-center space-x-1.5 sm:space-x-2 px-2.5 sm:px-3 py-1.5 sm:py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-xs sm:text-sm whitespace-nowrap"
                    >
                      <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      <span>Adicionar</span>
                    </button>
                  </div>

                  {loadingDistributorNumbers ? (
                    <div className="flex items-center justify-center py-6 sm:py-8">
                      <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 animate-spin text-green-600" />
                      <p className="ml-2 text-xs sm:text-sm text-gray-600 dark:text-gray-300">Carregando...</p>
                    </div>
                  ) : distributorNumbers.length === 0 ? (
                    <div className="text-center py-6 sm:py-8 text-gray-500">
                      <Phone className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-2 text-gray-300" />
                      <p className="text-xs sm:text-sm">Nenhum número configurado</p>
                      <p className="text-xs sm:text-sm mt-1">Adicione um número para receber notificações</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {distributorNumbers.map((distributor) => (
                        <div
                          key={distributor.id}
                          className="flex items-center justify-between p-2.5 sm:p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 gap-2"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-1.5 sm:space-x-2 flex-wrap gap-1">
                              <Phone className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-600 dark:text-gray-300 flex-shrink-0" />
                              <p className="font-medium text-xs sm:text-sm text-gray-900 dark:text-white break-words">{distributor.phone}</p>
                              {distributor.name && (
                                <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">({distributor.name})</span>
                              )}
                            </div>
                            {distributor.userEmail && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 break-words">Usuário: {distributor.userEmail}</p>
                            )}
                          </div>
                          <button
                            onClick={() => handleRemoveDistributor(distributor.id)}
                            className="ml-2 p-1.5 sm:p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                            title="Remover"
                          >
                            <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* Painel de Envio de Mensagem e Conversas */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
              {/* Painel de Envio de Mensagem */}
              <div className="lg:col-span-1 order-2 lg:order-1">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-lg p-3 sm:p-4 lg:p-6 border border-gray-200 dark:border-gray-700">
                  <h2 className="text-base sm:text-lg lg:text-xl font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4 flex items-center">
                    <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-5 lg:h-5 mr-1.5 sm:mr-2" />
                    Enviar Mensagem
                  </h2>
                <form onSubmit={handleSendTest} className="space-y-3 sm:space-y-4">
                  <div>
                    <label htmlFor="phone" className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-white mb-1.5 sm:mb-2">
                      Número (com DDD e código do país)
                    </label>
                    <input
                      type="text"
                      id="phone"
                      value={testMessage.phone}
                      onChange={(e) => setTestMessage({ ...testMessage, phone: e.target.value })}
                      placeholder="5511999999999"
                      className="w-full px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-300 dark:border-gray-400 dark:bg-gray-200 dark:text-black rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Formato: 55 + DDD + Número</p>
                  </div>
                  <div>
                    <label htmlFor="message" className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-white mb-1.5 sm:mb-2">
                      Mensagem
                    </label>
                    <textarea
                      id="message"
                      value={testMessage.message}
                      onChange={(e) => setTestMessage({ ...testMessage, message: e.target.value })}
                      placeholder="Digite sua mensagem..."
                      rows={4}
                      className="w-full px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-300 dark:border-gray-400 dark:bg-gray-200 dark:text-black rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      required
                    />
                  </div>
                  {messageStatus.type && (
                    <div
                      className={`p-2 sm:p-3 rounded-lg text-xs sm:text-sm ${
                        messageStatus.type === 'success'
                          ? 'bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                          : 'bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                      }`}
                    >
                      {messageStatus.message}
                    </div>
                  )}
                  <button
                    type="submit"
                    disabled={sending}
                    className="w-full flex items-center justify-center px-3 sm:px-4 py-2 text-xs sm:text-sm lg:text-base bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {sending ? (
                      <>
                        <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2" />
                        Enviar Mensagem
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>

            {/* Painel de Conversas e Mensagens */}
            <div className="lg:col-span-2 order-1 lg:order-2">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-lg overflow-hidden flex flex-col border border-gray-200 dark:border-gray-700" style={{ minHeight: '400px', height: 'calc(100vh - 200px)', maxHeight: '800px' }}>
                {/* Lista de Conversas */}
                <div className="border-b border-gray-200 dark:border-gray-700 p-2 sm:p-3 lg:p-4 bg-white dark:bg-gray-800">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2 sm:mb-3 gap-2">
                    <h2 className="text-base sm:text-lg lg:text-xl font-semibold text-gray-900 dark:text-white flex items-center">
                      <MessageSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-5 lg:h-5 mr-1.5 sm:mr-2" />
                      <span className="truncate">{showNeedingResponse ? 'Fila de Atendimento' : 'Conversas'}</span>
                      {showNeedingResponse ? (
                        conversationsNeedingResponse.length > 0 && (
                          <span className="ml-1.5 sm:ml-2 px-1.5 sm:px-2 py-0.5 sm:py-1 text-[10px] sm:text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 rounded-full flex-shrink-0">
                            {conversationsNeedingResponse.length}
                          </span>
                        )
                      ) : (
                        conversations.length > 0 && (
                          <span className="ml-1.5 sm:ml-2 px-1.5 sm:px-2 py-0.5 sm:py-1 text-[10px] sm:text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full flex-shrink-0">
                            {conversations.length}
                          </span>
                        )
                      )}
                    </h2>
                    <button
                      onClick={() => {
                        setShowNeedingResponse(!showNeedingResponse)
                        if (!showNeedingResponse) {
                          loadConversationsNeedingResponse()
                        }
                      }}
                      className={`px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs lg:text-sm rounded-lg transition-colors whitespace-nowrap ${
                        showNeedingResponse
                          ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 hover:bg-orange-200 dark:hover:bg-orange-900/50'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                      }`}
                    >
                      {showNeedingResponse ? 'Ver Todas' : 'Ver Fila'}
                    </button>
                  </div>
                  {showNeedingResponse && (
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 mb-2 sm:mb-3">
                      Conversas onde a última mensagem foi do cliente
                    </p>
                  )}
                  
                  {/* Campo de Busca e Filtros */}
                  <div className="space-y-1.5 sm:space-y-2">
                    {/* Campo de Busca */}
                    <div className="relative">
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Buscar por nome ou número..."
                        className="w-full px-3 sm:px-4 py-1.5 sm:py-2 pl-8 sm:pl-10 text-xs sm:text-sm border border-gray-300 dark:border-gray-400 dark:bg-gray-200 dark:text-black rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <svg
                        className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400 dark:text-gray-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                        />
                      </svg>
                      {searchTerm && (
                        <button
                          onClick={() => setSearchTerm('')}
                          className="absolute right-2 sm:right-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 p-0.5"
                          type="button"
                        >
                          <svg
                            className="w-4 h-4 sm:w-5 sm:h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                        </button>
                      )}
                    </div>
                    
                    {/* Filtros por Tags */}
                    <div className="flex flex-wrap gap-1 sm:gap-1.5 lg:gap-2">
                      <button
                        onClick={() => {
                          setSelectedFilters({
                            cliente: false,
                            farmaceutico: false,
                            assumida: false,
                            controlado: false
                          })
                        }}
                        className={`px-1.5 sm:px-2 lg:px-3 py-0.5 sm:py-1 lg:py-1.5 text-[9px] sm:text-[10px] lg:text-xs rounded-full font-medium transition-colors ${
                          !selectedFilters.cliente && !selectedFilters.farmaceutico && !selectedFilters.assumida && !selectedFilters.controlado
                            ? 'bg-gray-700 dark:bg-gray-600 text-white dark:text-white'
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                        }`}
                      >
                        Todas
                      </button>
                      <button
                        onClick={() => setSelectedFilters({ ...selectedFilters, cliente: !selectedFilters.cliente })}
                        className={`px-1.5 sm:px-2 lg:px-3 py-0.5 sm:py-1 lg:py-1.5 text-[9px] sm:text-[10px] lg:text-xs rounded-full font-medium transition-colors flex items-center space-x-0.5 sm:space-x-1 ${
                          selectedFilters.cliente
                            ? 'bg-blue-600 dark:bg-blue-600 text-white dark:text-white'
                            : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/50'
                        }`}
                      >
                        <span>💬</span>
                        <span>Cliente</span>
                      </button>
                      <button
                        onClick={() => setSelectedFilters({ ...selectedFilters, farmaceutico: !selectedFilters.farmaceutico })}
                        className={`px-1.5 sm:px-2 lg:px-3 py-0.5 sm:py-1 lg:py-1.5 text-[9px] sm:text-[10px] lg:text-xs rounded-full font-medium transition-colors flex items-center space-x-0.5 sm:space-x-1 ${
                          selectedFilters.farmaceutico
                            ? 'bg-red-600 dark:bg-red-600 text-white dark:text-white'
                            : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/50'
                        }`}
                      >
                        <span>👨‍⚕️</span>
                        <span className="hidden xs:inline">Farmacêutico</span>
                        <span className="xs:hidden">Farm.</span>
                      </button>
                      <button
                        onClick={() => setSelectedFilters({ ...selectedFilters, assumida: !selectedFilters.assumida })}
                        className={`px-1.5 sm:px-2 lg:px-3 py-0.5 sm:py-1 lg:py-1.5 text-[9px] sm:text-[10px] lg:text-xs rounded-full font-medium transition-colors flex items-center space-x-0.5 sm:space-x-1 ${
                          selectedFilters.assumida
                            ? 'bg-yellow-600 dark:bg-yellow-600 text-white dark:text-white'
                            : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 hover:bg-yellow-200 dark:hover:bg-yellow-900/50'
                        }`}
                      >
                        <span>🔒</span>
                        <span>Assumida</span>
                      </button>
                      <button
                        onClick={() => setSelectedFilters({ ...selectedFilters, controlado: !selectedFilters.controlado })}
                        className={`px-1.5 sm:px-2 lg:px-3 py-0.5 sm:py-1 lg:py-1.5 text-[9px] sm:text-[10px] lg:text-xs rounded-full font-medium transition-colors flex items-center space-x-0.5 sm:space-x-1 ${
                          selectedFilters.controlado
                            ? 'bg-orange-600 dark:bg-orange-600 text-white dark:text-white'
                            : 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 hover:bg-orange-200 dark:hover:bg-orange-900/50'
                        }`}
                      >
                        <span>⚠️</span>
                        <span>Controlado</span>
                      </button>
                    </div>
                  </div>
                </div>

                {(() => {
                  const allConversations = showNeedingResponse ? conversationsNeedingResponse : conversations
                  const filteredConversations = filterConversations(allConversations, searchTerm)
                  
                  if (filteredConversations.length === 0) {
                    if (searchTerm) {
                      return (
                        <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
                          <div className="text-center">
                            <MessageSquare className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 text-gray-300 mx-auto mb-3 sm:mb-4" />
                            <p className="text-xs sm:text-sm lg:text-base text-gray-500">Nenhuma conversa encontrada</p>
                            <p className="text-xs sm:text-sm text-gray-400 dark:text-gray-500 mt-1.5 sm:mt-2">
                              Tente buscar por nome ou número de telefone
                            </p>
                          </div>
                        </div>
                      )
                    }
                    
                    return (
                      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
                        <div className="text-center">
                          <MessageSquare className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 text-gray-300 mx-auto mb-3 sm:mb-4" />
                          <p className="text-xs sm:text-sm lg:text-base text-gray-500 dark:text-gray-400">
                            {showNeedingResponse ? 'Nenhuma conversa precisa de resposta' : 'Nenhuma conversa ainda'}
                          </p>
                          <p className="text-xs sm:text-sm text-gray-400 dark:text-gray-500 mt-1.5 sm:mt-2">
                            {showNeedingResponse 
                              ? 'Todas as conversas foram respondidas' 
                              : 'As mensagens recebidas aparecerão aqui'}
                          </p>
                        </div>
                      </div>
                    )
                  }
                  
                  // Se há conversas filtradas, retorna null (será renderizado abaixo)
                  return null
                })()}
                
                {filterConversations(
                  showNeedingResponse ? conversationsNeedingResponse : conversations,
                  searchTerm
                ).length > 0 && (
                  <div className="flex flex-1 overflow-hidden">
                    {/* Lista de Conversas */}
                    <div className={`${showMessagesOnMobile ? 'hidden' : 'flex'} lg:flex w-full lg:w-1/3 border-r border-gray-200 dark:border-gray-700 overflow-y-auto flex-col`}>
                      {filterConversations(
                        showNeedingResponse ? conversationsNeedingResponse : conversations,
                        searchTerm
                      ).map((conversation) => (
                        <button
                          key={conversation.phone}
                          type="button"
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            e.currentTarget.blur()
                            setSelectedConversation(conversation.phone)
                            setShowMessagesOnMobile(true) // Em mobile, mostra mensagens
                            whatsappService.markConversationAsRead(conversation.phone).catch(() => {})
                          }}
                          onMouseDown={(e) => {
                            e.preventDefault()
                          }}
                          className={`w-full p-2.5 sm:p-3 lg:p-4 text-left hover:bg-gray-50 dark:hover:bg-[#065084] transition-colors border-b border-gray-100 dark:border-gray-700 focus:outline-none ${
                            selectedConversation === conversation.phone ? 'bg-blue-50 dark:bg-blue-900/30 border-l-4 border-l-blue-600 dark:border-l-blue-400' : ''
                          } ${
                            conversation.needsResponse ? 'bg-orange-50 dark:bg-orange-900/30 border-l-4 border-l-orange-500 dark:border-l-orange-400' : ''
                          }`}
                        >
                          <div className="flex items-start space-x-2 sm:space-x-3">
                            <div className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 lg:w-10 lg:h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                              <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-6 lg:h-6 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-1.5 sm:gap-2">
                                <p className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white truncate">
                                  {conversation.contactName || formatPhone(conversation.phone)}
                                </p>
                                <div className="flex items-center gap-1 flex-shrink-0">
                                  {conversation.needsResponse && (
                                    <span className="px-1 sm:px-1.5 lg:px-2 py-0.5 text-[9px] sm:text-[10px] lg:text-xs bg-orange-500 text-white rounded-full whitespace-nowrap">
                                      Precisa resposta
                                    </span>
                                  )}
                                  {conversation.unreadCount > 0 && (
                                    <span className="px-1 sm:px-1.5 lg:px-2 py-0.5 text-[9px] sm:text-[10px] lg:text-xs bg-blue-600 text-white rounded-full">
                                      {conversation.unreadCount}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-300 truncate mt-0.5 sm:mt-1">
                                {(() => {
                                  const messageText = formatMessageBody(conversation.lastMessage)
                                  return messageText.length > 40 ? messageText.substring(0, 40) + '...' : messageText
                                })()}
                              </p>
                              <p className="text-[10px] sm:text-xs text-gray-400 dark:text-gray-400 mt-0.5 sm:mt-1">
                                {formatTime(conversation.lastMessage.timestamp)}
                              </p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>

                    {/* Mensagens da Conversa Selecionada */}
                    <div className={`${showMessagesOnMobile ? 'flex' : 'hidden'} lg:flex flex-1 flex-col`}>
                      {selectedConversation ? (
                        <>
                          {/* Header da Conversa */}
                          <div className="border-b border-gray-200 dark:border-gray-700 p-2 sm:p-3 lg:p-4 bg-gray-50 dark:bg-gray-800">
                            <div className="flex items-center justify-between gap-2 sm:gap-3">
                              <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
                                {/* Botão voltar (apenas mobile) */}
                                <button
                                  onClick={() => {
                                    setShowMessagesOnMobile(false)
                                    setSelectedConversation(null)
                                  }}
                                  className="lg:hidden flex-shrink-0 p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                                >
                                  <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600 dark:text-gray-300" />
                                </button>
                                <div className="w-7 h-7 sm:w-8 sm:h-8 lg:w-10 lg:h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                                  <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-6 lg:h-6 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="font-medium text-gray-900 dark:text-white text-xs sm:text-sm lg:text-base truncate">
                                    {conversations.find(c => c.phone === selectedConversation)?.contactName || formatPhone(selectedConversation)}
                                  </p>
                                  <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 truncate">{formatPhone(selectedConversation)}</p>
                                </div>
                              </div>
                              {/* Badges e botões de ação */}
                              <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0 flex-wrap">
                                {(() => {
                                  const selectedConv = conversations.find(c => c.phone === selectedConversation)
                                  return (
                                    <>
                                      {selectedConv?.needsPharmacist && (
                                        <span className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-[9px] sm:text-[10px] lg:text-xs px-1.5 sm:px-2 lg:px-3 py-0.5 sm:py-1 rounded-full font-medium whitespace-nowrap">
                                          Farmacêutico
                                        </span>
                                      )}
                                      {selectedConv?.isAssumed && (
                                        <span className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 text-[9px] sm:text-[10px] lg:text-xs px-1.5 sm:px-2 lg:px-3 py-0.5 sm:py-1 rounded-full font-medium whitespace-nowrap truncate max-w-[120px] sm:max-w-none">
                                          {selectedConv?.assumedBy ? `Assumido por ${selectedConv.assumedBy}` : 'Assumida'}
                                        </span>
                                      )}
                                      {/* Botão para permitir/remover resposta automática da IA */}
                                      <button
                                        onClick={handleToggleAllowedAINumber}
                                        disabled={loadingAllowedCheck}
                                        className={`flex items-center space-x-0.5 sm:space-x-1 text-[9px] sm:text-[10px] lg:text-xs px-1.5 sm:px-2 lg:px-3 py-0.5 sm:py-1 lg:py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap ${
                                          isNumberAllowed
                                            ? 'bg-green-600 hover:bg-green-700 text-white'
                                            : 'bg-gray-600 hover:bg-gray-700 text-white'
                                        } ${loadingAllowedCheck ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        title={
                                          isNumberAllowed
                                            ? 'Remover da lista de permitidos (IA não responderá mais automaticamente)'
                                            : 'Adicionar à lista de permitidos (IA responderá mesmo com AI_AUTO_RESPOND=false)'
                                        }
                                      >
                                        {loadingAllowedCheck ? (
                                          <Clock size={12} className="sm:w-3.5 sm:h-3.5 lg:w-4 lg:h-4 animate-spin" />
                                        ) : isNumberAllowed ? (
                                          <>
                                            <Bot size={12} className="sm:w-3.5 sm:h-3.5 lg:w-4 lg:h-4" />
                                            <span className="hidden sm:inline">IA Ativa</span>
                                          </>
                                        ) : (
                                          <>
                                            <Power size={12} className="sm:w-3.5 sm:h-3.5 lg:w-4 lg:h-4" />
                                            <span className="hidden sm:inline">Ativar IA</span>
                                          </>
                                        )}
                                      </button>
                                      {/* Botão para assumir/desbloquear conversa */}
                                      {selectedConv?.isAssumed || selectedConv?.needsPharmacist ? (
                                        <button
                                          onClick={() => handleUnblockConversation(selectedConversation)}
                                          className="flex items-center space-x-0.5 sm:space-x-1 bg-green-600 hover:bg-green-700 text-white text-[9px] sm:text-[10px] lg:text-xs px-1.5 sm:px-2 lg:px-3 py-0.5 sm:py-1 lg:py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap"
                                          title="Desbloquear conversa (IA voltará a responder)"
                                        >
                                          <Unlock size={12} className="sm:w-3.5 sm:h-3.5 lg:w-4 lg:h-4" />
                                          <span className="hidden sm:inline">Desbloquear</span>
                                        </button>
                                      ) : (
                                        <button
                                          onClick={() => handleBlockConversation(selectedConversation)}
                                          className="flex items-center space-x-0.5 sm:space-x-1 bg-yellow-600 hover:bg-yellow-700 text-white text-[9px] sm:text-[10px] lg:text-xs px-1.5 sm:px-2 lg:px-3 py-0.5 sm:py-1 lg:py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap"
                                          title="Assumir conversa (bloquear IA)"
                                        >
                                          <Lock size={12} className="sm:w-3.5 sm:h-3.5 lg:w-4 lg:h-4" />
                                          <span className="hidden sm:inline">Assumir</span>
                                        </button>
                                      )}
                                    </>
                                  )
                                })()}
                              </div>
                            </div>
                          </div>

                          {/* Mensagens */}
                          <div 
                            ref={messagesContainerRef}
                            className="flex-1 overflow-y-auto p-2 sm:p-3 lg:p-4 bg-gray-50 dark:bg-gray-900"
                            style={{ scrollBehavior: 'auto' }}
                          >
                            {messages.length === 0 ? (
                              <div className="flex items-center justify-center h-full">
                                <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm lg:text-base">Nenhuma mensagem ainda</p>
                              </div>
                            ) : (
                              <div className="space-y-2 sm:space-y-3 lg:space-y-4">
                                {messages.map((message) => (
                                  <div
                                    key={message.id}
                                    className={`flex ${message.isFromMe ? 'justify-end' : 'justify-start'}`}
                                  >
                                    <div
                                      className={`max-w-[90%] sm:max-w-[85%] lg:max-w-xs xl:max-w-md rounded-lg shadow-sm overflow-hidden ${
                                        message.isFromMe
                                          ? 'bg-blue-600 text-white'
                                          : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700'
                                      } ${message.type === 'image' && message.mediaUrl ? 'p-0' : 'px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2'}`}
                                    >
                                      {message.type === 'image' && message.mediaUrl ? (
                                        <>
                                          {renderMessageContent(message)}
                                          <div className="px-2 sm:px-3 lg:px-4 pb-1.5 sm:pb-2">
                                            <p
                                              className={`text-[9px] sm:text-[10px] lg:text-xs mt-0.5 sm:mt-1 ${
                                                message.isFromMe ? 'text-blue-100' : 'text-gray-400 dark:text-gray-500'
                                              }`}
                                            >
                                              {formatTime(message.timestamp)}
                                            </p>
                                          </div>
                                        </>
                                      ) : (
                                        <>
                                          {renderMessageContent(message)}
                                          <p
                                            className={`text-[9px] sm:text-[10px] lg:text-xs mt-0.5 sm:mt-1 ${
                                              message.isFromMe ? 'text-blue-100' : 'text-gray-400 dark:text-gray-500'
                                            }`}
                                          >
                                            {formatTime(message.timestamp)}
                                          </p>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Campo de Envio de Mensagem */}
                          <div className="border-t border-gray-200 dark:border-gray-700 p-2 sm:p-3 lg:p-4 bg-white dark:bg-gray-800">
                            {/* Preview do arquivo selecionado */}
                            {selectedFile && (
                              <div className="mb-1.5 sm:mb-2 p-1.5 sm:p-2 bg-gray-50 dark:bg-gray-800 rounded-lg flex items-center justify-between border border-gray-200 dark:border-gray-700 gap-2">
                                <div className="flex items-center space-x-1.5 sm:space-x-2 flex-1 min-w-0">
                                  {filePreview ? (
                                    <img src={filePreview} alt="Preview" className="w-10 h-10 sm:w-12 sm:h-12 object-cover rounded flex-shrink-0" />
                                  ) : (
                                    <Paperclip className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600 dark:text-gray-300 flex-shrink-0" />
                                  )}
                                  <div className="min-w-0 flex-1">
                                    <p className="text-[10px] sm:text-xs lg:text-sm font-medium text-gray-900 dark:text-white truncate">{selectedFile.name}</p>
                                    <p className="text-[9px] sm:text-[10px] lg:text-xs text-gray-500 dark:text-gray-400">
                                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                                    </p>
                                  </div>
                                </div>
                                <button
                                  onClick={removeFile}
                                  className="ml-1 p-0.5 sm:p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors flex-shrink-0"
                                >
                                  <X className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-600 dark:text-gray-300" />
                                </button>
                              </div>
                            )}
                            <form onSubmit={handleSendConversationMessage} className="flex items-center space-x-1.5 sm:space-x-2">
                              <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
                                onChange={handleFileSelect}
                                className="hidden"
                                id="file-input-conversation"
                              />
                              <label
                                htmlFor="file-input-conversation"
                                className="p-1.5 sm:p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors cursor-pointer flex-shrink-0"
                                title="Anexar arquivo"
                              >
                                <Paperclip className="w-4 h-4 sm:w-5 sm:h-5" />
                              </label>
                              <input
                                type="text"
                                value={conversationMessage}
                                onChange={(e) => setConversationMessage(e.target.value)}
                                placeholder={selectedFile ? "Legenda (opcional)..." : "Digite uma mensagem..."}
                                className="flex-1 px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2 text-xs sm:text-sm lg:text-base border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                disabled={sendingConversationMessage}
                              />
                              <button
                                type="submit"
                                disabled={(!conversationMessage.trim() && !selectedFile) || sendingConversationMessage}
                                className="px-2.5 sm:px-3 lg:px-4 py-1.5 sm:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center flex-shrink-0"
                              >
                                {sendingConversationMessage ? (
                                  <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                                ) : (
                                  <Send className="w-4 h-4 sm:w-5 sm:h-5" />
                                )}
                              </button>
                            </form>
                          </div>
                        </>
                      ) : (
                        <div className="flex-1 flex items-center justify-center">
                          <div className="text-center px-3 sm:px-4">
                            <MessageSquare className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 text-gray-300 dark:text-gray-600 mx-auto mb-3 sm:mb-4" />
                            <p className="text-xs sm:text-sm lg:text-base text-gray-500 dark:text-gray-400">Selecione uma conversa para ver as mensagens</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          </div>
        )}
        </div>

        {/* Modal para Adicionar Número de Farmacêutico */}
        {showAddPharmacistModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full border border-gray-200 dark:border-gray-700 max-h-[90vh] overflow-y-auto">
              <div className="p-3 sm:p-4 lg:p-6">
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">Adicionar Número</h3>
                  <button
                    onClick={() => setShowAddPharmacistModal(false)}
                    className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <X className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                </div>

                <div className="space-y-3 sm:space-y-4">
                  {/* Seleção de Usuário */}
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-white mb-1.5 sm:mb-2">
                      Ou selecione um usuário do sistema:
                    </label>
                    <select
                      value={newPharmacistUserId || ''}
                      onChange={(e) => handleUserSelect(e.target.value)}
                      className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-300 dark:border-gray-400 dark:bg-gray-200 dark:text-black rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled={loadingUsers}
                    >
                      <option value="">Selecione um usuário (opcional)</option>
                      {usersWithPhone.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.name} ({user.email}) - {user.phone}
                        </option>
                      ))}
                    </select>
                    {loadingUsers && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Carregando usuários...</p>
                    )}
                  </div>

                  <div className="text-center text-gray-500 dark:text-gray-400 text-xs sm:text-sm">ou</div>

                  {/* Número Manual */}
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-white mb-1.5 sm:mb-2">
                      Digite o número manualmente:
                    </label>
                    <input
                      type="text"
                      value={newPharmacistPhone}
                      onChange={(e) => {
                        setNewPharmacistPhone(e.target.value)
                        setNewPharmacistUserId(null) // Limpa seleção de usuário quando digita
                      }}
                      placeholder="5511999999999"
                      className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-300 dark:border-gray-400 dark:bg-gray-200 dark:text-black rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Formato: 55 + DDD + Número</p>
                  </div>

                  {/* Nome (opcional) */}
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-white mb-1.5 sm:mb-2">
                      Nome (opcional):
                    </label>
                    <input
                      type="text"
                      value={newPharmacistName}
                      onChange={(e) => setNewPharmacistName(e.target.value)}
                      placeholder="Nome do farmacêutico"
                      className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-300 dark:border-gray-400 dark:bg-gray-200 dark:text-black rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 mt-4 sm:mt-6">
                  <button
                    onClick={() => setShowAddPharmacistModal(false)}
                    className="flex-1 px-3 sm:px-4 py-2 text-xs sm:text-sm lg:text-base border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-white rounded-lg hover:bg-gray-50 dark:hover:bg-[#065084] transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleAddPharmacist}
                    disabled={addingPharmacist || (!newPharmacistPhone.trim() && !newPharmacistUserId)}
                    className="flex-1 px-3 sm:px-4 py-2 text-xs sm:text-sm lg:text-base bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                  >
                    {addingPharmacist ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 animate-spin" />
                        Adicionando...
                      </>
                    ) : (
                      'Adicionar'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Preview de Imagem */}
        {imagePreview && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-2 sm:p-4"
            onClick={() => setImagePreview(null)}
          >
            <div className="relative max-w-7xl max-h-full w-full h-full flex items-center justify-center">
              <button
                onClick={() => setImagePreview(null)}
                className="absolute top-2 right-2 sm:top-4 sm:right-4 text-white hover:text-gray-300 transition-colors z-10 bg-black bg-opacity-50 rounded-full p-1.5 sm:p-2"
                title="Fechar (ESC)"
              >
                <X size={18} className="sm:w-6 sm:h-6" />
              </button>
              <img 
                src={imagePreview} 
                alt="Preview da imagem"
                className="max-w-full max-h-full object-contain rounded-lg"
                onClick={(e) => e.stopPropagation()}
                onError={(e) => {
                  const target = e.target as HTMLImageElement
                  target.src = ''
                  target.alt = 'Erro ao carregar imagem'
                }}
              />
              {/* Botão de download */}
              <button
                onClick={async (e) => {
                  e.stopPropagation()
                  try {
                    // Se for base64, converte para blob
                    if (imagePreview.startsWith('data:')) {
                      const response = await fetch(imagePreview)
                      const blob = await response.blob()
                      const url = window.URL.createObjectURL(blob)
                      const a = document.createElement('a')
                      a.href = url
                      a.download = `imagem-${Date.now()}.jpg`
                      document.body.appendChild(a)
                      a.click()
                      document.body.removeChild(a)
                      window.URL.revokeObjectURL(url)
                    } else {
                      // Para URLs remotas, faz fetch e baixa
                      const response = await fetch(imagePreview)
                      const blob = await response.blob()
                      const url = window.URL.createObjectURL(blob)
                      const a = document.createElement('a')
                      a.href = url
                      // Tenta extrair nome do arquivo da URL ou usa timestamp
                      const urlParts = imagePreview.split('/')
                      const fileName = urlParts[urlParts.length - 1] || `imagem-${Date.now()}.jpg`
                      a.download = fileName.includes('.') ? fileName : `${fileName}.jpg`
                      document.body.appendChild(a)
                      a.click()
                      document.body.removeChild(a)
                      window.URL.revokeObjectURL(url)
                    }
                  } catch (error) {
                    console.error('Erro ao baixar imagem:', error)
                    // Fallback: abre em nova aba
                    window.open(imagePreview, '_blank')
                  }
                }}
                className="absolute bottom-2 right-2 sm:bottom-4 sm:right-4 bg-green-600 hover:bg-green-700 text-white px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2 rounded-lg transition-colors flex items-center space-x-1 sm:space-x-2 z-10 text-xs sm:text-sm"
                title="Baixar imagem"
              >
                <Download size={14} className="sm:w-4 sm:h-4 lg:w-[18px] lg:h-[18px]" />
                <span className="hidden sm:inline">Baixar</span>
              </button>
            </div>
          </div>
        )}

        {/* Modal para Adicionar Número da Distribuidora */}
        {showAddDistributorModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full border border-gray-200 dark:border-gray-700 max-h-[90vh] overflow-y-auto">
              <div className="p-3 sm:p-4 lg:p-6">
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">Adicionar Número da Distribuidora</h3>
                  <button
                    onClick={() => setShowAddDistributorModal(false)}
                    className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <X className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                </div>

                <div className="space-y-3 sm:space-y-4">
                  {/* Seleção de usuário */}
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-white mb-1.5 sm:mb-2">
                      Selecionar usuário (opcional):
                    </label>
                    <select
                      value={newDistributorUserId || ''}
                      onChange={(e) => {
                        const userId = e.target.value
                        if (userId) {
                          handleDistributorUserSelect(userId)
                        } else {
                          setNewDistributorUserId(null)
                          setNewDistributorPhone('')
                          setNewDistributorName('')
                        }
                      }}
                      className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    >
                      <option value="">Selecione um usuário...</option>
                      {usersWithPhone.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.name} ({user.phone})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Ou digite manualmente */}
                  <div className="text-center text-xs sm:text-sm text-gray-500 dark:text-gray-400">ou</div>

                  {/* Número de telefone */}
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-white mb-1.5 sm:mb-2">
                      Número de telefone:
                    </label>
                    <input
                      type="text"
                      value={newDistributorPhone}
                      onChange={(e) => {
                        setNewDistributorPhone(e.target.value)
                        setNewDistributorUserId(null) // Limpa seleção de usuário quando digita
                      }}
                      placeholder="5511999999999"
                      className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-300 dark:border-gray-400 dark:bg-gray-200 dark:text-black rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Formato: 55 + DDD + Número</p>
                  </div>

                  {/* Nome (opcional) */}
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-white mb-1.5 sm:mb-2">
                      Nome (opcional):
                    </label>
                    <input
                      type="text"
                      value={newDistributorName}
                      onChange={(e) => setNewDistributorName(e.target.value)}
                      placeholder="Nome da distribuidora"
                      className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-300 dark:border-gray-400 dark:bg-gray-200 dark:text-black rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 mt-4 sm:mt-6">
                  <button
                    onClick={() => setShowAddDistributorModal(false)}
                    className="flex-1 px-3 sm:px-4 py-2 text-xs sm:text-sm lg:text-base border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-white rounded-lg hover:bg-gray-50 dark:hover:bg-[#065084] transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleAddDistributor}
                    disabled={addingDistributor || (!newDistributorPhone.trim() && !newDistributorUserId)}
                    className="flex-1 px-3 sm:px-4 py-2 text-xs sm:text-sm lg:text-base bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                  >
                    {addingDistributor ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 animate-spin" />
                        Adicionando...
                      </>
                    ) : (
                      'Adicionar'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Confirmação de Encaminhamento para Farmacêutico */}
        {showPharmacistConfirmation && pendingPharmacistNotification && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4"
            onClick={() => {
              setShowPharmacistConfirmation(false)
              setPendingPharmacistNotification(null)
            }}
          >
            <div 
              className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-3 sm:p-4 lg:p-6 border border-gray-200 dark:border-gray-700"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4 flex items-center">
                <span className="mr-1.5 sm:mr-2">🚨</span>
                Encaminhar para Farmacêutico?
              </h3>
              
              <div className="mb-3 sm:mb-4">
                <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 mb-2">
                  A IA detectou um medicamento controlado e está pronta para enviar uma notificação aos farmacêuticos configurados.
                </p>
                <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded p-2 sm:p-3 mb-2 sm:mb-3">
                  <p className="text-xs sm:text-sm font-medium text-yellow-800 dark:text-yellow-300 mb-1">Medicamento:</p>
                  <p className="text-xs sm:text-sm text-yellow-900 dark:text-yellow-200">{pendingPharmacistNotification.controlledSubstance}</p>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Ao confirmar, a notificação será enviada normalmente como em produção.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
                <button
                  onClick={() => {
                    setShowPharmacistConfirmation(false)
                    setPendingPharmacistNotification(null)
                  }}
                  className="flex-1 px-3 sm:px-4 py-2 text-xs sm:text-sm lg:text-base bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-white rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmPharmacistNotification}
                  className="flex-1 px-3 sm:px-4 py-2 text-xs sm:text-sm lg:text-base bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                >
                  Sim, Encaminhar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
