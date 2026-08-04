export interface AdminAccessItem {
  path: string
  title: string
  category: string
  iconName: string
  description: string
  timestamp: number
}

export const ADMIN_PAGES_META: Record<string, { title: string; category: string; iconName: string; description: string }> = {
  '/admin/products': {
    title: 'Produtos',
    category: 'Catálogo',
    iconName: 'Package',
    description: 'Gerencie o catálogo de produtos, preços e estoques.',
  },
  '/admin/header-categories': {
    title: 'Categorias',
    category: 'Catálogo',
    iconName: 'Menu',
    description: 'Organize as categorias do menu superior.',
  },
  '/admin/orders': {
    title: 'Pedidos',
    category: 'Vendas',
    iconName: 'ShoppingCart',
    description: 'Acompanhe vendas, clientes e status das entregas.',
  },
  '/admin/notas-fiscais': {
    title: 'Notas Fiscais',
    category: 'Vendas',
    iconName: 'FileText',
    description: 'Controle e exportação contábil de NF-e autorizadas e canceladas.',
  },
  '/admin/shipping': {
    title: 'Frete',
    category: 'Vendas',
    iconName: 'Truck',
    description: 'Configure regras e valores de frete por CEP.',
  },
  '/admin/promotions': {
    title: 'Promoções',
    category: 'Vendas',
    iconName: 'Gift',
    description: 'Crie campanhas e ofertas promocionais ativas.',
  },
  '/admin/promo-codes': {
    title: 'Cupons',
    category: 'Vendas',
    iconName: 'Tag',
    description: 'Gerencie cupons de desconto e válidos.',
  },
  '/admin/installment-rules': {
    title: 'Parcelas sem Juros',
    category: 'Vendas',
    iconName: 'CreditCard',
    description: 'Defina limites e regras de parcelamento da loja.',
  },
  '/admin/banners': {
    title: 'Banners',
    category: 'Vitrine',
    iconName: 'Image',
    description: 'Personalize os destaques visuais da loja.',
  },
  '/admin/home-sections': {
    title: 'Página Inicial',
    category: 'Vitrine',
    iconName: 'Layout',
    description: 'Configure seções e vitrines da home.',
  },
  '/admin/reviews': {
    title: 'Avaliações',
    category: 'Vitrine',
    iconName: 'Star',
    description: 'Modere opiniões e avaliações de clientes.',
  },
  '/admin/ai': {
    title: 'Central da IA',
    category: 'Sistema',
    iconName: 'Bot',
    description: 'Configure prompts e aprendizado da Kaia IA.',
  },
  '/admin/whatsapp': {
    title: 'WhatsApp',
    category: 'Sistema',
    iconName: 'MessageSquare',
    description: 'Conecte o canal de atendimento e suporte via WhatsApp.',
  },
  '/admin/users': {
    title: 'Usuários',
    category: 'Sistema',
    iconName: 'Users',
    description: 'Gerencie contas de clientes e permissões de admin.',
  },
  '/admin/suppliers': {
    title: 'Fornecedores',
    category: 'Sistema',
    iconName: 'Globe',
    description: 'Cadastre e gerencie fornecedores parceiros.',
  },
  '/admin/supplier-payments': {
    title: 'Pagamentos Fornecedor',
    category: 'Sistema',
    iconName: 'CreditCard',
    description: 'Acompanhe faturamento e repasses para fornecedores.',
  },
  '/admin/audit': {
    title: 'Auditoria',
    category: 'Sistema',
    iconName: 'ShieldCheck',
    description: 'Histórico de ações e segurança da plataforma.',
  },
  '/admin/reports': {
    title: 'Relatórios',
    category: 'Sistema',
    iconName: 'BarChart3',
    description: 'Métricas de desempenho, vendas e conversão.',
  },
  '/admin/google-sheets': {
    title: 'Google Sheets',
    category: 'Sistema',
    iconName: 'Globe',
    description: 'Integrações com planilhas externas.',
  },
  '/admin/settings': {
    title: 'Configurações',
    category: 'Sistema',
    iconName: 'Settings',
    description: 'Ajustes gerais da loja e dados institucionais.',
  },
}

const STORAGE_KEY = 'kapsu_recent_admin_accesses'

export function getRecentAdminAccesses(): AdminAccessItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
  } catch {
    return []
  }
}

export function recordAdminAccess(pathname: string): void {
  // Procura rota exata ou por prefixo (ex: /admin/products/edit/123 -> /admin/products)
  let metaKey = Object.keys(ADMIN_PAGES_META).find(k => pathname === k || (k !== '/admin' && pathname.startsWith(`${k}/`)))
  
  if (!metaKey) return
  
  const meta = ADMIN_PAGES_META[metaKey]
  if (!meta) return

  const current = getRecentAdminAccesses()
  const filtered = current.filter(item => item.path !== metaKey)

  const newItem: AdminAccessItem = {
    path: metaKey,
    title: meta.title,
    category: meta.category,
    iconName: meta.iconName,
    description: meta.description,
    timestamp: Date.now(),
  }

  const updated = [newItem, ...filtered].slice(0, 10)
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  } catch (err) {
    console.error('Erro ao salvar acessos recentes do admin:', err)
  }
}

export function clearRecentAdminAccesses(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
}

export function formatTimeAgo(timestamp: number): string {
  const diffMs = Date.now() - timestamp
  const diffMinutes = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMinutes < 1) return 'Agora mesmo'
  if (diffMinutes < 60) return `Há ${diffMinutes} min`
  if (diffHours < 24) return `Há ${diffHours} h`
  if (diffDays === 1) return 'Ontem'
  return `Há ${diffDays} dias`
}
