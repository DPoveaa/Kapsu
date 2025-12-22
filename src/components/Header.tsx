import { Link } from 'react-router-dom'
import { ShoppingCart, User, Menu, LogOut, Shield, MessageCircle, UserCircle } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import { whatsappService } from '../services/whatsapp.service'
import AnimatedLogo from './AnimatedLogo'
import ThemeToggle from './ThemeToggle'
import { env } from '../config/env'

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [interventionCount, setInterventionCount] = useState(0)
  const { getItemCount } = useCart()
  const { user, logout, isAdmin, isPharmacist } = useAuth()
  const itemCount = getItemCount()
  const userMenuRef = useRef<HTMLDivElement>(null)

  // Função para obter a URL da imagem de perfil
  const getProfileImageUrl = (profileImage?: string): string | null => {
    if (!profileImage) return null
    if (profileImage.startsWith('http')) return profileImage
    // Remove /api da URL base para arquivos estáticos
    const baseUrl = env.apiUrl.replace('/api', '')
    return `${baseUrl}${profileImage}`
  }

  // Função para obter as iniciais do nome
  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2)
  }
  
  // Busca contagem de intervenções para admin e farmacêutico
  useEffect(() => {
    if ((isAdmin || isPharmacist) && user) {
      const fetchInterventionCount = async () => {
        try {
          const data = await whatsappService.getInterventionCount()
          if (data.success) {
            setInterventionCount(data.total)
          }
        } catch (error) {
          console.error('Erro ao buscar contagem de intervenções:', error)
        }
      }
      
      fetchInterventionCount()
      // Atualiza a cada 30 segundos
      const interval = setInterval(fetchInterventionCount, 30000)
      return () => clearInterval(interval)
    }
  }, [isAdmin, isPharmacist, user])

  // Fechar menu do usuário ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false)
      }
    }

    if (userMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [userMenuOpen])

  return (
    <header className="bg-white dark:bg-[#065084] border-b border-gray-100 dark:border-[#0F828C] sticky top-0 z-50 backdrop-blur-sm bg-white/95 dark:bg-[#065084]/95">
      {/* Barra superior verde */}
      <div className="h-1" style={{ backgroundColor: '#67C090' }}></div>
      
      <nav className="container mx-auto px-6 md:px-8 lg:px-12">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-3 group">
            <AnimatedLogo 
              className="h-11 w-auto object-contain group-hover:opacity-90 transition-opacity duration-200"
              alt="Kapsu Logo"
            />
            <span className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Kapsu</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            <Link 
              to="/produtos" 
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:text-primary-600 dark:hover:text-[#78B9B5] hover:bg-primary-50 dark:hover:bg-[#0F828C] rounded-lg transition-all duration-200"
            >
              Produtos
            </Link>
            <Link 
              to="/personalizar" 
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:text-primary-600 dark:hover:text-[#78B9B5] hover:bg-primary-50 dark:hover:bg-[#0F828C] rounded-lg transition-all duration-200"
            >
              Personalizar
            </Link>
            <Link 
              to="/sobre" 
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:text-primary-600 dark:hover:text-[#78B9B5] hover:bg-primary-50 dark:hover:bg-[#0F828C] rounded-lg transition-all duration-200"
            >
              Sobre
            </Link>
            <Link 
              to="/contato" 
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:text-primary-600 dark:hover:text-[#78B9B5] hover:bg-primary-50 dark:hover:bg-[#0F828C] rounded-lg transition-all duration-200"
            >
              Contato
            </Link>
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-2">
            <ThemeToggle />
            <Link 
              to="/carrinho" 
              className="relative p-2.5 text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-[#78B9B5] hover:bg-primary-50 dark:hover:bg-[#0F828C] rounded-lg transition-all duration-200"
            >
              <ShoppingCart size={22} />
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5 shadow-md" style={{ backgroundColor: '#67C090' }}>
                  {itemCount > 99 ? '99+' : itemCount}
                </span>
              )}
            </Link>
            {(isAdmin || isPharmacist) && (
              <Link 
                to="/admin/whatsapp/support" 
                className="relative p-2.5 text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-[#78B9B5] hover:bg-primary-50 dark:hover:bg-[#0F828C] rounded-lg transition-all duration-200"
                title="Conversas que precisam de intervenção"
              >
                <MessageCircle size={22} />
                {interventionCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5 shadow-md animate-pulse">
                    {interventionCount > 99 ? '99+' : interventionCount}
                  </span>
                )}
              </Link>
            )}
            {user ? (
              <div className="hidden md:block relative" ref={userMenuRef}>
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-[#0F828C] transition-colors duration-200 group"
                >
                  {getProfileImageUrl(user.profile_image) ? (
                    <img
                      src={getProfileImageUrl(user.profile_image)!}
                      alt={user.name}
                      className="w-8 h-8 rounded-full object-cover border-2 border-white dark:border-[#065084]"
                      onError={(e) => {
                        // Se a imagem falhar ao carregar, mostra a inicial
                        const target = e.target as HTMLImageElement
                        target.style.display = 'none'
                        const parent = target.parentElement
                        if (parent) {
                          const fallback = document.createElement('div')
                          fallback.className = 'w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold text-sm'
                          fallback.style.backgroundColor = '#67C090'
                          fallback.textContent = getInitials(user.name)
                          parent.appendChild(fallback)
                        }
                      }}
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold text-sm" style={{ backgroundColor: '#67C090' }}>
                      {getInitials(user.name)}
                    </div>
                  )}
                  <span className="font-medium text-gray-700 dark:text-gray-200 text-sm max-w-[120px] truncate">{user.name}</span>
                  {isAdmin && <Shield size={14} className="text-yellow-500" />}
                </button>
                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-[#065084] rounded-xl shadow-xl dark:shadow-2xl border border-gray-100 dark:border-[#0F828C] py-2 z-50 overflow-hidden">
                    {isAdmin && (
                      <Link
                        to="/admin"
                        onClick={() => setUserMenuOpen(false)}
                        className="block px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-primary-50 dark:hover:bg-[#0F828C] hover:text-primary-600 dark:hover:text-[#78B9B5] flex items-center space-x-2 transition-colors"
                      >
                        <Shield size={16} />
                        <span>Painel Admin</span>
                      </Link>
                    )}
                    <Link
                      to="/perfil"
                      onClick={() => setUserMenuOpen(false)}
                      className="block px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-primary-50 dark:hover:bg-[#0F828C] hover:text-primary-600 dark:hover:text-[#78B9B5] flex items-center space-x-2 transition-colors"
                    >
                      <UserCircle size={16} />
                      <span>Meu Perfil</span>
                    </Link>
                    <button
                      onClick={() => {
                        logout()
                        setUserMenuOpen(false)
                      }}
                      className="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-600 dark:hover:text-red-400 flex items-center space-x-2 transition-colors"
                    >
                      <LogOut size={16} />
                      <span>Sair</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                to="/login"
                className="hidden md:flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:text-primary-600 dark:hover:text-[#78B9B5] hover:bg-primary-50 dark:hover:bg-[#0F828C] rounded-lg transition-all duration-200"
              >
                <User size={20} />
                <span>Entrar</span>
              </Link>
            )}
            <button
              className="md:hidden p-2.5 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-[#0F828C] rounded-lg transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <Menu size={22} />
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-100 dark:border-[#0F828C] pt-4 pb-4 space-y-1">
            <Link
              to="/produtos"
              className="block px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 hover:text-primary-600 dark:hover:text-[#78B9B5] hover:bg-primary-50 dark:hover:bg-[#0F828C] rounded-lg transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              Produtos
            </Link>
            <Link
              to="/personalizar"
              className="block px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 hover:text-primary-600 dark:hover:text-[#78B9B5] hover:bg-primary-50 dark:hover:bg-[#0F828C] rounded-lg transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              Personalizar
            </Link>
            <Link
              to="/sobre"
              className="block px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 hover:text-primary-600 dark:hover:text-[#78B9B5] hover:bg-primary-50 dark:hover:bg-[#0F828C] rounded-lg transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              Sobre
            </Link>
            <Link
              to="/contato"
              className="block px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 hover:text-primary-600 dark:hover:text-[#78B9B5] hover:bg-primary-50 dark:hover:bg-[#0F828C] rounded-lg transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              Contato
            </Link>
            {user ? (
              <div className="pt-2 border-t border-gray-100 dark:border-[#0F828C] mt-2 space-y-1">
                <div className="flex items-center space-x-2 px-4 py-2.5 mb-2">
                  {getProfileImageUrl(user.profile_image) ? (
                    <img
                      src={getProfileImageUrl(user.profile_image)!}
                      alt={user.name}
                      className="w-8 h-8 rounded-full object-cover border-2 border-white dark:border-[#065084]"
                      onError={(e) => {
                        // Se a imagem falhar ao carregar, mostra a inicial
                        const target = e.target as HTMLImageElement
                        target.style.display = 'none'
                        const parent = target.parentElement
                        if (parent) {
                          const fallback = document.createElement('div')
                          fallback.className = 'w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold text-sm'
                          fallback.style.backgroundColor = '#67C090'
                          fallback.textContent = getInitials(user.name)
                          parent.appendChild(fallback)
                        }
                      }}
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold text-sm" style={{ backgroundColor: '#67C090' }}>
                      {getInitials(user.name)}
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{user.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-300">{user.email}</p>
                  </div>
                  {isAdmin && <Shield size={14} className="text-yellow-500" />}
                </div>
                {(isAdmin || isPharmacist) && (
                  <>
                    <Link
                      to="/admin"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center space-x-2 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 hover:text-primary-600 dark:hover:text-[#78B9B5] hover:bg-primary-50 dark:hover:bg-[#0F828C] rounded-lg transition-colors"
                    >
                      <Shield size={16} />
                      <span>Painel Admin</span>
                    </Link>
                    <Link
                      to="/admin/whatsapp/support"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center space-x-2 px-4 py-2.5 text-sm font-medium text-gray-700 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors relative"
                    >
                      <MessageCircle size={16} />
                      <span>Atendimento</span>
                      {interventionCount > 0 && (
                        <span className="ml-auto bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5">
                          {interventionCount > 99 ? '99+' : interventionCount}
                        </span>
                      )}
                    </Link>
                  </>
                )}
                <Link
                  to="/perfil"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center space-x-2 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 hover:text-primary-600 dark:hover:text-[#78B9B5] hover:bg-primary-50 dark:hover:bg-[#0F828C] rounded-lg transition-colors"
                >
                  <UserCircle size={16} />
                  <span>Meu Perfil</span>
                </Link>
                <button
                  onClick={() => {
                    logout()
                    setMobileMenuOpen(false)
                  }}
                  className="w-full flex items-center space-x-2 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                >
                  <LogOut size={16} />
                  <span>Sair</span>
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="flex items-center space-x-2 px-4 py-2.5 text-sm font-medium text-gray-700 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                <User size={20} />
                <span>Entrar</span>
              </Link>
            )}
          </div>
        )}
      </nav>
    </header>
  )
}

