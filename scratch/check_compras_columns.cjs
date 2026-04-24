
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkColumns() {
  const { data: selectData, error: selectError } = await supabase.from('compras').select('*, insumos(*)').limit(1);
  if (selectError) {
    console.error(selectError);
  } else {
    console.log('Sample row in compras:', JSON.stringify(selectData[0], null, 2));
  }
}

checkColumns();
