
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const connectionString = process.env.DB_CONNECTION_STRING;
const client = new pg.Client({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

const recipesData = [
  { tipo: "Basica", producto: "Michelada clasica", insumo: "Cerveza", cantidad: 800, unidad: "Ml", costo: 38.40 },
  { tipo: "Basica", producto: "Michelada clasica", insumo: "Indirectos (limon y sal)", cantidad: 1, unidad: "ML/GR", costo: 3.00 },
  { tipo: "Basica", producto: "Michelada clasica", insumo: "Vaso", cantidad: 1, unidad: "Pieza", costo: 1.92 },
  { tipo: "Basica", producto: "Michelada cubana - Salsas negras separadas", insumo: "Cerveza", cantidad: 750, unidad: "Ml", costo: 36.00 },
  { tipo: "Basica", producto: "Michelada cubana - Salsas negras separadas", insumo: "Maggi", cantidad: 7, unidad: "Ml", costo: 3.08 },
  { tipo: "Basica", producto: "Michelada cubana - Salsas negras separadas", insumo: "Inglesa", cantidad: 7, unidad: "Ml", costo: 1.12 },
  { tipo: "Basica", producto: "Michelada cubana - Salsas negras separadas", insumo: "Tabasco", cantidad: 2, unidad: "ML", costo: 1.46 },
  { tipo: "Basica", producto: "Michelada cubana - Salsas negras separadas", insumo: "Indirectos", cantidad: 1, unidad: "ML/GR", costo: 3.00 },
  { tipo: "Basica", producto: "Michelada cubana - Salsas negras separadas", insumo: "Vaso", cantidad: 1, unidad: "Pieza", costo: 1.92 },
  { tipo: "Basica", producto: "Michelada cubana - Salsa negra preparada", insumo: "Cerveza", cantidad: 750, unidad: "Ml", costo: 36.00 },
  { tipo: "Basica", producto: "Michelada cubana - Salsa negra preparada", insumo: "Petroleo", cantidad: 30, unidad: "ML", costo: 8.48 },
  { tipo: "Basica", producto: "Michelada cubana - Salsa negra preparada", insumo: "Indirectos (escarche, hielo, 2 cdas de sal, 2 cdas salsa picante, 1 oz limon)", cantidad: 1, unidad: "ML/GR", costo: 6.00 },
  { tipo: "Basica", producto: "Michelada cubana - Salsa negra preparada", insumo: "Vaso", cantidad: 1, unidad: "Pieza", costo: 1.92 },
  { tipo: "Basica", producto: "Clamachela", insumo: "Cerveza", cantidad: 650, unidad: "ML", costo: 31.20 },
  { tipo: "Basica", producto: "Clamachela", insumo: "Clamato", cantidad: 180, unidad: "ML", costo: 6.30 },
  { tipo: "Basica", producto: "Clamachela", insumo: "Petroleo", cantidad: 30, unidad: "ML", costo: 3.90 },
  { tipo: "Basica", producto: "Clamachela", insumo: "Indirectos (escarche, hielo, 2 cdas de sal, 2 cdas salsa picante, 1 oz limon)", cantidad: 1, unidad: "ML/GR", costo: 6.00 },
  { tipo: "Basica", producto: "Clamachela", insumo: "Vaso", cantidad: 1, unidad: "Pieza", costo: 1.92 },
  { tipo: "Cerveza con sabor", producto: "Cerveza especial de sabor - general", insumo: "Cerveza", cantidad: 600, unidad: "ML", costo: 28.80 },
  { tipo: "Cerveza con sabor", producto: "Cerveza especial de sabor - general", insumo: "Pulpa liquida", cantidad: 100, unidad: "ML", costo: 9.00 },
  { tipo: "Cerveza con sabor", producto: "Cerveza especial de sabor - general", insumo: "Pulpa escarchado", cantidad: 10, unidad: "GR", costo: 1.00 },
  { tipo: "Cerveza con sabor", producto: "Cerveza especial de sabor - general", insumo: "Dulce", cantidad: 0.8, unidad: "GR", costo: 0.26 },
  { tipo: "Cerveza con sabor", producto: "Cerveza especial de sabor - general", insumo: "Indirectos", cantidad: 1, unidad: "ML/GR", costo: 3.00 },
  { tipo: "Cerveza con sabor", producto: "Cerveza especial de sabor - general", insumo: "Vaso", cantidad: 1, unidad: "Pieza", costo: 1.92 },
  { tipo: "Bebida especial", producto: "Mamadamango", insumo: "Alcohol - Bacardi Mango", cantidad: 90, unidad: "ML", costo: 39.94 },
  { tipo: "Bebida especial", producto: "Mamadamango", insumo: "Jarabe mango", cantidad: 30, unidad: "ML", costo: 2.44 },
  { tipo: "Bebida especial", producto: "Mamadamango", insumo: "Agua mineral", cantidad: 450, unidad: "ML", costo: 3.75 },
  { tipo: "Bebida especial", producto: "Mamadamango", insumo: "Sprite", cantidad: 200, unidad: "ML", costo: 6.00 },
  { tipo: "Bebida especial", producto: "Mamadamango", insumo: "Vaso", cantidad: 1, unidad: "Pieza", costo: 1.92 },
  { tipo: "Bebida especial", producto: "Huerfana - Vodka", insumo: "Vaso", cantidad: 1, unidad: "Pieza", costo: 1.92 },
  { tipo: "Bebida especial", producto: "Huerfana - Vodka", insumo: "Alcohol - Vodka", cantidad: 60, unidad: "ML", costo: 26.63 },
  { tipo: "Bebida especial", producto: "Huerfana - Vodka", insumo: "Jarabe tamarindo", cantidad: 60, unidad: "ML", costo: 4.60 },
  { tipo: "Bebida especial", producto: "Huerfana - Vodka", insumo: "Mineral", cantidad: 330, unidad: "ML", costo: 15.84 },
  { tipo: "Bebida especial", producto: "Pinche toro", insumo: "Bacardi Limon", cantidad: 60, unidad: "ML", costo: 19.12 },
  { tipo: "Bebida especial", producto: "Pinche toro", insumo: "Jarabe natural", cantidad: 60, unidad: "ML", costo: 5.10 },
  { tipo: "Bebida especial", producto: "Pinche toro", insumo: "Limon", cantidad: 45, unidad: "ML", costo: 1.22 },
  { tipo: "Bebida especial", producto: "Pinche toro", insumo: "Vaso", cantidad: 1, unidad: "Pieza", costo: 1.92 },
  { tipo: "Bebida especial", producto: "Pinche toro", insumo: "Coronita", cantidad: 210, unidad: "ml", costo: 9.96 },
  { tipo: "Cerveza especial", producto: "Cabrona", insumo: "Vaso", cantidad: 1, unidad: "Pieza", costo: 1.92 },
  { tipo: "Cerveza especial", producto: "Cabrona", insumo: "Cerveza", cantidad: 650, unidad: "ML", costo: 31.20 },
  { tipo: "Cerveza especial", producto: "Cabrona", insumo: "Tequila Gran Malo", cantidad: 60, unidad: "ML", costo: 27.12 },
  { tipo: "Cerveza especial", producto: "Cabrona", insumo: "Limon", cantidad: 60, unidad: "ML", costo: 1.62 },
  { tipo: "Cerveza especial", producto: "Mamona", insumo: "Cerveza", cantidad: 650, unidad: "ML", costo: 31.20 },
  { tipo: "Cerveza especial", producto: "Mamona", insumo: "Clamato", cantidad: 60, unidad: "ML", costo: 2.10 },
  { tipo: "Cerveza especial", producto: "Mamona", insumo: "Salsas negras", cantidad: 1, unidad: "ML", costo: 0.13 },
  { tipo: "Cerveza especial", producto: "Mamona", insumo: "Vodka tamarindo", cantidad: 60, unidad: "ML", costo: 19.33 },
  { tipo: "Cerveza especial", producto: "Mamona", insumo: "Vaso", cantidad: 1, unidad: "Pieza", costo: 1.92 },
  { tipo: "Cerveza especial", producto: "Chingona", insumo: "Vaso", cantidad: 1, unidad: "Pieza", costo: 1.92 },
  { tipo: "Cerveza especial", producto: "Chingona", insumo: "Cerveza", cantidad: 700, unidad: "ML", costo: 33.60 },
  { tipo: "Cerveza especial", producto: "Chingona", insumo: "Alcohol -Mezcal", cantidad: 75, unidad: "ML", costo: 40.00 },
  { tipo: "Bebida especial", producto: "Huerfana - Mezcal", insumo: "Alcohol -Mezcal", cantidad: 60, unidad: "ML", costo: 32.00 },
  { tipo: "Bebida especial", producto: "Huerfana - Mezcal", insumo: "Jarabe tamarindo", cantidad: 60, unidad: "ML", costo: 4.60 },
  { tipo: "Bebida especial", producto: "Huerfana - Mezcal", insumo: "Mineral", cantidad: 330, unidad: "ML", costo: 15.84 },
  { tipo: "Bebida especial", producto: "Huerfana - Mezcal", insumo: "Vaso", cantidad: 1, unidad: "Pieza", costo: 1.92 },
  { tipo: "Bebida especial", producto: "Pinche azul", insumo: "Vaso", cantidad: 1, unidad: "Pieza", costo: 1.92 },
  { tipo: "Bebida especial", producto: "Pinche azul", insumo: "Vodka", cantidad: 60, unidad: "ML", costo: 18.35 },
  { tipo: "Bebida especial", producto: "Pinche azul", insumo: "Curazao", cantidad: 60, unidad: "ML", costo: 12.54 },
  { tipo: "Bebida especial", producto: "Pinche azul", insumo: "Sprite", cantidad: 595, unidad: "ML", costo: 7.64 },
  { tipo: "Bebida especial", producto: "Pinche azul", insumo: "Boost", cantidad: 235, unidad: "ML", costo: 19.18 },
  { tipo: "Bebida especial", producto: "Bichota", insumo: "Vaso", cantidad: 1, unidad: "Pieza", costo: 1.92 },
  { tipo: "Bebida especial", producto: "Bichota", insumo: "Bacardi raspberry", cantidad: 60, unidad: "ML", costo: 22.50 },
  { tipo: "Bebida especial", producto: "Bichota", insumo: "Vino Rosado", cantidad: 60, unidad: "ML", costo: 10.03 },
  { tipo: "Bebida especial", producto: "Bichota", insumo: "Refresco fresa-kiwi", cantidad: 530, unidad: "ML", costo: 6.89 },
  { tipo: "Bebida especial", producto: "Bichota", insumo: "Agua mineral", cantidad: 300, unidad: "ML", costo: 2.50 },
  { tipo: "Bebida especial", producto: "Huerfana - Mezcal", insumo: "Refresco Toronjalimon", cantidad: 500, unidad: "ML", costo: 6.00 },
  { tipo: "Bebida especial", producto: "Huerfana - Vodka", insumo: "Refresco Toronjalimon", cantidad: 500, unidad: "ML", costo: 6.00 },
  { tipo: "Bebida especial", producto: "Mamadamango", insumo: "Mango congelado", cantidad: 5, unidad: "GR", costo: 0.50 },
  { tipo: "Bebida especial", producto: "Mamadamango", insumo: "Boing de mango", cantidad: 60, unidad: "ML", costo: 1.92 },
  { tipo: "Cerveza especial", producto: "Chingona", insumo: "Indirectos", cantidad: 1, unidad: "GR/ML", costo: 5.00 },
  { tipo: "Cerveza con sabor", producto: "Chamoy", insumo: "Cerveza", cantidad: 700, unidad: "ML", costo: 33.60 },
  { tipo: "Cerveza con sabor", producto: "Chamoy", insumo: "Petroleo", cantidad: 15, unidad: "ML", costo: 4.20 },
  { tipo: "Cerveza con sabor", producto: "Chamoy", insumo: "Insumo secreto: Piedroso - escarche", cantidad: 3, unidad: "GR", costo: 0.93 },
  { tipo: "Cerveza con sabor", producto: "Chamoy", insumo: "Indirectos (2 cdas. De sal y hielo)", cantidad: 1, unidad: "ML/GR", costo: 3.00 },
  { tipo: "Cerveza con sabor", producto: "Chamoy", insumo: "Vaso", cantidad: 1, unidad: "Pieza", costo: 1.92 },
  { tipo: "Cerveza con sabor", producto: "Chamoy", insumo: "Miguelito en polvo", cantidad: 40, unidad: "gr", costo: 2.60 },
  { tipo: "Cerveza con sabor", producto: "Chamoy", insumo: "Chamoy Forritos", cantidad: 30, unidad: "ML", costo: 2.75 },
  { tipo: "Cerveza con sabor", producto: "Cerveza Mango", insumo: "Cerveza", cantidad: 700, unidad: "ML", costo: 33.60 },
  { tipo: "Cerveza con sabor", producto: "Cerveza Mango", insumo: "Insumo secreto: Mangazo - escarche", cantidad: 3, unidad: "GR", costo: 0.38 },
  { tipo: "Cerveza con sabor", producto: "Cerveza Mango", insumo: "Indirectos (0.5 oz limon, hielo, 1 cda de sal)", cantidad: 1, unidad: "ML/GR", costo: 4.00 },
  { tipo: "Cerveza con sabor", producto: "Cerveza Mango", insumo: "Jarabe de mango Frutimich", cantidad: 75, unidad: "ML", costo: 6.11 },
  { tipo: "Cerveza especial", producto: "Chingona", insumo: "Tajin y Sal - Escarche", cantidad: 2, unidad: "GR", costo: 0.32 },
  { tipo: "Bebida especial", producto: "Mamadamango", insumo: "Insumo secreto: mamadamango - escarche", cantidad: 3, unidad: "gr", costo: 0.27 },
  { tipo: "Basica", producto: "Clamachela", insumo: "Caldo de carne", cantidad: 15, unidad: "ML", costo: 1.50 },
  { tipo: "Basica", producto: "Michelada cubana - Salsa negra preparada", insumo: "Caldo de carne", cantidad: 15, unidad: "ML", costo: 1.50 }
];

async function seed() {
  try {
    await client.connect();
    console.log('Connected to DB via pg');

    const { rows: inventory } = await client.query('SELECT id, nombre FROM inventario');
    
    const findInsumo = (name) => {
      const n = name.toLowerCase();
      if (n.includes('cerveza')) return inventory.find(i => i.nombre.toLowerCase().includes('modelo'))?.id;
      if (n.includes('vaso')) return inventory.find(i => i.nombre.toLowerCase().includes('vaso'))?.id;
      if (n.includes('clamato')) return inventory.find(i => i.nombre.toLowerCase().includes('clamato'))?.id;
      if (n.includes('maggi')) return inventory.find(i => i.nombre.toLowerCase().includes('maggi'))?.id;
      if (n.includes('inglesa')) return inventory.find(i => i.nombre.toLowerCase().includes('inglesa'))?.id;
      if (n.includes('tabasco')) return inventory.find(i => i.nombre.toLowerCase().includes('tabasco'))?.id;
      if (n.includes('bacardi mango')) return inventory.find(i => i.nombre.toLowerCase().includes('bacardi mango'))?.id;
      if (n.includes('jarabe mango')) return inventory.find(i => i.nombre.toLowerCase().includes('jarabe mango'))?.id;
      if (n.includes('vodka')) return inventory.find(i => i.nombre.toLowerCase().includes('vodka'))?.id;
      if (n.includes('mineral')) return inventory.find(i => i.nombre.toLowerCase().includes('mineral'))?.id;
      if (n.includes('sprite')) return inventory.find(i => i.nombre.toLowerCase().includes('sprite'))?.id;
      if (n.includes('bacardi limon')) return inventory.find(i => i.nombre.toLowerCase().includes('bacardi limon'))?.id;
      if (n.includes('boing mango')) return inventory.find(i => i.nombre.toLowerCase().includes('boing mango'))?.id;
      if (n.includes('caldo de carne')) return inventory.find(i => i.nombre.toLowerCase().includes('caldo de carne'))?.id;
      if (n.includes('mezcal')) return inventory.find(i => i.nombre.toLowerCase().includes('mezcal'))?.id;
      if (n.includes('boost')) return inventory.find(i => i.nombre.toLowerCase().includes('boost'))?.id;
      if (n.includes('curazao')) return inventory.find(i => i.nombre.toLowerCase().includes('curazao'))?.id;
      if (n.includes('vino rosado')) return inventory.find(i => i.nombre.toLowerCase().includes('vino rosado'))?.id;
      if (n.includes('gran malo')) return inventory.find(i => i.nombre.toLowerCase().includes('gran malo'))?.id;
      if (n.includes('coronita')) return inventory.find(i => i.nombre.toLowerCase().includes('coronita'))?.id;
      return null;
    };

    const products = {};
    recipesData.forEach(item => {
      if (!products[item.producto]) {
        products[item.producto] = { nombre: item.producto, categoria: item.tipo, items: [] };
      }
      products[item.producto].items.push(item);
    });

    for (const productName in products) {
      const p = products[productName];
      const totalCost = p.items.reduce((acc, item) => acc + item.costo, 0);

      const res = await client.query(
        'INSERT INTO recetas_base (nombre, categoria, costo_total) VALUES ($1, $2, $3) RETURNING id',
        [p.nombre, p.categoria, totalCost]
      );
      const recipeId = res.rows[0].id;

      for (const item of p.items) {
        await client.query(
          'INSERT INTO receta_componentes (receta_id, insumo_id, insumo_nombre_manual, cantidad, unidad, costo_proporcional) VALUES ($1, $2, $3, $4, $5, $6)',
          [recipeId, findInsumo(item.insumo), item.insumo, item.cantidad, item.unidad, item.costo]
        );
      }
      console.log(`Ingested: ${p.nombre}`);
    }

    console.log('Seeding finished successfully!');
  } catch (err) {
    console.error('Error during seeding:', err);
  } finally {
    await client.end();
  }
}

seed();
