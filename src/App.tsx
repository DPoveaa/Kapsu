import { useEffect, useState } from 'react'
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import AdminLayout from './components/AdminLayout'
import Home from './pages/Home'
import Products from './pages/Products'
import ProductDetail from './pages/ProductDetail'
import Cart from './pages/Cart'
import CheckoutCardPayment from './pages/CheckoutCardPayment'
import Login from './pages/Login'
import AdminPanel from './pages/AdminPanel'
import WhatsAppConnection from './pages/WhatsAppConnection'
import WhatsAppSupport from './pages/WhatsAppSupport'
import UserManagement from './pages/UserManagement'
import ManageProducts from './pages/ManageProducts'
import ManageOrders from './pages/ManageOrders'
import Reports from './pages/Reports'
import SiteSettings from './pages/SiteSettings'
import ShippingSettings from './pages/ShippingSettings'
import FreeShippingRules from './pages/FreeShippingRules'
import ManagePromotions from './pages/ManagePromotions'
import ManagePromoCodes from './pages/ManagePromoCodes'
import AuditLogs from './pages/AuditLogs'

import ManageBanners from './pages/ManageBanners'
import ManageReviews from './pages/ManageReviews'
import ManageHomeSections from './pages/ManageHomeSections'
import ManageHeaderCategories from './pages/ManageHeaderCategories'
import OrderDetail from './pages/OrderDetail'
import PaymentSuccess from './pages/PaymentSuccess'
import PaymentFailure from './pages/PaymentFailure'
import Profile from './pages/Profile'
import RecoverPassword from './pages/RecoverPassword'
import { CartProvider } from './context/CartContext'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import { FavoritesProvider } from './context/FavoritesContext'
import FloatingChat from './components/FloatingChat'
import ToastContainer from './components/ToastContainer'
import { siteSettingsService, SiteSettings as SiteSettingsType } from './services/site-settings.service'

function AppContent() {
  const location = useLocation()
  const [chatbotEnabled, setChatbotEnabled] = useState(true)
  const hideChat = ['/login', '/cadastro', '/recuperar-senha'].includes(location.pathname)

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

  return (
    <Layout>
      <ToastContainer />
      {!hideChat && chatbotEnabled && <FloatingChat />}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/produtos" element={<Products />} />
        <Route path="/produtos/:id" element={<ProductDetail />} />
        <Route path="/carrinho" element={<Cart />} />
        <Route path="/carrinho/payment/card" element={<CheckoutCardPayment />} />
        <Route path="/checkout" element={<Navigate to="/carrinho?step=delivery" replace />} />
        <Route path="/checkout/payment/card" element={<Navigate to="/carrinho/payment/card" replace />} />
        <Route path="/checkout/success" element={<PaymentSuccess />} />
        <Route path="/checkout/failure" element={<PaymentFailure />} />
        <Route path="/payment-success" element={<PaymentSuccess />} />
        <Route path="/payment-failure" element={<PaymentFailure />} />
        <Route path="/login" element={<Login />} />
        <Route path="/cadastro" element={<Login />} />
        <Route path="/recuperar-senha" element={<RecoverPassword />} />
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
          path="/admin/orders/:id"
          element={
            <ProtectedRoute requireAdmin>
              <AdminLayout>
                <OrderDetail />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
      </Routes>
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

