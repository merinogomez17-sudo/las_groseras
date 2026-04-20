
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const connectionString = process.env.DB_CONNECTION_STRING;
const client = new pg.Client({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

async function fix() {
  try {
    await client.connect();
    await client.query(`
      DROP POLICY IF EXISTS "Acceso total recetas" ON recetas_base;
      CREATE POLICY "Acceso total recetas" ON recetas_base FOR ALL USING (true);
      
      DROP POLICY IF EXISTS "Acceso total componentes" ON receta_componentes;
      CREATE POLICY "Acceso total componentes" ON receta_componentes FOR ALL USING (true);
    `);
    console.log('RLS for recipes fixed to allow public access (true)');
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

fix();
