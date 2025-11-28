import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, RefreshCw, CheckCircle2, XCircle, Send, Loader2, QrCode, LogOut, AlertTriangle, MessageSquare, Phone, User, Paperclip, X, Lock, Unlock, ZoomIn } from 'lucide-react'
import { whatsappService, WhatsAppStatus } from '../services/whatsapp.service'
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
  needsResponse?: boolean // true se a última mensagem foi do cliente
  needsPharmacist?: boolean
  isAssumed?: boolean
  assumedBy?: string | null
  assumedAt?: Date | null
  assumptionReason?: string | null
}

export default function WhatsAppConnection() {
  const navigate = useNavigate()
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
    if (selectedConversation) {
      loadMessages(selectedConversation)
      const messagesInterval = setInterval(() => {
        loadMessages(selectedConversation)
      }, 1000) // Atualiza mensagens a cada 1 segundo

      return () => clearInterval(messagesInterval)
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

  // Scroll automático para última mensagem (apenas quando há novas mensagens)
  const [previousMessageCount, setPreviousMessageCount] = useState(0)
  
  useEffect(() => {
    if (messages.length > 0 && selectedConversation && messagesContainerRef.current) {
      // Só faz scroll se houver novas mensagens (não apenas ao selecionar conversa)
      if (messages.length > previousMessageCount) {
        // Usa requestAnimationFrame para garantir que não afeta o scroll da página
        requestAnimationFrame(() => {
          setTimeout(() => {
            if (messagesContainerRef.current) {
              // Scroll apenas dentro do container, não na página toda
              messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight
            }
          }, 50)
        })
        setPreviousMessageCount(messages.length)
      } else if (previousMessageCount === 0 && messages.length > 0) {
        // Primeira vez carregando mensagens desta conversa - scroll sem animação
        requestAnimationFrame(() => {
          setTimeout(() => {
            if (messagesContainerRef.current) {
              messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight
            }
          }, 50)
        })
        setPreviousMessageCount(messages.length)
      }
    }
  }, [messages.length, selectedConversation, previousMessageCount])
  
  // Reset contador quando troca de conversa
  useEffect(() => {
    setPreviousMessageCount(0)
    // Scroll para o topo quando troca de conversa (sem animação para evitar scroll da página)
    if (messagesContainerRef.current) {
      // Usa requestAnimationFrame para garantir que não afeta o scroll da página
      requestAnimationFrame(() => {
        if (messagesContainerRef.current) {
          messagesContainerRef.current.scrollTop = 0
        }
      })
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
      const response = await whatsappService.getConversationMessages(phone)
      if (response.success) {
        setMessages(response.messages)
        // Marca como lida
        await whatsappService.markConversationAsRead(phone)
      }
    } catch (error) {
      // Ignora erros silenciosamente
    }
  }

  const handleBlockConversation = async (phone: string) => {
    try {
      await whatsappService.markConversationAsAssumed(
        phone,
        'Administrador',
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
    return <p className="text-xs sm:text-sm whitespace-pre-wrap break-words">{msg.body || formatMessageBody(msg)}</p>
  }

  // Função para filtrar conversas por busca e tags
  const filterConversations = (conversations: Conversation[], search: string): Conversation[] => {
    return conversations.filter(conversation => {
      // Filtro de busca por texto
      if (search.trim()) {
        const searchLower = search.toLowerCase().trim()
        const matchesSearch = (
          (conversation.contactName || '').toLowerCase().includes(searchLower) ||
          conversation.phone.replace(/\D/g, '').includes(searchLower.replace(/\D/g, '')) ||
          formatPhone(conversation.phone).toLowerCase().includes(searchLower) ||
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
      const response = await whatsappService.disconnect()
      
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
            // Scroll para o final após enviar
            setTimeout(() => {
              if (messagesContainerRef.current) {
                messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight
              }
            }, 100)
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
      // Scroll para o final após enviar
      setTimeout(() => {
        if (messagesContainerRef.current) {
          messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight
        }
      }, 100)
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-4 sm:py-6 lg:py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/admin')}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Voltar ao painel
          </button>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Conexão WhatsApp</h1>
          <p className="mt-2 text-sm sm:text-base text-gray-600">Conecte seu WhatsApp para enviar e receber mensagens</p>
        </div>

        {/* Status Card */}
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-3">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Status da Conexão</h2>
            <button
              onClick={checkStatus}
              disabled={loading || initializing}
              className="flex items-center justify-center text-blue-600 hover:text-blue-700 disabled:opacity-50 text-sm sm:text-base"
            >
              <RefreshCw className={`w-4 h-4 sm:w-5 sm:h-5 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </button>
          </div>

          {loading && !status ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              <p className="ml-3 text-gray-600 text-sm sm:text-base">Carregando...</p>
            </div>
          ) : initializing ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              <p className="ml-3 text-gray-600 text-sm sm:text-base">Inicializando WhatsApp... Aguarde alguns segundos</p>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center space-x-3 sm:space-x-4">
                {status?.status === 'CONNECTED' || status?.connected ? (
                  <>
                    <CheckCircle2 className="w-6 h-6 sm:w-8 sm:h-8 text-green-600 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-base sm:text-lg font-medium text-green-600">Conectado</p>
                      <p className="text-xs sm:text-sm text-gray-600 break-words">{status.message}</p>
                    </div>
                  </>
                ) : status?.status === 'CONNECTING' ? (
                  <>
                    <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 animate-spin text-blue-600 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-base sm:text-lg font-medium text-blue-600">Conectando...</p>
                      <p className="text-xs sm:text-sm text-gray-600 break-words">{status.message}</p>
                    </div>
                  </>
                ) : status?.status === 'QRCODE_GENERATED' ? (
                  <>
                    <QrCode className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-600 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-base sm:text-lg font-medium text-yellow-600">QR Code Disponível</p>
                      <p className="text-xs sm:text-sm text-gray-600 break-words">{status.message}</p>
                    </div>
                  </>
                ) : (
                  <>
                    <XCircle className="w-6 h-6 sm:w-8 sm:h-8 text-red-600 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-base sm:text-lg font-medium text-red-600">Desconectado</p>
                      <p className="text-xs sm:text-sm text-gray-600 break-words">{status?.message || 'Clique no botão abaixo para conectar seu WhatsApp'}</p>
                    </div>
                  </>
                )}
              </div>
              {status?.status === 'CONNECTED' || status?.connected ? (
                <button
                  onClick={() => setShowDisconnectModal(true)}
                  className="flex items-center justify-center px-3 sm:px-4 py-2 text-sm sm:text-base text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors w-full sm:w-auto"
                >
                  <LogOut className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                  Desconectar
                </button>
              ) : (
                // Mostra botão de conectar quando desconectado (sem QR Code em processo)
                (!qrCode && status?.status !== 'QRCODE_GENERATED' && status?.status !== 'CONNECTING') && (
                  <button
                    onClick={initializeWhatsApp}
                    disabled={initializing}
                    className="flex items-center justify-center px-3 sm:px-4 py-2 text-sm sm:text-base bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors w-full sm:w-auto"
                  >
                    {initializing ? (
                      <>
                        <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 mr-2 animate-spin" />
                        Conectando...
                      </>
                    ) : (
                      <>
                        <Phone className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
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
          <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-3">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900">QR Code para Conectar</h2>
              <button
                onClick={handleRegenerateQR}
                disabled={regenerating || initializing}
                className="flex items-center justify-center text-sm sm:text-base text-blue-600 hover:text-blue-700 disabled:opacity-50"
              >
                {regenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 mr-2 animate-spin" />
                    Regenerando...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                    Regenerar QR Code
                  </>
                )}
              </button>
            </div>
            <div className="flex flex-col items-center">
              {qrCode ? (
                <>
                  <div className="bg-white p-3 sm:p-4 rounded-lg border-2 border-gray-200 mb-4">
                    <img 
                      src={qrCode} 
                      alt="QR Code WhatsApp" 
                      className="w-48 h-48 sm:w-64 sm:h-64"
                    />
                  </div>
                  <p className="text-xs sm:text-sm text-gray-600 text-center max-w-md px-2">
                    Abra o WhatsApp no seu celular, vá em Configurações → Aparelhos conectados → Conectar um aparelho
                    e escaneie este código
                  </p>
                </>
              ) : (
                <div className="flex flex-col items-center py-8">
                  <Loader2 className="w-10 h-10 sm:w-12 sm:h-12 animate-spin text-blue-600 mb-4" />
                  <p className="text-xs sm:text-sm text-gray-600 text-center px-4">
                    {regenerating ? 'Regenerando QR Code...' : status?.status === 'QRCODE_GENERATED' ? 'QR Code disponível, carregando...' : 'Gerando QR Code... Aguarde'}
                  </p>
                  {status?.status === 'QRCODE_GENERATED' && !qrCode && (
                    <button
                      onClick={checkStatus}
                      className="mt-4 px-4 py-2 text-xs sm:text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
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
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
              <div className="p-4 sm:p-6">
                {!showFinalConfirm ? (
                  <>
                    <div className="flex items-center mb-4">
                      <AlertTriangle className="w-6 h-6 text-yellow-600 mr-2" />
                      <h3 className="text-xl font-semibold text-gray-900">Desconectar WhatsApp?</h3>
                    </div>
                    <p className="text-gray-600 mb-6">
                      Você está prestes a desconectar o WhatsApp. Esta ação irá remover a sessão atual e você precisará escanear o QR Code novamente para reconectar.
                    </p>
                    <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
                      <button
                        onClick={() => setShowDisconnectModal(false)}
                        className="flex-1 px-4 py-2 text-sm sm:text-base border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={() => setShowFinalConfirm(true)}
                        className="flex-1 px-4 py-2 text-sm sm:text-base bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
                      >
                        Continuar
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center mb-4">
                      <AlertTriangle className="w-6 h-6 text-red-600 mr-2" />
                      <h3 className="text-xl font-semibold text-gray-900">Confirmação Final</h3>
                    </div>
                    <p className="text-gray-600 mb-6">
                      <strong>ATENÇÃO:</strong> Esta ação é irreversível. A sessão será completamente removida e você precisará escanear um novo QR Code para reconectar.
                    </p>
                    <p className="text-sm text-red-600 mb-6 font-medium">
                      Tem certeza que deseja desconectar e remover a sessão?
                    </p>
                    <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
                      <button
                        onClick={() => {
                          setShowFinalConfirm(false)
                          setShowDisconnectModal(false)
                        }}
                        className="flex-1 px-4 py-2 text-sm sm:text-base border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={handleDisconnect}
                        disabled={disconnecting}
                        className="flex-1 px-4 py-2 text-sm sm:text-base bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                      >
                        {disconnecting ? (
                          <>
                            <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 mr-2 animate-spin" />
                            Desconectando...
                          </>
                        ) : (
                          <>
                            <LogOut className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            {/* Painel de Envio de Mensagem */}
            <div className="lg:col-span-1 order-2 lg:order-1">
              <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4 flex items-center">
                  <Send className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                  Enviar Mensagem
                </h2>
                <form onSubmit={handleSendTest} className="space-y-4">
                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                      Número (com DDD e código do país)
                    </label>
                    <input
                      type="text"
                      id="phone"
                      value={testMessage.phone}
                      onChange={(e) => setTestMessage({ ...testMessage, phone: e.target.value })}
                      placeholder="5511999999999"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                    <p className="mt-1 text-xs text-gray-500">Formato: 55 + DDD + Número</p>
                  </div>
                  <div>
                    <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                      Mensagem
                    </label>
                    <textarea
                      id="message"
                      value={testMessage.message}
                      onChange={(e) => setTestMessage({ ...testMessage, message: e.target.value })}
                      placeholder="Digite sua mensagem..."
                      rows={4}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                  {messageStatus.type && (
                    <div
                      className={`p-3 rounded-lg ${
                        messageStatus.type === 'success'
                          ? 'bg-green-50 text-green-800'
                          : 'bg-red-50 text-red-800'
                      }`}
                    >
                      {messageStatus.message}
                    </div>
                  )}
                  <button
                    type="submit"
                    disabled={sending}
                    className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {sending ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        <Send className="w-5 h-5 mr-2" />
                        Enviar Mensagem
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>

            {/* Painel de Conversas e Mensagens */}
            <div className="lg:col-span-2 order-1 lg:order-2">
              <div className="bg-white rounded-lg shadow-md overflow-hidden flex flex-col" style={{ minHeight: '400px', height: 'calc(100vh - 300px)', maxHeight: '800px' }}>
                {/* Lista de Conversas */}
                <div className="border-b border-gray-200 p-3 sm:p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 gap-2">
                    <h2 className="text-lg sm:text-xl font-semibold text-gray-900 flex items-center">
                      <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                      <span className="truncate">{showNeedingResponse ? 'Fila de Atendimento' : 'Conversas'}</span>
                      {showNeedingResponse ? (
                        conversationsNeedingResponse.length > 0 && (
                          <span className="ml-2 px-2 py-1 text-xs bg-orange-100 text-orange-800 rounded-full flex-shrink-0">
                            {conversationsNeedingResponse.length}
                          </span>
                        )
                      ) : (
                        conversations.length > 0 && (
                          <span className="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full flex-shrink-0">
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
                      className={`px-3 py-1.5 text-xs sm:text-sm rounded-lg transition-colors whitespace-nowrap ${
                        showNeedingResponse
                          ? 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {showNeedingResponse ? 'Ver Todas' : 'Ver Fila'}
                    </button>
                  </div>
                  {showNeedingResponse && (
                    <p className="text-xs sm:text-sm text-gray-600 mb-3">
                      Conversas onde a última mensagem foi do cliente
                    </p>
                  )}
                  
                  {/* Campo de Busca e Filtros */}
                  <div className="space-y-2">
                    {/* Campo de Busca */}
                    <div className="relative">
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Buscar por nome ou número..."
                        className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <svg
                        className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
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
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          type="button"
                        >
                          <svg
                            className="w-5 h-5"
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
                </div>

                {(() => {
                  const allConversations = showNeedingResponse ? conversationsNeedingResponse : conversations
                  const filteredConversations = filterConversations(allConversations, searchTerm)
                  
                  if (filteredConversations.length === 0) {
                    if (searchTerm) {
                      return (
                        <div className="flex-1 flex items-center justify-center p-8">
                          <div className="text-center">
                            <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                            <p className="text-gray-500">Nenhuma conversa encontrada</p>
                            <p className="text-sm text-gray-400 mt-2">
                              Tente buscar por nome ou número de telefone
                            </p>
                          </div>
                        </div>
                      )
                    }
                    
                    return (
                      <div className="flex-1 flex items-center justify-center p-8">
                        <div className="text-center">
                          <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                          <p className="text-gray-500">
                            {showNeedingResponse ? 'Nenhuma conversa precisa de resposta' : 'Nenhuma conversa ainda'}
                          </p>
                          <p className="text-sm text-gray-400 mt-2">
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
                    <div className={`${showMessagesOnMobile ? 'hidden' : 'flex'} lg:flex w-full lg:w-1/3 border-r border-gray-200 overflow-y-auto flex-col`}>
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
                          className={`w-full p-3 sm:p-4 text-left hover:bg-gray-50 transition-colors border-b border-gray-100 focus:outline-none ${
                            selectedConversation === conversation.phone ? 'bg-blue-50 border-l-4 border-l-blue-600' : ''
                          } ${
                            conversation.needsResponse ? 'bg-orange-50 border-l-4 border-l-orange-500' : ''
                          }`}
                        >
                          <div className="flex items-start space-x-2 sm:space-x-3">
                            <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-full flex items-center justify-center">
                              <User className="w-4 h-4 sm:w-6 sm:h-6 text-blue-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-xs sm:text-sm font-medium text-gray-900 truncate">
                                  {conversation.contactName || formatPhone(conversation.phone)}
                                </p>
                                <div className="flex items-center gap-1 flex-shrink-0">
                                  {conversation.needsResponse && (
                                    <span className="px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-xs bg-orange-500 text-white rounded-full whitespace-nowrap">
                                      Precisa resposta
                                    </span>
                                  )}
                                  {conversation.unreadCount > 0 && (
                                    <span className="px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-xs bg-blue-600 text-white rounded-full">
                                      {conversation.unreadCount}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <p className="text-[10px] sm:text-xs text-gray-500 truncate mt-1">
                                {(() => {
                                  const messageText = formatMessageBody(conversation.lastMessage)
                                  return messageText.length > 40 ? messageText.substring(0, 40) + '...' : messageText
                                })()}
                              </p>
                              <p className="text-[10px] sm:text-xs text-gray-400 mt-1">
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
                          <div className="border-b border-gray-200 p-3 sm:p-4 bg-gray-50">
                            <div className="flex items-center justify-between space-x-3">
                              <div className="flex items-center space-x-3 min-w-0 flex-1">
                                {/* Botão voltar (apenas mobile) */}
                                <button
                                  onClick={() => {
                                    setShowMessagesOnMobile(false)
                                    setSelectedConversation(null)
                                  }}
                                  className="lg:hidden flex-shrink-0 p-1 hover:bg-gray-200 rounded transition-colors"
                                >
                                  <ArrowLeft className="w-5 h-5 text-gray-600" />
                                </button>
                                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                                  <User className="w-4 h-4 sm:w-6 sm:h-6 text-blue-600" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="font-medium text-gray-900 text-sm sm:text-base truncate">
                                    {conversations.find(c => c.phone === selectedConversation)?.contactName || formatPhone(selectedConversation)}
                                  </p>
                                  <p className="text-xs text-gray-500 truncate">{formatPhone(selectedConversation)}</p>
                                </div>
                              </div>
                              {/* Badges e botões de ação */}
                              <div className="flex items-center space-x-2 flex-shrink-0">
                                {(() => {
                                  const selectedConv = conversations.find(c => c.phone === selectedConversation)
                                  return (
                                    <>
                                      {selectedConv?.needsPharmacist && (
                                        <span className="bg-red-100 text-red-700 text-[10px] sm:text-xs px-2 sm:px-3 py-0.5 sm:py-1 rounded-full font-medium whitespace-nowrap">
                                          Farmacêutico
                                        </span>
                                      )}
                                      {selectedConv?.isAssumed && (
                                        <span className="bg-yellow-100 text-yellow-700 text-[10px] sm:text-xs px-2 sm:px-3 py-0.5 sm:py-1 rounded-full font-medium whitespace-nowrap">
                                          {selectedConv?.assumptionReason?.toLowerCase().includes('manualmente') ? 'Manualmente Assumida' : 'Assumida'}
                                        </span>
                                      )}
                                      {/* Botão para assumir/desbloquear conversa */}
                                      {selectedConv?.isAssumed || selectedConv?.needsPharmacist ? (
                                        <button
                                          onClick={() => handleUnblockConversation(selectedConversation)}
                                          className="flex items-center space-x-1 bg-green-600 hover:bg-green-700 text-white text-[10px] sm:text-xs px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap"
                                          title="Desbloquear conversa (IA voltará a responder)"
                                        >
                                          <Unlock size={14} className="sm:w-4 sm:h-4" />
                                          <span className="hidden sm:inline">Desbloquear</span>
                                        </button>
                                      ) : (
                                        <button
                                          onClick={() => handleBlockConversation(selectedConversation)}
                                          className="flex items-center space-x-1 bg-yellow-600 hover:bg-yellow-700 text-white text-[10px] sm:text-xs px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap"
                                          title="Assumir conversa (bloquear IA)"
                                        >
                                          <Lock size={14} className="sm:w-4 sm:h-4" />
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
                            className="flex-1 overflow-y-auto p-3 sm:p-4 bg-gray-50"
                            style={{ scrollBehavior: 'smooth' }}
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

                          {/* Campo de Envio de Mensagem */}
                          <div className="border-t border-gray-200 p-3 sm:p-4 bg-white">
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
                            <form onSubmit={handleSendConversationMessage} className="flex items-center space-x-2">
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
                                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer flex-shrink-0"
                                title="Anexar arquivo"
                              >
                                <Paperclip className="w-5 h-5" />
                              </label>
                              <input
                                type="text"
                                value={conversationMessage}
                                onChange={(e) => setConversationMessage(e.target.value)}
                                placeholder={selectedFile ? "Adicione uma legenda (opcional)..." : "Digite uma mensagem..."}
                                className="flex-1 px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                disabled={sendingConversationMessage}
                              />
                              <button
                                type="submit"
                                disabled={(!conversationMessage.trim() && !selectedFile) || sendingConversationMessage}
                                className="px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center flex-shrink-0"
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
                          <div className="text-center">
                            <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                            <p className="text-gray-500">Selecione uma conversa para ver as mensagens</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
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
