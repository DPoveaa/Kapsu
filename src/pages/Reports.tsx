import { CustomChartTooltip, renderChartLegend } from '../components/ChartTheme'
import { useEffect, useState } from 'react'
import { BarChart3, Users, Eye, Calendar, Clock, TrendingDown, MousePointer, ArrowRight, ShieldCheck, ShieldAlert, CheckCircle2, Info } from 'lucide-react'
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
import { TooltipValue, formatTooltipNumber } from '../types/recharts'

interface SiteAccessStats {
  totalAccesses: number
  uniqueVisitors: number
  uniqueIPs: number
  uniqueAuthenticatedUsers: number
  totalSessions?: number
  totalPageViews?: number
  avgPageViewsPerSession?: number
  likelyHumanSessions?: number
  lowConfidenceSessions?: number
  avgHumanScore?: number | null
  likelyHumanPct?: number | null
}

interface ChartDataPoint {
  date: string
  total: number
  unique: number
  pageViews?: number
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
  humanScoreBreakdown?: Array<{ range: string; count: number }>
  likelyHumans?: number
  lowConfidence?: number
  avgHumanScore?: number | null
  likelyHumanPct?: number | null
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
      
      const data = await adminService.getPromotionsStatistics({
        startDate,
        endDate,
      })
      
