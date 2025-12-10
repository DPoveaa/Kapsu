# Kapsu - Marketplace de Medicamentos Manipulados

Marketplace focado em medicamentos manipulados, permitindo tanto a venda de produtos pré-prontos quanto a personalização de medicamentos sob demanda.

## 🚀 Tecnologias

- **React 18** - Biblioteca JavaScript para construção de interfaces
- **TypeScript** - Superset do JavaScript com tipagem estática
- **Vite** - Build tool moderna e rápida
- **React Router** - Roteamento para aplicações React
- **Tailwind CSS** - Framework CSS utility-first
- **Lucide React** - Ícones modernos

## 📦 Instalação

```bash
# Instalar dependências
npm install

# Executar em modo de desenvolvimento
npm run dev

# Build para produção
npm run build

# Preview da build de produção
npm run preview
```

## ⚙️ Configuração de Ambiente

O projeto usa variáveis de ambiente para configuração. Copie o arquivo `.env.example` para `.env` e configure:

```bash
# Porta do servidor de desenvolvimento
VITE_PORT=5173

# Emails do administrador (múltiplos separados por vírgula)
# Deve corresponder ao ADMIN_EMAIL do backend
VITE_ADMIN_EMAIL=danieldpcaires@gmail.com,admin@gmail.com

# URL da API (quando conectar com backend)
VITE_API_URL=http://localhost:3000/api
```

### Variáveis de Ambiente

- **VITE_PORT**: Porta em que o servidor de desenvolvimento irá rodar (padrão: 5173)
- **VITE_ADMIN_EMAIL**: Emails que terão acesso de administrador (separados por vírgula). Deve corresponder ao ADMIN_EMAIL do backend
- **VITE_API_URL**: URL base da API backend (quando conectar)

**Importante**: Todas as variáveis de ambiente devem começar com `VITE_` para serem expostas no cliente.

## 🔐 Sistema de Autenticação

O sistema possui autenticação que verifica se o email do usuário corresponde a um dos emails em `VITE_ADMIN_EMAIL` configurado no `.env`.

- Usuários com email configurado em `VITE_ADMIN_EMAIL` (separados por vírgula) recebem acesso de administrador
- O valor deve corresponder ao `ADMIN_EMAIL` configurado no backend
- O estado de autenticação é salvo no `localStorage`
- Acesse `/login` para fazer login

## 🎯 Funcionalidades

### Produtos Pré-prontos
- Catálogo de produtos disponíveis
- Busca e filtros por categoria
- Detalhes do produto
- Adição ao carrinho

### Personalização de Medicamentos
- Criação de medicamentos personalizados
- Seleção de ativos farmacêuticos
- Definição de dosagem e quantidade
- Suporte para receitas médicas

### Carrinho e Checkout
- Gerenciamento de carrinho
- Suporte para produtos e medicamentos personalizados
- Checkout em 3 etapas:
  1. Dados de entrega
  2. Pagamento (com upload de receita quando necessário)
  3. Confirmação

## 📁 Estrutura do Projeto

```
src/
├── components/      # Componentes reutilizáveis
│   ├── Header.tsx
│   ├── Footer.tsx
│   ├── Layout.tsx
│   └── ProductCard.tsx
├── pages/          # Páginas da aplicação
│   ├── Home.tsx
│   ├── Products.tsx
│   ├── ProductDetail.tsx
│   ├── Customize.tsx
│   ├── Cart.tsx
│   ├── Checkout.tsx
│   └── Login.tsx
├── context/        # Context API
│   ├── CartContext.tsx
│   └── AuthContext.tsx
├── config/         # Configurações
│   └── env.ts
├── types/          # Definições TypeScript
│   └── index.ts
├── App.tsx         # Componente principal
├── main.tsx        # Entry point
└── index.css       # Estilos globais
```

## 🎨 Design

O design foi criado com foco em:
- Interface limpa e moderna
- Experiência de usuário intuitiva
- Responsividade para todos os dispositivos
- Cores que transmitem confiança e profissionalismo (azul para tecnologia, verde para saúde)

## 🔄 Próximos Passos

Para conectar com o backend:
1. Substituir dados mock por chamadas à API
2. Implementar autenticação de usuários completa
3. Integrar sistema de pagamento real
4. Adicionar upload de receitas médicas
5. Implementar rastreamento de pedidos
6. Adicionar painel administrativo

## 📝 Licença

Este projeto é privado e proprietário.
