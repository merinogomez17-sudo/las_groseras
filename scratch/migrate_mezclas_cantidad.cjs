const { Client } = require('pg');
require('dotenv').config();
const client = new Client({ connectionString: process.env.DB_CONNECTION_STRING });

async function main() {
  await client.connect();

  // Agregar columna cantidad si no existe
  const { rows } = await client.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'insumo_mezclas' AND column_name = 'cantidad'
  `);

  if (rows.length === 0) {
    await client.query(`ALTER TABLE insumo_mezclas ADD COLUMN cantidad NUMERIC NOT NULL DEFAULT 1`);
    console.log('✅ insumo_mezclas.cantidad agregado');
  } else {
    console.log('⏭  cantidad ya existe');
  }

  // Eliminar columna porcentaje
  const { rows: hasPct } = await client.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'insumo_mezclas' AND column_name = 'porcentaje'
  `);
  if (hasPct.length > 0) {
    await client.query(`ALTER TABLE insumo_mezclas DROP COLUMN porcentaje`);
    console.log('✅ insumo_mezclas.porcentaje eliminado');
  } else {
    console.log('⏭  porcentaje ya no existe');
  }

  // Verificar estructura final
  const { rows: cols } = await client.query(`
    SELECT column_name, data_type FROM information_schema.columns
    WHERE table_name = 'insumo_mezclas' ORDER BY ordinal_position
  `);
  console.log('Estructura final:', cols);

  await client.end();
}
main().catch(e => { console.error(e); process.exit(1); });
