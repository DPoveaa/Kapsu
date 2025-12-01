import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Send, Search, MessageSquare, Clock, ChevronLeft, ArrowLeft, Paperclip, X, Lock, Unlock, ZoomIn, Download, User } from 'lucide-react'
import { whatsappService } from '../services/whatsapp.service'
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
  filePath?: string
  fileSize?: number
  fileExtension?: string
}

interface Conversation {
  phone: string
  contactName?: string
  lastMessage: WhatsAppMessage
  unreadCount: number
  messages: WhatsAppMessage[]
  needsResponse?: boolean
  needsPharmacist?: boolean
  isAssumed?: boolean
  assumedBy?: string | null
  assumedAt?: Date | null
  assumptionReason?: string | null
  awaitingControlledConfirmation?: boolean
}

export default function WhatsAppSupport() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null)
  const [messages, setMessages] = useState<WhatsAppMessage[]>([])
  const currentConversationRef = useRef<string | null>(null)
  const loadingMessagesRef = useRef<boolean>(false)
  // Cache de mensagens removido - não está sendo usado neste componente
  const [searchTerm, setSearchTerm] = useState('')
  const [messageText, setMessageText] = useState('')
  const [sending, setSending] = useState(false)
  const [showConversationList, setShowConversationList] = useState(true) // Para mobile: controla se mostra lista ou mensagens
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [filePreview, setFilePreview] = useState<string | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null) // Para preview de imagens no modal
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
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [previousMessageCount, setPreviousMessageCount] = useState(0)
  const [isUserScrolling, setIsUserScrolling] = useState(false)
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Carrega todas as conversas
  useEffect(() => {
    loadConversations()
    const interval = setInterval(loadConversations, 3000)
    return () => clearInterval(interval)
  }, [])

  // Carrega mensagens quando uma conversa é selecionada
  useEffect(() => {
    // Atualiza a ref com a conversa atual
    currentConversationRef.current = selectedConversation
    
    if (selectedConversation) {
      setPreviousMessageCount(0) // Reset contador ao trocar de conversa
      setIsUserScrolling(false) // Reset flag de scroll manual
      
      // Limpa mensagens anteriores imediatamente ao trocar de conversa
      setMessages([])
      loadingMessagesRef.current = false
      
      // Carrega mensagens da nova conversa
      const currentPhone = selectedConversation
      loadMessages(currentPhone)
      markAsRead(currentPhone)
      
      const interval = setInterval(() => {
        // Verifica se ainda é a conversa selecionada usando a ref (sempre atualizada)
        if (currentConversationRef.current === currentPhone && !loadingMessagesRef.current) {
          loadMessages(currentPhone)
        }
      }, 2000)
      
      return () => {
        clearInterval(interval)
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

  // Scroll automático para última mensagem (apenas quando há novas mensagens ou ao abrir conversa)
  useEffect(() => {
    if (messages.length > 0 && selectedConversation && messagesContainerRef.current) {
      // Scroll instantâneo para o final quando há mensagens
      // Se for primeira vez carregando (previousMessageCount === 0), scroll instantâneo
      // Se houver novas mensagens e usuário não estiver rolando manualmente, também scroll instantâneo
      if (previousMessageCount === 0 || (messages.length > previousMessageCount && !isUserScrolling)) {
        // Scroll instantâneo sem delay ou animação
        messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight
        setPreviousMessageCount(messages.length)
      }
    }
  }, [messages.length, selectedConversation, isUserScrolling]) // Removido previousMessageCount das dependências para evitar loop
  
  // Reset contador quando troca de conversa e scroll instantâneo para o final
  useEffect(() => {
    setPreviousMessageCount(0)
    setIsUserScrolling(false)
    // Scroll instantâneo para o final quando troca de conversa (sem animação)
    if (messagesContainerRef.current) {
      // Scroll instantâneo sem delay
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight
    }
  }, [selectedConversation])

  // Detecta quando o usuário está rolando manualmente
  useEffect(() => {
    const container = messagesContainerRef.current
    if (!container) return

    const handleScroll = () => {
      // Verifica se o usuário está próximo do final (dentro de 100px)
      const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100
      
      // Se o usuário está rolando manualmente e não está próximo do final, marca como scroll manual
      if (!isNearBottom) {
        setIsUserScrolling(true)
        
        // Limpa timeout anterior
        if (scrollTimeoutRef.current) {
          clearTimeout(scrollTimeoutRef.current)
        }
        
        // Após 2 segundos sem scroll, permite scroll automático novamente
        scrollTimeoutRef.current = setTimeout(() => {
          setIsUserScrolling(false)
        }, 2000)
      } else {
        // Se está próximo do final, permite scroll automático
        setIsUserScrolling(false)
      }
    }

    container.addEventListener('scroll', handleScroll)
    return () => {
      container.removeEventListener('scroll', handleScroll)
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }
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

  const loadConversations = async () => {
    try {
      // Busca TODAS as conversas (não apenas as que precisam de intervenção)
      const data = await whatsappService.getConversations()
      if (data.success) {
        // O backend já retorna ordenado, mas garante ordenação por timestamp da última mensagem (mais recente primeiro)
        // Conversas sem mensagens (timestamp 0) vão para o final
        const sorted = (data.conversations || []).sort((a, b) => {
          // Garante que os timestamps são números válidos
          const timestampA = a.lastMessage?.timestamp ? Number(a.lastMessage.timestamp) : 0
          const timestampB = b.lastMessage?.timestamp ? Number(b.lastMessage.timestamp) : 0
          // Se ambos têm timestamp 0, mantém ordem original
          if (timestampA === 0 && timestampB === 0) return 0
          // Se apenas um tem timestamp 0, coloca no final
          if (timestampA === 0) return 1
          if (timestampB === 0) return -1
          // Ordem decrescente (mais recente primeiro)
          return timestampB - timestampA
        })
        setConversations(sorted)
      }
    } catch (error) {
      console.error('Erro ao carregar conversas:', error)
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
      
      const data = await whatsappService.getConversationMessages(phone)
      
      // Verifica novamente após a requisição (pode ter mudado durante o async)
      if (currentConversationRef.current !== phone) {
        loadingMessagesRef.current = false
        return // Ignora se a conversa mudou durante a requisição
      }
      
      if (data.success) {
        const loadedMessages = data.messages || []
        setMessages(loadedMessages)
      }
      
      loadingMessagesRef.current = false
    } catch (error) {
      loadingMessagesRef.current = false
      console.error('Erro ao carregar mensagens:', error)
    }
  }

  const handleSelectConversation = (phone: string) => {
    setSelectedConversation(phone)
    setShowConversationList(false) // Esconde lista no mobile quando seleciona conversa
  }

  const handleBackToConversations = () => {
    setShowConversationList(true)
    setSelectedConversation(null)
  }

  const handleBlockConversation = async () => {
    if (!selectedConversation) return
    
    try {
      const userName = user?.name || 'Administrador'
      await whatsappService.markConversationAsAssumed(
        selectedConversation,
        userName,
        'Conversa assumida manualmente'
      )
      alert('Conversa assumida com sucesso! A IA foi bloqueada.')
      // Recarrega as conversas para atualizar o status
      loadConversations()
    } catch (error: any) {
      console.error('Erro ao assumir conversa:', error)
      alert('Erro ao assumir conversa: ' + error.message)
    }
  }

  const handleUnblockConversation = async () => {
    if (!selectedConversation) return
    
    try {
      await whatsappService.unmarkConversationAsAssumed(selectedConversation)
      alert('Conversa desbloqueada com sucesso! A IA voltará a responder.')
      // Recarrega as conversas para atualizar o status
      loadConversations()
    } catch (error: any) {
      console.error('Erro ao desbloquear conversa:', error)
      alert('Erro ao desbloquear conversa: ' + error.message)
    }
  }

  const markAsRead = async (phone: string) => {
    try {
      await whatsappService.markConversationAsRead(phone)
    } catch (error) {
      console.error('Erro ao marcar como lida:', error)
    }
  }

  const sendMessage = useCallback(async () => {
    if ((!messageText.trim() && !selectedFile) || !selectedConversation || sending) return

    setSending(true)
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
              selectedConversation!,
              base64,
              mediaType,
              messageText.trim() || undefined,
              selectedFile!.name
            )
            setMessageText('')
            setSelectedFile(null)
            setFilePreview(null)
            // Recarrega mensagens após enviar
            setTimeout(() => {
              if (selectedConversation) {
                loadMessages(selectedConversation)
              }
              // Scroll instantâneo para o final após enviar mensagem
              if (messagesContainerRef.current) {
                messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight
              }
            }, 500)
          } catch (error: any) {
            console.error('Erro ao enviar mídia:', error)
            alert('Erro ao enviar mídia: ' + (error.message || 'Erro desconhecido'))
          } finally {
            setSending(false)
          }
        }
        reader.readAsDataURL(selectedFile)
        return
      }

      // Se não houver arquivo, envia mensagem de texto normal
      await whatsappService.sendMessage(selectedConversation, messageText.trim())
      setMessageText('')
      // Recarrega mensagens após enviar
      setTimeout(() => {
        if (selectedConversation) {
          loadMessages(selectedConversation)
        }
        // Scroll instantâneo para o final após enviar mensagem
        if (messagesContainerRef.current) {
          messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight
        }
      }, 500)
    } catch (error: any) {
      console.error('Erro ao enviar mensagem:', error)
      alert('Erro ao enviar mensagem: ' + (error.message || 'Erro desconhecido'))
    } finally {
      setSending(false)
    }
  }, [messageText, selectedFile, selectedConversation, sending])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
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
  }, [])

  const handleMessageChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setMessageText(e.target.value)
  }, [])

  const handleKeyPress = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }, [sendMessage])

  const removeFile = () => {
    setSelectedFile(null)
    setFilePreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }


  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    
    if (minutes < 1) return 'Agora'
    if (minutes < 60) return `${minutes}m`
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    }
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
  }

  const getMessagePreview = (message: WhatsAppMessage) => {
    // Para mídias, mostra ícone e tipo ao invés de placeholder
    if (message.type === 'image') return '🖼️ Imagem'
    if (message.type === 'video') return '🎬 Vídeo'
    if (message.type === 'audio') return '🎵 Áudio'
    if (message.type === 'document') {
      // Tenta identificar o tipo de documento
      if (message.mediaMimetype?.includes('pdf')) return '📄 PDF'
      if (message.mediaMimetype?.includes('word') || message.mediaMimetype?.includes('document')) return '📝 Documento'
      if (message.mediaMimetype?.includes('excel') || message.mediaMimetype?.includes('spreadsheet')) return '📊 Planilha'
      return '📎 Arquivo'
    }
    if (message.type === 'other') return '📎 Arquivo'
    return message.body || ''
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
      // Se já tiver mediaUrl (pode ser base64 ou URL), usa diretamente
      let imageSrc: string | null = null
      
      // Se já tem mediaUrl (pode ser base64 ou URL), usa diretamente
      if (msg.mediaUrl) {
        // Se for URL relativa (começa com /), converte para URL completa
        if (msg.mediaUrl.startsWith('/')) {
          let baseUrl = env.apiUrl
          if (baseUrl.endsWith('/api')) {
            baseUrl = baseUrl.slice(0, -4) // Remove '/api'
          }
          baseUrl = baseUrl.replace(/\/$/, '')
          imageSrc = `${baseUrl}${msg.mediaUrl}`
        } else {
          imageSrc = msg.mediaUrl
        }
      } 
      // Se não tiver mediaUrl mas o body contém base64, usa o body
      else if (isBase64Image) {
        // Detecta o tipo de imagem pelo início do base64
        let mimeType = 'image/jpeg'
        if (bodyTrimmed.startsWith('iVBORw0KGgo')) {
          mimeType = 'image/png'
        } else if (bodyTrimmed.startsWith('/9j/') || bodyTrimmed.startsWith('/9j/4AAQ')) {
          mimeType = 'image/jpeg'
        } else if (bodyTrimmed.startsWith('R0lGODlh') || bodyTrimmed.startsWith('R0lGODdh')) {
          mimeType = 'image/gif'
        } else if (bodyTrimmed.startsWith('UklGR')) {
          mimeType = 'image/webp'
        }
        imageSrc = `data:${mimeType};base64,${bodyTrimmed}`
      }
      // Se não tiver mediaUrl mas tiver ID, constrói URL do endpoint
      else if (msg.id) {
        // Remove /api do final da URL base se existir
        let baseUrl = env.apiUrl
        if (baseUrl.endsWith('/api')) {
          baseUrl = baseUrl.slice(0, -4) // Remove '/api'
        }
        // Garante que temos uma base URL válida
        if (!baseUrl || baseUrl === '') {
          baseUrl = 'http://localhost:3000'
        }
        // Remove barra final se existir
        baseUrl = baseUrl.replace(/\/$/, '')
        imageSrc = `${baseUrl}/api/whatsapp/media/${msg.id}`
      }
      
      if (imageSrc) {
        return (
          <div className="space-y-2">
            <div className="relative">
              <div 
                className="relative group cursor-pointer"
                onClick={() => {
                  // Abre preview da imagem em modal
                  setImagePreview(imageSrc)
                }}
              >
                <img 
                  src={imageSrc} 
                  alt={msg.isFromMe ? "Imagem enviada por você" : "Imagem recebida"} 
                  className="w-full max-w-[280px] sm:max-w-[320px] h-auto rounded-lg hover:opacity-90 transition-opacity block pointer-events-none"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement
                    
                    // Se for base64 e falhou, não há o que fazer
                    if (imageSrc?.startsWith('data:')) {
                      target.style.display = 'none'
                      const errorDiv = document.createElement('div')
                      errorDiv.className = 'p-3 bg-red-50 rounded-lg'
                      errorDiv.innerHTML = '<p class="text-xs sm:text-sm text-red-600">Erro ao carregar imagem</p>'
                      target.parentElement?.parentElement?.appendChild(errorDiv)
                      return
                    }
                    
                    // Se não for base64 e tiver ID, tenta novamente com a URL do endpoint
                    if (msg.id && !imageSrc?.includes('/api/whatsapp/media/')) {
                      let baseUrl = env.apiUrl
                      if (baseUrl.endsWith('/api')) {
                        baseUrl = baseUrl.slice(0, -4)
                      }
                      baseUrl = baseUrl.replace(/\/$/, '')
                      if (!baseUrl || baseUrl === '') {
                        baseUrl = 'http://localhost:3000'
                      }
                      const fallbackUrl = `${baseUrl}/api/whatsapp/media/${msg.id}`
                      target.src = fallbackUrl
                      return
                    }
                    
                    // Se já tentou tudo e falhou, mostra erro
                    target.style.display = 'none'
                    const errorDiv = document.createElement('div')
                    errorDiv.className = 'p-3 bg-red-50 rounded-lg'
                    errorDiv.innerHTML = `
                      <p class="text-xs sm:text-sm text-red-600">Erro ao carregar imagem</p>
                      ${msg.id ? `
                        <a 
                          href="${imageSrc}" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:underline mt-1 inline-block"
                        >
                          Tentar abrir em nova aba
                        </a>
                      ` : ''}
                    `
                    target.parentElement?.parentElement?.appendChild(errorDiv)
                  }}
                  onLoad={() => {
                    // Imagem carregada com sucesso
                  }}
                />
                {/* Ícone de zoom ao passar o mouse */}
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none">
                  <ZoomIn className="w-8 h-8 text-white" />
                </div>
                {/* Botão de download na imagem pequena */}
                <button
                  onClick={async (e) => {
                    e.stopPropagation()
                    try {
                      // Se for base64, converte para blob
                      if (imageSrc.startsWith('data:')) {
                        const response = await fetch(imageSrc)
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
                        const response = await fetch(imageSrc)
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
                      window.open(imageSrc, '_blank')
                    }
                  }}
                  className="absolute bottom-2 right-2 bg-black bg-opacity-60 hover:bg-opacity-80 text-white p-2 rounded-full transition-all opacity-0 group-hover:opacity-100 z-10"
                  title="Baixar imagem"
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>
            </div>
            {/* Legenda da imagem */}
            {msg.body && (
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
      if (msg.id) {
        let baseUrl = env.apiUrl
        if (baseUrl.endsWith('/api')) {
          baseUrl = baseUrl.slice(0, -4)
        }
        baseUrl = baseUrl.replace(/\/$/, '')
        if (!baseUrl || baseUrl === '') {
          baseUrl = 'http://localhost:3000'
        }
        const endpointUrl = `${baseUrl}/api/whatsapp/media/${msg.id}`
        
        // Se não tem mediaUrl, usa endpoint. Se tem, mantém mediaUrl mas adiciona endpoint como fallback
        if (!mediaUrl) {
          mediaUrl = endpointUrl
        }
      }
      
      if (mediaUrl) {
        // Determina o tipo MIME correto
        const mimeType = msg.mediaMimetype || 'audio/ogg; codecs=opus'
        
        return (
          <div className="space-y-2">
            <audio 
              key={`audio-${msg.id}-${Date.now()}`} // Force re-render para mensagens recentes
              controls 
              className="w-full max-w-md min-w-[280px]"
              preload="auto" // Muda de "metadata" para "auto" para carregar completamente
              crossOrigin="anonymous" // Permite CORS se necessário
              onError={(e) => {
                const target = e.target as HTMLAudioElement
                
                // Se falhar e tiver ID, tenta recarregar após um delay
                if (msg.id && target.networkState === HTMLMediaElement.NETWORK_NO_SOURCE) {
                  setTimeout(() => {
                    if (target && target.parentElement) {
                      target.load() // Força recarregar o áudio
                    }
                  }, 1000)
                  return
                }
                
                const parent = target.parentElement
                if (parent) {
                  // Se falhar completamente, mostra link para baixar
                  parent.innerHTML = `
                    <div class="space-y-2">
                      <p class="text-xs sm:text-sm text-red-600 mb-2">Erro ao carregar áudio. Tentando baixar...</p>
                      <a 
                        href="${mediaUrl}" 
                        download
                        class="text-xs sm:text-sm text-blue-600 hover:text-blue-700 underline flex items-center space-x-2 px-3 py-2 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                        onclick="this.href='${mediaUrl}'; this.download='audio-${msg.id || Date.now()}.${msg.fileExtension || 'ogg'}';"
                      >
                        <span>🎵</span>
                        <span>Baixar áudio</span>
                      </a>
                      ${msg.body ? `<p class="text-xs sm:text-sm whitespace-pre-wrap break-words mt-2">${msg.body}</p>` : ''}
                    </div>
                  `
                }
              }}
              onLoadStart={() => {
                // Iniciando carregamento de áudio
              }}
              onCanPlay={() => {
                // Áudio pronto para reprodução
              }}
              onLoadedMetadata={() => {
                // Metadados do áudio carregados
              }}
              onStalled={(e) => {
                const target = e.target as HTMLAudioElement
                setTimeout(() => {
                  if (target && target.readyState < HTMLMediaElement.HAVE_FUTURE_DATA) {
                    target.load()
                  }
                }, 1000)
              }}
            >
              <source src={mediaUrl} type={mimeType} />
              <source src={mediaUrl} type="audio/mpeg" />
              <source src={mediaUrl} type="audio/wav" />
              <source src={mediaUrl} type="audio/ogg; codecs=opus" />
              <source src={mediaUrl} type="audio/webm; codecs=opus" />
              <source src={mediaUrl} type="audio/ogg" />
              <source src={mediaUrl} type="audio/webm" />
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
      // IMPORTANTE: Sempre tenta construir URL do endpoint se tiver ID
      if (msg.id) {
        let baseUrl = env.apiUrl
        if (baseUrl.endsWith('/api')) {
          baseUrl = baseUrl.slice(0, -4)
        }
        baseUrl = baseUrl.replace(/\/$/, '')
        if (!baseUrl || baseUrl === '') {
          baseUrl = 'http://localhost:3000'
        }
        const endpointUrl = `${baseUrl}/api/whatsapp/media/${msg.id}`
        
        // Se não tem mediaUrl, usa endpoint. Se tem, mantém mediaUrl mas adiciona endpoint como fallback
        if (!mediaUrl) {
          mediaUrl = endpointUrl
        }
      }
      
      if (mediaUrl) {
        // Determina o tipo MIME correto
        const mimeType = msg.mediaMimetype || 'video/mp4'
        
        return (
          <div className="space-y-2">
            <video 
              key={`video-${msg.id}-${Date.now()}`} // Force re-render para mensagens recentes
              controls 
              className="max-w-full rounded-lg"
              preload="auto" // Muda de "metadata" para "auto" para carregar completamente
              crossOrigin="anonymous" // Permite CORS se necessário
              onError={(e) => {
                const target = e.target as HTMLVideoElement
                
                // Se falhar e tiver ID, tenta recarregar após um delay
                if (msg.id && target.networkState === HTMLMediaElement.NETWORK_NO_SOURCE) {
                  setTimeout(() => {
                    if (target && target.parentElement) {
                      target.load() // Força recarregar o vídeo
                    }
                  }, 1000)
                  return
                }
                
                const parent = target.parentElement
                if (parent) {
                  // Se falhar completamente, mostra link para baixar
                  parent.innerHTML = `
                    <div class="space-y-2">
                      <p class="text-xs sm:text-sm text-red-600 mb-2">Erro ao carregar vídeo. Tentando baixar...</p>
                      <a 
                        href="${mediaUrl}" 
                        download
                        class="text-xs sm:text-sm text-blue-600 hover:text-blue-700 underline flex items-center space-x-2 px-3 py-2 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                        onclick="this.href='${mediaUrl}'; this.download='video-${msg.id || Date.now()}.${msg.fileExtension || 'mp4'}';"
                      >
                        <span>🎬</span>
                        <span>Baixar vídeo</span>
                      </a>
                      ${msg.body ? `<p class="text-xs sm:text-sm whitespace-pre-wrap break-words mt-2">${msg.body}</p>` : ''}
                    </div>
                  `
                }
              }}
              onLoadStart={() => {
                // Iniciando carregamento de vídeo
              }}
              onCanPlay={() => {
                // Vídeo pronto para reprodução
              }}
              onLoadedMetadata={() => {
                // Metadados do vídeo carregados
              }}
              onStalled={(e) => {
                const target = e.target as HTMLVideoElement
                setTimeout(() => {
                  if (target && target.readyState < HTMLMediaElement.HAVE_FUTURE_DATA) {
                    target.load()
                  }
                }, 1000)
              }}
            >
              <source src={mediaUrl} type={mimeType} />
              <source src={mediaUrl} type="video/mp4" />
              <source src={mediaUrl} type="video/webm" />
              <source src={mediaUrl} type="video/ogg" />
              <source src={mediaUrl} type="video/quicktime" />
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

    // Para texto, verifica se é base64 (imagem/vídeo sem tipo correto)
    if (msg.type === 'text') {
      const body = msg.body || ''
      
      // Detecta se o body é base64 de imagem
      // Padrões: /9j/ (JPEG), /9j/4AAQ (JPEG), iVBORw0KGgo (PNG), R0lGODlh (GIF), UklGR (WebP), data:image/
      const isBase64Image = body.length > 100 && (
        body.startsWith('/9j/') || 
        body.startsWith('iVBORw0KGgo') || 
        body.startsWith('R0lGODlh') || 
        body.startsWith('R0lGODdh') ||
        body.startsWith('UklGR') ||
        body.startsWith('data:image/') ||
        // Verifica se é base64 válido (caracteres alfanuméricos, +, /, =)
        /^[A-Za-z0-9+\/=\s]{100,}$/.test(body.trim())
      )
      
      if (isBase64Image) {
        // É uma imagem em base64, converte para data URL se necessário
        let imageSrc = body.trim()
        if (!body.startsWith('data:')) {
          // Tenta detectar o tipo de imagem pelo início do base64
          let mimeType = 'image/jpeg' // Padrão
          if (body.startsWith('iVBORw0KGgo')) {
            mimeType = 'image/png'
          } else if (body.startsWith('/9j/') || body.includes('/9j/')) {
            mimeType = 'image/jpeg'
          } else if (body.startsWith('R0lGODlh') || body.startsWith('R0lGODdh')) {
            mimeType = 'image/gif'
          } else if (body.startsWith('UklGR')) {
            mimeType = 'image/webp'
          }
          // Remove espaços em branco e quebras de linha do base64
          const cleanBase64 = body.trim().replace(/\s/g, '')
          imageSrc = `data:${mimeType};base64,${cleanBase64}`
        }
        
        return (
          <div className="space-y-2">
            <div className="relative">
              <div 
                className="relative group cursor-pointer"
                onClick={() => {
                  setImagePreview(imageSrc)
                }}
              >
                <img 
                  src={imageSrc} 
                  alt={msg.isFromMe ? "Imagem enviada por você" : "Imagem recebida"} 
                  className="w-full max-w-[280px] sm:max-w-[320px] h-auto rounded-lg hover:opacity-90 transition-opacity block pointer-events-none"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement
                    target.style.display = 'none'
                    const errorDiv = document.createElement('div')
                    errorDiv.className = 'p-3 bg-red-50 rounded-lg'
                    errorDiv.innerHTML = '<p class="text-xs sm:text-sm text-red-600">Erro ao carregar imagem</p>'
                    target.parentElement?.parentElement?.appendChild(errorDiv)
                  }}
                />
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none">
                  <ZoomIn className="w-8 h-8 text-white" />
                </div>
              </div>
            </div>
          </div>
        )
      }
      
      // Se não for base64, mostra o texto normalmente
      return <p className="text-xs sm:text-sm whitespace-pre-wrap break-words">{body}</p>
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
    return <p className="text-xs sm:text-sm whitespace-pre-wrap break-words">{msg.body || '(mensagem sem conteúdo)'}</p>
  }

  // Função auxiliar para normalizar número de telefone (remove caracteres não numéricos)
  const normalizePhone = (phone: string): string => {
    return phone.replace(/\D/g, '')
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

  // Função auxiliar para formatar telefone para busca
  const formatPhoneForSearch = (phone: string): string => {
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

  const filteredConversations = conversations
    .filter(conv => {
      // Filtro de busca por texto
      if (searchTerm && searchTerm.trim()) {
        const search = searchTerm.toLowerCase().trim()
        const normalizedSearch = normalizePhone(search)
        const normalizedPhone = normalizePhone(conv.phone)
        
        const matchesSearch = (
          // Busca por nome do contato
          (conv.contactName || '').toLowerCase().includes(search) ||
          // Busca por número normalizado (apenas dígitos)
          normalizedPhone.includes(normalizedSearch) ||
          // Busca por número formatado
          formatPhoneForSearch(conv.phone).toLowerCase().includes(search) ||
          // Busca por número original (caso tenha @c.us)
          conv.phone.toLowerCase().includes(search) ||
          // Busca no conteúdo da última mensagem
          getMessagePreview(conv.lastMessage).toLowerCase().includes(search)
        )
        if (!matchesSearch) return false
      }
      
      // Filtro por tags
      const hasActiveFilters = selectedFilters.cliente || selectedFilters.farmaceutico || selectedFilters.assumida || selectedFilters.controlado
      
      if (!hasActiveFilters) return true // Se não há filtros ativos, mostra todas
      
      // Verifica se a conversa atende aos filtros selecionados
      const matchesCliente = !selectedFilters.cliente || !conv.lastMessage.isFromMe
      const matchesFarmaceutico = !selectedFilters.farmaceutico || conv.needsPharmacist
      const matchesAssumida = !selectedFilters.assumida || conv.isAssumed
      const matchesControlado = !selectedFilters.controlado || conv.awaitingControlledConfirmation
      
      return matchesCliente && matchesFarmaceutico && matchesAssumida && matchesControlado
    })
    // Mantém a ordenação por timestamp (mais recente primeiro)
    // Conversas sem mensagens (timestamp 0) vão para o final
    .sort((a, b) => {
      // Garante que os timestamps são números válidos
      const timestampA = a.lastMessage?.timestamp ? Number(a.lastMessage.timestamp) : 0
      const timestampB = b.lastMessage?.timestamp ? Number(b.lastMessage.timestamp) : 0
      // Se ambos têm timestamp 0, mantém ordem original
      if (timestampA === 0 && timestampB === 0) return 0
      // Se apenas um tem timestamp 0, coloca no final
      if (timestampA === 0) return 1
      if (timestampB === 0) return -1
      // Ordem decrescente (mais recente primeiro)
      return timestampB - timestampA
    })

  const selectedConv = conversations.find(c => c.phone === selectedConversation)

  return (
    <div className="fixed inset-0 h-screen flex flex-col bg-gray-100 z-50" style={{ marginTop: 0, marginLeft: 0, marginRight: 0 }}>
      {/* Header */}
      <div className="bg-green-600 text-white px-3 sm:px-4 lg:px-6 py-3 sm:py-4 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 sm:space-x-4 flex-1 min-w-0">
            {/* Botão voltar para o site */}
            <button
              onClick={() => navigate('/admin')}
              className="p-1.5 sm:p-2 hover:bg-green-700 rounded-lg transition-colors flex-shrink-0"
              title="Voltar ao painel admin"
            >
              <ArrowLeft size={20} className="sm:w-6 sm:h-6" />
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg sm:text-xl lg:text-2xl font-semibold truncate">Atendimento WhatsApp</h1>
              <p className="text-green-100 text-xs sm:text-sm mt-1">
                {conversations.length} conversa{conversations.length !== 1 ? 's' : ''} total{conversations.length !== 1 ? 'is' : ''}
              </p>
            </div>
          </div>
          {/* Botão voltar no mobile quando conversa está selecionada */}
          {selectedConversation && !showConversationList && (
            <button
              onClick={handleBackToConversations}
              className="lg:hidden ml-3 p-2 hover:bg-green-700 rounded-lg transition-colors flex-shrink-0"
            >
              <ChevronLeft size={24} />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Lista de Conversas - Estilo WhatsApp Web */}
        <div className={`${showConversationList ? 'flex' : 'hidden'} lg:flex w-full lg:w-1/3 bg-white border-r border-gray-300 flex-col`}>
          {/* Busca e Filtros */}
          <div className="p-2 sm:p-3 bg-gray-50 border-b border-gray-200 space-y-2">
            {/* Campo de Busca */}
            <div className="relative">
              <Search className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5" />
              <input
                type="text"
                placeholder="Buscar conversas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 sm:pl-10 pr-3 sm:pr-4 py-1.5 sm:py-2 text-sm sm:text-base bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 sm:right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  type="button"
                >
                  <X size={16} className="sm:w-5 sm:h-5" />
                </button>
              )}
            </div>
            
            {/* Filtros por Tags */}
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              <button
                onClick={() => {
                  setSelectedFilters({
                    cliente: false,
                    farmaceutico: false,
                    assumida: false,
                    controlado: false
                  })
                }}
                className={`px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs rounded-full font-medium transition-colors ${
                  !selectedFilters.cliente && !selectedFilters.farmaceutico && !selectedFilters.assumida && !selectedFilters.controlado
                    ? 'bg-gray-700 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Todas
              </button>
              <button
                onClick={() => setSelectedFilters({ ...selectedFilters, cliente: !selectedFilters.cliente })}
                className={`px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs rounded-full font-medium transition-colors flex items-center space-x-1 ${
                  selectedFilters.cliente
                    ? 'bg-blue-600 text-white'
                    : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                }`}
              >
                <span>💬</span>
                <span>Cliente</span>
              </button>
              <button
                onClick={() => setSelectedFilters({ ...selectedFilters, farmaceutico: !selectedFilters.farmaceutico })}
                className={`px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs rounded-full font-medium transition-colors flex items-center space-x-1 ${
                  selectedFilters.farmaceutico
                    ? 'bg-red-600 text-white'
                    : 'bg-red-100 text-red-700 hover:bg-red-200'
                }`}
              >
                <span>👨‍⚕️</span>
                <span>Farmacêutico</span>
              </button>
              <button
                onClick={() => setSelectedFilters({ ...selectedFilters, assumida: !selectedFilters.assumida })}
                className={`px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs rounded-full font-medium transition-colors flex items-center space-x-1 ${
                  selectedFilters.assumida
                    ? 'bg-yellow-600 text-white'
                    : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                }`}
              >
                <span>🔒</span>
                <span>Assumida</span>
              </button>
              <button
                onClick={() => setSelectedFilters({ ...selectedFilters, controlado: !selectedFilters.controlado })}
                className={`px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs rounded-full font-medium transition-colors flex items-center space-x-1 ${
                  selectedFilters.controlado
                    ? 'bg-orange-600 text-white'
                    : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                }`}
              >
                <span>⚠️</span>
                <span>Controlado</span>
              </button>
            </div>
          </div>

          {/* Lista */}
          <div className="flex-1 overflow-y-auto">
            {filteredConversations.length === 0 ? (
              <div className="p-6 sm:p-8 text-center text-gray-500">
                <MessageSquare size={40} className="sm:w-12 sm:h-12 mx-auto mb-3 sm:mb-4 text-gray-300" />
                <p className="text-sm sm:text-base">Nenhuma conversa encontrada</p>
              </div>
            ) : (
              filteredConversations.map((conv) => (
                <div
                  key={conv.phone}
                  onClick={() => handleSelectConversation(conv.phone)}
                  className={`p-3 sm:p-4 border-b border-gray-200 cursor-pointer hover:bg-gray-50 active:bg-gray-100 transition-colors ${
                    selectedConversation === conv.phone ? 'bg-green-50 border-l-4 border-l-green-600' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center flex-wrap gap-1.5 sm:gap-2 mb-1">
                        <h3 className="font-semibold text-sm sm:text-base text-gray-900 truncate">
                          {conv.contactName || conv.phone}
                        </h3>
                        {/* Marcação: Última mensagem foi do cliente - sempre mostra se a última mensagem não foi do bot */}
                        {conv.lastMessage && !conv.lastMessage.isFromMe && (
                          <span className="flex-shrink-0 bg-blue-100 text-blue-700 text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full font-medium">
                            Cliente
                          </span>
                        )}
                        {/* Marcação: Medicamento controlado detectado - aguardando confirmação */}
                        {conv.awaitingControlledConfirmation && (
                          <span className="flex-shrink-0 bg-orange-100 text-orange-700 text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full font-medium">
                            Controlado
                          </span>
                        )}
                        {/* Marcação: Precisa de farmacêutico (confirmado) */}
                        {conv.needsPharmacist && (
                          <span className="flex-shrink-0 bg-red-100 text-red-700 text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full font-medium">
                            Farmacêutico
                          </span>
                        )}
                        {conv.isAssumed && (
                          <span className="flex-shrink-0 bg-yellow-100 text-yellow-700 text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full font-medium">
                            {conv.assumedBy ? `Assumido por ${conv.assumedBy}` : 'Assumida'}
                          </span>
                        )}
                      </div>
                      <p className="text-xs sm:text-sm text-gray-600 truncate">
                        {getMessagePreview(conv.lastMessage)}
                      </p>
                      <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5 sm:mt-1">
                        {formatTime(conv.lastMessage.timestamp)}
                      </p>
                    </div>
                    {conv.unreadCount > 0 && (
                      <span className="ml-2 bg-green-600 text-white text-[10px] sm:text-xs font-bold rounded-full w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center flex-shrink-0">
                        {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Área de Conversa */}
        <div className={`${!showConversationList ? 'flex' : 'hidden'} lg:flex flex-1 flex-col bg-gray-100`}>
          {selectedConversation && selectedConv ? (
            <>
              {/* Header da Conversa */}
              <div className="border-b border-gray-200 p-3 sm:p-4 bg-gray-50">
                <div className="flex items-center justify-between space-x-3">
                  <div className="flex items-center space-x-3 min-w-0 flex-1">
                    {/* Botão voltar (apenas mobile) */}
                    <button
                      onClick={handleBackToConversations}
                      className="lg:hidden flex-shrink-0 p-1 hover:bg-gray-200 rounded transition-colors"
                    >
                      <ArrowLeft className="w-5 h-5 text-gray-600" />
                    </button>
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4 sm:w-6 sm:h-6 text-blue-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900 text-sm sm:text-base truncate">
                        {selectedConv.contactName || formatPhone(selectedConv.phone)}
                      </p>
                      <p className="text-xs text-gray-500 truncate">{formatPhone(selectedConv.phone)}</p>
                    </div>
                  </div>
                  {/* Badges e botões de ação */}
                  <div className="flex items-center space-x-2 flex-shrink-0">
                    {selectedConv.needsPharmacist && (
                      <span className="bg-red-100 text-red-700 text-[10px] sm:text-xs px-2 sm:px-3 py-0.5 sm:py-1 rounded-full font-medium whitespace-nowrap">
                        Farmacêutico
                      </span>
                    )}
                    {selectedConv.isAssumed && (
                      <span className="bg-yellow-100 text-yellow-700 text-[10px] sm:text-xs px-2 sm:px-3 py-0.5 sm:py-1 rounded-full font-medium whitespace-nowrap">
                        {selectedConv.assumedBy ? `Assumido por ${selectedConv.assumedBy}` : 'Assumida'}
                      </span>
                    )}
                    {/* Botão para assumir/desbloquear conversa */}
                    {selectedConv.isAssumed || selectedConv.needsPharmacist ? (
                      <button
                        onClick={handleUnblockConversation}
                        className="flex items-center space-x-1 bg-green-600 hover:bg-green-700 text-white text-[10px] sm:text-xs px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap"
                        title="Desbloquear conversa (IA voltará a responder)"
                      >
                        <Unlock size={14} className="sm:w-4 sm:h-4" />
                        <span className="hidden sm:inline">Desbloquear</span>
                      </button>
                    ) : (
                      <button
                        onClick={handleBlockConversation}
                        className="flex items-center space-x-1 bg-yellow-600 hover:bg-yellow-700 text-white text-[10px] sm:text-xs px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap"
                        title="Assumir conversa (bloquear IA)"
                      >
                        <Lock size={14} className="sm:w-4 sm:h-4" />
                        <span className="hidden sm:inline">Assumir</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Mensagens */}
              <div 
                ref={messagesContainerRef}
                className="flex-1 overflow-y-auto p-3 sm:p-4 bg-gray-50"
                style={{ scrollBehavior: 'auto' }}
              >
                {messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-gray-500 text-sm sm:text-base">Nenhuma mensagem ainda</p>
                  </div>
                ) : (
                  <div className="space-y-3 sm:space-y-4">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.isFromMe ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[85%] sm:max-w-xs lg:max-w-md rounded-lg shadow-sm overflow-hidden ${
                            message.isFromMe
                              ? 'bg-blue-600 text-white'
                              : 'bg-white text-gray-900 border border-gray-200'
                          } ${message.type === 'image' && message.mediaUrl ? 'p-0' : 'px-3 sm:px-4 py-2'}`}
                        >
                          {message.type === 'image' && message.mediaUrl ? (
                            <>
                              {renderMessageContent(message)}
                              <div className="px-3 sm:px-4 pb-2">
                                <p
                                  className={`text-[10px] sm:text-xs mt-1 ${
                                    message.isFromMe ? 'text-blue-100' : 'text-gray-400'
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
                                className={`text-[10px] sm:text-xs mt-1 ${
                                  message.isFromMe ? 'text-blue-100' : 'text-gray-400'
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

              {/* Input de Mensagem */}
              <div className="bg-white border-t border-gray-300 px-3 sm:px-4 lg:px-6 py-3 sm:py-4">
                {/* Preview do arquivo selecionado */}
                {selectedFile && (
                  <div className="mb-2 p-2 bg-gray-50 rounded-lg flex items-center justify-between">
                    <div className="flex items-center space-x-2 flex-1 min-w-0">
                      {filePreview ? (
                        <img src={filePreview} alt="Preview" className="w-12 h-12 object-cover rounded" />
                      ) : (
                        <Paperclip className="w-5 h-5 text-gray-600 flex-shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-xs sm:text-sm font-medium text-gray-900 truncate">{selectedFile.name}</p>
                        <p className="text-[10px] sm:text-xs text-gray-500">
                          {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={removeFile}
                      className="ml-2 p-1 hover:bg-gray-200 rounded transition-colors flex-shrink-0"
                    >
                      <X className="w-4 h-4 text-gray-600" />
                    </button>
                  </div>
                )}
                <div className="flex items-center space-x-2 sm:space-x-3 lg:space-x-4">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="file-input"
                  />
                  <label
                    htmlFor="file-input"
                    className="p-2 sm:p-3 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors cursor-pointer flex-shrink-0"
                    title="Anexar arquivo"
                  >
                    <Paperclip className="w-5 h-5 sm:w-6 sm:h-6" />
                  </label>
                  <input
                    type="text"
                    value={messageText}
                    onChange={handleMessageChange}
                    onKeyPress={handleKeyPress}
                    placeholder={selectedFile ? "Adicione uma legenda (opcional)..." : "Digite uma mensagem..."}
                    className="flex-1 px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-green-500"
                    disabled={sending}
                  />
                  <button
                    onClick={sendMessage}
                    disabled={(!messageText.trim() && !selectedFile) || sending}
                    className="bg-green-600 text-white p-2 sm:p-3 rounded-full hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                  >
                    {sending ? (
                      <Clock className="animate-spin w-5 h-5 sm:w-6 sm:h-6" />
                    ) : (
                      <Send className="w-5 h-5 sm:w-6 sm:h-6" />
                    )}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-gray-50">
              <div className="text-center text-gray-500 px-4">
                <MessageSquare size={48} className="sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 text-gray-300" />
                <p className="text-base sm:text-lg font-medium">Selecione uma conversa para começar</p>
                <p className="text-xs sm:text-sm mt-2">Escolha uma conversa da lista ao lado</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Preview de Imagem */}
      {imagePreview && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={() => setImagePreview(null)}
        >
          <div className="relative max-w-7xl max-h-full w-full h-full flex items-center justify-center">
            <button
              onClick={() => setImagePreview(null)}
              className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors z-10 bg-black bg-opacity-50 rounded-full p-2"
              title="Fechar (ESC)"
            >
              <X size={24} />
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
              className="absolute bottom-4 right-4 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2 z-10"
              title="Baixar imagem"
            >
              <Download size={18} />
              <span className="hidden sm:inline">Baixar</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

