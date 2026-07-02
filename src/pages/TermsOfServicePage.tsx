import { termsOfServiceDocument } from '../content/legal'
import LegalDocumentPageLayout from '../components/legal/LegalDocumentPageLayout'

export default function TermsOfServicePage() {
  return <LegalDocumentPageLayout document={termsOfServiceDocument} />
}
