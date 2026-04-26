const { createClient } = require('@supabase/supabase-js');

const supabase = createClient('https://kcfvjorpgucdrbjbfdef.supabase.co', 'sb_publishable_GhLxQe6GmVnoGlp4iwptag_QCkRDVhY');

async function check() {
  const { count } = await supabase.from('recetas_base').select('*', { count: 'exact', head: true });
  console.log(`Recetas base count: ${count}`);
}

check();
