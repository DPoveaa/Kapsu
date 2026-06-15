import { createContext, useContext, useState, ReactNode, useEffect } from 'react'
import { CartItem, Product } from '../types'
import { cartService } from '../services/cart.service'
import { productsService } from '../services/products.service'
import { useAuth } from './AuthContext'

interface CartContextType {
  items: CartItem[]
  loading: boolean
  addProduct: (product: Product, quantity: number) => Promise<void>
  removeItem: (id: string) => Promise<void>
  updateQuantity: (id: string, quantity: number) => Promise<void>
  clearCart: () => Promise<void>
  getTotal: () => number
  getItemCount: () => number
  refreshCart: () => Promise<void>
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export function CartProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth()
  const [items, setItems] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(true)

  // Carrega carrinho quando usuário está autenticado
  useEffect(() => {
    if (isAuthenticated) {
      loadCart()
    } else {
      setItems([])
      setLoading(false)
    }
  }, [isAuthenticated])

  const loadCart = async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true)
      }
      const cartData = await cartService.getCart()
      
      // Converte itens do backend para formato do frontend
      const cartItems: CartItem[] = cartData.items.map(item => ({
        id: item.id,
        product: item.product ? {
          id: item.product.id,
          name: item.product.name,
          description: item.product.description || '',
          price: Number(item.product.price),
          image: productsService.getImageUrl(item.product.image),
          category: (item.product.category as any) || 'outros',
          active: ((item.product as any).active ?? true),
        } : undefined,
        quantity: item.quantity,
        purchaseType: 'one-time',
      }))

      setItems(cartItems)
    } catch (error) {
      console.error('Erro ao carregar carrinho:', error)
      if (showLoading) {
        setItems([])
      }
    } finally {
      if (showLoading) {
        setLoading(false)
      }
    }
  }

  const addProduct = async (product: Product, quantity: number) => {
    // SEMPRE adiciona como 'one-time' - assinatura só pode ser definida globalmente no carrinho
    const purchaseType: 'one-time' = 'one-time'
    
    if (!isAuthenticated) {
      // Fallback para modo offline/local
      setItems(prev => {
        const existing = prev.find(item => item.product?.id === product.id)
        if (existing) {
          return prev.map(item =>
            item.id === existing.id
              ? { ...item, quantity: item.quantity + quantity, purchaseType }
              : item
          )
        }
        return [...prev, { id: Date.now().toString(), product, quantity, purchaseType }]
      })
      return
    }

    try {
      await cartService.addItem(product.id, quantity, purchaseType)
      await loadCart(false) // Sincroniza carrinho sem trocar a tela inteira por loading
    } catch (error) {
      console.error('Erro ao adicionar produto:', error)
      throw error
    }
  }

  const removeItem = async (id: string) => {
    if (!isAuthenticated) {
      setItems(prev => prev.filter(item => item.id !== id))
      return
    }

    const previousItems = items

    try {
      setItems(prev => prev.filter(item => item.id !== id))
      await cartService.removeItem(id)
      await loadCart(false) // Sincroniza carrinho sem trocar a tela inteira por loading
    } catch (error) {
      console.error('Erro ao remover item:', error)
      setItems(previousItems)
      await loadCart(false)
      throw error
    }
  }

  const updateQuantity = async (id: string, quantity: number) => {
    if (quantity <= 0) {
      await removeItem(id)
      return
    }

    if (!isAuthenticated) {
      setItems(prev => prev.map(item =>
        item.id === id ? { ...item, quantity } : item
      ))
      return
    }

    const previousItems = items

    try {
      setItems(prev => prev.map(item =>
        item.id === id ? { ...item, quantity } : item
      ))
      await cartService.updateItem(id, quantity)
      await loadCart(false) // Sincroniza carrinho sem trocar a tela inteira por loading
    } catch (error) {
      console.error('Erro ao atualizar quantidade:', error)
      setItems(previousItems)
      await loadCart(false)
      throw error
    }
  }

  // REMOVIDO: updatePurchaseType - não é mais possível alterar purchaseType de produtos individuais
  // A assinatura foi removida completamente.

  const clearCart = async () => {
    if (!isAuthenticated) {
      setItems([])
      return
    }

    try {
      await cartService.clearCart()
      await loadCart(false) // Sincroniza carrinho sem trocar a tela inteira por loading
    } catch (error) {
      console.error('Erro ao limpar carrinho:', error)
      throw error
    }
  }

  const getTotal = () => {
    return items.reduce((total, item) => {
      const price = item.product?.price || 0
      return total + (price * item.quantity)
    }, 0)
  }

  const getItemCount = () => {
    return items.reduce((count, item) => count + item.quantity, 0)
  }

  return (
    <CartContext.Provider value={{
      items,
      loading,
      addProduct,
      removeItem,
      updateQuantity,
      clearCart,
      getTotal,
      getItemCount,
      refreshCart: loadCart,
    }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider')
  }
  return context
}
