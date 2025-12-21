# Solução para Problema de Banners no Servidor

## Problema Identificado

O erro mostra que está tentando acessar:
```
https://kapsu.com.br/uploads/banners/3721288-high-dj-1766295172686-556153137.webp
```

Mas o backend provavelmente está em um domínio/porta diferente (ex: `https://api.kapsu.com.br`).

## Solução

### 1. Verificar a Configuração de VITE_API_URL

No servidor de produção, você precisa configurar a variável de ambiente `VITE_API_URL` corretamente.

**Se o backend está em:**
- `https://api.kapsu.com.br` → Configure: `VITE_API_URL=https://api.kapsu.com.br/api`
- `https://kapsu.com.br:3000` → Configure: `VITE_API_URL=https://kapsu.com.br:3000/api`
- `https://kapsu.com.br/api` → Configure: `VITE_API_URL=https://kapsu.com.br/api`

### 2. Como Configurar

**Opção A: Arquivo .env.production (recomendado)**

Crie um arquivo `.env.production` na raiz do projeto frontend:

```bash
VITE_API_URL=https://api.kapsu.com.br/api
```

**Opção B: Variável de Ambiente no Servidor**

Configure a variável de ambiente no seu servidor antes de fazer o build:

```bash
export VITE_API_URL=https://api.kapsu.com.br/api
npm run build
```

**Opção C: No arquivo de build/deploy**

Se você usa um script de deploy, adicione:

```bash
VITE_API_URL=https://api.kapsu.com.br/api npm run build
```

### 3. Verificar se Está Funcionando

Após configurar e fazer o rebuild:

1. Abra o console do navegador (F12)
2. Procure por: `🔗 URL base do backend:` ou `🔗 URL da imagem gerada:`
3. Verifique se a URL base está correta (deve ser o domínio do backend, não do frontend)

### 4. Teste Direto

Tente acessar diretamente no navegador:
```
https://api.kapsu.com.br/uploads/banners/3721288-high-dj-1766295172686-556153137.webp
```

Se abrir, o servidor está funcionando. O problema é apenas a URL sendo construída incorretamente.

### 5. Se o Backend e Frontend Estão no Mesmo Domínio

Se ambos estão em `https://kapsu.com.br`:
- Frontend: `https://kapsu.com.br`
- Backend: `https://kapsu.com.br` (porta 3000 ou via proxy)

Configure:
```bash
VITE_API_URL=https://kapsu.com.br/api
```

E certifique-se de que o servidor está servindo arquivos estáticos em `/uploads`.

## Importante

⚠️ **A variável `VITE_API_URL` é embutida no build!**

Isso significa que:
- Você precisa configurar ANTES de fazer `npm run build`
- Se mudar depois do build, precisa fazer rebuild
- A variável é substituída em tempo de build, não em runtime

## Verificação Rápida

No console do navegador, execute:
```javascript
console.log('VITE_API_URL:', import.meta.env.VITE_API_URL)
```

Se mostrar `undefined` ou `http://localhost:3000/api`, a variável não está configurada corretamente no build de produção.

