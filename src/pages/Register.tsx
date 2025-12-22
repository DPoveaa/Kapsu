import { useState } from 'react'
import { useNavigate, Link, useSearchParams } from 'react-router-dom'
import { Mail, Lock, User, Phone, FileText, ArrowLeft, Loader2, XCircle } from 'lucide-react'
import { authService } from '../services/auth.service'
import { cartService } from '../services/cart.service'
import { validateCPF, formatCPF, validatePhone, formatPhone, validateEmail, validatePassword } from '../utils/validators'

export default function Register() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    cpf: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)

  const handleChange = (field: string, value: string) => {
    // Limpa erro do campo quando o usuário começa a digitar
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }

    // Formatação automática em tempo real
    if (field === 'cpf') {
      const formatted = formatCPF(value)
      setFormData(prev => ({ ...prev, cpf: formatted }))
    } else if (field === 'phone') {
      const formatted = formatPhone(value)
      setFormData(prev => ({ ...prev, phone: formatted }))
    } else {
      setFormData(prev => ({ ...prev, [field]: value }))
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    // Nome
    if (!formData.name.trim()) {
      newErrors.name = 'Nome é obrigatório'
    } else if (formData.name.trim().length < 3) {
      newErrors.name = 'Nome deve ter pelo menos 3 caracteres'
    }

    // Email
    if (!formData.email) {
      newErrors.email = 'Email é obrigatório'
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'Email inválido'
    }

    // Senha
    if (!formData.password) {
      newErrors.password = 'Senha é obrigatória'
    } else if (!validatePassword(formData.password)) {
      newErrors.password = 'Senha deve ter pelo menos 6 caracteres'
    }

    // Confirmar senha
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Confirme sua senha'
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'As senhas não coincidem'
    }

    // Telefone
    if (!formData.phone) {
      newErrors.phone = 'Telefone é obrigatório'
    } else if (!validatePhone(formData.phone)) {
      newErrors.phone = 'Telefone inválido. Use o formato: (11) 99999-9999'
    }

    // CPF
    if (!formData.cpf) {
      newErrors.cpf = 'CPF é obrigatório'
    } else if (!validateCPF(formData.cpf)) {
      newErrors.cpf = 'CPF inválido'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})

    if (!validateForm()) {
      return
    }

    setLoading(true)

    try {
      await authService.register({
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        phone: formData.phone.replace(/\D/g, ''),
        cpf: formData.cpf.replace(/\D/g, ''),
      })

      // Verifica se há redirect na URL (vindo do carrinho do WhatsApp)
      const redirect = searchParams.get('redirect')
      // Verifica se há token pendente do WhatsApp
      const hasPendingToken = !!cartService.getPendingToken()
      
      // Redireciona para login após cadastro bem-sucedido
      // Preserva o redirect se veio do carrinho do WhatsApp
      if (redirect) {
        navigate(`/login?registered=true&redirect=${encodeURIComponent(redirect)}`)
      } else if (hasPendingToken) {
        navigate('/login?registered=true&redirect=/carrinho')
      } else {
        navigate('/login?registered=true')
      }
    } catch (error: any) {
      setErrors({ submit: error.message || 'Erro ao criar conta. Tente novamente.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-accent-50 dark:bg-gray-900 py-4 sm:py-6 lg:py-12 px-3 sm:px-4">
      <div className="max-w-md w-full">
        <Link
          to="/"
          className="inline-flex items-center text-xs sm:text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white mb-4 sm:mb-6"
        >
          <ArrowLeft size={16} className="sm:w-5 sm:h-5 mr-1.5 sm:mr-2" />
          Voltar
        </Link>

        <div className="card p-4 sm:p-6 lg:p-8">
          <div className="text-center mb-4 sm:mb-6 lg:mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-1.5 sm:mb-2">Criar Conta</h1>
            <p className="text-xs sm:text-sm lg:text-base text-gray-600 dark:text-gray-300">
              Preencha os dados abaixo para criar sua conta
            </p>
          </div>

          {errors.submit && (
            <div className="mb-3 sm:mb-4 p-2.5 sm:p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-500/50 rounded-lg text-red-700 dark:text-red-300 text-xs sm:text-sm break-words">
              {errors.submit}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
            {/* Nome */}
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2">
                Nome Completo
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="Seu nome completo"
                  className={`w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2.5 sm:py-3 text-sm sm:text-base border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-800 dark:text-white dark:border-gray-700 dark:placeholder-gray-500 ${
                    errors.name ? 'border-red-300 dark:border-red-500' : 'border-gray-300 dark:border-gray-700'
                  }`}
                />
                <User className="absolute left-2.5 sm:left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              {errors.name && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400 flex items-center">
                  <XCircle size={12} className="mr-1 flex-shrink-0" />
                  <span>{errors.name}</span>
                </p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2">
                E-mail
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  placeholder="seu@email.com"
                  className={`w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2.5 sm:py-3 text-sm sm:text-base border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-800 dark:text-white dark:border-gray-700 dark:placeholder-gray-500 ${
                    errors.email ? 'border-red-300 dark:border-red-500' : 'border-gray-300 dark:border-gray-700'
                  }`}
                />
                <Mail className="absolute left-2.5 sm:left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              {errors.email && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400 flex items-center">
                  <XCircle size={12} className="mr-1 flex-shrink-0" />
                  <span>{errors.email}</span>
                </p>
              )}
            </div>

            {/* Telefone */}
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2">
                Telefone Celular
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  placeholder="(11) 99999-9999"
                  maxLength={15}
                  className={`w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2.5 sm:py-3 text-sm sm:text-base border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-800 dark:text-white dark:border-gray-700 dark:placeholder-gray-500 ${
                    errors.phone ? 'border-red-300 dark:border-red-500' : 'border-gray-300 dark:border-gray-700'
                  }`}
                />
                <Phone className="absolute left-2.5 sm:left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              {errors.phone && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400 flex items-center">
                  <XCircle size={12} className="mr-1 flex-shrink-0" />
                  <span>{errors.phone}</span>
                </p>
              )}
            </div>

            {/* CPF */}
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2">
                CPF
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={formData.cpf}
                  onChange={(e) => handleChange('cpf', e.target.value)}
                  placeholder="000.000.000-00"
                  maxLength={14}
                  className={`w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2.5 sm:py-3 text-sm sm:text-base border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-800 dark:text-white dark:border-gray-700 dark:placeholder-gray-500 ${
                    errors.cpf ? 'border-red-300 dark:border-red-500' : 'border-gray-300 dark:border-gray-700'
                  }`}
                />
                <FileText className="absolute left-2.5 sm:left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              {errors.cpf && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400 flex items-center">
                  <XCircle size={12} className="mr-1 flex-shrink-0" />
                  <span>{errors.cpf}</span>
                </p>
              )}
            </div>

            {/* Senha */}
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2">
                Senha
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => handleChange('password', e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className={`w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2.5 sm:py-3 text-sm sm:text-base border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-800 dark:text-white dark:border-gray-700 dark:placeholder-gray-500 ${
                    errors.password ? 'border-red-300 dark:border-red-500' : 'border-gray-300 dark:border-gray-700'
                  }`}
                />
                <Lock className="absolute left-2.5 sm:left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              {errors.password && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400 flex items-center">
                  <XCircle size={12} className="mr-1 flex-shrink-0" />
                  <span>{errors.password}</span>
                </p>
              )}
            </div>

            {/* Confirmar Senha */}
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2">
                Confirmar Senha
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => handleChange('confirmPassword', e.target.value)}
                  placeholder="Digite a senha novamente"
                  className={`w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2.5 sm:py-3 text-sm sm:text-base border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-800 dark:text-white dark:border-gray-700 dark:placeholder-gray-500 ${
                    errors.confirmPassword ? 'border-red-300 dark:border-red-500' : 'border-gray-300 dark:border-gray-700'
                  }`}
                />
                <Lock className="absolute left-2.5 sm:left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              {errors.confirmPassword && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400 flex items-center">
                  <XCircle size={12} className="mr-1 flex-shrink-0" />
                  <span>{errors.confirmPassword}</span>
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary flex items-center justify-center py-2.5 sm:py-3 text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="sm:w-5 sm:h-5 mr-1.5 sm:mr-2 animate-spin" />
                  <span>Criando conta...</span>
                </>
              ) : (
                <>
                  <User size={18} className="sm:w-5 sm:h-5 mr-1.5 sm:mr-2" />
                  <span>Criar Conta</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-4 sm:mt-6 text-center">
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">
              Já tem uma conta?{' '}
              <Link 
                to={searchParams.get('redirect') 
                  ? `/login?redirect=${encodeURIComponent(searchParams.get('redirect')!)}` 
                  : '/login'
                } 
                className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium"
              >
                Faça login
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

