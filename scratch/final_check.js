
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function finalCheck() {
  const { data, error } = await supabase.from('recetas').select('*').limit(1);
  console.log('Recetas check:', { data, error });
  
  const { data: data2, error: error2 } = await supabase.from('receta_items').select('*').limit(1);
  console.log('Receta_items check:', { data: data2, error: error2 });
}

finalCheck();
