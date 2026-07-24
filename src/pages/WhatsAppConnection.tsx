import { useEffect, useRef, useState } from 'react';
import { Building2, CheckCircle2, Link2, Loader2, MessageCircle, Phone, Plus, QrCode, RefreshCw, Send, Trash2, Unplug, UserRound } from 'lucide-react';
import { whatsappService, WhatsAppStatus } from '../services/whatsapp.service';
import { adminService, Supplier } from '../services/admin.service';
import { toast } from '../utils/toast';

interface OperationalNumber {
  id: string;
  phone: string;
  name: string | null;
  supplierId: string | null;
  supplierName: string | null;
  userId: string | null;
  userEmail: string | null;
  isActive: boolean;
}

interface ContactUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  active: boolean;
  supplierId: string | null;
  supplierName: string | null;
}

const formatPhone = (value: string) => {
  const digits = value.replace(/\D/g, '');
  if (digits.length === 13 && digits.startsWith('55')) return `+55 (${digits.slice(2, 4)}) ${digits.slice(4, 9)}-${digits.slice(9)}`;
  return `+${digits}`;
};

export default function WhatsAppConnection() {
  const [status, setStatus] = useState<WhatsAppStatus | null>(null);
  const [qrCode, setQrCode] = useState('');
  const [qrAction, setQrAction] = useState<'initialize' | 'regenerate' | null>(null);
  const qrRequestRef = useRef(0);
  const [loadingConnection, setLoadingConnection] = useState(true);
  const [numbers, setNumbers] = useState<OperationalNumber[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [contactUsers, setContactUsers] = useState<ContactUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingNumbers, setLoadingNumbers] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingTarget, setTestingTarget] = useState<string | null>(null);
  const [form, setForm] = useState({ supplierId: '', userId: '', name: '', phone: '' });

  useEffect(() => {
    loadConnection();
    loadNumbers();
    loadSuppliers();
  }, []);

  useEffect(() => {
    if (!status || status.connected) return;
    const timer = window.setInterval(loadConnection, 3000);
    return () => window.clearInterval(timer);
  }, [status?.connected]);

  useEffect(() => {
    if (!form.supplierId) {
      setContactUsers([]);
      return;
    }

    let cancelled = false;
    setLoadingUsers(true);
    whatsappService.getUsersWithPhone(form.supplierId)
      .then(users => {
        if (!cancelled) setContactUsers(users);
      })
      .catch((error: Error) => {
        if (!cancelled) toast.error('Erro ao carregar usuários: ' + error.message);
      })
      .finally(() => {
        if (!cancelled) setLoadingUsers(false);
      });

    return () => { cancelled = true; };
  }, [form.supplierId]);

  const loadConnection = async () => {
    try {
      const result = await whatsappService.getStatus();
      setStatus(result);
      if (result.qrCode) setQrCode(result.qrCode);
      if (!result.connected && !result.qrCode && result.status === 'QRCODE_GENERATED') {
        const qrResult = await whatsappService.getQRCode();
        if (qrResult.qrCode) setQrCode(qrResult.qrCode);
      }
    } catch (error: any) {
      setStatus({ success: false, connected: false, status: 'DISCONNECTED', message: error.message });
    } finally {
      setLoadingConnection(false);
    }
  };

  const waitForQRCode = async (requestId: number) => {
    const deadline = Date.now() + 70000;

    while (Date.now() < deadline && qrRequestRef.current === requestId) {
      const result = await whatsappService.getQRCode();
      setStatus(result);

      if (result.connected) {
        setQrCode('');
        return result;
      }

      if (result.qrCode) {
        setQrCode(result.qrCode);
        return result;
      }

      await new Promise(resolve => window.setTimeout(resolve, 1000));
    }

    throw new Error('O QR Code não foi gerado dentro do tempo esperado. Tente renovar ou desconectar a sessão anterior.');
  };

  const loadNumbers = async () => {
    try {
      setLoadingNumbers(true);
      setNumbers(await whatsappService.getDistributorNumbers());
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoadingNumbers(false);
    }
  };

  const loadSuppliers = async () => {
    try {
      const result = await adminService.listSuppliers(1, 100);
      setSuppliers(result.suppliers || []);
      if (result.suppliers?.length === 1) setForm(current => ({ ...current, supplierId: result.suppliers[0].id }));
    } catch (error: any) {
      toast.error('Erro ao carregar fornecedores: ' + error.message);
    }
  };

  const initialize = async () => {
    const requestId = ++qrRequestRef.current;
    try {
      setQrAction('initialize');
      setQrCode('');
      const result = await whatsappService.initialize();
      setStatus(result);
      const finalResult = result.connected || result.qrCode ? result : await waitForQRCode(requestId);
      if (finalResult.qrCode) setQrCode(finalResult.qrCode);
      toast.success(finalResult.connected ? 'WhatsApp conectado.' : 'QR Code pronto para leitura.');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      if (qrRequestRef.current === requestId) setQrAction(null);
    }
  };

  const regenerate = async () => {
    const requestId = ++qrRequestRef.current;
    try {
      setQrAction('regenerate');
      const result = await whatsappService.regenerateQRCode();
      setStatus(result);
      const finalResult = result.connected || result.qrCode ? result : await waitForQRCode(requestId);
      if (finalResult.qrCode) setQrCode(finalResult.qrCode);
      toast.success(finalResult.connected ? 'WhatsApp conectado.' : 'QR Code renovado.');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      if (qrRequestRef.current === requestId) setQrAction(null);
    }
  };

  const disconnect = async () => {
    if (!window.confirm('Desconectar a sessão operacional do WhatsApp?')) return;
    try {
      qrRequestRef.current += 1;
      setQrAction(null);
      setLoadingConnection(true);
      const result = await whatsappService.disconnect();
      setStatus(result);
      setQrCode('');
      toast.success('WhatsApp desconectado.');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoadingConnection(false);
    }
  };

  const addNumber = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.supplierId || form.phone.replace(/\D/g, '').length < 10) {
      toast.error('Selecione o fornecedor e informe um telefone válido.');
      return;
    }
    try {
      setSaving(true);
      await whatsappService.addDistributorNumber(form.phone, form.userId || undefined, form.name.trim() || undefined, form.supplierId);
      setForm(current => ({ ...current, userId: '', name: '', phone: '' }));
      await loadNumbers();
      toast.success('Destinatário cadastrado para o fornecedor.');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const removeNumber = async (id: string) => {
    if (!window.confirm('Remover este destinatário?')) return;
    try {
      await whatsappService.removeDistributorNumber(id);
      await loadNumbers();
      toast.success('Destinatário removido.');
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const selectContactUser = (userId: string) => {
    const user = contactUsers.find(item => item.id === userId);
    setForm(current => ({
      ...current,
      userId,
      name: user?.name || '',
      phone: user?.phone || '',
    }));
  };

  const testNotification = async (numberId?: string) => {
    try {
      setTestingTarget(numberId || 'all');
      const result = await whatsappService.sendTestDistributorMessage('✅ Teste de notificação operacional da Kapsu. Este número está configurado para receber novos pedidos do fornecedor.', numberId);
      toast.success(result.message || 'Mensagem de teste enviada.');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setTestingTarget(null);
    }
  };

  const connected = Boolean(status?.connected);
  const qrSource = qrCode ? (qrCode.startsWith('data:') ? qrCode : `data:image/png;base64,${qrCode}`) : '';

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-5 dark:border-gray-800">
        <h1 className="flex items-center gap-3 text-2xl font-bold text-gray-900 dark:text-white"><MessageCircle className="h-7 w-7 text-emerald-600" /> WhatsApp operacional</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Canal usado somente para avisar fornecedores sobre novos pedidos. A IA atende exclusivamente pelo chat flutuante do site.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[360px_1fr]">
        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <div className="flex items-center justify-between"><h2 className="font-bold text-gray-900 dark:text-white">Conexão</h2><span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${connected ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300' : 'border-gray-200 bg-gray-100 text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300'}`}>{connected ? 'Conectado' : qrAction ? 'Gerando QR Code' : qrSource ? 'Aguardando leitura' : 'Desconectado'}</span></div>
          {loadingConnection ? <div className="flex h-56 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-emerald-600" /></div> : connected ? (
            <div className="mt-5 space-y-4"><div className="flex flex-col items-center rounded-2xl bg-emerald-50 p-8 text-center dark:bg-emerald-950/30"><CheckCircle2 className="h-12 w-12 text-emerald-600" /><div className="mt-3 font-semibold text-emerald-800 dark:text-emerald-200">Sessão pronta para notificações</div></div><button onClick={disconnect} className="flex w-full items-center justify-center gap-2 rounded-xl border border-rose-200 px-4 py-2.5 text-sm font-semibold text-rose-700 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-300 dark:hover:bg-rose-950/30"><Unplug className="h-4 w-4" /> Desconectar</button></div>
          ) : qrSource ? (
            <div className="mt-5 space-y-4 text-center"><img src={qrSource} alt="QR Code do WhatsApp" className={`mx-auto h-56 w-56 rounded-xl border border-gray-200 bg-white p-2 ${qrAction === 'regenerate' ? 'opacity-40' : ''}`} /><p className="text-xs text-gray-500">No WhatsApp, abra Aparelhos conectados e leia o QR Code.</p><button disabled={qrAction !== null} onClick={regenerate} className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-semibold disabled:cursor-wait disabled:opacity-60 dark:border-gray-600">{qrAction === 'regenerate' ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} {qrAction === 'regenerate' ? 'Renovando QR Code...' : 'Renovar QR Code'}</button></div>
          ) : (
            <div className="mt-5 space-y-4"><div className="flex flex-col items-center rounded-2xl bg-gray-50 p-8 text-center dark:bg-gray-800">{qrAction === 'initialize' ? <Loader2 className="h-12 w-12 animate-spin text-emerald-600" /> : <QrCode className="h-12 w-12 text-gray-400" />}<p className="mt-3 text-sm text-gray-500">{qrAction === 'initialize' ? 'Inicializando o WhatsApp e aguardando o QR Code...' : 'Inicie uma sessão para gerar o QR Code.'}</p></div><button disabled={qrAction !== null} onClick={initialize} className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-wait disabled:opacity-70">{qrAction === 'initialize' && <Loader2 className="h-4 w-4 animate-spin" />}{qrAction === 'initialize' ? 'Gerando QR Code...' : 'Conectar WhatsApp'}</button></div>
          )}
        </section>

        <section className="space-y-4">
          <div className="rounded-2xl border border-blue-200 bg-blue-50/60 p-4 text-xs text-blue-800 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-200"><div className="flex gap-2"><Link2 className="h-4 w-4 flex-none" /><p>Cada telefone recebe somente pedidos vinculados ao seu fornecedor. A mensagem inclui produtos, endereço, método de envio e link direto para abrir o pedido após o login.</p></div></div>

          <form onSubmit={addNumber} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
            <h2 className="flex items-center gap-2 font-bold text-gray-900 dark:text-white"><Plus className="h-4 w-4 text-primary-600" /> Adicionar destinatário</h2>
            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
              <label className="space-y-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300">
                Fornecedor
                <select
                  required
                  value={form.supplierId}
                  onChange={event => setForm({ supplierId: event.target.value, userId: '', name: '', phone: '' })}
                  className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm font-normal dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                >
                  <option value="">Selecione o fornecedor</option>
                  {suppliers.map(supplier => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.trade_name || supplier.name}{supplier.active ? '' : ' (inativo)'}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300">
                Preencher com usuário cadastrado (opcional)
                <select
                  value={form.userId}
                  disabled={!form.supplierId || loadingUsers}
                  onChange={event => selectContactUser(event.target.value)}
                  className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm font-normal disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                >
                  <option value="">{loadingUsers ? 'Carregando usuários...' : 'Contato preenchido manualmente'}</option>
                  {contactUsers.map(user => (
                    <option key={user.id} value={user.id} disabled={!user.active}>
                      {user.name} · {user.email}{user.active ? '' : ' (inativo)'}
                    </option>
                  ))}
                </select>
              </label>
              <input value={form.name} onChange={event => setForm({ ...form, userId: '', name: event.target.value })} placeholder="Nome do contato" className="rounded-xl border border-gray-300 px-3 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white" />
              <input required value={form.phone} onChange={event => setForm({ ...form, userId: '', phone: event.target.value })} placeholder="WhatsApp com DDD" className="rounded-xl border border-gray-300 px-3 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white" />
            </div>
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <button type="button" disabled={!connected || testingTarget !== null || numbers.length === 0} onClick={() => testNotification()} className="inline-flex items-center gap-2 rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold disabled:opacity-40 dark:border-gray-600">
                {testingTarget === 'all' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Testar todos
              </button>
              <button type="submit" disabled={saving} className="rounded-xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? 'Salvando...' : 'Adicionar'}</button>
            </div>
          </form>

          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
            <div className="border-b border-gray-200 px-5 py-4 dark:border-gray-700"><h2 className="font-bold text-gray-900 dark:text-white">Destinatários por fornecedor</h2></div>
            {loadingNumbers ? <div className="flex justify-center p-10"><Loader2 className="h-5 w-5 animate-spin" /></div> : numbers.length === 0 ? <div className="p-10 text-center text-sm text-gray-500">Nenhum telefone configurado.</div> : (
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {numbers.map(number => (
                  <div key={number.id} className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40"><Phone className="h-5 w-5" /></div>
                      <div className="min-w-0">
                        <div className="truncate font-semibold text-gray-900 dark:text-white">{number.name || 'Contato operacional'}</div>
                        <div className="text-xs text-gray-500">{formatPhone(number.phone)}</div>
                        {number.userId && <div className="mt-1 flex items-center gap-1 truncate text-xs text-violet-600 dark:text-violet-300"><UserRound className="h-3 w-3 flex-none" /> {number.userEmail || 'Usuário vinculado'}</div>}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                      <span className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300"><Building2 className="h-3.5 w-3.5" /> {number.supplierName || 'Sem fornecedor vinculado'}</span>
                      <button disabled={!connected || testingTarget !== null} onClick={() => testNotification(number.id)} title="Testar somente este contato" className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 px-2.5 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-40 dark:border-emerald-800 dark:text-emerald-300 dark:hover:bg-emerald-950/30">
                        {testingTarget === number.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Testar
                      </button>
                      <button onClick={() => removeNumber(number.id)} title="Remover" className="rounded-lg p-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
