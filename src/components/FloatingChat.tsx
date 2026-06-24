import React, { useState, useRef, useEffect, useCallback } from 'react'
import { MessageSquare, X, Send, Loader2, Phone, Mail, History, Plus, Trash2 } from 'lucide-react'
import { whatsappService } from '../services/whatsapp.service'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import { productsService } from '../services/products.service'
import { useNavigate } from 'react-router-dom'
import { env } from '../config/env'

interface ChatAction {
  label: string
  href: string
  type: 'primary' | 'secondary'
}

interface CouponCard {
  code: string
  name: string
  description?: string
  discountType: 'percentage' | 'fixed'
  discountValue: number
  minOrderValue?: number
  minProductQuantity?: number
  freeShipping?: boolean
  endDate?: string
}

interface ChatMessage {
  /** Unique message ID from the backend. Undefined for local-only / optimistic messages. */
  id?: string
  /** Temporary client-side ID assigned before the server confirms the message (optimistic). */
  clientTempId?: string
  role: 'user' | 'assistant' | 'admin'
  content: string
  timestamp: number
  actions?: ChatAction[]
  metadata?: {
    recommendedProducts?: Array<{
      id: string
      name: string
      price: number
      originalPrice?: number
      category?: string
      description?: string
      url: string
    }>
    couponCards?: CouponCard[]
    cartProducts?: Array<{
      id: string
      name: string
      quantity: number
      price: number
      image: string | null
    }>
    addedProducts?: Array<{
      id: string
      name: string
      quantity: number
    }>
    /** Layout estruturado: 'cart_summary' indica resposta com mini cards + followUp */
    responseLayout?: 'cart_summary' | string
    responseType?: string
    /** Texto da segunda parte da resposta (após [SPLIT]) para responseLayout=cart_summary */
    followUpText?: string
    parts?: Array<{
      type: 'text' | 'cart_items' | 'product_cards' | 'actions' | string
      text?: string
      items?: any[]
      products?: any[]
      actions?: any[]
    }>
    actionButtons?: any
    actions?: any
    parts_count?: number
    parts_order?: string[]
    split_converted?: boolean
    legacy_fallback_used?: boolean
    cards_position?: string
    clientDiagnostics?: {
      hadStructuredFormat?: boolean
      loadedFromHistory?: boolean
      sanitizedForClient?: boolean
      removedInternalMarkers?: boolean
      rebuiltCards?: boolean
      rebuiltButtons?: boolean
      rebuiltFromParts?: boolean
      legacyFallbackUsed?: boolean
      splitConverted?: boolean
    }
  }
}

type CornerPosition = 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'

const CLIENT_SCROLL_BOTTOM_THRESHOLD = 40

