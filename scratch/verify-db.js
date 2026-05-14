import { Client, Databases, Permission, Role } from 'node-appwrite';

const ENDPOINT = 'https://apw.simplemsg.net.br/v1';
const PROJECT_ID = 'sportshot';
const API_KEY = 'standard_31d416d2a2cd06175d37cef2c548cbb96496957b15523fed2d478af8678542f176450f88bdba6c75e6d4bd48ce8c860a8c0a39f3deb7bc8788bbee582470acdc3e5d38c18960896588fd73e75dba07c6733f59804ff4c610fec34a47b99b9c4c4f90b68a5f67735869da89c49be3aed0acea2885da067282e84397473d06e17e';
const DB_ID = 'sportshot-db';

const client = new Client()
  .setEndpoint(ENDPOINT)
  .setProject(PROJECT_ID)
  .setKey(API_KEY);

const databases = new Databases(client);

async function verifyAndCreate() {
  console.log('🔍 Verificando banco de dados...');
  
  try {
    // 1. Check if notices collection exists
    try {
      await databases.getCollection(DB_ID, 'notices');
      console.log('✅ Coleção "notices" já existe.');
    } catch (err) {
      if (err.code === 404) {
        console.log('➕ Coleção "notices" não encontrada. Criando...');
        await databases.createCollection(DB_ID, 'notices', 'notices', [
          Permission.read(Role.any()),
          Permission.create(Role.team('admin')),
          Permission.update(Role.team('admin')),
          Permission.delete(Role.team('admin')),
        ]);
        console.log('✅ Coleção "notices" criada.');
      } else {
        throw err;
      }
    }

    // 2. Check/Create attributes
    const attributes = [
      { key: 'title', type: 'string', size: 255, required: true },
      { key: 'body', type: 'string', size: 2048, required: true },
      { key: 'url', type: 'string', size: 2048, required: false },
      { key: 'createdAt', type: 'string', size: 64, required: true },
    ];

    const existing = await databases.listAttributes(DB_ID, 'notices');
    const existingKeys = existing.attributes.map(a => a.key);

    for (const attr of attributes) {
      if (!existingKeys.includes(attr.key)) {
        console.log(`➕ Criando atributo: ${attr.key}...`);
        await databases.createStringAttribute(DB_ID, 'notices', attr.key, attr.size, attr.required);
        console.log(`✅ Atributo "${attr.key}" criado.`);
        await new Promise(r => setTimeout(r, 1500)); // Appwrite needs time
      } else {
        console.log(`✅ Atributo "${attr.key}" já existe.`);
      }
    }

    // 3. List documents
    console.log('📄 Listando avisos...');
    const notices = await databases.listDocuments(DB_ID, 'notices');
    console.log(`✅ Total de avisos encontrados: ${notices.total}`);
    notices.documents.forEach(doc => {
      console.log(` - [${doc.createdAt}] ${doc.title}`);
    });

    console.log('\n🚀 Tudo pronto! Agora as mensagens devem ser salvas corretamente.');
  } catch (err) {
    console.error('❌ Erro durante a verificação:', err.message);
  }
}

verifyAndCreate();
