const GOOGLE_IDENTITY_SRC = 'https://accounts.google.com/gsi/client'

export function ensureGoogleIdentityScript(): HTMLScriptElement {
  const existing = Array.from(document.scripts).find(script => script.src.includes(GOOGLE_IDENTITY_SRC))
  if (existing) return existing
  const script = document.createElement('script')
  script.src = GOOGLE_IDENTITY_SRC
  script.async = true
  script.defer = true
  document.head.appendChild(script)
  return script
}
