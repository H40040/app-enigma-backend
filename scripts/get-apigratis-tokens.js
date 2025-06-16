// Script para obter BearerToken e DeviceToken da APIGratis e salvar no .env
const fs = require('fs');
const path = require('path');

async function getTokens(email, password) {
  const res = await fetch('https://gateway.apibrasil.io/api/v2/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  if (!res.ok) throw new Error('Falha ao autenticar: ' + res.status);
  const data = await res.json();
  if (!data.BearerToken || !data.DeviceToken) throw new Error('Tokens não encontrados na resposta');
  return { BearerToken: data.BearerToken, DeviceToken: data.DeviceToken };
}

async function main() {
  const email = process.env.APIGRATIS_EMAIL || '';
  const password = process.env.APIGRATIS_PASSWORD || '';
  if (!email || !password) {
    console.error('Defina APIGRATIS_EMAIL e APIGRATIS_PASSWORD no .env antes de rodar este script.');
    process.exit(1);
  }
  try {
    const tokens = await getTokens(email, password);
    const envPath = path.resolve(__dirname, '../.env');
    let envContent = '';
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
      envContent = envContent.replace(/^APIGRATIS_BEARER_TOKEN=.*/m, '').replace(/^APIGRATIS_DEVICE_TOKEN=.*/m, '');
    }
    envContent += `\nAPIGRATIS_BEARER_TOKEN=${tokens.BearerToken}\nAPIGRATIS_DEVICE_TOKEN=${tokens.DeviceToken}\n`;
    fs.writeFileSync(envPath, envContent.trim() + '\n');
    console.log('Tokens salvos no .env com sucesso!');
  } catch (e) {
    console.error('Erro ao obter tokens:', e.message);
    process.exit(1);
  }
}

main();
