/**
 * Configurações do ambiente
 * Variáveis de ambiente devem começar com VITE_ para serem expostas no cliente
 */

export const env = {
  // Porta do servidor (usado apenas no build, não no runtime)
  port: import.meta.env.VITE_PORT || 5173,
  
  // Emails do administrador (múltiplos separados por vírgula)
  // Deve corresponder ao ADMIN_EMAIL do backend
  adminEmails: (import.meta.env.VITE_ADMIN_EMAIL || 'admin@kapsu.com.br')
    .split(',')
    .map((email: string) => email.trim().toLowerCase())
    .filter((email: string) => email.length > 0),
  
  // URL da API
  apiUrl: import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:3000/api'),

  // Link publico de atendimento no WhatsApp
  get supportWhatsAppUrl() {
    try {
      const stored = localStorage.getItem('site_settings')
      if (stored) {
        const settings = JSON.parse(stored)
        if (settings && settings.whatsapp_number) {
          const cleanPhone = settings.whatsapp_number.replace(/\D/g, '')
          if (cleanPhone) {
            const phone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`
            return `https://wa.me/${phone}`
          }
        }
      }
    } catch (e) {
      console.error('Error parsing site_settings from localStorage', e)
    }
    return import.meta.env.VITE_SUPPORT_WHATSAPP_URL || null
  },
  
  // Modo de desenvolvimento
  isDev: import.meta.env.DEV,
  
  // Modo de produção
  isProd: import.meta.env.PROD,

  // Google Client ID
  googleClientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
} as const

/**
 * Verifica se um email é de administrador
 * Suporta múltiplos emails separados por vírgula
 */
export function isAdminEmail(email: string): boolean {
  return env.adminEmails.includes(email.toLowerCase())
}

