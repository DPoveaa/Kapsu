import { env } from '../config/env';

const API_URL = env.apiUrl;

export interface SupplierProfileResponse {
  success: boolean;
  data: {
    user: {
      id: string;
      name: string;
      email: string;
      username?: string | null;
      phone?: string | null;
      role: 'supplier_admin' | 'supplier_employee' | 'admin';
      supplier_id: string | null;
      permissions: string[];
      active: boolean;
      must_change_password?: boolean;
    };
    supplier: {
      id: string;
      name: string;
      trade_name?: string | null;
      cnpj?: string | null;
      email?: string | null;
      phone?: string | null;
      address?: string | null;
      active: boolean;
    } | null;
  };
}

export interface SupplierOrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  description?: string | null;
  compositions?: string | null;
  indication?: string | null;
  contraindication?: string | null;
  benefits?: string | null;
  intended_form?: string | null;
  intended_presentation?: string | null;
  intended_units_per_dose?: string | null;
  capsule_color_preference?: string | null;
  total_doses?: number | null;
  quantity: number;
  price?: number;
  purchase_price?: number;
}

export interface SupplierOrder {
  id: string;
  supplier_id?: string | null;
  supplier_name?: string | null;
  user_id: string;
  client_name: string;
  client_email: string;
  client_phone?: string | null;
  client_address?: string | null;
  status: string;
  shipping_address?: string | null;
  shipping_method?: string | null;
  shipping_postal_code?: string | null;
  shipping_street?: string | null;
  shipping_number?: string | null;
  shipping_complement?: string | null;
  shipping_neighborhood?: string | null;
  shipping_city?: string | null;
  shipping_state?: string | null;
  tracking_code?: string | null;
  tracking_url?: string | null;
  shipping_carrier?: string | null;
  shipped_at?: string | null;
  shipping_notes?: string | null;
  cancellation_reason?: string | null;
  assigned_to_user_id?: string | null;
  assignee_name?: string | null;
  ml_pickup_deadline?: string | null;
  invoice_url?: string | null;
  shipping_label_url?: string | null;
  invoice_number?: string | null;
  total?: number;
  items: SupplierOrderItem[];
  created_at: string;
  updated_at: string;
}

