const { createClient } = require('@supabase/supabase-js');

const supabase = createClient('https://kcfvjorpgucdrbjbfdef.supabase.co', 'sb_publishable_GhLxQe6GmVnoGlp4iwptag_QCkRDVhY');

async function check() {
  const { data: inv } = await supabase.from('inventario').select('*').limit(1);
  if (inv && inv.length > 0) {
    console.log("Inventario columns:", Object.keys(inv[0]));
  } else {
    // If empty, try to get columns via a different way if possible, or just look at the code.
    console.log("Inventario is empty.");
  }
  
  const { data: ins } = await supabase.from('insumos').select('*').limit(1);
  console.log("Insumos columns:", Object.keys(ins[0]));
}

check();
