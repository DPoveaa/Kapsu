export interface LegalDocumentSection {
  id: string
  title: string
  paragraphs: string[]
  listItems?: string[]
}

export interface LegalDocument {
  id: 'terms-of-service' | 'privacy-policy'
  title: string
  shortTitle: string
  version: string
  effectiveDate: string
  lastUpdated: string
  sections: LegalDocumentSection[]
}

export type LegalDocumentId = LegalDocument['id']
