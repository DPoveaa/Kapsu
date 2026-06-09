import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { headerCategoriesService, HeaderCategory } from '../services/header-categories.service'
import { siteSettingsService } from '../services/site-settings.service'
import * as LucideIcons from 'lucide-react'
import { useTheme } from '../context/ThemeContext'

export default function HeaderCategories() {
  const { theme } = useTheme()
  const [categories, setCategories] = useState<HeaderCategory[]>([])
  const [barBgColor, setBarBgColor] = useState('#1F2937')
  const [barBgColorDark, setBarBgColorDark] = useState('#111827')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const data = await headerCategoriesService.getAll(true)
        setCategories(data)
        
        const settings = await siteSettingsService.getSettings()
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

  return (
    <div 
      className="w-full flex items-center justify-start md:justify-center gap-3 md:gap-5 pt-0 pb-1 px-4 overflow-x-auto shadow-sm [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
      style={{ backgroundColor: currentBgColor }}
    >
      {categories.map(cat => {
        const CatIcon = (LucideIcons as any)[cat.icon || 'Tag'] || LucideIcons.Tag
        
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
