import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import Home from './pages/Home'
import Products from './pages/Products'
import Customize from './pages/Customize'
import ProductDetail from './pages/ProductDetail'
import Cart from './pages/Cart'
import Checkout from './pages/Checkout'
import Login from './pages/Login'
import Register from './pages/Register'
import AdminPanel from './pages/AdminPanel'
import WhatsAppConnection from './pages/WhatsAppConnection'
import WhatsAppSupport from './pages/WhatsAppSupport'
import UserManagement from './pages/UserManagement'
import CreateProduct from './pages/CreateProduct'
import ManageProducts from './pages/ManageProducts'
import EditProduct from './pages/EditProduct'
import ManageOrders from './pages/ManageOrders'
import Reports from './pages/Reports'
import SiteSettings from './pages/SiteSettings'
import ShippingSettings from './pages/ShippingSettings'
import FreeShippingRules from './pages/FreeShippingRules'
import ManagePromotions from './pages/ManagePromotions'
import ManagePromoCodes from './pages/ManagePromoCodes'
import ManageCompostos from './pages/ManageCompostos'
import ManageBanners from './pages/ManageBanners'
import ManageReviews from './pages/ManageReviews'
import ManageHomeSections from './pages/ManageHomeSections'
import OrderDetail from './pages/OrderDetail'
import PaymentSuccess from './pages/PaymentSuccess'
import PaymentFailure from './pages/PaymentFailure'
import Profile from './pages/Profile'
import { CartProvider } from './context/CartContext'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import FloatingChat from './components/FloatingChat'

function AppContent() {
  const location = useLocation()
  const hideChat = ['/login', '/cadastro'].includes(location.pathname)

  return (
    <Layout>
      {!hideChat && <FloatingChat />}
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/produtos" element={<Products />} />
              <Route path="/produtos/:id" element={<ProductDetail />} />
              <Route path="/personalizar" element={<Customize />} />
              <Route path="/carrinho" element={<Cart />} />
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/checkout/success" element={<PaymentSuccess />} />
              <Route path="/checkout/failure" element={<PaymentFailure />} />
              <Route path="/payment-success" element={<PaymentSuccess />} />
              <Route path="/payment-failure" element={<PaymentFailure />} />
              <Route path="/login" element={<Login />} />
              <Route path="/cadastro" element={<Register />} />
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
                    <AdminPanel />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/whatsapp"
                element={
                  <ProtectedRoute requireAdmin>
                    <WhatsAppConnection />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/whatsapp/support"
                element={
                  <ProtectedRoute requireAdmin>
                    <WhatsAppSupport />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/users"
                element={
                  <ProtectedRoute requireAdmin>
                    <UserManagement />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/products"
                element={
                  <ProtectedRoute requireAdmin>
                    <ManageProducts />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/products/create"
                element={
                  <ProtectedRoute requireAdmin>
                    <CreateProduct />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/products/edit/:id"
                element={
                  <ProtectedRoute requireAdmin>
                    <EditProduct />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/compostos"
                element={
                  <ProtectedRoute requireAdmin>
                    <ManageCompostos />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/orders"
                element={
                  <ProtectedRoute requireAdmin>
                    <ManageOrders />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/reports"
                element={
                  <ProtectedRoute requireAdmin>
                    <Reports />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/settings"
                element={
                  <ProtectedRoute requireAdmin>
                    <SiteSettings />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/shipping"
                element={
                  <ProtectedRoute requireAdmin>
                    <ShippingSettings />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/shipping/free-rules"
                element={
                  <ProtectedRoute requireAdmin>
                    <FreeShippingRules />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/promotions"
                element={
                  <ProtectedRoute requireAdmin>
                    <ManagePromotions />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/promo-codes"
                element={
                  <ProtectedRoute requireAdmin>
                    <ManagePromoCodes />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/banners"
                element={
                  <ProtectedRoute requireAdmin>
                    <ManageBanners />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/reviews"
                element={
                  <ProtectedRoute requireAdmin>
                    <ManageReviews />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/home-sections"
                element={
                  <ProtectedRoute requireAdmin>
                    <ManageHomeSections />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/orders/:id"
                element={
                  <ProtectedRoute requireAdmin>
                    <OrderDetail />
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
          <Router>
            <AppContent />
          </Router>
        </CartProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App

