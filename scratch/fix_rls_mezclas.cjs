const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres:MerinoTrueba17@db.kcfvjorpgucdrbjbfdef.supabase.co:5432/postgres' });

async function main() {
  await client.connect();
  await client.query(`DROP POLICY IF EXISTS "Acceso total para usuarios autenticados" ON insumo_mezclas`);
  console.log('Policy vieja eliminada. Solo queda public_full_access_insumo_mezclas');
  await client.end();
}
main().catch(console.error);
