const { Client } = require('pg');
require('dotenv').config();

const client = new Client({ connectionString: process.env.DB_CONNECTION_STRING });

async function main() {
  await client.connect();

  // 1. lugar_compra en compras
  const { rows: cols1 } = await client.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'compras' AND column_name = 'lugar_compra'
  `);
  if (cols1.length === 0) {
    await client.query(`ALTER TABLE compras ADD COLUMN lugar_compra TEXT`);
    console.log('✅ compras.lugar_compra agregado');
  } else {
    console.log('⏭  compras.lugar_compra ya existe');
  }

  // 2. insumo_id en inventario
  const { rows: cols2 } = await client.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'inventario' AND column_name = 'insumo_id'
  `);
  if (cols2.length === 0) {
    await client.query(`
      ALTER TABLE inventario
      ADD COLUMN insumo_id UUID REFERENCES insumos(id) ON DELETE SET NULL
    `);
    console.log('✅ inventario.insumo_id agregado');
  } else {
    console.log('⏭  inventario.insumo_id ya existe');
  }

  await client.end();
  console.log('Listo.');
}

main().catch(e => { console.error(e); process.exit(1); });
