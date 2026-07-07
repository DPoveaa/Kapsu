import { useState, useEffect } from 'react'
import { useNavigate, useLocation, Link, useSearchParams } from 'react-router-dom'
import { Mail, Lock, User, Phone, FileText, Loader2, CheckCircle, ShoppingCart, Eye, EyeOff, XCircle, ShieldCheck } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { authService } from '../services/auth.service'
import { cartService } from '../services/cart.service'
import { validateCPF, formatCPF, validatePhone, formatPhone, validateEmail, validatePassword } from '../utils/validators'
import AnimatedLogo from '../components/AnimatedLogo'
import loginBannerPortrait from '../images/3x4.png'
import loginBannerLandscape from '../images/4x3.png'
import { env } from '../config/env'
import LegalAcceptanceCheckbox from '../components/legal/LegalAcceptanceCheckbox'
import { getLegalAcceptancePayload } from '../content/legal'

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const { login, loginWithToken } = useAuth()

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

  // Login Social
  const [socialRegisterRequired, setSocialRegisterRequired] = useState(false)
  const [socialData, setSocialData] = useState<{
    provider: string
    providerUserId: string
    email: string
    name: string
    picture?: string
    emailVerified: boolean
  } | null>(null)
  const [socialToken, setSocialToken] = useState('')
  const [socialPhone, setSocialPhone] = useState('')
  const [socialCpf, setSocialCpf] = useState('')
  const [socialName, setSocialName] = useState('')
  const [passwordNotSetEmail, setPasswordNotSetEmail] = useState('')
  const [sendingPasswordCreationEmail, setSendingPasswordCreationEmail] = useState(false)

  // Controles de visibilidade de senha
  const [showLoginPassword, setShowLoginPassword] = useState(false)
  const [showRegisterPassword, setShowRegisterPassword] = useState(false)
  const [showRegisterConfirmPassword, setShowRegisterConfirmPassword] = useState(false)
  const [acceptedLegalTerms, setAcceptedLegalTerms] = useState(false)
  const [legalAcceptanceError, setLegalAcceptanceError] = useState('')

  // Sincroniza o modo visual caso o usuário navegue usando o histórico do navegador (botão voltar/avançar)
  useEffect(() => {
    const isRegisterRoute = location.pathname === '/cadastro'
    setIsLogin(!isRegisterRoute)
    setGeneralError('')
    setFieldErrors({})
    setShowLoginPassword(false)
    setShowRegisterPassword(false)
    setShowRegisterConfirmPassword(false)
    setAcceptedLegalTerms(false)
    setLegalAcceptanceError('')
  }, [location.pathname])

  useEffect(() => {
    const hidePasswords = () => {
      setShowLoginPassword(false)
      setShowRegisterPassword(false)
      setShowRegisterConfirmPassword(false)
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

  // Inicialização do Google GSI com Logs de Diagnóstico Detalhados
  useEffect(() => {
    console.log('[GSI DIAGNOSTICS] useEffect disparado. Estado:', {
      isLogin,
      socialRegisterRequired,
      googleClientId: env.googleClientId || 'NÃO DEFINIDO/VAZIO',
      documentReadyState: document.readyState
    });

    const checkScriptLoaded = () => {
      const scripts = Array.from(document.getElementsByTagName('script'));
      const gsiScript = scripts.find(s => s.src.includes('accounts.google.com/gsi/client'));
      return {
        tagPresent: !!gsiScript,
        asyncAttribute: gsiScript?.async,
        deferAttribute: gsiScript?.defer
      };
    };

    const initializeGoogle = () => {
      const scriptInfo = checkScriptLoaded();
      const hasGoogle = typeof window !== 'undefined' && !!(window as any).google;
      const hasClientId = !!env.googleClientId;

      console.log('[GSI DIAGNOSTICS] Executando initializeGoogle...', {
        scriptTagPresent: scriptInfo.tagPresent,
        scriptLoadedInWindow: hasGoogle,
        hasClientId,
        clientIdValue: env.googleClientId
      });

      if (!scriptInfo.tagPresent) {
        console.warn('[GSI DIAGNOSTICS] AVISO: Tag de script do Google GSI não foi encontrada no DOM (index.html).');
      }

      if (!hasGoogle) {
        console.warn('[GSI DIAGNOSTICS] AVISO: window.google está undefined. O script ainda não terminou de carregar ou falhou.');
        return;
      }

      if (!hasClientId) {
        console.error('[GSI DIAGNOSTICS] ERRO CRÍTICO: Client ID do Google está vazio ou indefinido no frontend! Verifique VITE_GOOGLE_CLIENT_ID no seu arquivo .env');
        return;
      }

      try {
        console.log('[GSI DIAGNOSTICS] Chamando google.accounts.id.initialize...');
        (window as any).google.accounts.id.initialize({
          client_id: env.googleClientId,
          callback: handleGoogleCredentialResponse,
          auto_select: false,
          itp_support: true
        });
        console.log('[GSI DIAGNOSTICS] google.accounts.id.initialize executado com sucesso.');

        // Renderiza botão de login se visível
        const btnLogin = document.getElementById('google-signin-btn-login');
        console.log('[GSI DIAGNOSTICS] Buscando elemento google-signin-btn-login:', {
          found: !!btnLogin,
          isLogin,
          socialRegisterRequired
        });

        if (isLogin && !socialRegisterRequired) {
          if (btnLogin) {
            console.log('[GSI DIAGNOSTICS] Chamando google.accounts.id.renderButton para Login...');
            const isDark = document.documentElement.classList.contains('dark');
            btnLogin.innerHTML = ''; // Limpa botões antigos/duplicados!
            (window as any).google.accounts.id.renderButton(btnLogin, {
              theme: isDark ? 'filled_black' : 'outline',
              size: 'large',
              width: btnLogin.clientWidth || 320,
              text: 'continue_with',
              shape: 'rectangular'
            });
            console.log('[GSI DIAGNOSTICS] renderButton para Login concluído.');
          } else {
            console.error('[GSI DIAGNOSTICS] ERRO: Elemento com ID google-signin-btn-login deveria existir, mas não foi encontrado no DOM.');
          }
        }

        // Renderiza botão de cadastro se visível
        const btnRegister = document.getElementById('google-signin-btn-register');
        console.log('[GSI DIAGNOSTICS] Buscando elemento google-signin-btn-register:', {
          found: !!btnRegister,
          isLogin,
          socialRegisterRequired
        });

        if (!isLogin && !socialRegisterRequired) {
          if (btnRegister) {
            if (!acceptedLegalTerms) {
              btnRegister.innerHTML = ''
            } else {
            console.log('[GSI DIAGNOSTICS] Chamando google.accounts.id.renderButton para Cadastro...');
            const isDark = document.documentElement.classList.contains('dark');
            btnRegister.innerHTML = ''; // Limpa botões antigos/duplicados!
            (window as any).google.accounts.id.renderButton(btnRegister, {
              theme: isDark ? 'filled_black' : 'outline',
              size: 'large',
              width: btnRegister.clientWidth || 320,
              text: 'continue_with',
              shape: 'rectangular'
            });
            console.log('[GSI DIAGNOSTICS] renderButton para Cadastro concluído.');
            }
          } else {
            console.error('[GSI DIAGNOSTICS] ERRO: Elemento com ID google-signin-btn-register deveria existir, mas não foi encontrado no DOM.');
          }
        }
      } catch (e: any) {
        console.error('[GSI DIAGNOSTICS] EXCEÇÃO capturada durante inicialização:', e.message, e);
      }
    };

    initializeGoogle();
    
    // Configura polling/timeout apenas se o script do Google ainda não estiver pronto
    let checkInterval: any = null;
    if (typeof window !== 'undefined' && !(window as any).google) {
      checkInterval = setInterval(() => {
        if ((window as any).google) {
          console.log('[GSI DIAGNOSTICS] Script carregado tardiamente (via setInterval). Inicializando...');
          initializeGoogle();
          clearInterval(checkInterval);
        }
      }, 500);
    }

    return () => {
      console.log('[GSI DIAGNOSTICS] Limpando useEffect/Interval.');
      if (checkInterval) {
        clearInterval(checkInterval);
      }
    };
  }, [isLogin, socialRegisterRequired, env.googleClientId, acceptedLegalTerms])

  const handleGoogleCredentialResponse = async (response: any) => {
    setLoading(true)
    setGeneralError('')
    setSuccessMessage('')
    try {
      const data = await authService.socialLogin('google', response.credential)
      
      if (data.action === 'register_required') {
        setSocialData(data.socialUser)
        setSocialToken(response.credential)
        setSocialPhone('')
        setSocialCpf('')
        setSocialName(data.socialUser.name || '')
        setSocialRegisterRequired(true)
      } else if (data.token && data.user) {
        loginWithToken(data.user, data.token)
        
        // Redireciona
        const redirect = searchParams.get('redirect')
        const returnTo = searchParams.get('returnTo')
        if (redirect) navigate(redirect)
        else if (returnTo) navigate(returnTo)
        else navigate('/')
      }
    } catch (err: any) {
      setGeneralError(err.message || 'Erro ao autenticar com o Google')
    } finally {
      setLoading(false)
    }
  }

  const handleSocialRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setGeneralError('')
    setFieldErrors({})

    const errors: Record<string, string> = {}
    if (!socialName.trim()) {
      errors.name = 'Nome é obrigatório'
    } else if (socialName.trim().length < 3) {
      errors.name = 'Nome deve ter pelo menos 3 caracteres'
    }

    if (!socialPhone) {
      errors.phone = 'Telefone é obrigatório'
    } else if (!validatePhone(socialPhone)) {
      errors.phone = 'Telefone inválido. Formato: (11) 99999-9999'
    }

    if (!socialCpf) {
      errors.cpf = 'CPF é obrigatório'
    } else if (!validateCPF(socialCpf)) {
      errors.cpf = 'CPF inválido'
    }

    if (!acceptedLegalTerms) {
      setLegalAcceptanceError('Você precisa aceitar os Termos de Serviço e a Política de Privacidade')
    } else {
      setLegalAcceptanceError('')
    }

    if (Object.keys(errors).length > 0 || !acceptedLegalTerms) {
      setFieldErrors(errors)
      return
    }

    setLoading(true)
    try {
      const data = await authService.socialRegister(
        socialData!.provider,
        socialToken,
        socialPhone,
        socialCpf,
        socialName,
        getLegalAcceptancePayload()
      )

      if (data.token && data.user) {
        loginWithToken(data.user, data.token)
        
        // Redireciona
        const redirect = searchParams.get('redirect')
        const returnTo = searchParams.get('returnTo')
        if (redirect) navigate(redirect)
        else if (returnTo) navigate(returnTo)
        else navigate('/')
      }
    } catch (err: any) {
      setGeneralError(err.message || 'Erro ao concluir cadastro social')
    } finally {
      setLoading(false)
    }
  }

  const handleSendPasswordCreationEmail = async () => {
    if (!passwordNotSetEmail) return
    setSendingPasswordCreationEmail(true)
    setGeneralError('')
    setSuccessMessage('')
    try {
      const res = await authService.forgotPassword(passwordNotSetEmail)
      if (res.success) {
        setSuccessMessage('E-mail de criação de senha enviado com sucesso! Verifique sua caixa de entrada.')
        setPasswordNotSetEmail('')
      } else {
        setGeneralError(res.message || 'Erro ao enviar e-mail. Tente novamente.')
      }
    } catch (err: any) {
      setGeneralError(err.message || 'Erro de conexão ao solicitar e-mail.')
    } finally {
      setSendingPasswordCreationEmail(false)
    }
  }

  // Alterna dinamicamente entre login e cadastro, atualizando a URL sem recarregar a página
  const handleToggleMode = (toLogin: boolean) => {
    setIsLogin(toLogin)
    setGeneralError('')
    setFieldErrors({})
    setSuccessMessage('')
    setShowLoginPassword(false)
    setShowRegisterPassword(false)
    setShowRegisterConfirmPassword(false)
    setAcceptedLegalTerms(false)
    setLegalAcceptanceError('')
    
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

  const handlePasswordGroupBlur = (event: React.FocusEvent<HTMLDivElement>, hidePassword: () => void) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      hidePassword()
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

    if (!acceptedLegalTerms) {
      setLegalAcceptanceError('Você precisa aceitar os Termos de Serviço e a Política de Privacidade')
    } else {
      setLegalAcceptanceError('')
    }

    setFieldErrors(newErrors)
    return Object.keys(newErrors).length === 0 && acceptedLegalTerms
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
      if (err.code === 'PASSWORD_NOT_SET') {
        setPasswordNotSetEmail(loginEmail)
      }
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
        ...getLegalAcceptancePayload(),
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
    <div className="min-h-screen lg:h-screen flex relative lg:overflow-hidden bg-white dark:bg-gray-900">
      
      {/* Lado Esquerdo - Formulário de Login / Cadastro */}
      <div className="w-full lg:w-[42%] xl:w-[38%] lg:h-screen lg:overflow-y-auto flex items-center justify-center p-6 sm:p-10 lg:p-12 xl:p-16 relative z-10 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md scrollbar-hide">
        
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

        <div className="w-full max-w-md relative z-10">
          
          {/* Logo animada do Panda acima do título */}
          <div className="mb-6 flex justify-center">
            <div className="w-24 h-24 sm:w-28 sm:h-28 flex items-center justify-center">
              <AnimatedLogo 
                className="w-full h-full object-contain"
                alt="Kapsu Logo"
                forceSleeping={showLoginPassword || showRegisterPassword || showRegisterConfirmPassword}
              />
            </div>
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-6 text-center tracking-tight">
            {socialRegisterRequired ? (
              <>
                Completar <span className="text-[#00A86B]">Cadastro</span>
              </>
            ) : isLogin ? (
              <>
                Bem-vindo a <span className="text-[#00A86B]">Kapsu</span>
              </>
            ) : (
              <>
                Criar <span className="text-[#00A86B]">Conta</span>
              </>
            )}
          </h1>

          {/* Banner de Sucesso */}
          {successMessage && (
            <div className="mb-5 p-3 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-500/50 rounded-xl text-green-700 dark:text-green-300 text-sm flex items-center shadow-sm">
              <CheckCircle size={16} className="mr-2 flex-shrink-0 text-[#00A86B]" />
              <span className="break-words">{successMessage}</span>
            </div>
          )}

          {/* Banner de Carrinho Pendente */}
          {hasPendingCart && isLogin && (
            <div className="mb-5 p-3 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-500/50 rounded-xl text-blue-700 dark:text-blue-300 text-sm flex items-center shadow-sm">
              <ShoppingCart size={16} className="mr-2 flex-shrink-0 text-[#2563EB]" />
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

          {passwordNotSetEmail && (
            <div className="mb-5 p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-xl shadow-sm text-sm text-amber-800 dark:text-amber-300 leading-relaxed space-y-3">
              <div className="flex items-start gap-2">
                <ShieldCheck size={18} className="flex-shrink-0 text-amber-500 mt-0.5" />
                <span>
                  Sua conta foi criada utilizando o Google. Deseja criar uma senha para também poder acessar utilizando e-mail e senha?
                </span>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleSendPasswordCreationEmail}
                  disabled={sendingPasswordCreationEmail}
                  className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-bold text-xs shadow transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {sendingPasswordCreationEmail && <Loader2 size={12} className="animate-spin" />}
                  Enviar e-mail de criação de senha
                </button>
                <button
                  type="button"
                  onClick={() => setPasswordNotSetEmail('')}
                  className="px-3 py-1.5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-400 font-semibold text-xs cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            </div>
          )}

          {socialRegisterRequired ? (
            /* --- FORMULÁRIO DE COMPLEMENTAR CADASTRO SOCIAL --- */
            <form key="social-register-form" onSubmit={handleSocialRegisterSubmit} className="space-y-4 animate-in fade-in duration-300">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 text-center leading-relaxed">
                Olá, <strong>{socialData?.name}</strong>! Confirme seus dados e informe os campos obrigatórios restantes para concluir seu cadastro na Kapsu.
              </p>

              {/* Nome */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Nome Completo *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={socialName}
                    onChange={(e) => {
                      if (fieldErrors.name) {
                        setFieldErrors(prev => {
                          const next = { ...prev };
                          delete next.name;
                          return next;
                        });
                      }
                      setSocialName(e.target.value);
                    }}
                    placeholder="Seu nome completo"
                    className={`w-full pl-10 pr-4 py-3 bg-[#eef2f6] dark:bg-gray-800 border-none rounded-xl focus:ring-2 focus:ring-[#00A86B] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-all font-sans outline-none ${
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

              {/* Email (Readonly) */}
              <div>
                <label className="block text-sm font-semibold text-gray-400 dark:text-gray-500 mb-1.5">
                  E-mail
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={socialData?.email || ''}
                    disabled
                    className="w-full pl-10 pr-4 py-3 bg-[#eef2f6]/50 dark:bg-gray-800/50 border-none rounded-xl text-gray-400 dark:text-gray-500 font-sans outline-none cursor-not-allowed"
                  />
                  <Mail className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-600 w-5 h-5" />
                </div>
              </div>

              {/* Telefone */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Telefone Celular *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={socialPhone}
                    onChange={(e) => {
                      if (fieldErrors.phone) {
                        setFieldErrors(prev => {
                          const next = { ...prev };
                          delete next.phone;
                          return next;
                        });
                      }
                      setSocialPhone(formatPhone(e.target.value));
                    }}
                    placeholder="(11) 99999-9999"
                    maxLength={15}
                    className={`w-full pl-10 pr-4 py-3 bg-[#eef2f6] dark:bg-gray-800 border-none rounded-xl focus:ring-2 focus:ring-[#00A86B] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-all font-sans outline-none ${
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
                  CPF *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={socialCpf}
                    onChange={(e) => {
                      if (fieldErrors.cpf) {
                        setFieldErrors(prev => {
                          const next = { ...prev };
                          delete next.cpf;
                          return next;
                        });
                      }
                      setSocialCpf(formatCPF(e.target.value));
                    }}
                    placeholder="000.000.000-00"
                    maxLength={14}
                    className={`w-full pl-10 pr-4 py-3 bg-[#eef2f6] dark:bg-gray-800 border-none rounded-xl focus:ring-2 focus:ring-[#00A86B] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-all font-sans outline-none ${
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

              <LegalAcceptanceCheckbox
                checked={acceptedLegalTerms}
                onChange={(checked) => {
                  setAcceptedLegalTerms(checked)
                  if (checked) setLegalAcceptanceError('')
                }}
                error={legalAcceptanceError}
                id="social-legal-acceptance"
              />

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setSocialRegisterRequired(false);
                    setSocialData(null);
                    setSocialToken('');
                  }}
                  className="w-full sm:w-1/3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold py-3.5 px-4 rounded-xl transition-all duration-200 cursor-pointer text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading || !acceptedLegalTerms}
                  className="w-full sm:w-2/3 bg-[#00A86B] hover:bg-[#008A57] text-white font-bold py-3.5 px-6 rounded-xl transition-all duration-200 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#00A86B]/25 hover:shadow-[#00A86B]/35 text-sm tracking-wide cursor-pointer"
                >
                  {loading ? (
                    <>
                      <Loader2 size={16} className="mr-1.5 animate-spin" />
                      <span>Concluindo...</span>
                    </>
                  ) : (
                    <span>Concluir Cadastro</span>
                  )}
                </button>
              </div>
            </form>
          ) : isLogin ? (
            /* --- FORMULÁRIO DE LOGIN --- */
            <form key="login-form" onSubmit={handleLoginSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  E-mail
                </label>
                <div className="relative" onBlur={(event) => handlePasswordGroupBlur(event, () => setShowLoginPassword(false))}>
                  <input
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="seu@email.com"
                    className="w-full pl-10 pr-4 py-3 bg-[#eef2f6] dark:bg-gray-800 border-none rounded-xl focus:ring-2 focus:ring-[#00A86B] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-all font-sans outline-none"
                    required
                  />
                  <Mail className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Senha
                </label>
                <div className="relative" onBlur={(event) => handlePasswordGroupBlur(event, () => setShowRegisterPassword(false))}>
                  <input
                    type={showLoginPassword ? 'text' : 'password'}
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Sua senha"
                    className="w-full pl-10 pr-12 py-3 bg-[#eef2f6] dark:bg-gray-800 border-none rounded-xl focus:ring-2 focus:ring-[#00A86B] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-all font-sans outline-none"
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
                <span className="text-gray-600 dark:text-gray-400 text-left">
                  Não tem uma conta?{' '}
                  <button
                    type="button"
                    onClick={() => handleToggleMode(false)}
                    className="text-[#00A86B] font-semibold hover:underline transition-colors focus:outline-none"
                  >
                    Cadastre-se
                  </button>
                </span>
                <Link
                  to="/recuperar-senha"
                  className="text-[#00A86B] font-semibold hover:underline transition-colors whitespace-nowrap"
                >
                  Esqueceu sua senha?
                </Link>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#00A86B] hover:bg-[#008A57] text-white font-bold py-3.5 px-6 rounded-xl transition-all duration-200 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#00A86B]/25 hover:shadow-[#00A86B]/35 text-base tracking-wide"
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

              <div className="relative flex items-center justify-center my-4">
                <div className="border-t border-gray-200 dark:border-gray-800 w-full"></div>
                <span className="bg-white dark:bg-gray-900 px-3 text-xs text-gray-400 absolute">ou</span>
              </div>

              <div id="google-signin-btn-login" className="w-full flex justify-center mt-2 min-h-[44px]"></div>
            </form>
          ) : (
            /* --- FORMULÁRIO DE CADASTRO --- */
            <form key="register-form" onSubmit={handleRegisterSubmit} className="space-y-4">
              {/* Nome Completo */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Nome Completo
                </label>
                <div className="relative" onBlur={(event) => handlePasswordGroupBlur(event, () => setShowRegisterConfirmPassword(false))}>
                  <input
                    type="text"
                    value={registerData.name}
                    onChange={(e) => handleRegisterChange('name', e.target.value)}
                    placeholder="Seu nome completo"
                    className={`w-full pl-10 pr-4 py-3 bg-[#eef2f6] dark:bg-gray-800 border-none rounded-xl focus:ring-2 focus:ring-[#00A86B] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-all font-sans outline-none ${
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
                    className={`w-full pl-10 pr-4 py-3 bg-[#eef2f6] dark:bg-gray-800 border-none rounded-xl focus:ring-2 focus:ring-[#00A86B] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-all font-sans outline-none ${
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
                      className={`w-full pl-10 pr-4 py-3 bg-[#eef2f6] dark:bg-gray-800 border-none rounded-xl focus:ring-2 focus:ring-[#00A86B] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-all font-sans outline-none ${
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
                      className={`w-full pl-10 pr-4 py-3 bg-[#eef2f6] dark:bg-gray-800 border-none rounded-xl focus:ring-2 focus:ring-[#00A86B] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-all font-sans outline-none ${
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
                    className={`w-full pl-10 pr-12 py-3 bg-[#eef2f6] dark:bg-gray-800 border-none rounded-xl focus:ring-2 focus:ring-[#00A86B] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-all font-sans outline-none ${
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
                    className={`w-full pl-10 pr-12 py-3 bg-[#eef2f6] dark:bg-gray-800 border-none rounded-xl focus:ring-2 focus:ring-[#00A86B] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-all font-sans outline-none ${
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
                <span className="text-gray-600 dark:text-gray-400">
                  Já tem uma conta?{' '}
                  <button
                    type="button"
                    onClick={() => handleToggleMode(true)}
                    className="text-[#00A86B] font-semibold hover:underline transition-colors focus:outline-none"
                  >
                    Faça login
                  </button>
                </span>
              </div>

              <LegalAcceptanceCheckbox
                checked={acceptedLegalTerms}
                onChange={(checked) => {
                  setAcceptedLegalTerms(checked)
                  if (checked) setLegalAcceptanceError('')
                }}
                error={legalAcceptanceError}
                id="register-legal-acceptance"
              />

              <button
                type="submit"
                disabled={loading || !acceptedLegalTerms}
                className="w-full bg-[#00A86B] hover:bg-[#008A57] text-white font-bold py-3.5 px-6 rounded-xl transition-all duration-200 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#00A86B]/25 hover:shadow-[#00A86B]/35 text-base tracking-wide"
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

              <div className="relative flex items-center justify-center my-4">
                <div className="border-t border-gray-200 dark:border-gray-800 w-full"></div>
                <span className="bg-white dark:bg-gray-900 px-3 text-xs text-gray-400 absolute">ou</span>
              </div>

              <p className={`text-xs text-center text-gray-500 dark:text-gray-400 mb-2 font-normal transition-opacity duration-200 ${
                acceptedLegalTerms ? 'opacity-0 pointer-events-none' : 'opacity-100'
              }`}>
                Aceite os Termos e a Política de Privacidade acima para cadastrar com o Google.
              </p>

              <div id="google-signin-btn-register" className="w-full flex justify-center mt-2 min-h-[44px]"></div>
            </form>
          )}

        </div>
      </div>

      {/* Lado Direito - Imagem de Destaque (Fórmula/Suplementação Kapsu) */}
      <div className="hidden lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-[58%] xl:w-[62%] flex-shrink-0 items-center justify-center overflow-hidden bg-[#02130b]">
        <picture className="h-full w-full">
          <source media="(min-aspect-ratio: 16/10)" srcSet={loginBannerLandscape} />
          <img
          src={loginBannerPortrait}
          alt="Kapsu Suplementação de Alta Qualidade"
          className="h-full w-full object-fill"
          />
        </picture>
        {/* Overlay escuro opcional para manter integridade com temas escuros */}
        <div className="absolute inset-0 bg-black/10 dark:bg-black/25 pointer-events-none" />
      </div>

    </div>
  )
}
