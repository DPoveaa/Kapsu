import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { authService } from '../services/auth.service'
import { uploadService } from '../services/upload.service'
import { addressService, SavedAddress } from '../services/address.service'
import { cepService } from '../services/cep.service'
import { User, Camera, Lock, Phone, Save, X, Check, MapPin, Plus, Edit, Trash2, Star, Loader2, ChevronRight, Shield, AlertCircle } from 'lucide-react'
import { env } from '../config/env'

type ProfileSection = 'info' | 'password' | 'image' | 'addresses' | null

export default function Profile() {
  const { user, updateUser } = useAuth()
  const [activeSection, setActiveSection] = useState<ProfileSection>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

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

  useEffect(() => {
    if (user) {
      setName(user.name || '')
      setPhone(user.phone || '')
      if (user.profile_image) {
        // Remove /api da URL base para arquivos estáticos
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

  // Limpa mensagem após 5 segundos
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => {
        setMessage(null)
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [message])

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setMessage({ type: 'error', text: 'A imagem deve ter no máximo 5MB' })
        return
      }
      setImageFile(file)
      // Cria preview temporário apenas para visualização
      const reader = new FileReader()
      reader.onload = (e) => {
        // Não atualiza o profileImage principal, apenas para preview na seção
        // O profileImage principal só será atualizado após salvar
      }
      reader.readAsDataURL(file)
      setActiveSection('image')
      setMessage(null) // Limpa mensagens anteriores
    }
  }

  const handleSaveInfo = async () => {
    try {
      setLoading(true)
      setMessage(null)

      const result = await authService.updateProfile({
        name: name.trim(),
        phone: phone.replace(/\D/g, ''),
      })

      if (result.success && result.user) {
        updateUser(result.user)
        setMessage({ type: 'success', text: 'Informações atualizadas com sucesso!' })
        setActiveSection(null)
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
        setActiveSection(null)
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

      // Faz upload da imagem
      const uploadResult = await uploadService.uploadProfileImage(imageFile)
      
      // Atualiza o perfil com o caminho da imagem
      const result = await authService.updateProfileImage(uploadResult.data.path)

      if (result.success && result.user) {
        // Remove /api da URL base para arquivos estáticos
        const baseUrl = env.apiUrl.replace('/api', '')
        
        // Atualiza o profileImage com a URL correta da API ANTES de atualizar o user
        const imageUrl = result.user.profile_image 
          ? (result.user.profile_image.startsWith('http') 
              ? result.user.profile_image 
              : `${baseUrl}${result.user.profile_image}`)
          : null
        
        // Atualiza o estado da imagem primeiro
        setProfileImage(imageUrl)
        
        // Limpa o arquivo temporário
        setImageFile(null)
        
        // Limpa o input file
        const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
        if (fileInput) {
          fileInput.value = ''
        }
        
        // Atualiza o usuário
        updateUser(result.user)
        
        // Mostra mensagem de sucesso
        setMessage({ type: 'success', text: 'Imagem de perfil atualizada com sucesso!' })
        
        // Fecha a seção após um pequeno delay para garantir que tudo foi atualizado
        setTimeout(() => {
          setActiveSection(null)
        }, 100)
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
        setActiveSection(null)
        // Limpa o input file
        const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
        if (fileInput) {
          fileInput.value = ''
        }
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Erro ao remover imagem de perfil' })
    } finally {
      setLoading(false)
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2)
  }

  // Address management functions
  const loadAddresses = async () => {
    try {
      const data = await addressService.getSavedAddresses()
      setAddresses(data)
    } catch (error: any) {
      console.error('Erro ao carregar endereços:', error)
      setMessage({ type: 'error', text: error.message || 'Erro ao carregar endereços' })
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
        const newAddress = await addressService.createSavedAddress(addressForm)
        setMessage({ type: 'success', text: 'Endereço adicionado com sucesso!' })
        // Se o novo endereço foi marcado como padrão, recarrega a lista
        if (newAddress && (newAddress as any).is_default) {
          await loadAddresses()
        }
      }

      await loadAddresses()
      setEditingAddress(null)
      setAddressForm({
        nickname: '',
        cep: '',
        address: '',
        number: '',
        complement: '',
        bairro: '',
        city: '',
        state: '',
        isDefault: false,
      })
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Erro ao salvar endereço' })
    } finally {
      setLoading(false)
    }
  }


  const handleDeleteAddress = async (id: string) => {
    if (!confirm('Tem certeza que deseja remover este endereço?')) {
      return
    }

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

  const formatCEP = (cep: string) => {
    const cleaned = cep.replace(/\D/g, '')
    if (cleaned.length <= 5) return cleaned
    return `${cleaned.substring(0, 5)}-${cleaned.substring(5, 8)}`
  }

  const handleCEPChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '')
    if (value.length <= 8) {
      const formatted = value.length > 5 
        ? `${value.substring(0, 5)}-${value.substring(5)}`
        : value
      setAddressForm({ ...addressForm, cep: formatted })
      
      // Busca endereço quando CEP estiver completo
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
          } else {
            // CEP não encontrado, mas mantém o que foi digitado
            setAddressForm(prev => ({ ...prev, cep: formatted }))
          }
        } catch (error) {
          console.error('Erro ao buscar CEP:', error)
          // Em caso de erro, mantém o CEP digitado
          setAddressForm(prev => ({ ...prev, cep: formatted }))
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

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Carregando...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-4 sm:py-6 lg:py-8 px-3 sm:px-4 lg:px-6 xl:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg dark:shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-primary-50 to-primary-100 dark:from-gray-800 dark:to-[#0F828C] px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8 border-b border-gray-100 dark:border-gray-700">
            <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-3 sm:space-y-0 sm:space-x-4 lg:space-x-6">
              <div className="relative flex-shrink-0">
                {profileImage ? (
                  <img
                    src={profileImage}
                    alt={user.name}
                    className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 rounded-full object-cover border-2 sm:border-4 border-white dark:border-gray-800 shadow-lg"
                  />
                ) : (
                  <div
                    className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 rounded-full flex items-center justify-center text-white text-lg sm:text-xl lg:text-2xl font-bold border-2 sm:border-4 border-white dark:border-gray-800 shadow-lg"
                    style={{ backgroundColor: '#67C090' }}
                  >
                    {getInitials(user.name)}
                  </div>
                )}
                <label className="absolute bottom-0 right-0 bg-primary-600 dark:bg-primary-600 text-white p-1.5 sm:p-2 rounded-full cursor-pointer hover:bg-primary-700 dark:hover:bg-gray-600 transition-colors shadow-lg">
                  <Camera size={12} className="sm:w-4 sm:h-4" />
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageSelect}
                  />
                </label>
              </div>
              <div className="text-center sm:text-left flex-1 min-w-0">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white break-words">{user.name}</h1>
                <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 mt-1 break-words">{user.email}</p>
                {user.phone && (
                  <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 mt-1">{user.phone}</p>
                )}
              </div>
            </div>
          </div>

          {/* Message */}
          {message && (
            <div
              className={`mx-3 sm:mx-4 lg:mx-6 mt-3 sm:mt-4 p-2.5 sm:p-3 lg:p-4 rounded-lg flex items-center justify-between space-x-2 ${
                message.type === 'success'
                  ? 'bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-200'
                  : 'bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-200'
              }`}
            >
              <div className="flex items-center space-x-1.5 sm:space-x-2 flex-1 min-w-0">
                {message.type === 'success' ? (
                  <Check size={16} className="sm:w-5 sm:h-5 flex-shrink-0" />
                ) : (
                  <X size={16} className="sm:w-5 sm:h-5 flex-shrink-0" />
                )}
                <span className="text-xs sm:text-sm lg:text-base break-words">{message.text}</span>
              </div>
              <button
                onClick={() => setMessage(null)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 flex-shrink-0 ml-2"
              >
                <X size={14} className="sm:w-4 sm:h-4" />
              </button>
            </div>
          )}

          <>
            {/* Menu de Cards - Estilo Mercado Livre */}
            {!activeSection && (
              <div className="px-3 sm:px-4 lg:px-6 py-4 sm:py-5 lg:py-6">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-4 sm:mb-5 lg:mb-6">
                  Configurações da Conta
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  {/* Card - Informações Pessoais */}
                  <button
                    onClick={() => setActiveSection('info')}
                    className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 sm:p-5 lg:p-6 hover:shadow-lg transition-all duration-200 text-left group relative overflow-hidden"
                  >
                    <div className="flex items-start justify-between mb-3 sm:mb-4">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-primary-100 dark:bg-gray-700 flex items-center justify-center group-hover:bg-primary-200 dark:group-hover:bg-[#78B9B5] transition-colors">
                        <User size={20} className="sm:w-6 sm:h-6 text-primary-600 dark:text-primary-400" />
                      </div>
                      <ChevronRight size={18} className="sm:w-5 sm:h-5 text-gray-400 dark:text-gray-500 group-hover:text-primary-600 dark:group-hover:text-[#78B9B5] transition-colors" />
                    </div>
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-1.5 sm:mb-2">
                      Informações Pessoais
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">
                      Dados pessoais e da conta
                    </p>
                  </button>

                  {/* Card - Segurança */}
                  <button
                    onClick={() => setActiveSection('password')}
                    className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 sm:p-5 lg:p-6 hover:shadow-lg transition-all duration-200 text-left group relative overflow-hidden"
                  >
                    <div className="flex items-start justify-between mb-3 sm:mb-4">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center group-hover:bg-green-200 dark:group-hover:bg-green-900/50 transition-colors">
                        <Lock size={20} className="sm:w-6 sm:h-6 text-green-600 dark:text-green-400" />
                      </div>
                      <ChevronRight size={18} className="sm:w-5 sm:h-5 text-gray-400 dark:text-gray-500 group-hover:text-primary-600 dark:group-hover:text-[#78B9B5] transition-colors" />
                    </div>
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-1.5 sm:mb-2">
                      Segurança
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">
                      Alterar senha e configurações de segurança
                    </p>
                  </button>

                  {/* Card - Foto de Perfil */}
                  <button
                    onClick={() => setActiveSection('image')}
                    className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 sm:p-5 lg:p-6 hover:shadow-lg transition-all duration-200 text-left group relative overflow-hidden"
                  >
                    <div className="flex items-start justify-between mb-3 sm:mb-4">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center group-hover:bg-purple-200 dark:group-hover:bg-purple-900/50 transition-colors">
                        <Camera size={20} className="sm:w-6 sm:h-6 text-purple-600 dark:text-purple-400" />
                      </div>
                      <ChevronRight size={18} className="sm:w-5 sm:h-5 text-gray-400 dark:text-gray-500 group-hover:text-primary-600 dark:group-hover:text-[#78B9B5] transition-colors" />
                    </div>
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-1.5 sm:mb-2">
                      Foto de Perfil
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">
                      Atualizar sua foto de perfil
                    </p>
                  </button>

                  {/* Card - Endereços */}
                  <button
                    onClick={() => {
                      setActiveSection('addresses')
                      loadAddresses()
                    }}
                    className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 sm:p-5 lg:p-6 hover:shadow-lg transition-all duration-200 text-left group relative overflow-hidden"
                  >
                    <div className="flex items-start justify-between mb-3 sm:mb-4">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center group-hover:bg-blue-200 dark:group-hover:bg-blue-900/50 transition-colors">
                        <MapPin size={20} className="sm:w-6 sm:h-6 text-blue-600 dark:text-blue-400" />
                      </div>
                      <ChevronRight size={18} className="sm:w-5 sm:h-5 text-gray-400 dark:text-gray-500 group-hover:text-primary-600 dark:group-hover:text-[#78B9B5] transition-colors" />
                    </div>
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-1.5 sm:mb-2">
                      Endereços
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">
                      Endereços salvos na sua conta
                    </p>
                  </button>
                </div>
              </div>
            )}

            {/* Conteúdo das Seções */}
            {activeSection && (
            <div className="p-3 sm:p-4 lg:p-6">
              {/* Botão Voltar */}
              <button
                onClick={() => setActiveSection(null)}
                className="flex items-center space-x-1.5 sm:space-x-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white mb-4 sm:mb-5 lg:mb-6 transition-colors text-sm sm:text-base"
              >
                <ChevronRight size={18} className="sm:w-5 sm:h-5 rotate-180" />
                <span>Voltar</span>
              </button>

              {/* Informações Pessoais */}
              {activeSection === 'info' && (
                <div className="space-y-3 sm:space-y-4">
                  <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white mb-4 sm:mb-5 lg:mb-6">
                    Informações Pessoais
                  </h2>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2">
                    Nome
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-400 rounded-lg bg-white dark:bg-gray-200 text-gray-900 dark:text-black focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2 flex items-center space-x-1.5 sm:space-x-2">
                    <Phone size={14} className="sm:w-4 sm:h-4" />
                    <span>Telefone</span>
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(00) 00000-0000"
                    className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-400 rounded-lg bg-white dark:bg-gray-200 text-gray-900 dark:text-black focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                  <button
                    onClick={handleSaveInfo}
                    disabled={loading}
                    className="flex items-center justify-center space-x-1.5 sm:space-x-2 px-4 sm:px-6 py-2 text-sm sm:text-base bg-primary-600 dark:bg-primary-600 text-white rounded-lg hover:bg-primary-700 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Save size={16} className="sm:w-[18px] sm:h-[18px]" />
                    <span>Salvar</span>
                  </button>
                  <button
                    onClick={() => {
                      setActiveSection(null)
                      setName(user.name || '')
                      setPhone(user.phone || '')
                    }}
                    className="px-4 sm:px-6 py-2 text-sm sm:text-base bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}

                  {/* Alterar Senha */}
                  {activeSection === 'password' && (
                    <div className="space-y-3 sm:space-y-4">
                      <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white mb-4 sm:mb-5 lg:mb-6">
                        Segurança
                      </h2>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2">
                    Senha Atual
                  </label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-400 rounded-lg bg-white dark:bg-gray-200 text-gray-900 dark:text-black focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2">
                    Nova Senha
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-400 rounded-lg bg-white dark:bg-gray-200 text-gray-900 dark:text-black focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2">
                    Confirmar Nova Senha
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-400 rounded-lg bg-white dark:bg-gray-200 text-gray-900 dark:text-black focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                  <button
                    onClick={handleSavePassword}
                    disabled={loading}
                    className="flex items-center justify-center space-x-1.5 sm:space-x-2 px-4 sm:px-6 py-2 text-sm sm:text-base bg-primary-600 dark:bg-primary-600 text-white rounded-lg hover:bg-primary-700 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Save size={16} className="sm:w-[18px] sm:h-[18px]" />
                    <span>Salvar</span>
                  </button>
                  <button
                    onClick={() => {
                      setActiveSection(null)
                      setCurrentPassword('')
                      setNewPassword('')
                      setConfirmPassword('')
                    }}
                    className="px-4 sm:px-6 py-2 text-sm sm:text-base bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}

                  {/* Foto de Perfil */}
                  {activeSection === 'image' && (
                    <div className="space-y-3 sm:space-y-4">
                      <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white mb-4 sm:mb-5 lg:mb-6">
                        Foto de Perfil
                      </h2>
                      <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-4 sm:space-y-0 sm:space-x-4 lg:space-x-6">
                  <div className="relative flex-shrink-0">
                    {/* Mostra preview da nova imagem se houver arquivo selecionado, senão mostra a imagem atual */}
                    {imageFile ? (
                      <img
                        src={URL.createObjectURL(imageFile)}
                        alt="Pré-visualização"
                        className="w-24 h-24 sm:w-28 sm:h-28 lg:w-32 lg:h-32 rounded-full object-cover border-2 sm:border-4 border-gray-200 dark:border-gray-700"
                        onLoad={(e) => {
                          // Limpa o object URL após carregar para evitar memory leak
                          setTimeout(() => {
                            URL.revokeObjectURL((e.target as HTMLImageElement).src)
                          }, 100)
                        }}
                      />
                    ) : profileImage ? (
                      <img
                        src={profileImage}
                        alt={user.name}
                        className="w-24 h-24 sm:w-28 sm:h-28 lg:w-32 lg:h-32 rounded-full object-cover border-2 sm:border-4 border-gray-200 dark:border-gray-700"
                      />
                    ) : (
                      <div
                        className="w-24 h-24 sm:w-28 sm:h-28 lg:w-32 lg:h-32 rounded-full flex items-center justify-center text-white text-xl sm:text-2xl lg:text-3xl font-bold border-2 sm:border-4 border-gray-200 dark:border-gray-700"
                        style={{ backgroundColor: '#67C090' }}
                      >
                        {getInitials(user.name)}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 w-full sm:w-auto">
                    <label className="block mb-2">
                      <span className="sr-only">Selecionar imagem</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageSelect}
                        className="block w-full text-xs sm:text-sm text-gray-500 dark:text-gray-400 file:mr-2 sm:file:mr-4 file:py-1.5 sm:file:py-2 file:px-2 sm:file:px-4 file:rounded-lg file:border-0 file:text-xs sm:file:text-sm file:font-semibold file:bg-primary-600 dark:file:bg-[#78B9B5] file:text-white hover:file:bg-primary-700 dark:hover:file:bg-[#0F828C] cursor-pointer"
                      />
                    </label>
                    <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1.5 sm:mt-2">
                      Formatos aceitos: JPG, PNG, GIF, WEBP (máx. 5MB)
                    </p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                  <button
                    onClick={handleSaveImage}
                    disabled={loading || !imageFile}
                    className="flex items-center justify-center space-x-1.5 sm:space-x-2 px-4 sm:px-6 py-2 text-sm sm:text-base bg-primary-600 dark:bg-primary-600 text-white rounded-lg hover:bg-primary-700 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Save size={16} className="sm:w-[18px] sm:h-[18px]" />
                    <span>{loading ? 'Salvando...' : 'Salvar'}</span>
                  </button>
                  {user.profile_image && (
                    <button
                      onClick={handleRemoveImage}
                      disabled={loading}
                      className="px-4 sm:px-6 py-2 text-sm sm:text-base bg-red-600 dark:bg-red-700 text-white rounded-lg hover:bg-red-700 dark:hover:bg-red-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Remover
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setImageFile(null)
                      // Remove /api da URL base para arquivos estáticos
                      const baseUrl = env.apiUrl.replace('/api', '')
                      // Restaura a imagem original do usuário
                      if (user.profile_image) {
                        setProfileImage(user.profile_image.startsWith('http') ? user.profile_image : `${baseUrl}${user.profile_image}`)
                      } else {
                        setProfileImage(null)
                      }
                      // Limpa o input file
                      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
                      if (fileInput) {
                        fileInput.value = ''
                      }
                      setActiveSection(null)
                    }}
                    disabled={loading}
                    className="px-4 sm:px-6 py-2 text-sm sm:text-base bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
                  )}

                  {/* Meus Endereços */}
                  {activeSection === 'addresses' && (
                    <div className="space-y-3 sm:space-y-4">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 mb-4 sm:mb-5 lg:mb-6">
                        <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white">
                          Meus Endereços
                        </h2>
                        <button
                          onClick={() => {
                            setEditingAddress(null)
                            setAddressForm({
                              nickname: '',
                              cep: '',
                              address: '',
                              number: '',
                              complement: '',
                              bairro: '',
                              city: '',
                              state: '',
                              isDefault: false,
                            })
                          }}
                          className="flex items-center justify-center space-x-1.5 sm:space-x-2 px-3 sm:px-4 py-2 text-sm sm:text-base bg-primary-600 dark:bg-primary-600 text-white rounded-lg hover:bg-primary-700 dark:hover:bg-gray-600 transition-colors cursor-pointer w-full sm:w-auto"
                        >
                          <Plus size={16} className="sm:w-[18px] sm:h-[18px]" />
                          <span>Adicionar Endereço</span>
                        </button>
                      </div>

                {/* Formulário de Endereço */}
                {(editingAddress || addressForm.nickname || addressForm.cep) && (
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 sm:p-4 lg:p-6 border border-gray-200 dark:border-gray-700">
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4">
                      {editingAddress ? 'Editar Endereço' : 'Novo Endereço'}
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2">
                          Apelido <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={addressForm.nickname}
                          onChange={(e) => setAddressForm({ ...addressForm, nickname: e.target.value })}
                          placeholder="Ex: Casa, Trabalho"
                          className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2">
                          CEP <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            value={addressForm.cep}
                            onChange={handleCEPChange}
                            placeholder="00000-000"
                            maxLength={9}
                            className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-500 focus:border-transparent"
                          />
                          {searchingCep && (
                            <div className="absolute right-2 sm:right-3 top-1/2 transform -translate-y-1/2">
                              <Loader2 className="animate-spin text-primary-600 dark:text-primary-400 w-4 h-4 sm:w-5 sm:h-5" />
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2">
                          Endereço <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={addressForm.address}
                          onChange={(e) => setAddressForm({ ...addressForm, address: e.target.value })}
                          placeholder="Rua, Avenida, etc."
                          className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2">
                          Número <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={addressForm.number}
                          onChange={(e) => setAddressForm({ ...addressForm, number: e.target.value })}
                          placeholder="123"
                          className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2">
                          Bairro
                        </label>
                        <input
                          type="text"
                          value={addressForm.bairro}
                          onChange={(e) => setAddressForm({ ...addressForm, bairro: e.target.value })}
                          placeholder="Bairro"
                          className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2">
                          Complemento
                        </label>
                        <input
                          type="text"
                          value={addressForm.complement}
                          onChange={(e) => setAddressForm({ ...addressForm, complement: e.target.value })}
                          placeholder="Apto, Bloco, etc."
                          className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2">
                          Cidade <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={addressForm.city}
                          onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                          placeholder="São Paulo"
                          className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2">
                          Estado (UF) <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={addressForm.state}
                          onChange={(e) => setAddressForm({ ...addressForm, state: e.target.value.toUpperCase().substring(0, 2) })}
                          placeholder="SP"
                          maxLength={2}
                          className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-500 focus:border-transparent"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={addressForm.isDefault}
                            onChange={(e) => setAddressForm({ ...addressForm, isDefault: e.target.checked })}
                            className="w-4 h-4 text-primary-600 dark:text-primary-400 border-gray-300 dark:border-gray-700 rounded focus:ring-primary-500 dark:focus:ring-primary-500"
                          />
                          <span className="text-xs sm:text-sm text-gray-700 dark:text-gray-300">Marcar como endereço padrão</span>
                        </label>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mt-3 sm:mt-4">
                      <button
                        onClick={handleSaveAddress}
                        disabled={loading}
                        className="flex items-center justify-center space-x-1.5 sm:space-x-2 px-4 sm:px-6 py-2 text-sm sm:text-base bg-primary-600 dark:bg-primary-600 text-white rounded-lg hover:bg-primary-700 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Save size={16} className="sm:w-[18px] sm:h-[18px]" />
                        <span>{loading ? 'Salvando...' : 'Salvar'}</span>
                      </button>
                      <button
                        onClick={() => {
                          setEditingAddress(null)
                          setAddressForm({
                            nickname: '',
                            cep: '',
                            address: '',
                            number: '',
                            complement: '',
                            bairro: '',
                            city: '',
                            state: '',
                            isDefault: false,
                          })
                        }}
                        className="px-4 sm:px-6 py-2 text-sm sm:text-base bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}

                {/* Lista de Endereços */}
                <div className="space-y-2 sm:space-y-3">
                  {addresses.length === 0 ? (
                    <div className="text-center py-6 sm:py-8 text-gray-500 dark:text-gray-400">
                      <MapPin size={40} className="sm:w-12 sm:h-12 mx-auto mb-3 sm:mb-4 opacity-50" />
                      <p className="text-sm sm:text-base">Nenhum endereço cadastrado</p>
                      <p className="text-xs sm:text-sm mt-1.5 sm:mt-2">Clique em "Adicionar Endereço" para começar</p>
                    </div>
                  ) : (
                    addresses.map((address) => (
                      <div
                        key={address.id}
                        className={`p-3 sm:p-4 rounded-lg border-2 ${
                          address.is_default
                            ? 'border-primary-500 dark:border-primary-500 bg-primary-50 dark:bg-gray-800'
                            : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                              <h3 className="font-semibold text-sm sm:text-base text-gray-900 dark:text-white break-words">{address.nickname}</h3>
                              {address.is_default && (
                                <span className="inline-flex items-center space-x-1 px-1.5 sm:px-2 py-0.5 sm:py-1 bg-primary-600 dark:bg-primary-600 text-white text-[10px] sm:text-xs rounded-full">
                                  <Star size={10} className="sm:w-3 sm:h-3" fill="currentColor" />
                                  <span>Padrão</span>
                                </span>
                              )}
                            </div>
                            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 break-words">
                              {address.address}, {address.number}
                              {address.complement && ` - ${address.complement}`}
                            </p>
                            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">
                              {address.city} - {address.state}
                            </p>
                            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">CEP: {address.cep}</p>
                          </div>
                          <div className="flex items-center space-x-1 sm:space-x-2 sm:ml-4 flex-shrink-0 w-full sm:w-auto justify-end sm:justify-start">
                            {!address.is_default && (
                              <button
                                onClick={() => handleSetDefaultAddress(address.id)}
                                disabled={loading}
                                className="p-1.5 sm:p-2 text-primary-600 dark:text-primary-400 hover:bg-primary-100 dark:hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50"
                                title="Marcar como padrão"
                              >
                                <Star size={16} className="sm:w-[18px] sm:h-[18px]" />
                              </button>
                            )}
                            <button
                              onClick={() => handleEditAddress(address)}
                              disabled={loading}
                              className="p-1.5 sm:p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors disabled:opacity-50"
                              title="Editar"
                            >
                              <Edit size={16} className="sm:w-[18px] sm:h-[18px]" />
                            </button>
                            <button
                              onClick={() => handleDeleteAddress(address.id)}
                              disabled={loading}
                              className="p-1.5 sm:p-2 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors disabled:opacity-50"
                              title="Remover"
                            >
                              <Trash2 size={16} className="sm:w-[18px] sm:h-[18px]" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                      </div>
                    </div>
                  )}
                </div>
              )}
          </>
        </div>
      </div>
    </div>
  )
}

