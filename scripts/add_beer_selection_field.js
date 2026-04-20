
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const connectionString = process.env.DB_CONNECTION_STRING;
const client = new pg.Client({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

async function updateSchema() {
  try {
    await client.connect();
    console.log('Connected to DB');

    // Add cervezas_seleccionadas column to eventos table
    await client.query(`
      ALTER TABLE eventos 
      ADD COLUMN IF NOT EXISTS cervezas_seleccionadas JSONB DEFAULT '[]'::jsonb;
    `);
    
    console.log('Column cervezas_seleccionadas added successfully to eventos table');
  } catch (err) {
    console.error('Error updating schema:', err);
  } finally {
    await client.end();
  }
}

updateSchema();
