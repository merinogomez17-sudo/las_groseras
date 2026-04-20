
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function verify() {
  const { data: recipes, error } = await supabase.from('recetas_base').select(`
    *,
    receta_componentes (count)
  `);
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log(`Verifying: Found ${recipes.length} products.`);
  recipes.forEach(r => {
    console.log(`- ${r.nombre}: ${r.receta_componentes[0].count} ingredients, Total Cost: $${r.costo_total}`);
  });
}

verify();
