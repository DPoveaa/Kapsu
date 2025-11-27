import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Mail, Lock, LogIn, ArrowLeft } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!email || !name) {
      setError('Por favor, preencha todos os campos')
      return
    }

    // Validação básica de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setError('Por favor, insira um email válido')
      return
    }

    // Fazer login
    login(email, name)
    
    // Redirecionar para a página anterior ou home
    const returnTo = new URLSearchParams(window.location.search).get('returnTo') || '/'
    navigate(returnTo)
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
            <div className="w-16 h-16 bg-gradient-to-br from-primary-600 to-medical-600 rounded-lg flex items-center justify-center mx-auto mb-4">
              <span className="text-white font-bold text-2xl">S</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Bem-vindo</h1>
            <p className="text-gray-600">
              Faça login para continuar ou criar uma conta
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Nome Completo
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Seu nome"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              </div>
            </div>

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
                />
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Use o email configurado em VITE_ADMIN_EMAIL para acesso de administrador
              </p>
            </div>

            <button
              type="submit"
              className="w-full btn-primary flex items-center justify-center"
            >
              <LogIn size={20} className="mr-2" />
              Entrar
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Ao entrar, você concorda com nossos{' '}
              <Link to="/termos" className="text-primary-600 hover:text-primary-700">
                Termos de Uso
              </Link>
              {' '}e{' '}
              <Link to="/privacidade" className="text-primary-600 hover:text-primary-700">
                Política de Privacidade
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

