
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const connectionString = process.env.DB_CONNECTION_STRING;
const client = new pg.Client({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

async function verify() {
  try {
    await client.connect();
    const { rows: recipes } = await client.query('SELECT count(*) FROM recetas_base');
    const { rows: components } = await client.query('SELECT count(*) FROM receta_componentes');
    console.log(`Verified via PG: ${recipes[0].count} products and ${components[0].count} ingredients found.`);
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

verify();
