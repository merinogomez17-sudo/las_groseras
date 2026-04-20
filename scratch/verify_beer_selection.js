
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyBeerSelection() {
  console.log('--- Verifying Beer Selection Field ---');
  
  try {
    // 1. Get a sample event
    const { data: event, error: fetchError } = await supabase
      .from('eventos')
      .select('id, nombre_evento')
      .limit(1)
      .single();

    if (fetchError || !event) {
      console.log('No events found to test with.');
      return;
    }

    console.log(`Testing with event: ${event.nombre_evento} (${event.id})`);

    // 2. Update with sample beers
    const sampleBeers = ['Victoria', 'Modelo Especial'];
    const { error: updateError } = await supabase
      .from('eventos')
      .update({ cervezas_seleccionadas: sampleBeers })
      .eq('id', event.id);

    if (updateError) throw updateError;
    console.log('Update successful');

    // 3. Read back
    const { data: updatedEvent, error: readError } = await supabase
      .from('eventos')
      .select('cervezas_seleccionadas')
      .eq('id', event.id)
      .single();

    if (readError) throw readError;
    console.log('Read back:', updatedEvent.cervezas_seleccionadas);

    if (JSON.stringify(updatedEvent.cervezas_seleccionadas) === JSON.stringify(sampleBeers)) {
      console.log('✅ Verification PASSED: Beer selection saved and retrieved correctly.');
    } else {
      console.log('❌ Verification FAILED: Data mismatch.');
    }

  } catch (err) {
    console.error('❌ Error during verification:', err.message);
  }
}

verifyBeerSelection();
