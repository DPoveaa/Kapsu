import { useState, useEffect } from 'react'
import { useNavigate, Link, useSearchParams } from 'react-router-dom'
import { Mail, Lock, LogIn, ArrowLeft, Loader2, CheckCircle, ShoppingCart } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { validateEmail } from '../utils/validators'
import { cartService } from '../services/cart.service'

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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-accent-50 py-12 px-4">
      <div className="max-w-md w-full">
        <Link
          to="/"
          className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft size={20} className="mr-2" />
          Voltar
        </Link>

        <div className="card p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Bem-vindo</h1>
            <p className="text-gray-600">
              Faça login para continuar ou criar uma conta
            </p>
          </div>

          {successMessage && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm flex items-center">
              <CheckCircle size={16} className="mr-2 flex-shrink-0" />
              {successMessage}
            </div>
          )}

          {hasPendingCart && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 text-sm flex items-center">
              <ShoppingCart size={16} className="mr-2 flex-shrink-0" />
              Você tem um carrinho do WhatsApp pendente! Faça login para vincular à sua conta.
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                E-mail
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  required
                />
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Senha
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Sua senha"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  required
                />
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
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

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Não tem uma conta?{' '}
              <Link 
                to={searchParams.get('redirect') 
                  ? `/cadastro?redirect=${encodeURIComponent(searchParams.get('redirect')!)}` 
                  : '/cadastro'
                }
                className="text-primary-600 hover:text-primary-700 font-medium"
              >
                Cadastre-se
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

