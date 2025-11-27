# 🚀 Guia de Setup Rápido

## Passo 1: Instalar Dependências

```bash
npm install
```

## Passo 2: Executar o Projeto

```bash
npm run dev
```

O projeto estará disponível em: **http://localhost:5173**

## Outros Comandos Úteis

```bash
# Build para produção
npm run build

# Preview da build de produção
npm run preview

# Verificar erros de lint
npm run lint
```

## ⚠️ Solução de Problemas

### Erro: "Cannot find module"
- Execute `npm install` novamente
- Delete a pasta `node_modules` e `package-lock.json`, depois execute `npm install`

### Erro: "Port already in use"
- O Vite usa a porta 5173 por padrão
- Se estiver em uso, o Vite perguntará se deseja usar outra porta

### Erro de TypeScript
- Verifique se todas as dependências foram instaladas
- Execute `npm install` novamente

