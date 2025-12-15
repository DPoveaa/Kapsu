import { useState, useEffect } from 'react'
import { useNavigate, Link, useSearchParams } from 'react-router-dom'
import { Mail, Lock, LogIn, Loader2, CheckCircle, ShoppingCart, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { validateEmail } from '../utils/validators'
import { cartService } from '../services/cart.service'
import AnimatedLogo from '../components/AnimatedLogo'
import gangplankImage from '../images/Gangplank_23.jpg'

export default function Login() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [hasPendingCart, setHasPendingCart] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  // Verifica mensagens e tokens pendentes
  useEffect(() => {
    // Verifica se veio do cadastro
    if (searchParams.get('registered') === 'true') {
      setSuccessMessage('Conta criada com sucesso! Faça login para continuar.')
    }
    
    // Verifica se tem carrinho pendente do WhatsApp
    const pendingToken = cartService.getPendingToken()
    if (pendingToken) {
      setHasPendingCart(true)
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (!email || !password) {
      setError('Por favor, preencha todos os campos')
      setLoading(false)
      return
    }

    if (!validateEmail(email)) {
      setError('Por favor, insira um email válido')
      setLoading(false)
      return
    }

    try {
      await login(email, password)
      
      // Prioridade de redirect: redirect > returnTo > /
      const redirect = searchParams.get('redirect')
      const returnTo = searchParams.get('returnTo')
      const pendingToken = cartService.getPendingToken()
      
      // Se tem carrinho pendente do WhatsApp, vai para o carrinho
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
      setError(err.message || 'Erro ao fazer login. Verifique suas credenciais.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Lado Esquerdo - Formulário de Login */}
      <div className="w-full lg:w-1/2 bg-white dark:bg-gray-900 flex items-center justify-center p-8 lg:p-12">
        <div className="w-full max-w-md">
          {/* Ilustração/Logo acima do título */}
          <div className="mb-8 flex justify-center">
            <div className="w-32 h-32 flex items-center justify-center">
              <AnimatedLogo 
                className="w-full h-full object-contain"
                alt="Kapsu Logo"
              />
            </div>
          </div>

          <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-8 text-center">
            Bem-vindo a Kapsu
          </h1>

          {successMessage && (
            <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-500/50 rounded-lg text-green-700 dark:text-green-300 text-sm flex items-center">
              <CheckCircle size={16} className="mr-2 flex-shrink-0" />
              {successMessage}
            </div>
          )}

          {hasPendingCart && (
            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-500/50 rounded-lg text-blue-700 dark:text-blue-300 text-sm flex items-center">
              <ShoppingCart size={16} className="mr-2 flex-shrink-0" />
              Você tem um carrinho do WhatsApp pendente! Faça login para vincular à sua conta.
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-500/50 rounded-lg text-red-700 dark:text-red-300 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                E-mail
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="w-full pl-10 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-[#67C090] focus:border-[#67C090] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-all"
                  required
                />
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500" size={20} />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Senha
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Sua senha"
                  className="w-full pl-10 pr-12 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-[#67C090] focus:border-[#67C090] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-all"
                  required
                />
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500" size={20} />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <Link
                to={searchParams.get('redirect') 
                  ? `/cadastro?redirect=${encodeURIComponent(searchParams.get('redirect')!)}` 
                  : '/cadastro'
                }
                className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                Não tem uma conta? <span className="text-[#67C090] font-medium">Cadastre-se</span>
              </Link>
              <Link
                to="/recuperar-senha"
                className="text-sm text-[#67C090] hover:text-[#78B9B5] transition-colors"
              >
                Esqueceu sua senha?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#67C090] hover:bg-[#78B9B5] text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#67C090]/20 hover:shadow-[#67C090]/30"
            >
              {loading ? (
                <>
                  <Loader2 size={20} className="mr-2 animate-spin" />
                  Entrando...
                </>
              ) : (
                <>
                  <LogIn size={20} className="mr-2" />
                  Entrar
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Lado Direito - Imagem */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <img
          src={gangplankImage}
          alt="Background"
          className="w-full h-full object-cover"
        />
        {/* Overlay escuro para melhorar legibilidade (opcional) */}
        <div className="absolute inset-0 bg-black/20"></div>
      </div>
    </div>
  )
}

