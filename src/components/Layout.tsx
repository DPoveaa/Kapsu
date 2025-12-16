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
  
  // Rotas que não devem mostrar Header e Footer
  const hideHeaderFooter = ['/login', '/cadastro'].includes(location.pathname)

  // Rastreia acessos automaticamente
  useTrackAccess()
  // Rastreia comportamento detalhado (tempo, scroll, cliques)
  usePageTracking()

  return (
    <div className="min-h-screen flex flex-col bg-palette-light dark:bg-gray-900 transition-colors duration-300">
      {!hideHeaderFooter && <Header />}
      <main className="flex-grow">
        {children}
      </main>
      {!hideHeaderFooter && <Footer />}
    </div>
  )
}







