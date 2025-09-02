// Servidor de teste simples para verificar se o Render consegue executar Node.js
const express = require('express');
const app = express();
const PORT = process.env.PORT || 4000;

app.get('/', (req, res) => {
  res.json({ 
    message: 'Test server is running!', 
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development'
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'OK', service: 'test-server' });
});

app.listen(PORT, () => {
  console.log(`Test server running on port ${PORT}`);
});