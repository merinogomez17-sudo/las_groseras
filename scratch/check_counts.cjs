const { createClient } = require('@supabase/supabase-js');

const supabase = createClient('https://kcfvjorpgucdrbjbfdef.supabase.co', 'sb_publishable_GhLxQe6GmVnoGlp4iwptag_QCkRDVhY');

async function check() {
  const { count: insumosCount } = await supabase.from('insumos').select('*', { count: 'exact', head: true });
  const { count: inventarioCount } = await supabase.from('inventario').select('*', { count: 'exact', head: true });
  
  console.log(`Insumos count: ${insumosCount}`);
  console.log(`Inventario count: ${inventarioCount}`);

  if (inventarioCount > 0) {
    const { data } = await supabase.from('inventario').select('*').limit(5);
    console.log("Inventario sample:", data);
  }
}

check();
