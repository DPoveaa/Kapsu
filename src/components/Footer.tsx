import { Link } from 'react-router-dom'
import { Facebook, Instagram, Twitter, Mail, Phone } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300 mt-auto">
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Brand */}
          <div>
            <div className="flex items-center space-x-2 mb-3">
              <div className="w-8 h-8 bg-gradient-to-br from-primary-600 to-medical-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">S</span>
              </div>
              <span className="text-xl font-bold text-white">Sanare</span>
            </div>
            <p className="text-xs text-gray-400">
              Medicamentos manipulados de qualidade premium, personalizados para sua saúde e bem-estar.
            </p>
          </div>

          {/* Produtos */}
          <div>
            <h3 className="text-white font-semibold mb-3 text-sm">Produtos</h3>
            <ul className="space-y-1.5">
              <li>
                <Link to="/produtos?categoria=vitamina" className="hover:text-white transition-colors text-xs">
                  Vitaminas
                </Link>
              </li>
              <li>
                <Link to="/produtos?categoria=mineral" className="hover:text-white transition-colors text-xs">
                  Minerais
                </Link>
              </li>
              <li>
                <Link to="/produtos?categoria=fitoterapico" className="hover:text-white transition-colors text-xs">
                  Fitoterápicos
                </Link>
              </li>
              <li>
                <Link to="/personalizar" className="hover:text-white transition-colors text-xs">
                  Personalizar Medicamento
                </Link>
              </li>
            </ul>
          </div>

          {/* Empresa */}
          <div>
            <h3 className="text-white font-semibold mb-3 text-sm">Empresa</h3>
            <ul className="space-y-1.5">
              <li>
                <Link to="/sobre" className="hover:text-white transition-colors text-xs">
                  Sobre
                </Link>
              </li>
              <li>
                <Link to="/contato" className="hover:text-white transition-colors text-xs">
                  Contato
                </Link>
              </li>
              <li>
                <Link to="/blog" className="hover:text-white transition-colors text-xs">
                  Blog
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-white font-semibold mb-3 text-sm">Legal</h3>
            <ul className="space-y-1.5">
              <li>
                <Link to="/privacidade" className="hover:text-white transition-colors text-xs">
                  Privacidade
                </Link>
              </li>
              <li>
                <Link to="/termos" className="hover:text-white transition-colors text-xs">
                  Termos
                </Link>
              </li>
              <li>
                <Link to="/faq" className="hover:text-white transition-colors text-xs">
                  FAQ
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Contact Info */}
        <div className="mt-4 pt-4 border-t border-gray-800">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-3 md:space-y-0">
            <div className="flex flex-wrap items-center justify-center gap-4 text-xs">
              <div className="flex items-center space-x-1.5">
                <Phone size={14} />
                <span>(11) 1234-5678</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <Mail size={14} />
                <span>contato@sanare.com.br</span>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <a href="#" className="hover:text-white transition-colors">
                <Facebook size={18} />
              </a>
              <a href="#" className="hover:text-white transition-colors">
                <Instagram size={18} />
              </a>
              <a href="#" className="hover:text-white transition-colors">
                <Twitter size={18} />
              </a>
            </div>
          </div>
          <p className="text-center text-xs mt-3 text-gray-500">
            © 2024 Sanare. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  )
}