export interface SupplierOrdersResponse {
  success: boolean;
  data: SupplierOrder[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface FinancialDashboardResponse {
  success: boolean;
  data: {
    soldToday: number;
    soldThisWeek: number;
    soldThisMonth: number;
    totalPaid: number;
    outstandingAmount: number;
    totalOrdersMonth: number;
    totalUnitsMonth: number;
    customPeriod?: {
      totalCost: number;
      orderCount: number;
      totalUnits: number;
    } | null;
    chartData: Array<{
      date: string;
      cost: number;
      orders: number;
    }>;
  };
}

export interface SupplierFinancialMetrics {
  totalRevenue: number;
  paidAmount: number;
  pendingAmount: number;
  totalOrders: number;
  totalItemsSold: number;
  dailyChart: Array<{
    date: string;
    revenue: number;
    orders: number;
  }>;
}

export interface SupplierSettlementOrderItem {
  productId: string;
  productName: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
}

export interface SupplierSettlementOrder {
  id: string;
  status: string;
  createdAt: string;
  paymentMethod?: string | null;
  customerName: string;
  customerEmail?: string | null;
  amount: number;
  items: SupplierSettlementOrderItem[];
}

export interface SupplierSettlementCycle {
  id: string;
  periodStart: string;
  periodEnd: string;
  dueDate: string;
  isCurrent: boolean;
  amount: number;
  paidAmount: number;
  balance: number;
  status: 'PAID' | 'PARTIAL' | 'DUE' | 'ACCRUING' | 'EMPTY';
  orders: SupplierSettlementOrder[];
  payments: Array<{ id: string; amount: number; paymentDate: string; paymentMethod?: string | null }>;
}

export interface SupplierSettlementOverview {
  supplier: { id: string; name: string; tradeName?: string | null };
  configuration: {
    frequency: 'WEEKLY' | 'MONTHLY';
    payoutWeekday: number;
    payoutMonthDay: number;
    timezone: string;
    ruleDescription: string;
  };
  summary: {
    totalSalesAmount: number;
    totalPaid: number;
    outstandingAmount: number;
    dueAmount: number;
    currentAccruedAmount: number;
    currentOrderCount: number;
    unallocatedCredit: number;
  };
  cycles: SupplierSettlementCycle[];
}

export interface SupplierPayment {
  id: string;
  amount: number;
  status: 'PAID' | 'PENDING' | 'PROCESSING';
  payment_date: string;
  payment_method?: string | null;
  period_start?: string | null;
  period_end?: string | null;
  description?: string | null;
  related_order_ids?: string[] | string | null;
  receipt_file_path?: string | null;
  created_at: string;
}

export interface SupplierAuditLog {
  id: string;
  user_email?: string | null;
  user_role?: string | null;
  action: string;
  resource: string;
  resource_id?: string | null;
  result: string;
  created_at?: string;
  timestamp?: string;
}

export interface SupplierUser {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
  permissions?: string[] | string;
}

class SupplierService {
  private baseUrl = `${API_URL}/supplier`;

  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('kapsu_token');
    return {
      'Authorization': token ? `Bearer ${token}` : '',
      'Content-Type': 'application/json',
    };
  }

  /**
   * Perfil do fornecedor logado
   */
  async getProfile(): Promise<SupplierProfileResponse> {
    const response = await fetch(`${this.baseUrl}/profile`, {
      headers: this.getAuthHeaders(),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Erro ao buscar perfil do fornecedor');
    return data;
  }

  /**
   * Pedidos do fornecedor
   */
  async getOrders(params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    date_start?: string;
    date_end?: string;
    tracking_status?: string;
    assigned_to?: string;
    shipping_method?: string;
    sort?: 'newest' | 'oldest';
  }): Promise<SupplierOrdersResponse> {
    const query = new URLSearchParams();
    if (params.page) query.append('page', params.page.toString());
    if (params.limit) query.append('limit', params.limit.toString());
    if (params.search) query.append('search', params.search);
    if (params.status) query.append('status', params.status);
    if (params.date_start) query.append('date_start', params.date_start);
    if (params.date_end) query.append('date_end', params.date_end);
    if (params.tracking_status) query.append('tracking_status', params.tracking_status);
    if (params.assigned_to) query.append('assigned_to', params.assigned_to);
    if (params.shipping_method) query.append('shipping_method', params.shipping_method);
    if (params.sort) query.append('sort', params.sort);

    const response = await fetch(`${this.baseUrl}/orders?${query.toString()}`, {
      headers: this.getAuthHeaders(),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Erro ao buscar pedidos');
    return data;
  }

  /**
   * Detalhes de um pedido para o fornecedor
   */
  async getOrderById(id: string): Promise<{ success: boolean; data: SupplierOrder }> {
    const response = await fetch(`${this.baseUrl}/orders/${id}`, {
      headers: this.getAuthHeaders(),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Erro ao buscar detalhes do pedido');
    return data;
  }

  /**
   * Atualização de status de um pedido
   */
  async updateOrderStatus(id: string, status: string, cancellationReason?: string): Promise<{ success: boolean; message: string }> {
    const response = await fetch(`${this.baseUrl}/orders/${id}/status`, {
      method: 'PATCH',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ status, cancellation_reason: cancellationReason }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Erro ao atualizar status do pedido');
    return data;
  }

  /**
   * Atualização de rastreamento do envio
   */
  async updateOrderTracking(id: string, payload: {
    tracking_code?: string;
    tracking_url?: string;
    shipping_carrier?: string;
    shipping_notes?: string;
    update_status_to_shipped?: boolean;
  }): Promise<{ success: boolean; message: string; data?: { emailSent: boolean } }> {
    const response = await fetch(`${this.baseUrl}/orders/${id}/tracking`, {
      method: 'PATCH',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Erro ao atualizar rastreamento');
    return data;
  }

  /**
   * Atribui pedido a um funcionário
   */
  async assignOrder(id: string, assigned_to_user_id: string | null): Promise<{ success: boolean; message: string }> {
    const response = await fetch(`${this.baseUrl}/orders/${id}/assign`, {
      method: 'PATCH',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ assigned_to_user_id }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Erro ao atribuir pedido');
    return data;
  }

  /**
   * Dashboard financeiro de produção (SUPPLIER_ADMIN)
   */
  async getDashboardMetrics(params: number | { days?: number; startDate?: string; endDate?: string } = 30): Promise<{ success: boolean; data: SupplierFinancialMetrics }> {
    const query = new URLSearchParams();
    if (typeof params === 'number') {
      query.set('days', String(params));
    } else {
      if (params.days) query.set('days', String(params.days));
      if (params.startDate) query.set('startDate', params.startDate);
      if (params.endDate) query.set('endDate', params.endDate);
    }
    const response = await fetch(`${this.baseUrl}/financial/dashboard?${query.toString()}`, {
      headers: this.getAuthHeaders(),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Erro ao buscar dashboard financeiro');
    return data;
  }

  async getSettlementOverview(): Promise<{ success: boolean; data: SupplierSettlementOverview }> {
    const response = await fetch(`${this.baseUrl}/financial/settlements`, {
      headers: this.getAuthHeaders(),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Erro ao calcular repasses');
    return data;
  }

  /**
   * Histórico de pagamentos e comprovantes
   */
  async getPaymentHistory(page: number = 1, limit: number = 20, status?: string): Promise<{ success: boolean; data: SupplierPayment[]; pagination: any }> {
    const query = new URLSearchParams({ page: page.toString(), limit: limit.toString() });
    if (status) query.append('status', status);

    const response = await fetch(`${this.baseUrl}/payments?${query.toString()}`, {
      headers: this.getAuthHeaders(),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Erro ao buscar repasses');
    return data;
  }

  async getPayments(): Promise<{ success: boolean; data: SupplierPayment[] }> {
    const response = await fetch(`${this.baseUrl}/payments`, {
      headers: this.getAuthHeaders(),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Erro ao buscar comprovantes de pagamento');
    return data;
  }

  /**
   * Retorna URL autenticada do comprovante
   */
  getReceiptUrl(paymentId: string): string {
    const token = localStorage.getItem('kapsu_token') || '';
    return `${this.baseUrl}/payments/${paymentId}/receipt?token=${encodeURIComponent(token)}`;
  }

  /**
   * Usuários da equipe do fornecedor
   */
  async getUsers(): Promise<{ success: boolean; data: SupplierUser[] }> {
    const response = await fetch(`${this.baseUrl}/users`, {
      headers: this.getAuthHeaders(),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Erro ao listar usuários');
    return data;
  }

  async listUsers(): Promise<{ success: boolean; data: SupplierUser[] }> {
    return this.getUsers();
  }

  /**
   * Criação de usuário para o próprio fornecedor
   */
  async createUser(payload: {
    name: string;
    email: string;
    password?: string;
    role: string;
    permissions?: string[];
  }): Promise<{ success: boolean; message: string; data: any }> {
    const response = await fetch(`${this.baseUrl}/users`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Erro ao criar usuário');
    return data;
  }

  /**
   * Atualização de usuário da equipe
   */
  async updateUser(id: string, payload: {
    name?: string;
    email?: string;
    password?: string;
    role?: string;
    permissions?: string[];
    active?: boolean;
  }): Promise<{ success: boolean; message: string }> {
    const response = await fetch(`${this.baseUrl}/users/${id}`, {
      method: 'PATCH',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Erro ao atualizar usuário');
    return data;
  }

  /**
   * Atualização do perfil do usuário e/ou empresa parceira
   */
  async updateProfile(payload: {
    user?: { name?: string; email?: string; phone?: string; password?: string };
    supplier?: { name?: string; trade_name?: string; cnpj?: string; email?: string; phone?: string; address?: string };
  }): Promise<{ success: boolean; message: string }> {
    const response = await fetch(`${this.baseUrl}/profile`, {
      method: 'PATCH',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Erro ao atualizar perfil');
    return data;
  }

  /**
   * Audit logs da organização
   */
  async getAuditLogs(page: number = 1, limit: number = 10, search: string = ''): Promise<{ success: boolean; data: any[]; pagination: any }> {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (search.trim()) params.set('search', search.trim());
    const response = await fetch(`${this.baseUrl}/audit-logs?${params.toString()}`, {
      headers: this.getAuthHeaders(),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Erro ao buscar logs de auditoria');
    return data;
  }
}

export const supplierService = new SupplierService();
