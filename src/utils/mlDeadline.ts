export type MlDeadlineState = 'ok' | 'warning' | 'urgent' | 'overdue' | 'fulfilled' | null

const FULFILLED_SHIPPING_STATUSES = new Set(['SHIPPED', 'DELIVERED'])

export const parseMlDeadline = (deadline: string): Date | null => {
  const dateOnly = deadline.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  const parsed = dateOnly
    ? new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]), 23, 59, 59, 999)
    : new Date(deadline)

  return Number.isNaN(parsed.getTime()) ? null : parsed
}

export const getMlDeadlineState = (
  deadline: string | null | undefined,
  orderStatus?: string | null,
  now = new Date(),
): MlDeadlineState => {
  if (!deadline) return null

  const parsedDeadline = parseMlDeadline(deadline)
  if (!parsedDeadline) return null

  if (FULFILLED_SHIPPING_STATUSES.has((orderStatus || '').toUpperCase())) {
    return 'fulfilled'
  }

  const deadlineDay = new Date(
    parsedDeadline.getFullYear(),
    parsedDeadline.getMonth(),
    parsedDeadline.getDate(),
  )
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const differenceInDays = Math.round(
    (deadlineDay.getTime() - today.getTime()) / (24 * 60 * 60 * 1000),
  )

  if (differenceInDays < 0) return 'overdue'
  if (differenceInDays === 0) return 'urgent'
  if (differenceInDays <= 2) return 'warning'
  return 'ok'
}

export const getMlDeadlineLabel = (
  state: MlDeadlineState,
  orderStatus?: string | null,
): string => {
  if (state === 'overdue') return '⚠ Vencido '
  if (state === 'fulfilled') {
    return (orderStatus || '').toUpperCase() === 'DELIVERED'
      ? '✓ Entregue · prazo '
      : '✓ Enviado · prazo '
  }
  return 'Envio até '
}
