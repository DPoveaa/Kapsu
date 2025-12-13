import { useState, useEffect } from 'react'
import { Save, Plus, Trash2, Truck, DollarSign, Gift } from 'lucide-react'
import { Link } from 'react-router-dom'
import { shippingService, ShippingRegion, ShippingSettings as ShippingSettingsType } from '../services/shipping.service'

export default function ShippingSettings() {
  const [regions, setRegions] = useState<ShippingRegion[]>([])
  const [settings, setSettings] = useState<ShippingSettingsType>({ free_shipping_threshold: 200 })
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
      setSettings(settingsData)
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando configurações de frete...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Configurações de Frete</h1>
              <p className="mt-2 text-gray-600">Gerencie as regiões de entrega e valores de frete</p>
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
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
            {success}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Configurações Gerais */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center mb-4">
                <DollarSign className="w-5 h-5 text-gray-600 mr-2" />
                <h2 className="text-xl font-semibold text-gray-900">Configurações Gerais</h2>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Valor Mínimo para Frete Grátis (R$)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={settings.free_shipping_threshold || 200}
                    onChange={(e) => setSettings({
                      ...settings,
                      free_shipping_threshold: Number(e.target.value),
                    })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="200.00"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Pedidos acima deste valor terão frete grátis
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
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                  <Truck className="w-5 h-5 text-gray-600 mr-2" />
                  <h2 className="text-xl font-semibold text-gray-900">Regiões de Entrega</h2>
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
                <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    {editingRegion.id ? 'Editar Região' : 'Nova Região'}
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Município *
                      </label>
                      <input
                        type="text"
                        value={formData.municipality}
                        onChange={(e) => setFormData({ ...formData, municipality: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Ex: São Paulo"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
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
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="00000-000"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
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
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="00000-000"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Valor do Frete (R$) *
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.shippingFee}
                        onChange={(e) => setFormData({ ...formData, shippingFee: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                      <label htmlFor="active" className="ml-2 text-sm text-gray-700">
                        Região ativa
                      </label>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-3 mt-4">
                    <button
                      onClick={handleCancelEdit}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
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
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Município
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        CEP Inicial
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        CEP Final
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Valor (R$)
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {regions.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                          Nenhuma região cadastrada. Clique em "Nova Região" para adicionar.
                        </td>
                      </tr>
                    ) : (
                      regions.map((region) => (
                        <tr key={region.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                            {region.municipality}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                            {region.cep_from}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                            {region.cep_to}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            R$ {Number(region.shipping_fee).toFixed(2).replace('.', ',')}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                              region.active
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {region.active ? 'Ativa' : 'Inativa'}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                            <button
                              onClick={() => handleEditRegion(region)}
                              className="text-blue-600 hover:text-blue-900 mr-3"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => handleDeleteRegion(region.id)}
                              className="text-red-600 hover:text-red-900"
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

