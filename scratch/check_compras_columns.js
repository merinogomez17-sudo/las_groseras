
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkColumns() {
  const { data, error } = await supabase.rpc('get_table_columns', { table_name: 'compras' });
  if (error) {
    // If RPC doesn't exist, try a simple select
    const { data: selectData, error: selectError } = await supabase.from('compras').select('*').limit(1);
    if (selectError) {
      console.error(selectError);
    } else {
      console.log('Columns in compras:', Object.keys(selectData[0] || {}));
    }
  } else {
    console.log(data);
  }
}

checkColumns();
