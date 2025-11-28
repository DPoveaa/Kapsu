import { Link } from 'react-router-dom'
import { ShoppingCart, User, Menu, LogOut, Shield, MessageCircle } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import { whatsappService } from '../services/whatsapp.service'

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [interventionCount, setInterventionCount] = useState(0)
  const { getItemCount } = useCart()
  const { user, logout, isAdmin, isPharmacist } = useAuth()
  const itemCount = getItemCount()
  const userMenuRef = useRef<HTMLDivElement>(null)
  
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
    <header className="bg-white shadow-md sticky top-0 z-50">
      <nav className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-600 to-medical-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">S</span>
            </div>
            <span className="text-2xl font-bold text-gray-900">Sanare</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <Link to="/produtos" className="text-gray-700 hover:text-primary-600 font-medium transition-colors">
              Produtos
            </Link>
            <Link to="/personalizar" className="text-gray-700 hover:text-primary-600 font-medium transition-colors">
              Personalizar
            </Link>
            <Link to="/sobre" className="text-gray-700 hover:text-primary-600 font-medium transition-colors">
              Sobre
            </Link>
            <Link to="/contato" className="text-gray-700 hover:text-primary-600 font-medium transition-colors">
              Contato
            </Link>
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-4">
            <Link to="/carrinho" className="relative p-2 text-gray-700 hover:text-primary-600 transition-colors">
              <ShoppingCart size={24} />
              {itemCount > 0 && (
                <span className="absolute top-0 right-0 bg-primary-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {itemCount}
                </span>
              )}
            </Link>
            {(isAdmin || isPharmacist) && (
              <Link 
                to="/admin/whatsapp/support" 
                className="relative p-2 text-gray-700 hover:text-primary-600 transition-colors"
                title="Conversas que precisam de intervenção"
              >
                <MessageCircle size={24} />
                {interventionCount > 0 && (
                  <span className="absolute top-0 right-0 bg-red-600 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5 animate-pulse">
                    {interventionCount > 99 ? '99+' : interventionCount}
                  </span>
                )}
              </Link>
            )}
            {user ? (
              <div className="hidden md:block relative" ref={userMenuRef}>
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center space-x-2 text-gray-700 hover:text-primary-600 transition-colors"
                >
                  <User size={24} />
                  <span className="font-medium">{user.name}</span>
                  {isAdmin && <Shield size={16} className="text-yellow-600" />}
                </button>
                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                    <div className="px-4 py-2 border-b border-gray-200">
                      <p className="text-sm font-semibold">{user.name}</p>
                      <p className="text-xs text-gray-600">{user.email}</p>
                      {isAdmin && (
                        <span className="inline-block mt-1 text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                          Administrador
                        </span>
                      )}
                    </div>
                    {isAdmin && (
                      <Link
                        to="/admin"
                        onClick={() => setUserMenuOpen(false)}
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                      >
                        <Shield size={16} />
                        <span>Painel Admin</span>
                      </Link>
                    )}
                    <button
                      onClick={() => {
                        logout()
                        setUserMenuOpen(false)
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
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
                className="hidden md:flex items-center space-x-2 text-gray-700 hover:text-primary-600 transition-colors"
              >
                <User size={24} />
                <span className="font-medium">Entrar</span>
              </Link>
            )}
            <button
              className="md:hidden p-2 text-gray-700"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <Menu size={24} />
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-4 pb-4 border-t pt-4">
            <Link
              to="/produtos"
              className="block py-2 text-gray-700 hover:text-primary-600"
              onClick={() => setMobileMenuOpen(false)}
            >
              Produtos
            </Link>
            <Link
              to="/personalizar"
              className="block py-2 text-gray-700 hover:text-primary-600"
              onClick={() => setMobileMenuOpen(false)}
            >
              Personalizar
            </Link>
            <Link
              to="/sobre"
              className="block py-2 text-gray-700 hover:text-primary-600"
              onClick={() => setMobileMenuOpen(false)}
            >
              Sobre
            </Link>
            <Link
              to="/contato"
              className="block py-2 text-gray-700 hover:text-primary-600"
              onClick={() => setMobileMenuOpen(false)}
            >
              Contato
            </Link>
            {user ? (
              <div className="py-2">
                <div className="flex items-center space-x-2 mb-2">
                  <User size={20} />
                  <span>{user.name}</span>
                  {isAdmin && <Shield size={14} className="text-yellow-600" />}
                </div>
                {(isAdmin || isPharmacist) && (
                  <>
                    <Link
                      to="/admin"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center space-x-2 py-2 text-gray-700 hover:text-primary-600"
                    >
                      <Shield size={16} />
                      <span>Painel Admin</span>
                    </Link>
                    <Link
                      to="/admin/whatsapp/support"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center space-x-2 py-2 text-gray-700 hover:text-primary-600 relative"
                    >
                      <MessageCircle size={16} />
                      <span>Atendimento</span>
                      {interventionCount > 0 && (
                        <span className="ml-auto bg-red-600 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5">
                          {interventionCount > 99 ? '99+' : interventionCount}
                        </span>
                      )}
                    </Link>
                  </>
                )}
                <button
                  onClick={() => {
                    logout()
                    setMobileMenuOpen(false)
                  }}
                  className="flex items-center space-x-2 text-gray-700 hover:text-primary-600"
                >
                  <LogOut size={16} />
                  <span>Sair</span>
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="flex items-center space-x-2 py-2 text-gray-700 hover:text-primary-600"
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

