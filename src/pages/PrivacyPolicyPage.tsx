import { privacyPolicyDocument } from '../content/legal'
import LegalDocumentPageLayout from '../components/legal/LegalDocumentPageLayout'

export default function PrivacyPolicyPage() {
  return <LegalDocumentPageLayout document={privacyPolicyDocument} />
}
