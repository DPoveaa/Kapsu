import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { headerCategoriesService, HeaderCategory } from '../services/header-categories.service'
import { siteSettingsService } from '../services/site-settings.service'
import { useTheme } from '../context/ThemeContext'
import { getHeaderIcon } from '../utils/headerIcons'

interface HeaderCategoriesProps {
  variant?: 'bar' | 'menu'
  onNavigate?: () => void
}

export default function HeaderCategories({ variant = 'bar', onNavigate }: HeaderCategoriesProps) {
  const { theme } = useTheme()
  const [categories, setCategories] = useState<HeaderCategory[]>([])
  const [barBgColor, setBarBgColor] = useState('#1F2937')
  const [barBgColorDark, setBarBgColorDark] = useState('#111827')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const [data, settings] = await Promise.all([
          headerCategoriesService.getAll(true),
          siteSettingsService.getSettings(),
        ])
        setCategories(data)

        if ((settings as any).header_bar_bg_color) {
          setBarBgColor((settings as any).header_bar_bg_color)
        }
        if ((settings as any).header_bar_bg_color_dark) {
          setBarBgColorDark((settings as any).header_bar_bg_color_dark)
        }
      } catch (error) {
        console.error('Error fetching header categories:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchCategories()
    
    window.addEventListener('header-settings-updated', fetchCategories)
    return () => window.removeEventListener('header-settings-updated', fetchCategories)
  }, [])

  if (loading || categories.length === 0) return null

  const currentBgColor = theme === 'dark' ? barBgColorDark : barBgColor

  if (variant === 'menu') {
    return (
      <div>
        <p className="mb-2 px-1 text-xs font-bold uppercase tracking-wider text-gray-400">Categorias</p>
        <div className="space-y-1">
          {categories.map(cat => {
            const CatIcon = getHeaderIcon(cat.icon)
            const isExternal = cat.url.startsWith('http')
            const content = (
              <>
                {cat.show_icon && <CatIcon size={20} className="text-primary-600 dark:text-primary-400" />}
                <span className="min-w-0 flex-1 truncate">{cat.name}</span>
              </>
            )
            const className = "flex min-h-12 items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold text-gray-800 transition-colors hover:bg-primary-50 hover:text-primary-700 dark:text-gray-100 dark:hover:bg-primary-950/30 dark:hover:text-primary-300"

            return isExternal ? (
              <a
                key={cat.id}
                href={cat.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={onNavigate}
                className={className}
              >
                {content}
              </a>
            ) : (
              <Link key={cat.id} to={cat.url} onClick={onNavigate} className={className}>
                {content}
              </Link>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div 
      className="hidden w-full items-center justify-center gap-5 overflow-x-auto px-4 pb-1 pt-0 shadow-sm [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden md:flex"
      style={{ backgroundColor: currentBgColor }}
    >
      {categories.map(cat => {
        const CatIcon = getHeaderIcon(cat.icon)
        
        // Verifica se é link interno ou externo
        const isExternal = cat.url.startsWith('http')
        
        const currentTextColor = theme === 'dark' ? (cat.text_color_dark || '#FFFFFF') : cat.text_color
        const currentIconColor = theme === 'dark' ? (cat.icon_color_dark || '#FFFFFF') : cat.icon_color

        const content = (
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 cursor-pointer hover:bg-black/10 rounded-full transition-colors whitespace-nowrap">
            {cat.show_icon && <CatIcon size={14} style={{ color: currentIconColor }} />}
            <span className="text-xs font-medium" style={{ color: currentTextColor }}>{cat.name}</span>
          </div>
        )
        
        if (isExternal) {
          return (
            <a key={cat.id} href={cat.url} target="_blank" rel="noopener noreferrer">
              {content}
            </a>
          )
        }
        
        return (
          <Link key={cat.id} to={cat.url}>
            {content}
          </Link>
        )
      })}
    </div>
  )
}
