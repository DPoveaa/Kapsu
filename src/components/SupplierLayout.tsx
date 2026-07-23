import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  ShoppingBag,
  DollarSign,
  Users,
  ShieldCheck,
  LogOut,
  Menu,
  X,
  Building2,
  Loader2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  Eye,
  EyeOff,
} from 'lucide-react';
import { supplierService, SupplierProfileResponse } from '../services/supplier.service';
import { useTheme } from '../context/ThemeContext';
import AnimatedLogo from './AnimatedLogo';

// ---- Toast helpers ----
type ToastType = 'success' | 'error' | 'info';
function showToast(msg: string, type: ToastType = 'info') {
  const color =
    type === 'success' ? '#00A86B' :
      type === 'error' ? '#dc2626' : '#007A4E';
  const el = document.createElement('div');
  el.textContent = msg;
  Object.assign(el.style, {
    position: 'fixed',
    bottom: '24px',
    right: '24px',
    background: color,
    color: '#fff',
    padding: '12px 20px',
    borderRadius: '12px',
    fontFamily: 'inherit',
    fontSize: '14px',
    fontWeight: '500',
    zIndex: '9999',
    boxShadow: '0 8px 30px rgba(0,0,0,0.25)',
    maxWidth: '360px',
    lineHeight: '1.4',
    transition: 'opacity 0.3s',
  });
  document.body.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; }, 3000);
  setTimeout(() => { el.remove(); }, 3400);
}

// ---- Types ----
type ProfileData = NonNullable<SupplierProfileResponse['data']>;

// ---- Nav items ----
const NAV = [
  { label: 'Pedidos de Manipulação', path: '/supplier/orders', Icon: ShoppingBag, perm: null },
  { label: 'Painel Financeiro', path: '/supplier/dashboard', Icon: LayoutDashboard, perm: 'financial:read' },
  { label: 'Histórico de Repasses', path: '/supplier/payments', Icon: DollarSign, perm: 'payments:read' },
  { label: 'Equipe de Operadores', path: '/supplier/users', Icon: Users, perm: 'users:manage' },
  { label: 'Configurações', path: '/supplier/profile', Icon: Building2, perm: null },
  { label: 'Registros & Auditoria', path: '/supplier/audit', Icon: ShieldCheck, perm: 'audit:read' },
];

