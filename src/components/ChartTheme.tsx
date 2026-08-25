import React from 'react'

export interface CustomTooltipProps {
  active?: boolean
  payload?: any[]
  label?: string | number
  labelFormatter?: (label: any) => string
  formatter?: (value: any, name?: any, item?: any) => any
}

export const CustomChartTooltip: React.FC<CustomTooltipProps> = ({
  active,
  payload,
  label,
  labelFormatter,
  formatter,
}) => {
  if (!active || !payload || !payload.length) return null

  const formattedLabel = labelFormatter ? labelFormatter(label) : label

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-xl rounded-lg p-3 text-xs z-50 min-w-[150px] pointer-events-none">
      {formattedLabel !== undefined && formattedLabel !== null && formattedLabel !== '' && (
        <p className="font-bold text-gray-800 dark:text-gray-100 mb-2 pb-1 border-b border-gray-100 dark:border-gray-700">
          {formattedLabel}
        </p>
      )}
      <div className="space-y-1.5">
        {payload.map((item: any, idx: number) => {
          const color = item.color || item.fill || item.stroke || '#3b82f6'
          let displayName = item.name || item.dataKey || 'Valor'
          let displayVal = item.value

          if (formatter) {
            try {
              const formatted = formatter(item.value, displayName, item)
              if (Array.isArray(formatted)) {
                displayVal = formatted[0]
                if (formatted[1]) displayName = formatted[1]
              } else {
                displayVal = formatted
              }
            } catch {
              displayVal = item.value
            }
          } else if (typeof displayVal === 'number') {
            displayVal = displayVal.toLocaleString('pt-BR')
          }

          return (
            <div key={idx} className="flex items-center justify-between gap-3 text-gray-600 dark:text-gray-300">
              <div className="flex items-center gap-1.5 min-w-0">
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: color }}
                />
                <span className="truncate">{displayName}:</span>
              </div>
              <span className="font-bold text-gray-900 dark:text-white flex-shrink-0">
                {displayVal}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function renderChartLegend(value: string) {
  return (
    <span className="text-gray-700 dark:text-gray-300 font-medium text-xs ml-1 mr-2 inline-block">
      {value}
    </span>
  )
}

export const CHART_COLORS = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#14b8a6', // teal
]
