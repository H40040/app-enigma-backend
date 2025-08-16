const { createCpfApi } = require('apigratis-sdk-nodejs');

const cpfApi = createCpfApi({
  BearerToken: process.env.APIGRATIS_BEARER_TOKEN
});

function isAtLeast16(birthdate) {
  if (!birthdate) return false;
  const birth = new Date(birthdate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age >= 16;
}

async function validateCPF_ApiGratis(cpf) {
  if (process.env.SKIP_API_VALIDATION === 'true') {
    // Retorna dados fake válidos para desenvolvimento
    return {
      valid: true,
      nome: 'Usuário Dev',
      birthdate: '2000-01-01'
    };
  }
  try {
    const result = await cpfApi.request('/', { cpf });
    if (result && result.status && result.resultado) {
      const nome = result.resultado.nome;
      let birthdate;
      if (result.resultado.data_nascimento) {
        const [day, month, year] = result.resultado.data_nascimento.split("/");
        birthdate = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
      }
      if (!isAtLeast16(birthdate)) {
        return { valid: false, error: 'É necessário ter pelo menos 16 anos para se cadastrar.' };
      }
      return { valid: true, nome, birthdate };
    }
    return { valid: false };
  } catch (e) {
    return { valid: false, error: e.message };
  }
}

module.exports = { validateCPF_ApiGratis };
