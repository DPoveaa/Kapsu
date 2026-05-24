import { createContext, useContext, useState, ReactNode, useEffect } from 'react'
import { CartItem, Product } from '../types'
import { cartService } from '../services/cart.service'
import { useAuth } from './AuthContext'

interface CartContextType {
  items: CartItem[]
  loading: boolean
  addProduct: (product: Product, quantity: number) => Promise<void>
  removeItem: (id: string) => Promise<void>
  updateQuantity: (id: string, quantity: number) => Promise<void>
  updateAllPurchaseType: (purchaseType: 'one-time' | 'subscription') => Promise<void>
  clearCart: () => Promise<void>
  getTotal: () => number
  getItemCount: () => number
  refreshCart: () => Promise<void>
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export function CartProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth()
  const [items, setItems] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(false)

  // Carrega carrinho quando usuário está autenticado
  useEffect(() => {
    if (isAuthenticated) {
      loadCart()
    } else {
      setItems([])
    }
  }, [isAuthenticated])

  const loadCart = async () => {
    try {
      setLoading(true)
      const cartData = await cartService.getCart()
      
      // Converte itens do backend para formato do frontend
      const cartItems: CartItem[] = cartData.items.map(item => ({
        id: item.id,
        product: item.product ? {
          id: item.product.id,
          name: item.product.name,
          description: item.product.description || '',
          price: Number(item.product.price),
          image: item.product.image || '',
          category: (item.product.category as any) || 'outros',
          inStock: ((item.product as any).stock || 0) > 0,
        } : undefined,
        quantity: item.quantity,
        purchaseType: (item.purchase_type as 'one-time' | 'subscription' | undefined) || 'one-time',
      }))

      setItems(cartItems)
    } catch (error) {
      console.error('Erro ao carregar carrinho:', error)
      setItems([])
    } finally {
      setLoading(false)
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
      await loadCart() // Recarrega carrinho
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

    try {
      await cartService.removeItem(id)
      await loadCart() // Recarrega carrinho
    } catch (error) {
      console.error('Erro ao remover item:', error)
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

    try {
      await cartService.updateItem(id, quantity)
      await loadCart() // Recarrega carrinho
    } catch (error) {
      console.error('Erro ao atualizar quantidade:', error)
      throw error
    }
  }

  // REMOVIDO: updatePurchaseType - não é mais possível alterar purchaseType de produtos individuais
  // A assinatura só pode ser definida globalmente para todo o carrinho através de updateAllPurchaseType

  const updateAllPurchaseType = async (purchaseType: 'one-time' | 'subscription') => {
    // Atualiza todos os itens localmente primeiro
    setItems(prev => prev.map(item => ({ ...item, purchaseType })))

    if (!isAuthenticated) {
      return
    }

    // Atualiza todos os itens no backend
    try {
      const currentItems = items // Captura os itens atuais antes de atualizar
      const updatePromises = currentItems
        .map(item => cartService.updateItem(item.id, undefined, purchaseType))
      
      await Promise.all(updatePromises)
      // Não recarrega o carrinho para evitar o "piscar" - mantém o estado local atualizado
      // O carrinho será recarregado naturalmente na próxima vez que for necessário
    } catch (error) {
      console.error('Erro ao atualizar tipo de compra de todos os itens:', error)
      // Em caso de erro, recarrega o carrinho para reverter
      await loadCart()
      throw error
    }
  }

  const clearCart = async () => {
    if (!isAuthenticated) {
      setItems([])
      return
    }

    try {
      await cartService.clearCart()
      await loadCart() // Recarrega carrinho
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
      updateAllPurchaseType,
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
