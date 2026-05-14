import { Client, Databases } from 'node-appwrite';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from root
dotenv.config({ path: path.join(__dirname, '../.env') });

const ENDPOINT = process.env.VITE_APPWRITE_ENDPOINT || 'https://apw.simplemsg.net.br/v1';
const PROJECT_ID = process.env.VITE_APPWRITE_PROJECT_ID;
const API_KEY = process.env.APPWRITE_API_KEY; // Needs to be provided in environment
const DB_ID = process.env.VITE_APPWRITE_DATABASE_ID || 'sportshot-db';

async function updateSchema() {
  if (!API_KEY) {
    console.error('❌ APPWRITE_API_KEY is missing in environment variables!');
    process.exit(1);
  }

  const client = new Client()
    .setEndpoint(ENDPOINT)
    .setProject(PROJECT_ID)
    .setKey(API_KEY);

  const databases = new Databases(client);

  console.log('🚀 Checking collection notices...');

  try {
    // 1. Try to create the sender attribute
    console.log('🔧 Adding "sender" attribute...');
    await databases.createStringAttribute(DB_ID, 'notices', 'sender', 255, false);
    console.log('✅ "sender" attribute created (it might take a moment to be active).');
  } catch (err) {
    if (err.code === 409) {
      console.log('⚠️ "sender" attribute already exists.');
    } else {
      console.error('❌ Error creating attribute:', err.message);
    }
  }

  // 2. Verify other attributes
  const attributes = ['title', 'body', 'url', 'createdAt'];
  for (const attr of attributes) {
    try {
      await databases.getAttribute(DB_ID, 'notices', attr);
      console.log(`✅ Attribute "${attr}" exists.`);
    } catch (err) {
      console.error(`❌ Attribute "${attr}" is missing or error:`, err.message);
    }
  }

  console.log('\n✨ Schema update finished.');
}

updateSchema();
