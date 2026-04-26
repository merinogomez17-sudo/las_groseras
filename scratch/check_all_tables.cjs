const { createClient } = require('@supabase/supabase-js');

const supabase = createClient('https://kcfvjorpgucdrbjbfdef.supabase.co', 'sb_publishable_GhLxQe6GmVnoGlp4iwptag_QCkRDVhY');

async function check() {
  // Querying pg_catalog via rpc or just common tables
  const tables = ['eventos', 'clientes', 'cotizaciones', 'recetas_base', 'receta_componentes', 'insumos', 'inventario', 'compras', 'movimientos_inventario'];
  for (const t of tables) {
    const { count, error } = await supabase.from(t).select('*', { count: 'exact', head: true });
    console.log(`${t}: ${error ? 'ERROR: ' + error.message : count}`);
  }
}

check();
