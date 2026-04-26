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
    console.log('--- Creando tabla insumo_mezclas ---');

    await client.query(`
      CREATE TABLE IF NOT EXISTS public.insumo_mezclas (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        nombre_generico TEXT NOT NULL,
        insumo_id UUID NOT NULL REFERENCES public.insumos(id) ON DELETE CASCADE,
        porcentaje NUMERIC(5,2) NOT NULL CHECK (porcentaje > 0 AND porcentaje <= 100),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_insumo_mezclas_nombre ON public.insumo_mezclas(nombre_generico);

      COMMENT ON TABLE public.insumo_mezclas IS 
      'Define cómo se desglosa un ingrediente genérico en marcas específicas con sus proporciones';
    `);

    // Habilitar RLS
    await client.query(`
      ALTER TABLE insumo_mezclas ENABLE ROW LEVEL SECURITY;
      DROP POLICY IF EXISTS "Acceso total para usuarios autenticados" ON insumo_mezclas;
      CREATE POLICY "Acceso total para usuarios autenticados" ON insumo_mezclas FOR ALL USING (auth.role() = 'authenticated');
    `);

    // Notificar PostgREST
    await client.query(`NOTIFY pgrst, 'reload schema';`);

    console.log('✅ Tabla insumo_mezclas creada con éxito.');
  } catch (err) {
    console.error('❌ Error:', err);
  } finally {
    await client.end();
  }
}

run();
