const { Client } = require('pg');
require('dotenv').config();

async function updateSchema() {
  const client = new Client({
    connectionString: process.env.DB_CONNECTION_STRING,
  });

  try {
    await client.connect();
    console.log('--- Actualizando Schema de Inventario ---');
    
    // Añadir columna piezas_por_unidad
    await client.query(`
      ALTER TABLE inventario 
      ADD COLUMN IF NOT EXISTS piezas_por_unidad INTEGER DEFAULT 1;
      
      -- Si queremos ser súper técnicos, podemos renombrar precio_unitario a precio_presentacion
      -- pero para no romper el código existente de golpe, sólo nos aseguramos de que piezas_por_unidad exista.
      -- En el frontend manejaremos la lógica de cálculo.
    `);
    
    console.log('✅ Columna piezas_por_unidad añadida con éxito.');
  } catch (err) {
    console.error('❌ Error al actualizar schema:', err.message);
  } finally {
    await client.end();
  }
}

updateSchema();
