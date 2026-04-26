import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const connectionString = process.env.DB_CONNECTION_STRING;

if (!connectionString) {
  console.error('❌ Error: VITE_SUPABASE_URL o DB_CONNECTION_STRING no encontrados en .env');
  process.exit(1);
}

const client = new pg.Client({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    await client.connect();
    console.log('--- Agregando columna insumo_id a la tabla inventario ---');

    // 1. Agregar la columna si no existe
    await client.query(`
      ALTER TABLE inventario 
      ADD COLUMN IF NOT EXISTS insumo_id UUID REFERENCES insumos(id) ON DELETE SET NULL;
    `);
    console.log('✅ Columna insumo_id agregada con éxito.');

    // 2. Notificar a PostgREST para recargar el schema
    await client.query(`NOTIFY pgrst, 'reload schema';`);
    console.log('✅ Notificación enviada a PostgREST para recargar el schema.');

  } catch (err) {
    console.error('❌ Error ejecutando SQL:', err);
  } finally {
    await client.end();
  }
}

run();
