#!/usr/bin/env node
/**
 * Script de setup do Appwrite para o projeto Sportshot
 * 
 * Uso:
 *   node scripts/setup-appwrite.js
 * 
 * Variáveis de ambiente necessárias:
 *   APPWRITE_ENDPOINT   - Ex: https://apw.simplemsg.net.br/v1
 *   APPWRITE_API_KEY    - API Key com escopo: databases.write, users.write
 */

import { Client, Databases, Users, ID, Permission, Role } from 'node-appwrite';

const ENDPOINT = process.env.APPWRITE_ENDPOINT || 'https://apw.simplemsg.net.br/v1';
const API_KEY = process.env.APPWRITE_API_KEY;
const PROJECT_ID = process.env.APPWRITE_PROJECT_ID;

if (!API_KEY || !PROJECT_ID) {
  console.error('❌ APPWRITE_API_KEY e APPWRITE_PROJECT_ID são obrigatórios!');
  console.error('Exemplo: APPWRITE_API_KEY=xxx APPWRITE_PROJECT_ID=yyy node scripts/setup-appwrite.js');
  process.exit(1);
}

const client = new Client()
  .setEndpoint(ENDPOINT)
  .setProject(PROJECT_ID)
  .setKey(API_KEY);

const databases = new Databases(client);
const users = new Users(client);

async function main() {
  console.log('🚀 Iniciando setup do Appwrite para Sportshot...\n');

  // ─── 1. Create Database ────────────────────────────────────────
  console.log('📁 Criando banco de dados...');
  const db = await databases.create('sportshot-db', 'Sportshot DB');
  console.log(`✅ Database criado: ${db.$id}\n`);

  // ─── 2. Create Collection ──────────────────────────────────────
  console.log('📋 Criando collection push_subscribers...');
  const collection = await databases.createCollection(
    db.$id,
    'push_subscribers',
    'push_subscribers',
    [
      // Anyone can create (subscribe)
      Permission.create(Role.any()),
      // Only team:admin can read/update/delete
      Permission.read(Role.team('admin')),
      Permission.update(Role.team('admin')),
      Permission.delete(Role.team('admin')),
    ]
  );
  console.log(`✅ Collection criada: ${collection.$id}\n`);

  // ─── 3. Create Attributes ─────────────────────────────────────
  console.log('🔧 Criando atributos...');

  await databases.createStringAttribute(db.$id, collection.$id, 'endpoint', 2048, true);
  console.log('  ✓ endpoint');

  // Wait for attribute to be ready (Appwrite processes async)
  await new Promise((r) => setTimeout(r, 1500));

  await databases.createStringAttribute(db.$id, collection.$id, 'keys_p256dh', 1024, true);
  console.log('  ✓ keys_p256dh');

  await new Promise((r) => setTimeout(r, 1500));

  await databases.createStringAttribute(db.$id, collection.$id, 'keys_auth', 512, true);
  console.log('  ✓ keys_auth');

  await new Promise((r) => setTimeout(r, 2000));
  console.log('✅ Atributos criados!\n');

  // ─── 4. Create Admin User ─────────────────────────────────────
  console.log('👤 Criando usuário administrador...');
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@sportshot.com.br';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Sportshot@2024!';

  try {
    const adminUser = await users.create(ID.unique(), adminEmail, undefined, adminPassword, 'Admin Sportshot');
    console.log(`✅ Usuário admin criado: ${adminUser.$id}`);
    console.log(`   Email: ${adminEmail}`);
    console.log(`   Senha: ${adminPassword}`);
  } catch (err) {
    if (err.code === 409) {
      console.log('⚠️  Usuário já existe, pulando...');
    } else {
      throw err;
    }
  }

  // ─── Summary ──────────────────────────────────────────────────
  console.log('\n' + '─'.repeat(50));
  console.log('✅ Setup concluído! Anote os IDs abaixo:');
  console.log('─'.repeat(50));
  console.log(`DATABASE_ID=${db.$id}`);
  console.log(`COLLECTION_ID=${collection.$id}`);
  console.log('─'.repeat(50));
  console.log('\n📝 Adicione estes valores no seu .env e nas variáveis da Appwrite Function!');
}

main().catch((err) => {
  console.error('❌ Erro no setup:', err.message);
  process.exit(1);
});
