import { Copy, Check, Download, ExternalLink, FileText, Loader2 } from 'lucide-react'

interface BoletoPaymentProps {
  bankSlipUrl?: string
  identificationField?: string
  dueDate?: string
  copied: boolean
  onCopy: () => void
  isGenerating?: boolean
  onBoletoOpen?: () => void
}

export default function BoletoPayment({
  bankSlipUrl,
  identificationField,
  dueDate,
  copied,
  onCopy,
  isGenerating = false,
  onBoletoOpen,
}: BoletoPaymentProps) {
  if (isGenerating) {
    return (
      <div className="flex flex-col items-center gap-3 py-10 animate-fade-in">
        <Loader2 className="w-8 h-8 animate-spin text-[#00A86B]" />
        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Gerando boleto...</p>
      </div>
    )
  }

  if (!bankSlipUrl && !identificationField) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 animate-fade-in">
        <FileText className="w-8 h-8 text-gray-400" />
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
          O boleto será exibido aqui após a confirmação.
        </p>
      </div>
    )
  }

  const formattedDue = dueDate
    ? new Date(dueDate + 'T12:00:00').toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
    : null

  return (
    <div className="animate-fade-in space-y-5">
      {/* Vencimento */}
      {formattedDue && (
        <div className="flex items-center justify-center gap-2 text-sm">
          <span className="text-gray-500 dark:text-gray-400">Vencimento:</span>
          <span className="font-bold text-gray-800 dark:text-gray-100">{formattedDue}</span>
        </div>
      )}

      {/* Linha digitável */}
      {identificationField && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide text-center">
            Linha digitável
          </p>
          <div
            className="bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-xs font-mono text-gray-600 dark:text-gray-300 break-all cursor-pointer"
            onClick={onCopy}
            title="Clique para copiar"
          >
            {identificationField}
          </div>
          <button
            type="button"
            onClick={onCopy}
            className={`w-full inline-flex items-center justify-center gap-2 font-bold py-3 px-5 rounded-xl transition-all duration-200 text-sm ${
              copied
                ? 'bg-green-500 text-white scale-[0.98]'
                : 'bg-gray-800 dark:bg-gray-700 hover:bg-gray-900 dark:hover:bg-gray-600 text-white'
            }`}
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
            {copied ? 'Código copiado!' : 'Copiar linha digitável'}
          </button>
        </div>
      )}

      {/* Botão de download do PDF */}
      {bankSlipUrl && (
        <a
          href={bankSlipUrl}
          target="_blank"
          rel="noreferrer"
          onClick={() => onBoletoOpen?.()}
          className="w-full inline-flex items-center justify-center gap-2 bg-[#00A86B] hover:bg-[#008A57] text-white font-bold py-3 px-5 rounded-xl transition-colors text-sm"
        >
          <Download size={16} />
          Abrir boleto em PDF
          <ExternalLink size={13} className="opacity-70" />
        </a>
      )}

      {/* Aviso de prazo */}
      <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
        O pagamento pode levar até <strong>3 dias úteis</strong> para ser confirmado após o pagamento.
      </p>
    </div>
  )
}
