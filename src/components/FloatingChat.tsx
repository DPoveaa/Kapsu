import React, { useState, useRef, useEffect } from 'react'
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
    const buttonSize = 64 // 16 * 4 (w-16 h-16)
    const padding = 24 // 6 * 4 (p-6)
    
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
  
  const getChatPosition = (corner: CornerPosition) => {
    const chatWidth = 380
    const chatHeight = 600
    const padding = 24
    
    switch (corner) {
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
  
  // Posições calculadas baseadas na quina selecionada
  const [buttonPosition, setButtonPosition] = useState(() => getCornerPosition(selectedCorner))
  const [chatPosition, setChatPosition] = useState(() => getChatPosition(selectedCorner))
  
  const [isDraggingButton, setIsDraggingButton] = useState(false)
  const [isDraggingChat, setIsDraggingChat] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const buttonRef = useRef<HTMLButtonElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  // Atualiza posições quando a quina muda ou a janela redimensiona
  useEffect(() => {
    const updatePositions = () => {
      setButtonPosition(getCornerPosition(selectedCorner))
      if (isOpen) {
        setChatPosition(getChatPosition(selectedCorner))
      }
    }
    
    updatePositions()
    window.addEventListener('resize', updatePositions)
    return () => window.removeEventListener('resize', updatePositions)
  }, [selectedCorner, isOpen])

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
          name: item.product?.name || item.customMedication?.name || 'Produto',
          quantity: item.quantity,
          price: item.product?.price || item.customMedication?.price || 0,
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
    setButtonPosition(getCornerPosition(corner))
    if (isOpen) {
      setChatPosition(getChatPosition(corner))
    }
  }
  
  // Funções de arrastar o botão (para mudar de quina)
  const handleButtonMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      const startX = e.clientX
      const startY = e.clientY
      
      // Calcula o offset do clique dentro do botão
      const offsetX = e.clientX - rect.left
      const offsetY = e.clientY - rect.top
      
      let hasMoved = false
      
      const handleMouseMove = (moveEvent: MouseEvent) => {
        const deltaX = Math.abs(moveEvent.clientX - startX)
        const deltaY = Math.abs(moveEvent.clientY - startY)
        
        // Se moveu mais de 5px, considera arrasto
        if (deltaX > 5 || deltaY > 5) {
          hasMoved = true
          setIsDraggingButton(true)
          
          // Faz o botão seguir o mouse
          const newX = moveEvent.clientX - offsetX
          const newY = moveEvent.clientY - offsetY
          
          // Limita dentro da tela
          const maxX = window.innerWidth - 64
          const maxY = window.innerHeight - 64
          
          const constrainedX = Math.max(0, Math.min(newX, maxX))
          const constrainedY = Math.max(0, Math.min(newY, maxY))
          
          setButtonPosition({ x: constrainedX, y: constrainedY })
        }
      }
      
      const handleMouseUp = (upEvent: MouseEvent) => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
        
        setIsDraggingButton(false)
        
        if (hasMoved) {
          // Ao soltar, detecta a quina mais próxima e "prende" o botão lá
          const nearestCorner = detectNearestCorner(upEvent.clientX, upEvent.clientY)
          changeCorner(nearestCorner)
        } else {
          // Se não moveu, abre o chat
          toggleChat()
        }
      }
      
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }
  }

  // Funções de arrastar o chat
  const handleChatMouseDown = (e: React.MouseEvent) => {
    if (chatContainerRef.current) {
      const rect = chatContainerRef.current.getBoundingClientRect()
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      })
      setIsDraggingChat(true)
    }
  }

  // Efeito para arrastar o chat
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingChat) {
        const newX = e.clientX - dragOffset.x
        const newY = e.clientY - dragOffset.y
        
        // Limita dentro da tela
        const maxX = window.innerWidth - 380
        const maxY = window.innerHeight - 600
        
        const constrainedX = Math.max(0, Math.min(newX, maxX))
        const constrainedY = Math.max(0, Math.min(newY, maxY))
        
        setChatPosition({ x: constrainedX, y: constrainedY })
      }
    }

    const handleMouseUp = () => {
      if (isDraggingChat) {
        setIsDraggingChat(false)
        // Detecta a quina mais próxima e atualiza
        const nearestCorner = detectNearestCorner(chatPosition.x + 190, chatPosition.y + 300) // Centro do chat
        if (nearestCorner !== selectedCorner) {
          changeCorner(nearestCorner)
        }
      }
    }

    if (isDraggingChat) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDraggingChat, dragOffset, chatPosition, selectedCorner])

  const toggleChat = () => {
    if (isOpen) {
      // Ao fechar, reposiciona o chat na quina selecionada para a próxima abertura
      setChatPosition(getChatPosition(selectedCorner))
    } else {
      // Ao abrir, posiciona o chat na quina selecionada
      setChatPosition(getChatPosition(selectedCorner))
    }
    setIsOpen(!isOpen)
  }

  return (
    <>
      {/* Botão flutuante (pode ser arrastado para mudar de quina) */}
      {!isOpen && (
        <button
          ref={buttonRef}
          onMouseDown={handleButtonMouseDown}
          className="fixed w-16 h-16 text-white rounded-full shadow-lg flex items-center justify-center z-50 transition-all duration-300 hover:scale-110 cursor-pointer select-none"
          style={{
            left: `${buttonPosition.x}px`,
            top: `${buttonPosition.y}px`,
            backgroundColor: '#67C090',
            transition: isDraggingButton ? 'none' : 'all 0.3s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#5aad7d'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#67C090'
          }}
          aria-label="Pergunte a Kaia"
          title="Pergunte a Kaia - Arraste para mudar de posição ou clique para abrir"
        >
          <MessageSquare className="w-6 h-6 pointer-events-none" />
        </button>
      )}

      {/* Chat flutuante */}
      {isOpen && (
        <div
          ref={chatContainerRef}
          className="fixed z-50 bg-white rounded-lg shadow-2xl flex flex-col"
          style={{
            left: `${chatPosition.x}px`,
            top: `${chatPosition.y}px`,
            width: '380px',
            height: '600px',
            transition: isDraggingChat ? 'none' : 'all 0.3s ease',
          }}
        >
          {/* Cabeçalho (arrastável) */}
          <div
            onMouseDown={handleChatMouseDown}
            className="bg-green-600 text-white p-4 rounded-t-lg cursor-move flex items-center justify-between select-none"
          >
            <div className="flex items-center space-x-2">
              <MessageSquare className="w-5 h-5" />
              <h3 className="font-semibold">Kaia</h3>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={toggleChat}
                className="p-1 hover:bg-green-700 rounded transition-colors"
                aria-label="Fechar chat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Conteúdo do chat */}
          <>
              {/* Mensagens */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                {messages.length === 0 ? (
                  <div className="text-center text-gray-500 mt-8">
                    <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p className="font-medium text-gray-700 mb-2">
                      Olá{user ? `, ${user.name}` : ''}! Eu sou a Kaia 👋
                    </p>
                    <p className="text-sm text-gray-600 mb-3">
                      Como posso ajudar você hoje?
                    </p>
                    <p className="text-xs text-gray-500">
                      {isAuthenticated
                        ? 'Posso ajudar você a encontrar produtos, adicionar ao carrinho e finalizar sua compra.'
                        : 'Posso ajudar você a encontrar produtos e informações. Faça login para adicionar produtos ao carrinho.'}
                    </p>
                  </div>
                ) : (
                  messages.map((msg, index) => (
                    <div key={index}>
                      {/* Mensagem de ação (feedback de adicionar/remover) */}
                      {msg.actionResult && (
                        <div className="flex justify-center my-2">
                          <div
                            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm ${
                              msg.actionResult.type === 'added'
                                ? 'bg-green-100 text-green-800 border border-green-300'
                                : msg.actionResult.type === 'removed'
                                ? 'bg-orange-100 text-orange-800 border border-orange-300'
                                : 'bg-red-100 text-red-800 border border-red-300'
                            }`}
                          >
                            {msg.actionResult.type === 'added' && (
                              <CheckCircle className="w-4 h-4" />
                            )}
                            {msg.actionResult.type === 'removed' && (
                              <XCircle className="w-4 h-4" />
                            )}
                            {msg.actionResult.type === 'error' && (
                              <XCircle className="w-4 h-4" />
                            )}
                            <span>{msg.actionResult.message}</span>
                          </div>
                        </div>
                      )}
                      {/* Mensagem normal */}
                      {msg.content && (
                        <div
                          className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[80%] rounded-lg px-4 py-2 ${
                              msg.role === 'user'
                                ? 'bg-green-600 text-white'
                                : 'bg-white text-gray-800 border border-gray-200'
                            }`}
                          >
                            <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-white border border-gray-200 rounded-lg px-4 py-2">
                      <Loader2 className="w-4 h-4 animate-spin text-green-600" />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200 bg-white">
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder="Digite sua mensagem..."
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                    disabled={isLoading}
                  />
                  <button
                    type="submit"
                    disabled={isLoading || !inputMessage.trim()}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
                  >
                    {isLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Send className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </form>
          </>
        </div>
      )}
    </>
  )
}

export default FloatingChat

