# Diagnóstico de Problemas com Banners

## Como verificar se está funcionando

### 1. Verificar se os arquivos estão sendo salvos
Acesse: `http://seu-servidor:porta/test-uploads`
Isso mostrará:
- Caminho da pasta uploads
- Lista de arquivos na pasta banners
- Total de arquivos

### 2. Verificar se os arquivos estão acessíveis
Tente acessar diretamente no navegador:
`http://seu-servidor:porta/uploads/banners/nome-do-arquivo.jpg`

Se não abrir, o problema está no servidor estático.

### 3. Verificar no console do navegador
Abra o console (F12) e procure por:
- `❌ Erro ao carregar imagem do banner:` - mostra a URL que está sendo tentada
- `✅ Imagem do banner carregada com sucesso:` - confirma que carregou

### 4. Verificar variáveis de ambiente

**Frontend (.env ou .env.production):**
```
VITE_API_URL=https://seu-servidor.com/api
```

**Backend (.env):**
```
API_URL=https://seu-servidor.com
# ou
API_URL=http://seu-servidor.com:3000
```

### 5. Verificar no banco de dados
A coluna `image_url` na tabela `banners` deve conter:
```
/uploads/banners/filename.jpg
```

NÃO deve conter URLs completas como:
```
https://servidor.com/uploads/banners/filename.jpg
```

## Problemas comuns e soluções

### Problema: Imagens não carregam no servidor
**Causa:** URL base incorreta ou servidor não servindo arquivos estáticos

**Solução:**
1. Verifique se `VITE_API_URL` está configurada corretamente no frontend
2. Verifique se o servidor está servindo arquivos em `/uploads`
3. Verifique permissões da pasta `uploads/banners`

### Problema: Arquivos são salvos mas não aparecem
**Causa:** Caminho no banco está incorreto ou URL construída incorretamente

**Solução:**
1. Verifique no banco se o caminho começa com `/uploads/banners/`
2. Verifique no console qual URL está sendo tentada
3. Teste acessar a URL diretamente no navegador

### Problema: Funciona localmente mas não no servidor
**Causa:** Diferença nas variáveis de ambiente

**Solução:**
1. Certifique-se que `VITE_API_URL` no servidor aponta para o servidor correto
2. Certifique-se que `API_URL` no backend está correto
3. Verifique se há proxy/nginx que precisa ser configurado

## Estrutura esperada

```
servidor/
├── uploads/
│   └── banners/
│       ├── arquivo1.jpg
│       ├── arquivo2.jpg
│       └── ...
└── src/
    └── ...
```

## URLs esperadas

**Local:**
- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3000`
- Imagem: `http://localhost:3000/uploads/banners/arquivo.jpg`

**Servidor:**
- Frontend: `https://seu-servidor.com`
- Backend: `https://seu-servidor.com` (ou porta específica)
- Imagem: `https://seu-servidor.com/uploads/banners/arquivo.jpg`

