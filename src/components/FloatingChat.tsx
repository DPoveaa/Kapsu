import React, { useState, useRef, useEffect, useCallback } from 'react'
import { MessageSquare, X, Send, Loader2, CheckCircle, XCircle } from 'lucide-react'
import { whatsappService } from '../services/whatsapp.service'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import { productsService } from '../services/products.service'
import { useNavigate } from 'react-router-dom'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: number
  actionResult?: {
    type: 'added' | 'removed' | 'error'
    productName?: string
    message?: string
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
  const processAIActions = async (aiData: any): Promise<ChatMessage[]> => {
    const actionMessages: ChatMessage[] = []

    if (!isAuthenticated) {
      return actionMessages // Não processa ações se não estiver logado
    }

    const extractedMessage = aiData.extractedMessage
    if (!extractedMessage) return actionMessages

    const intent = extractedMessage.intent
    const entities = extractedMessage.entities || {}
    const produto = entities.produto

    // Processa adição de produtos
    // IMPORTANTE: Se há produto mencionado, mesmo que a intenção seja pedir_recomendacao ou pedido_de_orcamento, deve adicionar ao carrinho
    const shouldAddProduct = produto && (
      intent === 'iniciar_compra' ||
      intent === 'adicionar_ao_carrinho' ||
      (intent === 'pedir_recomendacao' && produto) || // Se tem produto E pediu recomendação, adiciona o produto também
      (intent === 'pedido_de_orcamento' && produto) // Se tem produto E pediu orçamento, adiciona ao carrinho também
    );

    if (shouldAddProduct) {
      const productsToAdd = Array.isArray(produto) ? produto : [produto]

      // Extrai quantidade da mensagem ou usa padrão 1
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
            // Adiciona produto (a função addProduct já lida com produtos existentes)
            await addProduct(product, quantity)
            results.push(`${product.name} (${quantity}x)`)
          } else {
            errors.push(`"${productName}"`)
          }
        } catch (error: any) {
          console.error('Erro ao adicionar produto:', error)
          errors.push(`"${productName}"`)
        }
      }

      // Recarrega carrinho após processar todos os produtos
      if (results.length > 0) {
        await refreshCart()
      }

      // Cria mensagem de sucesso se houver produtos adicionados
      if (results.length > 0) {
        actionMessages.push({
          role: 'assistant',
          content: '',
          timestamp: Date.now(),
          actionResult: {
            type: 'added',
            productName: results.join(', '),
            message: `✅ ${results.length === 1 ? 'Produto' : 'Produtos'} adicionado${results.length > 1 ? 's' : ''} ao carrinho: ${results.join(', ')}`,
          },
        })
      }

      // Cria mensagem de erro se houver produtos não encontrados
      if (errors.length > 0) {
        actionMessages.push({
          role: 'assistant',
          content: '',
          timestamp: Date.now(),
          actionResult: {
            type: 'error',
            productName: errors.join(', '),
            message: `❌ Não encontrei ${errors.length === 1 ? 'o produto' : 'os produtos'}: ${errors.join(', ')}`,
          },
        })
      }
    }

    // Processa limpeza do carrinho
    if (intent === 'limpar_contexto') {
      try {
        await clearCart()
        await refreshCart()
        actionMessages.push({
          role: 'assistant',
          content: '',
          timestamp: Date.now(),
          actionResult: {
            type: 'removed',
            message: '✅ Carrinho limpo com sucesso!',
          },
        })
      } catch (error: any) {
        console.error('Erro ao limpar carrinho:', error)
        actionMessages.push({
          role: 'assistant',
          content: '',
          timestamp: Date.now(),
          actionResult: {
            type: 'error',
            message: `❌ Erro ao limpar carrinho: ${error.message}`,
          },
        })
      }
    }

    // Processa finalização da compra (redireciona para checkout)
    if (intent === 'finalizar_compra') {
      if (items.length === 0) {
        actionMessages.push({
          role: 'assistant',
          content: '',
          timestamp: Date.now(),
          actionResult: {
            type: 'error',
            message: '❌ Seu carrinho está vazio. Adicione produtos antes de finalizar.',
          },
        })
      } else {
        // Redireciona para checkout
        navigate('/checkout')
        actionMessages.push({
          role: 'assistant',
          content: '',
          timestamp: Date.now(),
          actionResult: {
            type: 'added',
            message: '✅ Redirecionando para finalizar sua compra...',
          },
        })
      }
    }

    // Processa atualização de quantidade
    if (intent === 'atualizar_quantidade' && produto && entities.quantidade) {
      const productsToUpdate = Array.isArray(produto) ? produto : [produto]
      const newQuantity = parseInt(String(entities.quantidade))

      if (isNaN(newQuantity) || newQuantity <= 0) {
        actionMessages.push({
          role: 'assistant',
          content: '',
          timestamp: Date.now(),
          actionResult: {
            type: 'error',
            message: '❌ Quantidade inválida. Por favor, informe um número maior que zero.',
          },
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
              await updateQuantity(cartItem.id, newQuantity)
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

      if (results.length > 0) {
        await refreshCart()
        actionMessages.push({
          role: 'assistant',
          content: '',
          timestamp: Date.now(),
          actionResult: {
            type: 'added',
            productName: results.join(', '),
            message: `✅ Quantidade atualizada: ${results.join(', ')}`,
          },
        })
      }

      if (errors.length > 0) {
        actionMessages.push({
          role: 'assistant',
          content: '',
          timestamp: Date.now(),
          actionResult: {
            type: 'error',
            productName: errors.join(', '),
            message: `❌ Não foi possível atualizar: ${errors.join(', ')}`,
          },
        })
      }
    }

    // Processa troca de produtos (remove o antigo e adiciona o novo)
    if (intent === 'trocar_produto') {
      const produtoAntigo = entities.produto_antigo
      const produtoNovo = entities.produto_novo

      if (!produtoAntigo || !produtoNovo) {
        actionMessages.push({
          role: 'assistant',
          content: '',
          timestamp: Date.now(),
          actionResult: {
            type: 'error',
            message: '❌ Não consegui identificar qual produto trocar. Por favor, seja mais específico (ex: "troque X por Y").',
          },
        })
        return actionMessages
      }

      // Extrai quantidade do novo produto ou usa padrão 1
      let quantity = 1
      if (entities.quantidade) {
        const qty = parseInt(String(entities.quantidade))
        if (!isNaN(qty) && qty > 0) {
          quantity = qty
        }
      }

      try {
        // Busca produtos
        const oldProduct = await findProductByName(produtoAntigo)
        const newProduct = await findProductByName(produtoNovo)

        if (!oldProduct) {
          actionMessages.push({
            role: 'assistant',
            content: '',
            timestamp: Date.now(),
            actionResult: {
              type: 'error',
              message: `❌ Não encontrei o produto "${produtoAntigo}" no sistema.`,
            },
          })
          return actionMessages
        }

        if (!newProduct) {
          actionMessages.push({
            role: 'assistant',
            content: '',
            timestamp: Date.now(),
            actionResult: {
              type: 'error',
              message: `❌ Não encontrei o produto "${produtoNovo}" no sistema.`,
            },
          })
          return actionMessages
        }

        // Encontra o item antigo no carrinho
        const oldCartItem = items.find(item => item.product?.id === oldProduct.id)

        if (!oldCartItem) {
          actionMessages.push({
            role: 'assistant',
            content: '',
            timestamp: Date.now(),
            actionResult: {
              type: 'error',
              message: `❌ O produto "${oldProduct.name}" não está no seu carrinho.`,
            },
          })
          return actionMessages
        }

        // Remove o produto antigo
        await removeItem(oldCartItem.id)

        // Adiciona o produto novo
        await addProduct(newProduct, quantity)

        // Recarrega carrinho
        await refreshCart()

        actionMessages.push({
          role: 'assistant',
          content: '',
          timestamp: Date.now(),
          actionResult: {
            type: 'added',
            message: `✅ Produto trocado: removido "${oldProduct.name}" e adicionado "${newProduct.name}" (${quantity}x)`,
          },
        })
      } catch (error: any) {
        console.error('Erro ao trocar produto:', error)
        actionMessages.push({
          role: 'assistant',
          content: '',
          timestamp: Date.now(),
          actionResult: {
            type: 'error',
            message: `❌ Erro ao trocar produto: ${error.message}`,
          },
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
            // Encontra o item no carrinho
            const cartItem = items.find(item => item.product?.id === product.id)

            if (cartItem) {
              await removeItem(cartItem.id)
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

      // Recarrega carrinho após processar todos os produtos
      if (results.length > 0) {
        await refreshCart()
      }

      // Cria mensagem de sucesso se houver produtos removidos
      if (results.length > 0) {
        actionMessages.push({
          role: 'assistant',
          content: '',
          timestamp: Date.now(),
          actionResult: {
            type: 'removed',
            productName: results.join(', '),
            message: `✅ ${results.length === 1 ? 'Produto' : 'Produtos'} removido${results.length > 1 ? 's' : ''} do carrinho: ${results.join(', ')}`,
          },
        })
      }

      // Cria mensagem de erro se houver problemas
      if (errors.length > 0) {
        actionMessages.push({
          role: 'assistant',
          content: '',
          timestamp: Date.now(),
          actionResult: {
            type: 'error',
            productName: errors.join(', '),
            message: `❌ ${errors.length === 1 ? 'Não foi possível remover' : 'Não foi possível remover'}: ${errors.join(', ')}`,
          },
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

    try {
      // Prepara histórico para a API
      const historyForAPI = messages.map(msg => ({
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
      const result = await whatsappService.siteChat(
        userMessage,
        historyForAPI,
        cartInfoForAI,
        user?.id,
        isAuthenticated,
        user ? { id: user.id, name: user.name, email: user.email, phone: user.phone } : undefined
      )
      const aiData = result.data

      // Processa ações da IA (adicionar/remover produtos, finalizar, limpar) se estiver logado
      const actionMessages = await processAIActions(aiData)

      // Adiciona mensagens de ação se houver
      if (actionMessages.length > 0) {
        setMessages(prev => [...prev, ...actionMessages])
      }

      // Adiciona resposta da IA
      const aiMessageEntry: ChatMessage = {
        role: 'assistant',
        content: aiData.aiResponse || 'Desculpe, não consegui processar sua mensagem.',
        timestamp: Date.now(),
      }
      setMessages(prev => [...prev, aiMessageEntry])
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

  // Função para processar formatação de texto (converter *texto* em negrito)
  const formatMessage = (text: string): React.ReactNode => {
    if (!text) return text

    // Regex para encontrar *texto* (negrito)
    // Não captura asteriscos que estão no início/fim da linha ou seguidos de espaço
    const parts: React.ReactNode[] = []
    let lastIndex = 0
    const regex = /\*([^*]+)\*/g
    let match

    while ((match = regex.exec(text)) !== null) {
      // Adiciona texto antes do match
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index))
      }
      // Adiciona o texto em negrito
      parts.push(<strong key={match.index}>{match[1]}</strong>)
      lastIndex = regex.lastIndex
    }

    // Adiciona o restante do texto
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex))
    }

    return parts.length > 0 ? parts : text
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
                    {/* Mensagem de ação (feedback de adicionar/remover) */}
                    {msg.actionResult && (
                      <div className="flex justify-center my-1.5 sm:my-2">
                        <div
                          className={`flex items-center space-x-1.5 sm:space-x-2 px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm ${msg.actionResult.type === 'added'
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border border-green-300 dark:border-green-700'
                            : msg.actionResult.type === 'removed'
                              ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 border border-orange-300 dark:border-orange-700'
                              : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border border-red-300 dark:border-red-700'
                            }`}
                        >
                          {msg.actionResult.type === 'added' && (
                            <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                          )}
                          {msg.actionResult.type === 'removed' && (
                            <XCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                          )}
                          {msg.actionResult.type === 'error' && (
                            <XCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                          )}
                          <span className="break-words">{formatMessage(msg.actionResult.message || '')}</span>
                        </div>
                      </div>
                    )}
                    {/* Mensagem normal */}
                    {msg.content && (
                      <div
                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[85%] sm:max-w-[80%] rounded-lg px-2.5 sm:px-3 lg:px-4 py-1.5 sm:py-2 ${msg.role === 'user'
                            ? 'bg-green-600 dark:bg-primary-600 text-white'
                            : 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700'
                            }`}
                        >
                          <p className="text-xs sm:text-sm whitespace-pre-wrap break-words">{formatMessage(msg.content)}</p>
                        </div>
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

            {/* Input */}
            <form onSubmit={handleSendMessage} className="p-2 sm:p-3 lg:p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
              <div className="flex space-x-1.5 sm:space-x-2">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="Digite sua mensagem..."
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
          </div>
        </div>
      </div>
    </>
  )
}

export default FloatingChat

