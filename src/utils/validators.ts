/**
 * Validação de CPF
 */
export function validateCPF(cpf: string): boolean {
  // Remove caracteres não numéricos
  const cleanCPF = cpf.replace(/\D/g, '')

  // Verifica se tem 11 dígitos
  if (cleanCPF.length !== 11) return false

  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1{10}$/.test(cleanCPF)) return false

  // Valida primeiro dígito verificador
  let sum = 0
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleanCPF.charAt(i)) * (10 - i)
  }
  let digit = 11 - (sum % 11)
  if (digit >= 10) digit = 0
  if (digit !== parseInt(cleanCPF.charAt(9))) return false

  // Valida segundo dígito verificador
  sum = 0
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleanCPF.charAt(i)) * (11 - i)
  }
  digit = 11 - (sum % 11)
  if (digit >= 10) digit = 0
  if (digit !== parseInt(cleanCPF.charAt(10))) return false

  return true
}

/**
 * Formata CPF em tempo real conforme o usuário digita (000.000.000-00)
 */
export function formatCPF(cpf: string): string {
  const cleanCPF = cpf.replace(/\D/g, '')
  
  // Limita a 11 dígitos
  const limited = cleanCPF.slice(0, 11)
  
  // Formata conforme o tamanho
  if (limited.length <= 3) {
    return limited
  } else if (limited.length <= 6) {
    return `${limited.slice(0, 3)}.${limited.slice(3)}`
  } else if (limited.length <= 9) {
    return `${limited.slice(0, 3)}.${limited.slice(3, 6)}.${limited.slice(6)}`
  } else {
    return `${limited.slice(0, 3)}.${limited.slice(3, 6)}.${limited.slice(6, 9)}-${limited.slice(9)}`
  }
}

/**
 * Valida telefone celular brasileiro
 * Aceita formatos: (11) 99999-9999, 11999999999, +5511999999999
 */
export function validatePhone(phone: string): boolean {
  // Remove caracteres não numéricos
  const cleanPhone = phone.replace(/\D/g, '')

  // Verifica se tem entre 10 e 13 dígitos (com ou sem código do país)
  if (cleanPhone.length < 10 || cleanPhone.length > 13) return false

  // Se começar com 55 (código do Brasil), remove
  const phoneWithoutCountry = cleanPhone.startsWith('55') 
    ? cleanPhone.substring(2) 
    : cleanPhone

  // Deve ter 10 ou 11 dígitos (com ou sem DDD)
  if (phoneWithoutCountry.length < 10 || phoneWithoutCountry.length > 11) return false

  // DDD deve estar entre 11 e 99
  const ddd = parseInt(phoneWithoutCountry.substring(0, 2))
  if (ddd < 11 || ddd > 99) return false

  // Número deve começar com 9 (celular)
  const number = phoneWithoutCountry.substring(2)
  if (number.length === 9 && !number.startsWith('9')) return false

  return true
}

/**
 * Formata telefone brasileiro em tempo real conforme o usuário digita ((11) 99999-9999)
 */
export function formatPhone(phone: string): string {
  const cleanPhone = phone.replace(/\D/g, '')
  
  // Remove código do país se presente (55)
  const phoneWithoutCountry = cleanPhone.startsWith('55') 
    ? cleanPhone.substring(2) 
    : cleanPhone

  // Limita a 11 dígitos (DDD + número)
  const limited = phoneWithoutCountry.slice(0, 11)

  // Formata conforme o tamanho
  if (limited.length === 0) {
    return ''
  } else if (limited.length <= 2) {
    // Apenas DDD: (11
    return `(${limited}`
  } else if (limited.length <= 6) {
    // DDD + início do número: (11) 9999
    return `(${limited.slice(0, 2)}) ${limited.slice(2)}`
  } else if (limited.length <= 10) {
    // DDD + número (fixo): (11) 1234-5678
    return `(${limited.slice(0, 2)}) ${limited.slice(2, 6)}-${limited.slice(6)}`
  } else {
    // DDD + número (celular): (11) 99999-9999
    return `(${limited.slice(0, 2)}) ${limited.slice(2, 7)}-${limited.slice(7)}`
  }
}

/**
 * Valida email
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Valida senha (mínimo 6 caracteres)
 */
export function validatePassword(password: string): boolean {
  return password.length >= 6
}

