import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
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
import { CartProvider } from './context/CartContext'
import { AuthProvider } from './context/AuthContext'
import FloatingChat from './components/FloatingChat'

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <Router>
          <Layout>
            <FloatingChat />
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/produtos" element={<Products />} />
              <Route path="/produtos/:id" element={<ProductDetail />} />
              <Route path="/personalizar" element={<Customize />} />
              <Route path="/carrinho" element={<Cart />} />
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/login" element={<Login />} />
              <Route path="/cadastro" element={<Register />} />
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
                path="/admin/orders"
                element={
                  <ProtectedRoute requireAdmin>
                    <ManageOrders />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </Layout>
        </Router>
      </CartProvider>
    </AuthProvider>
  )
}

export default App

