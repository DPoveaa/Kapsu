import { Link } from 'react-router-dom'
import { Facebook, Instagram, Twitter, Mail, Phone } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300 mt-auto">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-primary-600 to-medical-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">S</span>
              </div>
              <span className="text-2xl font-bold text-white">Sanare</span>
            </div>
            <p className="text-sm">
              Medicamentos manipulados de qualidade premium, personalizados para sua saúde e bem-estar.
            </p>
          </div>

          {/* Produtos */}
          <div>
            <h3 className="text-white font-semibold mb-4">Produtos</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/produtos?categoria=vitamina" className="hover:text-white transition-colors">
                  Vitaminas
                </Link>
              </li>
              <li>
                <Link to="/produtos?categoria=mineral" className="hover:text-white transition-colors">
                  Minerais
                </Link>
              </li>
              <li>
                <Link to="/produtos?categoria=fitoterapico" className="hover:text-white transition-colors">
                  Fitoterápicos
                </Link>
              </li>
              <li>
                <Link to="/personalizar" className="hover:text-white transition-colors">
                  Personalizar Medicamento
                </Link>
              </li>
            </ul>
          </div>

          {/* Empresa */}
          <div>
            <h3 className="text-white font-semibold mb-4">Empresa</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/sobre" className="hover:text-white transition-colors">
                  Sobre
                </Link>
              </li>
              <li>
                <Link to="/contato" className="hover:text-white transition-colors">
                  Contato
                </Link>
              </li>
              <li>
                <Link to="/blog" className="hover:text-white transition-colors">
                  Blog
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-white font-semibold mb-4">Legal</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/privacidade" className="hover:text-white transition-colors">
                  Privacidade
                </Link>
              </li>
              <li>
                <Link to="/termos" className="hover:text-white transition-colors">
                  Termos
                </Link>
              </li>
              <li>
                <Link to="/faq" className="hover:text-white transition-colors">
                  FAQ
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Contact Info */}
        <div className="mt-8 pt-8 border-t border-gray-800">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="flex flex-wrap items-center justify-center gap-6 text-sm">
              <div className="flex items-center space-x-2">
                <Phone size={16} />
                <span>(11) 1234-5678</span>
              </div>
              <div className="flex items-center space-x-2">
                <Mail size={16} />
                <span>contato@sanare.com.br</span>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <a href="#" className="hover:text-white transition-colors">
                <Facebook size={20} />
              </a>
              <a href="#" className="hover:text-white transition-colors">
                <Instagram size={20} />
              </a>
              <a href="#" className="hover:text-white transition-colors">
                <Twitter size={20} />
              </a>
            </div>
          </div>
          <p className="text-center text-sm mt-4 text-gray-500">
            © 2024 Sanare. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  )
}

