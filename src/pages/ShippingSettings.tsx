import { useState, useEffect } from 'react'
import { Save, Plus, Trash2, Truck, DollarSign, Gift } from 'lucide-react'
import { Link } from 'react-router-dom'
import { shippingService, ShippingRegion, ShippingSettings as ShippingSettingsType } from '../services/shipping.service'
import { confirm } from '../utils/toast'
import AdminModal from '../components/AdminModal'

export default function ShippingSettings() {
  const [regions, setRegions] = useState<ShippingRegion[]>([])
  const [settings, setSettings] = useState<ShippingSettingsType>({ 
    free_shipping_threshold: 0,
    general_delivery_time: 5,
    general_delivery_time_type: 'business'
  })
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
    deliveryTime: '',
    deliveryTimeType: 'business',
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
      
      const threshold = settingsData.free_shipping_threshold !== undefined 
        ? settingsData.free_shipping_threshold 
        : 0
      const generalDeliveryTime = settingsData.general_delivery_time !== undefined
        ? Number(settingsData.general_delivery_time)
        : 5
      const generalDeliveryTimeType = settingsData.general_delivery_time_type !== undefined
        ? settingsData.general_delivery_time_type
        : 'business'

      setSettings({
        free_shipping_threshold: threshold,
        general_delivery_time: generalDeliveryTime,
        general_delivery_time_type: generalDeliveryTimeType as any,
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
        deliveryTime: formData.deliveryTime !== '' ? Number(formData.deliveryTime) : null,
        deliveryTimeType: formData.deliveryTimeType,
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
        deliveryTime: '',
        deliveryTimeType: 'business',
        active: true,
      })
      await loadData()
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar região')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteRegion = (id: string) => {
    confirm.show('Tem certeza que deseja remover esta região?', async () => {
      try {
        setError(null)
        await shippingService.deleteShippingRegion(id)
        setSuccess('Região removida com sucesso!')
        setTimeout(() => setSuccess(null), 3000)
        await loadData()
      } catch (err: any) {
        setError(err.message || 'Erro ao remover região')
      }
    })
  }

  const handleEditRegion = (region: ShippingRegion) => {
    setEditingRegion(region)
    setFormData({
      municipality: region.municipality,
      cepFrom: region.cep_from,
      cepTo: region.cep_to,
      shippingFee: String(region.shipping_fee),
      deliveryTime: region.delivery_time !== undefined && region.delivery_time !== null ? String(region.delivery_time) : '',
      deliveryTimeType: region.delivery_time_type || 'business',
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
      deliveryTime: '',
      deliveryTimeType: 'business',
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
      <div className="w-full flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-blue-600 dark:border-blue-400 mx-auto"></div>
          <p className="mt-3 sm:mt-4 text-xs sm:text-sm text-gray-600 dark:text-gray-300">Carregando configurações de frete...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full">
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

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2">
                    Prazo de Entrega Geral Padrão
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      min="1"
                      value={settings.general_delivery_time !== undefined ? settings.general_delivery_time : ''}
                      onChange={(e) => {
                        const val = e.target.value === '' ? 5 : Number(e.target.value)
                        setSettings({
                          ...settings,
                          general_delivery_time: isNaN(val) ? 5 : val,
                        })
                      }}
                      className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-400 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-900 dark:text-white"
                      placeholder="5"
                    />
                    <select
                      value={settings.general_delivery_time_type || 'business'}
                      onChange={(e) => {
                        setSettings({
                          ...settings,
                          general_delivery_time_type: e.target.value as any,
                        })
                      }}
                      className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-400 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-900 dark:text-white"
                    >
                      <option value="business">Dias Úteis</option>
                      <option value="calendar">Dias Corridos</option>
                    </select>
                  </div>
                  <p className="mt-1 text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
                    Aplicado para regiões que não possuem prazo individual definido.
                  </p>
                </div>

                <button
                  onClick={handleSaveSettings}
                  disabled={saving}
                  className="w-full flex items-center justify-center px-4 py-2 text-sm bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-all duration-200 shadow-sm font-medium hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
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
                    className="flex items-center justify-center px-4 py-2 text-sm bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-all duration-200 shadow-sm font-medium hover:scale-[1.02] active:scale-[0.98] w-full sm:w-auto"
                  >
                    <Plus className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2" />
                    Nova Região
                  </button>
                )}
              </div>

              {/* Modal de Nova/Edição */}
              <AdminModal
                isOpen={editingRegion !== null}
                onClose={handleCancelEdit}
                title={editingRegion?.id ? 'Editar Região' : 'Nova Região'}
                widthClass="max-w-xl"
                footer={
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={handleCancelEdit}
                      className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleSaveRegion}
                      disabled={saving}
                      className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center text-sm font-medium hover:scale-[1.02] active:scale-[0.98]"
                    >
                      <Save className="w-4 h-4 mr-1.5" />
                      {saving ? 'Salvando...' : 'Salvar'}
                    </button>
                  </div>
                }
              >
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      Município *
                    </label>
                    <input
                      type="text"
                      value={formData.municipality}
                      onChange={(e) => setFormData({ ...formData, municipality: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                      placeholder="Ex: São Paulo"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
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
                        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                        placeholder="00000-000"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
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
                        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                        placeholder="00000-000"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      Valor do Frete (R$) *
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.shippingFee}
                      onChange={(e) => setFormData({ ...formData, shippingFee: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                      placeholder="18.00"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                        Prazo de Entrega
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={formData.deliveryTime}
                        onChange={(e) => setFormData({ ...formData, deliveryTime: e.target.value })}
                        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                        placeholder="Ex: 3 (opcional)"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                        Tipo de Prazo
                      </label>
                      <select
                        value={formData.deliveryTimeType}
                        onChange={(e) => setFormData({ ...formData, deliveryTimeType: e.target.value })}
                        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                      >
                        <option value="business">Dias Úteis</option>
                        <option value="calendar">Dias Corridos</option>
                      </select>
                    </div>
                  </div>
                  <p className="text-[10px] sm:text-xs text-gray-550 dark:text-gray-455">
                    Deixe em branco para usar o prazo geral padrão ({settings.general_delivery_time} {settings.general_delivery_time_type === 'business' ? (settings.general_delivery_time === 1 ? 'dia útil' : 'dias úteis') : (settings.general_delivery_time === 1 ? 'dia corrido' : 'dias corridos')}).
                  </p>

                  {/* Switch Toggle */}
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-800">
                    <span className="text-sm text-gray-700 dark:text-gray-300">Região ativa</span>
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, active: !prev.active }))}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        formData.active ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-700'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${
                          formData.active ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </AdminModal>

              {/* Lista de Regiões - Tabela Responsiva */}
              <div className="overflow-x-auto relative scrollbar-thin">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap">
                        Município
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap">
                        CEP Inicial
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap">
                        CEP Final
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap">
                        Valor (R$)
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap">
                        Prazo
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap">
                        Status
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap sticky right-0 bg-gray-50 dark:bg-gray-800 z-10 shadow-[-4px_0_6px_-1px_rgba(0,0,0,0.1)] dark:shadow-[-4px_0_6px_-1px_rgba(0,0,0,0.3)]">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {regions.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                          Nenhuma região cadastrada. Clique em "Nova Região" para adicionar.
                        </td>
                      </tr>
                    ) : (
                      regions.map((region) => (
                        <tr key={region.id} className="group hover:bg-gray-50 dark:hover:bg-[#065084]/40 transition-colors">
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
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-550 dark:text-gray-300 font-semibold">
                            {region.delivery_time !== null && region.delivery_time !== undefined ? (
                              <span>
                                {region.delivery_time} {region.delivery_time_type === 'calendar' ? (region.delivery_time === 1 ? 'dia corr.' : 'dias corr.') : 'd.ú.'}
                              </span>
                            ) : (
                              <span className="text-gray-400 dark:text-gray-500 italic font-normal">
                                Geral ({settings.general_delivery_time} {settings.general_delivery_time_type === 'calendar' ? (settings.general_delivery_time === 1 ? 'dia corr.' : 'dias corr.') : 'd.ú.'})
                              </span>
                            )}
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
                          <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium sticky right-0 bg-white dark:bg-gray-800 group-hover:bg-gray-50 dark:group-hover:bg-[#153e5c] z-10 shadow-[-4px_0_6px_-1px_rgba(0,0,0,0.05)] dark:shadow-[-4px_0_6px_-1px_rgba(0,0,0,0.2)] transition-colors">
                            <button
                              onClick={() => handleEditRegion(region)}
                              className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 mr-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 rounded px-1.5 py-0.5"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => handleDeleteRegion(region.id)}
                              className="text-red-600 dark:text-red-400 hover:text-red-950 dark:hover:text-red-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 rounded p-1"
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

