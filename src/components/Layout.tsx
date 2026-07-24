import { ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import Header from './Header'
import Footer from './Footer'
import { usePageTracking } from '../hooks/usePageTracking'

interface LayoutProps {
  children: ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation()
  const isAdminRoute = location.pathname.startsWith('/admin')
  const isSupplierRoute = location.pathname.startsWith('/supplier')
  
  // Rotas que não devem mostrar Header e Footer
  const legalRoutes = ['/termos-de-servico', '/politica-de-privacidade']
  const hideHeaderFooter = ['/login', '/cadastro', '/recuperar-senha', ...legalRoutes].includes(location.pathname) || isSupplierRoute
  const showFooter = !hideHeaderFooter && !isAdminRoute

  // Rastreia acessos automaticamente
  // Rastreia comportamento detalhado (tempo, scroll, cliques)
  usePageTracking()

  return (
    <div className={`min-h-screen w-full overflow-x-hidden flex flex-col bg-palette-light dark:bg-gray-950 transition-colors duration-300 ${isAdminRoute ? 'h-screen overflow-hidden' : ''}`}>
      {!hideHeaderFooter && <Header />}
      <main className={`flex-grow dark:bg-gray-950 ${isAdminRoute ? 'overflow-hidden flex flex-col min-h-0' : ''}`}>
        {children}
      </main>
      {showFooter && <Footer />}
    </div>
  )
}







