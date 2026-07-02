import { privacyPolicyDocument } from './privacy-policy'
import { termsOfServiceDocument } from './terms-of-service'
import type { LegalDocument, LegalDocumentId } from './types'

export * from './types'
export * from './versions'
export * from './company-info'
export { privacyPolicyDocument } from './privacy-policy'
export { termsOfServiceDocument } from './terms-of-service'

const LEGAL_DOCUMENTS: Record<LegalDocumentId, LegalDocument> = {
  'privacy-policy': privacyPolicyDocument,
  'terms-of-service': termsOfServiceDocument,
}

export function getLegalDocument(id: LegalDocumentId): LegalDocument {
  return LEGAL_DOCUMENTS[id]
}

export function getLegalAcceptancePayload() {
  return {
    termsOfServiceVersion: termsOfServiceDocument.version,
    privacyPolicyVersion: privacyPolicyDocument.version,
  }
}
