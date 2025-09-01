# Guia de Correção - Frontend Vercel

## 🚨 Problema Identificado

O frontend está tentando conectar ao `localhost:4000` em vez do backend do Render (`https://app-enigma-backend.onrender.com`).

**Erro observado:**
```
HTTP Request: POST http://localhost:4000/api/auth/verify-user
Refused to connect to 'http://localhost:4000/api/auth/verify-user' because it violates the following Content Security Policy directive
```

## 🔧 Soluções

### 1. Verificar Variáveis de Ambiente no Vercel

Acesse o painel do Vercel e verifique se as seguintes variáveis estão configuradas:

#### Para Next.js:
```
NEXT_PUBLIC_API_BASE=https://app-enigma-backend.onrender.com/
NEXT_PUBLIC_ENVIRONMENT=production
NEXT_PUBLIC_APP_NAME=Enigma Crush
NEXT_PUBLIC_DEBUG=false
```

#### Para Vite/React:
```
VITE_API_BASE=https://app-enigma-backend.onrender.com/
VITE_ENVIRONMENT=production
VITE_APP_NAME=Enigma Crush
VITE_DEBUG=false
```

### 2. Atualizar Content Security Policy

O CSP deve incluir a URL do backend do Render:

```
connect-src 'self' https://app-enigma-backend.onrender.com https://api.emailjs.com https://firestore.googleapis.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://www.googleapis.com https://api.cpfhub.io
```

### 3. Forçar Novo Deploy

Após configurar as variáveis de ambiente:

1. **Via Vercel Dashboard:**
   - Vá para Deployments
   - Clique em "Redeploy" no último deploy
   - Marque "Use existing Build Cache" como false

2. **Via Git:**
   ```bash
   git commit --allow-empty -m "Force redeploy with correct env vars"
   git push
   ```

### 4. Verificar Configuração Local

Se houver arquivo `.env.local` ou `.env.production` no frontend:

```env
# .env.production
NEXT_PUBLIC_API_BASE=https://app-enigma-backend.onrender.com/
NEXT_PUBLIC_ENVIRONMENT=production

# ou para Vite
VITE_API_BASE=https://app-enigma-backend.onrender.com/
VITE_ENVIRONMENT=production
```

## 🧪 Teste de Verificação

Após as correções, teste:

```bash
# Verificar se o frontend carrega
curl -I https://app-enigma-frontend-tif22ff8r-h40040s-projects.vercel.app

# Verificar se não há mais erros de CSP no console do browser
# Abrir DevTools > Console e tentar fazer login
```

## 📋 Checklist de Correção

- [ ] Variáveis de ambiente configuradas no Vercel
- [ ] CSP atualizado para incluir backend do Render
- [ ] Novo deploy forçado
- [ ] Teste de login sem erros de CSP
- [ ] Requisições indo para https://app-enigma-backend.onrender.com

## 🔍 URLs Importantes

- **Frontend Vercel:** https://app-enigma-frontend-tif22ff8r-h40040s-projects.vercel.app
- **Backend Render:** https://app-enigma-backend.onrender.com
- **Health Check:** https://app-enigma-backend.onrender.com/api/health

## 📝 Observações

1. O erro 401 no frontend pode ser normal se não houver autenticação
2. O importante é que as requisições AJAX vão para o Render, não localhost
3. O CORS já está configurado no backend para aceitar o frontend Vercel
4. O backend está funcionando corretamente (testado via curl)