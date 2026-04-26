const { createClient } = require('@supabase/supabase-js');

const supabase = createClient('https://kcfvjorpgucdrbjbfdef.supabase.co', 'sb_publishable_GhLxQe6GmVnoGlp4iwptag_QCkRDVhY');

async function check() {
  console.log("--- INSUMOS (first 3) ---");
  const { data: insumos } = await supabase.from('insumos').select('id, marca, tipo_insumo').limit(3);
  console.log(insumos);

  console.log("\n--- INVENTARIO (first 3) ---");
  const { data: inventario } = await supabase.from('inventario').select('id, nombre, cantidad_actual').limit(3);
  console.log(inventario);

  console.log("\n--- RECETA_COMPONENTES (first 3 with insumo_id) ---");
  const { data: comps } = await supabase.from('receta_componentes').select('insumo_id, cantidad').not('insumo_id', 'is', null).limit(3);
  console.log(comps);

  if (comps && comps.length > 0 && inventario) {
    const match = inventario.find(i => i.id === comps[0].insumo_id);
    console.log(`\nMatch check for ${comps[0].insumo_id}: ${match ? 'FOUND' : 'NOT FOUND'}`);
  }
}

check();
