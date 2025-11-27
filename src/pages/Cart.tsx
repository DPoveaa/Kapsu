import { Link, useNavigate } from 'react-router-dom'
import { ShoppingCart, Plus, Minus, Trash2, ArrowRight, FileText } from 'lucide-react'
import { useCart } from '../context/CartContext'

export default function Cart() {
  const navigate = useNavigate()
  const { items, updateQuantity, removeItem, getTotal, clearCart } = useCart()

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto text-center">
          <ShoppingCart size={64} className="mx-auto text-gray-300 mb-4" />
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Seu carrinho está vazio</h2>
          <p className="text-gray-600 mb-8">
            Adicione produtos ou personalize um medicamento para começar
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/produtos" className="btn-primary">
              Explorar Produtos
            </Link>
            <Link to="/personalizar" className="btn-secondary">
              Personalizar Medicamento
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold text-gray-900 mb-8">Carrinho de Compras</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-4">
          {items.map(item => (
            <div key={item.id} className="card p-6">
              {item.type === 'product' && item.product ? (
                <>
                  <div className="flex gap-4">
                    <img
                      src={item.product.image}
                      alt={item.product.name}
                      className="w-24 h-24 object-cover rounded-lg"
                    />
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-gray-900 mb-1">
                        {item.product.name}
                      </h3>
                      <p className="text-gray-600 text-sm mb-2">{item.product.description}</p>
                      <p className="text-lg font-bold text-primary-600">
                        R$ {(item.product.price * item.quantity).toFixed(2).replace('.', ',')}
                      </p>
                    </div>
                    <div className="flex flex-col items-end justify-between">
                      <button
                        onClick={() => removeItem(item.id)}
                        className="text-red-600 hover:text-red-700 mb-2"
                      >
                        <Trash2 size={20} />
                      </button>
                      <div className="flex items-center border border-gray-300 rounded-lg">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="p-2 hover:bg-gray-100 transition-colors"
                        >
                          <Minus size={16} />
                        </button>
                        <span className="px-4 py-2 font-semibold">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="p-2 hover:bg-gray-100 transition-colors"
                        >
                          <Plus size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              ) : item.type === 'custom' && item.customMedication ? (
                <>
                  <div className="flex gap-4">
                    <div className="w-24 h-24 bg-gradient-to-br from-primary-100 to-accent-100 rounded-lg flex items-center justify-center">
                      <FileText className="text-primary-600" size={32} />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-gray-900 mb-1">
                        {item.customMedication.name}
                      </h3>
                      <div className="text-sm text-gray-600 mb-2">
                        <p className="mb-1">
                          <strong>Ativos:</strong>{' '}
                          {item.customMedication.activeIngredients.map(i => i.name).join(', ')}
                        </p>
                        <p>
                          <strong>Dosagem:</strong> {item.customMedication.dosage}
                        </p>
                        {item.customMedication.prescriptionRequired && (
                          <span className="inline-block mt-1 bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded">
                            Receita necessária
                          </span>
                        )}
                      </div>
                      <p className="text-lg font-bold text-primary-600">
                        R$ {(item.customMedication.price * item.quantity).toFixed(2).replace('.', ',')}
                      </p>
                    </div>
                    <div className="flex flex-col items-end justify-between">
                      <button
                        onClick={() => removeItem(item.id)}
                        className="text-red-600 hover:text-red-700 mb-2"
                      >
                        <Trash2 size={20} />
                      </button>
                      <div className="flex items-center border border-gray-300 rounded-lg">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="p-2 hover:bg-gray-100 transition-colors"
                        >
                          <Minus size={16} />
                        </button>
                        <span className="px-4 py-2 font-semibold">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="p-2 hover:bg-gray-100 transition-colors"
                        >
                          <Plus size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="lg:col-span-1">
          <div className="card p-6 sticky top-24">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Resumo do Pedido</h2>
            
            <div className="space-y-2 mb-6">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span>R$ {getTotal().toFixed(2).replace('.', ',')}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Frete</span>
                <span className="text-sm">Calculado no checkout</span>
              </div>
              <div className="border-t pt-2 mt-2">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold">Total</span>
                  <span className="text-2xl font-bold text-primary-600">
                    R$ {getTotal().toFixed(2).replace('.', ',')}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={() => navigate('/checkout')}
              className="w-full btn-primary mb-4 flex items-center justify-center"
            >
              Finalizar Compra
              <ArrowRight className="ml-2" size={20} />
            </button>

            <Link
              to="/produtos"
              className="block text-center text-primary-600 hover:text-primary-700 font-medium"
            >
              Continuar Comprando
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

