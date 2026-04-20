
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkTables() {
  const tables = ['recetas', 'formulas', 'escandallos', 'receta_items'];
  for (const table of tables) {
    const { error } = await supabase.from(table).select('*', { count: 'exact', head: true });
    if (!error) {
      console.log(`Table '${table}' exists.`);
    } else {
       if (error.code === '42P01') {
         console.log(`Table '${table}' does not exist.`);
       } else {
         console.log(`Table '${table}' error:`, error.message);
       }
    }
  }
}

checkTables();
