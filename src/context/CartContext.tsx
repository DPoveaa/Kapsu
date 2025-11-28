import { createContext, useContext, useState, ReactNode } from 'react'
import { CartItem, Product, CustomMedication } from '../types'

interface CartContextType {
  items: CartItem[]
  addProduct: (product: Product, quantity: number) => void
  addCustomMedication: (medication: CustomMedication, quantity: number) => void
  removeItem: (id: string) => void
  updateQuantity: (id: string, quantity: number) => void
  clearCart: () => void
  getTotal: () => number
  getItemCount: () => number
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])

  const addProduct = (product: Product, quantity: number) => {
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
  }

  const addCustomMedication = (medication: CustomMedication, quantity: number) => {
    setItems(prev => [...prev, {
      id: medication.id,
      customMedication: medication,
      quantity,
      type: 'custom'
    }])
  }

  const removeItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id))
  }

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(id)
      return
    }
    setItems(prev => prev.map(item =>
      item.id === id ? { ...item, quantity } : item
    ))
  }

  const clearCart = () => {
    setItems([])
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
      addProduct,
      addCustomMedication,
      removeItem,
      updateQuantity,
      clearCart,
      getTotal,
      getItemCount
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