const normalizeChatActions = (actions: any): ChatAction[] | undefined => {
  if (!Array.isArray(actions)) return undefined

  const seen = new Set<string>()
  const normalized = actions
    .map((act: any) => ({
      label: String(act.label || act.text || 'Abrir'),
      href: String(act.href || act.url || ''),
      type: act.type === 'primary' ? 'primary' as const : 'secondary' as const
    }))
    .filter((act: ChatAction) => {
      if (!act.href) return false
      const key = `${act.label.toLowerCase()}|${act.href}|${act.type}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

  return normalized.length > 0 ? normalized : undefined
}

const sanitizeClientMessageText = (rawText: string) => {
  const original = rawText || ''
  const hadInternalMarkers = /\[(?:LINKS?|SPLIT|NAVEGAR|DEBUG|JSON|META|METADATA)[\s:]/i.test(original)
  const splitParts = original.split(/\[SPLIT\]/i)
  const introText = splitParts.shift() || ''
  const followUpText = splitParts.join('\n\n')

  const clean = (value: string) => value
    .replace(/\[LINKS?:\s*[^\]]+\]/gi, '')
    .replace(/\[NAVEGAR:\s*[^\]]+\]/gi, '')
    .replace(/\[DEBUG:\s*[^\]]+\]/gi, '')
    .replace(/\[META(?:DATA)?:\s*[^\]]+\]/gi, '')
    .replace(/```json[\s\S]*?```/gi, '')
    .replace(/^[ \t]*\/produtos\/\S+[ \t]*$/gmi, '')
    .replace(/^\s*\{[\s\S]*\}\s*$/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  return {
    content: clean(introText),
    followUpText: clean(followUpText),
    hadInternalMarkers: hadInternalMarkers || splitParts.length > 0
  }
}

const splitProductRecommendationText = (content: string, explicitFollowUp?: string) => {
  if (explicitFollowUp) {
    return {
      introText: content.trim(),
      followUpText: explicitFollowUp.trim(),
      usedFallback: false
    }
  }

  const cleanContent = content.trim()
  const followUpPatterns = [
    /\n\s*(Gostaria\s+[\s\S]+)$/i,
    /\n\s*(Quer\s+[\s\S]+)$/i,
    /\n\s*(Deseja\s+[\s\S]+)$/i,
    /\n\s*(Prefere\s+[\s\S]+)$/i,
    /\n\s*(Posso\s+[\s\S]+)$/i,
    /\n\s*(Se quiser[\s\S]+)$/i
  ]

  for (const pattern of followUpPatterns) {
    const match = cleanContent.match(pattern)
    if (!match || !match.index || match.index < 40) continue

    return {
      introText: cleanContent.slice(0, match.index).trim(),
      followUpText: match[1].trim(),
      usedFallback: true
    }
  }

  return {
    introText: cleanContent,
    followUpText: '',
    usedFallback: false
  }
}

const buildProductRecommendationParts = (
  content: string,
  products: any[],
  explicitFollowUp?: string,
  actions?: ChatAction[]
) => {
  const { introText, followUpText, usedFallback } = splitProductRecommendationText(content, explicitFollowUp)
  const parts: NonNullable<ChatMessage['metadata']>['parts'] = []

  if (introText) {
    parts.push({ type: 'text', role: 'assistant', text: introText } as any)
  }

  if (products.length > 0) {
    parts.push({ type: 'product_cards', products })
  }

  if (followUpText) {
    parts.push({ type: 'text', role: 'assistant', text: followUpText } as any)
  }

  if (actions && actions.length > 0) {
    parts.push({ type: 'actions', actions })
  }

  return {
    parts,
    splitConverted: Boolean(explicitFollowUp),
    legacyFallbackUsed: usedFallback,
    partsOrder: parts.map(part => part.type)
  }
}

const buildClientChatMessage = (historyMessage: any): ChatMessage => {
  const metadata = historyMessage.metadata ? { ...historyMessage.metadata } : (undefined as ChatMessage['metadata'] | undefined)
  const rawContent = typeof historyMessage.content === 'string' ? historyMessage.content : ''
  const sanitized = sanitizeClientMessageText(rawContent)
  const metadataActions = normalizeChatActions(metadata?.actionButtons || metadata?.actions)
  const actions = metadataActions

  const clientMetadata = metadata || (sanitized.followUpText ? {} : undefined)

  if (clientMetadata) {
    if (sanitized.followUpText && !clientMetadata.followUpText) {
      clientMetadata.followUpText = sanitized.followUpText
    }

    if (Array.isArray(clientMetadata.recommendedProducts)) {
      clientMetadata.recommendedProducts = clientMetadata.recommendedProducts.map((prod: any) => ({
        ...prod,
        url: prod.url || `/produtos/${prod.id}`
      }))
    }

    if (!Array.isArray(clientMetadata.parts) && Array.isArray(clientMetadata.recommendedProducts) && clientMetadata.recommendedProducts.length > 0) {
      const structured = buildProductRecommendationParts(
        sanitized.content,
        clientMetadata.recommendedProducts,
        clientMetadata.followUpText,
        actions
      )

      clientMetadata.parts = structured.parts
      clientMetadata.responseLayout = clientMetadata.responseLayout || 'product_recommendation'
      clientMetadata.parts_count = structured.parts.length
      clientMetadata.parts_order = structured.partsOrder
      clientMetadata.split_converted = structured.splitConverted
      clientMetadata.legacy_fallback_used = structured.legacyFallbackUsed
      clientMetadata.cards_position = 'between_intro_and_follow_up'
      clientMetadata.followUpText = undefined
    }

    clientMetadata.clientDiagnostics = {
      hadStructuredFormat: Boolean(clientMetadata.parts || clientMetadata.responseLayout || clientMetadata.recommendedProducts?.length || clientMetadata.cartProducts?.length || sanitized.hadInternalMarkers),
      loadedFromHistory: true,
      sanitizedForClient: true,
      removedInternalMarkers: sanitized.hadInternalMarkers,
      rebuiltCards: Boolean(clientMetadata.recommendedProducts?.length || clientMetadata.cartProducts?.length || clientMetadata.parts?.length),
      rebuiltButtons: Boolean(actions?.length),
      rebuiltFromParts: Boolean(clientMetadata.parts?.length),
      legacyFallbackUsed: Boolean(clientMetadata.legacy_fallback_used),
      splitConverted: Boolean(clientMetadata.split_converted)
    }
  }

  if (sanitized.hadInternalMarkers || clientMetadata?.clientDiagnostics?.rebuiltCards || clientMetadata?.clientDiagnostics?.rebuiltButtons) {
    console.debug('[Kaia widget] mensagem de historico sanitizada para o cliente', clientMetadata?.clientDiagnostics)
  }

  return {
    id: historyMessage.id,
    role: historyMessage.role as 'user' | 'assistant' | 'admin',
    content: sanitized.content,
    timestamp: historyMessage.timestamp || Date.now(),
    actions,
    metadata: clientMetadata
  }
}

const FloatingChat: React.FC = () => {
  const { isAuthenticated, user } = useAuth()
  const { addProduct, removeItem, items, refreshCart, clearCart, updateQuantity, getTotal, getItemCount } = useCart()
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isTypingFollowUp, setIsTypingFollowUp] = useState(false)
  const [addingProductIds, setAddingProductIds] = useState<Record<string, 'loading' | 'success'>>({})
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const [escalationStatus, setEscalationStatus] = useState<'none' | 'human_needed' | 'human_assigned'>('none')
  const [showEscalationForm, setShowEscalationForm] = useState(false)
  const [escalationChannel, setEscalationChannel] = useState<'site' | 'whatsapp' | 'email' | null>(null)
  // Controle de contexto: rastreia o que o bot está aguardando como resposta numérica
  const [pendingContext, setPendingContext] = useState<'none' | 'awaiting_support_channel'>("none")
  const sendingMessageRef = useRef(false)
  const lastSentFingerprintRef = useRef<string>('')
  const [contactName, setContactName] = useState(user?.name || '')
  const contactPhone = user?.phone || ''
  const [contactEmail, setContactEmail] = useState(user?.email || '')

  // Custom states for History and New Chat buttons
  const [activeTab, setActiveTab] = useState<'chat' | 'history'>('chat')
  const [showNewChatConfirm, setShowNewChatConfirm] = useState(false)
  const [showDeEscalateConfirm, setShowDeEscalateConfirm] = useState(false)
  const [sessionsList, setSessionsList] = useState<Array<{ session_id: string; last_message_at: string; snippet?: string }>>([])
  const [loadingSessions, setLoadingSessions] = useState(false)

  const [currentSessionId, setCurrentSessionId] = useState<string>(() => {
    let sessionId = localStorage.getItem('sanare_site_session')
    if (!sessionId) {
      sessionId = 'session_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
      localStorage.setItem('sanare_site_session', sessionId)
    }
    return sessionId
  })
  const [unreadCount, setUnreadCount] = useState<number>(0)
  const autoScrollLockedRef = useRef(false)
  /** Items removidos via lixeira nos mini cards do carrinho. Chave = productId. */
  const [removedCartItems, setRemovedCartItems] = useState<Record<string, { name: string; qty: number; productObj: { id: string; name: string; price: number; image: string | null } }>>({})
  /** Código do cupão que foi copiado recentemente (para feedback visual temporário) */
  const [copiedCoupon, setCopiedCoupon] = useState<string | null>(null)

  const resetChatFlowState = useCallback(() => {
    setEscalationStatus('none')
    setEscalationChannel(null)
    setShowEscalationForm(false)
    setPendingContext('none')
    setShowDeEscalateConfirm(false)
  }, [])

  const startFreshChatSession = useCallback(async () => {
    setIsLoading(true)
    resetChatFlowState()
    try {
      const token = localStorage.getItem('sanare_token') || localStorage.getItem('token')
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (token) headers['Authorization'] = `Bearer ${token}`

      const response = await fetch(`${env.apiUrl}/chat/site/conversation/new`, { method: 'POST', headers })
      if (!response.ok) return

      const result = await response.json()
      if (!result.success || !result.sessionId) return

      localStorage.setItem('sanare_site_session', result.sessionId)
      setCurrentSessionId(result.sessionId)
      setMessages([])
      setActiveTab('chat')
      isInitialHistoryLoad.current = true

      const welcomeText = `Olá, ${user?.name || 'Cliente'}! \nEu sou a Kaia, sua assistente virtual da Kapsu. \nComo posso te ajudar hoje? 😊`
      setMessages([{ role: 'assistant', content: welcomeText, timestamp: Date.now() }])
    } catch (err) {
      console.error('Erro ao iniciar conversa limpa:', err)
    } finally {
      setIsLoading(false)
    }
  }, [resetChatFlowState, user?.name])

  const playNotificationSound = useCallback(() => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();

      const playTone = (freq: number, start: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, start);

        gain.gain.setValueAtTime(0.08, start);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(start);
        osc.stop(start + duration);
      };

      const now = ctx.currentTime;
      playTone(587.33, now, 0.25); // D5
      playTone(880.00, now + 0.08, 0.35); // A5
    } catch (err) {
      console.error('Failed to play sound:', err);
    }
  }, []);

  // Posições pré-definidas para as 4 quinas
  const getCornerPosition = (corner: CornerPosition) => {
    const isMobile = window.innerWidth < 640
    const buttonSize = isMobile ? 56 : 64 // w-14 (56px) no mobile, w-16 (64px) no desktop
    const padding = isMobile ? 12 : 24 // Menos padding no mobile

    switch (corner) {
      case 'bottom-right':
        return { x: window.innerWidth - buttonSize - padding, y: window.innerHeight - buttonSize - padding }
      case 'bottom-left':
        return { x: padding, y: window.innerHeight - buttonSize - padding }
      case 'top-right':
        return { x: window.innerWidth - buttonSize - padding, y: padding }
      case 'top-left':
        return { x: padding, y: padding }
      default:
        return { x: window.innerWidth - buttonSize - padding, y: window.innerHeight - buttonSize - padding }
    }
  }

  const getChatPosition = (corner: CornerPosition, buttonPos?: { x: number; y: number }) => {
    // Em mobile, o chat tem tamanho reduzido (não ocupa a tela toda)
    const isMobile = window.innerWidth < 640
    const chatWidth = isMobile ? Math.min(340, window.innerWidth - 32) : 380
    const chatHeight = isMobile ? Math.min(500, window.innerHeight - 100) : 600
    const padding = isMobile ? 16 : 24

    // Se uma posição do botão foi fornecida, detecta a quina baseada nessa posição
    let cornerToUse = corner
    if (buttonPos) {
      cornerToUse = detectNearestCorner(buttonPos.x, buttonPos.y)
    }

    // Posiciona o chat na mesma quina (tanto mobile quanto desktop)
    switch (cornerToUse) {
      case 'bottom-right':
        return { x: window.innerWidth - chatWidth - padding, y: window.innerHeight - chatHeight - padding }
      case 'bottom-left':
        return { x: padding, y: window.innerHeight - chatHeight - padding }
      case 'top-right':
        return { x: window.innerWidth - chatWidth - padding, y: padding }
      case 'top-left':
        return { x: padding, y: padding }
      default:
        return { x: window.innerWidth - chatWidth - padding, y: window.innerHeight - chatHeight - padding }
    }
  }

  // Carrega a preferência de quina do usuário (salva em localStorage)
  const [selectedCorner, setSelectedCorner] = useState<CornerPosition>(() => {
    const saved = localStorage.getItem('floatingChat_corner')
    if (saved && ['bottom-right', 'bottom-left', 'top-right', 'top-left'].includes(saved)) {
      return saved as CornerPosition
    }
    return 'bottom-right' // Padrão: canto inferior direito
  })

  // Carrega a posição do botão salva no localStorage, ou usa a posição da quina
  const loadSavedButtonPosition = (): { x: number; y: number } => {
    try {
      // Primeiro tenta carregar a posição salva quando o chat foi aberto (prioridade)
      const savedOnOpen = localStorage.getItem('floatingChat_buttonPosition_onOpen')
      if (savedOnOpen) {
        const parsed = JSON.parse(savedOnOpen)
        if (parsed && typeof parsed.x === 'number' && typeof parsed.y === 'number') {
          return { x: parsed.x, y: parsed.y }
        }
      }
      // Se não encontrar, tenta a posição normal
      const saved = localStorage.getItem('floatingChat_buttonPosition')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed && typeof parsed.x === 'number' && typeof parsed.y === 'number') {
          return { x: parsed.x, y: parsed.y }
        }
      }
    } catch (error) {
      console.error('Erro ao carregar posição do botão:', error)
    }
    const cornerPos = getCornerPosition(selectedCorner)
    return cornerPos
  }

  // Posições calculadas baseadas na quina selecionada ou posição salva
  const [buttonPosition, setButtonPosition] = useState(() => loadSavedButtonPosition())
  const [chatPosition, setChatPosition] = useState(() => getChatPosition(selectedCorner))

  const [isDraggingButton, setIsDraggingButton] = useState(false)
  const [isDraggingChat, setIsDraggingChat] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const buttonRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  // Ref para rastrear a última posição real do botão (para evitar problemas de state assíncrono)
  const lastButtonPositionRef = useRef<{ x: number; y: number }>(buttonPosition)

  const typeMessageText = useCallback((fullText: string, messageId: number, onComplete?: () => void) => {
    let currentText = ''
    let charIndex = 0
    // Velocidade dinâmica baseada no tamanho da mensagem:
    // Garante que mensagens longas digitem mais rápido para não demorar demais
    const chunkSize = Math.max(2, Math.ceil(fullText.length / 100))
    const speed = 12

    const timer = setInterval(() => {
      if (charIndex >= fullText.length) {
        clearInterval(timer)
        setMessages(prev => prev.map(m => m.timestamp === messageId ? { ...m, content: fullText } : m))
        if (onComplete) onComplete()
      } else {
        currentText += fullText.substring(charIndex, charIndex + chunkSize)
        charIndex += chunkSize
        setMessages(prev => prev.map(m => m.timestamp === messageId ? { ...m, content: currentText } : m))

        // Mantém o scroll no final se o usuário já estiver próximo ao final
        const container = messagesContainerRef.current
        if (container) {
          const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight
          if (!autoScrollLockedRef.current && distanceFromBottom <= CLIENT_SCROLL_BOTTOM_THRESHOLD) {
            container.scrollTop = container.scrollHeight
          }
        }
      }
    }, speed)
  }, [])

  const getOrCreateSessionId = useCallback(() => {
    return currentSessionId
  }, [currentSessionId])

  // Atualiza posições quando a quina muda ou a janela redimensiona
  useEffect(() => {
    const updatePositions = () => {
      // Atualiza posição do chat quando selectedCorner muda e o chat está aberto
      // Usa a posição atual do botão para calcular a quina correta
      if (isOpen) {
        setChatPosition(getChatPosition(selectedCorner, lastButtonPositionRef.current))
      }
      // Não atualiza a posição do botão aqui - isso é feito em toggleChat e changeCorner
    }

    // Só atualiza quando selectedCorner muda, não quando isOpen muda
    updatePositions()

    window.addEventListener('resize', updatePositions)
    return () => window.removeEventListener('resize', updatePositions)
  }, [selectedCorner, isOpen]) // Incluído isOpen para atualizar chat quando necessário

  // Garante que quando o chat fecha, a posição do botão seja restaurada corretamente
  // Usa um timeout para garantir que roda DEPOIS do toggleChat
  useEffect(() => {
    if (!isOpen) {
      // Usa setTimeout para garantir que roda DEPOIS do toggleChat ter terminado
      const timeoutId = setTimeout(() => {
        // Verifica se ainda existe a chave temporária (se não existe, toggleChat já restaurou)
        const savedOnOpen = localStorage.getItem('floatingChat_buttonPosition_onOpen')
        if (savedOnOpen) {
          // Quando o chat fecha, restaura a posição salva
          // Isso garante que mesmo se outros useEffects rodarem, a posição correta seja mantida
          const savedPosition = loadSavedButtonPosition()
          setButtonPosition(savedPosition)
          // Atualiza o ref com a posição restaurada
          lastButtonPositionRef.current = savedPosition
          // Remove a chave temporária APÓS restaurar
          try {
            localStorage.removeItem('floatingChat_buttonPosition_onOpen')
          } catch (error) {
            console.error('Erro ao remover posição temporária:', error)
          }
        }
      }, 0) // Roda no próximo tick do event loop, após toggleChat

      return () => clearTimeout(timeoutId)
    }
  }, [isOpen]) // Roda quando isOpen muda

  const scrollToBottom = useCallback((force = false) => {
    const container = messagesContainerRef.current
    if (!container) return
    const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight
    const isCloseToBottom = distanceFromBottom <= CLIENT_SCROLL_BOTTOM_THRESHOLD
    if (force || (!autoScrollLockedRef.current && isCloseToBottom)) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
      autoScrollLockedRef.current = false
    } else if (distanceFromBottom > CLIENT_SCROLL_BOTTOM_THRESHOLD) {
      console.debug('[Kaia widget] auto-scroll bloqueado: usuario lendo historico')
    }
  }, [])

  const handleMessagesScroll = useCallback(() => {
    const container = messagesContainerRef.current
    if (!container) return

    const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight
    const isAtBottom = distanceFromBottom <= CLIENT_SCROLL_BOTTOM_THRESHOLD
    autoScrollLockedRef.current = !isAtBottom

    if (isAtBottom) {
      autoScrollLockedRef.current = false
    }
  }, [])

  // Scroll inteligente para a última mensagem
  useEffect(() => {
    scrollToBottom(false)
  }, [messages, scrollToBottom])

  // Track if we've done the initial load — this prevents blinking on polling
  const isInitialHistoryLoad = useRef(true)

  const fetchHistory = useCallback(async (forceFullReplace = false) => {
    const sessionId = getOrCreateSessionId()

    const showWelcomeMessageIfNeeded = () => {
      if (isAuthenticated) {
        setMessages(prev => {
          if (prev.length === 0) {
            const welcomeId = Date.now()
            const welcomeText = `Olá, ${user?.name || 'Cliente'}! \nEu sou a Kaia, sua assistente virtual da Kapsu. \nComo posso te ajudar hoje? 😊`
            setTimeout(() => {
              typeMessageText(welcomeText, welcomeId)
            }, 300)
            return [
              {
                role: 'assistant' as const,
                content: '',
                timestamp: welcomeId
              }
            ]
          }
          return prev
        })
      }
    }

    try {
      const token = localStorage.getItem('sanare_token') || localStorage.getItem('token')
      const headers: Record<string, string> = {}
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }
      const response = await fetch(`${env.apiUrl}/chat/site/conversation/${sessionId}`, { headers })
      if (response.ok) {
        const result = await response.json()
        if (result.success && result.data && Array.isArray(result.data.history)) {
          if (result.data.history.length > 0) {
            const incoming: ChatMessage[] = result.data.history.map(buildClientChatMessage)

            if (forceFullReplace || isInitialHistoryLoad.current) {
              // First open or forced reload: replace everything from server
              setMessages(incoming)
              isInitialHistoryLoad.current = false
            } else {
              // Subsequent polls: merge by id to avoid duplicating messages already rendered
              setMessages(prev => {
                // Build sets of existing database IDs for fast lookup
                const existingIds = new Set(prev.filter(m => m.id).map(m => m.id!))

                // Find truly new messages from the server
                const trulyNew = incoming.filter(m => {
                  if (m.id) return !existingIds.has(m.id)
                  return true
                })

                if (trulyNew.length === 0) {
                  // No new messages, but ensure no duplicate IDs are in state
                  const finalUnique: ChatMessage[] = []
                  const seenIds = new Set<string>()
                  for (const msg of prev) {
                    if (msg.id) {
                      if (seenIds.has(msg.id)) continue
                      seenIds.add(msg.id)
                    }
                    finalUnique.push(msg)
                  }
                  return finalUnique
                }

                // Track incoming admin/assistant messages for notifications
                const incomingAlerts = trulyNew.filter(m => m.role === 'admin' || m.role === 'assistant')
                if (incomingAlerts.length > 0) {
                  playNotificationSound()
                  if (autoScrollLockedRef.current) {
                    console.debug('[Kaia widget] nova mensagem recebida com auto-scroll pausado')
                  }
                  if (!isOpen) {
                    setUnreadCount(c => c + incomingAlerts.length)
                  }
                }

                let merged = [...prev]

                // Process each truly new message
                for (const newMsg of trulyNew) {
                  // Se é mensagem do usuário, substitui otimista local pelo ID do banco
                  if (newMsg.role === 'user') {
                    const optIndex = merged.findIndex(m =>
                      m.clientTempId &&
                      m.role === 'user' &&
                      (m.content === newMsg.content || m.content.trim() === newMsg.content.trim()) &&
                      Math.abs(m.timestamp - newMsg.timestamp) < 15000
                    )

                    if (optIndex !== -1) {
                      merged[optIndex] = newMsg
                      continue
                    }
                  }

                  // Se é resposta da Kaia, evita duplicar mensagem já renderizada localmente sem ID
                  if (newMsg.role === 'assistant' || newMsg.role === 'admin') {
                    const localDupIndex = merged.findIndex(m =>
                      (m.role === 'assistant' || m.role === 'admin') &&
                      !m.id &&
                      m.content &&
                      newMsg.content &&
                      (m.content === newMsg.content || m.content.trim() === newMsg.content.trim()) &&
                      Math.abs(m.timestamp - (newMsg.timestamp || 0)) < 60000
                    )

                    if (localDupIndex !== -1) {
                      merged[localDupIndex] = {
                        ...newMsg,
                        actions: merged[localDupIndex].actions || newMsg.actions,
                      }
                      continue
                    }
                  }

                  merged.push(newMsg)
                }

                // Final safety deduplication pass by message ID to prevent any duplicate rendering
                const finalUnique: ChatMessage[] = []
                const seenIds = new Set<string>()
                for (const msg of merged) {
                  if (msg.id) {
                    if (seenIds.has(msg.id)) continue
                    seenIds.add(msg.id)
                  }
                  finalUnique.push(msg)
                }

                return finalUnique
              })
            }
          } else {
            if (forceFullReplace || isInitialHistoryLoad.current) {
              showWelcomeMessageIfNeeded()
              isInitialHistoryLoad.current = false
            }
          }
        } else {
          if (forceFullReplace || isInitialHistoryLoad.current) {
            showWelcomeMessageIfNeeded()
            isInitialHistoryLoad.current = false
          }
        }
      } else {
        if (forceFullReplace || isInitialHistoryLoad.current) {
          showWelcomeMessageIfNeeded()
          isInitialHistoryLoad.current = false
        }
      }
    } catch (err) {
      console.error('Erro ao buscar histórico de mensagens:', err)
      if (forceFullReplace || isInitialHistoryLoad.current) {
        showWelcomeMessageIfNeeded()
        isInitialHistoryLoad.current = false
      }
    }
  }, [isAuthenticated, user?.name, typeMessageText, getOrCreateSessionId, playNotificationSound, isOpen])

  // Carrega e sincroniza o status da conversa com o backend
  useEffect(() => {
    const syncConversation = async () => {
      const sessionId = getOrCreateSessionId()

      try {
        const token = localStorage.getItem('sanare_token') || localStorage.getItem('token')
        const headers: Record<string, string> = {}
        if (token) {
          headers['Authorization'] = `Bearer ${token}`
        }
        const response = await fetch(`${env.apiUrl}/chat/site/conversation/${sessionId}`, { headers })
        if (response.ok) {
          const result = await response.json()
          if (result.success && result.data && result.data.conversation) {
            const conv = result.data.conversation
            if (conv.status === 'human_needed' || conv.status === 'human_assigned') {
              setEscalationStatus(conv.status)
              if (conv.preferred_contact) {
                setEscalationChannel(conv.preferred_contact)
              } else {
                setEscalationChannel('site')
              }
            } else {
              setEscalationStatus('none')
              setEscalationChannel(null)
              setShowEscalationForm(false)
              setPendingContext('none')
            }
          }
        }
      } catch (err) {
        console.error('Erro ao sincronizar conversa com backend:', err)
      }
    }

    isInitialHistoryLoad.current = true
    syncConversation()
    fetchHistory(true) // Force full replace on load/session change

    const interval = setInterval(() => {
      syncConversation()
      fetchHistory(false) // Incremental polling
    }, 3000)

    return () => clearInterval(interval)
  }, [currentSessionId, fetchHistory, getOrCreateSessionId])

  useEffect(() => {
    if (isOpen) {
      setUnreadCount(0)
    }
  }, [isOpen])


  // Função auxiliar para buscar produto pelo nome
  const findProductByName = async (productName: string): Promise<any | null> => {
    try {
      // Normaliza o nome do produto (remove acentos, converte para minúsculas)
      const normalizeText = (text: string) => {
        return text
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .trim()
      }

      const normalizedSearch = normalizeText(productName)
      const allProducts = await productsService.getAll()

      // Busca produtos que correspondem ao nome
      const matchingProducts = allProducts.filter(product => {
        const normalizedName = normalizeText(product.name)
        return normalizedName.includes(normalizedSearch) || normalizedSearch.includes(normalizedName)
      })

      // Retorna o produto mais relevante (exata correspondência primeiro)
      if (matchingProducts.length > 0) {
        // Prioriza correspondência exata
        const exactMatch = matchingProducts.find(p => normalizeText(p.name) === normalizedSearch)
        if (exactMatch) return exactMatch

        // Retorna o primeiro resultado
        return matchingProducts[0]
      }

      return null
    } catch (error) {
      console.error('Erro ao buscar produto:', error)
      return null
    }
  }

  // Função para processar ações da IA (adicionar/remover produtos)
  const processAIActions = async (aiData: any): Promise<Array<{ type: 'added' | 'removed' | 'error'; message: string }>> => {
    const actionMessages: Array<{ type: 'added' | 'removed' | 'error'; message: string }> = []

    const extractedMessage = aiData.extractedMessage
    if (!extractedMessage) return actionMessages

    const intent = extractedMessage.intent
    const entities = extractedMessage.entities || {}
    const produto = entities.produto

    const actionDataProducts = extractedMessage.action?.actionData?.products;

    // Processa adição de produtos
    const shouldAddProduct = (produto || (actionDataProducts && actionDataProducts.length > 0)) && (
      intent === 'iniciar_compra' ||
      intent === 'adicionar_ao_carrinho' ||
      intent === 'pedir_recomendacao' ||
      intent === 'pedido_de_orcamento'
    );

    if (shouldAddProduct) {
      const results: string[] = []
      const errors: string[] = []

      let productsToAdd: Array<{ name: string, qty: number }> = [];
      if (actionDataProducts && actionDataProducts.length > 0) {
        productsToAdd = actionDataProducts.map((p: any) => ({ name: p.product_name, qty: p.quantity || 1 }));
      } else if (produto) {
        const prodArray = Array.isArray(produto) ? produto : [produto];
        let qty = 1;
        if (entities.quantidade) {
          const parsedQty = parseInt(String(entities.quantidade));
          if (!isNaN(parsedQty) && parsedQty > 0) qty = parsedQty;
        }
        productsToAdd = prodArray.map(p => ({ name: p, qty }));
      }

      for (const reqProduct of productsToAdd) {
        if (!reqProduct.name || typeof reqProduct.name !== 'string') continue

        try {
          const product = await findProductByName(reqProduct.name)
          if (product) {
            // Se for convidado, atualiza o carrinho local
            if (!isAuthenticated) {
              await addProduct(product, reqProduct.qty)
            }
            results.push(`${product.name} (${reqProduct.qty}x)`)
          } else {
            errors.push(`"${reqProduct.name}"`)
          }
        } catch (error: any) {
          console.error('Erro ao adicionar produto:', error)
          errors.push(`"${reqProduct.name}"`)
        }
      }

      // Se autenticado, recarrega o estado do carrinho atualizado do banco
      if (isAuthenticated && results.length > 0) {
        await refreshCart()
      }

      if (results.length > 0) {
        actionMessages.push({
          type: 'added',
          message: `✅ ${results.length === 1 ? 'Produto' : 'Produtos'} adicionado${results.length > 1 ? 's' : ''} ao carrinho: ${results.join(', ')}`,
        })
      }

      if (errors.length > 0) {
        actionMessages.push({
          type: 'error',
          message: `❌ Não encontrei ${errors.length === 1 ? 'o produto' : 'os produtos'}: ${errors.join(', ')}`,
        })
      }
    }

    // Processa limpeza do carrinho
    if (intent === 'limpar_contexto') {
      try {
        if (!isAuthenticated) {
          await clearCart()
        } else {
          await refreshCart()
        }
        actionMessages.push({
          type: 'removed',
          message: '✅ Carrinho limpo com sucesso!',
        })
      } catch (error: any) {
        console.error('Erro ao limpar carrinho:', error)
        actionMessages.push({
          type: 'error',
          message: `❌ Erro ao limpar carrinho: ${error.message}`,
        })
      }
    }

    // Processa finalização da compra
    if (intent === 'finalizar_compra') {
      if (items.length === 0) {
        actionMessages.push({
          type: 'error',
          message: '❌ Seu carrinho está vazio. Adicione produtos antes de finalizar.',
        })
      } else {
        navigate('/checkout')
        actionMessages.push({
          type: 'added',
          message: '✅ Redirecionando para finalizar sua compra...',
        })
      }
    }

    // Processa atualização de quantidade
    if (intent === 'atualizar_quantidade' && produto && entities.quantidade) {
      const productsToUpdate = Array.isArray(produto) ? produto : [produto]
      const newQuantity = parseInt(String(entities.quantidade))

      if (isNaN(newQuantity) || newQuantity <= 0) {
        actionMessages.push({
          type: 'error',
          message: '❌ Quantidade inválida. Por favor, informe um número maior que zero.',
        })
        return actionMessages
      }

      const results: string[] = []
      const errors: string[] = []

      for (const productName of productsToUpdate) {
        if (!productName || typeof productName !== 'string') continue

        try {
          const product = await findProductByName(productName)
          if (product) {
            const cartItem = items.find(item => item.product?.id === product.id)
            if (cartItem) {
              if (!isAuthenticated) {
                await updateQuantity(cartItem.id, newQuantity)
              }
              results.push(`${product.name} (${newQuantity}x)`)
            } else {
              errors.push(`"${productName}" (não está no carrinho)`)
            }
          } else {
            errors.push(`"${productName}" (não encontrado)`)
          }
        } catch (error: any) {
          console.error('Erro ao atualizar quantidade:', error)
          errors.push(`"${productName}"`)
        }
      }

      if (isAuthenticated && results.length > 0) {
        await refreshCart()
      }

      if (results.length > 0) {
        actionMessages.push({
          type: 'added',
          message: `✅ Quantidade atualizada: ${results.join(', ')}`,
        })
      }

      if (errors.length > 0) {
        actionMessages.push({
          type: 'error',
          message: `❌ Não foi possível atualizar: ${errors.join(', ')}`,
        })
      }
    }

    // Processa troca de produtos
    if (intent === 'trocar_produto') {
      const produtoAntigo = entities.produto_antigo
      const produtoNovo = entities.produto_novo

      if (!produtoAntigo || !produtoNovo) {
        actionMessages.push({
          type: 'error',
          message: '❌ Não consegui identificar qual produto trocar. Por favor, seja mais específico (ex: "troque X por Y").',
        })
        return actionMessages
      }

      let quantity = 1
      if (entities.quantidade) {
        const qty = parseInt(String(entities.quantidade))
        if (!isNaN(qty) && qty > 0) {
          quantity = qty
        }
      }

      try {
        const oldProduct = await findProductByName(produtoAntigo)
        const newProduct = await findProductByName(produtoNovo)

        if (!oldProduct) {
          actionMessages.push({
            type: 'error',
            message: `❌ Não encontrei o produto "${produtoAntigo}" no sistema.`,
          })
          return actionMessages
        }

        if (!newProduct) {
          actionMessages.push({
            type: 'error',
            message: `❌ Não encontrei o produto "${produtoNovo}" no sistema.`,
          })
          return actionMessages
        }

        const oldCartItem = items.find(item => item.product?.id === oldProduct.id)
        if (!oldCartItem) {
          actionMessages.push({
            type: 'error',
            message: `❌ O produto "${oldProduct.name}" não está no seu carrinho.`,
          })
          return actionMessages
        }

        if (!isAuthenticated) {
          await removeItem(oldCartItem.id)
          await addProduct(newProduct, quantity)
        }

        if (isAuthenticated) {
          await refreshCart()
        }

        actionMessages.push({
          type: 'added',
          message: `✅ Produto trocado: removido "${oldProduct.name}" e adicionado "${newProduct.name}" (${quantity}x)`,
        })
      } catch (error: any) {
        console.error('Erro ao trocar produto:', error)
        actionMessages.push({
          type: 'error',
          message: `❌ Erro ao trocar produto: ${error.message}`,
        })
      }
    }

    // Processa remoção de produtos
    if (intent === 'remover_produto' && (produto || (actionDataProducts && actionDataProducts.length > 0))) {
      const results: string[] = []
      const errors: string[] = []

      let productsToRemove: Array<{ name: string; quantity: number | null; action: string | null }> = [];
      if (actionDataProducts && actionDataProducts.length > 0) {
        productsToRemove = actionDataProducts.map((p: any) => ({
          name: p.product_name,
          quantity: p.quantity !== undefined ? p.quantity : null,
          action: p.action || null
        })).filter((p: any) => p.name);
      } else if (produto) {
        const prodArray = Array.isArray(produto) ? produto : [produto];
        let qty = null;
        if (entities.quantidade) {
          const parsedQty = parseInt(String(entities.quantidade));
          if (!isNaN(parsedQty) && parsedQty > 0) qty = parsedQty;
        }
        productsToRemove = prodArray.map(p => ({
          name: p,
          quantity: qty,
          action: qty ? 'REMOVE_QUANTITY' : 'REMOVE_ALL_PRODUCT'
        }));
      }

      for (const reqProduct of productsToRemove) {
        if (!reqProduct.name || typeof reqProduct.name !== 'string') continue

        try {
          const product = await findProductByName(reqProduct.name)
          if (product) {
            const cartItem = items.find(item => item.product?.id === product.id)
            if (cartItem) {
              if (!isAuthenticated) {
                let productAction = reqProduct.action || 'REMOVE_ALL_PRODUCT';
                if (!reqProduct.action && reqProduct.quantity !== null && reqProduct.quantity > 0) {
                  productAction = 'REMOVE_QUANTITY';
                }

                if (productAction === 'REMOVE_QUANTITY') {
                  const requestedQty = reqProduct.quantity || 1;
                  const currentQty = cartItem.quantity;
                  const newQty = currentQty - requestedQty;

                  if (newQty > 0) {
                    await updateQuantity(cartItem.id, newQty)
                    results.push(`${product.name} (reduzido para ${newQty})`)
                  } else {
                    await removeItem(cartItem.id)
                    results.push(`${product.name} (removido)`)
                  }
                } else {
                  await removeItem(cartItem.id)
                  results.push(`${product.name} (removido)`)
                }
              } else {
                results.push(product.name)
              }
            } else {
              errors.push(`"${reqProduct.name}" (não está no carrinho)`)
            }
          } else {
            errors.push(`"${reqProduct.name}" (não encontrado)`)
          }
        } catch (error: any) {
          console.error('Erro ao remover produto:', error)
          errors.push(`"${reqProduct.name}"`)
        }
      }

      if (isAuthenticated && results.length > 0) {
        await refreshCart()
      }

      if (results.length > 0) {
        actionMessages.push({
          type: 'removed',
          message: `✅ ${results.length === 1 ? 'Produto' : 'Produtos'} removido/alterado no carrinho: ${results.join(', ')}`,
        })
      }

      if (errors.length > 0) {
        actionMessages.push({
          type: 'error',
          message: `❌ Não foi possível remover: ${errors.join(', ')}`,
        })
      }
    } return actionMessages
  }

  type NotificationChoicePayload = {
    type: 'notification_preference_choice'
    channel?: 'email' | 'whatsapp'
    notificationType: string
    action: string
    source?: string
  }

  const navigateToNotifications = () => {
    const target = isAuthenticated
      ? '/perfil?section=notifications'
      : `/login?redirect=${encodeURIComponent('/perfil?section=notifications')}`
    navigate(target)
    setIsOpen(false)
  }

  const parseNotificationChoiceFromActionUrl = (url: string): NotificationChoicePayload | null => {
    if (!url.startsWith('action://notification-preference')) return null
    const query = url.includes('?') ? url.split('?')[1] : ''
    const params = new URLSearchParams(query)
    const notificationType = params.get('notificationType')
    if (!notificationType) return null
    const channel = params.get('channel') as 'email' | 'whatsapp' | null
    const payload: NotificationChoicePayload = {
      type: 'notification_preference_choice',
      channel: channel || undefined,
      notificationType,
      action: params.get('action') || 'disable',
      source: 'button',
    }
    if (params.get('scope') === 'both') {
      (payload as NotificationChoicePayload & { scope?: string }).scope = 'both'
    }
    return payload
  }

  const handleSupportAction = async (url: string) => {
    const query = url.includes('?') ? url.split('?')[1] : ''
    const params = new URLSearchParams(query)
    const channel = params.get('channel')
    const intent = params.get('intent')

    if (channel === 'whatsapp') {
      await handleWhatsAppHandoff()
      return
    }

    if (channel === 'site') {
      resetChatFlowState()
      setEscalationChannel('site')
      setEscalationStatus('human_needed')
      try {
        await whatsappService.escalateSiteChat(
          'site',
          undefined, undefined, undefined,
          'Cliente escolheu atendimento via chat do site.'
        )
      } catch (err) {
        console.error('Erro ao registrar escalação para o site:', err)
      }
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Certo! Um atendente irá continuar aqui no chat do site. Enquanto isso, pode descrever sua dúvida. 👇',
        timestamp: Date.now(),
      }])
      return
    }

    if (channel === 'email') {
      resetChatFlowState()
      setShowEscalationForm(true)
      setEscalationChannel('email')
      return
    }

    if (intent === 'email_help' || intent === 'cpf_help') {
      await sendMessageToServer(`action://support?intent=${intent}`, { skipUserBubble: true })
    }
  }

  const handleChatActionUrl = (url: string, label?: string) => {
    const normalizedLabel = (label || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()

    const isNotificationsNav =
      (url.includes('/perfil') && url.includes('notification')) ||
      url.includes('section=notifications') ||
      normalizedLabel === 'ver configuracoes' ||
      normalizedLabel === 'abrir notificacoes'

    if (isNotificationsNav && !url.startsWith('action://')) {
      navigateToNotifications()
      return
    }

    const structuredChoice = parseNotificationChoiceFromActionUrl(url)
    if (structuredChoice?.notificationType === 'view_settings') {
      navigateToNotifications()
      return
    }
    if (structuredChoice) {
      sendMessageToServer(label || 'Escolha de notificação', { notificationChoice: structuredChoice })
      return
    }
    if (url.startsWith('action://support')) {
      void handleSupportAction(url)
      return
    }
    if (url.startsWith('https://wa.me') || url.startsWith('http://') || url.startsWith('https://')) {
      window.open(url, '_blank', 'noopener,noreferrer')
      return
    }
    if (url.startsWith('action://copy-coupon')) {
      const query = url.includes('?') ? url.split('?')[1] : ''
      const code = new URLSearchParams(query).get('code')
      if (code) {
        navigator.clipboard.writeText(code).then(() => {
          setCopiedCoupon(code)
          setTimeout(() => setCopiedCoupon(null), 2500)
        }).catch(() => {
          // Fallback para browsers sem suporte à API
          window.prompt('Copie o código do cupão:', code)
        })
      }
      return
    }
    if (url.startsWith('action://send')) {
      const query = url.includes('?') ? url.split('?')[1] : ''
      const text = new URLSearchParams(query).get('text')
      if (text) sendMessageToServer(text)
    }
  }

  const handleWhatsAppHandoff = async (reason?: string) => {
    setIsLoading(true)
    try {
      const recentUserTexts = messages
        .filter((m) => m.role === 'user' && m.content)
        .slice(-3)
        .map((m) => m.content)
        .join(' ')

      const result = await whatsappService.escalateSiteChat(
        'whatsapp',
        user?.name,
        user?.phone,
        user?.email,
        reason || recentUserTexts || 'Cliente escolheu atendimento via WhatsApp.'
      )

      if (result.success && (result.data?.handoff || result.data?.type === 'whatsapp_handoff')) {
        const payload = result.data
        const handoff = payload.handoff || payload
        setEscalationStatus('none')
        setEscalationChannel(null)
        setShowEscalationForm(false)
        setPendingContext('none')

        const actionButtons = handoff.actionButtons || payload.actionButtons || []
        const actions: ChatAction[] = actionButtons.map((btn: any) => ({
          label: btn.label,
          href: btn.url,
          type: btn.type === 'primary' ? 'primary' : 'secondary',
        }))

        setMessages((prev) => [
          ...prev,
          {
            id: handoff.aiMessage?.id || payload.aiMessage?.id,
            role: 'assistant',
            content: handoff.aiResponse || payload.aiResponse || payload.message,
            timestamp: handoff.aiMessage?.timestamp || payload.aiMessage?.timestamp || Date.now(),
            actions: actions.length ? actions : undefined,
          },
        ])
      }
    } catch (err) {
      console.error('Erro ao preparar atendimento via WhatsApp:', err)
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Não consegui preparar o WhatsApp agora. Você pode continuar pelo chat do site ou escolher e-mail.',
          timestamp: Date.now(),
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const sendMessageToServer = async (
    userMessage: string,
    options?: { notificationChoice?: NotificationChoicePayload; skipUserBubble?: boolean }
  ) => {
    if (!userMessage.trim() || isLoading || activeTab !== 'chat') return

    const fingerprint = `${currentSessionId}:${userMessage.trim()}`
    if (!options?.skipUserBubble && sendingMessageRef.current && lastSentFingerprintRef.current === fingerprint) {
      return
    }
    if (!options?.skipUserBubble) {
      sendingMessageRef.current = true
      lastSentFingerprintRef.current = fingerprint
    }

    setIsLoading(true)

    // ── CONTROLE DE CONTEXTO: só intercepta escolhas curtas de canal ──
    if (pendingContext === 'awaiting_support_channel' && userMessage.trim().length <= 40) {
      const trimmed = userMessage.trim()
      const channelMap: Record<string, 'site' | 'whatsapp' | 'email'> = {
        '1': 'site', 'chat': 'site', 'chat do site': 'site',
        '2': 'whatsapp', 'whatsapp': 'whatsapp', 'zap': 'whatsapp', 'zap zap': 'whatsapp', 'wpp': 'whatsapp',
        '3': 'email', 'email': 'email', 'e-mail': 'email',
      }
      const chosen = channelMap[trimmed.toLowerCase()]
      if (chosen) {
        setPendingContext('none')

        if (chosen === 'site') {
          setEscalationChannel('site')
          setEscalationStatus('human_needed')
          // ── Canal Site: escalação imediata, sem formulário, sem confirmação extra ──
          // A escolha do canal já é confirmação suficiente.
          try {
            await whatsappService.escalateSiteChat(
              'site',
              undefined, undefined, undefined,
              'Cliente escolheu atendimento via chat do site.'
            )
          } catch (escalateErr) {
            console.error('Erro ao registrar escalação para o site:', escalateErr)
          }
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: 'Certo! Sua solicitação foi registrada. ✅\nUm atendente irá continuar o atendimento aqui no chat do site.\nEnquanto isso, pode descrever sua dúvida. 👇',
            timestamp: Date.now(),
          }])
          setIsLoading(false)
          return
        }

        if (chosen === 'whatsapp') {
          await handleWhatsAppHandoff('Cliente escolheu atendimento via WhatsApp.')
          return
        }

        // ── E-mail: abre formulário para coleta de dados ──
        if (chosen === 'email') {
          setPendingContext('none')
          setEscalationStatus('none')
          setShowEscalationForm(true)
          setEscalationChannel('email')
          setIsLoading(false)
          return
        }
      }
      // Se não mapeou a entrada, limpa o contexto e continua o fluxo normal da IA
      setPendingContext('none')
    }

    const clientTempId = `temp_${Date.now()}_${Math.random().toString(36).slice(2)}`
    if (!options?.skipUserBubble) {
      const userMessageEntry: ChatMessage = {
        clientTempId,
        role: 'user',
        content: userMessage,
        timestamp: Date.now(),
      }
      setMessages(prev => {
        const dup = prev.some(m =>
          m.role === 'user' &&
          m.content.trim() === userMessage.trim() &&
          Math.abs(m.timestamp - Date.now()) < 5000
        )
        if (dup) return prev
        return [...prev, userMessageEntry]
      })
      setTimeout(() => scrollToBottom(true), 50)
    }

    try {
      // Prepara histórico para a API
      const conversationHistory = messages
        .filter(msg => msg.content)
        .map(msg => ({
          role: msg.role === 'admin' ? 'assistant' as const : msg.role as 'user' | 'assistant',
          content: msg.content,
          timestamp: msg.timestamp,
        }))

      // Prepara informações do carrinho para enviar à IA (sempre envia, mesmo se vazio)
      const cartInfoForAI = {
        itemCount: getItemCount(),
        total: getTotal(),
        items: items.map(item => ({
          name: item.product?.name || 'Produto',
          quantity: item.quantity,
          price: item.product?.price || 0,
        })),
      }

      // Chama a API do chat do site (passa informações de autenticação)
      const result = await whatsappService.sendSiteMessage(
        userMessage,
        user?.id,
        cartInfoForAI,
        conversationHistory,
        isAuthenticated,
        user ? { id: user.id, name: user.name, email: user.email, phone: user.phone } : undefined,
        options?.notificationChoice
      )

      if (!result.success) {
        // Remove mensagem otimista em caso de erro
        setMessages(prev => prev.filter(m => m.clientTempId !== clientTempId))
        throw new Error(result.message || 'Erro ao processar mensagem')
      }

      const aiData = result.data || {}

      if (aiData.clientAction === 'navigate' && aiData.navigateTo) {
        setMessages(prev => prev.filter(m => m.clientTempId !== clientTempId))
        const navTarget = String(aiData.navigateTo).startsWith('/')
          ? String(aiData.navigateTo)
          : `/${aiData.navigateTo}`
        navigate(
          isAuthenticated || navTarget.startsWith('/login')
            ? navTarget
            : `/login?redirect=${encodeURIComponent(navTarget)}`
        )
        setIsOpen(false)
        return
      }

      // Substitui a mensagem otimista pelo ID real retornado pelo backend
      if (aiData.userMessage?.id) {
        setMessages(prev => prev.map(m =>
          m.clientTempId === clientTempId
            ? { ...m, id: aiData.userMessage.id, clientTempId: undefined }
            : m
        ))
      }

      // Handoff WhatsApp retornado diretamente pelo backend (pedido direto, opção 2, etc.)
      if (aiData.type === 'whatsapp_handoff' || aiData.handoff?.channel === 'whatsapp') {
        setPendingContext('none')
        setEscalationStatus('none')
        setEscalationChannel(null)
        setShowEscalationForm(false)

        const handoff = aiData.handoff || aiData
        const actionButtons = handoff.actionButtons || aiData.actionButtons || []
        const actions: ChatAction[] = actionButtons.map((btn: { label: string; url: string; type?: string }) => ({
          label: btn.label,
          href: btn.url,
          type: btn.type === 'primary' ? 'primary' : 'secondary',
        }))

        setMessages(prev => [...prev, {
          id: aiData.aiMessage?.id || handoff.aiMessage?.id,
          role: 'assistant',
          content: handoff.aiResponse || aiData.aiResponse || aiData.message,
          timestamp: aiData.aiMessage?.timestamp || handoff.aiMessage?.timestamp || Date.now(),
          actions: actions.length ? actions : undefined,
        }])
        setIsLoading(false)
        return
      }

      if (aiData.type === 'site_escalation') {
        setPendingContext('none')
        setEscalationChannel('site')
        setEscalationStatus('human_needed')
        setShowEscalationForm(false)
        setMessages(prev => [...prev, {
          id: aiData.aiMessage?.id,
          role: 'assistant',
          content: aiData.aiResponse,
          timestamp: aiData.aiMessage?.timestamp || Date.now(),
        }])
        setIsLoading(false)
        return
      }

      if (aiData.shouldShowEmailForm || aiData.type === 'email_form') {
        setPendingContext('none')
        setEscalationStatus('none')
        setShowEscalationForm(true)
        setEscalationChannel('email')
        setIsLoading(false)
        return
      }

      // Sincroniza o carrinho se o backend retornar o estado do carrinho atualizado do banco
      if (aiData.currentCart && isAuthenticated) {
        await refreshCart()
      }

      if (aiData.type === 'guided_support' || (aiData.guided_support_diagnostic && aiData.actionButtons?.length)) {
        if (aiData.shouldEscalateHuman || aiData.supportChannelMenu) {
          setPendingContext('awaiting_support_channel')
        }

        const actions: ChatAction[] = (aiData.actionButtons || []).map((btn: { label: string; url: string; type?: string }) => ({
          label: btn.label,
          href: btn.url,
          type: btn.type === 'primary' ? 'primary' : 'secondary',
        }))

        setMessages(prev => [...prev, {
          id: aiData.aiMessage?.id,
          role: 'assistant',
          content: aiData.aiResponse,
          timestamp: aiData.aiMessage?.timestamp || Date.now(),
          actions: actions.length ? actions : undefined,
        }])
        setIsLoading(false)
        return
      }

      if (aiData.shouldEscalateHuman || aiData.supportChannelMenu) {
        // NÃO abre o formulário aqui — deixa o cliente escolher o canal via botões ou digitando.
        setPendingContext('awaiting_support_channel')

        const escalationActions: ChatAction[] = (aiData.actionButtons || []).map((btn: { label: string; url: string; type?: string }) => ({
          label: btn.label,
          href: btn.url,
          type: btn.type === 'primary' ? 'primary' : 'secondary',
        }))

        const aiMessageEntry: ChatMessage = {
          id: aiData.aiMessage?.id,
          role: 'assistant',
          content: aiData.aiResponse || 'Para esse atendimento, vou encaminhar você para um atendente humano. Como você prefere continuar?',
          timestamp: aiData.aiMessage?.timestamp || Date.now(),
          actions: escalationActions.length ? escalationActions : undefined,
        }
        setMessages(prev => [...prev, aiMessageEntry])
        setIsLoading(false)
        return
      }

      // Processa ações da IA (adicionar/remover produtos, finalizar, limpar)
      const actionMessages = await processAIActions(aiData)

      let consolidatedContent = '';
      let actions: ChatAction[] = [];

      // Combine action messages content (without auto-generating nav buttons yet)
      for (const actionInfo of actionMessages) {
        if (actionInfo.message) {
          consolidatedContent += actionInfo.message + '\n\n';
        }
      }

      // Add AI response content
      if (aiData.aiResponse) {
        consolidatedContent += aiData.aiResponse;
      }

      const intent = aiData.extractedMessage?.intent;

      // If the backend provides explicit action buttons (from [NAVEGAR] tags), use those exclusively
      if (aiData.actionButtons && aiData.actionButtons.length > 0) {
        actions = aiData.actionButtons.map((btn: any) => ({
          label: btn.label,
          href: btn.url,
          type: btn.type === 'primary' ? 'primary' : 'secondary'
        }));
      } else {
        // Auto-generate buttons only when the backend didn't supply any
        for (const actionInfo of actionMessages) {
          if (actionInfo.type === 'added') {
            actions.push({ label: 'Ir para o carrinho 🛒', href: '/carrinho', type: 'primary' })
            actions.push({ label: 'Continuar comprando', href: '/produtos', type: 'secondary' })
          } else if (actionInfo.type === 'removed') {
            actions.push({ label: 'Ver Catálogo 🛍️', href: '/produtos', type: 'primary' })
          }
        }

        // Intent-specific fallback buttons
        if (intent === 'finalizar_compra') {
          if (getItemCount() === 0) {
            actions = [{ label: 'Ver Catálogo 🛍️', href: '/produtos', type: 'primary' }];
          } else {
            actions = [{ label: 'Finalizar Compra 💳', href: '/checkout', type: 'primary' }];
          }
        } else if (intent === 'pergunta_carrinho') {
          if (getItemCount() === 0) {
            actions = [{ label: 'Ver Catálogo 🛍️', href: '/produtos', type: 'primary' }];
          } else {
            actions = [
              { label: 'Ir para o carrinho 🛒', href: '/carrinho', type: 'primary' },
              { label: 'Finalizar Compra 💳', href: '/checkout', type: 'secondary' }
            ];
          }
        }
      }

      // Remove marcadores internos antes de renderizar no widget do cliente.
      const clientContent = sanitizeClientMessageText(consolidatedContent);
      const cleanContent = clientContent.content;

      if (cleanContent || clientContent.followUpText) {
        const hasSplit = Boolean(clientContent.followUpText);
        // Use the real backend AI message timestamp if available, to aid deduplication
        const backendAiId = aiData.aiMessage?.id
        const backendAiTs = aiData.aiMessage?.timestamp
        const buildAssistantMetadata = () => {
          const hasCouponCards = aiData.couponCards && aiData.couponCards.length > 0
          const hasRecommendedProducts = aiData.recommendedProducts && aiData.recommendedProducts.length > 0
          const hasCartProducts = aiData.cartProducts && aiData.cartProducts.length > 0

          const responseType = aiData.responseType || (
            hasCouponCards ? 'coupon_cards' :
            hasRecommendedProducts ? 'product_cards' :
            hasCartProducts ? 'cart_summary' : 'text'
          )

          const baseMetadata = hasCouponCards
            ? { couponCards: aiData.couponCards, responseType }
            : hasRecommendedProducts
              ? { recommendedProducts: aiData.recommendedProducts, responseType }
              : hasCartProducts
                ? { cartProducts: aiData.cartProducts, responseType }
                : { responseType }

          return baseMetadata
            ? {
              ...baseMetadata,
              clientDiagnostics: {
                hadStructuredFormat: Boolean(clientContent.hadInternalMarkers || hasRecommendedProducts || hasCartProducts || hasCouponCards),
                loadedFromHistory: false,
                sanitizedForClient: true,
                removedInternalMarkers: clientContent.hadInternalMarkers,
                rebuiltCards: Boolean(hasRecommendedProducts || hasCartProducts || hasCouponCards),
                rebuiltButtons: actions.length > 0
              }
            }
            : clientContent.hadInternalMarkers
              ? {
                clientDiagnostics: {
                  hadStructuredFormat: true,
                  loadedFromHistory: false,
                  sanitizedForClient: true,
                  removedInternalMarkers: true,
                  rebuiltCards: false,
                  rebuiltButtons: actions.length > 0
                }
              }
              : undefined
        }

        if (hasSplit) {
          const intro = cleanContent;
          const followUp = clientContent.followUpText;

          // ID para a primeira mensagem
          const introId = backendAiTs || Date.now();

          // Adiciona a mensagem de introdução vazia para iniciar a digitação
          setMessages(prev => [...prev, {
            id: backendAiId,
            role: 'assistant',
            content: '',
            timestamp: introId,
            metadata: buildAssistantMetadata()
          }]);

          // Digita a introdução
          typeMessageText(intro.trim(), introId, () => {
            // Delay natural de digitação para a mensagem final
            setIsTypingFollowUp(true);
            setTimeout(() => {
              setIsTypingFollowUp(false);
              const followUpId = Date.now() + 10;

              // Adiciona a mensagem final vazia para iniciar a digitação
              setMessages(prev => [...prev, {
                role: 'assistant',
                content: '',
                timestamp: followUpId,
                actions: actions.length > 0 ? actions : undefined
              }]);

              // Digita o follow-up
              typeMessageText(followUp.trim(), followUpId);
            }, 1000);
          });
        } else {
          const aiMessageId = backendAiTs || Date.now();
          setMessages(prev => {
            // Evita duplicata se polling já trouxe a mesma mensagem com ID do banco
            if (backendAiId && prev.some(m => m.id === backendAiId)) {
              return prev
            }
            return [...prev, {
              id: backendAiId,
              role: 'assistant',
              content: '',
              timestamp: aiMessageId,
              actions: actions.length > 0 ? actions : undefined,
              metadata: buildAssistantMetadata()
            }]
          });
          typeMessageText(cleanContent, aiMessageId);
        }
      }
    } catch (error: any) {
      console.error('Erro ao enviar mensagem:', error)
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: 'Desculpe, ocorreu um erro ao processar sua mensagem. Tente novamente.',
        timestamp: Date.now(),
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
      sendingMessageRef.current = false
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputMessage.trim() || isLoading || activeTab !== 'chat') return
    const userMessage = inputMessage.trim()
    setInputMessage('')
    await sendMessageToServer(userMessage)
  }

  const handleEscalationSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!escalationChannel || escalationChannel !== 'email') return
    setIsLoading(true)
    try {
      const result = await whatsappService.escalateSiteChat(
        'email',
        contactName || undefined,
        contactPhone || undefined,
        contactEmail || undefined,
        'Cliente solicitou atendimento humano via e-mail.'
      )
      if (result.success) {
        setEscalationStatus('none')
        setEscalationChannel(null)
        setShowEscalationForm(false)

        setMessages(prev => [
          ...prev,
          {
            role: 'assistant',
            content: 'Solicitação registrada! ✅ Você escolheu atendimento por e-mail. Nossa equipe receberá seus dados e responderá por e-mail.',
            timestamp: Date.now()
          }
        ])
      }
    } catch (err: any) {
      console.error('Erro ao registrar atendimento humano:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeEscalate = async () => {
    setIsLoading(true)
    try {
      const result = await whatsappService.deEscalateSiteChat()
      if (result.success) {
        setEscalationStatus('none')
        setShowEscalationForm(false)
        setEscalationChannel(null)
        setPendingContext('none')
        setMessages(prev => [
          ...prev,
          {
            role: 'assistant',
            content: 'Atendimento por IA retomado. Como posso ajudar você?',
            timestamp: Date.now()
          }
        ])
      }
    } catch (err: any) {
      console.error('Erro ao retornar para atendimento por IA:', err)
    } finally {
      setIsLoading(false)
    }
  }

  // Função para detectar qual quina está mais próxima
  const detectNearestCorner = (x: number, y: number): CornerPosition => {
    const width = window.innerWidth
    const height = window.innerHeight
    const centerX = width / 2
    const centerY = height / 2

    if (x < centerX && y < centerY) return 'top-left'
    if (x >= centerX && y < centerY) return 'top-right'
    if (x < centerX && y >= centerY) return 'bottom-left'
    return 'bottom-right'
  }

  // Função para mudar a quina do botão
  const changeCorner = (corner: CornerPosition) => {
    setSelectedCorner(corner)
    localStorage.setItem('floatingChat_corner', corner)
    const cornerPos = getCornerPosition(corner)

    // Só atualiza a posição do botão se o chat estiver FECHADO
    // Se o chat estiver aberto, não devemos sobrescrever a posição do botão
    if (!isOpen) {
      setButtonPosition(cornerPos)
      // Atualiza o ref com a posição real
      lastButtonPositionRef.current = cornerPos
      // Salva a posição da quina no localStorage para restaurar quando fechar o chat
      try {
        localStorage.setItem('floatingChat_buttonPosition', JSON.stringify(cornerPos))
      } catch (error) {
        console.error('Erro ao salvar posição do botão:', error)
      }
    }

    if (isOpen) {
      // Atualiza a posição do chat baseada na nova quina e na posição atual do botão
      setChatPosition(getChatPosition(corner, lastButtonPositionRef.current))
    }
  }

  // Funções de arrastar o botão (para mudar de quina) - funciona para mouse e touch
  const startButtonDrag = useCallback((clientX: number, clientY: number) => {
    if (!buttonRef.current) return

    const rect = buttonRef.current.getBoundingClientRect()
    const startX = clientX
    const startY = clientY

    // Calcula o offset do toque/clique dentro do botão
    const offsetX = clientX - rect.left
    const offsetY = clientY - rect.top

    let hasMoved = false

    const handleMove = (moveX: number, moveY: number) => {
      const deltaX = Math.abs(moveX - startX)
      const deltaY = Math.abs(moveY - startY)

      // Se moveu mais de 5px, considera arrasto
      if (deltaX > 5 || deltaY > 5) {
        hasMoved = true
        setIsDraggingButton(true)

        // Faz o botão seguir o toque/clique
        const newX = moveX - offsetX
        const newY = moveY - offsetY

        // Limita dentro da tela
        const buttonSize = window.innerWidth < 640 ? 56 : 64 // w-14 (56px) no mobile, w-16 (64px) no desktop
        const maxX = window.innerWidth - buttonSize
        const maxY = window.innerHeight - buttonSize

        const constrainedX = Math.max(0, Math.min(newX, maxX))
        const constrainedY = Math.max(0, Math.min(newY, maxY))

        const newPos = { x: constrainedX, y: constrainedY }
        setButtonPosition(newPos)
        // Atualiza o ref com a posição real durante o arrasto
        lastButtonPositionRef.current = newPos
      }
    }

    const handleEnd = (endX: number, endY: number) => {
      setIsDraggingButton(false)

      if (hasMoved) {
        // Detecta a quina mais próxima e move o botão suavemente para lá
        const nearestCorner = detectNearestCorner(endX, endY)
        // changeCorner vai mover o botão para a posição da quina com animação suave
        // e salvar a posição correta no localStorage
        changeCorner(nearestCorner)
      } else {
        // Se não moveu, abre o chat
        toggleChat()
      }
    }

    // Handlers para mouse
    const handleMouseMove = (moveEvent: MouseEvent) => {
      handleMove(moveEvent.clientX, moveEvent.clientY)
    }

    const handleMouseUp = (upEvent: MouseEvent) => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      handleEnd(upEvent.clientX, upEvent.clientY)
    }

    // Handlers para touch
    const handleTouchMove = (moveEvent: TouchEvent) => {
      if (moveEvent.touches.length > 0) {
        moveEvent.preventDefault() // Previne scroll durante o drag
        handleMove(moveEvent.touches[0].clientX, moveEvent.touches[0].clientY)
      }
    }

    const handleTouchEnd = (endEvent: TouchEvent) => {
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('touchend', handleTouchEnd)
      const endX = endEvent.changedTouches.length > 0 ? endEvent.changedTouches[0].clientX : startX
      const endY = endEvent.changedTouches.length > 0 ? endEvent.changedTouches[0].clientY : startY
      handleEnd(endX, endY)
    }

    // Adiciona listeners para mouse
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    // Adiciona listeners para touch
    document.addEventListener('touchmove', handleTouchMove, { passive: false })
    document.addEventListener('touchend', handleTouchEnd)
  }, [])

  const handleButtonMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    startButtonDrag(e.clientX, e.clientY)
  }

  // Adiciona listener de touch diretamente no botão para evitar erro de preventDefault
  useEffect(() => {
    // Só adiciona o listener quando o botão estiver visível (chat fechado)
    if (isOpen) return

    const button = buttonRef.current
    if (!button) return

    const handleTouchStartDirect = (e: TouchEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (e.touches.length > 0) {
        startButtonDrag(e.touches[0].clientX, e.touches[0].clientY)
      }
    }

    button.addEventListener('touchstart', handleTouchStartDirect, { passive: false })

    return () => {
      button.removeEventListener('touchstart', handleTouchStartDirect)
    }
  }, [startButtonDrag, isOpen])

  // Salva a posição do botão no localStorage sempre que ela mudar (exceto durante o arrasto)
  useEffect(() => {
    // Só salva se o chat estiver fechado e não estiver arrastando
    if (!isOpen && !isDraggingButton) {
      try {
        localStorage.setItem('floatingChat_buttonPosition', JSON.stringify(buttonPosition))
      } catch (error) {
        console.error('Erro ao salvar posição do botão:', error)
      }
    }
  }, [buttonPosition, isOpen, isDraggingButton])

  // Funções de arrastar o chat (mouse e touch)
  const startChatDrag = (clientX: number, clientY: number) => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setDragOffset({
        x: clientX - rect.left,
        y: clientY - rect.top,
      })
      setIsDraggingChat(true)
    }
  }

  const handleChatMouseDown = (e: React.MouseEvent) => {
    startChatDrag(e.clientX, e.clientY)
  }

  const handleChatTouchStart = (e: React.TouchEvent) => {
    e.stopPropagation()
    if (e.touches.length > 0) {
      startChatDrag(e.touches[0].clientX, e.touches[0].clientY)
    }
  }

  // Efeito para arrastar o chat (mouse e touch)
  useEffect(() => {
    const handleMove = (clientX: number, clientY: number) => {
      if (isDraggingChat) {
        const newX = clientX - dragOffset.x
        const newY = clientY - dragOffset.y

        // Limita dentro da tela
        const isMobile = window.innerWidth < 640
        const chatWidth = isMobile ? Math.min(340, window.innerWidth - 32) : 380
        const chatHeight = isMobile ? Math.min(500, window.innerHeight - 100) : 600
        const maxX = window.innerWidth - chatWidth
        const maxY = window.innerHeight - chatHeight

        const constrainedX = Math.max(0, Math.min(newX, maxX))
        const constrainedY = Math.max(0, Math.min(newY, maxY))

        setChatPosition({ x: constrainedX, y: constrainedY })
      }
    }

    const handleMouseMove = (e: MouseEvent) => {
      handleMove(e.clientX, e.clientY)
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        e.preventDefault() // Previne scroll durante o drag
        handleMove(e.touches[0].clientX, e.touches[0].clientY)
      }
    }

    const handleEnd = (endX: number, endY: number) => {
      if (isDraggingChat) {
        setIsDraggingChat(false)
        // Detecta a quina mais próxima e atualiza (apenas no desktop)
        if (window.innerWidth >= 640) {
          const nearestCorner = detectNearestCorner(endX, endY)
          if (nearestCorner !== selectedCorner) {
            changeCorner(nearestCorner)
          }
        }
      }
    }

    const handleMouseUp = () => {
      handleEnd(0, 0) // Não precisa das coordenadas para mouse
    }

    const handleTouchEnd = (e: TouchEvent) => {
      const endX = e.changedTouches.length > 0 ? e.changedTouches[0].clientX : 0
      const endY = e.changedTouches.length > 0 ? e.changedTouches[0].clientY : 0
      handleEnd(endX, endY)
    }

    if (isDraggingChat) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.addEventListener('touchmove', handleTouchMove, { passive: false })
      document.addEventListener('touchend', handleTouchEnd)
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('touchend', handleTouchEnd)
    }
  }, [isDraggingChat, dragOffset, chatPosition, selectedCorner])

  const toggleChat = () => {
    if (isOpen) {
      // Ao fechar, restaura a posição do botão que estava salva quando o chat foi aberto
      const savedPosition = loadSavedButtonPosition()
      setButtonPosition(savedPosition)
      // Atualiza o ref com a posição restaurada
      lastButtonPositionRef.current = savedPosition
      // NÃO remove a chave temporária aqui - será removida pelo useEffect
      setChatPosition(getChatPosition(selectedCorner))
    } else {
      // Ao abrir, salva a posição REAL do botão usando o ref (que sempre tem o valor atualizado)
      // O ref é atualizado tanto durante o arrasto quanto quando changeCorner é chamado
      const positionToSave = lastButtonPositionRef.current
      try {
        // Salva em uma chave separada para não ser sobrescrita por changeCorner
        localStorage.setItem('floatingChat_buttonPosition_onOpen', JSON.stringify(positionToSave))
        // Também salva na chave normal para compatibilidade
        localStorage.setItem('floatingChat_buttonPosition', JSON.stringify(positionToSave))
      } catch (error) {
        console.error('Erro ao salvar posição do botão:', error)
      }
      // Posiciona o chat na mesma quina onde o botão está
      // Passa a posição do botão para calcular a quina correta
      setChatPosition(getChatPosition(selectedCorner, positionToSave))
    }
    setIsOpen(!isOpen)
  }

  const handleAddProductDirectly = async (product: { id: string; name: string; price: number }) => {
    // 1. Mostra aviso visual de loading no botão do card
    setAddingProductIds(prev => ({ ...prev, [product.id]: 'loading' }))

    try {
      const fullProduct = await productsService.getById(product.id)
      if (fullProduct) {
        // Atualiza o carrinho usando CartContext
        await addProduct(fullProduct, 1)
        await refreshCart()

        // 2. Transiciona botão do card para sucesso
        setAddingProductIds(prev => ({ ...prev, [product.id]: 'success' }))
        setTimeout(() => {
          setAddingProductIds(prev => {
            const next = { ...prev }
            delete next[product.id]
            return next
          })
        }, 1500)

        // 3. Atualiza ou adiciona a mensagem do assistente sobre produtos no carrinho
        setMessages(prev => {
          const list = [...prev]
          const lastMsg = list.length > 0 ? list[list.length - 1] : null

          const isCartAdditionMessage =
            lastMsg &&
            lastMsg.role === 'assistant' &&
            lastMsg.metadata &&
            Array.isArray(lastMsg.metadata.addedProducts)

          if (isCartAdditionMessage && lastMsg) {
            const existingAdded = [...(lastMsg.metadata?.addedProducts || [])]
            const foundIndex = existingAdded.findIndex(p => p.id === product.id)
            if (foundIndex >= 0) {
              existingAdded[foundIndex].quantity += 1
            } else {
              existingAdded.push({ id: product.id, name: product.name, quantity: 1 })
            }

            const listText = existingAdded.map(p => `• **${p.name}** (${p.quantity}x)`).join('\n')
            const content = `✅ Produtos adicionados ao carrinho:\n${listText}\n\nDeseja continuar comprando ou ir para o carrinho?`

            // Atualiza a última mensagem existente
            list[list.length - 1] = {
              ...lastMsg,
              content,
              timestamp: Date.now(), // Atualiza o timestamp para rolar/redesenhar
              metadata: {
                ...lastMsg.metadata,
                addedProducts: existingAdded
              }
            }
            return list
          } else {
            // Cria uma nova mensagem
            return [
              ...list,
              {
                role: 'assistant' as const,
                content: `✅ Produto adicionado ao carrinho:\n• **${product.name}** (1x)\n\nDeseja continuar comprando ou ir para o carrinho?`,
                timestamp: Date.now(),
                actions: [
                  { label: 'Ir para o carrinho 🛒', href: '/carrinho', type: 'primary' as const },
                  { label: 'Continuar comprando', href: '/produtos', type: 'secondary' as const },
                ],
                metadata: {
                  addedProducts: [{ id: product.id, name: product.name, quantity: 1 }]
                }
              }
            ]
          }
        })
      } else {
        throw new Error('Produto não encontrado')
      }
    } catch (error) {
      console.error('Erro ao adicionar produto diretamente:', error)
      setAddingProductIds(prev => {
        const next = { ...prev }
        delete next[product.id]
        return next
      })
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant' as const,
          content: `❌ Não foi possível adicionar "${product.name}" ao carrinho. Tente novamente.`,
          timestamp: Date.now(),
        }
      ])
    }
  }

  // ===== Custom Handlers for Sessions and New Chat =====
  const fetchSessions = useCallback(async () => {
    setLoadingSessions(true)
    try {
      const token = localStorage.getItem('sanare_token') || localStorage.getItem('token')
      const headers: Record<string, string> = {}
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }
      const response = await fetch(`${env.apiUrl}/chat/site/conversations`, { headers })
      if (response.ok) {
        const result = await response.json()
        if (result.success && Array.isArray(result.conversations)) {
          setSessionsList(result.conversations)
        }
      }
    } catch (err) {
      console.error('Erro ao buscar sessões anteriores:', err)
    } finally {
      setLoadingSessions(false)
    }
  }, [])

  const handleStartNewChat = async () => {
    setShowNewChatConfirm(false)
    await startFreshChatSession()
  }

  const selectSession = (sessId: string) => {
    resetChatFlowState()
    localStorage.setItem('sanare_site_session', sessId)
    setCurrentSessionId(sessId)
    setActiveTab('chat')
    setMessages([])
    isInitialHistoryLoad.current = true
  }

  const handleDeleteSession = async (sessId: string) => {
    if (!window.confirm("Deseja realmente excluir esta conversa?")) {
      return
    }

    try {
      const token = localStorage.getItem('sanare_token') || localStorage.getItem('token')
      const headers: Record<string, string> = {}
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }
      const response = await fetch(`${env.apiUrl}/chat/site/conversation/${sessId}`, {
        method: 'DELETE',
        headers
      })
      if (response.ok) {
        let remainingCount = 0
        setSessionsList(prev => {
          const remaining = prev.filter(s => s.session_id !== sessId)
          remainingCount = remaining.length
          return remaining
        })

        if (currentSessionId === sessId) {
          if (remainingCount === 0) {
            await startFreshChatSession()
          } else {
            const tempSessionId = 'session_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
            resetChatFlowState()
            localStorage.setItem('sanare_site_session', tempSessionId)
            setCurrentSessionId(tempSessionId)
            setMessages([])
            setActiveTab('chat')
            isInitialHistoryLoad.current = true
          }
        }
      }
    } catch (err) {
      console.error('Erro ao deletar sessão:', err)
    }
  }

  const formatMessage = (text: string): React.ReactNode => {
    if (!text) return text

    let cleanText = text.replace(/^[ \t]*[*+-][ \t]+/gm, '• ')
    cleanText = cleanText.replace(/\*\*/g, '*')

    // Match [text](url) or *bold*
    const tokenRegex = /\[([^\]]+)\]\(([^)]+)\)|(\*[^*]+\*)/g

    const parts: React.ReactNode[] = []
    let lastIndex = 0
    let match

    while ((match = tokenRegex.exec(cleanText)) !== null) {
      const matchIndex = match.index

      if (matchIndex > lastIndex) {
        parts.push(cleanText.substring(lastIndex, matchIndex))
      }

      const [, linkText, linkUrl, boldMatch] = match

      if (boldMatch) {
        const content = boldMatch.substring(1, boldMatch.length - 1)
        parts.push(<strong key={`bold-${matchIndex}`} className="font-bold text-gray-900 dark:text-white">{content}</strong>)
      } else if (linkText && linkUrl) {
        const isInternal = linkUrl.startsWith('/') || linkUrl.startsWith('http://localhost') || linkUrl.startsWith(env.apiUrl)
        const cleanUrl = linkUrl.replace(/^http:\/\/localhost(:\d+)?/, '')

        parts.push(
          <button
            key={`link-${matchIndex}`}
            onClick={() => {
              if (linkUrl.startsWith('action://')) {
                handleChatActionUrl(linkUrl, linkText)
                return
              }
              if (isInternal) {
                navigate(cleanUrl.startsWith('/') ? cleanUrl : `/${cleanUrl}`)
                setIsOpen(false)
              } else {
                window.open(linkUrl, '_blank', 'noopener,noreferrer')
              }
            }}
            className="inline-flex items-center mx-1 my-0.5 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline font-medium transition-colors cursor-pointer"
          >
            {linkText}
          </button>
        )
      }

      lastIndex = tokenRegex.lastIndex
    }

    if (lastIndex < cleanText.length) {
      parts.push(cleanText.substring(lastIndex))
    }

    return parts.length > 0 ? parts : cleanText
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes typing-bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
        .typing-dot {
          animation: typing-bounce 1.0s infinite ease-in-out;
        }
        .typing-dot:nth-child(1) { animation-delay: 0s; }
        .typing-dot:nth-child(2) { animation-delay: 0.15s; }
        .typing-dot:nth-child(3) { animation-delay: 0.3s; }
      `}} />
      {/* Container do Chat / Botão com animação de transformação */}
      <div
        ref={buttonRef}
        onMouseDown={!isOpen ? handleButtonMouseDown : undefined}
        className={`fixed z-50 flex flex-col transition-all duration-500 ease-in-out ${isOpen
          ? 'bg-white dark:bg-gray-800 shadow-2xl overflow-hidden'
          : 'bg-[#00A86B] hover:bg-[#008A57] text-white shadow-lg flex items-center justify-center cursor-pointer select-none touch-none hover:scale-110'
          }`}
        style={{
          left: isOpen ? `${chatPosition.x}px` : `${buttonPosition.x}px`,
          top: isOpen ? `${chatPosition.y}px` : `${buttonPosition.y}px`,
          width: isOpen
            ? (window.innerWidth < 640 ? `${Math.min(340, window.innerWidth - 32)}px` : '380px')
            : (window.innerWidth < 640 ? '56px' : '64px'),
          height: isOpen
            ? (window.innerWidth < 640 ? `${Math.min(500, window.innerHeight - 100)}px` : '600px')
            : (window.innerWidth < 640 ? '56px' : '64px'),
          borderRadius: isOpen ? '12px' : '50%',
          transition: (isDraggingChat || isDraggingButton) ? 'none' : 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
        title={!isOpen ? "Pergunte a Kaia - Arraste para mudar de posição ou clique para abrir" : undefined}
        aria-label={!isOpen ? "Pergunte a Kaia" : undefined}
      >
        {/* Estado Botão: Ícone */}
        <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 ${isOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
          <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6 pointer-events-none" />
          {!isOpen && unreadCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center border-2 border-[#00A86B] animate-bounce">
              {unreadCount}
            </span>
          )}
        </div>

        {/* Estado Chat: Conteúdo */}
        <div className={`flex flex-col h-full w-full transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
          {/* Cabeçalho (arrastável) */}
          <div
            onMouseDown={handleChatMouseDown}
            onTouchStart={handleChatTouchStart}
            className="text-white p-3 sm:p-4 cursor-move flex items-center justify-between select-none touch-none flex-shrink-0"
            style={{ backgroundColor: '#00A86B' }}
          >
            <div className="flex items-center space-x-1.5 sm:space-x-2">
              <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5" />
              <h3 className="font-semibold text-sm sm:text-base">
                {activeTab === 'history' ? 'Histórico de Conversas' : 'Kaia'}
              </h3>
            </div>
            <div className="flex items-center space-x-1.5 sm:space-x-2">
              {isAuthenticated && (
                <>
                  <button
                    onClick={() => {
                      if (activeTab === 'history') {
                        setActiveTab('chat')
                      } else {
                        fetchSessions()
                        setActiveTab('history')
                      }
                    }}
                    className={`p-1 rounded transition-colors ${activeTab === 'history' ? 'bg-[#008A57]' : 'bg-transparent'}`}
                    onMouseEnter={(e) => {
                      if (activeTab !== 'history') e.currentTarget.style.backgroundColor = '#008A57'
                    }}
                    onMouseLeave={(e) => {
                      if (activeTab !== 'history') e.currentTarget.style.backgroundColor = 'transparent'
                    }}
                    title="Histórico de Chats"
                    aria-label="Histórico de Chats"
                  >
                    <History className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>

                  <button
                    onClick={() => setShowNewChatConfirm(true)}
                    className="p-1 rounded transition-colors bg-transparent"
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#008A57'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent'
                    }}
                    title="Novo Chat"
                    aria-label="Novo Chat"
                  >
                    <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                </>
              )}
              <button
                onClick={toggleChat}
                className="p-1 rounded transition-colors"
                style={{
                  backgroundColor: 'transparent',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#008A57'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent'
                }}
                aria-label="Fechar chat"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
          </div>

          {/* Conteúdo do chat */}
          <div className="flex-1 flex flex-col min-h-0">
            {/* Mensagens ou Histórico de sessões */}
            <div
              ref={messagesContainerRef}
              onScroll={handleMessagesScroll}
              className="flex-1 overflow-y-auto p-2 sm:p-3 lg:p-4 bg-gray-50 dark:bg-gray-800"
            >
              {activeTab === 'history' ? (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Seus chats anteriores</h4>
                  {loadingSessions ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-green-600" />
                    </div>
                  ) : sessionsList.length === 0 ? (
                    <p className="text-xs text-gray-500 dark:text-gray-400 py-4 text-center">Nenhuma conversa anterior encontrada.</p>
                  ) : (
                    sessionsList.map((s, idx) => (
                      <div
                        key={idx}
                        onClick={() => selectSession(s.session_id)}
                        className={`w-full text-left p-3 bg-white dark:bg-gray-700 hover:bg-green-50 dark:hover:bg-gray-600 border rounded-lg shadow-sm transition-all flex flex-col space-y-1.5 cursor-pointer relative group ${currentSessionId === s.session_id ? 'border-[#00A86B] bg-green-50/20' : 'border-gray-200 dark:border-gray-600'
                          }`}
                      >
                        <div className="flex justify-between items-center text-[10px] text-gray-400 dark:text-gray-455">
                          <span className="font-semibold text-[#00A86B] dark:text-[#00C880]">Chat #{idx + 1}</span>
                          <div className="flex items-center space-x-1.5">
                            <span>{new Date(s.last_message_at).toLocaleDateString('pt-BR')} {new Date(s.last_message_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDeleteSession(s.session_id)
                              }}
                              className="p-1 text-gray-400 hover:text-red-500 rounded transition-colors"
                              title="Excluir chat"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        <p className="text-xs text-gray-700 dark:text-gray-200 truncate font-medium pr-6">
                          {s.snippet || 'Sem mensagens'}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              ) : !isAuthenticated ? (
                <div className="flex flex-col space-y-4 my-2 px-1">
                  <div className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-3.5 sm:p-4 text-left shadow-sm">
                    <div className="flex items-center space-x-2.5 mb-2.5">
                      <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400 font-bold text-sm">
                        K
                      </div>
                      <div>
                        <p className="font-semibold text-xs sm:text-sm text-gray-800 dark:text-gray-100">Kaia</p>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400">Assistente Comercial</p>
                      </div>
                    </div>
                    <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-200 leading-relaxed whitespace-pre-wrap">
                      Olá! Eu sou a Kaia 👋
                      <br /><br />
                      Para que eu possa te ajudar a navegar no site, gerenciar seu carrinho, consultar seus pedidos ou alterar suas preferências de notificação com segurança, você precisa estar logado na sua conta.
                    </p>
                    <div className="mt-4 flex flex-col gap-2">
                      <button
                        onClick={() => {
                          navigate('/login')
                          setIsOpen(false)
                        }}
                        className="w-full py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs sm:text-sm font-semibold shadow transition-colors cursor-pointer text-center"
                      >
                        Fazer Login 🔐
                      </button>
                      <button
                        onClick={() => {
                          navigate('/cadastro')
                          setIsOpen(false)
                        }}
                        className="w-full py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 rounded-lg text-xs sm:text-sm font-semibold transition-colors cursor-pointer text-center"
                      >
                        Criar Conta ✨
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-2 sm:space-y-3 lg:space-y-4">
                  {messages.map((msg, index) => {
                    const previousMessage = messages[index - 1]
                    const showSenderLabel = msg.role !== 'user' && previousMessage?.role !== msg.role

                    return (
                      <div key={index}>
                        {/* Mensagem normal */}
                        {(msg.content || msg.metadata?.parts?.length || msg.metadata?.recommendedProducts?.length || msg.metadata?.cartProducts?.length || msg.metadata?.followUpText || msg.actions?.length) && (() => {
                          // ===== LAYOUT COMPOSTO COM PARTS (Carrinho estruturado) =====
                          if (msg.role === 'assistant' && msg.metadata?.parts && msg.metadata.parts.length > 0) {
                          const cartProds = msg.metadata.cartProducts || []

                          const renderCartCard = (prod: any) => {
                              const liveItem = items.find(ci => ci.product?.id === prod.id)
                              const isRemoved = !!removedCartItems[prod.id]

                              if (isRemoved) {
                                const removed = removedCartItems[prod.id]
                                return (
                                  <div
                                    key={prod.id}
                                    className="bg-white dark:bg-gray-800 rounded-xl border border-dashed border-red-200 dark:border-red-800 p-3 flex items-center justify-between shadow-sm w-full"
                                  >
                                    <div className="flex-1 min-w-0">
                                      <p className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-1">
                                        <span className="text-red-500">🗑</span> <span className="font-medium text-gray-700 dark:text-gray-200">{removed.name}</span> foi removido
                                      </p>
                                    </div>
                                    <button
                                      onClick={async () => {
                                        try {
                                          await addProduct(
                                            { id: removed.productObj.id, name: removed.productObj.name, price: removed.productObj.price, image: productsService.getImageUrl(removed.productObj.image), description: '', category: 'outros', active: true } as any,
                                            removed.qty
                                          )
                                          await refreshCart()
                                          setRemovedCartItems(prev => {
                                            const next = { ...prev }
                                            delete next[prod.id]
                                            return next
                                          })
                                        } catch (e) {
                                          console.error('Erro ao desfazer remoção:', e)
                                        }
                                      }}
                                      className="ml-2 flex-shrink-0 px-2 py-1 rounded-lg bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-[10px] font-semibold border border-green-200 dark:border-green-700 hover:bg-green-100 dark:hover:bg-green-900/50 transition-colors cursor-pointer"
                                    >
                                      ↩ Desfazer
                                    </button>
                                  </div>
                                )
                              }

                              if (!liveItem) return null
                              const currentQty = liveItem.quantity
                              const unitPrice = prod.price
                              const subtotal = unitPrice * currentQty
                              const imageUrl = productsService.getImageUrl(prod.image)

                              return (
                                <div
                                  key={prod.id}
                                  className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm hover:shadow-md transition-shadow w-full"
                                >
                                  <div className="flex items-center gap-2.5 p-2.5">
                                    <div className="w-12 h-12 flex-shrink-0 rounded-lg bg-gray-100 dark:bg-gray-700 overflow-hidden">
                                      <img
                                        src={imageUrl}
                                        alt={prod.name}
                                        className="w-full h-full object-contain"
                                        onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                                      />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-[11px] font-semibold text-gray-800 dark:text-gray-100 line-clamp-2 leading-snug">{prod.name}</p>
                                      <p className="text-[10px] text-green-600 dark:text-green-400 font-bold mt-0.5">
                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(unitPrice)} × {currentQty}
                                      </p>
                                      <p className="text-[10px] text-gray-500 dark:text-gray-400">
                                        Subtotal: <span className="font-semibold text-gray-700 dark:text-gray-200">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(subtotal)}</span>
                                      </p>
                                    </div>
                                    <div className="flex flex-col items-center gap-1 flex-shrink-0">
                                      <div className="flex items-center gap-1">
                                        <button
                                          onClick={async () => {
                                            if (currentQty <= 1) return
                                            await updateQuantity(liveItem.id, currentQty - 1)
                                            await refreshCart()
                                          }}
                                          disabled={currentQty <= 1}
                                          className={`w-6 h-6 flex items-center justify-center rounded-full text-sm font-bold transition-colors ${currentQty <= 1
                                            ? 'bg-gray-100 dark:bg-gray-800 text-gray-300 dark:text-gray-600 cursor-not-allowed'
                                            : 'bg-gray-100 dark:bg-gray-700 hover:bg-orange-100 dark:hover:bg-orange-900/30 text-gray-600 dark:text-gray-300 hover:text-orange-600 dark:hover:text-orange-400 cursor-pointer'
                                            }`}
                                          title={currentQty <= 1 ? 'Quantidade mínima é 1' : 'Diminuir'}
                                        >
                                          −
                                        </button>
                                        <span className="text-xs font-semibold text-gray-700 dark:text-gray-200 w-5 text-center">{currentQty}</span>
                                        <button
                                          onClick={async () => {
                                            await updateQuantity(liveItem.id, currentQty + 1)
                                            await refreshCart()
                                          }}
                                          className="w-6 h-6 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-green-100 dark:hover:bg-green-900/30 text-gray-600 dark:text-gray-300 hover:text-green-600 dark:hover:text-green-400 text-sm font-bold transition-colors cursor-pointer"
                                          title="Aumentar"
                                        >
                                          +
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="border-t border-gray-100 dark:border-gray-700 w-full">
                                    <button
                                      onClick={() => { navigate(`/produtos/${prod.id}`); setIsOpen(false) }}
                                      className="w-full py-1.5 text-center text-[10px] font-semibold text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer"
                                    >
                                      Ver produto →
                                    </button>
                                  </div>
                                </div>
                              )
                            }

                          const renderProductRecommendationCards = (products: any[]) => (
                            <div className="w-full max-w-[85%] sm:max-w-[80%] space-y-2">
                              {products.map((prod: any) => (
                                <div
                                  key={prod.id}
                                  className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3 shadow-sm hover:shadow transition-shadow flex flex-col space-y-2 text-left"
                                >
                                  <div className="flex justify-between items-center">
                                    <span className="text-[10px] bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-300 font-semibold px-1.5 py-0.5 rounded">
                                      {prod.category || 'Geral'}
                                    </span>
                                  </div>
                                  <div>
                                    <h4 className="font-semibold text-xs text-gray-800 dark:text-gray-100 line-clamp-1">
                                      {prod.name}
                                    </h4>
                                    {prod.description && (
                                      <p className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-2 mt-0.5 leading-snug">
                                        {prod.description}
                                      </p>
                                    )}
                                  </div>
                                  <div className="flex items-baseline space-x-1.5">
                                    <span className="text-xs font-bold text-green-600 dark:text-green-400">
                                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(prod.price)}
                                    </span>
                                    {prod.originalPrice && prod.originalPrice > prod.price && (
                                      <span className="text-[10px] text-gray-400 dark:text-gray-500 line-through">
                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(prod.originalPrice)}
                                      </span>
                                    )}
                                  </div>
                                  <div className="grid grid-cols-2 gap-1.5 pt-1">
                                    <button
                                      onClick={() => {
                                        navigate(prod.url || `/produtos/${prod.id}`)
                                        setIsOpen(false)
                                      }}
                                      className="py-1 text-center bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded text-[10px] font-semibold transition-colors cursor-pointer"
                                    >
                                      Ver Produto
                                    </button>
                                    <button
                                      onClick={() => handleAddProductDirectly(prod)}
                                      disabled={addingProductIds[prod.id] === 'loading'}
                                      className={`py-1 text-center rounded text-[10px] font-semibold transition-colors flex items-center justify-center space-x-1 cursor-pointer
                                          ${addingProductIds[prod.id] === 'success'
                                          ? 'bg-green-700 text-white border border-green-500 scale-95'
                                          : addingProductIds[prod.id] === 'loading'
                                            ? 'bg-green-600 opacity-70 text-white cursor-not-allowed'
                                            : 'bg-green-600 hover:bg-green-700 text-white'
                                        }`}
                                    >
                                      {addingProductIds[prod.id] === 'loading' ? (
                                        <>
                                          <Loader2 className="w-3 h-3 animate-spin" />
                                          <span>Adicionando...</span>
                                        </>
                                      ) : addingProductIds[prod.id] === 'success' ? (
                                        <span>Adicionado! ✓</span>
                                      ) : (
                                        <span>Adicionar</span>
                                      )}
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )

                          return (
                            <div className="flex flex-col items-start justify-start w-full space-y-2">
                                {showSenderLabel && (
                                  <span className="text-[10px] text-green-600 dark:text-green-400 font-semibold ml-1">Kaia</span>
                                )}
                                {msg.metadata.parts.map((part: any, partIdx: number) => {
                                  if (part.type === 'text') {
                                    return (
                                      <div
                                        key={`part-text-${index}-${partIdx}`}
                                        className="max-w-[85%] sm:max-w-[80%] rounded-lg px-2.5 sm:px-3 py-1.5 sm:py-2 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700"
                                      >
                                        <p className="text-xs sm:text-sm whitespace-pre-wrap break-words">{formatMessage(part.text)}</p>
                                      </div>
                                    )
                                  }
                                  if (part.type === 'cart_items') {
                                    const cartProdsList = part.items || cartProds
                                    const MAX_VISIBLE = 4
                                    const visible = cartProdsList.slice(0, MAX_VISIBLE)
                                    const overflow = cartProdsList.length - MAX_VISIBLE
                                    return (
                                      <div key={`part-cart-${index}-${partIdx}`} className="w-full max-w-[92%] space-y-2">
                                        {visible.map((prod: any) => renderCartCard(prod))}
                                        {overflow > 0 && (
                                          <button
                                            onClick={() => { navigate('/carrinho'); setIsOpen(false) }}
                                            className="w-full py-2 text-center text-[11px] font-semibold text-green-700 dark:text-green-400 border border-dashed border-green-300 dark:border-green-700 rounded-xl hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors cursor-pointer"
                                          >
                                            🛒 Ver carrinho completo (+{overflow} {overflow === 1 ? 'item' : 'itens'})
                                          </button>
                                        )}
                                      </div>
                                  )
                                }
                                if (part.type === 'product_cards') {
                                  const products = part.products || part.items || msg.metadata?.recommendedProducts || []
                                  return (
                                    <div key={`part-products-${index}-${partIdx}`} className="w-full">
                                      {renderProductRecommendationCards(products)}
                                    </div>
                                  )
                                }
                                if (part.type === 'actions') {
                                    const partActions = part.actions || []
                                    return (
                                      <div key={`part-actions-${index}-${partIdx}`} className="flex flex-wrap gap-2 w-full max-w-[85%] sm:max-w-[80%] justify-start">
                                        {partActions.map((action: any, actionIdx: number) => (
                                          <button
                                            key={`part-action-btn-${index}-${partIdx}-${actionIdx}`}
                                            onClick={() => {
                                              if (isLoading) return
                                              const href = action.href || action.url
                                              if (href) {
                                                if (href.startsWith('action://')) {
                                                  handleChatActionUrl(href, action.label)
                                                } else if (href.startsWith('http')) {
                                                  window.open(href, '_blank', 'noopener,noreferrer')
                                                } else {
                                                  navigate(href)
                                                  setIsOpen(false)
                                                }
                                              }
                                            }}
                                            className={`px-3 py-1.5 rounded text-xs font-semibold shadow transition-colors cursor-pointer flex-grow text-center ${action.type === 'primary'
                                              ? 'bg-green-600 hover:bg-green-700 text-white'
                                              : 'bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200'
                                              }`}
                                          >
                                            {action.label}
                                          </button>
                                        ))}
                                      </div>
                                    )
                                  }
                                  return null
                                })}
                              </div>
                            )
                          }

                          // ===== LAYOUT COMPOSTO LEGADO: cart_summary (intro + cards + followUp + botões) =====
                          if (msg.role === 'assistant' && msg.metadata?.responseLayout === 'cart_summary') {
                            const cartProds = msg.metadata.cartProducts || []
                            const MAX_VISIBLE = 4
                            const visible = cartProds.slice(0, MAX_VISIBLE)
                            const overflow = cartProds.length - MAX_VISIBLE

                            const renderCartCard = (prod: any) => {
                              const liveItem = items.find(ci => ci.product?.id === prod.id)
                              const isRemoved = !!removedCartItems[prod.id]

                              if (isRemoved) {
                                const removed = removedCartItems[prod.id]
                                return (
                                  <div
                                    key={prod.id}
                                    className="bg-white dark:bg-gray-800 rounded-xl border border-dashed border-red-200 dark:border-red-800 p-3 flex items-center justify-between shadow-sm w-full"
                                  >
                                    <div className="flex-1 min-w-0">
                                      <p className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-1">
                                        <span className="text-red-500">🗑</span> <span className="font-medium text-gray-700 dark:text-gray-200">{removed.name}</span> foi removido
                                      </p>
                                    </div>
                                    <button
                                      onClick={async () => {
                                        try {
                                          // Readiciona o produto com a quantidade anterior
                                          await addProduct(
                                            { id: removed.productObj.id, name: removed.productObj.name, price: removed.productObj.price, image: productsService.getImageUrl(removed.productObj.image), description: '', category: 'outros', active: true } as any,
                                            removed.qty
                                          )
                                          await refreshCart()
                                          setRemovedCartItems(prev => {
                                            const next = { ...prev }
                                            delete next[prod.id]
                                            return next
                                          })
                                        } catch (e) {
                                          console.error('Erro ao desfazer remoção:', e)
                                        }
                                      }}
                                      className="ml-2 flex-shrink-0 px-2 py-1 rounded-lg bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-[10px] font-semibold border border-green-200 dark:border-green-700 hover:bg-green-100 dark:hover:bg-green-900/50 transition-colors cursor-pointer"
                                    >
                                      ↩ Desfazer
                                    </button>
                                  </div>
                                )
                              }

                              if (!liveItem) return null
                              const currentQty = liveItem.quantity
                              const unitPrice = prod.price
                              const subtotal = unitPrice * currentQty
                              const imageUrl = productsService.getImageUrl(prod.image)

                              return (
                                <div
                                  key={prod.id}
                                  className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm hover:shadow-md transition-shadow w-full"
                                >
                                  <div className="flex items-center gap-2.5 p-2.5">
                                    {/* Imagem */}
                                    <div className="w-12 h-12 flex-shrink-0 rounded-lg bg-gray-100 dark:bg-gray-700 overflow-hidden">
                                      <img
                                        src={imageUrl}
                                        alt={prod.name}
                                        className="w-full h-full object-contain"
                                        onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                                      />
                                    </div>
                                    {/* Infos */}
                                    <div className="flex-1 min-w-0">
                                      <p className="text-[11px] font-semibold text-gray-800 dark:text-gray-100 line-clamp-2 leading-snug">{prod.name}</p>
                                      <p className="text-[10px] text-green-600 dark:text-green-400 font-bold mt-0.5">
                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(unitPrice)} × {currentQty}
                                      </p>
                                      <p className="text-[10px] text-gray-500 dark:text-gray-400">
                                        Subtotal: <span className="font-semibold text-gray-700 dark:text-gray-200">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(subtotal)}</span>
                                      </p>
                                    </div>
                                    {/* Controles de quantidade — mínimo 1, nunca remove */}
                                    <div className="flex flex-col items-center gap-1 flex-shrink-0">
                                      <div className="flex items-center gap-1">
                                        <button
                                          onClick={async () => {
                                            if (currentQty <= 1) return // Bloqueado: mínimo 1
                                            await updateQuantity(liveItem.id, currentQty - 1)
                                            await refreshCart()
                                          }}
                                          disabled={currentQty <= 1}
                                          className={`w-6 h-6 flex items-center justify-center rounded-full text-sm font-bold transition-colors ${currentQty <= 1
                                            ? 'bg-gray-100 dark:bg-gray-800 text-gray-300 dark:text-gray-600 cursor-not-allowed'
                                            : 'bg-gray-100 dark:bg-gray-700 hover:bg-orange-100 dark:hover:bg-orange-900/30 text-gray-600 dark:text-gray-300 hover:text-orange-600 dark:hover:text-orange-400 cursor-pointer'
                                            }`}
                                          title={currentQty <= 1 ? 'Quantidade mínima é 1' : 'Diminuir'}
                                        >
                                          −
                                        </button>
                                        <span className="text-xs font-semibold text-gray-700 dark:text-gray-200 w-5 text-center">{currentQty}</span>
                                        <button
                                          onClick={async () => {
                                            await updateQuantity(liveItem.id, currentQty + 1)
                                            await refreshCart()
                                          }}
                                          className="w-6 h-6 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-green-100 dark:hover:bg-green-900/30 text-gray-600 dark:text-gray-300 hover:text-green-600 dark:hover:text-green-400 text-sm font-bold transition-colors cursor-pointer"
                                          title="Aumentar"
                                        >
                                          +
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                  {/* Link para o produto */}
                                  <div className="border-t border-gray-100 dark:border-gray-700 w-full">
                                    <button
                                      onClick={() => { navigate(`/produtos/${prod.id}`); setIsOpen(false) }}
                                      className="w-full py-1.5 text-center text-[10px] font-semibold text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer"
                                    >
                                      Ver produto →
                                    </button>
                                  </div>
                                </div>
                              )
                            }

                            return (
                              <div className="flex flex-col items-start justify-start w-full space-y-2">
                                {showSenderLabel && (
                                  <span className="text-[10px] text-green-600 dark:text-green-400 font-semibold ml-1">Kaia</span>
                                )}

                                {/* 1. Balão intro */}
                                <div className="max-w-[85%] sm:max-w-[80%] rounded-lg px-2.5 sm:px-3 py-1.5 sm:py-2 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700">
                                  <p className="text-xs sm:text-sm whitespace-pre-wrap break-words">{formatMessage(msg.content)}</p>
                                </div>

                                {/* 2. Mini cards do carrinho */}
                                {cartProds.length > 0 && (
                                  <div className="w-full max-w-[92%] space-y-2">
                                    {visible.map((prod: any) => renderCartCard(prod))}
                                    {overflow > 0 && (
                                      <button
                                        onClick={() => { navigate('/carrinho'); setIsOpen(false) }}
                                        className="w-full py-2 text-center text-[11px] font-semibold text-green-700 dark:text-green-400 border border-dashed border-green-300 dark:border-green-700 rounded-xl hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors cursor-pointer"
                                      >
                                        🛒 Ver carrinho completo (+{overflow} {overflow === 1 ? 'item' : 'itens'})
                                      </button>
                                    )}
                                  </div>
                                )}

                                {/* 3. Balão followUp (total/resumo) */}
                                {msg.metadata?.followUpText && (
                                  <div className="max-w-[85%] sm:max-w-[80%] rounded-lg px-2.5 sm:px-3 py-1.5 sm:py-2 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700">
                                    <p className="text-xs sm:text-sm whitespace-pre-wrap break-words">{formatMessage(msg.metadata.followUpText)}</p>
                                  </div>
                                )}

                                {/* 4. Botões de ação */}
                                {msg.actions && msg.actions.length > 0 && (
                                  <div className="flex flex-wrap gap-2 w-full max-w-[85%] sm:max-w-[80%] justify-start">
                                    {msg.actions.map((action: any, actionIdx: number) => (
                                      <button
                                        key={`csa-${index}-${actionIdx}`}
                                        onClick={() => {
                                          if (isLoading) return
                                          const href = action.href || action.url
                                          if (href) {
                                            if (href.startsWith('action://')) {
                                              handleChatActionUrl(href, action.label)
                                            } else if (href.startsWith('http')) {
                                              window.open(href, '_blank', 'noopener,noreferrer')
                                            } else {
                                              navigate(href)
                                              setIsOpen(false)
                                            }
                                          }
                                        }}
                                        className={`px-3 py-1.5 rounded text-xs font-semibold shadow transition-colors cursor-pointer flex-grow text-center ${action.type === 'primary'
                                          ? 'bg-green-600 hover:bg-green-700 text-white'
                                          : 'bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200'
                                          }`}
                                      >
                                        {action.label}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )
                          }

                          // ===== LAYOUT PADRÃO =====
                          return (
                            <div
                              className={`flex flex-col ${msg.role === 'user'
                                ? 'items-end justify-end'
                                : 'items-start justify-start'
                                }`}
                            >
                              {msg.role === 'admin' && showSenderLabel && (
                                <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold mb-0.5 ml-1">
                                  Atendente
                                </span>
                              )}
                              {msg.role === 'assistant' && showSenderLabel && (
                                <span className="text-[10px] text-green-600 dark:text-green-400 font-semibold mb-0.5 ml-1">
                                  Kaia
                                </span>
                              )}
                              {msg.content && (
                                <div
                                  className={`max-w-[85%] sm:max-w-[80%] rounded-lg px-2.5 sm:px-3 lg:px-4 py-1.5 sm:py-2 ${msg.role === 'user'
                                    ? 'bg-green-600 dark:bg-primary-600 text-white'
                                    : msg.role === 'admin'
                                      ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100 border border-blue-200 dark:border-blue-800'
                                      : 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700'
                                    }`}
                                >
                                  <p className="text-xs sm:text-sm whitespace-pre-wrap break-words">{formatMessage(msg.content)}</p>
                                </div>
                              )}
                              {msg.role === 'assistant' && msg.metadata?.recommendedProducts && msg.metadata.recommendedProducts.length > 0 && (
                                <div className="mt-2 space-y-2 w-full max-w-[85%] sm:max-w-[80%]">
                                  {msg.metadata.recommendedProducts.map((prod: any) => (
                                    <div
                                      key={prod.id}
                                      className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3 shadow-sm hover:shadow transition-shadow flex flex-col space-y-2 text-left"
                                    >
                                      <div className="flex justify-between items-center">
                                        <span className="text-[10px] bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-300 font-semibold px-1.5 py-0.5 rounded">
                                          {prod.category || 'Geral'}
                                        </span>
                                      </div>
                                      <div>
                                        <h4 className="font-semibold text-xs text-gray-800 dark:text-gray-100 line-clamp-1">
                                          {prod.name}
                                        </h4>
                                        {prod.description && (
                                          <p className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-2 mt-0.5 leading-snug">
                                            {prod.description}
                                          </p>
                                        )}
                                      </div>
                                      <div className="flex items-baseline space-x-1.5">
                                        <span className="text-xs font-bold text-green-600 dark:text-green-400">
                                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(prod.price)}
                                        </span>
                                        {prod.originalPrice && prod.originalPrice > prod.price && (
                                          <span className="text-[10px] text-gray-400 dark:text-gray-500 line-through">
                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(prod.originalPrice)}
                                          </span>
                                        )}
                                      </div>
                                      <div className="grid grid-cols-2 gap-1.5 pt-1">
                                        <button
                                          onClick={() => {
                                            navigate(prod.url)
                                            setIsOpen(false)
                                          }}
                                          className="py-1 text-center bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded text-[10px] font-semibold transition-colors cursor-pointer"
                                        >
                                          Ver Produto
                                        </button>
                                        <button
                                          onClick={() => handleAddProductDirectly(prod)}
                                          disabled={addingProductIds[prod.id] === 'loading'}
                                          className={`py-1 text-center rounded text-[10px] font-semibold transition-colors flex items-center justify-center space-x-1 cursor-pointer
                                            ${addingProductIds[prod.id] === 'success'
                                              ? 'bg-green-700 text-white border border-green-500 scale-95'
                                              : addingProductIds[prod.id] === 'loading'
                                                ? 'bg-green-600 opacity-70 text-white cursor-not-allowed'
                                                : 'bg-green-600 hover:bg-green-700 text-white'
                                            }`}
                                        >
                                          {addingProductIds[prod.id] === 'loading' ? (
                                            <>
                                              <Loader2 className="w-3 h-3 animate-spin" />
                                              <span>Adicionando...</span>
                                            </>
                                          ) : addingProductIds[prod.id] === 'success' ? (
                                            <span>Adicionado! ✓</span>
                                          ) : (
                                            <span>Adicionar</span>
                                          )}
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                              {/* Mini cards de cupom de desconto */}
                              {msg.role === 'assistant' && msg.metadata?.couponCards && msg.metadata.couponCards.length > 0 && (
                                <div className="mt-2 space-y-2 w-full max-w-[85%] sm:max-w-[80%]">
                                  {msg.metadata.couponCards.map((coupon) => {
                                    const isJustCopied = copiedCoupon === coupon.code
                                    const discountLabel = coupon.discountType === 'percentage'
                                      ? `${coupon.discountValue}% OFF`
                                      : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(coupon.discountValue) + ' OFF'
                                    const validUntil = coupon.endDate
                                      ? `Válido até ${new Date(coupon.endDate).toLocaleDateString('pt-BR')}`
                                      : null
                                    const minOrder = coupon.minOrderValue
                                      ? `Pedido mínimo: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(coupon.minOrderValue)}`
                                      : null

                                    return (
                                      <div
                                        key={coupon.code}
                                        className="bg-white dark:bg-gray-800 rounded-xl border border-green-200 dark:border-green-800/50 p-3 shadow-sm flex flex-col gap-2"
                                      >
                                        {/* Header: badge + desconto */}
                                        <div className="flex items-center justify-between">
                                          <span className="text-[10px] bg-green-50 dark:bg-green-950/50 text-green-700 dark:text-green-300 font-semibold px-2 py-0.5 rounded-full border border-green-200 dark:border-green-800">
                                            🏷️ Cupom de desconto
                                          </span>
                                          <span className="text-[11px] font-bold text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-950/30 px-2 py-0.5 rounded-full">
                                            {discountLabel}
                                          </span>
                                        </div>

                                        {/* Nome do cupom */}
                                        <p className="text-xs font-semibold text-gray-800 dark:text-gray-100 leading-snug">{coupon.name}</p>

                                        {/* Código em destaque */}
                                        <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-900 border border-dashed border-gray-300 dark:border-gray-700 rounded-lg px-3 py-1.5">
                                          <span className="font-mono text-sm font-bold tracking-widest text-gray-800 dark:text-gray-100 flex-1 select-all">
                                            {coupon.code}
                                          </span>
                                        </div>

                                        {/* Condições */}
                                        {(minOrder || validUntil || coupon.freeShipping) && (
                                          <div className="flex flex-wrap gap-1">
                                            {coupon.freeShipping && (
                                              <span className="text-[10px] text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30 px-1.5 py-0.5 rounded">🚚 Frete grátis</span>
                                            )}
                                            {minOrder && (
                                              <span className="text-[10px] text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">{minOrder}</span>
                                            )}
                                            {validUntil && (
                                              <span className="text-[10px] text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">⏰ {validUntil}</span>
                                            )}
                                          </div>
                                        )}

                                        {/* Botões */}
                                        <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                                          <button
                                            onClick={() => {
                                              navigator.clipboard.writeText(coupon.code).then(() => {
                                                setCopiedCoupon(coupon.code)
                                                setTimeout(() => setCopiedCoupon(null), 2500)
                                              }).catch(() => {
                                                window.prompt('Copie o código do cupom:', coupon.code)
                                              })
                                            }}
                                            className={`py-1.5 text-center rounded-lg text-[10px] font-semibold transition-all cursor-pointer ${
                                              isJustCopied
                                                ? 'bg-emerald-500 text-white scale-95'
                                                : 'bg-green-600 hover:bg-green-700 text-white'
                                            }`}
                                          >
                                            {isJustCopied ? '✅ Copiado!' : '📋 Copiar código'}
                                          </button>
                                          <button
                                            onClick={() => { navigate('/carrinho'); setIsOpen(false) }}
                                            className="py-1.5 text-center bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg text-[10px] font-semibold transition-colors cursor-pointer"
                                          >
                                            🛒 Ir ao carrinho
                                          </button>
                                        </div>
                                      </div>
                                    )
                                  })}
                                </div>
                              )}
                              {/* Mini cards do carrinho — layout padrão (sem responseLayout=cart_summary) */}
                              {msg.role === 'assistant' && msg.metadata?.cartProducts && msg.metadata.cartProducts.length > 0 && msg.metadata.responseLayout !== 'cart_summary' && (() => {
                                const MAX_VISIBLE = 4
                                const cartProds = msg.metadata.cartProducts!
                                const visible = cartProds.slice(0, MAX_VISIBLE)
                                const overflow = cartProds.length - MAX_VISIBLE
                                return (
                                  <div className="mt-2 space-y-2 w-full max-w-[92%]">
                                    {visible.map((prod: any) => {
                                      const liveItem = items.find(ci => ci.product?.id === prod.id)
                                      if (!liveItem && items.length > 0) return null
                                      const currentQty = liveItem ? liveItem.quantity : prod.quantity
                                      const subtotal = prod.price * currentQty
                                      const imageUrl = productsService.getImageUrl(prod.image)
                                      return (
                                        <div key={prod.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
                                          <div className="flex items-center gap-2.5 p-2.5">
                                            <div className="w-12 h-12 flex-shrink-0 rounded-lg bg-gray-100 dark:bg-gray-700 overflow-hidden">
                                              <img src={imageUrl} alt={prod.name} className="w-full h-full object-contain" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                              <p className="text-[11px] font-semibold text-gray-800 dark:text-gray-100 line-clamp-2">{prod.name}</p>
                                              <p className="text-[10px] text-green-600 dark:text-green-400 font-bold mt-0.5">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(prod.price)} × {currentQty}</p>
                                              <p className="text-[10px] text-gray-500">Subtotal: <span className="font-semibold text-gray-700 dark:text-gray-200">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(subtotal)}</span></p>
                                            </div>
                                          </div>
                                          <div className="border-t border-gray-100 dark:border-gray-700">
                                            <button onClick={() => { navigate(`/produtos/${prod.id}`); setIsOpen(false) }} className="w-full py-1.5 text-center text-[10px] font-semibold text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer">Ver produto</button>
                                          </div>
                                        </div>
                                      )
                                    })}
                                    {overflow > 0 && (
                                      <button onClick={() => { navigate('/carrinho'); setIsOpen(false) }} className="w-full py-2 text-center text-[11px] font-semibold text-green-700 dark:text-green-400 border border-dashed border-green-300 dark:border-green-700 rounded-xl hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors cursor-pointer">
                                        🛒 Ver carrinho completo (+{overflow} {overflow === 1 ? 'item' : 'itens'})
                                      </button>
                                    )}
                                  </div>
                                )
                              })()}
                              {msg.role === 'assistant' && msg.metadata?.followUpText && (
                                <div className="mt-2 max-w-[85%] sm:max-w-[80%] rounded-lg px-2.5 sm:px-3 lg:px-4 py-1.5 sm:py-2 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700">
                                  <p className="text-xs sm:text-sm whitespace-pre-wrap break-words">{formatMessage(msg.metadata.followUpText)}</p>
                                </div>
                              )}
                              {msg.actions && msg.actions.length > 0 && (() => {
                                const hasCoupons = msg.metadata?.couponCards && msg.metadata.couponCards.length > 0;
                                const hasProducts = msg.metadata?.recommendedProducts && msg.metadata.recommendedProducts.length > 0;
                                const responseType = msg.metadata?.responseType || msg.metadata?.responseLayout;

                                let filteredActions = msg.actions;
                                if (hasCoupons || responseType === 'coupon_cards') {
                                  filteredActions = filteredActions.filter((act: any) => {
                                    const href = act.href || '';
                                    if (href.startsWith('action://copy-coupon') || href === '/carrinho' || href === '/checkout') {
                                      return false;
                                    }
                                    if (href === '/produtos' && !act.globalAction) {
                                      return false;
                                    }
                                    return true;
                                  });
                                }

                                if (hasProducts || responseType === 'product_cards') {
                                  filteredActions = filteredActions.filter((act: any) => {
                                    const href = act.href || '';
                                    if (href === '/produtos' && hasProducts) {
                                      return false;
                                    }
                                    return true;
                                  });
                                }

                                if (filteredActions.length === 0) return null;

                                return (
                                  <div className={`mt-2 flex flex-wrap gap-2 w-full max-w-[85%] sm:max-w-[80%] ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    {filteredActions.map((action, actionIdx) => {
                                      // Detecta se o botão é de cópia de cupom
                                      const isCopyCoupon = action.href?.startsWith('action://copy-coupon')
                                      const couponCodeInUrl = isCopyCoupon
                                        ? new URLSearchParams(action.href.includes('?') ? action.href.split('?')[1] : '').get('code')
                                        : null
                                      const isJustCopied = couponCodeInUrl && copiedCoupon === couponCodeInUrl

                                      return (
                                        <button
                                          key={`action-${index}-${actionIdx}`}
                                          onClick={() => {
                                            if (isLoading) return
                                            if (action.href.startsWith('action://')) {
                                              handleChatActionUrl(action.href, action.label)
                                            } else if (action.href.startsWith('http')) {
                                              window.open(action.href, '_blank', 'noopener,noreferrer')
                                            } else {
                                              navigate(action.href)
                                              setIsOpen(false)
                                            }
                                          }}
                                          className={`px-3 py-1.5 rounded text-xs font-semibold shadow transition-all cursor-pointer flex-grow text-center ${
                                            isJustCopied
                                              ? 'bg-emerald-500 text-white scale-95'
                                              : action.type === 'primary'
                                                ? 'bg-green-600 hover:bg-green-700 text-white'
                                                : 'bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200'
                                          }`}
                                        >
                                          {isJustCopied ? '✅ Copiado!' : action.label}
                                        </button>
                                      )
                                    })}
                                  </div>
                                )
                              })()}
                            </div>
                          )
                        })()}
                      </div>
                    )
                  })}

                  {/* Sugestões de ajuda quando autenticado e não há mensagens de usuário ainda */}
                  {messages.filter(m => m.role === 'user').length === 0 && (
                    <div className="flex flex-col space-y-2 mt-4 animate-fade-in">
                      <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider pl-1">Sugestões de ajuda</p>
                      <div className="flex flex-wrap gap-1.5 pl-1">
                        {[
                          { label: '🛒 Ver meu carrinho', text: 'Mostrar carrinho' },
                          { label: '🚚 Como ter frete grátis?', text: 'Como ganhar frete grátis?' },
                          { label: '🎫 Quais são os cupons ativos?', text: 'Quais são os cupons ativos?' },
                          { label: '📦 Status do meu último pedido', text: 'Qual o status do meu último pedido?' },
                          { label: '🔥 Promoções', text: 'Quais são as promoções ativas?' },
                          { label: '👥 Falar com atendente', text: 'Quero falar com um atendente' }
                        ].map((sug, sugIdx) => (
                          <button
                            key={sugIdx}
                            onClick={() => sendMessageToServer(sug.text)}
                            className="px-2.5 py-1.5 bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-600 rounded-full text-xs font-medium shadow-sm transition-all cursor-pointer hover:scale-105"
                          >
                            {sug.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
              {(isLoading || isTypingFollowUp) && (
                <div className="flex justify-start mt-2">
                  <div className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-700 rounded-lg px-3.5 py-2.5 flex items-center space-x-1">
                    <span className="w-2 h-2 bg-green-600 dark:bg-primary-400 rounded-full typing-dot" />
                    <span className="w-2 h-2 bg-green-600 dark:bg-primary-400 rounded-full typing-dot" />
                    <span className="w-2 h-2 bg-green-600 dark:bg-primary-400 rounded-full typing-dot" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Modal de Confirmação de Novo Chat */}
            {showNewChatConfirm && (
              <div className="absolute inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-xl border border-gray-200 dark:border-gray-700 max-w-[85%] text-center space-y-3 animate-in fade-in zoom-in duration-200">
                  <h4 className="font-bold text-sm text-gray-900 dark:text-white">Iniciar novo chat?</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    O histórico atual continuará salvo e você poderá acessá-lo a qualquer momento pelo botão de Histórico.
                  </p>
                  <div className="flex space-x-2 pt-1.5">
                    <button
                      onClick={() => setShowNewChatConfirm(false)}
                      className="flex-1 py-1.5 text-xs text-gray-600 bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600 font-medium"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleStartNewChat}
                      className="flex-1 py-1.5 text-xs text-white bg-green-600 rounded hover:bg-green-700 font-semibold"
                    >
                      Confirmar
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Informações de status de atendimento humano */}
            {activeTab === 'chat' && (escalationStatus === 'human_assigned' || escalationStatus === 'human_needed') && (
              <div className={`px-3 py-1.5 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between text-[11px] sm:text-xs flex-shrink-0 ${escalationStatus === 'human_assigned'
                ? 'bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-300'
                : 'bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-300'
                }`}>
                <div className="flex items-center space-x-1.5">
                  <span className="flex items-center space-x-1 relative">
                    <span className={`w-1.5 h-1.5 rounded-full animate-ping absolute ${escalationStatus === 'human_assigned' ? 'bg-blue-500' : 'bg-amber-500'
                      }`}></span>
                    <span className={`w-1.5 h-1.5 rounded-full ${escalationStatus === 'human_assigned' ? 'bg-blue-500' : 'bg-amber-500'
                      }`}></span>
                  </span>
                  <span className="font-medium">
                    {escalationStatus === 'human_assigned'
                      ? escalationChannel === 'site'
                        ? 'Você está falando com um atendente'
                        : escalationChannel === 'whatsapp'
                          ? 'Atendimento ativo via WhatsApp'
                          : 'Atendimento humano ativo'
                      : escalationChannel === 'site'
                        ? 'Aguardando atendente...'
                        : escalationChannel === 'email'
                          ? 'Aguardando retorno por E-mail'
                          : 'Aguardando atendente via WhatsApp'}
                  </span>
                </div>
                {escalationStatus === 'human_needed' && (
                  <button
                    type="button"
                    onClick={() => setShowDeEscalateConfirm(true)}
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 font-semibold px-2 py-0.5 border border-gray-300 dark:border-gray-600 rounded text-[10px] transition-colors"
                  >
                    Voltar para a Kaia
                  </button>
                )}
              </div>
            )}

            {/* Confirmação de volta para IA */}
            {showDeEscalateConfirm && (
              <div className="absolute inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-xl border border-gray-200 dark:border-gray-700 max-w-[85%] text-center space-y-3 animate-in fade-in zoom-in duration-200">
                  <h4 className="font-bold text-sm text-gray-900 dark:text-white">Voltar para o atendimento automático?</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Deseja voltar para o atendimento automático da Kaia? O atendente atual será notificado.
                  </p>
                  <div className="flex space-x-2 pt-1.5">
                    <button
                      onClick={() => setShowDeEscalateConfirm(false)}
                      className="flex-1 py-1.5 text-xs text-gray-600 bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600 font-medium"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={() => { setShowDeEscalateConfirm(false); handleDeEscalate() }}
                      className="flex-1 py-1.5 text-xs text-white bg-green-600 rounded hover:bg-green-700 font-semibold"
                    >
                      Confirmar
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Input / Saída para Atendimento — apenas na aba de chat */}
            {activeTab === 'chat' && (showEscalationForm || (escalationStatus === 'human_needed' && escalationChannel !== 'site')) ? (
              <form onSubmit={handleEscalationSubmit} className="p-3 sm:p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex-shrink-0">
                {showEscalationForm ? (
                  <>
                    <div className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                      Como você prefere falar com nosso suporte humano?
                    </div>

                    {escalationChannel === null ? (
                      <div className="grid grid-cols-3 gap-2 mt-2">
                        <button
                          type="button"
                          onClick={async () => {
                            setShowEscalationForm(false)
                            setEscalationChannel(null)
                            setPendingContext('none')
                            setEscalationStatus('human_needed')
                            try {
                              await whatsappService.escalateSiteChat(
                                'site',
                                undefined, undefined, undefined,
                                'Cliente escolheu atendimento via chat do site.'
                              )
                            } catch (escalateErr) {
                              console.error('Erro ao registrar escalação para o site:', escalateErr)
                            }
                            setMessages(prev => [...prev, {
                              role: 'assistant',
                              content: 'Certo! Sua solicitação foi registrada. ✅\nUm atendente irá continuar o atendimento aqui no chat do site.\nEnquanto isso, pode descrever sua dúvida. 👇',
                              timestamp: Date.now(),
                            }])
                          }}
                          className="py-2.5 px-1 text-center bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/40 text-xs font-medium border border-blue-200 dark:border-blue-800 flex flex-col items-center justify-center space-y-1.5 transition-colors"
                        >
                          <MessageSquare className="w-4 h-4 mx-auto" />
                          <span>Chat do Site</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleWhatsAppHandoff('Cliente escolheu atendimento via WhatsApp.')}
                          className="py-2.5 px-1 text-center bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/40 text-xs font-medium border border-green-200 dark:border-green-800 flex flex-col items-center justify-center space-y-1.5 transition-colors"
                        >
                          <Phone className="w-4 h-4 mx-auto" />
                          <span>WhatsApp</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setEscalationChannel('email')}
                          className="py-2.5 px-1 text-center bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/40 text-xs font-medium border border-purple-200 dark:border-purple-800 flex flex-col items-center justify-center space-y-1.5 transition-colors"
                        >
                          <Mail className="w-4 h-4 mx-auto" />
                          <span>E-mail</span>
                        </button>
                      </div>
                    ) : escalationChannel === 'email' ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                            Via E-mail
                          </span>
                          <button type="button" onClick={() => setEscalationChannel(null)} className="text-[10px] text-green-600 hover:underline">Mudar</button>
                        </div>
                        <input type="text" value={contactName} onChange={e => setContactName(e.target.value)} placeholder="Seu Nome" required className="w-full text-xs p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-800 dark:text-white" />
                        <input type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} placeholder="Seu E-mail" required className="w-full text-xs p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-800 dark:text-white" />
                        <div className="flex space-x-2 pt-1">
                          <button type="button" onClick={() => { setShowEscalationForm(false); setEscalationChannel(null); }} className="flex-1 py-1.5 text-xs text-gray-600 bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600 font-medium">Cancelar</button>
                          <button type="submit" className="flex-1 py-1.5 text-xs text-white bg-green-600 rounded hover:bg-green-700 font-semibold">Confirmar</button>
                        </div>
                      </div>
                    ) : null}
                  </>
                ) : null}
              </form>
            ) : activeTab === 'chat' && !isAuthenticated ? (
              <div className="p-3 sm:p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Você precisa estar logado para enviar mensagens.
                </p>
              </div>
            ) : activeTab === 'chat' ? (
              <form onSubmit={handleSendMessage} className="p-2 sm:p-3 lg:p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                <div className="flex space-x-1.5 sm:space-x-2">
                  <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder={escalationStatus !== 'none' ? "Mensagem para o atendente..." : "Digite sua mensagem..."}
                    className="flex-1 px-2.5 sm:px-3 lg:px-4 py-1.5 sm:py-2 text-xs sm:text-sm lg:text-base border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-green-500 dark:focus:ring-primary-500 focus:border-transparent outline-none"
                    disabled={isLoading || isTypingFollowUp}
                  />
                  <button
                    type="submit"
                    disabled={isLoading || isTypingFollowUp || !inputMessage.trim()}
                    className="px-2.5 sm:px-3 lg:px-4 py-1.5 sm:py-2 bg-green-600 dark:bg-primary-600 text-white rounded-lg hover:bg-green-700 dark:hover:bg-primary-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors flex-shrink-0"
                  >
                    {isLoading || isTypingFollowUp ? (
                      <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4 sm:w-5 sm:h-5" />
                    )}
                  </button>
                </div>
              </form>
            ) : null}
          </div>
        </div>
      </div>
    </>
  )
}

export default FloatingChat

