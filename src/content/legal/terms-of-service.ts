import { KAPSU_COMPANY } from './company-info'
import type { LegalDocument } from './types'
import {
  CURRENT_TERMS_OF_SERVICE_VERSION,
  LEGAL_EFFECTIVE_DATE,
  LEGAL_LAST_UPDATED,
} from './versions'

export const termsOfServiceDocument: LegalDocument = {
  id: 'terms-of-service',
  title: 'Termos de Serviço',
  shortTitle: 'Termos de Serviço',
  version: CURRENT_TERMS_OF_SERVICE_VERSION,
  effectiveDate: LEGAL_EFFECTIVE_DATE,
  lastUpdated: LEGAL_LAST_UPDATED,
  sections: [
    {
      id: 'aceitacao',
      title: '1. Aceitação dos Termos',
      paragraphs: [
        `Estes Termos de Serviço ("Termos") regulam o uso da plataforma digital ${KAPSU_COMPANY.brandName}, operada por pessoa jurídica inscrita no CNPJ ${KAPSU_COMPANY.cnpj}, dedicada à ${KAPSU_COMPANY.businessDescription}.`,
        'Ao acessar o site, criar uma conta, utilizar o assistente virtual Kaia, navegar pelo catálogo, adicionar produtos ao carrinho ou concluir uma compra, você declara ter lido, compreendido e aceito integralmente estes Termos e a Política de Privacidade.',
        'O cadastro exige aceite expresso e inequívoco dos documentos legais vigentes. O não aceite impede a conclusão do registro.',
      ],
    },
    {
      id: 'definicoes',
      title: '2. Definições',
      paragraphs: [
        'Para fins destes Termos:',
      ],
      listItems: [
        'Plataforma: site e aplicação web da Kapsu, incluindo loja, carrinho, checkout, área de perfil, assistente Kaia e integrações acessíveis ao usuário.',
        'Usuário/Cliente: pessoa física cadastrada que utiliza a plataforma para comprar produtos.',
        'Conta: registro individual associado a e-mail, podendo incluir login tradicional (senha) e/ou login social (Google).',
        'Produtos: suplementos alimentares, vitaminas, skincare, cosméticos e cuidados pessoais disponibilizados no catálogo.',
        'Pedido: solicitação de compra formalizada após confirmação de pagamento ou criação administrativa.',
        'Área Administrativa: painel restrito a usuários autorizados (administradores e gestores) para gestão de catálogo, pedidos, promoções, integrações e relatórios.',
        'Fornecedor Parceiro: terceiro integrado via Google Sheets ou link seguro de pedidos para produção/fornecimento.',
      ],
    },
    {
      id: 'elegibilidade',
      title: '3. Elegibilidade e Cadastro',
      paragraphs: [
        'Para utilizar a plataforma como cliente, você deve ter pelo menos 18 (dezoito) anos de idade; fornecer informações verdadeiras, completas e atualizadas no cadastro (nome, e-mail, telefone celular e CPF); manter a confidencialidade de suas credenciais de acesso; e aceitar a versão vigente dos Termos de Serviço e da Política de Privacidade.',
        'O cadastro pode ser realizado por e-mail e senha ou por login social com Google. Em cadastros via Google, será necessário complementar telefone e CPF antes da conclusão. A arquitetura da plataforma permite futura disponibilização de outros provedores de login (Microsoft, Apple, GitHub, entre outros).',
        'É vedado criar múltiplas contas para fins fraudulentos, burlar promoções ou violar estes Termos. A Kapsu pode recusar, suspender ou encerrar cadastros que violem estas regras.',
      ],
    },
    {
      id: 'conta-acesso',
      title: '4. Conta e Acesso',
      paragraphs: [
        'Após o cadastro, você recebe um token de autenticação (JWT) válido por 7 (sete) dias, renovável mediante novo login. Você é responsável por todas as atividades realizadas em sua conta.',
        'Contas vinculadas ao Google podem operar sem senha local. É possível criar senha posteriormente pelo fluxo de recuperação de senha por e-mail.',
        'Você pode atualizar dados pessoais, foto de perfil, preferências de notificação e vínculos de login social na área de perfil (/perfil).',
        'A Kapsu pode encerrar ou restringir contas em caso de violação destes Termos, suspeita de fraude, ordem judicial ou exigência legal.',
      ],
    },
    {
      id: 'produtos',
      title: '5. Produtos e Informações',
      paragraphs: [
        'Os produtos comercializados são suplementos alimentares, vitaminas, skincare, cosméticos e produtos de cuidados pessoais. As informações de composição, indicação, contraindicação e preço são exibidas nas páginas de produto.',
        'Imagens e descrições têm caráter informativo. Em caso de divergência, prevalece a especificação do produto no momento da compra e a orientação profissional de saúde quando aplicável.',
        'A disponibilidade de produtos pode variar conforme estoque, sincronização com fornecedores (Google Sheets) e atualizações de catálogo. A Kapsu reserva-se o direito de limitar quantidades, recusar pedidos ou descontinuar produtos.',
        'Produtos exibidos no Google Merchant Center e em canais de busca seguem as mesmas condições da loja, sujeitas à disponibilidade no momento da compra.',
      ],
    },
    {
      id: 'compras-checkout',
      title: '6. Compras e Checkout',
      paragraphs: [
        'Para finalizar compras, é necessário estar autenticado. O checkout ocorre no carrinho (/carrinho) nas etapas de revisão, entrega e pagamento.',
        'Você pode utilizar endereços salvos ou informar novo endereço com validação de CEP. O frete é calculado conforme regras configuradas na plataforma, incluindo possíveis promoções de frete grátis.',
        'Códigos promocionais e promoções automáticas podem ser aplicados conforme regras de elegibilidade. A Kapsu pode alterar ou encerrar promoções a qualquer momento.',
        'O pedido é confirmado após aprovação do pagamento (ou criação administrativa em ambiente de testes). Você receberá notificações de status por e-mail e/ou WhatsApp conforme suas preferências.',
      ],
    },
    {
      id: 'pagamentos',
      title: '7. Pagamentos',
      paragraphs: [
        `Os pagamentos são processados pelo ${KAPSU_COMPANY.paymentProcessor}, parceiro de pagamentos da Kapsu. Métodos disponíveis: PIX (QR Code e copia-e-cola), boleto bancário (linha digitável e URL para impressão) e cartão de crédito (processamento seguro via Asaas, com parcelamento conforme regras da plataforma).`,
        'Dados de cartão são inseridos em ambiente seguro do processador e não são armazenados integralmente nos servidores da Kapsu.',
        'Em caso de falha, cancelamento ou estorno de pagamento, o status do pedido será atualizado conforme notificações do processador. Taxas bancárias ou de terceiros podem ser aplicáveis conforme regras do emissor.',
        'A Kapsu pode alterar métodos de pagamento disponíveis mediante atualização da plataforma.',
      ],
    },
    {
      id: 'entrega',
      title: '8. Entrega',
      paragraphs: [
        'Os prazos de entrega são estimados com base no CEP de destino, configurações de transporte e regras de frete vigentes. Atrasos causados por transportadoras, greves, eventos de força maior ou dados de endereço incorretos não geram responsabilidade além do previsto em lei.',
        'É responsabilidade do cliente fornecer endereço completo e correto. Custos de reenvio por erro do cliente podem ser cobrados.',
      ],
    },
    {
      id: 'assistente-kaia',
      title: '9. Assistente Virtual Kaia',
      paragraphs: [
        'A Kapsu disponibiliza o assistente virtual Kaia para orientação sobre produtos, navegação na loja e dúvidas comerciais. As respostas são geradas com auxílio de inteligência artificial e têm caráter informativo.',
        'O Kaia não substitui consulta médica ou orientação profissional. Decisões sobre o uso de suplementos e cuidados de saúde devem ser tomadas de forma consciente e com acompanhamento profissional quando apropriado.',
        'Conversas podem ser registradas para melhoria do serviço, suporte e segurança, conforme a Política de Privacidade.',
      ],
    },
    {
      id: 'area-administrativa',
      title: '10. Área Administrativa e Fornecedores',
      paragraphs: [
        'A área administrativa (/admin) é restrita a usuários autorizados (administradores e farmacêuticos). O acesso indevido é proibido e pode configurar ilícito civil e penal.',
        'Funcionalidades administrativas incluem gestão de produtos, pedidos, usuários, promoções, frete, banners, relatórios, integração com Google Sheets, Google Merchant Center, WhatsApp, auditoria e Central da IA.',
        'Fornecedores parceiros podem acessar pedidos específicos por meio de link seguro com token (/fornecedor/pedidos/:id). O compartilhamento desse link é de responsabilidade da Kapsu e dos fornecedores autorizados.',
        'Integrações com Google Sheets permitem sincronização de produtos e pedidos entre a plataforma e planilhas de perfis ADMIN e FORNECEDOR, conforme configuração operacional.',
      ],
    },
    {
      id: 'uso-aceitavel',
      title: '11. Uso Aceitável',
      paragraphs: [
        'É expressamente proibido:',
      ],
      listItems: [
        'Utilizar a plataforma para fins ilícitos, fraudulentos ou que violem direitos de terceiros.',
        'Tentar acessar áreas restritas, contas de terceiros ou sistemas internos sem autorização.',
        'Realizar engenharia reversa, scraping abusivo, ataques de negação de serviço ou interferência na operação.',
        'Publicar conteúdo ofensivo, difamatório ou que viole propriedade intelectual em avaliações ou canais de comunicação.',
        'Manipular preços, promoções, estoques ou integrações de forma desleal.',
        'Utilizar bots ou automação não autorizada para compras ou extração de dados.',
      ],
    },
    {
      id: 'propriedade-intelectual',
      title: '12. Propriedade Intelectual',
      paragraphs: [
        'Todo o conteúdo da plataforma — incluindo marca Kapsu, logotipos, layout, textos, imagens, código-fonte, assistente Kaia e materiais gráficos — é protegido por direitos de propriedade intelectual da Kapsu ou de licenciadores.',
        'É concedida licença limitada, não exclusiva e revogável para uso pessoal da plataforma conforme estes Termos. É vedada reprodução, distribuição ou exploração comercial sem autorização prévia por escrito.',
      ],
    },
    {
      id: 'cancelamentos-bloqueios',
      title: '13. Cancelamentos, Reembolsos e Bloqueios',
      paragraphs: [
        'Pedidos podem ser cancelados antes do envio, conforme política comercial e legislação aplicável ao comércio eletrônico.',
        'Produtos personalizados ou em produção sob demanda podem ter condições específicas de cancelamento e devolução, nos termos do Código de Defesa do Consumidor.',
        'A Kapsu pode cancelar pedidos em caso de indisponibilidade de insumos, suspeita de fraude, erro manifesto de preço ou impossibilidade de entrega.',
        'Contas podem ser bloqueadas ou encerradas por violação destes Termos, inadimplência recorrente ou determinação legal, sem prejuízo de medidas cabíveis.',
      ],
    },
    {
      id: 'limitacao-responsabilidade',
      title: '14. Limitação de Responsabilidade',
      paragraphs: [
        'A Kapsu envida esforços para manter a plataforma disponível e segura, mas não garante operação ininterrupta ou livre de erros. Manutenções programadas e falhas de terceiros (pagamentos, hospedagem, transportadoras, Google, WhatsApp) podem afetar temporariamente o serviço.',
        'Na extensão máxima permitida pela lei aplicável, a Kapsu não se responsabiliza por danos indiretos, lucros cessantes, perda de dados ou danos decorrentes de uso inadequado de produtos sem orientação profissional.',
        'A responsabilidade total da Kapsu por danos diretos comprovadamente causados por falha exclusiva da plataforma limita-se, em regra, ao valor pago pelo cliente no pedido específico que originou o dano, salvo disposição legal em contrário.',
      ],
    },
    {
      id: 'indemnizacao',
      title: '15. Indenização',
      paragraphs: [
        'Você concorda em indenizar e isentar a Kapsu, seus administradores e colaboradores de reclamações, perdas e despesas (incluindo honorários advocatícios razoáveis) decorrentes de violação destes Termos, uso indevido da plataforma ou fornecimento de informações falsas.',
      ],
    },
    {
      id: 'alteracoes-termos',
      title: '16. Alterações dos Termos',
      paragraphs: [
        'A Kapsu pode alterar estes Termos a qualquer momento. A versão vigente será publicada em /termos-de-servico com indicação da data de atualização.',
        'Alterações materiais podem exigir novo aceite no próximo cadastro ou login. O uso continuado da plataforma após publicação de alterações pode constituir aceite tácito, na medida permitida pela legislação aplicável.',
        'Registramos a versão dos Termos e da Política aceita no momento do cadastro, com data e hora da aceitação, para fins de conformidade e auditoria.',
      ],
    },
    {
      id: 'lei-foro',
      title: '17. Lei Aplicável e Foro',
      paragraphs: [
        'Estes Termos são regidos pelas leis da República Federativa do Brasil.',
        // REVISAR: confirmar comercial e sede para definição de foro competente.
        'Fica eleito o foro da comarca de São Paulo/SP para dirimir controvérsias, salvo disposição legal específica de proteção ao consumidor que assegure ao cliente o foro de seu domicílio.',
      ],
    },
    {
      id: 'contato',
      title: '18. Contato',
      paragraphs: [
        `Dúvidas sobre estes Termos: ${KAPSU_COMPANY.email}`,
        `Telefone: ${KAPSU_COMPANY.phone}`,
        `CNPJ: ${KAPSU_COMPANY.cnpj}`,
      ],
    },
  ],
}
