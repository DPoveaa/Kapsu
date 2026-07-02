import type { LegalDocument } from '../../content/legal/types'

interface LegalDocumentContentProps {
  document: LegalDocument
  showHeader?: boolean
}

export default function LegalDocumentContent({
  document,
  showHeader = true,
}: LegalDocumentContentProps) {
  return (
    <article className="text-gray-700 dark:text-gray-300">
      {showHeader && (
        <header className="mb-10 pb-8 border-b border-gray-100 dark:border-gray-800">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-3">
            {document.title}
          </h1>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500 dark:text-gray-400">
            <span>Versão {document.version}</span>
            <span>Vigência: {formatDate(document.effectiveDate)}</span>
            <span>Atualizado em: {formatDate(document.lastUpdated)}</span>
          </div>
        </header>
      )}

      <div className="space-y-0 divide-y divide-gray-100 dark:divide-gray-800">
        {document.sections.map((section, idx) => (
          <section
            key={section.id}
            id={section.id}
            className="scroll-mt-6 py-8 first:pt-0 last:pb-0"
          >
            {/* Número + título */}
            <div className="flex items-baseline gap-3 mb-4">
              <span className="text-xs font-mono font-bold text-[#00A86B] bg-[#00A86B]/10 rounded-md px-2 py-0.5 shrink-0">
                {String(idx + 1).padStart(2, '0')}
              </span>
              <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white leading-snug">
                {section.title.replace(/^\d+\.\s/, '')}
              </h2>
            </div>

            {/* Parágrafos */}
            {section.paragraphs.length > 0 && (
              <div className="space-y-3 text-sm sm:text-base leading-relaxed text-gray-600 dark:text-gray-400 ml-0 sm:ml-10">
                {section.paragraphs.map((paragraph, index) => (
                  <p key={`${section.id}-p-${index}`}>{paragraph}</p>
                ))}
              </div>
            )}

            {/* Lista */}
            {section.listItems && section.listItems.length > 0 && (
              <ul className="mt-4 ml-0 sm:ml-10 space-y-2">
                {section.listItems.map((item, index) => (
                  <li
                    key={`${section.id}-li-${index}`}
                    className="flex items-start gap-3 text-sm sm:text-base leading-relaxed text-gray-600 dark:text-gray-400"
                  >
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#00A86B] shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>
    </article>
  )
}

function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-')
  return `${day}/${month}/${year}`
}
