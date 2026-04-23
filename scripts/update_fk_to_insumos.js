import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const connectionString = process.env.DB_CONNECTION_STRING;

const client = new pg.Client({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    await client.connect();

    // Limpiar insumos huérfanos
    await client.query(`
      UPDATE receta_componentes 
      SET insumo_id = NULL 
      WHERE insumo_id IS NOT NULL 
      AND insumo_id NOT IN (SELECT id FROM insumos);
    `);

    // Actualizar llave foránea
    await client.query(`
      ALTER TABLE receta_componentes 
      DROP CONSTRAINT IF EXISTS receta_componentes_insumo_id_fkey;
    `);

    await client.query(`
      ALTER TABLE receta_componentes
      ADD CONSTRAINT receta_componentes_insumo_id_fkey
      FOREIGN KEY (insumo_id) REFERENCES insumos(id)
      ON DELETE SET NULL;
    `);

    // Refrescar caché
    await client.query(`NOTIFY pgrst, 'reload schema';`);

    console.log("Llave foránea actualizada para apuntar a 'insumos'.");
  } catch (err) {
    console.error("Error ejecutando SQL:", err);
  } finally {
    await client.end();
  }
}

run();
