import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Minus, X, FileText, AlertCircle } from 'lucide-react'
import { useCart } from '../context/CartContext'
import { ActiveIngredient, CustomMedication } from '../types'

// Mock data - em produção viria de uma API
const availableIngredients: ActiveIngredient[] = [
  { id: '1', name: 'Vitamina D3', concentration: '2000', unit: 'UI' },
  { id: '2', name: 'Vitamina C', concentration: '1000', unit: 'mg' },
  { id: '3', name: 'Magnésio', concentration: '400', unit: 'mg' },
  { id: '4', name: 'Zinco', concentration: '15', unit: 'mg' },
  { id: '5', name: 'Vitamina B12', concentration: '500', unit: 'mcg' },
  { id: '6', name: 'Ácido Fólico', concentration: '400', unit: 'mcg' },
  { id: '7', name: 'Ginkgo Biloba', concentration: '120', unit: 'mg' },
  { id: '8', name: 'Ômega 3', concentration: '1000', unit: 'mg' }
]

export default function Customize() {
  const navigate = useNavigate()
  const { addCustomMedication } = useCart()
  const [medicationName, setMedicationName] = useState('')
  const [selectedIngredients, setSelectedIngredients] = useState<ActiveIngredient[]>([])
  const [dosage, setDosage] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [instructions, setInstructions] = useState('')
  const [prescriptionRequired, setPrescriptionRequired] = useState(false)
  const [showPrescriptionWarning, setShowPrescriptionWarning] = useState(false)

  const handleAddIngredient = (ingredient: ActiveIngredient) => {
    if (!selectedIngredients.find(i => i.id === ingredient.id)) {
      setSelectedIngredients([...selectedIngredients, ingredient])
    }
  }

  const handleRemoveIngredient = (id: string) => {
    setSelectedIngredients(selectedIngredients.filter(i => i.id !== id))
  }

  const calculatePrice = () => {
    const basePrice = 30.00
    const ingredientPrice = selectedIngredients.length * 8.50
    const quantityMultiplier = quantity
    return (basePrice + ingredientPrice) * quantityMultiplier
  }

  const handleSubmit = () => {
    if (!medicationName || selectedIngredients.length === 0 || !dosage) {
      alert('Por favor, preencha todos os campos obrigatórios.')
      return
    }

    if (prescriptionRequired && !showPrescriptionWarning) {
      setShowPrescriptionWarning(true)
      return
    }

    const customMedication: CustomMedication = {
      id: `custom-${Date.now()}`,
      name: medicationName,
      activeIngredients: selectedIngredients,
      dosage,
      quantity,
      instructions: instructions || 'Seguir orientações médicas',
      price: calculatePrice(),
      prescriptionRequired
    }

    addCustomMedication(customMedication, 1)
    navigate('/carrinho')
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Personalizar Medicamento</h1>
        <p className="text-gray-600 mb-8">
          Crie seu medicamento manipulado personalizado com os ativos e dosagens que você precisa
        </p>

        {showPrescriptionWarning && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start">
            <AlertCircle className="text-yellow-600 mr-3 mt-0.5" size={20} />
            <div className="flex-1">
              <p className="text-yellow-800 font-semibold mb-1">Receita Médica Necessária</p>
              <p className="text-yellow-700 text-sm">
                Este medicamento requer receita médica. Você precisará enviar a receita durante o checkout.
              </p>
            </div>
            <button
              onClick={() => setShowPrescriptionWarning(false)}
              className="text-yellow-600 hover:text-yellow-800"
            >
              <X size={20} />
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Medication Name */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Nome do Medicamento *
              </label>
              <input
                type="text"
                value={medicationName}
                onChange={(e) => setMedicationName(e.target.value)}
                placeholder="Ex: Complexo Multivitamínico Personalizado"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            {/* Active Ingredients */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Ativos Farmacêuticos *
              </label>
              <div className="border border-gray-300 rounded-lg p-4 min-h-[200px]">
                {selectedIngredients.length === 0 ? (
                  <p className="text-gray-400 text-sm">Nenhum ativo selecionado</p>
                ) : (
                  <div className="space-y-2">
                    {selectedIngredients.map(ingredient => (
                      <div
                        key={ingredient.id}
                        className="flex items-center justify-between bg-primary-50 p-3 rounded-lg"
                      >
                        <div>
                          <span className="font-medium">{ingredient.name}</span>
                          <span className="text-gray-600 ml-2">
                            {ingredient.concentration} {ingredient.unit}
                          </span>
                        </div>
                        <button
                          onClick={() => handleRemoveIngredient(ingredient.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <X size={18} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="mt-3">
                <p className="text-sm text-gray-600 mb-2">Adicionar ativo:</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {availableIngredients
                    .filter(ing => !selectedIngredients.find(si => si.id === ing.id))
                    .map(ingredient => (
                      <button
                        key={ingredient.id}
                        onClick={() => handleAddIngredient(ingredient)}
                        className="text-left p-2 border border-gray-300 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors text-sm"
                      >
                        <div className="font-medium">{ingredient.name}</div>
                        <div className="text-gray-600 text-xs">
                          {ingredient.concentration} {ingredient.unit}
                        </div>
                      </button>
                    ))}
                </div>
              </div>
            </div>

            {/* Dosage */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Dosagem *
              </label>
              <input
                type="text"
                value={dosage}
                onChange={(e) => setDosage(e.target.value)}
                placeholder="Ex: 1 cápsula ao dia, após o almoço"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            {/* Quantity */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Quantidade
              </label>
              <div className="flex items-center space-x-4">
                <div className="flex items-center border border-gray-300 rounded-lg">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="p-2 hover:bg-gray-100 transition-colors"
                  >
                    <Minus size={20} />
                  </button>
                  <span className="px-4 py-2 font-semibold">{quantity}</span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="p-2 hover:bg-gray-100 transition-colors"
                  >
                    <Plus size={20} />
                  </button>
                </div>
                <span className="text-gray-600">unidades</span>
              </div>
            </div>

            {/* Instructions */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Instruções de Uso
              </label>
              <textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="Instruções adicionais (opcional)"
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            {/* Prescription Required */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="prescription"
                checked={prescriptionRequired}
                onChange={(e) => setPrescriptionRequired(e.target.checked)}
                className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
              />
              <label htmlFor="prescription" className="ml-2 text-sm text-gray-700">
                Este medicamento requer receita médica
              </label>
            </div>
          </div>

          {/* Summary */}
          <div className="lg:col-span-1">
            <div className="card p-6 sticky top-24">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Resumo</h2>
              
              <div className="space-y-4 mb-6">
                <div>
                  <p className="text-sm text-gray-600">Ativos selecionados:</p>
                  <p className="font-semibold">{selectedIngredients.length}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Quantidade:</p>
                  <p className="font-semibold">{quantity} unidades</p>
                </div>
                {prescriptionRequired && (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800 font-semibold">
                      <FileText size={16} className="inline mr-1" />
                      Receita necessária
                    </p>
                  </div>
                )}
              </div>

              <div className="border-t pt-4 mb-6">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-600">Preço estimado:</span>
                  <span className="text-2xl font-bold text-primary-600">
                    R$ {calculatePrice().toFixed(2).replace('.', ',')}
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  * Preço final pode variar após análise farmacêutica
                </p>
              </div>

              <button
                onClick={handleSubmit}
                className="w-full btn-primary"
              >
                Adicionar ao Carrinho
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

