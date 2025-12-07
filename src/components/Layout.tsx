import { ReactNode } from 'react'
import Header from './Header'
import Footer from './Footer'
import { useTrackAccess } from '../hooks/useTrackAccess'
import { usePageTracking } from '../hooks/usePageTracking'

interface LayoutProps {
  children: ReactNode
}

export default function Layout({ children }: LayoutProps) {
  // Rastreia acessos automaticamente
  useTrackAccess()
  // Rastreia comportamento detalhado (tempo, scroll, cliques)
  usePageTracking()

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow">
        {children}
      </main>
      <Footer />
    </div>
  )
}







