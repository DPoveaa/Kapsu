import { useState, useEffect } from 'react'
import { Save, Mail, Phone, Globe, ShoppingBag, MessageCircle } from 'lucide-react'
import { siteSettingsService, SiteSettings as SiteSettingsType } from '../services/site-settings.service'

export default function SiteSettings() {
  const [settings, setSettings] = useState<SiteSettingsType>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      setLoading(true)
      const data = await siteSettingsService.getSettings()
      setSettings({
        ...data,
        chatbot_enabled: data.chatbot_enabled !== false,
        kaia_long_term_memory_enabled: data.kaia_long_term_memory_enabled !== false,
        social_media: {
          facebook: data.social_media?.facebook || '',
          instagram: data.social_media?.instagram || '',
        },
        google_sheets_sync_enabled: data.google_sheets_sync_enabled || false,
        human_support_settings: data.human_support_settings || {
          enabled: true,
          timezone: 'America/Sao_Paulo',
          businessHours: {
            '1': { open: '09:00', close: '18:00' },
            '2': { open: '09:00', close: '18:00' },
            '3': { open: '09:00', close: '18:00' },
            '4': { open: '09:00', close: '18:00' },
            '5': { open: '09:00', close: '18:00' },
            '6': { open: '09:00', close: '13:00' },
            '0': { open: '', close: '' }
          },
          onlineMessage: 'Acionei o suporte humano. Nosso atendimento está online agora e um atendente deve assumir em breve.',
          offlineMessage: 'Acionei o suporte humano. Nosso atendimento funciona de segunda a sexta, das 9h às 18h. Como agora estamos fora desse horário, sua mensagem ficou registrada para retorno assim que possível.',
          whatsappNumber: '',
          contactEmail: ''
        }
      })
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar configurações')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (key: keyof SiteSettingsType, value: any) => {
    setSettings(prev => ({
      ...prev,
      [key]: value,
    }))
  }

  const handleSocialMediaChange = (platform: 'facebook' | 'instagram', value: string) => {
    setSettings(prev => ({
      ...prev,
      social_media: {
        ...prev.social_media,
        [platform]: value,
      },
    }))
  }

  const buildSettingsPayload = (): Partial<SiteSettingsType> => ({
    contact_email: settings.contact_email,
    contact_phone: settings.contact_phone,
    whatsapp_number: settings.whatsapp_number,
    social_media: {
      facebook: settings.social_media?.facebook || '',
      instagram: settings.social_media?.instagram || '',
    },
    chatbot_enabled: settings.chatbot_enabled !== false,
    kaia_long_term_memory_enabled: settings.kaia_long_term_memory_enabled !== false,
    google_merchant_sync_enabled: settings.google_merchant_sync_enabled || false,
    google_sheets_sync_enabled: settings.google_sheets_sync_enabled || false,
    human_support_settings: settings.human_support_settings,
  })

  const handleSave = async () => {
    try {
      setSaving(true)
      setError(null)
      await siteSettingsService.updateSettings(buildSettingsPayload())
      setSuccess('Configurações salvas com sucesso!')

      setTimeout(() => setSuccess(null), 3000)
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar configurações')
    } finally {
      setSaving(false)
    }
  }

  const handleSyncAll = async () => {
    try {
      setSyncing(true)
      setError(null)
      setSuccess(null)

      const response = await siteSettingsService.syncAllMerchantProducts()
      setSuccess(response.message || 'Sincronização com o Google Merchant Center concluída!')

      setTimeout(() => setSuccess(null), 5000)
    } catch (err: any) {
      setError(err.message || 'Erro ao sincronizar produtos com o Google Merchant Center')
    } finally {
      setSyncing(false)
    }
  }

  const [syncingSheets, setSyncingSheets] = useState(false)

  const handleSyncSheetsAll = async () => {
    try {
      setSyncingSheets(true)
      setError(null)
      setSuccess(null)

      const response = await siteSettingsService.syncAllGoogleSheetsProducts()
      setSuccess(response.message || 'Sincronização com o Google Sheets concluída!')

      setTimeout(() => setSuccess(null), 5000)
    } catch (err: any) {
      setError(err.message || 'Erro ao sincronizar produtos com o Google Sheets')
    } finally {
      setSyncingSheets(false)
    }
  }

  if (loading) {
    return (
      <div className="w-full flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">Carregando configurações...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Configurações do Site</h1>
            <p className="mt-2 text-gray-600 dark:text-gray-300">Gerencie as configurações gerais do site</p>
          </div>

          {error && (
            <div className="mb-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded whitespace-pre-line">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 px-4 py-3 rounded">
              {success}
            </div>
          )}

          {/* Seção: Chatbot */}
          <div className="mb-8 border-b border-gray-200 dark:border-gray-700 pb-6">
            <div className="flex items-center mb-4">
              <MessageCircle className="w-5 h-5 text-gray-600 dark:text-gray-300 mr-2" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Chatbot Flutuante</h2>
            </div>

            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4 border border-gray-100 dark:border-gray-800">
              <div className="flex items-start justify-between">
                <div className="flex-1 mr-4">
                  <label className="text-base font-semibold text-gray-950 dark:text-white mb-1 block">
                    Exibir chatbot no site
                  </label>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Ative ou desative o botão flutuante da Kaia em todas as páginas públicas do site. A alteração entra em vigor imediatamente após salvar.
                  </p>
                </div>
                <div className="flex items-center h-5 mt-1">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={settings.chatbot_enabled !== false}
                    onClick={() => handleInputChange('chatbot_enabled', settings.chatbot_enabled === false)}
                    className={`${
                      settings.chatbot_enabled !== false ? 'bg-green-600' : 'bg-gray-200 dark:bg-gray-700'
                    } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2`}
                  >
                    <span
                      aria-hidden="true"
                      className={`${
                        settings.chatbot_enabled !== false ? 'translate-x-5' : 'translate-x-0'
                      } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
                    />
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4 border border-gray-100 dark:border-gray-800 mt-4">
              <div className="flex items-start justify-between">
                <div className="flex-1 mr-4">
                  <label className="text-base font-semibold text-gray-950 dark:text-white mb-1 block">
                    Habilitar Memória de Longo Prazo da Kaia
                  </label>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Permite que a Kaia extraia e utilize preferências comerciais aprovadas dos clientes. Em conformidade com a LGPD.
                  </p>
                </div>
                <div className="flex items-center h-5 mt-1">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={settings.kaia_long_term_memory_enabled !== false}
                    onClick={() => handleInputChange('kaia_long_term_memory_enabled', settings.kaia_long_term_memory_enabled === false)}
                    className={`${
                      settings.kaia_long_term_memory_enabled !== false ? 'bg-green-600' : 'bg-gray-200 dark:bg-gray-700'
                    } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2`}
                  >
                    <span
                      aria-hidden="true"
                      className={`${
                        settings.kaia_long_term_memory_enabled !== false ? 'translate-x-5' : 'translate-x-0'
                      } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
                    />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Seção: Contato */}
          <div className="mb-8 border-b border-gray-200 dark:border-gray-700 pb-6">
            <div className="flex items-center mb-4">
              <Phone className="w-5 h-5 text-gray-600 dark:text-gray-300 mr-2" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Informações de Contato</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Mail className="w-4 h-4 inline mr-1" />
                  Email de Contato
                </label>
                <input
                  type="email"
                  value={settings.contact_email || ''}
                  onChange={(e) => handleInputChange('contact_email', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-400 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-900 dark:text-white"
                  placeholder="contato@kapsu.com"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Exibido no rodapé do site.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Phone className="w-4 h-4 inline mr-1" />
                  Telefone de Contato
                </label>
                <input
                  type="tel"
                  value={settings.contact_phone || ''}
                  onChange={(e) => handleInputChange('contact_phone', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-400 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-900 dark:text-white"
                  placeholder="(11) 99999-9999"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Exibido no rodapé do site.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Phone className="w-4 h-4 inline mr-1" />
                  WhatsApp de Suporte (Apenas DDD e Número)
                </label>
                <input
                  type="tel"
                  value={settings.whatsapp_number || ''}
                  onChange={(e) => handleInputChange('whatsapp_number', e.target.value.replace(/\D/g, '').slice(0, 11))}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-400 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-900 dark:text-white"
                  placeholder="Ex: 11999999999"
                />
              </div>
            </div>
          </div>

          {/* Seção: Redes Sociais */}
          <div className="mb-8 border-b border-gray-200 dark:border-gray-700 pb-6">
            <div className="flex items-center mb-4">
              <Globe className="w-5 h-5 text-gray-600 dark:text-gray-300 mr-2" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Redes Sociais</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Facebook
                </label>
                <input
                  type="url"
                  value={settings.social_media?.facebook || ''}
                  onChange={(e) => handleSocialMediaChange('facebook', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-400 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-900 dark:text-white"
                  placeholder="https://facebook.com/kapsu"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Instagram
                </label>
                <input
                  type="url"
                  value={settings.social_media?.instagram || ''}
                  onChange={(e) => handleSocialMediaChange('instagram', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-400 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-900 dark:text-white"
                  placeholder="https://instagram.com/kapsu"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Links exibidos no rodapé quando preenchidos.</p>
              </div>
            </div>
          </div>

          {/* Seção: Google Merchant Center */}
          <div className="mb-8 border-b border-gray-200 dark:border-gray-700 pb-6">
            <div className="flex items-center mb-4">
              <ShoppingBag className="w-5 h-5 text-gray-600 dark:text-gray-300 mr-2" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Google Merchant Center</h2>
            </div>

            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4 border border-gray-100 dark:border-gray-800 space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex-1 mr-4">
                  <label className="text-base font-semibold text-gray-950 dark:text-white mb-1 block">
                    Sincronização Automática
                  </label>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Quando ativado, qualquer alteração nos produtos (preço, estoque, descrição, imagens) ou exclusões físicas/lógicas será enviada e atualizada no Google Merchant Center em tempo real de forma automática.
                  </p>
                </div>
                <div className="flex items-center h-5 mt-1">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={settings.google_merchant_sync_enabled || false}
                    onClick={() => handleInputChange('google_merchant_sync_enabled', !settings.google_merchant_sync_enabled)}
                    className={`${
                      settings.google_merchant_sync_enabled ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                    } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2`}
                  >
                    <span
                      aria-hidden="true"
                      className={`${
                        settings.google_merchant_sync_enabled ? 'translate-x-5' : 'translate-x-0'
                      } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
                    />
                  </button>
                </div>
              </div>

              <div className="border-t border-gray-200 dark:border-gray-800 pt-4 flex items-center justify-between">
                <div className="flex-1 mr-4">
                  <label className="text-sm font-semibold text-gray-900 dark:text-white mb-1 block">
                    Sincronizar Tudo Manualmente
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Suba todos os produtos ativos do banco de dados de uma vez e atualize suas fotos, preços e descrições no Merchant Center.
                  </p>
                </div>
                <div>
                  <button
                    type="button"
                    disabled={syncing}
                    onClick={handleSyncAll}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
                  >
                    {syncing ? 'Sincronizando...' : 'Sincronizar Agora'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Seção: Google Sheets */}
          <div className="mb-8 border-b border-gray-200 dark:border-gray-700 pb-6">
            <div className="flex items-center mb-4">
              <Globe className="w-5 h-5 text-gray-600 dark:text-gray-300 mr-2" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Google Sheets Integration</h2>
            </div>

            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4 border border-gray-100 dark:border-gray-800 space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex-1 mr-4">
                  <label className="text-base font-semibold text-gray-950 dark:text-white mb-1 block">
                    Sincronização Automática
                  </label>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Sincroniza automaticamente as informações do site com o Google Sheets quando ativado. Edições no painel e na planilha serão integradas de forma bidirecional.
                  </p>
                </div>
                <div className="flex items-center h-5 mt-1">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={settings.google_sheets_sync_enabled || false}
                    onClick={() => handleInputChange('google_sheets_sync_enabled', !settings.google_sheets_sync_enabled)}
                    className={`${
                      settings.google_sheets_sync_enabled ? 'bg-green-600' : 'bg-gray-200 dark:bg-gray-700'
                    } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2`}
                  >
                    <span
                      aria-hidden="true"
                      className={`${
                        settings.google_sheets_sync_enabled ? 'translate-x-5' : 'translate-x-0'
                      } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
                    />
                  </button>
                </div>
              </div>

              <div className="border-t border-gray-200 dark:border-gray-800 pt-4 flex items-center justify-between">
                <div className="flex-1 mr-4">
                  <label className="text-sm font-semibold text-gray-900 dark:text-white mb-1 block">
                    Sincronizar Planilha Manualmente
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Gera uma varredura completa. Atualiza o banco com edições da planilha e envia atualizações recentes do painel para a planilha.
                  </p>
                </div>
                <div>
                  <button
                    type="button"
                    disabled={syncingSheets}
                    onClick={handleSyncSheetsAll}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 transition-colors"
                  >
                    {syncingSheets ? 'Sincronizando...' : 'Sincronizar Planilha'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Seção: Atendimento Humano / Suporte */}
          <div className="mb-8 border-b border-gray-200 dark:border-gray-700 pb-6">
            <div className="flex items-center mb-4">
              <MessageCircle className="w-5 h-5 text-gray-600 dark:text-gray-300 mr-2" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Atendimento Humano / Suporte</h2>
            </div>

            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4 border border-gray-100 dark:border-gray-800 space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex-1 mr-4">
                  <label className="text-base font-semibold text-gray-950 dark:text-white mb-1 block">
                    Suporte Humano Ativo
                  </label>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Permite aos clientes solicitarem transferência para atendimento humano via chat.
                  </p>
                </div>
                <div className="flex items-center h-5 mt-1">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={settings.human_support_settings?.enabled !== false}
                    onClick={() => handleInputChange('human_support_settings', {
                      ...settings.human_support_settings,
                      enabled: settings.human_support_settings?.enabled === false
                    })}
                    className={`${
                      settings.human_support_settings?.enabled !== false ? 'bg-green-600' : 'bg-gray-200 dark:bg-gray-700'
                    } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2`}
                  >
                    <span
                      aria-hidden="true"
                      className={`${
                        settings.human_support_settings?.enabled !== false ? 'translate-x-5' : 'translate-x-0'
                      } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
                    />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Timezone
                  </label>
                  <input
                    type="text"
                    value={settings.human_support_settings?.timezone || 'America/Sao_Paulo'}
                    onChange={(e) => handleInputChange('human_support_settings', {
                      ...settings.human_support_settings,
                      timezone: e.target.value
                    })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-400 rounded-lg dark:bg-gray-900 dark:text-white text-sm"
                    placeholder="America/Sao_Paulo"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    WhatsApp de Suporte
                  </label>
                  <input
                    type="text"
                    value={settings.human_support_settings?.whatsappNumber || ''}
                    onChange={(e) => handleInputChange('human_support_settings', {
                      ...settings.human_support_settings,
                      whatsappNumber: e.target.value
                    })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-400 rounded-lg dark:bg-gray-900 dark:text-white text-sm"
                    placeholder="Ex: 5511999999999"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Mensagem dentro do horário
                </label>
                <textarea
                  value={settings.human_support_settings?.onlineMessage || ''}
                  onChange={(e) => handleInputChange('human_support_settings', {
                    ...settings.human_support_settings,
                    onlineMessage: e.target.value
                  })}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-400 rounded-lg dark:bg-gray-900 dark:text-white text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Mensagem fora do horário
                </label>
                <textarea
                  value={settings.human_support_settings?.offlineMessage || ''}
                  onChange={(e) => handleInputChange('human_support_settings', {
                    ...settings.human_support_settings,
                    offlineMessage: e.target.value
                  })}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-400 rounded-lg dark:bg-gray-900 dark:text-white text-sm"
                />
              </div>

              {/* Hours per Day */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Horário de atendimento (Dia da semana)
                </label>
                <div className="space-y-2">
                  {['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'].map((day, idx) => {
                    const dayKey = String(idx);
                    const hours = settings.human_support_settings?.businessHours?.[dayKey] || { open: '', close: '' };
                    return (
                      <div key={day} className="flex items-center space-x-2 text-sm">
                        <span className="w-24 text-gray-600 dark:text-gray-400">{day}:</span>
                        <input
                          type="text"
                          placeholder="09:00"
                          value={hours.open || ''}
                          onChange={(e) => {
                            const newHours = { ...hours, open: e.target.value };
                            const bh = { ...settings.human_support_settings?.businessHours, [dayKey]: newHours };
                            handleInputChange('human_support_settings', {
                              ...settings.human_support_settings,
                              businessHours: bh
                            });
                          }}
                          className="w-20 px-2 py-1 border border-gray-300 dark:border-gray-400 rounded-lg text-center dark:bg-gray-900 dark:text-white"
                        />
                        <span className="text-gray-500">às</span>
                        <input
                          type="text"
                          placeholder="18:00"
                          value={hours.close || ''}
                          onChange={(e) => {
                            const newHours = { ...hours, close: e.target.value };
                            const bh = { ...settings.human_support_settings?.businessHours, [dayKey]: newHours };
                            handleInputChange('human_support_settings', {
                              ...settings.human_support_settings,
                              businessHours: bh
                            });
                          }}
                          className="w-20 px-2 py-1 border border-gray-300 dark:border-gray-400 rounded-lg text-center dark:bg-gray-900 dark:text-white"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed dark:bg-green-600 dark:hover:bg-green-700"
            >
              <Save className="w-5 h-5 mr-2" />
              {saving ? 'Salvando...' : 'Salvar Configurações'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

