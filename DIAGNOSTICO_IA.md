# Diagnostico IA - Kaia

## Payload tecnico/admin x payload cliente

O painel admin pode exibir payload tecnico completo: `metadata`, rotas internas, detalhes de processamento, marcadores de debug e diagnosticos da IA.

O widget do cliente usa uma camada propria de apresentacao. Ele nao deve renderizar diretamente a versao tecnica recebida do historico/admin. Antes de entrar no estado visual do chat, a mensagem passa por sanitizacao e reconstrucao amigavel.

No widget do cliente nunca devem aparecer:

- `[LINKS]`, `[SPLIT]`, `[NAVEGAR]` ou marcadores internos semelhantes;
- JSON, metadata tecnica, rotas soltas, debug ou diagnosticos internos;
- links brutos no fim da mensagem.

## Reconstrucao de mensagens estruturadas no historico

Ao carregar ou sincronizar o historico, `FloatingChat` converte cada item do backend com `buildClientChatMessage`.

Essa etapa:

- remove marcadores internos do texto exibido;
- preserva `metadata.recommendedProducts`, `metadata.cartProducts`, `metadata.parts` e `responseLayout`;
- usa `metadata.parts` como fonte preferencial quando ela existir, respeitando a ordem salva sem juntar textos separados;
- cria `metadata.parts` no cliente quando uma mensagem antiga tem `recommendedProducts`, mas ainda nao tem estrutura salva;
- remove links tecnicos de produto quando vierem como `[LINKS: /produtos/...]`, sem criar botoes genericos como `Ver produto 1`;
- usa `[SPLIT]` apenas como instrucao tecnica para separar texto inicial e texto final;
- registra `clientDiagnostics` no metadata local do widget para indicar se a mensagem foi carregada do historico, sanitizada, teve marcadores removidos, se cards ou botoes foram reconstruidos, se `parts` foi usado e se houve fallback legado.

O formato preferencial para recomendacoes de produto e:

```json
{
  "responseLayout": "product_recommendation",
  "parts": [
    { "type": "text", "role": "assistant", "text": "Texto inicial" },
    { "type": "product_cards", "products": [] },
    { "type": "text", "role": "assistant", "text": "Texto final" },
    { "type": "actions", "actions": [] }
  ]
}
```

Se `metadata.parts` ja existir, o widget nao tenta reconstruir a mensagem por `[SPLIT]`, `[LINKS]` ou texto bruto.

Se houver erro ou dados incompletos, o fallback do cliente e mostrar apenas texto limpo, sem marcadores tecnicos.

## Cards e botoes apos F5/reabrir chat

Produtos recomendados sao renderizados novamente a partir de `metadata.recommendedProducts`.

Mini cards de carrinho continuam vindo de `metadata.cartProducts` ou `metadata.parts`.

Cards de recomendacao sao renderizados pelo tipo de parte `product_cards`.

Quando uma resposta estruturada tem texto inicial, produtos e texto final, a ordem visual no widget e:

1. balao inicial da Kaia;
2. cards dos produtos ou itens;
3. balao final da Kaia;
4. botoes de acao, se existirem.

O painel admin pode continuar exibindo detalhes tecnicos e debug; essa representacao nao deve ser usada diretamente como UI final do cliente.

Para mensagens antigas sem `metadata.parts`, o widget tenta separar o texto final por `[SPLIT]`. Se o marcador ja foi perdido, ele aplica um fallback conservador para frases finais comuns, como `Gostaria...`, `Quer...`, `Deseja...`, `Prefere...` e `Posso...`. Quando nao houver dados suficientes, os marcadores tecnicos sao removidos e o texto limpo permanece em um balao normal.

## Auto-scroll

O widget considera que o usuario esta no final apenas quando:

`scrollHeight - scrollTop - clientHeight <= 40px`

Se a distancia for maior que esse limite, o auto-scroll e pausado com `autoScrollLocked`. Polling, historico, status, badges, metadata e debug nao devem puxar o usuario para baixo enquanto ele estiver lendo mensagens anteriores.

O scroll automatico e permitido quando:

- o usuario envia uma mensagem propria;
- o usuario ja esta no final.

Quando chega nova mensagem e o usuario esta lendo acima, o widget nao puxa a tela e nao mostra botao de retorno. O usuario deve rolar manualmente ate o final.

## Agrupamento visual de remetente

Mensagens consecutivas do mesmo remetente sao agrupadas visualmente.

- Kaia seguida de Kaia: mostra `Kaia` apenas no primeiro balao da sequencia;
- cliente seguido de cliente: nao repete rotulo;
- admin seguido de admin: mostra `Atendente` apenas no primeiro balao da sequencia;
- quando o remetente muda, o nome volta a aparecer.

O icone/robo foi removido dos rotulos de mensagens da Kaia. O widget exibe apenas `Kaia`.

## Rotacao de chaves Gemini

O gerenciador real de chaves deve ficar no backend, no servico que chama a API Gemini (`api-key-manager.service.ts`, `AIService`, servico Gemini ou equivalente). O frontend nao deve receber nem manipular API keys reais.

