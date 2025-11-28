import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Send, Search, MessageSquare, CheckCircle2, Clock, ChevronLeft, ArrowLeft, Paperclip, X, Lock, Unlock, ZoomIn } from 'lucide-react'
import { whatsappService } from '../services/whatsapp.service'
import { env } from '../config/env'

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
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null)
  const [messages, setMessages] = useState<WhatsAppMessage[]>([])
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
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Carrega todas as conversas
  useEffect(() => {
    loadConversations()
    const interval = setInterval(loadConversations, 3000)
    return () => clearInterval(interval)
  }, [])

  // Carrega mensagens quando uma conversa é selecionada
  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation)
      markAsRead(selectedConversation)
      const interval = setInterval(() => {
        loadMessages(selectedConversation)
      }, 2000)
      return () => clearInterval(interval)
    }
  }, [selectedConversation])

  // Scroll automático para última mensagem
  useEffect(() => {
    scrollToBottom()
  }, [messages])

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
        // Ordena por timestamp da última mensagem (mais recente primeiro)
        const sorted = (data.conversations || []).sort((a, b) => {
          const timestampA = a.lastMessage?.timestamp || 0
          const timestampB = b.lastMessage?.timestamp || 0
          return timestampB - timestampA // Ordem decrescente (mais recente primeiro)
        })
        setConversations(sorted)
      }
    } catch (error) {
      console.error('Erro ao carregar conversas:', error)
    }
  }

  const loadMessages = async (phone: string) => {
    try {
      const data = await whatsappService.getConversationMessages(phone)
      if (data.success) {
        setMessages(data.messages || [])
      }
    } catch (error) {
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
      await whatsappService.markConversationAsAssumed(
        selectedConversation,
        'Administrador',
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

  const sendMessage = async () => {
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
              selectedConversation,
              base64,
              mediaType,
              messageText.trim() || undefined,
              selectedFile.name
            )
            setMessageText('')
            setSelectedFile(null)
            setFilePreview(null)
            // Recarrega mensagens após enviar
            setTimeout(() => {
              loadMessages(selectedConversation)
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
        loadMessages(selectedConversation)
      }, 500)
    } catch (error: any) {
      console.error('Erro ao enviar mensagem:', error)
      alert('Erro ao enviar mensagem: ' + (error.message || 'Erro desconhecido'))
    } finally {
      setSending(false)
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

  const scrollToBottom = () => {
    messagesContainerRef.current?.scrollTo({
      top: messagesContainerRef.current.scrollHeight,
      behavior: 'smooth'
    })
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
    // Se for imagem, sempre tenta mostrar (mesmo sem mediaUrl, busca do endpoint)
    if (msg.type === 'image') {
      const mediaUrl = msg.mediaUrl || (msg.id ? `${env.apiUrl.replace('/api', '')}/api/whatsapp/media/${msg.id}` : null)
      
      if (mediaUrl) {
        return (
          <div className="space-y-2">
            <div className="relative">
              <div className="relative group">
                <img 
                  src={mediaUrl} 
                  alt={msg.isFromMe ? "Imagem enviada por você" : "Imagem recebida"} 
                  className="w-full max-w-[280px] sm:max-w-[320px] h-auto rounded-lg cursor-pointer hover:opacity-90 transition-opacity block"
                  onClick={() => {
                    // Abre preview da imagem em modal
                    setImagePreview(mediaUrl)
                  }}
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
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <ZoomIn className="w-8 h-8 text-white" />
                </div>
              </div>
            </div>
            {msg.body && (
              <div className="px-3 sm:px-4 pt-2">
                <p className="text-xs sm:text-sm whitespace-pre-wrap break-words">{msg.body}</p>
              </div>
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
      
      // Se não tiver mediaUrl mas tiver ID, constrói URL do endpoint
      if (!mediaUrl && msg.id) {
        mediaUrl = `${env.apiUrl.replace('/api', '')}/api/whatsapp/media/${msg.id}`
      }
      
      // Debug: log para verificar se tem mediaUrl
      if (!mediaUrl) {
        console.warn('Áudio sem mediaUrl:', { id: msg.id, type: msg.type, mimetype: msg.mediaMimetype })
      }
      
      if (mediaUrl) {
        // Determina o tipo MIME correto
        const mimeType = msg.mediaMimetype || 'audio/ogg'
        
        return (
          <div className="space-y-2">
            <audio 
              controls 
              className="w-full max-w-sm"
              preload="metadata"
              onError={(e) => {
                console.error('Erro ao carregar áudio:', {
                  error: e,
                  mediaUrl: mediaUrl?.substring(0, 50) + '...',
                  mimeType,
                  messageId: msg.id
                })
                const target = e.target as HTMLAudioElement
                const parent = target.parentElement
                if (parent) {
                  // Se falhar, mostra link para baixar
                  parent.innerHTML = `
                    <div class="space-y-2">
                      <a 
                        href="${mediaUrl}" 
                        download
                        class="text-xs sm:text-sm text-blue-600 hover:text-blue-700 underline flex items-center space-x-2 px-3 py-2 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                      >
                        <span>🎵</span>
                        <span>Baixar áudio</span>
                      </a>
                      ${msg.body ? `<p class="text-xs sm:text-sm whitespace-pre-wrap break-words">${msg.body}</p>` : ''}
                    </div>
                  `
                }
              }}
              onLoadStart={() => {
                console.log('Iniciando carregamento de áudio:', { mediaUrl: mediaUrl?.substring(0, 50) + '...', mimeType })
              }}
            >
              <source src={mediaUrl} type={mimeType} />
              <source src={mediaUrl} type="audio/mpeg" />
              <source src={mediaUrl} type="audio/wav" />
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
          <a 
            href={msg.id ? `${env.apiUrl.replace('/api', '')}/api/whatsapp/media/${msg.id}` : '#'}
            download
            className="text-xs sm:text-sm text-blue-600 hover:text-blue-700 underline flex items-center space-x-2 px-3 py-2 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
          >
            <span>🎵</span>
            <span>Baixar áudio</span>
          </a>
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
      
      // Se não tiver mediaUrl mas tiver ID, constrói URL do endpoint
      if (!mediaUrl && msg.id) {
        mediaUrl = `${env.apiUrl.replace('/api', '')}/api/whatsapp/media/${msg.id}`
      }
      
      // Debug: log para verificar se tem mediaUrl
      if (!mediaUrl) {
        console.warn('Vídeo sem mediaUrl:', { id: msg.id, type: msg.type, mimetype: msg.mediaMimetype })
      }
      
      if (mediaUrl) {
        // Determina o tipo MIME correto
        const mimeType = msg.mediaMimetype || 'video/mp4'
        
        return (
          <div className="space-y-2">
            <video 
              controls 
              className="max-w-full rounded-lg"
              preload="metadata"
              onError={(e) => {
                console.error('Erro ao carregar vídeo:', {
                  error: e,
                  mediaUrl: mediaUrl?.substring(0, 50) + '...',
                  mimeType,
                  messageId: msg.id
                })
                const target = e.target as HTMLVideoElement
                const parent = target.parentElement
                if (parent) {
                  // Se falhar, mostra link para baixar
                  parent.innerHTML = `
                    <div class="space-y-2">
                      <a 
                        href="${mediaUrl}" 
                        download
                        class="text-xs sm:text-sm text-blue-600 hover:text-blue-700 underline flex items-center space-x-2 px-3 py-2 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                      >
                        <span>🎬</span>
                        <span>Baixar vídeo</span>
                      </a>
                      ${msg.body ? `<p class="text-xs sm:text-sm whitespace-pre-wrap break-words">${msg.body}</p>` : ''}
                    </div>
                  `
                }
              }}
              onLoadStart={() => {
                console.log('Iniciando carregamento de vídeo:', { mediaUrl: mediaUrl?.substring(0, 50) + '...', mimeType })
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
      const mediaUrl = msg.mediaUrl || (msg.id ? `${env.apiUrl.replace('/api', '')}/api/whatsapp/media/${msg.id}` : null)
      
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

    // Para texto, mostra o texto
    if (msg.type === 'text') {
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
    return <p className="text-xs sm:text-sm whitespace-pre-wrap break-words">{msg.body || '(mensagem sem conteúdo)'}</p>
  }

  const filteredConversations = conversations
    .filter(conv => {
      // Filtro de busca por texto
      if (searchTerm) {
        const search = searchTerm.toLowerCase()
        const matchesSearch = (
          conv.phone.includes(search) ||
          conv.contactName?.toLowerCase().includes(search) ||
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
    .sort((a, b) => {
      const timestampA = a.lastMessage?.timestamp || 0
      const timestampB = b.lastMessage?.timestamp || 0
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
          {/* Busca */}
          <div className="p-2 sm:p-3 bg-gray-50 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5" />
              <input
                type="text"
                placeholder="Buscar conversas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 sm:pl-10 pr-3 sm:pr-4 py-1.5 sm:py-2 text-sm sm:text-base bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
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
                            {conv.assumptionReason?.toLowerCase().includes('manualmente') ? 'Manualmente Assumida' : 'Assumida'}
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
              <div className="bg-white border-b border-gray-300 px-3 sm:px-4 lg:px-6 py-3 sm:py-4 flex items-center justify-between shadow-sm">
                <div className="flex items-center space-x-2 sm:space-x-3 lg:space-x-4 min-w-0 flex-1">
                  {/* Botão voltar para lista no mobile */}
                  <button
                    onClick={handleBackToConversations}
                    className="lg:hidden mr-1 p-1.5 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
                    title="Voltar para lista de conversas"
                  >
                    <ChevronLeft size={20} className="text-gray-600" />
                  </button>
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-600 rounded-full flex items-center justify-center text-white font-semibold text-base sm:text-lg flex-shrink-0">
                    {selectedConv.contactName?.[0]?.toUpperCase() || selectedConv.phone[0]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="font-semibold text-sm sm:text-base text-gray-900 truncate">
                      {selectedConv.contactName || selectedConv.phone}
                    </h2>
                    <p className="text-xs sm:text-sm text-gray-500 truncate">{selectedConv.phone}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2 flex-shrink-0 ml-2">
                  {selectedConv.needsPharmacist && (
                    <span className="bg-red-100 text-red-700 text-[10px] sm:text-xs px-2 sm:px-3 py-0.5 sm:py-1 rounded-full font-medium whitespace-nowrap">
                      Precisa de Farmacêutico
                    </span>
                  )}
                  {selectedConv.isAssumed && (
                    <span className="bg-yellow-100 text-yellow-700 text-[10px] sm:text-xs px-2 sm:px-3 py-0.5 sm:py-1 rounded-full font-medium whitespace-nowrap">
                      {selectedConv.assumptionReason?.toLowerCase().includes('manualmente') ? 'Manualmente Assumida' : 'Assumida'}
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

              {/* Mensagens */}
              <div
                ref={messagesContainerRef}
                className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6 space-y-3 sm:space-y-4 bg-gray-50"
                style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'100\' height=\'100\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cdefs%3E%3Cpattern id=\'grid\' width=\'40\' height=\'40\' patternUnits=\'userSpaceOnUse\'%3E%3Cpath d=\'M 40 0 L 0 0 0 40\' fill=\'none\' stroke=\'%23e5e7eb\' stroke-width=\'1\'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width=\'100\' height=\'100\' fill=\'url(%23grid)\' /%3E%3C/svg%3E")' }}
              >
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.isFromMe ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] sm:max-w-[75%] lg:max-w-[70%] rounded-lg shadow-sm overflow-hidden ${
                        msg.isFromMe
                          ? 'bg-green-500 text-white'
                          : 'bg-white text-gray-900 border border-gray-200'
                      } ${msg.type === 'image' && msg.mediaUrl ? 'p-0' : 'px-3 sm:px-4 py-1.5 sm:py-2'}`}
                    >
                      {msg.type === 'image' && msg.mediaUrl ? (
                        <>
                          {renderMessageContent(msg)}
                          <div className="px-3 sm:px-4 pb-1.5 sm:pb-2">
                            <p
                              className={`text-[10px] sm:text-xs mt-1 ${
                                msg.isFromMe ? 'text-green-100' : 'text-gray-400'
                              }`}
                            >
                              {formatTime(msg.timestamp)}
                              {msg.isFromMe && (
                                <span className="ml-1">
                                  <CheckCircle2 size={10} className="sm:w-3 sm:h-3 inline" />
                                </span>
                              )}
                            </p>
                          </div>
                        </>
                      ) : (
                        <>
                          {renderMessageContent(msg)}
                          <p
                            className={`text-[10px] sm:text-xs mt-1 ${
                              msg.isFromMe ? 'text-green-100' : 'text-gray-400'
                            }`}
                          >
                            {formatTime(msg.timestamp)}
                            {msg.isFromMe && (
                              <span className="ml-1">
                                <CheckCircle2 size={10} className="sm:w-3 sm:h-3 inline" />
                              </span>
                            )}
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
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
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        sendMessage()
                      }
                    }}
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
            <a
              href={imagePreview}
              download
              onClick={(e) => e.stopPropagation()}
              className="absolute bottom-4 right-4 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
              title="Baixar imagem"
            >
              <Paperclip size={18} />
              <span className="hidden sm:inline">Baixar</span>
            </a>
          </div>
        </div>
      )}
    </div>
  )
}

