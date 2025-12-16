import { useEffect, useState } from 'react'
import { BarChart3, Users, Eye, Calendar, Clock, TrendingDown, MousePointer, ArrowRight, Package, DollarSign, TrendingUp, XCircle, CheckCircle, AlertCircle, Truck, ShoppingCart } from 'lucide-react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { adminService } from '../services/admin.service'
import OrdersStatsTab from './ReportsOrdersTab'
import ShippingStatsTab from './ReportsShippingTab'
import PromoCodesStatsTab from './ReportsPromoCodesTab'
import PromotionsStatsTab from './ReportsPromotionsTab'
import UsersStatsTab from './ReportsUsersTab'
import ProductsStatsTab from './ReportsProductsTab'
import WhatsAppStatsTab from './ReportsWhatsAppTab'
import ChatStatsTab from './ReportsChatTab'
import WhatsAppHumanSupportStatsTab from './ReportsWhatsAppHumanSupportTab'

interface SiteAccessStats {
  totalSessions: number
  totalPageViews: number
  uniqueVisitors: number
  uniqueIPs: number
  uniqueAuthenticatedUsers: number
  avgPageViewsPerSession: number
}

interface ChartDataPoint {
  date: string
  total: number
  unique: number
}

interface BehaviorAnalytics {
  topPages: Array<{ path: string; views: number; avgTime: number; bounceRate: number }>
  avgSessionDuration: number
  bounceRate: number
  totalSessions: number
  bouncedSessions: number
  topEntryPages: Array<{ path: string; count: number }>
  topExitPages: Array<{ path: string; count: number }>
  eventCounts: Record<string, number>
  timeDistribution: Array<{ range: string; count: number }>
  funnelData: Array<{ path: string; views: number }>
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

export default function Reports() {
  const [stats, setStats] = useState<SiteAccessStats | null>(null)
  const [chartData, setChartData] = useState<ChartDataPoint[]>([])
  const [behaviorAnalytics, setBehaviorAnalytics] = useState<BehaviorAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [behaviorLoading, setBehaviorLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'behavior' | 'orders' | 'shipping' | 'promoCodes' | 'promotions' | 'users' | 'products' | 'whatsapp' | 'chat' | 'whatsappHumanSupport'>('overview')
  const [ordersStats, setOrdersStats] = useState<any>(null)
  const [ordersLoading, setOrdersLoading] = useState(true)
  const [shippingStats, setShippingStats] = useState<any>(null)
  const [shippingLoading, setShippingLoading] = useState(true)
  const [promoCodesStats, setPromoCodesStats] = useState<any>(null)
  const [promoCodesLoading, setPromoCodesLoading] = useState(true)
  const [promotionsStats, setPromotionsStats] = useState<any>(null)
  const [promotionsLoading, setPromotionsLoading] = useState(true)
  const [usersStats, setUsersStats] = useState<any>(null)
  const [usersLoading, setUsersLoading] = useState(true)
  const [productsStats, setProductsStats] = useState<any>(null)
  const [productsLoading, setProductsLoading] = useState(true)
  const [whatsappStats, setWhatsappStats] = useState<any>(null)
  const [whatsappLoading, setWhatsappLoading] = useState(true)
  const [chatStats, setChatStats] = useState<any>(null)
  const [chatLoading, setChatLoading] = useState(true)
  const [whatsappHumanSupportStats, setWhatsappHumanSupportStats] = useState<any>(null)
  const [whatsappHumanSupportLoading, setWhatsappHumanSupportLoading] = useState(true)
  const [groupBy, setGroupBy] = useState<'hour' | 'day' | 'week' | 'month'>('day')
  const [startDate, setStartDate] = useState<string>(() => {
    const date = new Date()
    date.setDate(date.getDate() - 30)
    return date.toISOString().split('T')[0]
  })
  const [endDate, setEndDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0]
  })

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await adminService.getSiteAccessStats({
        startDate,
        endDate,
        groupBy,
      })
      setStats(data.statistics)
      setChartData(data.chartData)
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar dados')
      console.error('Erro ao carregar estatísticas:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchBehaviorData = async () => {
    try {
      setBehaviorLoading(true)
      const data = await adminService.getBehaviorAnalytics({
        startDate,
        endDate,
      })
      setBehaviorAnalytics(data.analytics)
    } catch (err: any) {
      console.error('Erro ao carregar analytics de comportamento:', err)
    } finally {
      setBehaviorLoading(false)
    }
  }

