# Guia de Correção - Erro de Parsing JSON

## 🚨 Problema Identificado

**Erro:** `SyntaxError: Unexpected token " in JSON at position 0`

**Log do Render:**
```
Erro global: SyntaxError: Unexpected token " in JSON at position 0
at JSON.parse (<anonymous>)
at createStrictSyntaxError (/app/node_modules/body-parser/lib/types/json.js:169:10)
...
body: '"b@b.com"',
type: 'entity.parse.failed'
```

## 🔍 Análise do Problema

### Causa Raiz
O frontend está enviando dados como **string com aspas duplas extras** em vez de JSON válido:
- ❌ **Incorreto:** `'"b@b.com"'` (string com aspas)
- ✅ **Correto:** `'{"email":"b@b.com","password":"123456"}'` (JSON válido)

### Possíveis Causas no Frontend

1. **Serialização Dupla:**
   ```javascript
   // ERRO: JSON.stringify aplicado duas vezes
   const data = JSON.stringify(JSON.stringify({email, password}));
   ```

2. **Content-Type Incorreto:**
   ```javascript
   // ERRO: Enviando string como JSON
   fetch('/api/auth/verify-user', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: email // Enviando apenas string em vez de objeto
   });
   ```

3. **Configuração de Axios/Fetch Incorreta:**
   ```javascript
   // ERRO: Configuração que pode causar serialização dupla
   axios.post('/api/auth/verify-user', JSON.stringify(data), {
     headers: { 'Content-Type': 'application/json' }
   });
   ```

## 🛠️ Soluções Implementadas no Backend

### 1. Middleware de Debug
```javascript
// Debug middleware para log do body após parsing
app.use('/api/auth/verify-user', (req, res, next) => {
  console.log('[DEBUG] Parsed body:', JSON.stringify(req.body));
  console.log('[DEBUG] Content-Type:', req.headers['content-type']);
  console.log('[DEBUG] Body type:', typeof req.body);
  next();
});
```

### 2. Parsing Robusto na Rota
```javascript
router.post('/verify-user', async (req, res) => {
  let email, password;
  
  // Tratar diferentes formatos de body
  if (typeof req.body === 'string') {
    try {
      // Se o body é uma string, tentar fazer parse JSON
      const parsed = JSON.parse(req.body);
      email = parsed.email;
      password = parsed.password;
    } catch (e) {
      return res.status(400).json({ error: 'Formato de dados inválido' });
    }
  } else if (typeof req.body === 'object' && req.body !== null) {
    // Body já é um objeto
    email = req.body.email;
    password = req.body.password;
  } else {
    return res.status(400).json({ error: 'Dados não fornecidos' });
  }
  // ... resto da lógica
});
```

## 🔧 Correções Necessárias no Frontend

### 1. Verificar Implementação de Fetch/Axios

**✅ Implementação Correta:**
```javascript
// Fetch correto
const response = await fetch('/api/auth/verify-user', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ email, password }) // JSON.stringify apenas uma vez
});

// Axios correto
const response = await axios.post('/api/auth/verify-user', {
  email,
  password
}, {
  headers: {
    'Content-Type': 'application/json'
  }
});
```

### 2. Verificar Variáveis de Ambiente

Confirmar se `NEXT_PUBLIC_API_BASE` ou `VITE_API_BASE` estão configuradas corretamente:
```bash
# No Vercel Dashboard
NEXT_PUBLIC_API_BASE=https://app-enigma-backend.onrender.com
# ou
VITE_API_BASE=https://app-enigma-backend.onrender.com
```

### 3. Verificar Interceptors/Middleware

Verificar se há interceptors do Axios que possam estar modificando o body:
```javascript
// Verificar se não há interceptors problemáticos
axios.interceptors.request.use((config) => {
  // NÃO fazer JSON.stringify aqui se Content-Type for application/json
  return config;
});
```

## 🧪 Testes de Validação

### 1. Teste Manual com cURL
```bash
# Teste que deve funcionar
curl -X POST https://app-enigma-backend.onrender.com/api/auth/verify-user \
  -H "Content-Type: application/json" \
  -d '{"email":"b@b.com","password":"123456"}'
```

### 2. Verificar Logs do Render
- Acessar Render Dashboard
- Verificar logs em tempo real
- Procurar por `[DEBUG]` para ver como o body está chegando

## 📋 Próximos Passos

1. **Frontend:** Corrigir implementação de requisições HTTP
2. **Variáveis:** Configurar `NEXT_PUBLIC_API_BASE` no Vercel
3. **Deploy:** Forçar novo deploy no Vercel
4. **Teste:** Validar integração completa
5. **Cleanup:** Remover logs de debug após correção

## 🔍 Monitoramento

- Logs de debug implementados no backend
- Middleware robusto para diferentes formatos
- Tratamento de erros melhorado

---

**Status:** Investigação em andamento
**Última atualização:** 02/09/2025
**Próxima ação:** Corrigir implementação no frontend Vercel