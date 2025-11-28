/**
 * Configurações do ambiente
 * Variáveis de ambiente devem começar com VITE_ para serem expostas no cliente
 */

export const env = {
  // Porta do servidor (usado apenas no build, não no runtime)
  port: import.meta.env.VITE_PORT || 5173,
  
  // Emails do administrador (múltiplos separados por vírgula)
  // Deve corresponder ao ADMIN_EMAIL do backend
  adminEmails: (import.meta.env.VITE_ADMIN_EMAIL || 'admin@sanare.com.br')
    .split(',')
    .map((email: string) => email.trim().toLowerCase())
    .filter((email: string) => email.length > 0),
  
  // URL da API
  apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  
  // Modo de desenvolvimento
  isDev: import.meta.env.DEV,
  
  // Modo de produção
  isProd: import.meta.env.PROD,
} as const

/**
 * Verifica se um email é de administrador
 * Suporta múltiplos emails separados por vírgula
 */
export function isAdminEmail(email: string): boolean {
  return env.adminEmails.includes(email.toLowerCase())
}

