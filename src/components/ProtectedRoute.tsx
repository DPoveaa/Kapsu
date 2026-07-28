import { useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Loader2 } from 'lucide-react'

interface ProtectedRouteProps {
  children: React.ReactNode
  requireAdmin?: boolean
  requireSupplier?: boolean
}

function AccessDeniedRedirect() {
  const { logout } = useAuth()

  useEffect(() => {
    logout()
  }, [logout])

  return <Navigate to="/login" replace />
}

export default function ProtectedRoute({
  children,
  requireAdmin = false,
  requireSupplier = false,
}: ProtectedRouteProps) {
  const { isAuthenticated, isAdmin, isPharmacist, isSupplier, loading } = useAuth()

  // Mostra loading enquanto verifica autenticação
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (requireAdmin && !isAdmin && !isPharmacist) {
    return <AccessDeniedRedirect />
  }

  if (requireSupplier && !isAdmin && !isSupplier) {
    return <AccessDeniedRedirect />
  }

  return <>{children}</>
}

