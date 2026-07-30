import { Facebook, Instagram, Mail, Phone } from 'lucide-react'
import { Link } from 'react-router-dom'
import AnimatedLogo from './AnimatedLogo'
import { useSiteSettings } from '../hooks/useSiteSettings'

export default function Footer() {
  const { settings } = useSiteSettings()

  const contactPhone = settings.contact_phone?.trim() || '(11) 5304-2534'
  const contactEmail = settings.contact_email?.trim() || 'kapsultda@gmail.com'
  const facebookUrl = settings.social_media?.facebook?.trim()
  const instagramUrl = settings.social_media?.instagram?.trim()
  const phoneHref = `tel:${contactPhone.replace(/\D/g, '')}`

  return (
    <footer className="mt-auto bg-gray-900 dark:bg-gray-800 border-t border-gray-800 dark:border-gray-700 transition-colors duration-300">
      <div className="container mx-auto px-6 md:px-8 lg:px-12 py-4">
        <div className="flex flex-col md:flex-row justify-between items-center gap-3 text-xs text-white">
          <Link to="/" className="flex items-center space-x-2 mb-2 md:mb-0">
            <AnimatedLogo
              className="h-8 w-8 object-contain opacity-90 hover:opacity-100 transition-opacity"
              alt="Kapsu Logo"
            />
            <span className="text-sm font-semibold text-white">Kapsu</span>
          </Link>

          <div className="flex flex-wrap items-center justify-center gap-x-2 md:gap-x-3 gap-y-1">
            <Link to="/termos-de-servico" className="hover:opacity-80 transition-opacity">
              Termos de Serviço
            </Link>
            <span className="opacity-40">|</span>
            <Link to="/politica-de-privacidade" className="hover:opacity-80 transition-opacity">
              Política de Privacidade
            </Link>
            <span className="opacity-40">|</span>
            <Link to="/informacoes-farmaceuticas" className="hover:opacity-80 transition-opacity">
              Informações Farmacêuticas
            </Link>
            <a href={phoneHref} className="flex items-center gap-1.5 hover:opacity-80 transition-opacity ml-1">
              <Phone size={12} style={{ color: '#ffffff' }} />
              <span>{contactPhone}</span>
            </a>
            <a href={`mailto:${contactEmail}`} className="flex items-center gap-1.5 hover:opacity-80 transition-opacity">
              <Mail size={12} style={{ color: '#ffffff' }} />
              <span>{contactEmail}</span>
            </a>
            <span>CNPJ: 66.915.543/0001-47</span>
          </div>

          <div className="flex items-center gap-3">
            {(facebookUrl || instagramUrl) && (
              <div className="flex items-center gap-2">
                {facebookUrl && (
                  <a
                    href={facebookUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white hover:opacity-80 transition-opacity"
                    aria-label="Facebook"
                  >
                    <Facebook size={14} />
                  </a>
                )}
                {instagramUrl && (
                  <a
                    href={instagramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white hover:opacity-80 transition-opacity"
                    aria-label="Instagram"
                  >
                    <Instagram size={14} />
                  </a>
                )}
              </div>
            )}
            <span className="text-white opacity-90">
              © {new Date().getFullYear()} Kapsu. Todos os direitos reservados.
            </span>
          </div>
        </div>
      </div>
    </footer>
  )
}
