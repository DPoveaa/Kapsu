/**
 * Rótulos em português para exibição de status de pedido.
 * O banco pode conter códigos do Asaas (RECEIVED_IN_CASH, etc.) — sempre traduzir aqui.
 */
const ORDER_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Aguardando pagamento',
  AWAITING_PAYMENT: 'Aguardando pagamento',
  OVERDUE: 'Pagamento vencido',
  CONFIRMED: 'Pago',
  RECEIVED: 'Pago',
  RECEIVED_IN_CASH: 'Pago',
  PAID: 'Pago',
  APPROVED: 'Pago',
  AUTHORIZED: 'Pago',
  PROCESSING: 'Preparação',
  DISTRIBUTOR_INFORMED: 'Preparação',
  READY_FOR_SHIPPING: 'Pronto para Envio',
  SHIPPED: 'Enviado',
  DELIVERED: 'Entregue',
  CANCELLED: 'Cancelado',
  REFUNDED: 'Reembolsado',
  REFUND_REQUESTED: 'Reembolso solicitado',
  REFUND_IN_PROGRESS: 'Reembolso em andamento',
  CHARGEBACK_REQUESTED: 'Contestação',
  CHARGEBACK_DISPUTE: 'Contestação em análise',
  AWAITING_CHARGEBACK_REVERSAL: 'Aguardando reversão',
  AWAITING_RISK_ANALYSIS: 'Análise de risco',
  DUNNING_REQUESTED: 'Cobrança solicitada',
  DUNNING_RECEIVED: 'Cobrança recebida',
};

export function getOrderStatusLabel(status: string | null | undefined): string {
  if (!status) return 'Desconhecido';
  const key = status.toUpperCase();
  return ORDER_STATUS_LABELS[key] || status;
}

export function getOrderStatusBadgeClass(status: string): string {
  const key = status.toUpperCase();
  switch (key) {
    case 'PENDING':
    case 'AWAITING_PAYMENT':
    case 'OVERDUE':
    case 'AWAITING_RISK_ANALYSIS':
    case 'DUNNING_REQUESTED':
    case 'DUNNING_RECEIVED':
      return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300';
    case 'CONFIRMED':
    case 'RECEIVED':
    case 'RECEIVED_IN_CASH':
    case 'PAID':
    case 'APPROVED':
    case 'AUTHORIZED':
      return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300';
    case 'PROCESSING':
    case 'DISTRIBUTOR_INFORMED':
      return 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300';
    case 'READY_FOR_SHIPPING':
      return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300';
    case 'SHIPPED':
      return 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300';
    case 'DELIVERED':
      return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300';
    case 'CANCELLED':
    case 'REFUNDED':
    case 'CHARGEBACK_REQUESTED':
    case 'CHARGEBACK_DISPUTE':
      return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300';
    default:
      return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300';
  }
}

/** Status considerados "pagos" para exibição de NF, polling PIX, etc. */
export const PAID_ORDER_STATUS_CODES = [
  'CONFIRMED',
  'RECEIVED',
  'RECEIVED_IN_CASH',
  'PAID',
  'APPROVED',
  'AUTHORIZED',
] as const;

export function isPaidOrderStatus(status: string | null | undefined): boolean {
  if (!status) return false;
  return (PAID_ORDER_STATUS_CODES as readonly string[]).includes(status.toUpperCase());
}

export const INVOICE_ELIGIBLE_STATUS_CODES = [
  ...PAID_ORDER_STATUS_CODES,
  'PROCESSING',
  'DISTRIBUTOR_INFORMED',
  'READY_FOR_SHIPPING',
  'SHIPPED',
  'DELIVERED',
] as const;

export function isInvoiceEligibleStatus(status: string | null | undefined): boolean {
  if (!status) return false;
  return (INVOICE_ELIGIBLE_STATUS_CODES as readonly string[]).includes(status.toUpperCase());
}
