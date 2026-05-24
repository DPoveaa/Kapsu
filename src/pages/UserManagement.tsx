import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Search, Mail, Phone, Shield, UserCheck, Clock, Calendar, DollarSign, Package, ChevronDown, ChevronUp, Edit2, Check, User as UserIcon } from 'lucide-react'
import { adminService, User as UserType, UserDetails } from '../services/admin.service'

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
    totalPharmacists: number
  } | null>(null)

  useEffect(() => {
    loadUsers()
    loadStatistics()
  }, [page, searchTerm])

  const loadUsers = async () => {
    try {
      setLoading(true)
      const data = await adminService.listUsers(page, 20, searchTerm)
      if (data.success) {
        setUsers(data.users)
        setTotalPages(data.pagination.totalPages)
      }
    } catch (error: any) {
      console.error('Erro ao carregar usuários:', error)
      alert('Erro ao carregar usuários: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const loadStatistics = async () => {
    try {
      const data = await adminService.getStatistics()
      if (data.success) {
        setStatistics(data.statistics)
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
      alert('Erro ao carregar detalhes do usuário: ' + error.message)
    }
  }

  const handleUpdateRole = async (userId: string, newRole: 'user' | 'admin' | 'pharmacist') => {
    try {
      setUpdatingRole(userId)
      const data = await adminService.updateUserRole(userId, newRole)
      if (data.success) {
        // Atualiza a lista de usuários
        await loadUsers()
        if (selectedUser && selectedUser.id === userId) {
          await loadUserDetails(userId)
        }
        alert(`Role atualizado para ${newRole === 'admin' ? 'Administrador' : newRole === 'pharmacist' ? 'Farmacêutico' : 'Usuário'}`)
      }
    } catch (error: any) {
      console.error('Erro ao atualizar role:', error)
      alert('Erro ao atualizar role: ' + error.message)
    } finally {
      setUpdatingRole(null)
    }
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

  const formatCPF = (cpf: string | null) => {
    if (!cpf) return 'N/A'
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
  }

  const formatPhone = (phone: string | null) => {
    if (!phone) return 'N/A'
    if (phone.length === 11) {
      return phone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
    }
    return phone
  }

  const getRoleBadge = (role: string) => {
    const badges = {
      admin: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300', label: 'Administrador', icon: Shield },
      pharmacist: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300', label: 'Farmacêutico', icon: UserCheck },
      user: { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-700 dark:text-gray-300', label: 'Usuário', icon: UserIcon },
    }
    const badge = badges[role as keyof typeof badges] || badges.user
    const Icon = badge.icon
    return (
      <span className={`inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium ${badge.bg} ${badge.text}`}>
        <Icon className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
        {badge.label}
      </span>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-4 sm:py-6 lg:py-8">
        {/* Header */}
        <div className="mb-4 sm:mb-6 lg:mb-8">
          <button
            onClick={() => navigate('/admin')}
            className="flex items-center text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white mb-3 sm:mb-4 text-sm sm:text-base"
          >
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
            Voltar ao painel
          </button>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Gerenciamento de Usuários</h1>
          <p className="mt-1 sm:mt-2 text-sm sm:text-base text-gray-600 dark:text-gray-300">Gerencie usuários, cargos e permissões</p>
        </div>

        {/* Estatísticas */}
        {statistics && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-lg p-3 sm:p-4 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">Total de Usuários</p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mt-1">{statistics.totalUsers}</p>
                </div>
                <UserIcon className="w-8 h-8 sm:w-10 sm:h-10 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-lg p-3 sm:p-4 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">Administradores</p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mt-1">{statistics.totalAdmins}</p>
                </div>
                <Shield className="w-8 h-8 sm:w-10 sm:h-10 text-red-600 dark:text-red-400" />
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-lg p-3 sm:p-4 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">Farmacêuticos</p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mt-1">{statistics.totalPharmacists}</p>
                </div>
                <UserCheck className="w-8 h-8 sm:w-10 sm:h-10 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>
        )}

        {/* Busca e Filtros */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-lg p-3 sm:p-4 mb-4 sm:mb-6 border border-gray-200 dark:border-gray-700">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-4 h-4 sm:w-5 sm:h-5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                  setPage(1)
                }}
                placeholder="Buscar por nome, email, telefone ou CPF..."
                className="w-full pl-9 sm:pl-10 pr-4 py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-400 dark:bg-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Lista de Usuários */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400 mx-auto mb-4"></div>
                <p className="text-gray-600 dark:text-gray-300 text-sm sm:text-base">Carregando usuários...</p>
              </div>
            </div>
          ) : users.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <UserIcon className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-base">Nenhum usuário encontrado</p>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {users.map((user) => {
                const isExpanded = expandedUsers.has(user.id)
                const userDetails = selectedUser && selectedUser.id === user.id ? selectedUser : null

                return (
                  <div key={user.id} className="p-3 sm:p-4 hover:bg-gray-50 dark:hover:bg-[#065084] transition-colors">
                    {/* Cabeçalho do Usuário */}
                    <div
                      className="flex items-center justify-between cursor-pointer"
                      onClick={() => toggleUserExpansion(user.id)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
                          <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
                            <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                              <UserIcon className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap mb-1">
                                <h3 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white break-words">
                                  {user.name}
                                </h3>
                                {getRoleBadge(user.role)}
                              </div>
                              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
                                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 break-words flex items-start sm:items-center">
                                  <Mail className="w-3 h-3 sm:w-4 sm:h-4 mr-1 flex-shrink-0 mt-0.5 sm:mt-0" />
                                  <span className="break-all">{user.email}</span>
                                </p>
                                {user.phone && (
                                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 break-words flex items-center">
                                    <Phone className="w-3 h-3 sm:w-4 sm:h-4 mr-1 flex-shrink-0" />
                                    {formatPhone(user.phone)}
                                  </p>
                                )}
                              </div>
                              {user.last_login && (
                                <div className="flex sm:hidden items-center text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-1">
                                  <Clock className="w-3 h-3 mr-1" />
                                  {formatDate(user.last_login)}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-2 sm:space-x-4 flex-shrink-0 self-start sm:self-center">
                            {user.last_login && (
                              <div className="hidden sm:flex items-center text-xs text-gray-500 dark:text-gray-400">
                                <Clock className="w-3 h-3 mr-1" />
                                <span className="whitespace-nowrap">{formatDate(user.last_login)}</span>
                              </div>
                            )}
                            <button className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 flex-shrink-0">
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4 sm:w-5 sm:h-5" />
                              ) : (
                                <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Detalhes Expandidos */}
                    {isExpanded && userDetails && (
                      <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-200 dark:border-gray-700 space-y-3 sm:space-y-4">
                        {/* Informações Pessoais */}
                        <div>
                          <h4 className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white mb-2">Informações Pessoais</h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 text-xs sm:text-sm">
                            <div>
                              <p className="text-gray-600 dark:text-gray-300">CPF:</p>
                              <p className="text-gray-900 dark:text-white font-medium">{formatCPF(userDetails.cpf)}</p>
                            </div>
                            {userDetails.address && (
                              <div className="sm:col-span-2">
                                <p className="text-gray-600 dark:text-gray-300">Endereço:</p>
                                <p className="text-gray-900 dark:text-white font-medium">{userDetails.address}</p>
                              </div>
                            )}
                            <div>
                              <p className="text-gray-600 dark:text-gray-300">Cadastrado em:</p>
                              <p className="text-gray-900 dark:text-white font-medium">{formatDate(userDetails.created_at)}</p>
                            </div>
                            {userDetails.last_login && (
                              <div>
                                <p className="text-gray-600 dark:text-gray-300">Último login:</p>
                                <p className="text-gray-900 dark:text-white font-medium">{formatDate(userDetails.last_login)}</p>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Estatísticas */}
                        {userDetails.statistics && (
                          <div>
                            <h4 className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white mb-2">Estatísticas</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
                              <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-2.5 sm:p-3 border border-blue-200 dark:border-blue-800">
                                <div className="flex items-center space-x-2">
                                  <Package className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                                  <div className="min-w-0 flex-1">
                                    <p className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-300">Pedidos</p>
                                    <p className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
                                      {userDetails.statistics.totalOrders}
                                    </p>
                                  </div>
                                </div>
                              </div>
                              <div className="bg-green-50 dark:bg-green-900/30 rounded-lg p-2.5 sm:p-3 border border-green-200 dark:border-green-800">
                                <div className="flex items-center space-x-2">
                                  <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                                  <div className="min-w-0 flex-1">
                                    <p className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-300">Total Gasto</p>
                                    <p className="text-sm sm:text-base lg:text-lg font-bold text-gray-900 dark:text-white break-words">
                                      R$ {userDetails.statistics.totalSpent.toFixed(2).replace('.', ',')}
                                    </p>
                                  </div>
                                </div>
                              </div>
                              {userDetails.statistics.lastOrder && (
                                <div className="bg-purple-50 dark:bg-purple-900/30 rounded-lg p-2.5 sm:p-3 sm:col-span-2 lg:col-span-1 border border-purple-200 dark:border-purple-800">
                                  <div className="flex items-center space-x-2">
                                    <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600 dark:text-purple-400 flex-shrink-0" />
                                    <div className="min-w-0 flex-1">
                                      <p className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-300">Último Pedido</p>
                                      <p className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white break-words">
                                        {formatDateOnly(userDetails.statistics.lastOrder.created_at)}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Alterar Cargo */}
                        <div>
                          <h4 className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white mb-2">Alterar Cargo</h4>
                          <div className="flex flex-col sm:flex-row flex-wrap gap-2">
                            {(['user', 'pharmacist', 'admin'] as const).map((role) => (
                              <button
                                key={role}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleUpdateRole(user.id, role)
                                }}
                                disabled={updatingRole === user.id || user.role === role}
                                className={`flex items-center justify-center px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                                  user.role === role
                                    ? 'bg-blue-600 text-white cursor-default'
                                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                                } disabled:opacity-50 disabled:cursor-not-allowed`}
                              >
                                {updatingRole === user.id ? (
                                  <>
                                    <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-b-2 border-current mr-1.5 sm:mr-2"></div>
                                    <span>Atualizando...</span>
                                  </>
                                ) : user.role === role ? (
                                  <>
                                    <Check className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                                    <span>{role === 'admin' ? 'Administrador' : role === 'pharmacist' ? 'Farmacêutico' : 'Usuário'}</span>
                                  </>
                                ) : (
                                  <>
                                    <Edit2 className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                                    <span>{role === 'admin' ? 'Tornar Admin' : role === 'pharmacist' ? 'Tornar Farmacêutico' : 'Tornar Usuário'}</span>
                                  </>
                                )}
                              </button>
                            ))}
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
            <div className="px-3 sm:px-4 py-3 sm:py-4 border-t border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row items-center justify-between gap-3">
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">
                Página {page} de {totalPages}
              </p>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-white rounded-lg hover:bg-gray-50 dark:hover:bg-[#065084] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Anterior
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-white rounded-lg hover:bg-gray-50 dark:hover:bg-[#065084] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Próxima
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

