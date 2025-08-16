const { createWhatsAppApi } = require('apigratis-sdk-nodejs');

const whatsappApi = createWhatsAppApi({
  BearerToken: process.env.APIGRATIS_BEARER_TOKEN
});

async function validateWhatsapp_ApiGratis(numero) {
  if (process.env.SKIP_API_VALIDATION === 'true') {
    // Sempre retorna válido para desenvolvimento
    return { valid: true };
  }
  try {
    const result = await whatsappApi.request('/', { numero });
    if (result && result.status && result.resultado && result.resultado.is_whatsapp) {
      return { valid: true };
    }
    return { valid: false };
  } catch (e) {
    return { valid: false, error: e.message };
  }
}

module.exports = { validateWhatsapp_ApiGratis };
