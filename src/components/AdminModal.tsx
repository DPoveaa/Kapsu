import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

interface AdminModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: ReactNode
  /** Width class — defaults to max-w-2xl */
  widthClass?: string
  /** Footer actions rendered in a sticky footer bar */
  footer?: ReactNode
}

/**
 * Modal genérico para formulários do portal do fornecedor.
 * - Fecha apenas com o botão X do header ou tecla Escape
 * - NÃO fecha ao clicar no backdrop (usuário não perde dados acidentalmente)
 * - Previne scroll do body quando aberto
 */
export default function AdminModal({
  isOpen,
  onClose,
  title,
  children,
  widthClass = 'max-w-2xl',
  footer,
}: AdminModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const closeBtnRef = useRef<HTMLButtonElement>(null)

  // Fecha apenas com Escape
  useEffect(() => {
    if (!isOpen) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [isOpen, onClose])

  // Bloqueia scroll do body quando aberto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      setTimeout(() => closeBtnRef.current?.focus(), 50)
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  if (!isOpen) return null

  return createPortal(
    /* Backdrop — NÃO fecha ao clicar fora */
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center p-3 sm:p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-modal-title"
    >
      {/* Painel */}
      <div
        ref={dialogRef}
        className={`relative w-full ${widthClass} bg-white dark:bg-gray-900 rounded-2xl shadow-2xl flex flex-col max-h-[95vh] sm:max-h-[90vh] border border-gray-200 dark:border-gray-700 animate-modal-in`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <h2
            id="admin-modal-title"
            className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white truncate pr-4"
          >
            {title}
          </h2>
          <button
            ref={closeBtnRef}
            onClick={onClose}
            className="flex-shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
            aria-label="Fechar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo com scroll */}
        <div className="flex-1 overflow-y-auto px-5 py-4 min-h-0">
          {children}
        </div>

        {/* Footer fixo opcional */}
        {footer && (
          <div className="flex-shrink-0 px-5 py-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-b-2xl">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}
