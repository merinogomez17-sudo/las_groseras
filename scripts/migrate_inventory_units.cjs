const { Client } = require('pg');
require('dotenv').config();

async function migrateUnits() {
  const client = new Client({
    connectionString: process.env.DB_CONNECTION_STRING,
  });

  try {
    await client.connect();
    console.log('--- Iniciando Migración Descriptiva de Unidades ---');
    
    const { rows: items } = await client.query('SELECT id, nombre, unidad FROM inventario');
    
    let count = 0;
    for (const item of items) {
      let multiplier = 1;
      const combined = `${item.nombre} ${item.unidad}`.toLowerCase();
      
      if (combined.includes('six')) multiplier = 6;
      else if (combined.includes('24 de')) multiplier = 24;
      else if (combined.includes('24 pz')) multiplier = 24;
      else if (combined.includes('24 botellas')) multiplier = 24;
      else if (combined.includes('12 piezas')) multiplier = 12;
      else if (combined.includes('12 botellas')) multiplier = 12;
      else if (combined.includes('50 pz')) multiplier = 50;
      else if (combined.includes('50 piezas')) multiplier = 50;
      else if (combined.includes('4 latones')) multiplier = 4;
      else if (combined.includes('4 botellas')) multiplier = 4;
      else if (combined.includes('2 botes')) multiplier = 2;
      else if (combined.includes('3 piezas')) multiplier = 3;
      else if (combined.includes('25 piezas')) multiplier = 25;
      
      if (multiplier > 1) {
        await client.query('UPDATE inventario SET piezas_por_unidad = $1 WHERE id = $2', [multiplier, item.id]);
        console.log(`[MIGRADO] ${item.nombre}: ${multiplier} unidades`);
        count++;
      }
    }
    
    console.log(`✅ Migración completada. Se actualizaron ${count} registros.`);
  } catch (err) {
    console.error('❌ Error en la migración:', err.message);
  } finally {
    await client.end();
  }
}

migrateUnits();
