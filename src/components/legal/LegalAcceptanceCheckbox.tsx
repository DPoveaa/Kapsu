import { Link } from 'react-router-dom'

interface LegalAcceptanceCheckboxProps {
  checked: boolean
  onChange: (checked: boolean) => void
  error?: string
  id?: string
}

export default function LegalAcceptanceCheckbox({
  checked,
  onChange,
  error,
  id = 'legal-acceptance',
}: LegalAcceptanceCheckboxProps) {
  return (
    <div>
      <label
        htmlFor={id}
        className="flex items-start gap-3 cursor-pointer group"
      >
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="mt-1 h-4 w-4 rounded border-gray-300 text-[#00A86B] focus:ring-[#00A86B] cursor-pointer flex-shrink-0"
        />
        <span className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed font-normal">
          Li e aceito os{' '}
          <Link
            to="/termos-de-servico"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#00A86B] font-semibold hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00A86B] rounded"
          >
            Termos de Serviço
          </Link>{' '}
          e a{' '}
          <Link
            to="/politica-de-privacidade"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#00A86B] font-semibold hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00A86B] rounded"
          >
            Política de Privacidade
          </Link>
          .
        </span>
      </label>
      {error && (
        <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  )
}

