import { Copy, Check, Clock, Loader2, Smartphone } from 'lucide-react'

interface PixPaymentProps {
  pixQrCode?: string
  pixPayload?: string
  timeLeft?: string
  copied: boolean
  onCopy: () => void
  isGenerating?: boolean
  awaitingPayment?: boolean
}

export default function PixPayment({
  pixQrCode,
  pixPayload,
  timeLeft,
  copied,
  onCopy,
  isGenerating = false,
  awaitingPayment = false,
}: PixPaymentProps) {
  if (isGenerating) {
    return (
      <div className="flex flex-col items-center gap-3 py-10 animate-fade-in">
        <Loader2 className="w-8 h-8 animate-spin text-[#00A86B]" />
        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Gerando QR Code PIX...</p>
      </div>
    )
  }

  if (!pixQrCode && !pixPayload) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 animate-fade-in">
        <Smartphone className="w-8 h-8 text-gray-400" />
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
          O QR Code PIX será exibido aqui após a confirmação.
        </p>
      </div>
    )
  }

  return (
    <div className="animate-fade-in">
      {/* Timer */}
      {timeLeft && (
        <div className="flex items-center justify-center gap-2 mb-5">
          <Clock className="w-4 h-4 text-amber-500" />
          <span className="text-sm font-bold text-amber-600 dark:text-amber-400">
            Expira em <span className="tabular-nums">{timeLeft}</span>
          </span>
        </div>
      )}

      <div className="flex flex-col items-center gap-6">
        {/* QR Code */}
        {pixQrCode && (
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 inline-block">
            <img
              src={`data:image/png;base64,${pixQrCode}`}
              alt="QR Code PIX"
              className="w-44 h-44 block"
            />
          </div>
        )}

        {/* Instrução */}
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center max-w-xs">
          Escaneie o QR Code ou use o código abaixo no seu banco.
        </p>

        {/* Código copiável */}
        {pixPayload && (
          <div className="w-full max-w-sm space-y-2">
            <div
              className="relative bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-xs font-mono text-gray-500 dark:text-gray-400 overflow-hidden cursor-pointer select-all"
              title="Clique para copiar"
              onClick={onCopy}
            >
              <span className="block truncate pr-6">{pixPayload}</span>
            </div>
            <button
              type="button"
              onClick={onCopy}
              className={`w-full inline-flex items-center justify-center gap-2 font-bold py-3 px-5 rounded-xl transition-all duration-200 text-sm ${
                copied
                  ? 'bg-green-500 text-white scale-[0.98]'
                  : 'bg-[#00A86B] hover:bg-[#008A57] text-white'
              }`}
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? 'Código copiado!' : 'Copiar código PIX'}
            </button>
          </div>
        )}

        {/* Badge aguardando */}
        {awaitingPayment && (
          <div className="inline-flex items-center gap-2 text-amber-700 dark:text-amber-400 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            Aguardando confirmação do pagamento
          </div>
        )}
      </div>
    </div>
  )
}
