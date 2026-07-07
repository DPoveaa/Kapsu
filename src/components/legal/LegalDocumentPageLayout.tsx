import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, BookOpen, Clock } from 'lucide-react'
import type { LegalDocument } from '../../content/legal/types'
import LegalDocumentContent from './LegalDocumentContent'

interface LegalDocumentPageLayoutProps {
  document: LegalDocument
  backHref?: string
}

function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-')
  return `${day}/${month}/${year}`
}

function estimateReadTime(doc: LegalDocument): number {
  const totalWords = doc.sections.reduce((acc, section) => {
    const paragraphWords = section.paragraphs.join(' ').split(/\s+/).length
    const listWords = (section.listItems || []).join(' ').split(/\s+/).length
    return acc + paragraphWords + listWords
  }, 0)
  return Math.ceil(totalWords / 200) // ~200 palavras/min
}

export default function LegalDocumentPageLayout({
  document: doc,
  backHref = '/',
}: LegalDocumentPageLayoutProps) {
  const navigate = useNavigate()

  // Chave de persistência por documento
  const storageKey = `legal-progress-${doc.id}`

  // Seção atual (muda ao rolar para cima/baixo)
  const [activeSection, setActiveSection] = useState<string>(doc.sections[0]?.id ?? '')
  // Progresso máximo já atingido (nunca regride)
  const [readProgress, setReadProgress] = useState<number>(() => {
    try { return parseInt(localStorage.getItem(storageKey) ?? '0', 10) || 0 } catch { return 0 }
  })
  // Índice da seção mais funda já atingida (para marcar no índice)
  const [deepestSectionIdx, setDeepestSectionIdx] = useState<number>(() => {
    try { return parseInt(localStorage.getItem(`${storageKey}-section`) ?? '0', 10) || 0 } catch { return 0 }
  })

  const readTime = estimateReadTime(doc)

  // SEO meta tags
  useEffect(() => {
    document.title = `${doc.title} | Kapsu`
    const metaDesc = document.querySelector('meta[name="description"]')
    if (metaDesc) {
      metaDesc.setAttribute(
        'content',
        `Leia os ${doc.title.toLowerCase()} da Kapsu. Transparência e conformidade com a LGPD.`
      )
    }
  }, [doc.title])

  // Scroll: progresso máximo e seção ativa
  const handleScroll = useCallback(() => {
    const { scrollY, innerHeight } = window
    const totalHeight = document.documentElement.scrollHeight - innerHeight
    
    // Verifica se chegou ao final da página
    const isAtBottom = totalHeight <= 0 || innerHeight + scrollY >= document.documentElement.scrollHeight - 50
    
    const currentProgress = totalHeight > 0 ? (scrollY / totalHeight) * 100 : 100
    const rounded = isAtBottom ? 100 : Math.min(100, Math.round(currentProgress))

    // Atualiza progresso apenas se avançou
    setReadProgress(prev => {
      const next = Math.max(prev, rounded)
      try { localStorage.setItem(storageKey, String(next)) } catch { /* ignore error */ }
      return next
    })

    let currentIdx = 0
    if (isAtBottom) {
      currentIdx = doc.sections.length - 1
      setActiveSection(doc.sections[currentIdx].id)
    } else {
      // Detecta seção visível atual
      for (let i = doc.sections.length - 1; i >= 0; i--) {
        const el = document.getElementById(doc.sections[i].id)
        if (!el) continue
        if (el.getBoundingClientRect().top <= 120) {
          currentIdx = i
          setActiveSection(doc.sections[i].id)
          break
        }
      }
    }

    // Atualiza seção mais funda apenas se avançou
    setDeepestSectionIdx(prev => {
      const next = Math.max(prev, currentIdx)
      try { localStorage.setItem(`${storageKey}-section`, String(next)) } catch { /* ignore error */ }
      return next
    })
  }, [doc.sections, storageKey])

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [handleScroll])



  // Botão Voltar inteligente
  const handleBack = (e: React.MouseEvent) => {
    e.preventDefault()
    
    // 1. Se houver histórico na aba atual, volta (funciona se foi aberto na mesma aba)
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1)
      return
    }

    // 2. Se foi aberto em uma nova aba (sem histórico local), tentamos fechar a aba atual
    // para retornar o usuário à aba original onde ele estava preenchendo o formulário.
    const isNewTab = window.history.length === 1 || !window.history.state || window.history.state.idx === 0
    if (isNewTab) {
      try {
        window.close()
      } catch (err) {
        console.error("Erro ao tentar fechar a janela:", err)
      }
    }

    // 3. Caso o window.close() falhe ou seja bloqueado pelo navegador,
    // redirecionamos para a página de origem (referrer) se for do mesmo domínio,
    // ou usamos o backHref como último recurso.
    setTimeout(() => {
      const referrer = document.referrer
      if (referrer && referrer.startsWith(window.location.origin)) {
        const relativePath = referrer.replace(window.location.origin, '')
        navigate(relativePath)
      } else {
        navigate(backHref)
      }
    }, 150)
  }

  // Scroll suave para seção via window
  const handleIndexClick = (e: React.MouseEvent<HTMLAnchorElement>, sectionId: string) => {
    e.preventDefault()
    const target = document.getElementById(sectionId)
    if (!target) return

    const offsetTop = target.getBoundingClientRect().top + window.scrollY - 24
    window.scrollTo({ top: offsetTop, behavior: 'smooth' })
    setActiveSection(sectionId)

    // Atualiza a seção mais funda lida
    const clickedIdx = doc.sections.findIndex(s => s.id === sectionId)
    if (clickedIdx !== -1) {
      setDeepestSectionIdx(prev => {
        const next = Math.max(prev, clickedIdx)
        try { localStorage.setItem(`${storageKey}-section`, String(next)) } catch { /* ignore error */ }
        return next
      })

      // Se clicar no último item, marca progresso como 100%
      if (clickedIdx === doc.sections.length - 1) {
        setReadProgress(100)
        try { localStorage.setItem(storageKey, '100') } catch { /* ignore error */ }
      }
    }

    window.history.pushState(null, '', `#${sectionId}`)
  }

  return (
    <div className="bg-gray-50 dark:bg-gray-950 min-h-screen">
      {/* Progress bar de leitura */}
      <div className="fixed top-0 left-0 right-0 z-50 h-0.5 bg-gray-200 dark:bg-gray-800">
        <div
          className="h-full bg-[#00A86B] transition-all duration-150 ease-out"
          style={{ width: `${readProgress}%` }}
        />
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 max-w-6xl">

        {/* Header da página */}
        <div className="mb-8">
          <button
            onClick={handleBack}
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-[#00A86B] dark:hover:text-[#00A86B] transition-colors mb-6 bg-transparent border-none cursor-pointer focus:outline-none group"
          >
            <ArrowLeft size={15} className="transition-transform group-hover:-translate-x-0.5" />
            Voltar
          </button>

          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 pb-6 border-b border-gray-200 dark:border-gray-800">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-semibold uppercase tracking-widest text-[#00A86B]">
                  Documento Legal
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                {doc.title}
              </h1>
              <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-500 dark:text-gray-400">
                <span>Versão {doc.version}</span>
                <span className="text-gray-300 dark:text-gray-600">·</span>
                <span>Vigência: {formatDate(doc.effectiveDate)}</span>
                <span className="text-gray-300 dark:text-gray-600">·</span>
                <span>Atualizado em: {formatDate(doc.lastUpdated)}</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-full px-3 py-1.5 shrink-0">
              <Clock size={12} />
              <span>Leitura ~{readTime} min</span>
              <span className="mx-1 text-gray-300 dark:text-gray-700">·</span>
              <BookOpen size={12} />
              <span>{doc.sections.length} seções</span>
            </div>
          </div>
        </div>

        {/* Layout de duas colunas */}
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 items-start">

          {/* Sidebar — Índice */}
          <aside className="w-full lg:w-64 xl:w-72 flex-shrink-0 lg:sticky lg:top-4">
            <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden shadow-sm">
              <div className="px-4 pt-4 pb-2 border-b border-gray-100 dark:border-gray-800">
                <p className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">
                  Índice
                </p>
              </div>
              {/* Barra de progresso no índice */}
              <div className="h-0.5 bg-gray-100 dark:bg-gray-800">
                <div
                  className="h-full bg-[#00A86B]/60 transition-all duration-300"
                  style={{ width: `${readProgress}%` }}
                />
              </div>
              <nav className="p-2 max-h-[50vh] lg:max-h-[70vh] overflow-y-auto">
                {doc.sections.map((section, idx) => {
                  const isActive = activeSection === section.id
                  const isRead =
                    idx < deepestSectionIdx ||
                    (idx === doc.sections.length - 1 && deepestSectionIdx === doc.sections.length - 1) ||
                    readProgress === 100
                  const isCurrent = idx === deepestSectionIdx && !isActive && !isRead
                  return (
                    <a
                      key={section.id}
                      href={`#${section.id}`}
                      onClick={(e) => handleIndexClick(e, section.id)}
                      className={`flex items-center gap-2.5 text-sm px-3 py-2 rounded-lg transition-all duration-150 ${
                        isActive
                          ? 'bg-[#00A86B]/10 text-[#00A86B] font-semibold'
                          : isRead
                          ? 'text-[#00A86B]/70 dark:text-[#00A86B]/60 hover:bg-[#00A86B]/5 hover:text-[#00A86B]'
                          : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200'
                      }`}
                    >
                      {/* Número ou check */}
                      <span className={`w-5 text-center shrink-0 flex items-center justify-center transition-colors ${
                        isRead
                          ? 'text-[#00A86B]'
                          : isActive
                          ? 'text-[#00A86B]'
                          : 'text-gray-300 dark:text-gray-600'
                      }`}>
                        {isRead ? (
                          <svg viewBox="0 0 12 12" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="1.5,6 5,9.5 10.5,2.5" />
                          </svg>
                        ) : (
                          <span className="text-[10px] font-mono">{String(idx + 1).padStart(2, '0')}</span>
                        )}
                      </span>

                      <span className={`leading-snug flex-1 ${isRead ? 'line-through decoration-[#00A86B]/40' : ''}`}>
                        {section.title.replace(/^\d+\.\s/, '')}
                      </span>

                      {isActive && (
                        <span className="ml-auto w-1 h-4 rounded-full bg-[#00A86B] shrink-0" />
                      )}
                      {isCurrent && !isActive && (
                        <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#00A86B]/40 shrink-0" />
                      )}
                    </a>
                  )
                })}
              </nav>

              <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800">
                <div className="flex items-center justify-between text-xs text-gray-400 dark:text-gray-500">
                  <span>Progresso de leitura</span>
                  <span className="font-semibold text-[#00A86B]">{readProgress}%</span>
                </div>
                <div className="mt-1.5 h-1 rounded-full bg-gray-100 dark:bg-gray-800">
                  <div
                    className="h-full rounded-full bg-[#00A86B] transition-all duration-300"
                    style={{ width: `${readProgress}%` }}
                  />
                </div>
              </div>
            </div>
          </aside>

          <div
            className="flex-1 min-w-0 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm"
          >
            <div className="p-6 sm:p-8 xl:p-10">
              <LegalDocumentContent document={doc} showHeader={false} />
            </div>

            {/* Rodapé do documento */}
            <div className="mx-6 sm:mx-8 xl:mx-10 mb-8 pt-6 border-t border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <p className="text-xs text-gray-400 dark:text-gray-500">
                Versão {doc.version} · Vigência: {formatDate(doc.effectiveDate)}
              </p>
              <button
                onClick={handleBack}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#00A86B] hover:underline bg-transparent border-none cursor-pointer focus:outline-none group"
              >
                <ArrowLeft size={13} className="transition-transform group-hover:-translate-x-0.5" />
                Voltar
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
