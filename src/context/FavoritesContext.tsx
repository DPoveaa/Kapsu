import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react'
import { Product } from '../types'
import { useAuth } from './AuthContext'
import { favoritesService } from '../services/favorites.service'

interface FavoritesContextType {
  favorites: Product[]
  isFavorite: (productId: string) => boolean
  toggleFavorite: (product: Product) => void
  removeFavorite: (productId: string) => void
  favoritesCount: number
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined)

const FAVORITES_KEY = 'kapsu_favorites'

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [favorites, setFavorites] = useState<Product[]>(() => {
    try {
      const saved = localStorage.getItem(FAVORITES_KEY)
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })

  // Sync favorites when user log in/out status changes
  useEffect(() => {
    const syncFavorites = async () => {
      if (user) {
        const dbFavorites = await favoritesService.getFavorites()
        setFavorites(dbFavorites)
      } else {
        try {
          const saved = localStorage.getItem(FAVORITES_KEY)
          setFavorites(saved ? JSON.parse(saved) : [])
        } catch {
          setFavorites([])
        }
      }
    }
    syncFavorites()
  }, [user])

  // Save to localStorage when favorites change
  useEffect(() => {
    try {
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites))
    } catch {
      // ignore storage errors
    }
  }, [favorites])

  const isFavorite = useCallback((productId: string) => {
    return favorites.some(p => p.id === productId)
  }, [favorites])

  const toggleFavorite = useCallback((product: Product) => {
    setFavorites(prev => {
      const exists = prev.some(p => p.id === product.id)
      if (exists) {
        if (user) {
          favoritesService.removeFavorite(product.id)
        }
        return prev.filter(p => p.id !== product.id)
      }
      if (user) {
        favoritesService.addFavorite(product.id)
      }
      return [...prev, product]
    })
  }, [user])

  const removeFavorite = useCallback((productId: string) => {
    if (user) {
      favoritesService.removeFavorite(productId)
    }
    setFavorites(prev => prev.filter(p => p.id !== productId))
  }, [user])

  return (
    <FavoritesContext.Provider value={{
      favorites,
      isFavorite,
      toggleFavorite,
      removeFavorite,
      favoritesCount: favorites.length
    }}>
      {children}
    </FavoritesContext.Provider>
  )
}

export function useFavorites() {
  const context = useContext(FavoritesContext)
  if (context === undefined) {
    throw new Error('useFavorites must be used within a FavoritesProvider')
  }
  return context
}