export default function SupplierLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Onboarding (primeiro acesso — senha temporária)
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [obForm, setObForm] = useState({ email: '', password: '', confirm: '' });
  const [obSaving, setObSaving] = useState(false);
  const [showObPassword, setShowObPassword] = useState(false);
  const [showObConfirm, setShowObConfirm] = useState(false);

  useEffect(() => { fetchProfile(); }, []);

  const fetchProfile = async () => {
    try {
      setPageLoading(true);
      const res = await supplierService.getProfile();
      if (res.success && res.data) {
        setProfile(res.data);
        const u = res.data.user;
        const isTempEmail = !u.email || u.email.endsWith('@kapsu.local');
        const needsOnboarding = Boolean(u.must_change_password);
        if (needsOnboarding) {
          setShowOnboarding(true);
          setObForm(f => ({ ...f, email: isTempEmail ? '' : (u.email ?? '') }));
        } else {
          setShowOnboarding(false);
        }
      }
    } catch { /* silent */ }
    finally { setPageLoading(false); }
  };

  const handleOnboardingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!obForm.email.trim()) { showToast('Informe um e-mail válido.', 'error'); return; }
    if (obForm.password.length < 6) { showToast('A senha deve ter pelo menos 6 caracteres.', 'error'); return; }
    if (obForm.password !== obForm.confirm) { showToast('As senhas não coincidem.', 'error'); return; }
    try {
      setObSaving(true);
      const res = await supplierService.updateProfile({
        user: { email: obForm.email.trim(), password: obForm.password },
      });
      if (res.success) {
        showToast('Primeiro acesso concluído! Conta ativada com sucesso.', 'success');
        setShowOnboarding(false);
        await fetchProfile();
      }
    } catch (err: any) {
      showToast(err?.message || 'Erro ao salvar credenciais.', 'error');
    } finally {
      setObSaving(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('kapsu_token');
    localStorage.removeItem('kapsu_user');
    navigate('/login');
  };

  const isAdmin = profile?.user?.role === 'supplier_admin' || profile?.user?.role === 'admin';
  const perms = profile?.user?.permissions ?? [];
  const visibleNav = NAV.filter(n => !n.perm || isAdmin || perms.includes(n.perm));

  const supplierName = profile?.supplier?.trade_name || profile?.supplier?.name || 'Fornecedor';
  const userName = profile?.user?.name || 'Operador';
  const supplierInitial = supplierName.charAt(0).toUpperCase();

  // ─── Sidebar Content ────────────────────────────────────────────────────────
  function SidebarContent({ isMobile = false }: { isMobile?: boolean }) {
    const isCollapsed = collapsed && !isMobile;

    return (
      <>
        {/* Logo Kapsu */}
        <div
          className={`flex items-center gap-3 px-4 py-4 border-b border-gray-200 dark:border-gray-800 ${isCollapsed ? 'justify-center px-2' : ''
            }`}
        >
          <AnimatedLogo
            className={`transition-all duration-300 ${isCollapsed ? 'w-8 h-8' : 'w-9 h-9'
              }`}
          />
          {!isCollapsed && (
            <div>
              <span className="font-bold text-gray-900 dark:text-white text-sm tracking-tight">
                Kapsu
              </span>
              <span className="block text-[10px] text-primary-600 dark:text-primary-400 font-medium -mt-0.5">
                Portal do Fornecedor
              </span>
            </div>
          )}

          {isMobile && (
            <button
              onClick={() => setMobileOpen(false)}
              className="ml-auto p-1.5 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Info do Fornecedor */}
        {!isCollapsed && (
          <div className="px-4 py-3 bg-primary-50 dark:bg-primary-950/40 border-b border-primary-100 dark:border-primary-900/60 flex items-center gap-3">
            <div className="w-9 h-9 flex-shrink-0 rounded-xl bg-primary-100 dark:bg-primary-900/60 border border-primary-200 dark:border-primary-800/60 flex items-center justify-center text-primary-700 dark:text-primary-300 font-bold text-base select-none">
              {supplierInitial}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate leading-tight">
                {supplierName}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {userName}
              </p>
            </div>
          </div>
        )}

        {isCollapsed && (
          <div className="flex justify-center py-3 border-b border-gray-200 dark:border-gray-800">
            <div className="w-9 h-9 rounded-xl bg-primary-100 dark:bg-primary-900/60 border border-primary-200 dark:border-primary-800/60 flex items-center justify-center text-primary-700 dark:text-primary-300 font-bold text-base select-none">
              {supplierInitial}
            </div>
          </div>
        )}

        {/* Navegação */}
        <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
          {visibleNav.map(({ label, path, Icon }) => {
            const active = location.pathname === path;
            return (
              <Link
                key={path}
                to={path}
                onClick={() => isMobile && setMobileOpen(false)}
                title={isCollapsed ? label : undefined}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all group ${active
                  ? 'bg-primary-50 dark:bg-primary-950/60 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-800/60'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100'
                  } ${isCollapsed ? 'justify-center px-2' : ''}`}
              >
                <Icon
                  className={`w-4 h-4 flex-shrink-0 transition-colors ${active
                    ? 'text-primary-600 dark:text-primary-400'
                    : 'text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-200'
                    }`}
                />
                {!isCollapsed && <span>{label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Rodapé: Toggle Tema + Logout */}
        <div className={`border-t border-gray-200 dark:border-gray-800 px-2 py-3 space-y-1`}>
          {/* Toggle Tema */}
          <button
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
            className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white transition-all ${isCollapsed ? 'justify-center px-2' : ''
              }`}
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 flex-shrink-0 text-amber-500" />
            ) : (
              <Moon className="w-4 h-4 flex-shrink-0 text-slate-500 dark:text-slate-400" />
            )}
            {!isCollapsed && (
              <span>{theme === 'dark' ? 'Tema Claro' : 'Tema Escuro'}</span>
            )}
          </button>

          {/* Logout */}
          <button
            onClick={handleLogout}
            title={isCollapsed ? 'Encerrar Sessão' : undefined}
            className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-rose-50 dark:hover:bg-rose-950/50 hover:text-rose-700 dark:hover:text-rose-400 transition-all ${isCollapsed ? 'justify-center px-2' : ''
              }`}
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            {!isCollapsed && <span>Encerrar Sessão</span>}
          </button>
        </div>
      </>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex">

      {/* ── Sidebar Desktop ─────────────────────────────────────────────────── */}
      <aside
        className={`hidden md:flex flex-col flex-shrink-0 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 min-h-screen sticky top-0 z-20 transition-all duration-300 ${collapsed ? 'w-[68px]' : 'w-60'
          }`}
      >
        {/* Botão Colapsar (flutuante na borda) */}
        <button
          onClick={() => setCollapsed(c => !c)}
          className="absolute -right-3.5 top-6 z-30 w-7 h-7 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 shadow-md transition hover:scale-110"
          title={collapsed ? 'Expandir menu' : 'Recolher menu'}
        >
          {collapsed
            ? <ChevronRight className="w-3.5 h-3.5" />
            : <ChevronLeft className="w-3.5 h-3.5" />
          }
        </button>

        <SidebarContent />
      </aside>

      {/* ── Mobile Overlay ──────────────────────────────────────────────────── */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-gray-900/60 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        >
          <div
            className="w-64 h-full bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <SidebarContent isMobile />
          </div>
        </div>
      )}

      {/* ── Área Principal ──────────────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 min-w-0">

        {/* Header Mobile */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-30">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2">
            <AnimatedLogo className="w-7 h-7" />
            <span className="font-bold text-gray-900 dark:text-white text-sm">Kapsu</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
            >
              {theme === 'dark'
                ? <Sun className="w-4 h-4 text-amber-500" />
                : <Moon className="w-4 h-4 text-slate-500" />
              }
            </button>
            <div className="w-8 h-8 rounded-xl bg-primary-100 dark:bg-primary-900/60 border border-primary-200 dark:border-primary-800/60 flex items-center justify-center text-primary-700 dark:text-primary-300 font-bold text-sm">
              {supplierInitial}
            </div>
          </div>
        </header>

        {/* Conteúdo da Página */}
        <main className="flex-1 p-4 md:p-8">
          {pageLoading ? (
            <div className="flex items-center justify-center min-h-[50vh] gap-3 text-gray-500 dark:text-gray-400">
              <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
              <span className="text-sm">Carregando portal do fornecedor...</span>
            </div>
          ) : (
            <Outlet />
          )}
        </main>
      </div>

      {/* ── Modal de Primeiro Acesso ─────────────────────────────────────────── */}
      {showOnboarding && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }}
        // NÃO fecha ao clicar fora — usuário deve completar o onboarding
        >
          <div className="w-full max-w-md bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl p-6 md:p-8 space-y-6">

            {/* Header */}
            <div className="text-center space-y-3">
              <AnimatedLogo className="w-14 h-14 mx-auto" forceSleeping={showObPassword || showObConfirm} />
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                Bem-vindo ao Portal Kapsu
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Você acessou com credenciais temporárias.
                <br /> Defina seu e-mail e uma senha segura para continuar.
              </p>
            </div>

            <form onSubmit={handleOnboardingSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  E-mail *
                </label>
                <input
                  type="email"
                  required
                  placeholder="voce@suafarmacia.com.br"
                  value={obForm.email}
                  onChange={e => setObForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Nova Senha *
                </label>
                <div className="relative">
                  <input
                    type={showObPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    placeholder="Mínimo 6 caracteres"
                    value={obForm.password}
                    onChange={e => setObForm(f => ({ ...f, password: e.target.value }))}
                    className="w-full px-3.5 py-2.5 pr-10 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => setShowObPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition p-1"
                    tabIndex={-1}
                  >
                    {showObPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Confirmar Senha *
                </label>
                <div className="relative">
                  <input
                    type={showObConfirm ? 'text' : 'password'}
                    required
                    placeholder="Repita a nova senha"
                    value={obForm.confirm}
                    onChange={e => setObForm(f => ({ ...f, confirm: e.target.value }))}
                    className="w-full px-3.5 py-2.5 pr-10 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => setShowObConfirm(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition p-1"
                    tabIndex={-1}
                  >
                    {showObConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={obSaving}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-primary-600 hover:bg-primary-700 active:bg-primary-800 disabled:opacity-50 text-white font-semibold text-sm transition shadow-sm"
              >
                {obSaving
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <CheckCircle2 className="w-4 h-4" />
                }
                {obSaving ? 'Ativando Conta...' : 'Concluir Ativação'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
