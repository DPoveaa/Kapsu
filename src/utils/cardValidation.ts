export function isValidLuhn(number: string): boolean {
  let sum = 0
  let isEven = false
  for (let i = number.length - 1; i >= 0; i--) {
    let digit = parseInt(number.charAt(i), 10)
    if (isEven) {
      digit *= 2
      if (digit > 9) digit -= 9
    }
    sum += digit
    isEven = !isEven
  }
  return sum % 10 === 0
}

export function formatCardNumber(val: string): string {
  const v = val.replace(/\D/g, '').substring(0, 16)
  return v.replace(/(\d{4})(?=\d)/g, '$1 ')
}

export function formatCardExpiry(val: string): string {
  const v = val.replace(/\D/g, '').substring(0, 4)
  if (v.length >= 2) {
    return `${v.substring(0, 2)}/${v.substring(2)}`
  }
  return v
}

export function formatCardCpf(val: string): string {
  let v = val.replace(/\D/g, '').substring(0, 11)
  if (v.length > 9) v = v.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
  else if (v.length > 6) v = v.replace(/(\d{3})(\d{3})(\d{1,3})/, '$1.$2.$3')
  else if (v.length > 3) v = v.replace(/(\d{3})(\d{1,3})/, '$1.$2')
  return v
}

export type CardBrand = 'visa' | 'mastercard' | 'amex' | 'elo' | 'hipercard' | 'unknown'

export function detectCardBrand(number: string): CardBrand {
  const digits = number.replace(/\D/g, '')
  if (/^4/.test(digits)) return 'visa'
  if (/^(5[1-5]|2[2-7])/.test(digits)) return 'mastercard'
  if (/^3[47]/.test(digits)) return 'amex'
  if (/^(636368|438935|504175|451416|636297|5067|4576|4011)/.test(digits)) return 'elo'
  return 'unknown'
}

export interface CreditCardFormData {
  holderName: string
  cpf: string
  number: string
  expiry: string
  ccv: string
  installments: number
}

export function validateCreditCardForm(formData: CreditCardFormData): Record<string, string> {
  const errors: Record<string, string> = {}

  if (!formData.holderName.trim()) errors.holderName = 'Nome é obrigatório.'

  const cpfRaw = formData.cpf.replace(/\D/g, '')
  if (cpfRaw.length !== 11) errors.cpf = 'CPF inválido.'

  const numberRaw = formData.number.replace(/\D/g, '')
  if (numberRaw.length < 13 || numberRaw.length > 16) errors.number = 'Número do cartão inválido.'
  else if (!isValidLuhn(numberRaw)) errors.number = 'Número do cartão inválido.'

  if (formData.expiry.length !== 5) errors.expiry = 'Validade inválida (MM/AA).'
  else {
    const [month, year] = formData.expiry.split('/')
    const monthNum = parseInt(month, 10)
    if (monthNum < 1 || monthNum > 12) errors.expiry = 'Mês inválido.'
    const currentYear = new Date().getFullYear() % 100
    const currentMonth = new Date().getMonth() + 1
    if (parseInt(year, 10) < currentYear || (parseInt(year, 10) === currentYear && monthNum < currentMonth)) {
      errors.expiry = 'Cartão vencido.'
    }
  }

  if (formData.ccv.length < 3) errors.ccv = 'CVV inválido.'

  return errors
}

