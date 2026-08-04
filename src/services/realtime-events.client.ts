type FiscalInvoiceUpdatedCallback = (data: { type: string; orderId: string; status: string }) => void;

class RealtimeEventsClient {
  private eventSource: EventSource | null = null;
  private listeners: Set<FiscalInvoiceUpdatedCallback> = new Set();
  private reconnectTimer: any = null;

  connect(): void {
    if (this.eventSource) return;

    try {
      const apiHost = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const sseUrl = `${apiHost.replace(/\/$/, '')}/api/events/sse`;

      this.eventSource = new EventSource(sseUrl);

      this.eventSource.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          if (parsed && parsed.type === 'fiscal_invoice_updated') {
            console.log(`📡 [SSE Client] Recebido evento fiscal_invoice_updated para order ${parsed.orderId} (status: ${parsed.status})`);
            this.listeners.forEach((callback) => callback(parsed));
          }
        } catch (err) {
          console.warn('[SSE Client] Erro ao parsear mensagem SSE:', err);
        }
      };

      this.eventSource.onerror = () => {
        console.warn('[SSE Client] Conexão SSE falhou. Tentando reconectar em 5 segundos...');
        this.disconnect();
        this.reconnectTimer = setTimeout(() => {
          this.connect();
        }, 5000);
      };
    } catch (err) {
      console.warn('[SSE Client] Erro ao inicializar EventSource:', err);
    }
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }

  subscribe(callback: FiscalInvoiceUpdatedCallback): () => void {
    this.connect();
    this.listeners.add(callback);

    return () => {
      this.listeners.delete(callback);
      if (this.listeners.size === 0) {
        this.disconnect();
      }
    };
  }
}

export const realtimeEventsClient = new RealtimeEventsClient();
