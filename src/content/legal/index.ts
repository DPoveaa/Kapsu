import { privacyPolicyDocument } from './privacy-policy'
import { termsOfServiceDocument } from './terms-of-service'
import { pharmaceuticalInfoDocument } from './pharmaceutical-info'
import type { LegalDocument, LegalDocumentId } from './types'

export * from './types'
export * from './versions'
export * from './company-info'
export { privacyPolicyDocument } from './privacy-policy'
export { termsOfServiceDocument } from './terms-of-service'
export { pharmaceuticalInfoDocument } from './pharmaceutical-info'

const LEGAL_DOCUMENTS: Record<LegalDocumentId, LegalDocument> = {
  'privacy-policy': privacyPolicyDocument,
  'terms-of-service': termsOfServiceDocument,
  'pharmaceutical-info': pharmaceuticalInfoDocument,
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
