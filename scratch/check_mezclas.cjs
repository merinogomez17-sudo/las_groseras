const { Client } = require('pg');
require('dotenv').config();
const client = new Client({ connectionString: process.env.DB_CONNECTION_STRING });
async function main() {
  await client.connect();
  const { rows } = await client.query(`
    SELECT column_name, data_type FROM information_schema.columns
    WHERE table_name = 'insumo_mezclas' ORDER BY ordinal_position
  `);
  console.log('Columnas:', rows);
  const { rows: data } = await client.query(`SELECT * FROM insumo_mezclas LIMIT 5`);
  console.log('Datos:', data);
  await client.end();
}
main().catch(console.error);
