import type { LegalDocument } from './types'
import {
  CURRENT_TERMS_OF_SERVICE_VERSION,
  LEGAL_EFFECTIVE_DATE,
  LEGAL_LAST_UPDATED,
} from './versions'

export const pharmaceuticalInfoDocument: LegalDocument = {
  id: 'pharmaceutical-info',
  title: 'Informações Farmacêuticas',
  shortTitle: 'Informações Farmacêuticas',
  version: CURRENT_TERMS_OF_SERVICE_VERSION,
  effectiveDate: LEGAL_EFFECTIVE_DATE,
  lastUpdated: LEGAL_LAST_UPDATED,
  sections: [
    {
      id: 'farmaceutico',
      title: '1. Farmacêutico da Kapsu',
      paragraphs: [
        'Bruno Lopes — CRF-SP nº 87.313',
        'Bruno Lopes atua no acompanhamento e na análise técnica farmacêutica das fórmulas e produtos disponibilizados pela Kapsu, contribuindo para a avaliação de sua composição, apresentação e informações técnicas dentro de sua atuação profissional.',
      ],
    },
    {
      id: 'manipulacao-e-fabricacao',
      title: '2. Manipulação e fabricação',
      paragraphs: [
        'A Kapsu não realiza diretamente a manipulação ou fabricação dos produtos. Quando aplicável, essas atividades são realizadas por estabelecimentos parceiros devidamente habilitados, sujeitos às licenças, autorizações e responsabilidades técnicas exigidas para suas respectivas atividades.',
        'A responsabilidade técnica pela manipulação ou fabricação pertence ao estabelecimento responsável pela realização dessa atividade e ao respectivo profissional legalmente habilitado.',
        'A atuação do farmacêutico indicado nesta página não substitui a responsabilidade técnica do estabelecimento fabricante ou manipulador.',
      ],
    },
  ],
}