Algoritmo esperado no backend:

1. Ao iniciar o servidor, montar o pool apenas com chaves configuradas e escolher `currentIndex` de forma aleatoria.
2. Manter em memoria `lastSuccessfulKeyIndex` e iniciar a proxima chamada por essa chave ou pela proxima chave saudavel.
3. Antes de chamar Gemini, filtrar chaves ativas e fora de cooldown.
4. Escolher por round-robin a partir do cursor atual.
5. Tentar cada chave disponivel no maximo uma vez por requisicao.
6. Em sucesso, atualizar `lastSuccessfulKeyIndex`, registrar metricas e manter/avancar o cursor de forma controlada.
7. Em falha recuperavel, classificar o erro, aplicar cooldown na chave e tentar a proxima saudavel.
8. Se nenhuma chave estiver disponivel, escolher a menor `nextAvailableAt` para diagnostico ou retornar fallback amigavel, sem loop infinito.

Cooldown por tipo de erro:

- `rate_limit`: HTTP 429, `Too Many Requests`, `quota exceeded`, `rate limit`, `RetryInfo` ou `retryDelay`. Usar `retryDelay` quando vier da Gemini; caso contrario aplicar padrao de 60s.
- `daily_quota`: quando a mensagem indicar limite diario. Aplicar cooldown maior, idealmente ate a janela diaria reiniciar.
- `invalid_key`: 400/401/403 relacionados a chave invalida, desativada ou sem permissao. Desabilitar temporariamente e logar aviso.
- `temporary`: 500/502/503/504, timeout ou erro de rede. Aplicar cooldown curto e tentar a proxima chave.
- `content_error`: erro de prompt/conteudo que nao depende da chave. Nao rotacionar indefinidamente.

Logs seguros esperados:

- `IA KeyManager: comecando pela chave #2`
- `Chave #2 retornou 429, cooldown por 39s`
- `Rotacionando para chave #3`
- `Chave #3 respondeu com sucesso`
- `Proxima chamada comecara pela chave #3`

Nunca logar a chave real. Usar apenas indice (`#2`) ou valor mascarado (`****abcd`).

Metadados seguros que o backend pode enviar ao painel admin/debug:

```json
{
  "ai_provider": "Gemini",
  "ai_model": "gemini-...",
  "ai_key_index": 2,
  "ai_key_masked": "****abcd",
  "ai_key_rotation": {
    "rotated": true,
    "reason": "rate_limit",
    "cooldownMs": 39000,
    "attemptedKeyIndexes": [2, 3],
    "selectedKeyIndex": 3,
    "availableKeys": 2,
    "cooldownKeys": 1,
    "errorType": "rate_limit"
  },
  "processing_time_ms": 841
}
```

Limitacao importante: se varias API keys pertencem ao mesmo projeto Google ou compartilham a mesma quota, alternar chaves pode nao aumentar a quota efetiva. Nesse caso o cooldown evita spam, mas nao elimina o limite compartilhado.

## Política de Dados de Conta (E-mail, Senha e CPF) e Segurança da Kaia

### 1. Diretrizes para Troca de Senha
- **Fluxo Correto**: A troca de senha no sistema deve ser feita exclusivamente através da tela de login, clicando no link/campo "Esqueci minha senha" (que redireciona para a página `/recuperar-senha`).
- **Comportamento da Kaia**: A Kaia nunca deve orientar o cliente a alterar a senha pela página de Perfil (`/perfil`), pois essa funcionalidade não existe nessa tela. Ela deve orientar a ir para a tela de login.
- **Botão de Ação**: Deve ser apresentado o botão de navegação `[NAVEGAR: Ir para login, /login]`. O clique nesse botão realiza a navegação de rota interna no frontend e fecha o chat, sem disparar novas mensagens para a IA.
- **Segurança Estrita**: A Kaia sob nenhuma circunstância deve pedir a senha atual ou nova senha do cliente no chat, nem prometer que ela mesma alterará a senha.

### 2. Diretrizes para Alteração de E-mail
- **Limitação do Sistema**: O cliente não consegue alterar o e-mail principal da conta diretamente no perfil por questões de segurança (o perfil permite alterar apenas Nome e WhatsApp).
- **Comportamento da Kaia**: Em vez de utilizar respostas estáticas/hardcoded excessivas, a Kaia deve gerar uma resposta natural e transparente. Ela explicará que, por segurança, a alteração do e-mail da conta precisa ser realizada pelo suporte humano.
- **Botões de Ação**: Fornecer os botões:
  - `[NAVEGAR: Ir para Meu Perfil, /perfil]` (para que o cliente veja seus dados cadastrais)
  - `[NAVEGAR: Falar com suporte, action://support?intent=email_change_help]` (para acionar o suporte humano)

### 3. Diretrizes para Alteração de CPF
- **Limitação do Sistema**: O CPF cadastrado é bloqueado para edição direta no perfil para manter a integridade da nota fiscal e histórico de pedidos.
- **Comportamento da Kaia**: Explicar a limitação e oferecer apoio do suporte humano para validação.

