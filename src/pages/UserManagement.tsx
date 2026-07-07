import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Search, Mail, Phone, Shield, UserCheck, Clock, Calendar, DollarSign, Package, ChevronDown, ChevronUp, Edit2, Check, User as UserIcon, Copy, ShieldAlert, Sparkles } from 'lucide-react'
import { adminService, User as UserType, UserDetails } from '../services/admin.service'
import { validateCPF, formatCPF as liveFormatCPF, validatePhone, formatPhone as liveFormatPhone, validateEmail } from '../utils/validators'
import { confirm, toast } from '../utils/toast'
import AdminModal from '../components/AdminModal'

export default function UserManagement() {
  const navigate = useNavigate()
  const [users, setUsers] = useState<UserType[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [selectedUser, setSelectedUser] = useState<UserDetails | null>(null)
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set())
  const [updatingRole, setUpdatingRole] = useState<string | null>(null)
  const [statistics, setStatistics] = useState<{
    totalUsers: number
    totalAdmins: number
    totalSupport: number
    totalUsersWithoutCpf: number
  } | null>(null)

  // Filtros rápidos: 'all' | 'user' | 'admin' | 'nocpf'
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'user' | 'admin' | 'nocpf' | 'ignored' | 'notIgnored'>('all')

  // Estados para modal de edição de dados básicos
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingUser, setEditingUser] = useState<UserType | null>(null)
  const [editForm, setEditForm] = useState({
    name: '',
    cpf: '',
    phone: '',
    email: '',
  })
  const [savingEdit, setSavingEdit] = useState(false)
  const [showEmailWarning, setShowEmailWarning] = useState(false)

  useEffect(() => {
    loadUsers()
    loadStatistics()
  }, [page, searchTerm, selectedFilter])

  const loadUsers = async () => {
    try {
      setLoading(true)
      const roleFilter = selectedFilter === 'user' ? 'user' : selectedFilter === 'admin' ? 'admin' : ''
      const nocpfFilter = selectedFilter === 'nocpf' ? 'true' : ''

      const data = await adminService.listUsers(page, 20, searchTerm, roleFilter, nocpfFilter)
      if (data.success) {
        setUsers(data.users)
        setTotalPages(data.pagination.totalPages)
      }
    } catch (error: any) {
      console.error('Erro ao carregar usuários:', error)
      toast.error('Erro ao carregar usuários: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const loadStatistics = async () => {
    try {
      const data = await adminService.getStatistics()
      if (data.success) {
        setStatistics({
          totalUsers: data.statistics.totalUsers,
          totalAdmins: data.statistics.totalAdmins,
          totalSupport: data.statistics.totalSupport || 0,
          totalUsersWithoutCpf: data.statistics.totalUsersWithoutCpf || 0,
        })
      }
    } catch (error: any) {
      console.error('Erro ao carregar estatísticas:', error)
    }
  }

  const loadUserDetails = async (userId: string) => {
    try {
      const data = await adminService.getUserDetails(userId)
      if (data.success) {
        setSelectedUser(data.user)
      }
    } catch (error: any) {
      console.error('Erro ao carregar detalhes:', error)
      toast.error('Erro ao carregar detalhes do usuário: ' + error.message)
    }
  }

  const handleUpdateRole = async (userId: string, newRole: 'user' | 'admin' | 'support') => {
    const roleLabel = newRole === 'admin' ? 'Administrador' : newRole === 'support' ? 'Suporte' : 'Usuário'
    
    confirm.show(
      `Deseja realmente alterar o cargo deste usuário para "${roleLabel}"?`,
      async () => {
        try {
          setUpdatingRole(userId)
          const data = await adminService.updateUserRole(userId, newRole)
          if (data.success) {
            await loadUsers()
            await loadStatistics()
            if (selectedUser && selectedUser.id === userId) {
              await loadUserDetails(userId)
            }
            toast.success(`Cargo do usuário atualizado para ${roleLabel}`)
          }
        } catch (error: any) {
          console.error('Erro ao atualizar cargo:', error)
          toast.error(error.message || 'Erro ao atualizar cargo')
        } finally {
          setUpdatingRole(null)
        }
      }
    )
  }


  const handleToggleBusinessIgnore = async (user: UserType) => {
    const nextValue = !user.ignore_business_metrics
    confirm.show(
      nextValue
        ? 'Os pedidos deste usuário serão excluídos de relatórios, estatísticas, Google Sheets e exportações para fornecedores.'
        : 'Remover este usuário dos ignorados? Os pedidos já marcados como ignorados continuarão assim até serem alterados individualmente.',
      async () => {
        await adminService.updateUser(user.id, {
          ignore_business_metrics: nextValue,
          ignore_reason: nextValue ? 'internal_test_account' : null,
          apply_to_existing_orders: nextValue,
        })
        await loadUsers()
        if (selectedUser?.id === user.id) await loadUserDetails(user.id)
        toast.success(nextValue ? 'Usuário marcado como ignorado' : 'Usuário removido dos ignorados')
      }
    )
  }
  const handleOpenEditModal = (user: UserType) => {
    setEditingUser(user)
    setEditForm({
      name: user.name || '',
      cpf: user.cpf ? formatCPFDisplay(user.cpf) : '',
      phone: user.phone ? liveFormatPhone(user.phone) : '',
      email: user.email || '',
    })
    setShowEmailWarning(false)
    setShowEditModal(true)
  }

  const handleSaveUser = async () => {
    if (!editingUser) return

    // Validações locais
    if (!editForm.name.trim()) {
      toast.error('O nome é obrigatório.')
      return
    }

    if (!validateEmail(editForm.email)) {
      toast.error('Formato de e-mail inválido.')
      return
    }

    if (editForm.cpf && !validateCPF(editForm.cpf)) {
      toast.error('CPF inválido. Verifique os dígitos.')
      return
    }

    if (editForm.phone) {
      const cleanPhone = editForm.phone.replace(/\D/g, '')
      if (!validatePhone(cleanPhone)) {
        toast.error('Número de telefone inválido.')
        return
      }
    }

    // Se o email mudou e o aviso ainda não foi confirmado, mostra aviso de confirmação
    if (editForm.email.toLowerCase().trim() !== editingUser.email.toLowerCase().trim() && !showEmailWarning) {
      setShowEmailWarning(true)
      return
    }

    confirm.show(
      'Deseja salvar as alterações deste usuário?',
      async () => {
        try {
          setSavingEdit(true)
          const cleanCPF = editForm.cpf ? editForm.cpf.replace(/\D/g, '') : null
          const cleanPhone = editForm.phone ? editForm.phone.replace(/\D/g, '') : null

          const response = await adminService.updateUser(editingUser.id, {
            name: editForm.name,
            cpf: cleanCPF,
            phone: cleanPhone,
            email: editForm.email.toLowerCase().trim(),
          })

          if (response.success) {
            toast.success('Usuário atualizado com sucesso!')
            setShowEditModal(false)
            setEditingUser(null)
            await loadUsers()
            await loadStatistics()
            if (selectedUser && selectedUser.id === editingUser.id) {
              await loadUserDetails(editingUser.id)
            }
          }
        } catch (error: any) {
          console.error(error)
          toast.error(error.message || 'Erro ao atualizar dados do usuário')
        } finally {
          setSavingEdit(false)
        }
      }
    )
  }

  const toggleUserExpansion = async (userId: string) => {
    const newExpanded = new Set(expandedUsers)
    if (newExpanded.has(userId)) {
      newExpanded.delete(userId)
      setSelectedUser(null)
    } else {
      newExpanded.add(userId)
      await loadUserDetails(userId)
    }
    setExpandedUsers(newExpanded)
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatDateOnly = (dateString: string | null) => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  const formatCPFDisplay = (cpf: string | null) => {
    if (!cpf) return 'N/A'
    const clean = cpf.replace(/\D/g, '')
    if (clean.length === 11) {
      return clean.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
    }
    return cpf
  }

  const maskCPF = (cpf: string | null) => {
    if (!cpf) return 'Não informado'
    const clean = cpf.replace(/\D/g, '')
    if (clean.length === 11) {
      return `***.${clean.slice(3, 6)}.${clean.slice(6, 9)}-**`
    }
    return '***.***.***-**'
  }

  const formatPhone = (phone: string | null) => {
    if (!phone) return 'N/A'
    const cleanPhone = phone.startsWith('55') && phone.length > 11 ? phone.substring(2) : phone
    if (cleanPhone.length === 11) {
      return cleanPhone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
    }
    if (cleanPhone.length === 10) {
      return cleanPhone.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3')
    }
    return cleanPhone
  }

  const getRoleBadge = (role: string) => {
    const badges = {
      admin: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300', label: 'Administrador', icon: Shield },
      support: { bg: 'bg-teal-100 dark:bg-teal-900/30', text: 'text-teal-700 dark:text-teal-300', label: 'Suporte', icon: UserCheck },
      user: { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-700 dark:text-gray-300', label: 'Usuário', icon: UserIcon },
    }
    const badge = badges[role as keyof typeof badges] || badges.user
    const Icon = badge.icon
    return (
      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${badge.bg} ${badge.text}`}>
        <Icon className="w-3.5 h-3.5 mr-1" />
        {badge.label}
      </span>
    )
  }

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast.success(`${label} copiado!`)
  }

  return (
    <div className="w-full pb-12">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-4 sm:py-6 lg:py-8">
        
        {/* Header */}
        <div className="mb-6 lg:mb-8">
          <button
            onClick={() => navigate('/admin')}
            className="flex items-center text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white mb-3 sm:mb-4 text-sm sm:text-base font-semibold"
          >
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
            Voltar ao painel
          </button>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white flex items-center gap-2">
            <UserIcon className="w-8 h-8 text-primary-600 dark:text-primary-400" />
            Gerenciamento de Clientes e Usuários
          </h1>
          <p className="mt-2 text-sm sm:text-base text-gray-500 dark:text-gray-400">
            Gerencie dados cadastrais, corrija CPF de clientes, defina níveis de acesso administrativos e consulte estatísticas de compra.
          </p>
        </div>

        {/* Estatísticas */}
        {statistics && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-gray-550 dark:text-gray-400 uppercase">Total de Usuários</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{statistics.totalUsers}</p>
                </div>
                <UserIcon className="w-10 h-10 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 p-2 rounded-xl" />
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Clientes Comuns</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                    {Math.max(0, statistics.totalUsers - statistics.totalAdmins - statistics.totalSupport)}
                  </p>
                </div>
                <UserIcon className="w-10 h-10 text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 p-2 rounded-xl" />
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Administradores</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{statistics.totalAdmins}</p>
                </div>
                <Shield className="w-10 h-10 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-2 rounded-xl" />
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Usuários Sem CPF</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{statistics.totalUsersWithoutCpf}</p>
                </div>
                <ShieldAlert className="w-10 h-10 text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 p-2 rounded-xl" />
              </div>
            </div>
          </div>
        )}

        {/* Busca e Filtros */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-5 mb-6">
          <div className="flex flex-col gap-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                  setPage(1)
                }}
                placeholder="Buscar por nome, email, telefone ou CPF (completo ou parcial)..."
                className="w-full pl-11 pr-4 py-3 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
              />
            </div>
            
            {/* Filtros Rápidos */}
            <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
              {(['all', 'user', 'admin', 'nocpf', 'ignored', 'notIgnored'] as const).map((filter) => {
                const labels = {
                  all: 'Todos os Usuários',
                  user: 'Apenas Clientes',
                  admin: 'Administradores',
                  nocpf: 'Contas Sem CPF',
                  ignored: 'Ignorados',
                  notIgnored: 'Não Ignorados',
                }
                const active = selectedFilter === filter
                return (
                  <button
                    key={filter}
                    onClick={() => {
                      setSelectedFilter(filter)
                      setPage(1)
                    }}
                    className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                      active
                        ? 'bg-primary-600 text-white shadow-md shadow-primary-500/10'
                        : 'bg-gray-50 dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    {labels[filter]}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Lista de Usuários */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600 dark:border-primary-400 mx-auto mb-4"></div>
                <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">Carregando usuários cadastrados...</p>
              </div>
            </div>
          ) : users.length === 0 ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <UserIcon className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400 text-base font-semibold">Nenhum usuário corresponde aos filtros ou busca.</p>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-800">
              {users.map((user) => {
                const isExpanded = expandedUsers.has(user.id)
                const userDetails = selectedUser && selectedUser.id === user.id ? selectedUser : null

                return (
                  <div key={user.id} className="p-4 sm:p-5 hover:bg-gray-50 dark:hover:bg-[#065084]/5 transition-colors">
                    {/* Cabeçalho do Usuário */}
                    <div
                      role="button"
                      tabIndex={0}
                      className="flex items-center justify-between cursor-pointer focus:outline-none rounded-xl"
                      onClick={() => toggleUserExpansion(user.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          toggleUserExpansion(user.id)
                        }
                      }}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
                          <div className="flex items-center space-x-3 min-w-0 flex-1">
                            <div className="flex-shrink-0 w-10 h-10 bg-primary-50 dark:bg-primary-950/20 rounded-full flex items-center justify-center">
                              <UserIcon className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                            </div>
                            <div className="min-w-0 flex-1 space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="text-base font-bold text-gray-900 dark:text-white break-words">
                                  {user.name}
                                </h3>
                                {getRoleBadge(user.role)}
                                {user.ignore_business_metrics && (
                                  <span className='inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'>Ignorado</span>
                                )}
                              </div>
                              <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-4">
                                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 break-words flex items-center">
                                  <Mail className="w-4 h-4 mr-1 text-gray-500 flex-shrink-0" />
                                  <span className="break-all">{user.email}</span>
                                </p>
                                {user.phone && (
                                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 break-words flex items-center">
                                    <Phone className="w-4 h-4 mr-1 text-gray-500 flex-shrink-0" />
                                    {formatPhone(user.phone)}
                                  </p>
                                )}
                                {user.cpf && (
                                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 break-words flex items-center">
                                    <span className="font-semibold text-gray-500 mr-1">CPF:</span>
                                    {maskCPF(user.cpf)}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-3 flex-shrink-0 self-start sm:self-center">
                            {user.last_login && (
                              <div className="hidden lg:flex items-center text-xs text-gray-400 dark:text-gray-500 font-medium">
                                <Clock className="w-3.5 h-3.5 mr-1" />
                                <span className="whitespace-nowrap">Acesso: {formatDate(user.last_login)}</span>
                              </div>
                            )}
                            <button
                              tabIndex={-1}
                              className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 flex-shrink-0 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                            >
                              {isExpanded ? (
                                <ChevronUp className="w-5 h-5" />
                              ) : (
                                <ChevronDown className="w-5 h-5" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
 
                    {/* Detalhes Expandidos */}
                    {isExpanded && userDetails && (
                      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-800 space-y-5 animate-slide-down">
                        
                        {/* Informações Pessoais */}
                        <div>
                          <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-3">Dados Cadastrais</h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs sm:text-sm">
                            <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-xl border border-gray-100 dark:border-gray-700">
                              <p className="text-gray-500 font-semibold mb-0.5">CPF Completo</p>
                              <div className="flex items-center gap-2">
                                <p className="text-gray-900 dark:text-white font-bold">{userDetails.cpf ? formatCPFDisplay(userDetails.cpf) : 'Não informado'}</p>
                                {userDetails.cpf && (
                                  <button
                                    onClick={() => handleCopy(userDetails.cpf || '', 'CPF')}
                                    className="p-1 text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                                    title="Copiar CPF completo"
                                  >
                                    <Copy className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-xl border border-gray-100 dark:border-gray-700">
                              <p className="text-gray-500 font-semibold mb-0.5">Telefone de Contato</p>
                              <div className="flex items-center gap-2">
                                <p className="text-gray-900 dark:text-white font-bold">{userDetails.phone ? formatPhone(userDetails.phone) : 'Não informado'}</p>
                                {userDetails.phone && (
                                  <button
                                    onClick={() => handleCopy(userDetails.phone || '', 'Telefone')}
                                    className="p-1 text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                                    title="Copiar Telefone"
                                  >
                                    <Copy className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-xl border border-gray-100 dark:border-gray-700">
                              <p className="text-gray-500 font-semibold mb-0.5">Cadastrado em</p>
                              <p className="text-gray-900 dark:text-white font-bold">{formatDate(userDetails.created_at)}</p>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-xl border border-gray-100 dark:border-gray-700">
                              <p className="text-gray-500 font-semibold mb-0.5">Último Login</p>
                              <p className="text-gray-900 dark:text-white font-bold">{formatDate(userDetails.last_login)}</p>
                            </div>
                            {userDetails.address && (
                              <div className="sm:col-span-2 lg:col-span-4 bg-gray-50 dark:bg-gray-800 p-3 rounded-xl border border-gray-100 dark:border-gray-700">
                                <p className="text-gray-500 font-semibold mb-0.5">Endereço Registrado</p>
                                <p className="text-gray-900 dark:text-white font-bold">{userDetails.address}</p>
                              </div>
                            )}
                          </div>
                        </div>
 
                        {/* Estatísticas de Consumo */}
                        {userDetails.statistics && (
                          <div>
                            <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-3">Histórico de Compras</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              <div className="bg-blue-50/50 dark:bg-blue-950/20 rounded-xl p-3 border border-blue-200 dark:border-blue-900/50">
                                <div className="flex items-center space-x-2">
                                  <Package className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                                  <div className="min-w-0 flex-1">
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Total de Pedidos</p>
                                    <p className="text-lg font-bold text-gray-900 dark:text-white">
                                      {userDetails.statistics.totalOrders}
                                    </p>
                                  </div>
                                </div>
                              </div>
                              <div className="bg-green-50/50 dark:bg-green-950/20 rounded-xl p-3 border border-green-200 dark:border-green-900/50">
                                <div className="flex items-center space-x-2">
                                  <DollarSign className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                                  <div className="min-w-0 flex-1">
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Total Investido</p>
                                    <p className="text-lg font-bold text-gray-900 dark:text-white break-words">
                                      R$ {userDetails.statistics.totalSpent.toFixed(2).replace('.', ',')}
                                    </p>
                                  </div>
                                </div>
                              </div>
                              {userDetails.statistics.lastOrder && (
                                <div className="bg-purple-50/50 dark:bg-purple-950/20 rounded-xl p-3 border border-purple-200 dark:border-purple-900/50">
                                  <div className="flex items-center space-x-2">
                                    <Calendar className="w-5 h-5 text-purple-600 dark:text-purple-400 flex-shrink-0" />
                                    <div className="min-w-0 flex-1">
                                      <p className="text-xs text-gray-500 dark:text-gray-400">Mais recente</p>
                                      <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
                                        {formatDateOnly(userDetails.statistics.lastOrder.created_at)}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
 
                        {/* Ações e Alteração de Nível */}
                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 pt-4 border-t border-gray-200 dark:border-gray-800">
                          
                          {/* Nível de Acesso */}
                          <div className="space-y-2 flex-1">
                            <h4 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                              <Shield className="w-4 h-4 text-gray-500" />
                              Nível de Acesso (Cargo)
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {(['user', 'support', 'admin'] as const).map((role) => (
                                <button
                                  key={role}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleUpdateRole(user.id, role)
                                  }}
                                  disabled={updatingRole === user.id || user.role === role}
                                  className={`flex items-center justify-center px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-colors ${
                                    user.role === role
                                      ? 'bg-primary-600 text-white cursor-default'
                                      : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                                  } disabled:opacity-65 disabled:cursor-not-allowed`}
                                >
                                  {updatingRole === user.id ? (
                                    <>
                                      <div className="animate-spin rounded-full h-4.5 w-4.5 border-b-2 border-current mr-2"></div>
                                      <span>Gravando...</span>
                                    </>
                                  ) : user.role === role ? (
                                    <>
                                      <Check className="w-4 h-4 mr-1.5" />
                                      <span>{role === 'admin' ? 'Administrador' : role === 'support' ? 'Suporte' : 'Usuário / Cliente'}</span>
                                    </>
                                  ) : (
                                    <>
                                      <Edit2 className="w-4 h-4 mr-1.5" />
                                      <span>{role === 'admin' ? 'Tornar Admin' : role === 'support' ? 'Tornar Suporte' : 'Tornar Usuário'}</span>
                                    </>
                                  )}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Ações Rápidas */}
                          <div className="space-y-2">
                            <h4 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                              <Sparkles className="w-4 h-4 text-gray-500" />
                              Ações Administrativas
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleOpenEditModal(userDetails)
                                }}
                                className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-md shadow-blue-500/10"
                              >
                                <Edit2 className="w-4 h-4" />
                                Editar Dados Básicos
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleToggleBusinessIgnore(userDetails)
                                }}
                                className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${userDetails.ignore_business_metrics ? 'bg-amber-100 text-amber-800 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-300' : 'bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-950/20 dark:text-red-300'}`}
                              >
                                <ShieldAlert className="w-4 h-4" />
                                {userDetails.ignore_business_metrics ? 'Remover Ignorado' : 'Ignorar em métricas'}
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  navigate(`/admin/orders?search=${user.email}`)
                                }}
                                className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-xs sm:text-sm font-semibold transition-all"
                              >
                                <Package className="w-4 h-4" />
                                Ver Pedidos
                              </button>
                            </div>
                          </div>

                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Paginação */}
          {totalPages > 1 && (
            <div className="px-5 py-4 border-t border-gray-200 dark:border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-3 bg-gray-50/50 dark:bg-gray-900/50">
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-semibold">
                Página {page} de {totalPages}
              </p>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2.5 text-xs sm:text-sm font-semibold border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-white rounded-xl hover:bg-gray-50 dark:hover:bg-[#065084] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  Anterior
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-4 py-2.5 text-xs sm:text-sm font-semibold border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-white rounded-xl hover:bg-gray-50 dark:hover:bg-[#065084] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  Próxima
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal de Edição */}
        <AdminModal
          isOpen={showEditModal}
          onClose={() => {
            if (!savingEdit) setShowEditModal(false)
          }}
          title="Editar Dados do Usuário"
          widthClass="max-w-md"
          footer={
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowEditModal(false)}
                disabled={savingEdit}
                className="px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-sm font-semibold disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveUser}
                disabled={savingEdit}
                className="px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl shadow-md shadow-primary-500/10 hover:shadow-lg hover:shadow-primary-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold"
              >
                {savingEdit ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </div>
          }
        >
          <div className="space-y-4">
            
            {showEmailWarning && (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-xl text-amber-800 dark:text-amber-400 text-xs sm:text-sm flex items-start gap-2">
                <ShieldAlert className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Atenção ao alterar o E-mail</p>
                  <p className="mt-1">Alterar o e-mail pode impactar o login do cliente. Certifique-se de que o novo e-mail está correto e informe o usuário.</p>
                  <button
                    onClick={() => {
                      setShowEmailWarning(false)
                      handleSaveUser()
                    }}
                    className="mt-2 text-xs font-bold underline text-amber-900 dark:text-amber-300 hover:text-amber-800"
                  >
                    Confirmar mesmo assim
                  </button>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Nome Completo
              </label>
              <input
                type="text"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none transition-all"
                placeholder="Ex: João da Silva"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                CPF
              </label>
              <input
                type="text"
                value={editForm.cpf}
                onChange={(e) => setEditForm({ ...editForm, cpf: liveFormatCPF(e.target.value) })}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none transition-all"
                placeholder="000.000.000-00"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Telefone
              </label>
              <input
                type="text"
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: liveFormatPhone(e.target.value) })}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none transition-all"
                placeholder="(11) 99999-9999"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                E-mail
              </label>
              <input
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none transition-all"
                placeholder="cliente@email.com"
              />
            </div>

          </div>
        </AdminModal>

      </div>
    </div>
  )
}
