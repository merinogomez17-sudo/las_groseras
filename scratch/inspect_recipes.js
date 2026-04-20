
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function inspectRecipes() {
  const { data: recipes, error: rError } = await supabase.from('recetas').select('*').limit(5);
  const { data: items, error: iError } = await supabase.from('receta_items').select('*').limit(5);
  
  if (rError || iError) {
    console.error('Error inspecting:', rError || iError);
    return;
  }
  
  console.log('Sample Recipes:', JSON.stringify(recipes, null, 2));
  console.log('Sample Recipe Items:', JSON.stringify(items, null, 2));
}

inspectRecipes();
