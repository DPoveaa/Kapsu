import { useState, useEffect } from 'react'
import { Save, Upload, Trash2, Image as ImageIcon, Mail, Phone, MapPin, Palette, Globe } from 'lucide-react'
import { siteSettingsService, SiteSettings as SiteSettingsType } from '../services/site-settings.service'
import { env } from '../config/env'

export default function SiteSettings() {
  const [settings, setSettings] = useState<SiteSettingsType>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)

  const API_URL = env.apiUrl

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      setLoading(true)
      const data = await siteSettingsService.getSettings()
      setSettings(data)
      
      // Carrega preview da logo se existir
      if (data.logo_url) {
        setLogoPreview(`${API_URL}/${data.logo_url}`)
      }
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

  const handleSocialMediaChange = (platform: string, value: string) => {
    setSettings(prev => ({
      ...prev,
      social_media: {
        ...prev.social_media,
        [platform]: value,
      },
    }))
  }

  const handleThemeColorChange = (colorKey: string, value: string) => {
    setSettings(prev => ({
      ...prev,
      theme_colors: {
        ...prev.theme_colors,
        [colorKey]: value,
      },
    }))
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Valida tipo de arquivo
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
    if (!allowedTypes.includes(file.type)) {
      setError('Apenas imagens são permitidas (JPEG, PNG, GIF, WEBP, SVG)')
      return
    }

    // Valida tamanho (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('A imagem deve ter no máximo 5MB')
      return
    }

    try {
      setUploading(true)
      setError(null)
      
      const logoUrl = await siteSettingsService.uploadLogo(file)
      setSettings(prev => ({ ...prev, logo_url: logoUrl }))
      setLogoPreview(`${API_URL}/${logoUrl}`)
      setSuccess('Logo enviada com sucesso!')
      
      setTimeout(() => setSuccess(null), 3000)
    } catch (err: any) {
      setError(err.message || 'Erro ao fazer upload da logo')
    } finally {
      setUploading(false)
    }
  }

  const handleDeleteLogo = async () => {
    if (!confirm('Tem certeza que deseja remover a logo?')) return

    try {
      setError(null)
      await siteSettingsService.deleteLogo()
      setSettings(prev => ({ ...prev, logo_url: undefined }))
      setLogoPreview(null)
      setSuccess('Logo removida com sucesso!')
      
      setTimeout(() => setSuccess(null), 3000)
    } catch (err: any) {
      setError(err.message || 'Erro ao remover logo')
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      setError(null)
      await siteSettingsService.updateSettings(settings)
      setSuccess('Configurações salvas com sucesso!')
      
      setTimeout(() => setSuccess(null), 3000)
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar configurações')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#320A6B] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">Carregando configurações...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#320A6B] py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white dark:bg-[#065084] rounded-lg shadow-md dark:shadow-lg p-6 border border-gray-200 dark:border-[#0F828C]">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Configurações do Site</h1>
            <p className="mt-2 text-gray-600 dark:text-gray-300">Gerencie as configurações gerais do site</p>
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

          {/* Seção: Logo */}
          <div className="mb-8 border-b border-gray-200 dark:border-[#0F828C] pb-6">
            <div className="flex items-center mb-4">
              <ImageIcon className="w-5 h-5 text-gray-600 dark:text-gray-300 mr-2" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Logo do Site</h2>
            </div>
            
            <div className="space-y-4">
              {logoPreview && (
                <div className="relative inline-block">
                  <img
                    src={logoPreview}
                    alt="Logo atual"
                    className="max-h-32 max-w-full object-contain border border-gray-200 dark:border-[#0F828C] rounded p-2"
                  />
                  <button
                    onClick={handleDeleteLogo}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                    title="Remover logo"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Enviar Nova Logo
                </label>
                <div className="flex items-center space-x-4">
                  <label className="cursor-pointer inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                    <Upload className="w-4 h-4 mr-2" />
                    {uploading ? 'Enviando...' : 'Selecionar Logo'}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                      disabled={uploading}
                    />
                  </label>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    Formatos: JPEG, PNG, GIF, WEBP, SVG (máx. 5MB)
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Seção: Informações Básicas */}
          <div className="mb-8 border-b border-gray-200 dark:border-[#0F828C] pb-6">
            <div className="flex items-center mb-4">
              <Globe className="w-5 h-5 text-gray-600 dark:text-gray-300 mr-2" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Informações Básicas</h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Nome do Site
                </label>
                <input
                  type="text"
                  value={settings.site_name || ''}
                  onChange={(e) => handleInputChange('site_name', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-[#0F828C] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-[#065084] dark:text-white"
                  placeholder="Ex: Kapsu Farmácia"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Descrição do Site
                </label>
                <textarea
                  value={settings.site_description || ''}
                  onChange={(e) => handleInputChange('site_description', e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-[#0F828C] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-[#065084] dark:text-white"
                  placeholder="Descrição breve do site"
                />
              </div>
            </div>
          </div>

          {/* Seção: Contato */}
          <div className="mb-8 border-b border-gray-200 dark:border-[#0F828C] pb-6">
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
                  className="w-full px-4 py-2 border border-gray-300 dark:border-[#0F828C] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-[#065084] dark:text-white"
                  placeholder="contato@kapsu.com"
                />
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
                  className="w-full px-4 py-2 border border-gray-300 dark:border-[#0F828C] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-[#065084] dark:text-white"
                  placeholder="(11) 99999-9999"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <MapPin className="w-4 h-4 inline mr-1" />
                  Endereço
                </label>
                <textarea
                  value={settings.address || ''}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-[#0F828C] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-[#065084] dark:text-white"
                  placeholder="Endereço completo"
                />
              </div>
            </div>
          </div>

          {/* Seção: Redes Sociais */}
          <div className="mb-8 border-b border-gray-200 dark:border-[#0F828C] pb-6">
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
                  className="w-full px-4 py-2 border border-gray-300 dark:border-[#0F828C] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-[#065084] dark:text-white"
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
                  className="w-full px-4 py-2 border border-gray-300 dark:border-[#0F828C] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-[#065084] dark:text-white"
                  placeholder="https://instagram.com/kapsu"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Twitter
                </label>
                <input
                  type="url"
                  value={settings.social_media?.twitter || ''}
                  onChange={(e) => handleSocialMediaChange('twitter', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-[#0F828C] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-[#065084] dark:text-white"
                  placeholder="https://twitter.com/kapsu"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  LinkedIn
                </label>
                <input
                  type="url"
                  value={settings.social_media?.linkedin || ''}
                  onChange={(e) => handleSocialMediaChange('linkedin', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-[#0F828C] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-[#065084] dark:text-white"
                  placeholder="https://linkedin.com/company/kapsu"
                />
              </div>
            </div>
          </div>

          {/* Seção: Cores do Tema */}
          <div className="mb-8">
            <div className="flex items-center mb-4">
              <Palette className="w-5 h-5 text-gray-600 dark:text-gray-300 mr-2" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Cores do Tema</h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Cor Primária
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="color"
                    value={settings.theme_colors?.primary || '#3B82F6'}
                    onChange={(e) => handleThemeColorChange('primary', e.target.value)}
                    className="h-10 w-20 border border-gray-300 dark:border-[#0F828C] rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={settings.theme_colors?.primary || '#3B82F6'}
                    onChange={(e) => handleThemeColorChange('primary', e.target.value)}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-[#0F828C] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-[#065084] dark:text-white"
                    placeholder="#3B82F6"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Cor Secundária
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="color"
                    value={settings.theme_colors?.secondary || '#10B981'}
                    onChange={(e) => handleThemeColorChange('secondary', e.target.value)}
                    className="h-10 w-20 border border-gray-300 dark:border-[#0F828C] rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={settings.theme_colors?.secondary || '#10B981'}
                    onChange={(e) => handleThemeColorChange('secondary', e.target.value)}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-[#0F828C] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-[#065084] dark:text-white"
                    placeholder="#10B981"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Cor de Destaque
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="color"
                    value={settings.theme_colors?.accent || '#F59E0B'}
                    onChange={(e) => handleThemeColorChange('accent', e.target.value)}
                    className="h-10 w-20 border border-gray-300 dark:border-[#0F828C] rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={settings.theme_colors?.accent || '#F59E0B'}
                    onChange={(e) => handleThemeColorChange('accent', e.target.value)}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-[#0F828C] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-[#065084] dark:text-white"
                    placeholder="#F59E0B"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Botão Salvar */}
          <div className="mt-8 flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed dark:bg-blue-600 dark:hover:bg-blue-700"
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

