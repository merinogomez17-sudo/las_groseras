
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkVisibility() {
  const { data, error } = await supabase.from('recetas_base').select('count', { count: 'exact' });
  console.log('Visibility check:', { data, error });
}

checkVisibility();
