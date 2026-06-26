export type ResponseCopyInput = {
  userMessage: string
  detectedGoal?: string
  products: Array<{ id: string; name: string; category?: string }>
  primaryProduct?: { id: string; name: string; category?: string }
  categories?: string[]
  safetyRestrictions?: string[]
  tone?: string
  recentHistory?: string[]
}

export type ResponseCopyOutput = {
  intro: string
  closing: string
}

export type ResponseCopyDiagnostics = {
  copyGeneratedBy: 'llm' | 'fallback'
  copyFallbackUsed: boolean
  copyValidation: 'passed' | 'invalid_schema' | 'invalid_length' | 'unsafe_claim'
  reason?: string
}

export type ResponseCopyResult = ResponseCopyOutput & {
  diagnostics: ResponseCopyDiagnostics
}

type CopyProvider = (input: ResponseCopyInput) => Promise<unknown>

const MAX_INTRO = 220
const MAX_CLOSING = 280
const UNSAFE_CLAIMS = /\b(cura|curar|trata|tratamento|garante|garantido|resolve definitivamente|diagn[oó]stico)\b/i

const clean = (value: unknown) => String(value || '').replace(/\s+/g, ' ').trim()

const fallbackCopy = (input: ResponseCopyInput): ResponseCopyOutput => {
  const productName = input.primaryProduct?.name || input.products[0]?.name || 'a sugestão principal'
  const goal = clean(input.detectedGoal) || 'o que você procura'

  return {
    intro: `Entendi. Separei opções alinhadas a ${goal}, com foco em apoiar sua rotina de cuidados de forma prática.`,
    closing: `Minha sugestão principal é ${productName}, por estar mais próxima do objetivo informado. Posso adicionar ao carrinho ou simular o frete?`,
  }
}

export class ResponseCopyGenerator {
  constructor(private readonly provider?: CopyProvider) {}

  async generate(input: ResponseCopyInput): Promise<ResponseCopyResult> {
    if (!this.provider) {
      const fallback = fallbackCopy(input)
      return {
        ...fallback,
        diagnostics: {
          copyGeneratedBy: 'fallback',
          copyFallbackUsed: true,
          copyValidation: 'passed',
          reason: 'provider_unavailable',
        },
      }
    }

    try {
      const raw = await this.provider(input)
      const candidate = this.parse(raw)
      const validation = this.validate(candidate)

      if (validation !== 'passed') {
        const fallback = fallbackCopy(input)
        return {
          ...fallback,
          diagnostics: {
            copyGeneratedBy: 'fallback',
            copyFallbackUsed: true,
            copyValidation: validation,
            reason: validation,
          },
        }
      }

      return {
        ...candidate,
        diagnostics: {
          copyGeneratedBy: 'llm',
          copyFallbackUsed: false,
          copyValidation: 'passed',
        },
      }
    } catch {
      const fallback = fallbackCopy(input)
      return {
        ...fallback,
        diagnostics: {
          copyGeneratedBy: 'fallback',
          copyFallbackUsed: true,
          copyValidation: 'invalid_schema',
          reason: 'provider_error',
        },
      }
    }
  }

  private parse(raw: unknown): ResponseCopyOutput {
    const value = typeof raw === 'string' ? JSON.parse(raw) : raw
    if (!value || typeof value !== 'object') throw new Error('invalid_schema')
    const intro = clean((value as any).intro)
    const closing = clean((value as any).closing)
    if (!intro || !closing) throw new Error('invalid_schema')
    return { intro, closing }
  }

  private validate(copy: ResponseCopyOutput): ResponseCopyDiagnostics['copyValidation'] {
    if (copy.intro.length > MAX_INTRO || copy.closing.length > MAX_CLOSING) return 'invalid_length'
    if (UNSAFE_CLAIMS.test(copy.intro) || UNSAFE_CLAIMS.test(copy.closing)) return 'unsafe_claim'
    return 'passed'
  }
}
