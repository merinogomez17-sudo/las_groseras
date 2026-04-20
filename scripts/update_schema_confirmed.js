
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

    // 1. Update Enum (Adding 'pagada')
    // Note: In Postgres, you can't easily add to an enum inside a transaction in some versions/cloud providers
    // But we'll try the ALTER TYPE
    try {
      await client.query("ALTER TYPE quote_status ADD VALUE IF NOT EXISTS 'pagada'");
      console.log('Enum quote_status updated');
    } catch (e) {
      console.log('Note: Enum might already contain pagada or limited permissions.');
    }

    // 2. Create evento_productos table
    await client.query(`
      CREATE TABLE IF NOT EXISTS evento_productos (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          evento_id UUID REFERENCES eventos(id) ON DELETE CASCADE,
          receta_id UUID REFERENCES recetas_base(id) ON DELETE SET NULL,
          cantidad INTEGER DEFAULT 1,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Enable RLS
      ALTER TABLE evento_productos ENABLE ROW LEVEL SECURITY;
      DROP POLICY IF EXISTS "Acceso total evento_productos" ON evento_productos;
      CREATE POLICY "Acceso total evento_productos" ON evento_productos FOR ALL USING (true);
    `);
    
    console.log('Table evento_productos created successfully');
  } catch (err) {
    console.error('Error updating schema:', err);
  } finally {
    await client.end();
  }
}

updateSchema();