      setPromotionsStats(data.data)
      
    } catch (err: any) {
      
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
    <div className="w-full">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-4 sm:py-6 lg:py-8">
        <div className="mb-4 sm:mb-6 lg:mb-8">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">Relatórios</h1>
          <p className="mt-1 sm:mt-2 text-xs sm:text-sm lg:text-base text-gray-600 dark:text-gray-300">Estatísticas de acesso e comportamento dos usuários</p>
        </div>

        {/* Filtros */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-lg p-3 sm:p-4 lg:p-6 mb-4 sm:mb-5 lg:mb-6 border border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-white mb-1.5 sm:mb-2">
                Data Inicial
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-2.5 sm:px-3 py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-400 dark:bg-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-white mb-1.5 sm:mb-2">
                Data Final
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-2.5 sm:px-3 py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-400 dark:bg-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-white mb-1.5 sm:mb-2">
                Agrupar Por
              </label>
              <select
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value as 'hour' | 'day' | 'week' | 'month')}
                className="w-full px-2.5 sm:px-3 py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-400 dark:bg-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="hour">Hora</option>
                <option value="day">Dia</option>
                <option value="week">Semana</option>
                <option value="month">Mês</option>
              </select>
            </div>
            <div className="flex items-end sm:col-span-2 lg:col-span-1">
              <button
                onClick={() => {
                  fetchData()
                  fetchBehaviorData()
                }}
                className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                Atualizar
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-lg mb-4 sm:mb-5 lg:mb-6 border border-gray-200 dark:border-gray-700">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="flex -mb-px overflow-x-auto">
              <button
                onClick={() => setActiveTab('overview')}
                className={`py-2.5 sm:py-3 lg:py-4 px-3 sm:px-4 lg:px-6 text-xs sm:text-sm font-medium border-b-2 whitespace-nowrap ${
                  activeTab === 'overview'
                    ? 'border-green-500 dark:border-green-500 text-green-600 dark:text-green-500'
                    : 'border-transparent text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-white hover:border-gray-300 dark:hover:border-[#0F828C]'
                }`}
              >
                Visão Geral
              </button>
              <button
                onClick={() => setActiveTab('behavior')}
                className={`py-2.5 sm:py-3 lg:py-4 px-3 sm:px-4 lg:px-6 text-xs sm:text-sm font-medium border-b-2 whitespace-nowrap ${
                  activeTab === 'behavior'
                    ? 'border-green-500 dark:border-green-500 text-green-600 dark:text-green-500'
                    : 'border-transparent text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-white hover:border-gray-300 dark:hover:border-[#0F828C]'
                }`}
              >
                Comportamento
              </button>
              <button
                onClick={() => setActiveTab('orders')}
                className={`py-2.5 sm:py-3 lg:py-4 px-3 sm:px-4 lg:px-6 text-xs sm:text-sm font-medium border-b-2 whitespace-nowrap ${
                  activeTab === 'orders'
                    ? 'border-green-500 dark:border-green-500 text-green-600 dark:text-green-500'
                    : 'border-transparent text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-white hover:border-gray-300 dark:hover:border-[#0F828C]'
                }`}
              >
                Pedidos
              </button>
              <button
                onClick={() => setActiveTab('shipping')}
                className={`py-2.5 sm:py-3 lg:py-4 px-3 sm:px-4 lg:px-6 text-xs sm:text-sm font-medium border-b-2 whitespace-nowrap ${
                  activeTab === 'shipping'
                    ? 'border-green-500 dark:border-green-500 text-green-600 dark:text-green-500'
                    : 'border-transparent text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-white hover:border-gray-300 dark:hover:border-[#0F828C]'
                }`}
              >
                Frete
              </button>
              <button
                onClick={() => setActiveTab('promoCodes')}
                className={`py-2.5 sm:py-3 lg:py-4 px-3 sm:px-4 lg:px-6 text-xs sm:text-sm font-medium border-b-2 whitespace-nowrap ${
                  activeTab === 'promoCodes'
                    ? 'border-green-500 dark:border-green-500 text-green-600 dark:text-green-500'
                    : 'border-transparent text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-white hover:border-gray-300 dark:hover:border-[#0F828C]'
                }`}
              >
                Cupons
              </button>
              <button
                onClick={() => setActiveTab('promotions')}
                className={`py-2.5 sm:py-3 lg:py-4 px-3 sm:px-4 lg:px-6 text-xs sm:text-sm font-medium border-b-2 whitespace-nowrap ${
                  activeTab === 'promotions'
                    ? 'border-green-500 dark:border-green-500 text-green-600 dark:text-green-500'
                    : 'border-transparent text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-white hover:border-gray-300 dark:hover:border-[#0F828C]'
                }`}
              >
                Promoções
              </button>
              <button
                onClick={() => setActiveTab('users')}
                className={`py-2.5 sm:py-3 lg:py-4 px-3 sm:px-4 lg:px-6 text-xs sm:text-sm font-medium border-b-2 whitespace-nowrap ${
                  activeTab === 'users'
                    ? 'border-green-500 dark:border-green-500 text-green-600 dark:text-green-500'
                    : 'border-transparent text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-white hover:border-gray-300 dark:hover:border-[#0F828C]'
                }`}
              >
                Clientes
              </button>
              <button
                onClick={() => setActiveTab('products')}
                className={`py-2.5 sm:py-3 lg:py-4 px-3 sm:px-4 lg:px-6 text-xs sm:text-sm font-medium border-b-2 whitespace-nowrap ${
                  activeTab === 'products'
                    ? 'border-green-500 dark:border-green-500 text-green-600 dark:text-green-500'
                    : 'border-transparent text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-white hover:border-gray-300 dark:hover:border-[#0F828C]'
                }`}
              >
                Produtos
              </button>
              <button
                onClick={() => setActiveTab('whatsapp')}
                className={`py-2.5 sm:py-3 lg:py-4 px-3 sm:px-4 lg:px-6 text-xs sm:text-sm font-medium border-b-2 whitespace-nowrap ${
                  activeTab === 'whatsapp'
                    ? 'border-green-500 dark:border-green-500 text-green-600 dark:text-green-500'
                    : 'border-transparent text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-white hover:border-gray-300 dark:hover:border-[#0F828C]'
                }`}
              >
                WhatsApp
              </button>
              <button
                onClick={() => setActiveTab('chat')}
                className={`py-2.5 sm:py-3 lg:py-4 px-3 sm:px-4 lg:px-6 text-xs sm:text-sm font-medium border-b-2 whitespace-nowrap ${
                  activeTab === 'chat'
                    ? 'border-green-500 dark:border-green-500 text-green-600 dark:text-green-500'
                    : 'border-transparent text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-white hover:border-gray-300 dark:hover:border-[#0F828C]'
                }`}
              >
                Chat Interno
              </button>
              <button
                onClick={() => setActiveTab('whatsappHumanSupport')}
                className={`py-2.5 sm:py-3 lg:py-4 px-3 sm:px-4 lg:px-6 text-xs sm:text-sm font-medium border-b-2 whitespace-nowrap ${
                  activeTab === 'whatsappHumanSupport'
                    ? 'border-green-500 dark:border-green-500 text-green-600 dark:text-green-500'
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
              <div className="text-center py-8 sm:py-10 lg:py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 sm:h-10 sm:w-10 border-b-2 border-indigo-600 dark:border-indigo-400"></div>
                <p className="mt-2 sm:mt-3 text-xs sm:text-sm text-gray-600 dark:text-gray-300">Carregando dados...</p>
              </div>
            ) : error ? (
              <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-3 sm:p-4">
                <p className="text-xs sm:text-sm text-red-800 dark:text-red-300 break-words">{error}</p>
              </div>
            ) : (
              <>
                {/* Cards de Estatísticas */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-4 sm:mb-5 lg:mb-6">
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-lg p-4 sm:p-5 lg:p-6 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-300">Total de Sessões</p>
                        <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mt-1 break-words">
                          {(stats?.totalAccesses ?? 0).toLocaleString('pt-BR')}
                        </p>
                        <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-1 break-words">
                          {(stats?.totalAccesses ?? 0).toLocaleString('pt-BR')} visualizações
                        </p>
                      </div>
                      <div className="bg-blue-100 dark:bg-blue-900/30 p-2 sm:p-3 rounded-lg flex-shrink-0 ml-2">
                        <Eye className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-blue-600 dark:text-blue-400" />
                      </div>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-lg p-4 sm:p-5 lg:p-6 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-300">Visitantes Únicos</p>
                        <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mt-1 break-words">
                          {(stats?.uniqueVisitors ?? 0).toLocaleString('pt-BR')}
                        </p>
                      </div>
                      <div className="bg-green-100 dark:bg-green-900/30 p-2 sm:p-3 rounded-lg flex-shrink-0 ml-2">
                        <Users className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-green-600 dark:text-green-400" />
                      </div>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-lg p-4 sm:p-5 lg:p-6 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-300">IPs Únicos</p>
                        <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mt-1 break-words">
                          {(stats?.uniqueIPs ?? 0).toLocaleString('pt-BR')}
                        </p>
                      </div>
                      <div className="bg-purple-100 dark:bg-purple-900/30 p-2 sm:p-3 rounded-lg flex-shrink-0 ml-2">
                        <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-purple-600 dark:text-purple-400" />
                      </div>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-lg p-4 sm:p-5 lg:p-6 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-300">Usuários Autenticados</p>
                        <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mt-1 break-words">
                          {(stats?.uniqueAuthenticatedUsers ?? 0).toLocaleString('pt-BR')}
                        </p>
                      </div>
                      <div className="bg-yellow-100 dark:bg-yellow-900/30 p-2 sm:p-3 rounded-lg flex-shrink-0 ml-2">
                        <Calendar className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-yellow-600 dark:text-yellow-400" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Painel de Confiança de Acesso */}
                {(stats?.avgHumanScore !== undefined && stats?.avgHumanScore !== null) ? (
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-lg p-4 sm:p-5 lg:p-6 mb-4 sm:mb-5 lg:mb-6 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-2 mb-3 sm:mb-4">
                      <span className="text-lg">🧠</span>
                      <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">Confiança de Acesso — Clientes Reais vs Suspeitos</h2>
                    </div>
                    <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-4">
                      Cada sessão recebe uma pontuação de 0 a 100 indicando a probabilidade de ser um cliente real (humano), com base em: presença de visitor_id gerado pelo browser, session_id, user-agent de browser moderno, IP de datacenter, e autenticação.
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-4">
                      <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 border border-green-200 dark:border-green-800">
                        <p className="text-[10px] sm:text-xs font-medium text-green-700 dark:text-green-400 mb-1">✅ Prováveis Clientes Reais</p>
                        <p className="text-xl sm:text-2xl font-bold text-green-700 dark:text-green-400">{(stats?.likelyHumanSessions ?? 0).toLocaleString('pt-BR')}</p>
                        <p className="text-[10px] text-green-600 dark:text-green-500">score ≥ 50</p>
                      </div>
                      <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3 border border-red-200 dark:border-red-800">
                        <p className="text-[10px] sm:text-xs font-medium text-red-700 dark:text-red-400 mb-1">⚠️ Suspeitos / Incertos</p>
                        <p className="text-xl sm:text-2xl font-bold text-red-700 dark:text-red-400">{(stats?.lowConfidenceSessions ?? 0).toLocaleString('pt-BR')}</p>
                        <p className="text-[10px] text-red-600 dark:text-red-500">score &lt; 50</p>
                      </div>
                      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
                        <p className="text-[10px] sm:text-xs font-medium text-blue-700 dark:text-blue-400 mb-1">📊 Score Médio</p>
                        <p className="text-xl sm:text-2xl font-bold text-blue-700 dark:text-blue-400">{stats?.avgHumanScore ?? '—'}<span className="text-sm font-normal">/100</span></p>
                        <p className="text-[10px] text-blue-600 dark:text-blue-500">confiança média</p>
                      </div>
                      <div className={`rounded-lg p-3 border ${
                        (stats?.likelyHumanPct ?? 0) >= 70
                          ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                          : (stats?.likelyHumanPct ?? 0) >= 40
                          ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
                          : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                      }`}>
                        <p className={`text-[10px] sm:text-xs font-medium mb-1 ${
                          (stats?.likelyHumanPct ?? 0) >= 70 ? 'text-green-700 dark:text-green-400'
                          : (stats?.likelyHumanPct ?? 0) >= 40 ? 'text-yellow-700 dark:text-yellow-400'
                          : 'text-red-700 dark:text-red-400'
                        }`}>
                          {(stats?.likelyHumanPct ?? 0) >= 70 ? '🟢' : (stats?.likelyHumanPct ?? 0) >= 40 ? '🟡' : '🔴'} Taxa de Humanos
                        </p>
                        <p className={`text-xl sm:text-2xl font-bold ${
                          (stats?.likelyHumanPct ?? 0) >= 70 ? 'text-green-700 dark:text-green-400'
                          : (stats?.likelyHumanPct ?? 0) >= 40 ? 'text-yellow-700 dark:text-yellow-400'
                          : 'text-red-700 dark:text-red-400'
                        }`}>{stats?.likelyHumanPct ?? '—'}%</p>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400">das sessões</p>
                      </div>
                    </div>
                    {/* Barra de confiança */}
                    {stats?.likelyHumanPct !== null && stats?.likelyHumanPct !== undefined && (
                      <div>
                        <div className="flex justify-between text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mb-1">
                          <span>Suspeitos/Bots</span>
                          <span>Clientes Reais</span>
                        </div>
                        <div className="w-full bg-red-200 dark:bg-red-900/30 rounded-full h-3 overflow-hidden">
                          <div
                            className="h-3 rounded-full bg-gradient-to-r from-green-400 to-green-600 transition-all duration-500"
                            style={{ width: `${stats.likelyHumanPct}%` }}
                          />
                        </div>
                        <p className="mt-2 text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
                          💡 Sessões com score ≥ 50 têm visitor_id e/ou session_id gerado pelo browser, indicando fortemente que é um cliente real navegando no site. Acessos com score baixo são possivelmente bots, scanners ou monitoramentos automáticos que passaram pelo filtro básico.
                        </p>
                      </div>
                    )}
                  </div>
                ) : null}

                {/* Gráfico de Acessos */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-lg p-3 sm:p-4 lg:p-6 mb-4 sm:mb-5 lg:mb-6 border border-gray-200 dark:border-gray-700">
                  <h2 className="text-base sm:text-lg lg:text-xl font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4">
                    Sessões e Visualizações ao Site
                  </h2>
                  {chartData.length > 0 ? (
                    <div className="w-full overflow-x-auto">
                      <ResponsiveContainer width="100%" height={300} minHeight={250}>
                        <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 60 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#88888825" />
                          <XAxis 
                            dataKey="date" 
                            tickFormatter={formatDate}
                            angle={-45}
                            textAnchor="end"
                            height={60}
                            tick={{ fontSize: 10, fill: '#9ca3af' }}
                          />
                          <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} />
                          <Tooltip content={<CustomChartTooltip labelFormatter={(value) => formatDate(value)}
                            formatter={(value: TooltipValue) => formatTooltipNumber(value).toLocaleString('pt-BR')} />} />
                          <Legend wrapperStyle={{ fontSize: '12px' }} formatter={renderChartLegend} />
                          <Line 
                            type="monotone" 
                            dataKey="total" 
                            stroke="#3b82f6" 
                            strokeWidth={2}
                            name="Total de Sessões"
                            dot={{ r: 3 }}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="unique" 
                            stroke="#10b981" 
                            strokeWidth={2}
                            name="Visitantes Únicos"
                            dot={{ r: 3 }}
                          />
                          {chartData[0]?.pageViews !== undefined && (
                            <Line 
                              type="monotone" 
                              dataKey="pageViews" 
                              stroke="#8b5cf6" 
                              strokeWidth={2}
                              name="Visualizações de Página"
                              dot={{ r: 3 }}
                            />
                          )}
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="text-center py-8 sm:py-10 lg:py-12 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                      Nenhum dado disponível para o período selecionado
                    </div>
                  )}
                </div>

                {/* Gráfico de Barras Comparativo */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-lg p-3 sm:p-4 lg:p-6 border border-gray-200 dark:border-gray-700">
                  <h2 className="text-base sm:text-lg lg:text-xl font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4">
                    Comparativo: Sessões vs. Visitantes Únicos
                  </h2>
                  {chartData.length > 0 ? (
                    <div className="w-full overflow-x-auto">
                      <ResponsiveContainer width="100%" height={300} minHeight={250}>
                        <BarChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 60 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#88888825" />
                          <XAxis 
                            dataKey="date" 
                            tickFormatter={formatDate}
                            angle={-45}
                            textAnchor="end"
                            height={60}
                            tick={{ fontSize: 10, fill: '#9ca3af' }}
                          />
                          <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} />
                          <Tooltip content={<CustomChartTooltip labelFormatter={(value) => formatDate(value)}
                            formatter={(value: TooltipValue) => formatTooltipNumber(value).toLocaleString('pt-BR')} />} />
                          <Legend wrapperStyle={{ fontSize: '12px' }} formatter={renderChartLegend} />
                          <Bar dataKey="total" fill="#3b82f6" name="Total de Sessões" />
                          <Bar dataKey="unique" fill="#10b981" name="Visitantes Únicos" />
                          {chartData[0]?.pageViews !== undefined && (
                            <Bar dataKey="pageViews" fill="#8b5cf6" name="Visualizações de Página" />
                          )}
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="text-center py-8 sm:py-10 lg:py-12 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
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
              <div className="text-center py-8 sm:py-10 lg:py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 sm:h-10 sm:w-10 border-b-2 border-indigo-600 dark:border-indigo-400"></div>
                <p className="mt-2 sm:mt-3 text-xs sm:text-sm text-gray-600 dark:text-gray-300">Carregando dados de comportamento...</p>
              </div>
            ) : behaviorAnalytics ? (
              <>
                {/* Cards de Métricas de Comportamento */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-4 sm:mb-5 lg:mb-6">
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-lg p-4 sm:p-5 lg:p-6 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-300">Tempo Médio de Sessão</p>
                        <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mt-1 break-words">
                          {formatTime(behaviorAnalytics?.avgSessionDuration ?? 0)}
                        </p>
                      </div>
                      <div className="bg-blue-100 dark:bg-blue-900/30 p-2 sm:p-3 rounded-lg flex-shrink-0 ml-2">
                        <Clock className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-blue-600 dark:text-blue-400" />
                      </div>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-lg p-4 sm:p-5 lg:p-6 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-300">Taxa de Rejeição</p>
                        <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mt-1 break-words">
                          {(behaviorAnalytics?.bounceRate ?? 0)}%
                        </p>
                      </div>
                      <div className="bg-red-100 dark:bg-red-900/30 p-2 sm:p-3 rounded-lg flex-shrink-0 ml-2">
                        <TrendingDown className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-red-600 dark:text-red-400" />
                      </div>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-lg p-4 sm:p-5 lg:p-6 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-300">Total de Sessões</p>
                        <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mt-1 break-words">
                          {(behaviorAnalytics?.totalSessions ?? 0).toLocaleString('pt-BR')}
                        </p>
                      </div>
                      <div className="bg-purple-100 dark:bg-purple-900/30 p-2 sm:p-3 rounded-lg flex-shrink-0 ml-2">
                        <Users className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-purple-600 dark:text-purple-400" />
                      </div>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-lg p-4 sm:p-5 lg:p-6 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-300">Sessões Rejeitadas</p>
                        <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mt-1 break-words">
                          {(behaviorAnalytics?.bouncedSessions ?? 0).toLocaleString('pt-BR')}
                        </p>
                      </div>
                      <div className="bg-orange-100 dark:bg-orange-900/30 p-2 sm:p-3 rounded-lg flex-shrink-0 ml-2">
                        <MousePointer className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-orange-600 dark:text-orange-400" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Painel de Validação de Clientes Reais vs Falsos Positivos (Aba Comportamento) */}
                {(behaviorAnalytics?.avgHumanScore !== undefined && behaviorAnalytics?.avgHumanScore !== null) || (behaviorAnalytics?.humanScoreBreakdown && behaviorAnalytics.humanScoreBreakdown.length > 0) ? (
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-lg p-4 sm:p-5 lg:p-6 mb-4 sm:mb-5 lg:mb-6 border border-gray-200 dark:border-gray-700">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-gray-200 dark:border-gray-700">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
                          <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6" />
                        </div>
                        <div>
                          <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
                            Auditoria de Tráfego: Clientes Reais vs Falsos Positivos
                          </h2>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Algoritmo de pontuação de humanidade (0 a 100) baseado em fingerprint de navegador, execução de JS e integridade de sessão
                          </p>
                        </div>
                      </div>
                      {behaviorAnalytics?.likelyHumanPct !== null && behaviorAnalytics?.likelyHumanPct !== undefined && (
                        <span className={`self-start sm:self-auto px-3 py-1 rounded-full text-xs font-semibold ${
                          behaviorAnalytics.likelyHumanPct >= 70
                            ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
                            : behaviorAnalytics.likelyHumanPct >= 40
                            ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700'
                            : 'bg-rose-100 dark:bg-rose-900/40 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-700'
                        }`}>
                          {behaviorAnalytics.likelyHumanPct >= 70 ? '🟢 Tráfego Saudável' : behaviorAnalytics.likelyHumanPct >= 40 ? '🟡 Tráfego Misto' : '🔴 Alto Volume de Bots'}
                        </span>
                      )}
                    </div>

                    {/* Métricas de Confiança */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-4">
                      <div className="bg-emerald-50 dark:bg-emerald-950/20 rounded-lg p-3.5 border border-emerald-200 dark:border-emerald-800/40">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-[11px] sm:text-xs font-semibold text-emerald-800 dark:text-emerald-300">Clientes Reais Confirmados</p>
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <p className="text-xl sm:text-2xl font-black text-emerald-700 dark:text-emerald-400">
                          {(behaviorAnalytics?.likelyHumans ?? 0).toLocaleString('pt-BR')}
                        </p>
                        <p className="text-[10px] text-emerald-600/80 dark:text-emerald-400/70 mt-0.5">Score ≥ 50 (Sessão & Visitor ID ativos)</p>
                      </div>

                      <div className="bg-rose-50 dark:bg-rose-950/20 rounded-lg p-3.5 border border-rose-200 dark:border-rose-800/40">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-[11px] sm:text-xs font-semibold text-rose-800 dark:text-rose-300">Suspeitos / Falsos Positivos</p>
                          <ShieldAlert className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                        </div>
                        <p className="text-xl sm:text-2xl font-black text-rose-700 dark:text-rose-400">
                          {(behaviorAnalytics?.lowConfidence ?? 0).toLocaleString('pt-BR')}
                        </p>
                        <p className="text-[10px] text-rose-600/80 dark:text-rose-400/70 mt-0.5">Score &lt; 50 (Scanners, robôs ou sem JS)</p>
                      </div>

                      <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-3.5 border border-blue-200 dark:border-blue-800/40">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-[11px] sm:text-xs font-semibold text-blue-800 dark:text-blue-300">Score Médio Geral</p>
                          <span className="text-xs">🎯</span>
                        </div>
                        <p className="text-xl sm:text-2xl font-black text-blue-700 dark:text-blue-400">
                          {behaviorAnalytics?.avgHumanScore ?? '—'}
                          <span className="text-xs font-normal text-blue-500"> / 100</span>
                        </p>
                        <p className="text-[10px] text-blue-600/80 dark:text-blue-400/70 mt-0.5">Média ponderada do período</p>
                      </div>

                      <div className="bg-indigo-50 dark:bg-indigo-950/20 rounded-lg p-3.5 border border-indigo-200 dark:border-indigo-800/40">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-[11px] sm:text-xs font-semibold text-indigo-800 dark:text-indigo-300">% de Clientes Reais</p>
                          <Users className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <p className="text-xl sm:text-2xl font-black text-indigo-700 dark:text-indigo-400">
                          {behaviorAnalytics?.likelyHumanPct ?? '—'}%
                        </p>
                        <p className="text-[10px] text-indigo-600/80 dark:text-indigo-400/70 mt-0.5">Do total de sessões analisadas</p>
                      </div>
                    </div>

                    {/* Barra de Proporção Visual */}
                    {behaviorAnalytics?.likelyHumanPct !== null && behaviorAnalytics?.likelyHumanPct !== undefined && (
                      <div className="mb-4 bg-gray-50 dark:bg-gray-900/40 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                        <div className="flex justify-between text-xs text-gray-600 dark:text-gray-300 mb-1.5 font-medium">
                          <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-semibold">
                            ● Clientes Reais ({behaviorAnalytics.likelyHumanPct}%)
                          </span>
                          <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400 font-semibold">
                            ● Falsos Positivos / Bots ({100 - behaviorAnalytics.likelyHumanPct}%)
                          </span>
                        </div>
                        <div className="w-full bg-rose-200 dark:bg-rose-950/60 rounded-full h-3.5 overflow-hidden flex shadow-inner">
                          <div
                            className="h-full bg-emerald-500 rounded-l-full transition-all duration-500 shadow"
                            style={{ width: `${behaviorAnalytics.likelyHumanPct}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Tabela de Classificação por Faixa de Pontuação */}
                    {behaviorAnalytics?.humanScoreBreakdown && behaviorAnalytics.humanScoreBreakdown.length > 0 && (
                      <div className="mb-4">
                        <h3 className="text-xs sm:text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">
                          Detalhamento por Faixa de Confiança:
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
                          {behaviorAnalytics.humanScoreBreakdown.map((item, idx) => {
                            const isHigh = item.range.includes('80-100')
                            const isMed = item.range.includes('50-79')
                            const isLow = item.range.includes('20-49')
                            const isBot = item.range.includes('0-19')

                            const borderClass = isHigh
                              ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/10'
                              : isMed
                              ? 'border-blue-300 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/10'
                              : isLow
                              ? 'border-amber-300 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/10'
                              : isBot
                              ? 'border-rose-300 dark:border-rose-800 bg-rose-50/50 dark:bg-rose-950/10'
                              : 'border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/20'

                            return (
                              <div key={idx} className={`p-3 rounded-lg border ${borderClass} flex flex-col justify-between`}>
                                <div>
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-gray-800 dark:text-gray-200">{item.range}</span>
                                    <span className="text-xs font-black text-gray-900 dark:text-white px-2 py-0.5 rounded bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700">
                                      {item.count.toLocaleString('pt-BR')} sessões
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                                    {isHigh && 'Humano de alta certeza (navegador completo, visitor_id e/ou login).'}
                                    {isMed && 'Provável cliente navegando normalmente com browser compatível.'}
                                    {isLow && 'Requisição atípica, tempo nulo ou sem rastros de navegador.'}
                                    {isBot && 'Datacenter IP, crawler/scanner ou ausência total de motor JS.'}
                                    {!isHigh && !isMed && !isLow && !isBot && 'Acessos antigos gravados antes da pontuação ativa.'}
                                  </p>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {/* Explicação Didática */}
                    <div className="bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 rounded-lg p-3 text-xs text-amber-900 dark:text-amber-200 flex gap-2.5 items-start">
                      <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                      <div className="leading-relaxed">
                        <strong className="font-semibold">Como ter certeza absoluta de quem é cliente real?</strong>
                        <p className="mt-0.5 text-[11px] text-amber-800 dark:text-amber-300">
                          Robôs automatizados e scanners de vulnerabilidade costumam requisitar páginas diretamente via scripts (Python, cURL, headless crawlers) sem executar o React da Kapsu. Nosso novo algoritmo valida se o acesso executou o JavaScript, gerou o <code>visitor_id</code> local no navegador e gerou navegações reais entre páginas. Foque nos acessos com <strong>Score ≥ 50</strong> para avaliar seus clientes verdadeiros.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : null}

                {/* Páginas Mais Visitadas */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-lg p-3 sm:p-4 lg:p-6 mb-4 sm:mb-5 lg:mb-6 border border-gray-200 dark:border-gray-700">
                  <h2 className="text-base sm:text-lg lg:text-xl font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4">
                    Páginas Mais Visitadas
                  </h2>
                  {behaviorAnalytics?.topPages && behaviorAnalytics.topPages.length > 0 ? (
                    <>
                      {/* Desktop Table */}
                      <div className="hidden lg:block overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                          <thead className="bg-gray-50 dark:bg-gray-800">
                            <tr>
                              <th className="px-4 lg:px-6 py-2 lg:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                Página
                              </th>
                              <th className="px-4 lg:px-6 py-2 lg:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                Visualizações
                              </th>
                              <th className="px-4 lg:px-6 py-2 lg:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                Tempo Médio
                              </th>
                              <th className="px-4 lg:px-6 py-2 lg:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                Taxa de Rejeição
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {(behaviorAnalytics?.topPages ?? []).map((page, index) => (
                              <tr key={index}>
                                <td className="px-4 lg:px-6 py-3 lg:py-4 whitespace-nowrap text-xs sm:text-sm font-medium text-gray-900 dark:text-white break-words">
                                  {page.path || '/'}
                                </td>
                                <td className="px-4 lg:px-6 py-3 lg:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500 dark:text-gray-300">
                                  {(page.views ?? 0).toLocaleString('pt-BR')}
                                </td>
                                <td className="px-4 lg:px-6 py-3 lg:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500 dark:text-gray-300">
                                  {formatTime(page.avgTime ?? 0)}
                                </td>
                                <td className="px-4 lg:px-6 py-3 lg:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500 dark:text-gray-300">
                                  <span className={`px-2 py-1 rounded-full text-[10px] sm:text-xs font-medium ${
                                    (page.bounceRate ?? 0) > 70 ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300' :
                                    (page.bounceRate ?? 0) > 40 ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300' :
                                    'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                                  }`}>
                                    {(page.bounceRate ?? 0)}%
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {/* Mobile Cards */}
                      <div className="lg:hidden space-y-3">
                        {(behaviorAnalytics?.topPages ?? []).map((page, index) => (
                          <div key={index} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                            <div className="mb-2">
                              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Página</p>
                              <p className="text-sm font-semibold text-gray-900 dark:text-white break-words">{page.path || '/'}</p>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                              <div>
                                <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5">Visualizações</p>
                                <p className="text-xs sm:text-sm text-gray-900 dark:text-white">{(page.views ?? 0).toLocaleString('pt-BR')}</p>
                              </div>
                              <div>
                                <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5">Tempo Médio</p>
                                <p className="text-xs sm:text-sm text-gray-900 dark:text-white">{formatTime(page.avgTime ?? 0)}</p>
                              </div>
                              <div>
                                <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5">Taxa de Rejeição</p>
                                <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium ${
                                  (page.bounceRate ?? 0) > 70 ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300' :
                                  (page.bounceRate ?? 0) > 40 ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300' :
                                  'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                                }`}>
                                  {(page.bounceRate ?? 0)}%
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-8 sm:py-10 lg:py-12 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                      Nenhum dado disponível
                    </div>
                  )}
                </div>

                {/* Distribuição de Tempo */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 lg:gap-6 mb-4 sm:mb-5 lg:mb-6">
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-lg p-3 sm:p-4 lg:p-6 border border-gray-200 dark:border-gray-700">
                    <h2 className="text-base sm:text-lg lg:text-xl font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4">
                      Distribuição de Tempo na Página
                    </h2>
                    {behaviorAnalytics.timeDistribution.length > 0 ? (
                      <div className="w-full overflow-x-auto">
                        <ResponsiveContainer width="100%" height={250} minHeight={200}>
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
                              outerRadius={60}
                              fill="#8884d8"
                              dataKey="count"
                            >
                              {behaviorAnalytics.timeDistribution.map((_, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip content={<CustomChartTooltip />} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="text-center py-8 sm:py-10 lg:py-12 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                        Nenhum dado disponível
                      </div>
                    )}
                  </div>

                  {/* Funil de Conversão */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-lg p-3 sm:p-4 lg:p-6 border border-gray-200 dark:border-gray-700">
                    <h2 className="text-base sm:text-lg lg:text-xl font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4">
                      Funil de Conversão
                    </h2>
                    {behaviorAnalytics?.funnelData && behaviorAnalytics.funnelData.length > 0 ? (
                      <div className="space-y-3 sm:space-y-4">
                        {behaviorAnalytics.funnelData.map((step, index) => {
                          const maxViews = Math.max(...behaviorAnalytics.funnelData.map(f => f.views ?? 0))
                          const percentage = maxViews > 0 ? ((step.views ?? 0) / maxViews) * 100 : 0
                          const prevViews = index > 0 ? (behaviorAnalytics.funnelData[index - 1].views ?? 0) : (step.views ?? 0)
                          const conversionRate = prevViews > 0 ? (((step.views ?? 0) / prevViews) * 100).toFixed(1) : '100.0'
                          
                          return (
                            <div key={index}>
                              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2 mb-1.5 sm:mb-2">
                                <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 break-words">
                                  {step.path === '/' ? 'Home' : 
                                   step.path === '/produtos' ? 'Produtos' :
                                   step.path === '/carrinho' ? 'Carrinho' :
                                   step.path === '/checkout' ? 'Checkout' : step.path}
                                </span>
                                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 lg:gap-4">
                                  <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                                    {(step.views ?? 0).toLocaleString('pt-BR')} visualizações
                                  </span>
                                  {index > 0 && (
                                    <span className="text-[10px] sm:text-xs text-gray-400 dark:text-gray-500">
                                      {conversionRate}% conversão
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 sm:h-4">
                                <div
                                  className="bg-indigo-600 dark:bg-indigo-500 h-3 sm:h-4 rounded-full transition-all"
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                              {index < (behaviorAnalytics?.funnelData?.length ?? 0) - 1 && (
                                <div className="flex justify-center my-1.5 sm:my-2">
                                  <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400 dark:text-gray-500" />
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-8 sm:py-10 lg:py-12 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                        Nenhum dado disponível
                      </div>
                    )}
                  </div>
                </div>

                {/* Páginas de Entrada e Saída */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 lg:gap-6">
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-lg p-3 sm:p-4 lg:p-6 border border-gray-200 dark:border-gray-700">
                    <h2 className="text-base sm:text-lg lg:text-xl font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4">
                      Páginas de Entrada
                    </h2>
                    {behaviorAnalytics.topEntryPages.length > 0 ? (
                      <div className="w-full overflow-x-auto">
                        <ResponsiveContainer width="100%" height={250} minHeight={200}>
                          <BarChart data={behaviorAnalytics.topEntryPages.slice(0, 5)} layout="vertical" margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#88888825" />
                            <XAxis type="number" tick={{ fontSize: 10, fill: '#9ca3af' }} />
                            <YAxis dataKey="path" type="category" width={80} tick={{ fontSize: 10, fill: '#9ca3af' }} />
                            <Tooltip content={<CustomChartTooltip />} />
                            <Bar dataKey="count" fill="#3b82f6" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="text-center py-8 sm:py-10 lg:py-12 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                        Nenhum dado disponível
                      </div>
                    )}
                  </div>

                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-lg p-3 sm:p-4 lg:p-6 border border-gray-200 dark:border-gray-700">
                    <h2 className="text-base sm:text-lg lg:text-xl font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4">
                      Páginas de Saída
                    </h2>
                    {behaviorAnalytics.topExitPages.length > 0 ? (
                      <div className="w-full overflow-x-auto">
                        <ResponsiveContainer width="100%" height={250} minHeight={200}>
                          <BarChart data={behaviorAnalytics.topExitPages.slice(0, 5)} layout="vertical" margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#88888825" />
                            <XAxis type="number" tick={{ fontSize: 10, fill: '#9ca3af' }} />
                            <YAxis dataKey="path" type="category" width={80} tick={{ fontSize: 10, fill: '#9ca3af' }} />
                            <Tooltip content={<CustomChartTooltip />} />
                            <Bar dataKey="count" fill="#ef4444" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="text-center py-8 sm:py-10 lg:py-12 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                        Nenhum dado disponível
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-8 sm:py-10 lg:py-12 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
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
