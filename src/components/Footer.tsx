import { Facebook, Instagram, Twitter, Linkedin, Mail, Phone } from 'lucide-react'
import { Link } from 'react-router-dom'
import AnimatedLogo from './AnimatedLogo'

export default function Footer() {
  return (
    <footer className="mt-auto bg-gray-900 dark:bg-gray-800 border-t border-gray-800 dark:border-gray-700 transition-colors duration-300">
      <div className="container mx-auto px-6 md:px-8 lg:px-12 py-4">
        <div className="flex flex-col md:flex-row justify-between items-center gap-3 text-xs text-white">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2 mb-2 md:mb-0">
            <AnimatedLogo
              className="h-8 w-auto object-contain opacity-90 hover:opacity-100 transition-opacity"
              alt="Kapsu Logo"
            />
            <span className="text-sm font-semibold text-white">Kapsu</span>
          </Link>

          {/* Informações da Empresa */}
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
            <div className="flex items-center gap-1.5">
              <Phone size={12} style={{ color: '#ffffff' }} />
              <span>(11) 1234-5678</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Mail size={12} style={{ color: '#ffffff' }} />
              <span>contato@kapsu.com.br</span>
            </div>
            <span>CNPJ: 12.345.678/0001-90</span>
          </div>

          {/* Redes Sociais & Copyright */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <a
                href="#"
                className="text-white hover:opacity-80 transition-opacity"
                aria-label="Facebook"
              >
                <Facebook size={14} />
              </a>
              <a
                href="#"
                className="text-white hover:opacity-80 transition-opacity"
                aria-label="Instagram"
              >
                <Instagram size={14} />
              </a>
              <a
                href="#"
                className="text-white hover:opacity-80 transition-opacity"
                aria-label="Twitter"
              >
                <Twitter size={14} />
              </a>
              <a
                href="#"
                className="text-white hover:opacity-80 transition-opacity"
                aria-label="LinkedIn"
              >
                <Linkedin size={14} />
              </a>
            </div>
            <span className="text-white opacity-90">
              © {new Date().getFullYear()} Kapsu. Todos os direitos reservados.
            </span>
          </div>
        </div>
      </div>
    </footer>
  )
}

