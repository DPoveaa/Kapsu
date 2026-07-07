import { Calendar, Loader2, Truck } from 'lucide-react'

interface ShippingCardProps {
  service: string | null
  deliveryTime: number | null
  deliveryTimeType: 'business' | 'calendar' | null
  estimatedDateFormatted: string
  shippingFee: number | null
  hasFreeShipping: boolean
  calculatingShipping: boolean
  hasInvalidCep: boolean
}

export default function ShippingCard({
  service,
  deliveryTime,
  deliveryTimeType,
  estimatedDateFormatted,
  shippingFee,
  hasFreeShipping,
  calculatingShipping,
  hasInvalidCep,
}: ShippingCardProps) {
  if (hasInvalidCep) {
    return (
      <div className="rounded-2xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20 p-4">
        <p className="text-sm font-semibold text-red-700 dark:text-red-400">
          Não entregamos neste CEP no momento. Verifique o endereço ou entre em contato.
        </p>
      </div>
    )
  }

  if (calculatingShipping) {
    return (
      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 p-5 flex items-center gap-3">
        <Loader2 className="w-5 h-5 animate-spin text-[#00A86B]" />
        <span className="text-sm text-gray-600 dark:text-gray-300 font-semibold">Calculando frete...</span>
      </div>
    )
  }

  if (shippingFee === null && !hasFreeShipping) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-300 dark:border-gray-600 p-5 text-center">
        <p className="text-sm text-gray-500 dark:text-gray-400">Informe um CEP válido para calcular o frete.</p>
      </div>
    )
  }

  return (
    <div
      className={`rounded-2xl border p-4 sm:p-5 transition-all animate-fade-in ${
        hasFreeShipping
          ? 'border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/10'
          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div
            className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
              hasFreeShipping
                ? 'bg-green-100 dark:bg-green-900/30 text-green-600'
                : 'bg-primary-50 dark:bg-primary-900/20 text-primary-600'
            }`}
          >
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <p className="font-bold text-gray-900 dark:text-white text-sm sm:text-base">
              {service || 'Entrega padrão'}
            </p>
            {deliveryTime != null && deliveryTimeType && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {deliveryTime}{' '}
                {deliveryTimeType === 'business'
                  ? deliveryTime === 1
                    ? 'dia útil'
                    : 'dias úteis'
                  : deliveryTime === 1
                    ? 'dia corrido'
                    : 'dias corridos'}
                {estimatedDateFormatted ? ` • ${estimatedDateFormatted}` : ''}
              </p>
            )}
          </div>
        </div>

        <div className="text-right flex-shrink-0">
          {hasFreeShipping ? (
            <span className="text-sm font-black text-green-600 dark:text-green-400">Grátis</span>
          ) : shippingFee != null ? (
            <span className="text-sm font-black text-gray-900 dark:text-white">
              R$ {shippingFee.toFixed(2).replace('.', ',')}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  )
}
