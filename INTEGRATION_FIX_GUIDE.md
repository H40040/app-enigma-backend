# 🚀 Guia de Correção - Integração Frontend/Backend

## ✅ Correções Aplicadas no Backend

### 1. **Variáveis de Ambiente Atualizadas**
- ✅ `FRONTEND_URL=https://app-enigma-frontend.vercel.app`
- ✅ `API_URL=https://enigma-crush-backend-develop.up.railway.app`

### 2. **CORS Configurado**
- ✅ URLs do Vercel adicionadas na configuração CORS
- ✅ Variável de ambiente `process.env.FRONTEND_URL` incluída
- ✅ Backend Railway URL incluída

### 3. **URLs Hardcoded Corrigidas**
- ✅ Upload de arquivos agora usa `API_URL` em vez de localhost
- ✅ Todas as referências a IPs fixos foram substituídas

---

## 🔧 Configurações Necessárias nos Painéis

### **Railway - Backend**

Acesse: [Railway Dashboard](https://railway.app/dashboard) > Seu Projeto > Variables

Adicione estas variáveis de ambiente:

```
FRONTEND_URL=https://app-enigma-frontend.vercel.app
API_URL=https://enigma-crush-backend-develop.up.railway.app
NODE_ENV=production
PORT=4006
DATABASE_URL=postgresql://postgres:VJNvJGgOOOkGNJGJJJJJJJJJJJJJJJJJ@junction.proxy.rlwy.net:54663/railway
JWT_SECRET=your_super_secure_jwt_secret_256_bits_minimum
REFRESH_TOKEN_SECRET=your_super_secure_refresh_token_secret_256_bits
COOKIE_SECRET=your_super_secure_cookie_secret_256_bits
```

### **Vercel - Frontend**

Acesse: [Vercel Dashboard](https://vercel.com/dashboard) > Seu Projeto > Settings > Environment Variables

Adicione estas variáveis de ambiente:

```
NEXT_PUBLIC_API_BASE=https://enigma-crush-backend-develop.up.railway.app
NEXT_PUBLIC_ENVIRONMENT=production
```

---

## 🧪 Testes de Verificação

### **1. Health Check do Backend**
```bash
curl https://enigma-crush-backend-develop.up.railway.app/health
```

**Resposta esperada:**
```json
{
  "status": "ok",
  "message": "Server is healthy",
  "timestamp": "2025-01-XX..."
}
```

### **2. Teste de CORS**
```bash
curl -H "Origin: https://app-enigma-frontend.vercel.app" \
     -H "Access-Control-Request-Method: POST" \
     -X OPTIONS \
     https://enigma-crush-backend-develop.up.railway.app/api/auth/login
```

**Resposta esperada:** Headers CORS presentes

### **3. Teste de Comunicação Frontend-Backend**
1. Abra o frontend: `https://app-enigma-frontend.vercel.app`
2. Abra DevTools > Network
3. Tente fazer login ou qualquer ação que faça request para o backend
4. Verifique se as requests vão para: `https://enigma-crush-backend-develop.up.railway.app`

---

## 📋 Checklist de Verificação

### **Backend (Railway)**
- [ ] Health check funcionando
- [ ] Variáveis de ambiente configuradas
- [ ] CORS permitindo requests do Vercel
- [ ] Database conectado

### **Frontend (Vercel)**
- [ ] Variável `NEXT_PUBLIC_API_BASE` configurada
- [ ] Requests indo para Railway (não localhost)
- [ ] Sem erros de CORS no console

### **Integração**
- [ ] Login funcionando
- [ ] Registro funcionando
- [ ] Outras funcionalidades testadas
- [ ] Upload de arquivos funcionando

---

## 🔍 Possíveis Problemas e Soluções

### **Erro 500 no Backend**
- **Sintomas:** Requests retornam erro 500
- **Solução:** Verificar logs no Railway e corrigir variáveis de ambiente

### **Erro de CORS**
- **Sintomas:** `Access-Control-Allow-Origin` error
- **Solução:** Verificar se `FRONTEND_URL` está correta no Railway

### **Requests ainda indo para localhost**
- **Sintomas:** Network tab mostra requests para `localhost:4000`
- **Solução:** Verificar se `NEXT_PUBLIC_API_BASE` está configurada no Vercel

---

## 🚀 Próximos Passos

1. **Configure as variáveis** nos painéis do Railway e Vercel
2. **Faça deploy** do backend no Railway (se necessário)
3. **Teste a integração** usando os comandos acima
4. **Verifique os logs** se houver erros
5. **Teste funcionalidades completas** no frontend

---

## 📞 Suporte

Se encontrar problemas:
1. Verifique os logs no Railway/Vercel
2. Teste os endpoints individualmente
3. Verifique se todas as variáveis estão configuradas
4. Compare com este guia

**URLs Importantes:**
- Frontend: `https://app-enigma-frontend.vercel.app`
- Backend: `https://enigma-crush-backend-develop.up.railway.app`
- Health Check: `https://enigma-crush-backend-develop.up.railway.app/health`
