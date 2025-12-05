import { createContext, useContext, useState, ReactNode, useEffect } from 'react'
import { CartItem, Product, CustomMedication } from '../types'
import { cartService } from '../services/cart.service'
import { useAuth } from './AuthContext'

interface CartContextType {
  items: CartItem[]
  loading: boolean
  addProduct: (product: Product, quantity: number) => Promise<void>
  addCustomMedication: (medication: CustomMedication, quantity: number) => void
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
          inStock: (item.product.stock || 0) > 0,
          isCustomizable: true,
        } : undefined,
        quantity: item.quantity,
        type: 'product' as const,
      }))

      setItems(cartItems)
    } catch (error) {
      console.error('Erro ao carregar carrinho:', error)
      // Em caso de erro, mantém carrinho vazio
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  const addProduct = async (product: Product, quantity: number) => {
    if (!isAuthenticated) {
      // Fallback para modo offline/local
      setItems(prev => {
        const existing = prev.find(item => item.product?.id === product.id && item.type === 'product')
        if (existing) {
          return prev.map(item =>
            item.id === existing.id
              ? { ...item, quantity: item.quantity + quantity }
              : item
          )
        }
        return [...prev, { id: Date.now().toString(), product, quantity, type: 'product' }]
      })
      return
    }

    try {
      await cartService.addItem(product.id, quantity)
      await loadCart() // Recarrega carrinho
    } catch (error) {
      console.error('Erro ao adicionar produto:', error)
      throw error
    }
  }

  const addCustomMedication = (medication: CustomMedication, quantity: number) => {
    // CustomMedication ainda não está no banco, mantém local
    setItems(prev => [...prev, {
      id: medication.id,
      customMedication: medication,
      quantity,
      type: 'custom'
    }])
  }

  const removeItem = async (id: string) => {
    const item = items.find(i => i.id === id)
    
    // Se for custom medication, remove localmente
    if (item?.type === 'custom') {
      setItems(prev => prev.filter(item => item.id !== id))
      return
    }

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

    const item = items.find(i => i.id === id)
    
    // Se for custom medication, atualiza localmente
    if (item?.type === 'custom') {
      setItems(prev => prev.map(item =>
        item.id === id ? { ...item, quantity } : item
      ))
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
      const price = item.product?.price || item.customMedication?.price || 0
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
      addCustomMedication,
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