### 4. Regras Obrigatórias vs. Geração por IA (Sem Mensagens Hardcoded)
- As dúvidas iniciais sobre e-mail e senha devem ser respondidas de forma **natural e contextual** geradas pela IA, orientadas pelo System Prompt da Kaia. Não devem ser usadas interceptações rígidas ou blocos de textos prontos e fixos no backend para as perguntas padrão.
- As interceptações locais e regras de suporte estruturadas são disparadas apenas quando há **atrito/fricção no fluxo** (ex: "não recebi o e-mail", "não funcionou", "não tenho mais acesso ao e-mail").
- **Escalação para Suporte**: O chatbot não deve escalar para suporte na primeira dúvida. Primeiro, deve fornecer a devida orientação contextual. A escalação com oferta de atendimento humano (`shouldEscalateHuman: true` e canal de suporte) só deve ser acionada caso o cliente apresente fricção na tentativa da redefinição ou se explicitamente solicitar ajuda para dados sensíveis.

### 5. Diagnóstico de Suporte Guiado e Auditoria (Admin)
- Para cada interação sobre dados de conta e suporte guiado, o backend salva os metadados de diagnóstico (`guided_support_diagnostic`) com:
  - `intent`: A intenção detectada (ex: `alterar_email_conta`, `alterar_senha_conta`, `recuperar_senha`, `problema_recuperacao_senha`);
  - `response_source`: Indica se a resposta veio de regra local (`local_rules`) ou gerada por IA (`ai_generation`);
  - `obligatory_security_rule_used`: Flag booleano (`true`/`false`) sinalizando se a política de segurança de dados sensíveis foi ativada;
  - `generated_routes`: Lista de caminhos gerados para botões de navegação (ex: `['/login']`, `['/perfil']`);
  - `button_action_type`: Classificação dos botões de ação apresentados (`navigation`, `message_send`, `both` ou `none`);
  - `features_consulted`: Funcionalidades do sistema consultadas (ex: `['login_recovery']`, `['profile_functionality']`);
  - `escalation_status`: Indica se a conversa foi escalada (`escalated` ou `not_escalated`) e o motivo correspondente ou razão para não escalar.

## Política de Promoções e Cupons de Desconto

### 1. Diferença entre Promoções e Cupons

- **Promoções**: Descontos automáticos na tabela `promotions` (ex: desconto por valor mínimo de compra, kits, frete grátis automático) ou produtos com `promo_price` na tabela `products`.
- **Cupons**: Códigos digitáveis na tabela `promo_codes` que o cliente aplica manualmente no carrinho.

### 2. Regras de Consulta no Banco

Fontes consultadas ao receber perguntas sobre promoções ou cupons:
1. `promotions` (ativas, dentro da janela de validade)
2. `products` com `promo_price > 0` e `promo_price < price` e `active = true`
3. `promo_codes` com `active = true`, dentro da validade e abaixo do limite de uso

Intenções e palavras-chave que acionam a consulta: `promocao`, `cupom_desconto`, `cupom`, `desconto`, `promoção`, `oferta`.

### 3. Classificação de Visibilidade de Cupons

Cupons com as palavras `privado`, `exclusivo`, `oculto`, `private`, `não divulgável` ou `não divulgar` no código, nome ou descrição são classificados como **privados** — a Kaia não revela o código.

### 4. Botões de Ação Injetados

| Cenário | Botões |
|---|---|
| Sem promoções ativas | 🛍️ Ver produtos + 🎫 Ver cupons |
| Com promoções ativas | 🛍️ Ver produtos em promoção + 🎫 Ver cupons |
| Sem cupons | 🛍️ Ver produtos |
| Com cupons públicos | 📋 Copiar [CÓDIGO] + 🛒 Ir para o carrinho + 🛍️ Ver produtos |
| Somente cupons privados | 🛒 Ir para o carrinho + 🛍️ Ver produtos |

O botão `📋 Copiar [CÓDIGO]` usa `action://copy-coupon?code=CÓDIGO`. Ao clicar, o código é copiado para a área de transferência e o botão exibe "✅ Copiado!" por 2,5 segundos.

### 5. Sanitização de Tags Residuais

O backend remove automaticamente `[LINKS: ...]` e `[NAVEGAR: ...]` da resposta da IA antes de enviar ao frontend.

### 6. Diagnóstico Técnico (guided_support_diagnostic)

```json
{
  "promotions_diagnostic": {
    "totalFound": 2,
    "activeCount": 2,
    "promotionsTableCount": 0,
    "promoProductsCount": 2,
    "responseMode": "list"
  },
  "coupon_diagnostic": {
    "totalFound": 3,
    "activeCount": 3,
    "visibleCount": 2,
    "excludedCount": 1,
    "excludedReasons": ["coupon_marked_private"],
    "itemsSentToAI": 3,
    "responseMode": "list"
  }
}
```

`responseMode`: `empty_state` | `list` | `private_only`

