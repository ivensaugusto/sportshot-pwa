/**
 * Deploy da Appwrite Function via API REST (Node.js nativo)
 */
import { readFileSync } from 'fs';

const ENDPOINT = 'https://apw.simplemsg.net.br/v1';
const PROJECT_ID = 'sportshot';
const API_KEY = 'standard_31d416d2a2cd06175d37cef2c548cbb96496957b15523fed2d478af8678542f176450f88bdba6c75e6d4bd48ce8c860a8c0a39f3deb7bc8788bbee582470acdc3e5d38c18960896588fd73e75dba07c6733f59804ff4c610fec34a47b99b9c4c4f90b68a5f67735869da89c49be3aed0acea2885da067282e84397473d06e17e';
const FUNCTION_ID = 'disparar-notificacoes';

async function deploy() {
  console.log('📦 Fazendo upload da função para o Appwrite...');

  const archivePath = './function-deploy.tar.gz';
  const archiveData = readFileSync(archivePath);
  const blob = new Blob([archiveData], { type: 'application/gzip' });

  const formData = new FormData();
  formData.append('code', blob, 'function-deploy.tar.gz');
  formData.append('activate', 'true');
  formData.append('entrypoint', 'src/index.js');
  formData.append('commands', 'npm install');

  const response = await fetch(`${ENDPOINT}/functions/${FUNCTION_ID}/deployments`, {
    method: 'POST',
    headers: {
      'X-Appwrite-Project': PROJECT_ID,
      'X-Appwrite-Key': API_KEY,
    },
    body: formData,
  });

  const text = await response.text();
  let result;
  try {
    result = JSON.parse(text);
  } catch {
    result = { raw: text };
  }

  if (!response.ok) {
    console.error('❌ Deploy falhou:', JSON.stringify(result, null, 2));
    process.exit(1);
  }

  console.log('✅ Deploy iniciado com sucesso!');
  console.log('   Deployment ID:', result.$id);
  console.log('   Status:', result.status);
  console.log('   Entrypoint:', result.entrypoint);
  console.log('\n⏳ Aguarde o build em: https://apw.simplemsg.net.br/console/project-sportshot/functions/disparar-notificacoes');
}

deploy().catch((err) => {
  console.error('❌ Erro:', err.message);
  process.exit(1);
});
