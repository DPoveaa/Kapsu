import { useState, useEffect } from 'react'
import { Save, Plus, Trash2, Truck, DollarSign, Gift } from 'lucide-react'
import { Link } from 'react-router-dom'
import { shippingService, ShippingRegion, ShippingSettings as ShippingSettingsType } from '../services/shipping.service'

export default function ShippingSettings() {
  const [regions, setRegions] = useState<ShippingRegion[]>([])
  const [settings, setSettings] = useState<ShippingSettingsType>({ free_shipping_threshold: 0 })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  
  // Estado para formulário de nova/edição de região
  const [editingRegion, setEditingRegion] = useState<ShippingRegion | null>(null)
  const [formData, setFormData] = useState({
    municipality: '',
    cepFrom: '',
    cepTo: '',
    shippingFee: '',
    active: true,
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [regionsData, settingsData] = await Promise.all([
        shippingService.getShippingRegions(),
        shippingService.getShippingSettings(),
      ])
      setRegions(regionsData)
      // Garante que o valor seja exatamente o que vem do banco, ou 0 se não existir
      const threshold = settingsData.free_shipping_threshold !== undefined 
        ? settingsData.free_shipping_threshold 
        : 0
      setSettings({
        free_shipping_threshold: threshold
      })
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveSettings = async () => {
    try {
      setSaving(true)
      setError(null)
      await shippingService.updateShippingSettings(settings)
      setSuccess('Configurações salvas com sucesso!')
      setTimeout(() => setSuccess(null), 3000)
      // Recarrega os dados após salvar para garantir que está sincronizado
      await loadData()
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar configurações')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveRegion = async () => {
    try {
      if (!formData.municipality || !formData.cepFrom || !formData.cepTo || !formData.shippingFee) {
        setError('Preencha todos os campos obrigatórios')
        return
      }

      setSaving(true)
      setError(null)
      
      await shippingService.createOrUpdateShippingRegion({
        id: editingRegion?.id,
        municipality: formData.municipality,
        cepFrom: formData.cepFrom,
        cepTo: formData.cepTo,
        shippingFee: Number(formData.shippingFee),
        active: formData.active,
      })

      setSuccess(editingRegion ? 'Região atualizada com sucesso!' : 'Região criada com sucesso!')
      setTimeout(() => setSuccess(null), 3000)
      
      // Limpa formulário e recarrega dados
      setEditingRegion(null)
      setFormData({
        municipality: '',
        cepFrom: '',
        cepTo: '',
        shippingFee: '',
        active: true,
      })
      await loadData()
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar região')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteRegion = async (id: string) => {
    if (!confirm('Tem certeza que deseja remover esta região?')) return

    try {
      setError(null)
      await shippingService.deleteShippingRegion(id)
      setSuccess('Região removida com sucesso!')
      setTimeout(() => setSuccess(null), 3000)
      await loadData()
    } catch (err: any) {
      setError(err.message || 'Erro ao remover região')
    }
  }

  const handleEditRegion = (region: ShippingRegion) => {
    setEditingRegion(region)
    setFormData({
      municipality: region.municipality,
      cepFrom: region.cep_from,
      cepTo: region.cep_to,
      shippingFee: String(region.shipping_fee),
      active: region.active,
    })
  }

  const handleCancelEdit = () => {
    setEditingRegion(null)
    setFormData({
      municipality: '',
      cepFrom: '',
      cepTo: '',
      shippingFee: '',
      active: true,
    })
  }

  const formatCep = (cep: string) => {
    const clean = cep.replace(/\D/g, '')
    if (clean.length <= 5) return clean
    return `${clean.substring(0, 5)}-${clean.substring(5, 8)}`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-blue-600 dark:border-blue-400 mx-auto"></div>
          <p className="mt-3 sm:mt-4 text-xs sm:text-sm text-gray-600 dark:text-gray-300">Carregando configurações de frete...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-4 sm:py-6 lg:py-8">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8">
        <div className="mb-4 sm:mb-6 lg:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
            <div className="flex-1">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">Configurações de Frete</h1>
              <p className="mt-1 sm:mt-2 text-xs sm:text-sm lg:text-base text-gray-600 dark:text-gray-300">Gerencie as regiões de entrega e valores de frete</p>
            </div>
            <Link
              to="/admin/shipping/free-rules"
              className="inline-flex items-center justify-center px-3 sm:px-4 py-2 text-sm sm:text-base bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors w-full sm:w-auto"
            >
              <Gift className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2" />
              Regras de Frete Grátis
            </Link>
          </div>
        </div>

        {error && (
          <div className="mb-3 sm:mb-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-3 sm:px-4 py-2.5 sm:py-3 rounded text-xs sm:text-sm break-words">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-3 sm:mb-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 px-3 sm:px-4 py-2.5 sm:py-3 rounded text-xs sm:text-sm break-words">
            {success}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5 lg:gap-6">
          {/* Configurações Gerais */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-lg p-4 sm:p-5 lg:p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center mb-3 sm:mb-4">
                <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600 dark:text-gray-300 mr-1.5 sm:mr-2" />
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">Configurações Gerais</h2>
              </div>
              
              <div className="space-y-3 sm:space-y-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2">
                    Valor Mínimo para Frete Grátis (R$)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={settings.free_shipping_threshold !== undefined ? settings.free_shipping_threshold : ''}
                    onChange={(e) => {
                      const inputValue = e.target.value;
                      // Permite valor vazio, mas quando há valor, converte para número
                      const value = inputValue === '' ? 0 : Number(inputValue);
                      setSettings({
                        ...settings,
                        free_shipping_threshold: isNaN(value) ? 0 : value,
                      });
                    }}
                    className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-400 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-900 dark:text-white"
                    placeholder="200.00"
                  />
                  <p className="mt-1 text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 break-words">
                    {settings.free_shipping_threshold === 0 || settings.free_shipping_threshold === null
                      ? 'Frete grátis desabilitado. Defina um valor maior que 0 para habilitar.'
                      : `Pedidos acima de R$ ${settings.free_shipping_threshold.toFixed(2).replace('.', ',')} terão frete grátis`}
                  </p>
                </div>

                <button
                  onClick={handleSaveSettings}
                  disabled={saving}
                  className="w-full inline-flex items-center justify-center px-3 sm:px-4 py-2 text-sm sm:text-base bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2" />
                  <span>{saving ? 'Salvando...' : 'Salvar Configurações'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Lista de Regiões e Formulário */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-lg p-4 sm:p-5 lg:p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0 mb-4 sm:mb-5 lg:mb-6">
                <div className="flex items-center">
                  <Truck className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600 dark:text-gray-300 mr-1.5 sm:mr-2" />
                  <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">Regiões de Entrega</h2>
                </div>
                {!editingRegion && (
                  <button
                    onClick={() => setEditingRegion({} as ShippingRegion)}
                    className="inline-flex items-center justify-center px-3 sm:px-4 py-2 text-sm sm:text-base bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors w-full sm:w-auto"
                  >
                    <Plus className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2" />
                    Nova Região
                  </button>
                )}
              </div>

              {/* Formulário de Nova/Edição */}
              {(editingRegion !== null) && (
                <div className="mb-4 sm:mb-5 lg:mb-6 p-3 sm:p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4">
                    {editingRegion.id ? 'Editar Região' : 'Nova Região'}
                  </h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div className="sm:col-span-2">
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2">
                        Município *
                      </label>
                      <input
                        type="text"
                        value={formData.municipality}
                        onChange={(e) => setFormData({ ...formData, municipality: e.target.value })}
                        className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-400 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-900 dark:text-white"
                        placeholder="Ex: São Paulo"
                      />
                    </div>

                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2">
                        CEP Inicial *
                      </label>
                      <input
                        type="text"
                        value={formData.cepFrom}
                        onChange={(e) => {
                          const formatted = formatCep(e.target.value)
                          setFormData({ ...formData, cepFrom: formatted })
                        }}
                        maxLength={9}
                        className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-400 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-900 dark:text-white"
                        placeholder="00000-000"
                      />
                    </div>

                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2">
                        CEP Final *
                      </label>
                      <input
                        type="text"
                        value={formData.cepTo}
                        onChange={(e) => {
                          const formatted = formatCep(e.target.value)
                          setFormData({ ...formData, cepTo: formatted })
                        }}
                        maxLength={9}
                        className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-400 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-900 dark:text-white"
                        placeholder="00000-000"
                      />
                    </div>

                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2">
                        Valor do Frete (R$) *
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.shippingFee}
                        onChange={(e) => setFormData({ ...formData, shippingFee: e.target.value })}
                        className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-400 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-900 dark:text-white"
                        placeholder="18.00"
                      />
                    </div>

                    <div className="sm:col-span-2 flex items-center">
                      <input
                        type="checkbox"
                        id="active"
                        checked={formData.active}
                        onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <label htmlFor="active" className="ml-2 text-xs sm:text-sm text-gray-700 dark:text-gray-300">
                        Região ativa
                      </label>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 mt-3 sm:mt-4">
                    <button
                      onClick={handleCancelEdit}
                      className="px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-white rounded-lg hover:bg-gray-50 dark:hover:bg-[#065084] transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleSaveRegion}
                      disabled={saving}
                      className="px-3 sm:px-4 py-2 text-sm sm:text-base bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {saving ? 'Salvando...' : 'Salvar'}
                    </button>
                  </div>
                </div>
              )}

              {/* Lista de Regiões - Desktop: Tabela / Mobile: Cards */}
              <>
                {/* Desktop: Tabela */}
                <div className="hidden lg:block overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Município
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          CEP Inicial
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          CEP Final
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Valor (R$)
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Ações
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {regions.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                            Nenhuma região cadastrada. Clique em "Nova Região" para adicionar.
                          </td>
                        </tr>
                      ) : (
                        regions.map((region) => (
                          <tr key={region.id} className="hover:bg-gray-50 dark:hover:bg-[#065084]">
                            <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                              {region.municipality}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                              {region.cep_from}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                              {region.cep_to}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                              R$ {Number(region.shipping_fee).toFixed(2).replace('.', ',')}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                region.active
                                  ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                                  : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                              }`}>
                                {region.active ? 'Ativa' : 'Inativa'}
                              </span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                              <button
                                onClick={() => handleEditRegion(region)}
                                className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 mr-3"
                              >
                                Editar
                              </button>
                              <button
                                onClick={() => handleDeleteRegion(region.id)}
                                className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
                              >
                                <Trash2 className="w-4 h-4 inline" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Mobile: Cards */}
                <div className="lg:hidden space-y-3">
                  {regions.length === 0 ? (
                    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 text-center">
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Nenhuma região cadastrada. Clique em "Nova Região" para adicionar.
                      </p>
                    </div>
                  ) : (
                    regions.map((region) => (
                      <div
                        key={region.id}
                        className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3 sm:p-4"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white mb-1 break-words">
                              {region.municipality}
                            </h3>
                            <span className={`inline-block px-2 py-0.5 text-[10px] sm:text-xs font-semibold rounded-full ${
                              region.active
                                ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                                : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                            }`}>
                              {region.active ? 'Ativa' : 'Inativa'}
                            </span>
                          </div>
                        </div>
                        <div className="space-y-1.5 sm:space-y-2 mb-3 pt-2 border-t border-gray-200 dark:border-gray-700">
                          <div className="flex items-center justify-between text-xs sm:text-sm">
                            <span className="text-gray-500 dark:text-gray-400">CEP Inicial:</span>
                            <span className="text-gray-900 dark:text-white font-medium">{region.cep_from}</span>
                          </div>
                          <div className="flex items-center justify-between text-xs sm:text-sm">
                            <span className="text-gray-500 dark:text-gray-400">CEP Final:</span>
                            <span className="text-gray-900 dark:text-white font-medium">{region.cep_to}</span>
                          </div>
                          <div className="flex items-center justify-between text-xs sm:text-sm">
                            <span className="text-gray-500 dark:text-gray-400">Valor:</span>
                            <span className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white">
                              R$ {Number(region.shipping_fee).toFixed(2).replace('.', ',')}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                          <button
                            onClick={() => handleEditRegion(region)}
                            className="px-3 py-1.5 text-xs sm:text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => handleDeleteRegion(region.id)}
                            className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

