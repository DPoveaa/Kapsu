import React, { useState, useRef, useEffect, useCallback } from 'react'
import { MessageSquare, X, Send, Loader2, Phone, Mail } from 'lucide-react'
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

interface ChatMessage {
  role: 'user' | 'assistant'
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
  }
}

type CornerPosition = 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'

const FloatingChat: React.FC = () => {
  const { isAuthenticated, user } = useAuth()
  const { addProduct, removeItem, items, refreshCart, clearCart, updateQuantity, getTotal, getItemCount } = useCart()
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [escalationStatus, setEscalationStatus] = useState<'none' | 'human_needed' | 'human_assigned'>('none')
  const [showEscalationForm, setShowEscalationForm] = useState(false)
  const [escalationChannel, setEscalationChannel] = useState<'site' | 'whatsapp' | 'email' | null>(null)
  // Controle de contexto: rastreia o que o bot está aguardando como resposta numérica
  const [pendingContext, setPendingContext] = useState<'none' | 'awaiting_support_channel'>("none")
  const [contactName, setContactName] = useState(user?.name || '')
  const [contactPhone, setContactPhone] = useState(user?.phone || '')
  const [contactEmail, setContactEmail] = useState(user?.email || '')

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

  // Scroll para a última mensagem
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  // Carrega e sincroniza o status da conversa com o backend
  useEffect(() => {
    const syncConversation = async () => {
      const sessionId = localStorage.getItem('sanare_site_session')
      if (!sessionId) return

      try {
        const response = await fetch(`${env.apiUrl}/chat/site/conversation/${sessionId}`)
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
            }
          }
        }
      } catch (err) {
        console.error('Erro ao sincronizar conversa com backend:', err)
      }
    }

    if (isOpen) {
      syncConversation()
      
      const interval = setInterval(() => {
        if (escalationStatus !== 'none' && escalationChannel === 'site') {
          syncConversation()
          
          const fetchHistory = async () => {
            const sessionId = localStorage.getItem('sanare_site_session')
            if (!sessionId) return
            try {
              const response = await fetch(`${env.apiUrl}/chat/site/conversation/${sessionId}`)
              if (response.ok) {
                const result = await response.json()
                if (result.success && result.data && Array.isArray(result.data.history)) {
                  setMessages(result.data.history.map((h: any) => ({
                    role: h.role,
                    content: h.content,
                    timestamp: h.timestamp || Date.now(),
                    actionResult: h.metadata?.actionResult || undefined
                  })))
                }
              }
            } catch (err) {
              console.error('Erro ao buscar histórico de mensagens:', err)
            }
          }
          fetchHistory()
        }
      }, 5000)

      return () => clearInterval(interval)
    }
  }, [isOpen, escalationStatus, escalationChannel])

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

    // Processa adição de produtos
    const shouldAddProduct = produto && (
      intent === 'iniciar_compra' ||
      intent === 'adicionar_ao_carrinho' ||
      (intent === 'pedir_recomendacao' && produto) ||
      (intent === 'pedido_de_orcamento' && produto)
    );

    if (shouldAddProduct) {
      const productsToAdd = Array.isArray(produto) ? produto : [produto]
      let quantity = 1
      if (entities.quantidade) {
        const qty = parseInt(String(entities.quantidade))
        if (!isNaN(qty) && qty > 0) {
          quantity = qty
        }
      }

      const results: string[] = []
      const errors: string[] = []

      for (const productName of productsToAdd) {
        if (!productName || typeof productName !== 'string') continue

        try {
          const product = await findProductByName(productName)
          if (product) {
            // Se for convidado, atualiza o carrinho local
            if (!isAuthenticated) {
              await addProduct(product, quantity)
            }
            results.push(`${product.name} (${quantity}x)`)
          } else {
            errors.push(`"${productName}"`)
          }
        } catch (error: any) {
          console.error('Erro ao adicionar produto:', error)
          errors.push(`"${productName}"`)
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
    if (intent === 'remover_produto' && produto) {
      const productsToRemove = Array.isArray(produto) ? produto : [produto]
      const results: string[] = []
      const errors: string[] = []

      for (const productName of productsToRemove) {
        if (!productName || typeof productName !== 'string') continue

        try {
          const product = await findProductByName(productName)
          if (product) {
            const cartItem = items.find(item => item.product?.id === product.id)
            if (cartItem) {
              if (!isAuthenticated) {
                await removeItem(cartItem.id)
              }
              results.push(product.name)
            } else {
              errors.push(`"${productName}" (não está no carrinho)`)
            }
          } else {
            errors.push(`"${productName}" (não encontrado)`)
          }
        } catch (error: any) {
          console.error('Erro ao remover produto:', error)
          errors.push(`"${productName}"`)
        }
      }

      if (isAuthenticated && results.length > 0) {
        await refreshCart()
      }

      if (results.length > 0) {
        actionMessages.push({
          type: 'removed',
          message: `✅ ${results.length === 1 ? 'Produto' : 'Produtos'} removido${results.length > 1 ? 's' : ''} do carrinho: ${results.join(', ')}`,
        })
      }

      if (errors.length > 0) {
        actionMessages.push({
          type: 'error',
          message: `❌ Não foi possível remover: ${errors.join(', ')}`,
        })
      }
    }

    return actionMessages
  }

  // Função para enviar mensagem
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputMessage.trim() || isLoading) return

    const userMessage = inputMessage.trim()
    setInputMessage('')
    setIsLoading(true)

    // Adiciona mensagem do usuário
    const userMessageEntry: ChatMessage = {
      role: 'user',
      content: userMessage,
      timestamp: Date.now(),
    }
    setMessages(prev => [...prev, userMessageEntry])

    // ── CONTROLE DE CONTEXTO: intercept respostas numéricas para escolha de canal de suporte ──
    if (pendingContext === 'awaiting_support_channel') {
      const trimmed = userMessage.trim()
      const channelMap: Record<string, 'site' | 'whatsapp' | 'email'> = {
        '1': 'site', 'chat': 'site', 'chat do site': 'site',
        '2': 'whatsapp', 'whatsapp': 'whatsapp', 'zap': 'whatsapp', 'zap zap': 'whatsapp', 'wpp': 'whatsapp',
        '3': 'email', 'email': 'email', 'e-mail': 'email',
      }
      const chosen = channelMap[trimmed.toLowerCase()]
      if (chosen) {
        setPendingContext('none')
        setEscalationChannel(chosen)
        setShowEscalationForm(true)
        setEscalationStatus('human_needed')
        const channelLabel = chosen === 'site' ? 'Chat do Site' : chosen === 'whatsapp' ? 'WhatsApp' : 'E-mail'
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `Ótimo! Vou te conectar via ${channelLabel}. Por favor, confirme seus dados abaixo para continuar.`,
          timestamp: Date.now(),
        }])
        setIsLoading(false)
        return
      }
      // Se não mapeou, limpa o contexto e continua normal
      setPendingContext('none')
    }

    try {
      // Prepara histórico para a API
      const conversationHistory = messages
        .filter(msg => msg.content)
        .map(msg => ({
          role: msg.role,
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
        user ? { id: user.id, name: user.name, email: user.email, phone: user.phone } : undefined
      )
      
      if (!result.success) {
        throw new Error(result.message || 'Erro ao processar mensagem')
      }
      
      const aiData = result.data || {}

      // Sincroniza o carrinho se o backend retornar o estado do carrinho atualizado do banco
      if (aiData.currentCart && isAuthenticated) {
        await refreshCart()
      }

      if (aiData.shouldEscalateHuman) {
        setShowEscalationForm(true)
        setEscalationStatus('human_needed')
        // Marca que a próxima mensagem numérica será uma escolha de canal
        setPendingContext('awaiting_support_channel')
        
        const aiMessageEntry: ChatMessage = {
          role: 'assistant',
          content: aiData.aiResponse || 'Para esse atendimento, vou encaminhar você para um atendente humano. Como você prefere continuar?',
          timestamp: Date.now(),
        }
        setMessages(prev => [...prev, aiMessageEntry])
        return
      }

      // Processa ações da IA (adicionar/remover produtos, finalizar, limpar)
      const actionMessages = await processAIActions(aiData)

      let consolidatedContent = '';
      let actions: ChatAction[] = [];

      // Combine action messages content
      for (const actionInfo of actionMessages) {
        if (actionInfo.message) {
          consolidatedContent += actionInfo.message + '\n\n';
          
          if (actionInfo.type === 'added') {
            actions.push({ label: 'Ir para o carrinho 🛒', href: '/carrinho', type: 'primary' })
            actions.push({ label: 'Continuar comprando', href: '/produtos', type: 'secondary' })
          } else if (actionInfo.type === 'removed') {
            actions.push({ label: 'Ir para produtos', href: '/produtos', type: 'primary' })
          }
        }
      }

      // Add AI response content
      if (aiData.aiResponse) {
        consolidatedContent += aiData.aiResponse;
      }
      
      // Intent specific actions overrides
      const intent = aiData.extractedMessage?.intent;
      if (intent === 'finalizar_compra') {
        actions = [{ label: 'Finalizar Compra 💳', href: '/checkout', type: 'primary' }];
      } else if (intent === 'pergunta_carrinho') {
        actions = [
          { label: 'Ir para o carrinho 🛒', href: '/carrinho', type: 'primary' },
          { label: 'Finalizar Compra 💳', href: '/checkout', type: 'secondary' }
        ];
      }

      if (consolidatedContent.trim()) {
        const aiMessageEntry: ChatMessage = {
          role: 'assistant',
          content: consolidatedContent.trim(),
          timestamp: Date.now(),
          actions: actions.length > 0 ? actions : undefined,
          metadata: aiData.recommendedProducts && aiData.recommendedProducts.length > 0
            ? { recommendedProducts: aiData.recommendedProducts }
            : undefined
        }
        setMessages(prev => [...prev, aiMessageEntry])
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
    }
  }

  const handleEscalationSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!escalationChannel) return
    setIsLoading(true)
    try {
      const result = await whatsappService.escalateSiteChat(
        escalationChannel,
        contactName || undefined,
        contactPhone || undefined,
        contactEmail || undefined,
        'Cliente solicitou atendimento humano via widget do site.'
      )
      if (result.success) {
        setEscalationStatus('human_needed')
        setShowEscalationForm(false)
        
        const channelLabel = escalationChannel === 'site' 
          ? 'Chat do Site' 
          : escalationChannel === 'whatsapp' 
            ? 'WhatsApp' 
            : 'E-mail';
            
        setMessages(prev => [
          ...prev,
          {
            role: 'assistant',
            content: `Solicitação registrada com sucesso! Você escolheu atendimento via ${channelLabel}. Nosso time entrará em contato em breve.`,
            timestamp: Date.now()
          }
        ])

        if (escalationChannel === 'whatsapp') {
          const cleanPhone = contactPhone.replace(/\D/g, '') || env.supportWhatsAppUrl.replace(/\D/g, '');
          window.open(`https://api.whatsapp.com/send?phone=${cleanPhone}`, '_blank', 'noopener,noreferrer')
        }
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
    try {
      setIsLoading(true)
      const fullProduct = await productsService.getById(product.id)
      if (fullProduct) {
        await addProduct(fullProduct, 1)
        await refreshCart()
        setMessages(prev => [
          ...prev,
          {
            role: 'assistant' as const,
            content: `✅ Produto adicionado ao carrinho: ${fullProduct.name} (1x)\n\nDeseja continuar comprando ou ir para o carrinho?`,
            timestamp: Date.now(),
            actions: [
              { label: 'Ir para o carrinho 🛒', href: '/carrinho', type: 'primary' as const },
              { label: 'Continuar comprando', href: '/produtos', type: 'secondary' as const },
            ]
          }
        ])
      } else {
        throw new Error('Produto não encontrado')
      }
    } catch (error) {
      console.error('Erro ao adicionar produto diretamente:', error)
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant' as const,
          content: `❌ Não foi possível adicionar "${product.name}" ao carrinho. Tente novamente.`,
          timestamp: Date.now(),
        }
      ])
    } finally {
      setIsLoading(false)
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
              <h3 className="font-semibold text-sm sm:text-base">Kaia</h3>
            </div>
            <div className="flex items-center space-x-1.5 sm:space-x-2">
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
            {/* Mensagens */}
            <div className="flex-1 overflow-y-auto p-2 sm:p-3 lg:p-4 space-y-2 sm:space-y-3 lg:space-y-4 bg-gray-50 dark:bg-gray-800">
              {messages.length === 0 ? (
                <div className="text-center text-gray-500 dark:text-gray-400 mt-4 sm:mt-6 lg:mt-8 px-2">
                  <MessageSquare className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-2 opacity-50" />
                  <p className="font-medium text-sm sm:text-base text-gray-700 dark:text-gray-200 mb-1.5 sm:mb-2">
                    Olá{user ? `, ${user.name}` : ''}! Eu sou a Kaia 👋
                  </p>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 mb-2 sm:mb-3">
                    Como posso ajudar você hoje?
                  </p>
                </div>
              ) : (
                messages.map((msg, index) => (
                  <div key={index}>
                    {/* Mensagem normal */}
                    {msg.content && (
                      <div
                        className={`flex flex-col ${msg.role === 'user' ? 'items-end justify-end' : 'items-start justify-start'}`}
                      >
                        <div
                          className={`max-w-[85%] sm:max-w-[80%] rounded-lg px-2.5 sm:px-3 lg:px-4 py-1.5 sm:py-2 ${msg.role === 'user'
                            ? 'bg-green-600 dark:bg-primary-600 text-white'
                            : 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700'
                            }`}
                        >
                          <p className="text-xs sm:text-sm whitespace-pre-wrap break-words">{formatMessage(msg.content)}</p>
                        </div>
                        {msg.actions && msg.actions.length > 0 && (
                          <div className={`mt-2 flex flex-wrap gap-2 w-full max-w-[85%] sm:max-w-[80%] ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            {msg.actions.map((action, actionIdx) => (
                              <button
                                key={`action-${index}-${actionIdx}`}
                                onClick={() => {
                                  if (action.href.startsWith('http')) {
                                    window.open(action.href, '_blank', 'noopener,noreferrer');
                                  } else {
                                    navigate(action.href);
                                    setIsOpen(false);
                                  }
                                }}
                                className={`px-3 py-1.5 rounded text-xs font-semibold shadow transition-colors cursor-pointer flex-grow text-center ${
                                  action.type === 'primary' 
                                    ? 'bg-green-600 hover:bg-green-700 text-white' 
                                    : 'bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200'
                                }`}
                              >
                                {action.label}
                              </button>
                            ))}
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
                                    className="py-1 text-center bg-green-600 hover:bg-green-700 text-white rounded text-[10px] font-semibold transition-colors flex items-center justify-center space-x-1 cursor-pointer"
                                  >
                                    <span>Adicionar</span>
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-700 rounded-lg px-2.5 sm:px-3 lg:px-4 py-1.5 sm:py-2">
                    <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin text-green-600 dark:text-primary-400" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Informações de status de atendimento humano */}
            {(escalationStatus === 'human_assigned' || escalationStatus === 'human_needed') && (
              <div className="bg-green-50 dark:bg-green-950/20 px-3 py-1.5 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between text-[11px] sm:text-xs text-green-700 dark:text-green-300 flex-shrink-0">
                <div className="flex items-center space-x-1.5">
                  <span className="flex items-center space-x-1 relative">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-ping absolute"></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                  </span>
                  <span className="font-medium">
                    {escalationChannel === 'site' 
                      ? 'Aguardando atendente (Chat do Site)' 
                      : escalationChannel === 'email' 
                        ? 'Atendimento por E-mail registrado' 
                        : 'Atendimento pelo WhatsApp'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleDeEscalate}
                  className="text-red-500 hover:text-red-700 font-semibold px-2 py-0.5 border border-red-200 rounded text-[10px]"
                >
                  Voltar para IA
                </button>
              </div>
            )}

            {/* Input / Saida para Atendimento */}
            {showEscalationForm || (escalationStatus === 'human_needed' && escalationChannel !== 'site') ? (
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
                          onClick={() => setEscalationChannel('site')}
                          className="py-2.5 px-1 text-center bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/40 text-xs font-medium border border-blue-200 dark:border-blue-800 flex flex-col items-center justify-center space-y-1.5 transition-colors"
                        >
                          <MessageSquare className="w-4 h-4 mx-auto" />
                          <span>Chat do Site</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setEscalationChannel('whatsapp')}
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
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                            Via {escalationChannel === 'site' ? 'Chat do Site' : escalationChannel === 'whatsapp' ? 'WhatsApp' : 'E-mail'}
                          </span>
                          <button type="button" onClick={() => setEscalationChannel(null)} className="text-[10px] text-green-600 hover:underline">Mudar</button>
                        </div>
                        {(escalationChannel === 'whatsapp' || escalationChannel === 'email') && (
                          <input type="text" value={contactName} onChange={e => setContactName(e.target.value)} placeholder="Seu Nome" required className="w-full text-xs p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-800 dark:text-white" />
                        )}
                        {escalationChannel === 'whatsapp' && (
                          <input type="tel" value={contactPhone} onChange={e => setContactPhone(e.target.value)} placeholder="Seu WhatsApp" required className="w-full text-xs p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-800 dark:text-white" />
                        )}
                        {escalationChannel === 'email' && (
                          <input type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} placeholder="Seu E-mail" required className="w-full text-xs p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-800 dark:text-white" />
                        )}
                        <div className="flex space-x-2 pt-1">
                          <button type="button" onClick={() => { setShowEscalationForm(false); setEscalationChannel(null); }} className="flex-1 py-1.5 text-xs text-gray-600 bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600">Cancelar</button>
                          <button type="submit" className="flex-1 py-1.5 text-xs text-white bg-green-600 rounded hover:bg-green-700">Confirmar</button>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  // Já escalonado via WhatsApp ou E-mail (IA pausada)
                  <div className="text-center py-2">
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 mb-3">
                      Seu atendimento humano via <strong>{escalationChannel === 'whatsapp' ? 'WhatsApp' : 'E-mail'}</strong> está ativo.
                    </p>
                    {escalationChannel === 'whatsapp' && (
                      <button
                        type="button"
                        onClick={() => window.open(`https://api.whatsapp.com/send?phone=${contactPhone.replace(/\D/g, '') || env.supportWhatsAppUrl.replace(/\D/g, '')}`, '_blank')}
                        className="py-1.5 px-3 bg-green-600 hover:bg-green-700 text-white rounded text-xs font-semibold inline-flex items-center space-x-1.5 transition-colors mb-2"
                      >
                        <Phone className="w-3.5 h-3.5 mr-1.5" />
                        <span>Abrir WhatsApp</span>
                      </button>
                    )}
                  </div>
                )}
              </form>
            ) : (
              <form onSubmit={handleSendMessage} className="p-2 sm:p-3 lg:p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                <div className="flex space-x-1.5 sm:space-x-2">
                  <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder={escalationStatus !== 'none' ? "Mensagem para o atendente..." : "Digite sua mensagem..."}
                    className="flex-1 px-2.5 sm:px-3 lg:px-4 py-1.5 sm:py-2 text-xs sm:text-sm lg:text-base border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-green-500 dark:focus:ring-primary-500 focus:border-transparent outline-none"
                    disabled={isLoading}
                  />
                  <button
                    type="submit"
                    disabled={isLoading || !inputMessage.trim()}
                    className="px-2.5 sm:px-3 lg:px-4 py-1.5 sm:py-2 bg-green-600 dark:bg-primary-600 text-white rounded-lg hover:bg-green-700 dark:hover:bg-primary-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors flex-shrink-0"
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4 sm:w-5 sm:h-5" />
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

export default FloatingChat

