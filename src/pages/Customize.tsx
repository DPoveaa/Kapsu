import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Minus, X, FileText, AlertCircle, Loader2 } from 'lucide-react'
import { useCart } from '../context/CartContext'
import { ActiveIngredient, CustomMedication } from '../types'
import { compostosService, Composto } from '../services/compostos.service'

export default function Customize() {
  const navigate = useNavigate()
  const { addCustomMedication } = useCart()
  const [medicationName, setMedicationName] = useState('')
  const [selectedIngredients, setSelectedIngredients] = useState<ActiveIngredient[]>([])
  const [compostosData, setCompostosData] = useState<Map<string, Composto>>(new Map()) // Armazena dados completos dos compostos
  const [dosage, setDosage] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [instructions, setInstructions] = useState('')
  const [prescriptionRequired, setPrescriptionRequired] = useState(false)
  const [showPrescriptionWarning, setShowPrescriptionWarning] = useState(false)
  const [availableCompostos, setAvailableCompostos] = useState<Composto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Carrega compostos da API
  useEffect(() => {
    const loadCompostos = async () => {
      try {
        setLoading(true)
        setError(null)
        const compostos = await compostosService.getAll()
        setAvailableCompostos(compostos)
        // Cria um mapa para acesso rápido aos dados completos
        const compostosMap = new Map<string, Composto>()
        compostos.forEach((composto: Composto) => {
          compostosMap.set(composto.id, composto)
        })
        setCompostosData(compostosMap)
      } catch (err: any) {
        console.error('Erro ao carregar compostos:', err)
        setError(err.message || 'Erro ao carregar compostos disponíveis')
      } finally {
        setLoading(false)
      }
    }

    loadCompostos()
  }, [])

  const handleAddIngredient = (composto: Composto) => {
    if (!selectedIngredients.find(i => i.id === composto.id)) {
      // Adiciona com a concentração padrão do composto
      const newIngredient: ActiveIngredient = {
        id: composto.id,
        name: composto.name,
        concentration: composto.concentration, // Concentração padrão
        unit: composto.unit,
      }
      setSelectedIngredients([...selectedIngredients, newIngredient])
    }
  }

  const handleUpdateConcentration = (id: string, newConcentration: string) => {
    // Permite valores vazios durante a digitação
    if (newConcentration === '') {
      setSelectedIngredients(selectedIngredients.map(ing => 
        ing.id === id ? { ...ing, concentration: '' } : ing
      ))
      return
    }

    // Atualiza a concentração (validação será feita no submit)
    setSelectedIngredients(selectedIngredients.map(ing => 
      ing.id === id ? { ...ing, concentration: newConcentration } : ing
    ))
  }

  const validateConcentration = (id: string, concentration: string): string | null => {
    const composto = compostosData.get(id)
    if (!composto) return null

    if (!concentration || concentration.trim() === '') {
      return 'Concentração é obrigatória'
    }

    const concentrationNum = parseFloat(concentration)
    if (isNaN(concentrationNum)) {
      return 'Por favor, insira um valor numérico válido'
    }

    if (composto.min_concentration) {
      const minNum = parseFloat(composto.min_concentration)
      if (!isNaN(minNum) && concentrationNum < minNum) {
        return `Mínimo: ${composto.min_concentration} ${composto.unit}`
      }
    }

    if (composto.max_concentration) {
      const maxNum = parseFloat(composto.max_concentration)
      if (!isNaN(maxNum) && concentrationNum > maxNum) {
        return `Máximo: ${composto.max_concentration} ${composto.unit}`
      }
    }

    return null
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

  const getCompostoPrice = () => {
    return 8.50 // Preço por composto adicionado
  }

  const handleSubmit = () => {
    if (!medicationName || selectedIngredients.length === 0 || !dosage) {
      alert('Por favor, preencha todos os campos obrigatórios.')
      return
    }

    // Valida todas as concentrações
    const validationErrors: string[] = []
    selectedIngredients.forEach(ing => {
      const error = validateConcentration(ing.id, ing.concentration)
      if (error) {
        validationErrors.push(`${ing.name}: ${error}`)
      }
    })

    if (validationErrors.length > 0) {
      alert('Por favor, corrija os seguintes erros:\n\n' + validationErrors.join('\n'))
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

  if (loading) {
    return (
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
        <div className="max-w-4xl mx-auto flex justify-center items-center min-h-[300px] sm:min-h-[400px]">
          <div className="text-center">
            <Loader2 className="w-10 h-10 sm:w-12 sm:h-12 animate-spin text-primary-600 mx-auto mb-4" />
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300">Carregando compostos disponíveis...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg p-4 sm:p-6 text-center">
            <AlertCircle className="w-10 h-10 sm:w-12 sm:h-12 text-red-600 dark:text-red-400 mx-auto mb-4" />
            <h2 className="text-lg sm:text-xl font-semibold text-red-900 dark:text-red-300 mb-2">Erro ao carregar compostos</h2>
            <p className="text-sm sm:text-base text-red-700 dark:text-red-400 mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="btn-primary text-sm sm:text-base px-4 py-2"
            >
              Tentar novamente
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2">Personalizar Medicamento</h1>
        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 mb-4 sm:mb-8">
          Crie seu medicamento manipulado personalizado com os ativos e dosagens que você precisa
        </p>

        {showPrescriptionWarning && (
          <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 rounded-lg flex items-start">
            <AlertCircle className="text-yellow-600 dark:text-yellow-400 mr-2 sm:mr-3 mt-0.5 flex-shrink-0" size={18} />
            <div className="flex-1 min-w-0">
              <p className="text-yellow-800 dark:text-yellow-300 font-semibold mb-1 text-sm sm:text-base">Receita Médica Necessária</p>
              <p className="text-yellow-700 dark:text-yellow-400 text-xs sm:text-sm">
                Este medicamento requer receita médica. Você precisará enviar a receita durante o checkout.
              </p>
            </div>
            <button
              onClick={() => setShowPrescriptionWarning(false)}
              className="text-yellow-600 dark:text-yellow-400 hover:text-yellow-800 dark:hover:text-yellow-300 flex-shrink-0 ml-2"
            >
              <X size={18} />
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
          {/* Form */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            {/* Medication Name */}
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-gray-700 dark:text-white mb-1.5 sm:mb-2">
                Nome do Medicamento *
              </label>
              <input
                type="text"
                value={medicationName}
                onChange={(e) => setMedicationName(e.target.value)}
                placeholder="Ex: Complexo Multivitamínico Personalizado"
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border border-gray-300 dark:border-[#0F828C] rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-[#065084] text-black dark:text-white"
              />
            </div>

            {/* Active Ingredients */}
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-gray-700 dark:text-white mb-1.5 sm:mb-2">
                Ativos Farmacêuticos *
              </label>
              <div className="card border border-gray-300 dark:border-[#0F828C] rounded-lg p-3 sm:p-4 min-h-[150px] sm:min-h-[200px] dark:bg-[#065084]">
                {selectedIngredients.length === 0 ? (
                  <p className="text-gray-400 dark:text-gray-500 text-xs sm:text-sm">Nenhum ativo selecionado</p>
                ) : (
                  <div className="space-y-2">
                    {selectedIngredients.map(ingredient => {
                      const composto = compostosData.get(ingredient.id)
                      const hasRange = composto && (composto.min_concentration || composto.max_concentration)
                      const validationError = validateConcentration(ingredient.id, ingredient.concentration)
                      return (
                        <div
                          key={ingredient.id}
                          className={`bg-primary-50 dark:bg-primary-900/30 p-2.5 sm:p-3 rounded-lg ${validationError ? 'border border-red-300 dark:border-red-500' : ''}`}
                        >
                          <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                            <div className="flex-1 min-w-0">
                              <span className="font-medium dark:text-white text-sm sm:text-base break-words">{ingredient.name}</span>
                            </div>
                            <button
                              onClick={() => handleRemoveIngredient(ingredient.id)}
                              className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 flex-shrink-0 ml-2"
                            >
                              <X size={16} />
                            </button>
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2 flex-wrap">
                              <label className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">Concentração:</label>
                              <input
                                type="text"
                                value={ingredient.concentration}
                                onChange={(e) => handleUpdateConcentration(ingredient.id, e.target.value)}
                                className={`w-20 sm:w-24 px-2 py-1 border rounded text-xs sm:text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-[#065084] dark:text-white dark:border-[#0F828C] ${
                                  validationError ? 'border-red-500 dark:border-red-400' : 'border-gray-300 dark:border-[#0F828C]'
                                }`}
                                placeholder={composto?.concentration || ''}
                              />
                              <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">{ingredient.unit}</span>
                            </div>
                            {hasRange && (
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                Faixa: {composto.min_concentration || 'sem mínimo'} - {composto.max_concentration || 'sem máximo'} {composto.unit}
                              </div>
                            )}
                            {validationError && (
                              <div className="text-xs text-red-600 dark:text-red-400 mt-1">
                                {validationError}
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
              <div className="mt-3">
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 mb-2">Adicionar ativo:</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {availableCompostos
                    .filter(composto => !selectedIngredients.find(si => si.id === composto.id))
                    .map(composto => (
                      <button
                        key={composto.id}
                        onClick={() => handleAddIngredient(composto)}
                        className="card text-left p-2.5 sm:p-3 border border-gray-300 dark:border-[#0F828C] rounded-lg hover:border-primary-500 dark:hover:border-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/30 transition-colors text-xs sm:text-sm min-h-[70px] sm:min-h-[80px] flex flex-col justify-between dark:bg-[#065084] dark:text-white"
                      >
                        <div className="font-medium break-words mb-1.5 sm:mb-2 dark:text-white">{composto.name}</div>
                        <div className="text-primary-600 dark:text-primary-400 font-semibold text-xs">
                          + R$ {getCompostoPrice().toFixed(2).replace('.', ',')}
                        </div>
                      </button>
                    ))}
                </div>
              </div>
            </div>

            {/* Dosage */}
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-gray-700 dark:text-white mb-1.5 sm:mb-2">
                Dosagem *
              </label>
              <input
                type="text"
                value={dosage}
                onChange={(e) => setDosage(e.target.value)}
                placeholder="Ex: 1 cápsula ao dia, após o almoço"
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border border-gray-300 dark:border-[#0F828C] rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-[#065084] text-black dark:text-white"
              />
            </div>

            {/* Quantity */}
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-gray-700 dark:text-white mb-1.5 sm:mb-2">
                Quantidade
              </label>
              <div className="flex items-center space-x-3 sm:space-x-4">
                <div className="card flex items-center border border-gray-300 dark:border-[#0F828C] rounded-lg dark:bg-[#065084]">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="p-1.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-900 dark:text-white"
                  >
                    <Minus size={18} />
                  </button>
                  <span className="px-3 sm:px-4 py-1.5 sm:py-2 font-semibold dark:text-white text-sm sm:text-base">{quantity}</span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="p-1.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-900 dark:text-white"
                  >
                    <Plus size={18} />
                  </button>
                </div>
                <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">unidades</span>
              </div>
            </div>

            {/* Instructions */}
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-gray-700 dark:text-white mb-1.5 sm:mb-2">
                Instruções de Uso
              </label>
              <textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="Instruções adicionais (opcional)"
                rows={3}
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border border-gray-300 dark:border-[#0F828C] rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-[#065084] text-black dark:text-white"
              />
            </div>

            {/* Prescription Required */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="prescription"
                checked={prescriptionRequired}
                onChange={(e) => setPrescriptionRequired(e.target.checked)}
                className="w-4 h-4 text-primary-600 dark:text-primary-400 border-gray-300 dark:border-[#0F828C] rounded focus:ring-primary-500 dark:bg-[#065084]"
              />
              <label htmlFor="prescription" className="ml-2 text-xs sm:text-sm text-gray-700 dark:text-gray-300">
                Este medicamento requer receita médica
              </label>
            </div>
          </div>

          {/* Summary */}
          <div className="lg:col-span-1">
            <div className="card p-4 sm:p-6 sticky top-20 sm:top-24 dark:bg-[#065084] dark:border-[#0F828C]">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-3 sm:mb-4">Resumo</h2>
              
              <div className="space-y-3 sm:space-y-4 mb-4 sm:mb-6">
                <div>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">Ativos selecionados:</p>
                  <p className="font-semibold dark:text-white text-sm sm:text-base">{selectedIngredients.length}</p>
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">Quantidade:</p>
                  <p className="font-semibold dark:text-white text-sm sm:text-base">{quantity} unidades</p>
                </div>
                {prescriptionRequired && (
                  <div className="p-2.5 sm:p-3 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 rounded-lg">
                    <p className="text-xs sm:text-sm text-yellow-800 dark:text-yellow-300 font-semibold">
                      <FileText size={14} className="inline mr-1" />
                      Receita necessária
                    </p>
                  </div>
                )}
              </div>

              <div className="border-t dark:border-[#0F828C] pt-3 sm:pt-4 mb-4 sm:mb-6">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">Preço estimado:</span>
                  <span className="text-xl sm:text-2xl font-bold text-primary-600 dark:text-primary-400">
                    R$ {calculatePrice().toFixed(2).replace('.', ',')}
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  * Preço final pode variar após análise farmacêutica
                </p>
              </div>

              <button
                onClick={handleSubmit}
                className="w-full btn-primary text-sm sm:text-base py-2.5 sm:py-3"
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

