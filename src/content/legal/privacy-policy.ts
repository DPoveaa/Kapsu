import { KAPSU_COMPANY } from './company-info'
import type { LegalDocument } from './types'
import {
  CURRENT_PRIVACY_POLICY_VERSION,
  LEGAL_EFFECTIVE_DATE,
  LEGAL_LAST_UPDATED,
} from './versions'

export const privacyPolicyDocument: LegalDocument = {
  id: 'privacy-policy',
  title: 'Política de Privacidade',
  shortTitle: 'Política de Privacidade',
  version: CURRENT_PRIVACY_POLICY_VERSION,
  effectiveDate: LEGAL_EFFECTIVE_DATE,
  lastUpdated: LEGAL_LAST_UPDATED,
  sections: [
    {
      id: 'introducao',
      title: '1. Introdução',
      paragraphs: [
        `Esta Política de Privacidade descreve como a ${KAPSU_COMPANY.brandName} (CNPJ ${KAPSU_COMPANY.cnpj}), operadora da plataforma e-commerce de suplementos alimentares, vitaminas, skincare, cosméticos e cuidados pessoais, coleta, utiliza, armazena, compartilha e protege os dados pessoais de visitantes, clientes, fornecedores parceiros e usuários administrativos.`,
        'Esta política foi elaborada em conformidade com a Lei Geral de Proteção de Dados Pessoais (Lei nº 13.709/2018 — LGPD) e com boas práticas internacionais de privacidade e transparência.',
        'Ao utilizar nosso site, aplicativo web, assistente virtual (Kaia), criar uma conta, realizar compras ou interagir com nossos canais, você declara ter ciência desta Política. O cadastro exige aceite expresso desta Política e dos Termos de Serviço.',
      ],
    },
    {
      id: 'controlador',
      title: '2. Controlador e Encarregado de Dados',
      paragraphs: [
        `Controlador dos dados: ${KAPSU_COMPANY.brandName}, CNPJ ${KAPSU_COMPANY.cnpj}.`,
        `Canal de contato para assuntos de privacidade: ${KAPSU_COMPANY.email} | Telefone: ${KAPSU_COMPANY.phone}.`,
        // REVISAR: designar formalmente o Encarregado de Dados (DPO) e incluir nome e e-mail dedicado, se aplicável.
        'Encarregado de Dados (DPO): a ser formalmente designado. Enquanto isso, solicitações relativas à LGPD devem ser enviadas ao e-mail de contato acima.',
      ],
    },
    {
      id: 'dados-coletados',
      title: '3. Dados Pessoais que Coletamos',
      paragraphs: [
        'Coletamos apenas os dados necessários para operar a plataforma, cumprir obrigações legais, processar pedidos, prestar suporte e melhorar nossos serviços. As categorias incluem:',
      ],
      listItems: [
        'Dados de identificação e cadastro: nome completo, e-mail, telefone celular, CPF, senha (armazenada de forma criptografada com hash), foto de perfil (quando informada ou obtida via login social) e preferências de notificação.',
        'Dados de autenticação social: ao utilizar “Continuar com Google”, recebemos do Google o token de identificação (ID Token), nome, e-mail, foto de perfil e confirmação de verificação de e-mail. Não recebemos sua senha do Google.',
        'Dados de entrega e faturamento: endereços salvos (CEP, logradouro, número, complemento, bairro, cidade, estado), utilizados para cálculo de frete e envio de pedidos.',
        'Dados de compras: itens do carrinho, histórico de pedidos, valores, status, método de pagamento escolhido (PIX, boleto bancário ou cartão de crédito), parcelamento, códigos promocionais aplicados e endereço de entrega vinculado ao pedido.',
        'Dados de pagamento: os dados sensíveis de cartão de crédito são processados diretamente pelo processador de pagamentos Asaas. A Kapsu não armazena número completo de cartão, CVV ou dados equivalentes em seus servidores. Podemos armazenar identificadores de transação, status de pagamento, URLs de boleto/PIX e metadados necessários à conciliação.',
        'Dados de comunicação: mensagens enviadas ao assistente virtual Kaia (chat do site), conversas de atendimento via WhatsApp (quando utilizadas), registros de notificações por e-mail e WhatsApp, e preferências de opt-in/opt-out para comunicações promocionais e de status de pedido.',
        'Dados de navegação e uso: páginas visitadas, tempo de permanência, profundidade de rolagem (scroll), cliques em elementos relevantes, identificador de sessão do navegador (sessionStorage), token de sessão de autenticação (localStorage), tema visual preferido (claro/escuro) e configurações do site em cache local.',
        'Dados técnicos: endereço IP, identificador de requisição (request ID), user-agent do navegador, data e hora de acesso — utilizados em logs de auditoria, segurança e diagnóstico.',
        'Dados de avaliações: comentários e notas sobre produtos, podendo ser publicados de forma anônima conforme opção do usuário.',
        'Dados de fornecedores parceiros: informações de pedidos e produtos sincronizados via integrações administrativas com Google Planilhas (Google Sheets), acessíveis mediante link seguro com token para visualização de pedidos específicos.',
      ],
    },
    {
      id: 'formas-coleta',
      title: '4. Como Coletamos os Dados',
      paragraphs: [
        'Os dados são coletados nas seguintes situações:',
      ],
      listItems: [
        'Cadastro e login: formulários de criação de conta (/cadastro), login com e-mail e senha (/login), login social via Google (Google Identity Services) e conclusão de cadastro social (telefone e CPF).',
        'Checkout: durante a finalização de compra no carrinho (/carrinho), incluindo etapas de entrega e pagamento.',
        'Perfil do usuário: atualização de dados pessoais, foto, senha e preferências de notificação na área “Meu Perfil” (/perfil).',
        'Assistente Kaia: interações com o chat flutuante do site, que podem incluir nome, e-mail e telefone quando informados voluntariamente.',
        'WhatsApp: quando você interage com nossos canais de WhatsApp ou vincula um carrinho temporário originado dessa conversa à sua conta.',
        'Cookies e armazenamento local: token JWT de autenticação (kapsu_token), dados do usuário em cache (kapsu_user), preferência de tema (theme), configurações do site (site_settings), identificador de sessão analítica (kapsu_session_id) e identificador de pedido pendente no checkout (sessionStorage).',
        'Integrações automáticas: webhooks de pagamento do Asaas, sincronização de catálogo com Google Merchant Center e sincronização operacional com Google Sheets (área administrativa).',
      ],
    },
    {
      id: 'finalidades',
      title: '5. Finalidades do Tratamento',
      paragraphs: [
        'Tratamos dados pessoais para as seguintes finalidades, com bases legais correspondentes previstas na LGPD:',
      ],
      listItems: [
        'Execução de contrato: criar e gerenciar sua conta, processar pedidos, calcular frete, emitir cobranças, confirmar pagamentos, enviar atualizações de status e entregar produtos.',
        'Cumprimento de obrigação legal ou regulatória: emissão de documentos fiscais, guarda de registros exigidos por legislação sanitária, tributária e de defesa do consumidor.',
        'Legítimo interesse: prevenção a fraudes, segurança da plataforma, logs de auditoria administrativa, melhoria da experiência de navegação e análises agregadas de uso do site.',
        'Consentimento: envio de comunicações promocionais por e-mail e WhatsApp (quando habilitadas nas preferências), e aceite de Termos e Política no cadastro.',
        'Exercício regular de direitos: defesa em processos judiciais, administrativos ou arbitrais.',
        'Operação do assistente Kaia: responder dúvidas sobre produtos, orientar navegação na loja e, quando aplicável, apresentar promoções conforme políticas internas de segurança do conteúdo.',
      ],
    },
    {
      id: 'login-social',
      title: '6. Login Social (Google e Futuros Provedores)',
      paragraphs: [
        'Atualmente oferecemos autenticação via Google (OAuth 2.0 / OpenID Connect por meio do Google Identity Services). A arquitetura da plataforma está preparada para suportar provedores adicionais (como Microsoft, Apple e GitHub), que poderão ser disponibilizados futuramente.',
        'Ao usar o login com Google, você autoriza o Google a compartilhar conosco as informações descritas na seção 3. Vinculamos sua conta Google ao seu cadastro na Kapsu na tabela de provedores de autenticação. Você pode vincular ou desvincular provedores na área de perfil, desde que mantenha ao menos um método de acesso válido.',
        'Contas criadas exclusivamente via Google podem não possuir senha local inicialmente. Nesse caso, oferecemos fluxo de criação de senha por e-mail para permitir login tradicional.',
        'O login social administrativo para Google Sheets (sincronização de planilhas) é distinto do login de usuário final e ocorre apenas na área administrativa, com escopos específicos de acesso a planilhas e Drive.',
      ],
    },
    {
      id: 'compartilhamento',
      title: '7. Compartilhamento de Dados',
      paragraphs: [
        'Não vendemos seus dados pessoais. Compartilhamos informações apenas quando necessário para a operação da plataforma:',
      ],
      listItems: [
        `Processador de pagamentos: ${KAPSU_COMPANY.paymentProcessor} — para criação de cobranças, processamento de PIX, boleto e cartão de crédito, conciliação e prevenção a fraudes.`,
        `Provedor de e-mail transacional: ${KAPSU_COMPANY.emailProvider} — para envio de confirmações, recuperação de senha e notificações.`,
        'Google LLC: autenticação de usuários (Google Sign-In), sincronização de catálogo com Google Merchant Center (via conta de serviço) e integração operacional com Google Sheets na gestão administrativa e de fornecedores.',
        'Transportadoras e operadores logísticos: dados de entrega necessários ao envio dos produtos adquiridos.',
        'Fornecedores parceiros (manipulação/produção): dados limitados do pedido (produtos, quantidades, instruções) compartilhados via planilhas sincronizadas ou link seguro de acompanhamento de pedido (/fornecedor/pedidos/:id?token=...).',
        'Distribuidores internos: notificações via WhatsApp com resumo de pedidos pagos, conforme configuração administrativa.',
        'Autoridades públicas: quando exigido por lei, ordem judicial ou requisição de autoridade competente.',
        'Prestadores de infraestrutura: hospedagem, banco de dados PostgreSQL e serviços de nuvem que processam dados em nosso nome, sob obrigações contratuais de confidencialidade e segurança.',
      ],
    },
    {
      id: 'transferencia-internacional',
      title: '8. Transferência Internacional de Dados',
      paragraphs: [
        'Alguns provedores utilizados pela Kapsu (como Google, Resend e possivelmente infraestrutura em nuvem) podem processar dados em servidores localizados fora do Brasil, inclusive nos Estados Unidos.',
        'Quando houver transferência internacional, adotamos medidas para garantir nível adequado de proteção, incluindo cláusulas contratuais, verificação de conformidade dos provedores e avaliação de impacto quando aplicável.',
      ],
    },
    {
      id: 'cookies',
      title: '9. Cookies e Tecnologias Semelhantes',
      paragraphs: [
        'Utilizamos armazenamento local do navegador e tecnologias semelhantes para manter sua sessão autenticada (token JWT em localStorage), lembrar preferências de tema claro/escuro, cachear configurações públicas do site, identificar sessões de navegação para métricas de uso (sessionStorage) e suportar o login com Google (scripts do Google Identity Services).',
        'Não utilizamos, na implementação atual, um banner de cookies dedicado. O armazenamento essencial para funcionamento da conta e checkout é necessário à execução do serviço. Comunicações promocionais dependem das preferências configuráveis em seu perfil.',
        'Você pode limpar cookies e armazenamento local nas configurações do navegador; isso pode encerrar sua sessão e exigir novo login.',
      ],
    },
    {
      id: 'retencao',
      title: '10. Retenção de Dados',
      paragraphs: [
        'Mantemos dados pessoais pelo tempo necessário para cumprir as finalidades descritas nesta Política, respeitando prazos legais:',
      ],
      listItems: [
        'Dados de conta: enquanto a conta estiver ativa e, após encerramento, pelo prazo necessário para defesa de direitos e cumprimento de obrigações legais.',
        'Dados de pedidos e pagamentos: conforme exigências fiscais, contábeis e de defesa do consumidor (em geral, mínimo de 5 anos para registros comerciais e fiscais).',
        'Logs de auditoria administrativa: armazenados com mascaramento de dados sensíveis (CPF, telefone, e-mail, senhas e tokens).',
        'Conversas do assistente Kaia e WhatsApp: pelo período necessário ao atendimento, melhoria do serviço e resolução de disputas.',
        'Tokens de recuperação de senha: expiram automaticamente após o prazo configurado no sistema.',
      ],
    },
    {
      id: 'seguranca',
      title: '11. Segurança da Informação',
      paragraphs: [
        'Adotamos medidas técnicas e organizacionais para proteger seus dados, incluindo criptografia de senhas com bcrypt, autenticação baseada em JWT com expiração, comunicação HTTPS, mascaramento de dados sensíveis em logs de auditoria, validação de webhooks de pagamento por token, criptografia de tokens OAuth do Google Sheets, controle de acesso por perfil na área administrativa e links de fornecedor com token HMAC de acesso limitado.',
        'Nenhum sistema é totalmente imune a riscos. Em caso de incidente de segurança com impacto relevante aos titulares, comunicaremos as autoridades e os afetados conforme exigido pela LGPD.',
      ],
    },
    {
      id: 'direitos-titular',
      title: '12. Direitos do Titular (LGPD)',
      paragraphs: [
        'Nos termos da LGPD, você pode solicitar, a qualquer momento, confirmação da existência de tratamento e acesso aos dados; correção de dados incompletos, inexatos ou desatualizados; anonimização, bloqueio ou eliminação de dados desnecessários; portabilidade; eliminação de dados tratados com base no consentimento; informação sobre compartilhamentos; revogação do consentimento; e oposição a tratamento com base em legítimo interesse, quando cabível.',
        `Para exercer seus direitos, entre em contato pelo e-mail ${KAPSU_COMPANY.email}. Responderemos em prazo razoável, conforme a LGPD. Podemos solicitar confirmação de identidade para proteger sua conta.`,
        'Você também pode gerenciar preferências de notificações promocionais e de status diretamente em seu perfil.',
      ],
    },
    {
      id: 'exclusao-conta',
      title: '13. Exclusão de Conta',
      paragraphs: [
        'Você pode solicitar a exclusão de sua conta entrando em contato pelo e-mail de privacidade. A exclusão pode ser limitada quando houver obrigação legal de retenção (pedidos, registros fiscais, disputas em andamento).',
        // REVISAR: implementar fluxo self-service de exclusão de conta na área de perfil, se desejado.
        'Na implementação atual, a exclusão de conta é processada mediante solicitação ao suporte. Após a exclusão, dados necessários à conformidade legal poderão ser mantidos de forma anonimizada ou pelo prazo legal mínimo.',
      ],
    },
    {
      id: 'menores',
      title: '14. Crianças e Adolescentes',
      paragraphs: [
        'A plataforma destina-se a maiores de 18 anos. Não coletamos intencionalmente dados de crianças e adolescentes sem o consentimento específico e destacado de pelo menos um dos pais ou responsável legal, quando aplicável.',
        'Se tomarmos conhecimento de coleta indevida, adotaremos medidas para eliminar os dados.',
      ],
    },
    {
      id: 'alteracoes',
      title: '15. Alterações desta Política',
      paragraphs: [
        'Podemos atualizar esta Política para refletir mudanças na plataforma, na legislação ou em nossas práticas. A versão vigente será indicada no topo do documento.',
        'Alterações relevantes poderão exigir novo aceite no próximo acesso ou cadastro. Recomendamos revisar periodicamente esta página.',
      ],
    },
    {
      id: 'contato',
      title: '16. Contato',
      paragraphs: [
        `Dúvidas sobre esta Política de Privacidade: ${KAPSU_COMPANY.email}`,
        `Telefone: ${KAPSU_COMPANY.phone}`,
        `CNPJ: ${KAPSU_COMPANY.cnpj}`,
      ],
    },
  ],
}
