const { createClient } = require('@supabase/supabase-client');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
  const { data, error } = await supabase.from('eventos').select('*').limit(1);
  if (error) {
    console.error(error);
    return;
  }
  console.log(Object.keys(data[0]));
}

check();
