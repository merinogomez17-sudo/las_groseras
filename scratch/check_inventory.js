
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkInventory() {
  const { data, error } = await supabase.from('inventario').select('nombre, id');
  if (error) {
    console.error('Error fetching inventory:', error);
    return;
  }
  console.log('Existing Inventory Items:', JSON.stringify(data, null, 2));
}

checkInventory();
