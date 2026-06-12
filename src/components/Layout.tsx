import { ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import Header from './Header'
import Footer from './Footer'
import { useTrackAccess } from '../hooks/useTrackAccess'
import { usePageTracking } from '../hooks/usePageTracking'

interface LayoutProps {
  children: ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation()
  const isAdminRoute = location.pathname.startsWith('/admin')
  
  // Rotas que não devem mostrar Header e Footer
  const hideHeaderFooter = ['/login', '/cadastro', '/recuperar-senha'].includes(location.pathname)
  const showFooter = !hideHeaderFooter && !isAdminRoute

  // Rastreia acessos automaticamente
  useTrackAccess()
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







