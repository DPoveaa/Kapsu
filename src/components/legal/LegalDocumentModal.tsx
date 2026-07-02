import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { getLegalDocument } from '../../content/legal'
import type { LegalDocumentId } from '../../content/legal/types'
import LegalDocumentContent from './LegalDocumentContent'

interface LegalDocumentModalProps {
  documentId: LegalDocumentId | null
  isOpen: boolean
  onClose: () => void
}

export default function LegalDocumentModal({
  documentId,
  isOpen,
  onClose,
}: LegalDocumentModalProps) {
  const closeBtnRef = useRef<HTMLButtonElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null)

  const legalDocument = documentId ? getLegalDocument(documentId) : null

  useEffect(() => {
    if (!isOpen) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.document.addEventListener('keydown', handleKey)
    return () => window.document.removeEventListener('keydown', handleKey)
  }, [isOpen, onClose])

  useEffect(() => {
    if (isOpen) {
      window.document.body.style.overflow = 'hidden'
      setTimeout(() => closeBtnRef.current?.focus(), 50)
    } else {
      window.document.body.style.overflow = ''
      setActiveSectionId(null)
    }
    return () => {
      window.document.body.style.overflow = ''
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen || !legalDocument) return

    const container = contentRef.current
    if (!container) return

    const sectionElements = legalDocument.sections
      .map((section) => container.querySelector<HTMLElement>(`#${section.id}`))
      .filter((element): element is HTMLElement => element !== null)

    const handleScroll = () => {
      const scrollTop = container.scrollTop
      let currentId: string | null = legalDocument.sections[0]?.id ?? null

      for (const element of sectionElements) {
        if (element.offsetTop - 24 <= scrollTop) {
          currentId = element.id
        }
      }

      setActiveSectionId(currentId)
    }

    handleScroll()
    container.addEventListener('scroll', handleScroll, { passive: true })
    return () => container.removeEventListener('scroll', handleScroll)
  }, [isOpen, legalDocument])

  if (!isOpen || !legalDocument) return null

  const scrollToSection = (sectionId: string) => {
    const container = contentRef.current
    const target = container?.querySelector<HTMLElement>(`#${sectionId}`)
    if (!container || !target) return

    container.scrollTo({
      top: target.offsetTop - 16,
      behavior: 'smooth',
    })
    setActiveSectionId(sectionId)
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(2px)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="legal-modal-title"
    >
      <div className="relative w-full max-w-5xl bg-white dark:bg-gray-800 rounded-2xl shadow-2xl flex flex-col max-h-[95vh] sm:max-h-[90vh] border border-gray-200 dark:border-gray-700 animate-modal-in">
        <div className="flex items-center justify-between px-4 sm:px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <h2
            id="legal-modal-title"
            className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white truncate pr-4"
          >
            {legalDocument.title}
          </h2>
          <button
            ref={closeBtnRef}
            onClick={onClose}
            className="flex-shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00A86B]"
            aria-label="Fechar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-1 min-h-0 overflow-hidden">
          <aside className="hidden md:block w-64 flex-shrink-0 border-r border-gray-200 dark:border-gray-700 overflow-y-auto p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3">
              Índice
            </p>
            <nav className="space-y-1">
              {legalDocument.sections.map((section) => (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => scrollToSection(section.id)}
                  className={`w-full text-left text-sm px-3 py-2 rounded-lg transition-colors font-normal ${
                    activeSectionId === section.id
                      ? 'bg-[#00A86B]/10 text-[#007A4E] dark:text-[#00A86B] font-semibold'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  {section.title}
                </button>
              ))}
            </nav>
          </aside>

          <div ref={contentRef} className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 min-h-0">
            <details className="md:hidden mb-5 rounded-xl border border-gray-200 dark:border-gray-700 p-3">
              <summary className="cursor-pointer text-sm font-semibold text-gray-700 dark:text-gray-200">
                Ver índice das seções
              </summary>
              <nav className="mt-3 space-y-1">
                {legalDocument.sections.map((section) => (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() => scrollToSection(section.id)}
                    className="block w-full text-left text-sm px-2 py-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 font-normal"
                  >
                    {section.title}
                  </button>
                ))}
              </nav>
            </details>

            <LegalDocumentContent document={legalDocument} />
          </div>
        </div>

        <div className="flex-shrink-0 px-4 sm:px-5 py-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-b-2xl">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto sm:ml-auto sm:float-right bg-[#00A86B] hover:bg-[#008A57] text-white font-bold py-3 px-6 rounded-xl transition-all duration-200 shadow-lg shadow-[#00A86B]/25"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}
