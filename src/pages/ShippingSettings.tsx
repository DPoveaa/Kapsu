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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">Carregando configurações de frete...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Configurações de Frete</h1>
              <p className="mt-2 text-gray-600 dark:text-gray-300">Gerencie as regiões de entrega e valores de frete</p>
            </div>
            <Link
              to="/admin/shipping/free-rules"
              className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <Gift className="w-4 h-4 mr-2" />
              Regras de Frete Grátis
            </Link>
          </div>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 px-4 py-3 rounded">
            {success}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Configurações Gerais */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-[#065084] rounded-lg shadow-md dark:shadow-lg p-6 border border-gray-200 dark:border-[#0F828C]">
              <div className="flex items-center mb-4">
                <DollarSign className="w-5 h-5 text-gray-600 dark:text-gray-300 mr-2" />
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Configurações Gerais</h2>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
                    className="w-full px-4 py-2 border border-gray-300 dark:border-[#0F828C] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-[#065084] dark:text-white"
                    placeholder="200.00"
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {settings.free_shipping_threshold === 0 || settings.free_shipping_threshold === null
                      ? 'Frete grátis desabilitado. Defina um valor maior que 0 para habilitar.'
                      : `Pedidos acima de R$ ${settings.free_shipping_threshold.toFixed(2).replace('.', ',')} terão frete grátis`}
                  </p>
                </div>

                <button
                  onClick={handleSaveSettings}
                  disabled={saving}
                  className="w-full inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? 'Salvando...' : 'Salvar Configurações'}
                </button>
              </div>
            </div>
          </div>

          {/* Lista de Regiões e Formulário */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-[#065084] rounded-lg shadow-md dark:shadow-lg p-6 border border-gray-200 dark:border-[#0F828C]">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                  <Truck className="w-5 h-5 text-gray-600 dark:text-gray-300 mr-2" />
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Regiões de Entrega</h2>
                </div>
                {!editingRegion && (
                  <button
                    onClick={() => setEditingRegion({} as ShippingRegion)}
                    className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Nova Região
                  </button>
                )}
              </div>

              {/* Formulário de Nova/Edição */}
              {(editingRegion !== null) && (
                <div className="mb-6 p-4 bg-gray-50 dark:bg-[#065084] rounded-lg border border-gray-200 dark:border-[#0F828C]">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    {editingRegion.id ? 'Editar Região' : 'Nova Região'}
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Município *
                      </label>
                      <input
                        type="text"
                        value={formData.municipality}
                        onChange={(e) => setFormData({ ...formData, municipality: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-[#0F828C] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-[#065084] dark:text-white"
                        placeholder="Ex: São Paulo"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
                        className="w-full px-4 py-2 border border-gray-300 dark:border-[#0F828C] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-[#065084] dark:text-white"
                        placeholder="00000-000"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
                        className="w-full px-4 py-2 border border-gray-300 dark:border-[#0F828C] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-[#065084] dark:text-white"
                        placeholder="00000-000"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Valor do Frete (R$) *
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.shippingFee}
                        onChange={(e) => setFormData({ ...formData, shippingFee: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-[#0F828C] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-[#065084] dark:text-white"
                        placeholder="18.00"
                      />
                    </div>

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="active"
                        checked={formData.active}
                        onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <label htmlFor="active" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                        Região ativa
                      </label>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-3 mt-4">
                    <button
                      onClick={handleCancelEdit}
                      className="px-4 py-2 border border-gray-300 dark:border-[#0F828C] text-gray-700 dark:text-white rounded-lg hover:bg-gray-50 dark:hover:bg-[#065084] transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleSaveRegion}
                      disabled={saving}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {saving ? 'Salvando...' : 'Salvar'}
                    </button>
                  </div>
                </div>
              )}

              {/* Lista de Regiões */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-[#0F828C]">
                  <thead className="bg-gray-50 dark:bg-[#065084]">
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
                  <tbody className="bg-white dark:bg-[#065084] divide-y divide-gray-200 dark:divide-[#0F828C]">
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
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

