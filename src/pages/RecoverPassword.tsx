import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Mail, Lock, Loader2, CheckCircle, XCircle, ArrowLeft, Eye, EyeOff } from 'lucide-react'
import { authService } from '../services/auth.service'
import AnimatedLogo from '../components/AnimatedLogo'
import loginBannerPortrait from '../images/optimized/3x4.jpg'
import loginBannerLandscape from '../images/optimized/4x3.jpg'

export default function RecoverPassword() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')

  // Solicitação de Recuperação (State A)
  const [identifier, setIdentifier] = useState('')
  
  // Redefinição de Senha (State B)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [tokenStatus, setTokenStatus] = useState<'idle' | 'checking' | 'valid' | 'invalid'>(token ? 'checking' : 'idle')
  const [tokenMessage, setTokenMessage] = useState('')

  // Status
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    const hidePasswords = () => {
      setShowPassword(false)
      setShowConfirmPassword(false)
    }

    const handleVisibilityChange = () => {
      if (document.hidden) hidePasswords()
    }

    window.addEventListener('blur', hidePasswords)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.removeEventListener('blur', hidePasswords)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    const validateToken = async () => {
      if (!token) {
        setTokenStatus('idle')
        setTokenMessage('')
        return
      }

      setTokenStatus('checking')
      setTokenMessage('')
      setError('')

      try {
        const response = await authService.validateResetToken(token)
        if (cancelled) return
        setTokenStatus('valid')
        setTokenMessage(response.message || '')
      } catch (err: any) {
        if (cancelled) return
        setTokenStatus('invalid')
        setTokenMessage(err.message || 'Este link de redefinição expirou ou já foi utilizado.')
      }
    }

    validateToken()

    return () => {
      cancelled = true
    }
  }, [token])

  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!identifier.trim()) {
      setError('Insira seu e-mail ou CPF')
      return
    }

    setLoading(true)
    try {
      const response = await authService.forgotPassword(identifier)
      if (response.success) {
        setSuccess(response.message || 'Instruções enviadas para o seu e-mail.')
        setIdentifier('')
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao solicitar. Verifique os dados.')
    } finally {
      setLoading(false)
    }
  }

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!newPassword || !confirmPassword) {
      setError('Preencha todos os campos')
      return
    }

    if (newPassword.length < 6) {
      setError('A nova senha deve ter no mínimo 6 caracteres')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('As senhas não coincidem')
      return
    }

    setLoading(true)
    try {
      const response = await authService.resetPassword(token!, newPassword)
      if (response.success) {
        setSuccess('Senha redefinida! Redirecionando para o login...')
        setShowPassword(false)
        setShowConfirmPassword(false)
        setTimeout(() => {
          navigate('/login')
        }, 3000)
      }
    } catch (err: any) {
      setError(err.message || 'Link inválido ou expirado.')
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordGroupBlur = (event: React.FocusEvent<HTMLDivElement>, hidePassword: () => void) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      hidePassword()
    }
  }

  return (
    <div className="min-h-screen flex relative overflow-hidden bg-white dark:bg-gray-900">
      
      {/* Lado Esquerdo - Formulário */}
      <div className="w-full lg:w-[42%] xl:w-[38%] flex items-center justify-center p-6 sm:p-10 lg:p-12 xl:p-16 relative z-10 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md">
        
        {/* Glows decorativos de fundo */}
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-[#00A86B]/10 rounded-full blur-[100px] -translate-x-1/2 translate-y-1/2 pointer-events-none z-0" />
        <div className="absolute top-0 left-0 w-80 h-80 bg-[#2563EB]/5 rounded-full blur-[100px] -translate-x-1/4 -translate-y-1/4 pointer-events-none z-0" />

        {/* Círculos concêntricos decorativos */}
        <div className="absolute top-0 left-0 w-[400px] h-[400px] pointer-events-none opacity-20 dark:opacity-10 -translate-x-1/4 -translate-y-1/4 z-0">
          <svg viewBox="0 0 100 100" className="w-full h-full text-[#00A86B]">
            <circle cx="20" cy="20" r="80" fill="none" stroke="currentColor" strokeWidth="0.25" />
            <circle cx="20" cy="20" r="68" fill="none" stroke="currentColor" strokeWidth="0.25" />
            <circle cx="20" cy="20" r="56" fill="none" stroke="currentColor" strokeWidth="0.25" />
            <circle cx="20" cy="20" r="44" fill="none" stroke="currentColor" strokeWidth="0.25" />
            <circle cx="20" cy="20" r="32" fill="none" stroke="currentColor" strokeWidth="0.25" />
          </svg>
        </div>

        <div className="w-full max-w-md relative z-10 animate-in fade-in slide-in-from-bottom-2 duration-300">
          
          {/* Logo animada */}
          <div className="mb-6 flex justify-center">
            <div className="w-24 h-24 sm:w-28 sm:h-28 flex items-center justify-center">
              <AnimatedLogo
                className="w-full h-full object-contain"
                alt="Kapsu Logo"
                forceSleeping={showPassword || showConfirmPassword}
              />
            </div>
          </div>

          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 text-center tracking-tight">
            {token ? (
              <>Nova <span className="text-[#00A86B]">Senha</span></>
            ) : (
              <>Esqueceu a <span className="text-[#00A86B]">Senha?</span></>
            )}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm text-center mb-6">
            {token 
              ? 'Defina e confirme sua nova senha abaixo.' 
              : 'Informe seu e-mail ou CPF para receber o link de redefinição.'}
          </p>

          {token && tokenStatus === 'checking' && (
            <div className="mb-5 p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl text-blue-700 dark:text-blue-300 text-sm flex items-start shadow-sm">
              <Loader2 size={18} className="mr-2.5 mt-0.5 flex-shrink-0 animate-spin" />
              <span className="break-words font-medium">Validando seu link de redefinição...</span>
            </div>
          )}

          {token && tokenStatus === 'invalid' && (
            <div className="mb-5 space-y-4">
              <div className="p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-400 text-sm flex items-start shadow-sm">
                <XCircle size={18} className="mr-2.5 mt-0.5 flex-shrink-0 text-red-500" />
                <div>
                  <p className="font-semibold">Link expirado ou inválido</p>
                  <p className="mt-1 text-red-600 dark:text-red-300">{tokenMessage || 'Este link não pode mais ser usado para alterar sua senha.'}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => navigate('/recuperar-senha', { replace: true })}
                className="w-full bg-[#00A86B] hover:bg-[#008A57] text-white font-bold py-3.5 px-6 rounded-xl transition-all duration-200 flex items-center justify-center shadow-lg shadow-[#00A86B]/25 hover:shadow-[#00A86B]/35 text-base tracking-wide"
              >
                Solicitar novo link
              </button>
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="w-full flex items-center justify-center gap-2 py-3 text-gray-600 dark:text-gray-400 hover:text-[#00A86B] dark:hover:text-[#00A86B] font-semibold transition-colors text-sm"
              >
                <ArrowLeft size={16} />
                Voltar para o Login
              </button>
            </div>
          )}

          {/* Banner de Sucesso */}
          {success && (
            <div className="mb-5 p-4 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-xl text-green-700 dark:text-green-300 text-sm flex items-start shadow-sm">
              <CheckCircle size={18} className="mr-2.5 mt-0.5 flex-shrink-0 text-[#00A86B]" />
              <span className="break-words font-medium">{success}</span>
            </div>
          )}

          {/* Banner de Erro */}
          {error && (
            <div className="mb-5 p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-400 text-sm flex items-start shadow-sm">
              <XCircle size={18} className="mr-2.5 mt-0.5 flex-shrink-0 text-red-500" />
              <span className="break-words font-medium">{error}</span>
            </div>
          )}

          {!token ? (
            /* --- FORMULÁRIO DE SOLICITAÇÃO --- */
            <form onSubmit={handleRequestSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  E-mail ou CPF
                </label>
                <div className="relative" onBlur={(event) => handlePasswordGroupBlur(event, () => setShowPassword(false))}>
                  <input
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="E-mail ou CPF"
                    className="w-full pl-10 pr-4 py-3 bg-[#eef2f6] dark:bg-gray-800 border-none rounded-xl focus:ring-2 focus:ring-[#00A86B] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-all outline-none"
                    required
                  />
                  <Mail className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5" />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#00A86B] hover:bg-[#008A57] text-white font-bold py-3.5 px-6 rounded-xl transition-all duration-200 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#00A86B]/25 hover:shadow-[#00A86B]/35 text-base tracking-wide"
              >
                {loading ? (
                  <>
                    <Loader2 size={20} className="mr-2 animate-spin" />
                    <span>Enviando...</span>
                  </>
                ) : (
                  <span>Enviar Link</span>
                )}
              </button>

              <button
                type="button"
                onClick={() => navigate('/login')}
                className="w-full flex items-center justify-center gap-2 py-3 text-gray-600 dark:text-gray-400 hover:text-[#00A86B] dark:hover:text-[#00A86B] font-semibold transition-colors text-sm"
              >
                <ArrowLeft size={16} />
                Voltar para o Login
              </button>
            </form>
          ) : tokenStatus === 'valid' ? (
            /* --- FORMULÁRIO DE REDEFINIÇÃO --- */
            <form onSubmit={handleResetSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Nova Senha
                </label>
                <div className="relative" onBlur={(event) => handlePasswordGroupBlur(event, () => setShowConfirmPassword(false))}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full pl-10 pr-12 py-3 bg-[#eef2f6] dark:bg-gray-800 border-none rounded-xl focus:ring-2 focus:ring-[#00A86B] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-all outline-none"
                    required
                  />
                  <Lock className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-1"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Confirmar Nova Senha
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirme a nova senha"
                    className="w-full pl-10 pr-12 py-3 bg-[#eef2f6] dark:bg-gray-800 border-none rounded-xl focus:ring-2 focus:ring-[#00A86B] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-all outline-none"
                    required
                  />
                  <Lock className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5" />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-1"
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#00A86B] hover:bg-[#008A57] text-white font-bold py-3.5 px-6 rounded-xl transition-all duration-200 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#00A86B]/25 hover:shadow-[#00A86B]/35 text-base tracking-wide"
              >
                {loading ? (
                  <>
                    <Loader2 size={20} className="mr-2 animate-spin" />
                    <span>Salvando...</span>
                  </>
                ) : (
                  <span>Salvar Nova Senha</span>
                )}
              </button>
            </form>
          ) : null}

        </div>
      </div>

      {/* Lado Direito - Imagem de Destaque */}
      <div className="hidden lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-[58%] xl:w-[62%] flex-shrink-0 items-center justify-center overflow-hidden bg-[#02130b]">
        <picture className="h-full w-full">
          <source media="(min-aspect-ratio: 16/10)" srcSet={loginBannerLandscape} />
          <img
          src={loginBannerPortrait}
          decoding="async"
          fetchPriority="high"
          alt="Kapsu Suplementação de Alta Qualidade"
          className="h-full w-full object-fill"
          />
        </picture>
        <div className="absolute inset-0 bg-black/10 dark:bg-black/25 pointer-events-none" />
      </div>

    </div>
  )
}
