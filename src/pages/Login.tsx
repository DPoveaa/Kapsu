import { useState, useEffect } from 'react'
import { useNavigate, useLocation, Link, useSearchParams } from 'react-router-dom'
import { Mail, Lock, User, Phone, FileText, Loader2, CheckCircle, ShoppingCart, Eye, EyeOff, XCircle } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { authService } from '../services/auth.service'
import { cartService } from '../services/cart.service'
import { validateCPF, formatCPF, validatePhone, formatPhone, validateEmail, validatePassword } from '../utils/validators'
import AnimatedLogo from '../components/AnimatedLogo'
import loginBannerImage from '../images/Kapsu_login_banner.png'

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const { login } = useAuth()

  // Determina se o modo inicial é cadastro baseado na URL (/cadastro)
  const isRegisterInitial = location.pathname === '/cadastro'
  const [isLogin, setIsLogin] = useState(!isRegisterInitial)

  // Estados dos Formulários
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')

  const [registerData, setRegisterData] = useState({
    name: '',
    email: '',
    phone: '',
    cpf: '',
    password: '',
    confirmPassword: '',
  })

  // Mensagens de erro e carregamento
  const [generalError, setGeneralError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [hasPendingCart, setHasPendingCart] = useState(false)

  // Controles de visibilidade de senha
  const [showLoginPassword, setShowLoginPassword] = useState(false)
  const [showRegisterPassword, setShowRegisterPassword] = useState(false)
  const [showRegisterConfirmPassword, setShowRegisterConfirmPassword] = useState(false)

  // Sincroniza o modo visual caso o usuário navegue usando o histórico do navegador (botão voltar/avançar)
  useEffect(() => {
    const isRegisterRoute = location.pathname === '/cadastro'
    setIsLogin(!isRegisterRoute)
    setGeneralError('')
    setFieldErrors({})
  }, [location.pathname])

  // Verifica se veio do cadastro externo (com query params) ou se tem carrinho pendente
  useEffect(() => {
    if (searchParams.get('registered') === 'true') {
      setSuccessMessage('Conta criada com sucesso! Faça login para continuar.')
    }
    
    // Verifica se tem carrinho pendente do WhatsApp
    const pendingToken = cartService.getPendingToken()
    if (pendingToken) {
      setHasPendingCart(true)
    }
  }, [searchParams])

  // Alterna dinamicamente entre login e cadastro, atualizando a URL sem recarregar a página
  const handleToggleMode = (toLogin: boolean) => {
    setIsLogin(toLogin)
    setGeneralError('')
    setFieldErrors({})
    setSuccessMessage('')
    
    const redirect = searchParams.get('redirect')
    const redirectQuery = redirect ? `?redirect=${encodeURIComponent(redirect)}` : ''
    
    if (toLogin) {
      navigate(`/login${redirectQuery}`, { replace: true })
    } else {
      navigate(`/cadastro${redirectQuery}`, { replace: true })
    }
  }

  // Manipulador de alterações no formulário de cadastro
  const handleRegisterChange = (field: string, value: string) => {
    if (fieldErrors[field]) {
      setFieldErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }

    if (field === 'cpf') {
      setRegisterData(prev => ({ ...prev, cpf: formatCPF(value) }))
    } else if (field === 'phone') {
      setRegisterData(prev => ({ ...prev, phone: formatPhone(value) }))
    } else {
      setRegisterData(prev => ({ ...prev, [field]: value }))
    }
  }

  // Validação do Formulário de Cadastro
  const validateRegisterForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!registerData.name.trim()) {
      newErrors.name = 'Nome é obrigatório'
    } else if (registerData.name.trim().length < 3) {
      newErrors.name = 'Nome deve ter pelo menos 3 caracteres'
    }

    if (!registerData.email) {
      newErrors.email = 'E-mail é obrigatório'
    } else if (!validateEmail(registerData.email)) {
      newErrors.email = 'E-mail inválido'
    }

    if (!registerData.phone) {
      newErrors.phone = 'Telefone é obrigatório'
    } else if (!validatePhone(registerData.phone)) {
      newErrors.phone = 'Telefone inválido. Formato: (11) 99999-9999'
    }

    if (!registerData.cpf) {
      newErrors.cpf = 'CPF é obrigatório'
    } else if (!validateCPF(registerData.cpf)) {
      newErrors.cpf = 'CPF inválido'
    }

    if (!registerData.password) {
      newErrors.password = 'Senha é obrigatória'
    } else if (!validatePassword(registerData.password)) {
      newErrors.password = 'A senha deve ter pelo menos 6 caracteres'
    }

    if (!registerData.confirmPassword) {
      newErrors.confirmPassword = 'Confirme sua senha'
    } else if (registerData.password !== registerData.confirmPassword) {
      newErrors.confirmPassword = 'As senhas não coincidem'
    }

    setFieldErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Submissão do Login
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setGeneralError('')
    setLoading(true)

    if (!loginEmail || !loginPassword) {
      setGeneralError('Por favor, preencha todos os campos')
      setLoading(false)
      return
    }

    if (!validateEmail(loginEmail)) {
      setGeneralError('Por favor, insira um e-mail válido')
      setLoading(false)
      return
    }

    try {
      await login(loginEmail, loginPassword)
      
      const redirect = searchParams.get('redirect')
      const returnTo = searchParams.get('returnTo')
      const pendingToken = cartService.getPendingToken()
      
      if (pendingToken) {
        navigate('/carrinho')
      } else if (redirect) {
        navigate(redirect)
      } else if (returnTo) {
        navigate(returnTo)
      } else {
        navigate('/')
      }
    } catch (err: any) {
      setGeneralError(err.message || 'Erro ao fazer login. Verifique suas credenciais.')
    } finally {
      setLoading(false)
    }
  }

  // Submissão do Cadastro
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setGeneralError('')
    setFieldErrors({})

    if (!validateRegisterForm()) {
      return
    }

    setLoading(true)

    try {
      await authService.register({
        name: registerData.name.trim(),
        email: registerData.email.trim().toLowerCase(),
        password: registerData.password,
        phone: `55${registerData.phone.replace(/\D/g, '')}`,
        cpf: registerData.cpf.replace(/\D/g, ''),
      })

      // Sucesso no cadastro: limpa os campos de senha e exibe mensagem
      setRegisterData({
        name: '',
        email: '',
        phone: '',
        cpf: '',
        password: '',
        confirmPassword: '',
      })
      setSuccessMessage('Conta criada com sucesso! Faça login para continuar.')
      handleToggleMode(true) // Volta para a tela de login
    } catch (err: any) {
      setGeneralError(err.message || 'Erro ao criar conta. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex relative overflow-hidden bg-white dark:bg-gray-900">
      
      {/* Lado Esquerdo - Formulário de Login / Cadastro */}
      <div className="w-full lg:w-[42%] xl:w-[38%] flex items-center justify-center p-6 sm:p-10 lg:p-12 xl:p-16 relative z-10 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md">
        
        {/* Glows decorativos de fundo */}
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-[#67C090]/10 rounded-full blur-[100px] -translate-x-1/2 translate-y-1/2 pointer-events-none z-0" />
        <div className="absolute top-0 left-0 w-80 h-80 bg-[#26667F]/5 rounded-full blur-[100px] -translate-x-1/4 -translate-y-1/4 pointer-events-none z-0" />

        {/* Círculos concêntricos decorativos */}
        <div className="absolute top-0 left-0 w-[400px] h-[400px] pointer-events-none opacity-20 dark:opacity-10 -translate-x-1/4 -translate-y-1/4 z-0">
          <svg viewBox="0 0 100 100" className="w-full h-full text-[#67C090]">
            <circle cx="20" cy="20" r="80" fill="none" stroke="currentColor" strokeWidth="0.25" />
            <circle cx="20" cy="20" r="68" fill="none" stroke="currentColor" strokeWidth="0.25" />
            <circle cx="20" cy="20" r="56" fill="none" stroke="currentColor" strokeWidth="0.25" />
            <circle cx="20" cy="20" r="44" fill="none" stroke="currentColor" strokeWidth="0.25" />
            <circle cx="20" cy="20" r="32" fill="none" stroke="currentColor" strokeWidth="0.25" />
          </svg>
        </div>

        <div className="w-full max-w-md relative z-10">
          
          {/* Logo animada do Panda acima do título */}
          <div className="mb-6 flex justify-center">
            <div className="w-24 h-24 sm:w-28 sm:h-28 flex items-center justify-center">
              <AnimatedLogo 
                className="w-full h-full object-contain"
                alt="Kapsu Logo"
              />
            </div>
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-6 text-center tracking-tight">
            {isLogin ? (
              <>
                Bem-vindo a <span className="text-[#67C090]">Kapsu</span>
              </>
            ) : (
              <>
                Criar <span className="text-[#67C090]">Conta</span>
              </>
            )}
          </h1>

          {/* Banner de Sucesso */}
          {successMessage && (
            <div className="mb-5 p-3 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-500/50 rounded-xl text-green-700 dark:text-green-300 text-sm flex items-center shadow-sm">
              <CheckCircle size={16} className="mr-2 flex-shrink-0 text-[#67C090]" />
              <span className="break-words">{successMessage}</span>
            </div>
          )}

          {/* Banner de Carrinho Pendente */}
          {hasPendingCart && isLogin && (
            <div className="mb-5 p-3 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-500/50 rounded-xl text-blue-700 dark:text-blue-300 text-sm flex items-center shadow-sm">
              <ShoppingCart size={16} className="mr-2 flex-shrink-0 text-[#26667F]" />
              <span className="break-words">Você tem um carrinho do WhatsApp pendente! Faça login para vincular à sua conta.</span>
            </div>
          )}

          {/* Banner de Erro Geral */}
          {generalError && (
            <div className="mb-5 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-500/50 rounded-xl text-red-700 dark:text-red-300 text-sm flex items-center shadow-sm">
              <XCircle size={16} className="mr-2 flex-shrink-0 text-red-500" />
              <span className="break-words">{generalError}</span>
            </div>
          )}

          {isLogin ? (
            /* --- FORMULÁRIO DE LOGIN --- */
            <form onSubmit={handleLoginSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  E-mail
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="seu@email.com"
                    className="w-full pl-10 pr-4 py-3 bg-[#eef2f6] dark:bg-gray-800 border-none rounded-xl focus:ring-2 focus:ring-[#67C090] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-all font-sans outline-none"
                    required
                  />
                  <Mail className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Senha
                </label>
                <div className="relative">
                  <input
                    type={showLoginPassword ? 'text' : 'password'}
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Sua senha"
                    className="w-full pl-10 pr-12 py-3 bg-[#eef2f6] dark:bg-gray-800 border-none rounded-xl focus:ring-2 focus:ring-[#67C090] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-all font-sans outline-none"
                    required
                  />
                  <Lock className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5" />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-1"
                  >
                    {showLoginPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs sm:text-sm mt-2">
                <button
                  type="button"
                  onClick={() => handleToggleMode(false)}
                  className="text-gray-600 dark:text-gray-400 hover:text-[#67C090] dark:hover:text-[#67C090] transition-colors text-left"
                >
                  Não tem uma conta? <span className="text-[#67C090] font-semibold hover:underline">Cadastre-se</span>
                </button>
                <Link
                  to="/recuperar-senha"
                  className="text-[#67C090] font-semibold hover:underline transition-colors whitespace-nowrap"
                >
                  Esqueceu sua senha?
                </Link>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#67C090] hover:bg-[#56b180] text-white font-bold py-3.5 px-6 rounded-xl transition-all duration-200 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#67C090]/25 hover:shadow-[#67C090]/35 text-base tracking-wide"
              >
                {loading ? (
                  <>
                    <Loader2 size={20} className="mr-2 animate-spin" />
                    <span>Entrando...</span>
                  </>
                ) : (
                  <span>&rarr; Entrar</span>
                )}
              </button>
            </form>
          ) : (
            /* --- FORMULÁRIO DE CADASTRO --- */
            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              {/* Nome Completo */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Nome Completo
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={registerData.name}
                    onChange={(e) => handleRegisterChange('name', e.target.value)}
                    placeholder="Seu nome completo"
                    className={`w-full pl-10 pr-4 py-3 bg-[#eef2f6] dark:bg-gray-800 border-none rounded-xl focus:ring-2 focus:ring-[#67C090] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-all font-sans outline-none ${
                      fieldErrors.name ? 'ring-2 ring-red-500' : ''
                    }`}
                    required
                  />
                  <User className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5" />
                </div>
                {fieldErrors.name && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400 flex items-center">
                    <XCircle size={12} className="mr-1 flex-shrink-0" />
                    <span>{fieldErrors.name}</span>
                  </p>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  E-mail
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={registerData.email}
                    onChange={(e) => handleRegisterChange('email', e.target.value)}
                    placeholder="seu@email.com"
                    className={`w-full pl-10 pr-4 py-3 bg-[#eef2f6] dark:bg-gray-800 border-none rounded-xl focus:ring-2 focus:ring-[#67C090] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-all font-sans outline-none ${
                      fieldErrors.email ? 'ring-2 ring-red-500' : ''
                    }`}
                    required
                  />
                  <Mail className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5" />
                </div>
                {fieldErrors.email && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400 flex items-center">
                    <XCircle size={12} className="mr-1 flex-shrink-0" />
                    <span>{fieldErrors.email}</span>
                  </p>
                )}
              </div>

              {/* Telefone e CPF em Grid no Desktop */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Telefone */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                    Telefone Celular
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={registerData.phone}
                      onChange={(e) => handleRegisterChange('phone', e.target.value)}
                      placeholder="(11) 99999-9999"
                      maxLength={15}
                      className={`w-full pl-10 pr-4 py-3 bg-[#eef2f6] dark:bg-gray-800 border-none rounded-xl focus:ring-2 focus:ring-[#67C090] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-all font-sans outline-none ${
                        fieldErrors.phone ? 'ring-2 ring-red-500' : ''
                      }`}
                      required
                    />
                    <Phone className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5" />
                  </div>
                  {fieldErrors.phone && (
                    <p className="mt-1 text-xs text-red-600 dark:text-red-400 flex items-center">
                      <XCircle size={12} className="mr-1 flex-shrink-0" />
                      <span>{fieldErrors.phone}</span>
                    </p>
                  )}
                </div>

                {/* CPF */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                    CPF
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={registerData.cpf}
                      onChange={(e) => handleRegisterChange('cpf', e.target.value)}
                      placeholder="000.000.000-00"
                      maxLength={14}
                      className={`w-full pl-10 pr-4 py-3 bg-[#eef2f6] dark:bg-gray-800 border-none rounded-xl focus:ring-2 focus:ring-[#67C090] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-all font-sans outline-none ${
                        fieldErrors.cpf ? 'ring-2 ring-red-500' : ''
                      }`}
                      required
                    />
                    <FileText className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5" />
                  </div>
                  {fieldErrors.cpf && (
                    <p className="mt-1 text-xs text-red-600 dark:text-red-400 flex items-center">
                      <XCircle size={12} className="mr-1 flex-shrink-0" />
                      <span>{fieldErrors.cpf}</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Senha */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Senha
                </label>
                <div className="relative">
                  <input
                    type={showRegisterPassword ? 'text' : 'password'}
                    value={registerData.password}
                    onChange={(e) => handleRegisterChange('password', e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className={`w-full pl-10 pr-12 py-3 bg-[#eef2f6] dark:bg-gray-800 border-none rounded-xl focus:ring-2 focus:ring-[#67C090] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-all font-sans outline-none ${
                      fieldErrors.password ? 'ring-2 ring-red-500' : ''
                    }`}
                    required
                  />
                  <Lock className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5" />
                  <button
                    type="button"
                    onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-1"
                  >
                    {showRegisterPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {fieldErrors.password && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400 flex items-center">
                    <XCircle size={12} className="mr-1 flex-shrink-0" />
                    <span>{fieldErrors.password}</span>
                  </p>
                )}
              </div>

              {/* Confirmar Senha */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Confirmar Senha
                </label>
                <div className="relative">
                  <input
                    type={showRegisterConfirmPassword ? 'text' : 'password'}
                    value={registerData.confirmPassword}
                    onChange={(e) => handleRegisterChange('confirmPassword', e.target.value)}
                    placeholder="Digite a senha novamente"
                    className={`w-full pl-10 pr-12 py-3 bg-[#eef2f6] dark:bg-gray-800 border-none rounded-xl focus:ring-2 focus:ring-[#67C090] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-all font-sans outline-none ${
                      fieldErrors.confirmPassword ? 'ring-2 ring-red-500' : ''
                    }`}
                    required
                  />
                  <Lock className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5" />
                  <button
                    type="button"
                    onClick={() => setShowRegisterConfirmPassword(!showRegisterConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-1"
                  >
                    {showRegisterConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {fieldErrors.confirmPassword && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400 flex items-center">
                    <XCircle size={12} className="mr-1 flex-shrink-0" />
                    <span>{fieldErrors.confirmPassword}</span>
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between text-xs sm:text-sm mt-2">
                <button
                  type="button"
                  onClick={() => handleToggleMode(true)}
                  className="text-gray-600 dark:text-gray-400 hover:text-[#67C090] dark:hover:text-[#67C090] transition-colors"
                >
                  Já tem uma conta? <span className="text-[#67C090] font-semibold hover:underline">Faça login</span>
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#67C090] hover:bg-[#56b180] text-white font-bold py-3.5 px-6 rounded-xl transition-all duration-200 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#67C090]/25 hover:shadow-[#67C090]/35 text-base tracking-wide"
              >
                {loading ? (
                  <>
                    <Loader2 size={20} className="mr-2 animate-spin" />
                    <span>Criando conta...</span>
                  </>
                ) : (
                  <span>&rarr; Criar Conta</span>
                )}
              </button>
            </form>
          )}

        </div>
      </div>

      {/* Lado Direito - Imagem de Destaque (Fórmula/Suplementação Kapsu) */}
      <div className="hidden lg:flex lg:w-[58%] xl:w-[62%] relative overflow-hidden bg-[#02130b]">
        <img
          src={loginBannerImage}
          alt="Kapsu Suplementação de Alta Qualidade"
          className="w-full h-full object-cover object-center"
        />
        {/* Overlay escuro opcional para manter integridade com temas escuros */}
        <div className="absolute inset-0 bg-black/10 dark:bg-black/25 pointer-events-none" />
      </div>

    </div>
  )
}
