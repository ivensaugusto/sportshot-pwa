import { Client, Databases, Storage, Permission, Role } from 'node-appwrite';
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
    console.error('Usage: APPWRITE_API_KEY="your-key" node scratch/update-schema-image.js');
    process.exit(1);
  }

  const client = new Client()
    .setEndpoint(ENDPOINT)
    .setProject(PROJECT_ID)
    .setKey(API_KEY);

  const databases = new Databases(client);
  const storage = new Storage(client);

  console.log('🚀 Checking collection notices for the "image" attribute...');

  try {
    // Try to create the image attribute
    console.log('🔧 Adding "image" attribute to notices collection...');
    await databases.createStringAttribute(DB_ID, 'notices', 'image', 2048, false);
    console.log('✅ "image" attribute created successfully (Appwrite might take a minute to process and make it active).');
  } catch (err) {
    if (err.code === 409) {
      console.log('⚠️ "image" attribute already exists in notices collection.');
    } else {
      console.error('❌ Error creating "image" attribute:', err.message);
    }
  }

  console.log('🚀 Checking Storage Bucket for notice images...');
  try {
    console.log('🔧 Creating Storage Bucket "notices-images"...');
    await storage.createBucket(
      'notices-images',
      'Notices Images',
      [
        Permission.read(Role.any()),
        Permission.create(Role.any()),
        Permission.update(Role.any()),
        Permission.delete(Role.any()),
      ],
      false
    );
    console.log('✅ Bucket "notices-images" created successfully with public permissions.');
  } catch (err) {
    if (err.code === 409) {
      console.log('⚠️ Bucket "notices-images" already exists.');
    } else {
      console.error('❌ Error creating bucket:', err.message);
    }
  }

  console.log('\n✨ Database and Storage schema update finished.');
}

updateSchema();
