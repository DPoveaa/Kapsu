import { lazy, Suspense, useEffect, useState } from 'react'
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate, useSearchParams } from 'react-router-dom'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import Home from './pages/Home'
import { CartProvider } from './context/CartContext'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import { FavoritesProvider } from './context/FavoritesContext'
import ToastContainer from './components/ToastContainer'
import { siteSettingsService, SiteSettings as SiteSettingsType } from './services/site-settings.service'
import { ADMIN_AI_CENTER_LEGACY_ROUTES, ADMIN_AI_CENTER_PATH } from './constants/adminRoutes'
import { lazyWithRetry } from './utils/lazyWithRetry'
import { trackPageView } from './utils/gtag'

// Keep the storefront shell and Home in the initial bundle. Every other route is
// downloaded only when visited, so admin/reporting libraries never delay Home.
const Products = lazy(() => import('./pages/Products'))
const ProductDetail = lazy(() => import('./pages/ProductDetail'))
const Cart = lazy(() => import('./pages/Cart'))
const Login = lazy(() => import('./pages/Login'))
const AdminLayout = lazy(() => import('./components/AdminLayout'))
const AdminPanel = lazy(() => import('./pages/AdminPanel'))
const WhatsAppConnection = lazy(() => import('./pages/WhatsAppConnection'))
const WhatsAppSupport = lazy(() => import('./pages/WhatsAppSupport'))
const UserManagement = lazy(() => import('./pages/UserManagement'))
const ManageProducts = lazy(() => import('./pages/ManageProducts'))
const ManageOrders = lazy(() => import('./pages/ManageOrders'))
const Reports = lazy(() => import('./pages/Reports'))
const SiteSettings = lazy(() => import('./pages/SiteSettings'))
const GoogleSheetsSettings = lazy(() => import('./pages/GoogleSheetsSettings'))
const ShippingSettings = lazy(() => import('./pages/ShippingSettings'))
const FreeShippingRules = lazy(() => import('./pages/FreeShippingRules'))
const ManagePromotions = lazy(() => import('./pages/ManagePromotions'))
const ManagePromoCodes = lazy(() => import('./pages/ManagePromoCodes'))
const AuditLogs = lazy(() => import('./pages/AuditLogs'))
const ManageInstallmentRules = lazy(() => import('./pages/ManageInstallmentRules'))
const SupplierManagement = lazy(() => import('./pages/SupplierManagement'))
const SupplierPayments = lazy(() => import('./pages/SupplierPayments'))
const SupplierLayout = lazy(() => import('./components/SupplierLayout'))
const SupplierOrders = lazy(() => import('./pages/supplier/SupplierOrders'))
const SupplierPaymentHistory = lazy(() => import('./pages/supplier/SupplierPaymentHistory'))
const SupplierUserManagement = lazy(() => import('./pages/supplier/SupplierUserManagement'))
const SupplierAuditLogs = lazy(() => import('./pages/supplier/SupplierAuditLogs'))
const SupplierProfile = lazy(() => import('./pages/supplier/SupplierProfile'))
const ManageBanners = lazy(() => import('./pages/ManageBanners'))
const ManageReviews = lazy(() => import('./pages/ManageReviews'))
const ManageHomeSections = lazy(() => import('./pages/ManageHomeSections'))
const ManageHeaderCategories = lazy(() => import('./pages/ManageHeaderCategories'))
const KaiaChats = lazyWithRetry(() => import('./pages/KaiaChats'), 'admin-ai-center')
const OrderDetail = lazy(() => import('./pages/OrderDetail'))
const FiscalInvoices = lazy(() => import('./pages/FiscalInvoices'))
const SupplierOrderDetail = lazy(() => import('./pages/SupplierOrderDetail'))
const PaymentFailure = lazy(() => import('./pages/PaymentFailure'))
const Profile = lazy(() => import('./pages/Profile'))
const RecoverPassword = lazy(() => import('./pages/RecoverPassword'))
const PrivacyPolicyPage = lazy(() => import('./pages/PrivacyPolicyPage'))
const TermsOfServicePage = lazy(() => import('./pages/TermsOfServicePage'))
const PharmaceuticalInfoPage = lazy(() => import('./pages/PharmaceuticalInfoPage'))
const FloatingChat = lazy(() => import('./components/FloatingChat'))

