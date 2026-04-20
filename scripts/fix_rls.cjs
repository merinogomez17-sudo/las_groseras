const { Client } = require('pg');
require('dotenv').config();

async function fixRLS() {
  console.log('--- Corrigiendo políticas RLS para modo desarrollo ---');
  
  const client = new Client({
    connectionString: process.env.DB_CONNECTION_STRING,
  });

  try {
    await client.connect();
    
    await client.query(`
      -- Permitir que usuarios no autenticados puedan insertar leads (Formulario Público)
      DROP POLICY IF EXISTS "Permitir inserción pública de leads" ON leads;
      CREATE POLICY "Permitir inserción pública de leads" ON leads FOR INSERT WITH CHECK (true);

      -- Abrir acceso total para modo desarrollo (sin login implementado aún)
      DROP POLICY IF EXISTS "Acceso total anon temporal" ON inventario;
      CREATE POLICY "Acceso total anon temporal" ON inventario FOR ALL USING (true);

      DROP POLICY IF EXISTS "Acceso total anon temporal" ON clientes;
      CREATE POLICY "Acceso total anon temporal" ON clientes FOR ALL USING (true);

      DROP POLICY IF EXISTS "Acceso total anon temporal" ON leads;
      CREATE POLICY "Acceso total anon temporal" ON leads FOR ALL USING (true);

      DROP POLICY IF EXISTS "Acceso total anon temporal" ON cotizaciones;
      CREATE POLICY "Acceso total anon temporal" ON cotizaciones FOR ALL USING (true);

      DROP POLICY IF EXISTS "Acceso total anon temporal" ON eventos;
      CREATE POLICY "Acceso total anon temporal" ON eventos FOR ALL USING (true);
    `);
    
    console.log('✅ Políticas RLS actualizadas con éxito.');
  } catch (err) {
    console.error('❌ Error al actualizar RLS:', err.message);
  } finally {
    await client.end();
  }
}

fixRLS();