  const fetchOrdersData = async () => {
    try {
      setOrdersLoading(true)
      const data = await adminService.getOrdersStatistics({
        startDate,
        endDate,
      })
      setOrdersStats(data.data)
    } catch (err: any) {
      console.error('Erro ao carregar estatísticas de pedidos:', err)
    } finally {
      setOrdersLoading(false)
    }
  }

  const fetchShippingData = async () => {
    try {
      setShippingLoading(true)
      const data = await adminService.getShippingStatistics({
        startDate,
        endDate,
      })
      setShippingStats(data.data)
    } catch (err: any) {
      console.error('Erro ao carregar estatísticas de frete:', err)
    } finally {
      setShippingLoading(false)
    }
  }

  const fetchPromoCodesData = async () => {
    try {
      setPromoCodesLoading(true)
      const data = await adminService.getPromoCodesStatistics({
        startDate,
        endDate,
      })
      setPromoCodesStats(data.data)
    } catch (err: any) {
      console.error('Erro ao carregar estatísticas de cupons:', err)
    } finally {
      setPromoCodesLoading(false)
    }
  }

  const fetchPromotionsData = async () => {
    try {
      setPromotionsLoading(true)
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/e988c133-ebfb-40bc-adab-44a1b42085d2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Reports.tsx:152',message:'fetchPromotionsData called',data:{startDate,endDate},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      const data = await adminService.getPromotionsStatistics({
        startDate,
        endDate,
      })
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/e988c133-ebfb-40bc-adab-44a1b42085d2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Reports.tsx:159',message:'data received from service',data:{hasData:!!data,hasDataData:!!data.data,dataDataType:typeof data.data,dataDataKeys:data.data?Object.keys(data.data):'no data.data'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      setPromotionsStats(data.data)
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/e988c133-ebfb-40bc-adab-44a1b42085d2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Reports.tsx:160',message:'promotionsStats set',data:{dataDataKeys:data.data?Object.keys(data.data):'no data.data'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
    } catch (err: any) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/e988c133-ebfb-40bc-adab-44a1b42085d2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Reports.tsx:161',message:'fetchPromotionsData error',data:{errorMessage:err.message,error:err.toString()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      console.error('Erro ao carregar estatísticas de promoções:', err)
    } finally {
      setPromotionsLoading(false)
    }
  }

  const fetchUsersData = async () => {
    try {
      setUsersLoading(true)
      const data = await adminService.getUsersStatistics({
        startDate,
        endDate,
      })
      setUsersStats(data.data)
    } catch (err: any) {
      console.error('Erro ao carregar estatísticas de usuários:', err)
    } finally {
      setUsersLoading(false)
    }
  }

  const fetchProductsData = async () => {
    try {
      setProductsLoading(true)
      const data = await adminService.getProductsStatistics({
        startDate,
        endDate,
      })
      setProductsStats(data.data)
    } catch (err: any) {
      console.error('Erro ao carregar estatísticas de produtos:', err)
    } finally {
      setProductsLoading(false)
    }
  }

  const fetchWhatsAppData = async () => {
    try {
      setWhatsappLoading(true)
      const data = await adminService.getWhatsAppStatistics({
        startDate,
        endDate,
      })
      setWhatsappStats(data.data)
    } catch (err: any) {
      console.error('Erro ao carregar estatísticas de WhatsApp:', err)
    } finally {
      setWhatsappLoading(false)
    }
  }

  const fetchChatData = async () => {
    try {
      setChatLoading(true)
      const data = await adminService.getChatStatistics({
        startDate,
        endDate,
      })
      setChatStats(data.data)
    } catch (err: any) {
      console.error('Erro ao carregar estatísticas de chat:', err)
    } finally {
      setChatLoading(false)
    }
  }

  const fetchWhatsAppHumanSupportData = async () => {
    try {
      setWhatsappHumanSupportLoading(true)
      const data = await adminService.getWhatsAppHumanSupportStatistics({
        startDate,
        endDate,
      })
      setWhatsappHumanSupportStats(data.data)
    } catch (err: any) {
      console.error('Erro ao carregar estatísticas de atendimento humano:', err)
    } finally {
      setWhatsappHumanSupportLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    fetchBehaviorData()
    if (activeTab === 'orders') {
      fetchOrdersData()
    }
    if (activeTab === 'shipping') {
      fetchShippingData()
    }
    if (activeTab === 'promoCodes') {
      fetchPromoCodesData()
    }
    if (activeTab === 'promotions') {
      fetchPromotionsData()
    }
    if (activeTab === 'users') {
      fetchUsersData()
    }
    if (activeTab === 'products') {
      fetchProductsData()
    }
    if (activeTab === 'whatsapp') {
      fetchWhatsAppData()
    }
    if (activeTab === 'chat') {
      fetchChatData()
    }
    if (activeTab === 'whatsappHumanSupport') {
      fetchWhatsAppHumanSupportData()
    }
  }, [groupBy, startDate, endDate, activeTab])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    switch (groupBy) {
      case 'hour':
        return date.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
      case 'day':
        return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
      case 'week':
        return `Sem ${date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`
      case 'month':
        return date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })
      default:
        return dateString
    }
  }

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`
    const minutes = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${minutes}m ${secs}s`
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Relatórios</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-300">Estatísticas de acesso e comportamento dos usuários</p>
        </div>

        {/* Filtros */}
        <div className="bg-white dark:bg-[#065084] rounded-lg shadow-md dark:shadow-lg p-6 mb-6 border border-gray-200 dark:border-[#0F828C]">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-white mb-2">
                Data Inicial
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-[#0F828C] dark:bg-[#065084] dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-white mb-2">
                Data Final
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-[#0F828C] dark:bg-[#065084] dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-white mb-2">
                Agrupar Por
              </label>
              <select
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value as 'hour' | 'day' | 'week' | 'month')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-[#0F828C] dark:bg-[#065084] dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="hour">Hora</option>
                <option value="day">Dia</option>
                <option value="week">Semana</option>
                <option value="month">Mês</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => {
                  fetchData()
                  fetchBehaviorData()
                }}
                className="w-full px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                Atualizar
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white dark:bg-[#065084] rounded-lg shadow-md dark:shadow-lg mb-6 border border-gray-200 dark:border-[#0F828C]">
          <div className="border-b border-gray-200 dark:border-[#0F828C]">
            <nav className="flex -mb-px overflow-x-auto">
              <button
                onClick={() => setActiveTab('overview')}
                className={`py-4 px-6 text-sm font-medium border-b-2 whitespace-nowrap ${
                  activeTab === 'overview'
                    ? 'border-indigo-500 dark:border-indigo-400 text-indigo-600 dark:text-indigo-400'
                    : 'border-transparent text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-white hover:border-gray-300 dark:hover:border-[#0F828C]'
                }`}
              >
                Visão Geral
              </button>
              <button
                onClick={() => setActiveTab('behavior')}
                className={`py-4 px-6 text-sm font-medium border-b-2 whitespace-nowrap ${
                  activeTab === 'behavior'
                    ? 'border-indigo-500 dark:border-indigo-400 text-indigo-600 dark:text-indigo-400'
                    : 'border-transparent text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-white hover:border-gray-300 dark:hover:border-[#0F828C]'
                }`}
              >
                Comportamento
              </button>
              <button
                onClick={() => setActiveTab('orders')}
                className={`py-4 px-6 text-sm font-medium border-b-2 whitespace-nowrap ${
                  activeTab === 'orders'
                    ? 'border-indigo-500 dark:border-indigo-400 text-indigo-600 dark:text-indigo-400'
                    : 'border-transparent text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-white hover:border-gray-300 dark:hover:border-[#0F828C]'
                }`}
              >
                Pedidos
              </button>
              <button
                onClick={() => setActiveTab('shipping')}
                className={`py-4 px-6 text-sm font-medium border-b-2 whitespace-nowrap ${
                  activeTab === 'shipping'
                    ? 'border-indigo-500 dark:border-indigo-400 text-indigo-600 dark:text-indigo-400'
                    : 'border-transparent text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-white hover:border-gray-300 dark:hover:border-[#0F828C]'
                }`}
              >
                Frete
              </button>
              <button
                onClick={() => setActiveTab('promoCodes')}
                className={`py-4 px-6 text-sm font-medium border-b-2 whitespace-nowrap ${
                  activeTab === 'promoCodes'
                    ? 'border-indigo-500 dark:border-indigo-400 text-indigo-600 dark:text-indigo-400'
                    : 'border-transparent text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-white hover:border-gray-300 dark:hover:border-[#0F828C]'
                }`}
              >
                Cupons
              </button>
              <button
                onClick={() => setActiveTab('promotions')}
                className={`py-4 px-6 text-sm font-medium border-b-2 whitespace-nowrap ${
                  activeTab === 'promotions'
                    ? 'border-indigo-500 dark:border-indigo-400 text-indigo-600 dark:text-indigo-400'
                    : 'border-transparent text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-white hover:border-gray-300 dark:hover:border-[#0F828C]'
                }`}
              >
                Promoções
              </button>
              <button
                onClick={() => setActiveTab('users')}
                className={`py-4 px-6 text-sm font-medium border-b-2 whitespace-nowrap ${
                  activeTab === 'users'
                    ? 'border-indigo-500 dark:border-indigo-400 text-indigo-600 dark:text-indigo-400'
                    : 'border-transparent text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-white hover:border-gray-300 dark:hover:border-[#0F828C]'
                }`}
              >
                Clientes
              </button>
              <button
                onClick={() => setActiveTab('products')}
                className={`py-4 px-6 text-sm font-medium border-b-2 whitespace-nowrap ${
                  activeTab === 'products'
                    ? 'border-indigo-500 dark:border-indigo-400 text-indigo-600 dark:text-indigo-400'
                    : 'border-transparent text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-white hover:border-gray-300 dark:hover:border-[#0F828C]'
                }`}
              >
                Produtos
              </button>
              <button
                onClick={() => setActiveTab('whatsapp')}
                className={`py-4 px-6 text-sm font-medium border-b-2 whitespace-nowrap ${
                  activeTab === 'whatsapp'
                    ? 'border-indigo-500 dark:border-indigo-400 text-indigo-600 dark:text-indigo-400'
                    : 'border-transparent text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-white hover:border-gray-300 dark:hover:border-[#0F828C]'
                }`}
              >
                WhatsApp
              </button>
              <button
                onClick={() => setActiveTab('chat')}
                className={`py-4 px-6 text-sm font-medium border-b-2 whitespace-nowrap ${
                  activeTab === 'chat'
                    ? 'border-indigo-500 dark:border-indigo-400 text-indigo-600 dark:text-indigo-400'
                    : 'border-transparent text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-white hover:border-gray-300 dark:hover:border-[#0F828C]'
                }`}
              >
                Chat Interno
              </button>
              <button
                onClick={() => setActiveTab('whatsappHumanSupport')}
                className={`py-4 px-6 text-sm font-medium border-b-2 whitespace-nowrap ${
                  activeTab === 'whatsappHumanSupport'
                    ? 'border-indigo-500 dark:border-indigo-400 text-indigo-600 dark:text-indigo-400'
                    : 'border-transparent text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-white hover:border-gray-300 dark:hover:border-[#0F828C]'
                }`}
              >
                Atendimento Humano
              </button>
            </nav>
          </div>
        </div>

        {activeTab === 'overview' && (
          <>
            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 dark:border-indigo-400"></div>
                <p className="mt-2 text-gray-600 dark:text-gray-300">Carregando dados...</p>
              </div>
            ) : error ? (
              <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <p className="text-red-800 dark:text-red-300">{error}</p>
              </div>
            ) : (
              <>
                {/* Cards de Estatísticas */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                  <div className="bg-white dark:bg-[#065084] rounded-lg shadow-md dark:shadow-lg p-6 border border-gray-200 dark:border-[#0F828C]">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Total de Sessões</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                          {stats?.totalSessions.toLocaleString('pt-BR') || 0}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {stats?.totalPageViews.toLocaleString('pt-BR') || 0} visualizações
                        </p>
                      </div>
                      <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-lg">
                        <Eye className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                      </div>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-[#065084] rounded-lg shadow-md dark:shadow-lg p-6 border border-gray-200 dark:border-[#0F828C]">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Visitantes Únicos</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                          {stats?.uniqueVisitors.toLocaleString('pt-BR') || 0}
                        </p>
                      </div>
                      <div className="bg-green-100 dark:bg-green-900/30 p-3 rounded-lg">
                        <Users className="w-6 h-6 text-green-600 dark:text-green-400" />
                      </div>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-[#065084] rounded-lg shadow-md dark:shadow-lg p-6 border border-gray-200 dark:border-[#0F828C]">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-300">IPs Únicos</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                          {stats?.uniqueIPs.toLocaleString('pt-BR') || 0}
                        </p>
                      </div>
                      <div className="bg-purple-100 dark:bg-purple-900/30 p-3 rounded-lg">
                        <BarChart3 className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                      </div>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-[#065084] rounded-lg shadow-md dark:shadow-lg p-6 border border-gray-200 dark:border-[#0F828C]">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Usuários Autenticados</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                          {stats?.uniqueAuthenticatedUsers.toLocaleString('pt-BR') || 0}
                        </p>
                      </div>
                      <div className="bg-yellow-100 dark:bg-yellow-900/30 p-3 rounded-lg">
                        <Calendar className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Gráfico de Acessos */}
                <div className="bg-white dark:bg-[#065084] rounded-lg shadow-md dark:shadow-lg p-6 mb-6 border border-gray-200 dark:border-[#0F828C]">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                    Sessões e Visualizações ao Site
                  </h2>
                  {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={400}>
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="date" 
                          tickFormatter={formatDate}
                          angle={-45}
                          textAnchor="end"
                          height={80}
                        />
                        <YAxis />
                        <Tooltip 
                          labelFormatter={(value) => formatDate(value)}
                          formatter={(value: number) => value.toLocaleString('pt-BR')}
                        />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="total" 
                          stroke="#3b82f6" 
                          strokeWidth={2}
                          name="Total de Sessões"
                          dot={{ r: 4 }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="unique" 
                          stroke="#10b981" 
                          strokeWidth={2}
                          name="Visitantes Únicos"
                          dot={{ r: 4 }}
                        />
                        {chartData[0]?.pageViews !== undefined && (
                          <Line 
                            type="monotone" 
                            dataKey="pageViews" 
                            stroke="#8b5cf6" 
                            strokeWidth={2}
                            name="Visualizações de Página"
                            dot={{ r: 4 }}
                          />
                        )}
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                      Nenhum dado disponível para o período selecionado
                    </div>
                  )}
                </div>

                {/* Gráfico de Barras Comparativo */}
                <div className="bg-white dark:bg-[#065084] rounded-lg shadow-md dark:shadow-lg p-6 border border-gray-200 dark:border-[#0F828C]">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                    Comparativo: Sessões vs. Visitantes Únicos
                  </h2>
                  {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="date" 
                          tickFormatter={formatDate}
                          angle={-45}
                          textAnchor="end"
                          height={80}
                        />
                        <YAxis />
                        <Tooltip 
                          labelFormatter={(value) => formatDate(value)}
                          formatter={(value: number) => value.toLocaleString('pt-BR')}
                        />
                        <Legend />
                        <Bar dataKey="total" fill="#3b82f6" name="Total de Sessões" />
                        <Bar dataKey="unique" fill="#10b981" name="Visitantes Únicos" />
                        {chartData[0]?.pageViews !== undefined && (
                          <Bar dataKey="pageViews" fill="#8b5cf6" name="Visualizações de Página" />
                        )}
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="text-center py-12 text-gray-500">
                      Nenhum dado disponível para o período selecionado
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        )}

        {activeTab === 'behavior' && (
          <>
            {behaviorLoading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                <p className="mt-2 text-gray-600">Carregando dados de comportamento...</p>
              </div>
            ) : behaviorAnalytics ? (
              <>
                {/* Cards de Métricas de Comportamento */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                  <div className="bg-white rounded-lg shadow-md p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Tempo Médio de Sessão</p>
                        <p className="text-2xl font-bold text-gray-900 mt-1">
                          {formatTime(behaviorAnalytics.avgSessionDuration)}
                        </p>
                      </div>
                      <div className="bg-blue-100 p-3 rounded-lg">
                        <Clock className="w-6 h-6 text-blue-600" />
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow-md p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Taxa de Rejeição</p>
                        <p className="text-2xl font-bold text-gray-900 mt-1">
                          {behaviorAnalytics.bounceRate}%
                        </p>
                      </div>
                      <div className="bg-red-100 p-3 rounded-lg">
                        <TrendingDown className="w-6 h-6 text-red-600" />
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow-md p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Total de Sessões</p>
                        <p className="text-2xl font-bold text-gray-900 mt-1">
                          {behaviorAnalytics.totalSessions.toLocaleString('pt-BR')}
                        </p>
                      </div>
                      <div className="bg-purple-100 p-3 rounded-lg">
                        <Users className="w-6 h-6 text-purple-600" />
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow-md p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Sessões Rejeitadas</p>
                        <p className="text-2xl font-bold text-gray-900 mt-1">
                          {behaviorAnalytics.bouncedSessions.toLocaleString('pt-BR')}
                        </p>
                      </div>
                      <div className="bg-orange-100 p-3 rounded-lg">
                        <MousePointer className="w-6 h-6 text-orange-600" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Páginas Mais Visitadas */}
                <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">
                    Páginas Mais Visitadas
                  </h2>
                  {behaviorAnalytics.topPages.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Página
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Visualizações
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Tempo Médio
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Taxa de Rejeição
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {behaviorAnalytics.topPages.map((page, index) => (
                            <tr key={index}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {page.path || '/'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {page.views.toLocaleString('pt-BR')}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {formatTime(page.avgTime)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  page.bounceRate > 70 ? 'bg-red-100 text-red-800' :
                                  page.bounceRate > 40 ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-green-100 text-green-800'
                                }`}>
                                  {page.bounceRate}%
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-gray-500">
                      Nenhum dado disponível
                    </div>
                  )}
                </div>

                {/* Distribuição de Tempo */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div className="bg-white rounded-lg shadow-md p-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">
                      Distribuição de Tempo na Página
                    </h2>
                    {behaviorAnalytics.timeDistribution.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={behaviorAnalytics.timeDistribution}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={(entry: any) => {
                              const percent = entry.percent;
                              const range = entry.range || entry.payload?.range || '';
                              return `${range}: ${percent ? (percent * 100).toFixed(0) : 0}%`;
                            }}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="count"
                          >
                            {behaviorAnalytics.timeDistribution.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="text-center py-12 text-gray-500">
                        Nenhum dado disponível
                      </div>
                    )}
                  </div>

                  {/* Funil de Conversão */}
                  <div className="bg-white rounded-lg shadow-md p-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">
                      Funil de Conversão
                    </h2>
                    {behaviorAnalytics.funnelData.length > 0 ? (
                      <div className="space-y-4">
                        {behaviorAnalytics.funnelData.map((step, index) => {
                          const maxViews = Math.max(...behaviorAnalytics.funnelData.map(f => f.views))
                          const percentage = maxViews > 0 ? (step.views / maxViews) * 100 : 0
                          const prevViews = index > 0 ? behaviorAnalytics.funnelData[index - 1].views : step.views
                          const conversionRate = prevViews > 0 ? ((step.views / prevViews) * 100).toFixed(1) : '100.0'
                          
                          return (
                            <div key={index}>
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-gray-700">
                                  {step.path === '/' ? 'Home' : 
                                   step.path === '/produtos' ? 'Produtos' :
                                   step.path === '/carrinho' ? 'Carrinho' :
                                   step.path === '/checkout' ? 'Checkout' : step.path}
                                </span>
                                <div className="flex items-center gap-4">
                                  <span className="text-sm text-gray-500">
                                    {step.views.toLocaleString('pt-BR')} visualizações
                                  </span>
                                  {index > 0 && (
                                    <span className="text-xs text-gray-400">
                                      {conversionRate}% conversão
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-4">
                                <div
                                  className="bg-indigo-600 h-4 rounded-full transition-all"
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                              {index < behaviorAnalytics.funnelData.length - 1 && (
                                <div className="flex justify-center my-2">
                                  <ArrowRight className="w-4 h-4 text-gray-400" />
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-12 text-gray-500">
                        Nenhum dado disponível
                      </div>
                    )}
                  </div>
                </div>

                {/* Páginas de Entrada e Saída */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white rounded-lg shadow-md p-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">
                      Páginas de Entrada
                    </h2>
                    {behaviorAnalytics.topEntryPages.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={behaviorAnalytics.topEntryPages.slice(0, 5)} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" />
                          <YAxis dataKey="path" type="category" width={150} />
                          <Tooltip />
                          <Bar dataKey="count" fill="#3b82f6" />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="text-center py-12 text-gray-500">
                        Nenhum dado disponível
                      </div>
                    )}
                  </div>

                  <div className="bg-white rounded-lg shadow-md p-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">
                      Páginas de Saída
                    </h2>
                    {behaviorAnalytics.topExitPages.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={behaviorAnalytics.topExitPages.slice(0, 5)} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" />
                          <YAxis dataKey="path" type="category" width={150} />
                          <Tooltip />
                          <Bar dataKey="count" fill="#ef4444" />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="text-center py-12 text-gray-500">
                        Nenhum dado disponível
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-12 text-gray-500">
                Nenhum dado de comportamento disponível
              </div>
            )}
          </>
        )}

        {activeTab === 'orders' && (
          <OrdersStatsTab ordersStats={ordersStats} ordersLoading={ordersLoading} />
        )}

        {activeTab === 'shipping' && (
          <ShippingStatsTab shippingStats={shippingStats} shippingLoading={shippingLoading} />
        )}

        {activeTab === 'promoCodes' && (
          <PromoCodesStatsTab promoCodesStats={promoCodesStats} promoCodesLoading={promoCodesLoading} />
        )}

        {activeTab === 'promotions' && (
          <PromotionsStatsTab promotionsStats={promotionsStats} promotionsLoading={promotionsLoading} />
        )}

        {activeTab === 'users' && (
          <UsersStatsTab usersStats={usersStats} usersLoading={usersLoading} />
        )}

        {activeTab === 'products' && (
          <ProductsStatsTab productsStats={productsStats} productsLoading={productsLoading} />
        )}

        {activeTab === 'whatsapp' && (
          <WhatsAppStatsTab whatsappStats={whatsappStats} whatsappLoading={whatsappLoading} />
        )}

        {activeTab === 'chat' && (
          <ChatStatsTab chatStats={chatStats} chatLoading={chatLoading} />
        )}

        {activeTab === 'whatsappHumanSupport' && (
          <WhatsAppHumanSupportStatsTab 
            whatsappHumanSupportStats={whatsappHumanSupportStats} 
            whatsappHumanSupportLoading={whatsappHumanSupportLoading} 
          />
        )}
      </div>
    </div>
  )
}