function RouteFallback() {
  return (
    <div className="min-h-[45vh] flex items-center justify-center" role="status" aria-label="Carregando pagina">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-200 border-b-primary-600" />
    </div>
  )
}

function PaymentSuccessRedirect() {
  const [searchParams] = useSearchParams()
  const orderId = searchParams.get('order_id') || searchParams.get('external_reference')
  const target = orderId
    ? `/carrinho?step=confirmed&orderId=${encodeURIComponent(orderId)}&paid=1`
    : '/carrinho?step=confirmed&paid=1'
  return <Navigate to={target} replace />
}

function AppContent() {
  const location = useLocation()
  const [chatbotEnabled, setChatbotEnabled] = useState(false)
  const [chatReady, setChatReady] = useState(false)
  const isAdminRoute = location.pathname.startsWith('/admin')
  const isSupplierRoute = location.pathname.startsWith('/supplier')
  const hideChat = ['/login', '/cadastro', '/recuperar-senha'].includes(location.pathname) || isAdminRoute || isSupplierRoute

  useEffect(() => {
    trackPageView(location.pathname + location.search)
  }, [location])

  useEffect(() => {
    let isMounted = true

    const loadChatbotSettings = async () => {
      try {
        const settings = await siteSettingsService.getSettings()
        siteSettingsService.publishSettings(settings)
        if (isMounted) {
          setChatbotEnabled(settings.chatbot_enabled !== false)
        }
      } catch (error) {
        if (isMounted) {
          setChatbotEnabled(true)
        }
      }
    }

    const handleSettingsUpdated = (event: Event) => {
      const settings = (event as CustomEvent<SiteSettingsType>).detail
      if (settings) {
        setChatbotEnabled(settings.chatbot_enabled !== false)
      }
    }

    loadChatbotSettings()
    window.addEventListener('site-settings-updated', handleSettingsUpdated)

    return () => {
      isMounted = false
      window.removeEventListener('site-settings-updated', handleSettingsUpdated)
    }
  }, [])

  useEffect(() => {
    if (hideChat || !chatbotEnabled) {
      setChatReady(false)
      return
    }

    // The chat is non-critical for first paint. Let the banner and storefront
    // finish first so its large module does not compete with the Home LCP.
    const timer = window.setTimeout(() => setChatReady(true), 1200)
    return () => window.clearTimeout(timer)
  }, [hideChat, chatbotEnabled])

  return (
    <Layout>
      <ToastContainer />
      {!hideChat && chatbotEnabled && chatReady && (
        <Suspense fallback={null}>
          <FloatingChat />
        </Suspense>
      )}
      <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/produtos" element={<Products />} />
        <Route path="/produtos/:idSlug" element={<ProductDetail />} />
        <Route path="/carrinho" element={<Cart />} />
        <Route path="/carrinho/payment/card" element={<Navigate to="/carrinho?step=payment" replace />} />
        <Route path="/checkout" element={<Navigate to="/carrinho?step=delivery" replace />} />
        <Route path="/checkout/payment/card" element={<Navigate to="/carrinho/payment/card" replace />} />
        <Route path="/checkout/success" element={<PaymentSuccessRedirect />} />
        <Route path="/checkout/failure" element={<PaymentFailure />} />
        <Route path="/payment-success" element={<PaymentSuccessRedirect />} />
        <Route path="/payment-failure" element={<PaymentFailure />} />
        <Route path="/login" element={<Login />} />
        <Route path="/cadastro" element={<Login />} />
        <Route path="/recuperar-senha" element={<RecoverPassword />} />
        <Route path="/politica-de-privacidade" element={<PrivacyPolicyPage />} />
        <Route path="/termos-de-servico" element={<TermsOfServicePage />} />
        <Route path="/informacoes-farmaceuticas" element={<PharmaceuticalInfoPage />} />
        <Route path="/fornecedor/pedidos/:id" element={<SupplierOrderDetail />} />
        <Route
          path="/perfil"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute requireAdmin>
              <AdminLayout>
                <AdminPanel />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/whatsapp"
          element={
            <ProtectedRoute requireAdmin>
              <AdminLayout>
                <WhatsAppConnection />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/whatsapp/support"
          element={
            <ProtectedRoute requireAdmin>
              <AdminLayout>
                <WhatsAppSupport />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <ProtectedRoute requireAdmin>
              <AdminLayout>
                <UserManagement />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/products"
          element={
            <ProtectedRoute requireAdmin>
              <AdminLayout>
                <ManageProducts />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/products/create"
          element={
            <ProtectedRoute requireAdmin>
              <AdminLayout>
                <ManageProducts />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/products/edit/:id"
          element={
            <ProtectedRoute requireAdmin>
              <AdminLayout>
                <ManageProducts />
              </AdminLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/orders"
          element={
            <ProtectedRoute requireAdmin>
              <AdminLayout>
                <ManageOrders />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/notas-fiscais"
          element={
            <ProtectedRoute requireAdmin>
              <AdminLayout>
                <FiscalInvoices />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/reports"
          element={
            <ProtectedRoute requireAdmin>
              <AdminLayout>
                <Reports />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/settings"
          element={
            <ProtectedRoute requireAdmin>
              <AdminLayout>
                <SiteSettings />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/google-sheets"
          element={
            <ProtectedRoute requireAdmin>
              <AdminLayout>
                <GoogleSheetsSettings />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/audit"
          element={
            <ProtectedRoute requireAdmin>
              <AdminLayout>
                <AuditLogs />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/shipping"
          element={
            <ProtectedRoute requireAdmin>
              <AdminLayout>
                <ShippingSettings />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/shipping/free-rules"
          element={
            <ProtectedRoute requireAdmin>
              <AdminLayout>
                <FreeShippingRules />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/promotions"
          element={
            <ProtectedRoute requireAdmin>
              <AdminLayout>
                <ManagePromotions />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/promo-codes"
          element={
            <ProtectedRoute requireAdmin>
              <AdminLayout>
                <ManagePromoCodes />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/installment-rules"
          element={
            <ProtectedRoute requireAdmin>
              <AdminLayout>
                <ManageInstallmentRules />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/banners"
          element={
            <ProtectedRoute requireAdmin>
              <AdminLayout>
                <ManageBanners />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/reviews"
          element={
            <ProtectedRoute requireAdmin>
              <AdminLayout>
                <ManageReviews />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/home-sections"
          element={
            <ProtectedRoute requireAdmin>
              <AdminLayout>
                <ManageHomeSections />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/header-categories"
          element={
            <ProtectedRoute requireAdmin>
              <AdminLayout>
                <ManageHeaderCategories />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path={ADMIN_AI_CENTER_PATH}
          element={
            <ProtectedRoute requireAdmin>
              <AdminLayout>
                <KaiaChats />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        {ADMIN_AI_CENTER_LEGACY_ROUTES.map(({ path, target }) => (
          <Route key={path} path={path} element={<Navigate to={target} replace />} />
        ))}
        <Route
          path="/admin/orders/:id"
          element={
            <ProtectedRoute requireAdmin>
              <AdminLayout>
                <OrderDetail />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <ProtectedRoute requireAdmin>
              <AdminLayout>
                <UserManagement />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/suppliers"
          element={
            <ProtectedRoute requireAdmin>
              <AdminLayout>
                <SupplierManagement />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/supplier-payments"
          element={
            <ProtectedRoute requireAdmin>
              <AdminLayout>
                <SupplierPayments />
              </AdminLayout>
            </ProtectedRoute>
          }
        />

        {/* Portal do Fornecedor / Farmácia Parceira */}
        <Route
          path="/supplier"
          element={
            <ProtectedRoute requireSupplier>
              <SupplierLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/supplier/payments" replace />} />
          <Route path="orders" element={<SupplierOrders />} />
          <Route path="dashboard" element={<Navigate to="/supplier/payments" replace />} />
          <Route path="payments" element={<SupplierPaymentHistory />} />
          <Route path="users" element={<SupplierUserManagement />} />
          <Route path="profile" element={<SupplierProfile />} />
          <Route path="audit" element={<SupplierAuditLogs />} />
        </Route>
      </Routes>
      </Suspense>
    </Layout>
  )
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <CartProvider>
          <FavoritesProvider>
            <Router>
              <AppContent />
            </Router>
          </FavoritesProvider>
        </CartProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App

