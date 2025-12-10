import { Facebook, Instagram, Twitter, Linkedin, MapPin, Mail, Phone } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="mt-auto" style={{ backgroundColor: 'rgba(0, 0, 0, 0.75)', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
      <div className="container mx-auto px-4 py-4">
        <div className="flex flex-col md:flex-row justify-between items-center gap-3 text-xs text-white">
          {/* Informações da Empresa */}
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
            <div className="flex items-center gap-1.5">
              <MapPin size={12} style={{ color: '#ffffff' }} />
              <span>Av. Exemplo, 123 - São Paulo, SP - CEP 01234-567</span>
            </div>
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

