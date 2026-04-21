
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkSchema() {
  const { data, error } = await supabase
    .from('eventos')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Error fetching event sample:', error);
    return;
  }

  if (data && data.length > 0) {
    console.log('Columns in eventos table:', Object.keys(data[0]));
    console.log('Sample data:', data[0]);
  } else {
    console.log('No data in eventos table.');
  }

  // Also check if there's a specific field like selection_locked or similar
}

checkSchema();
