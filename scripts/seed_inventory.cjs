const { Client } = require('pg');
require('dotenv').config();

const items = [
  { cat: 'Adicionales - dulces', name: 'Banderillon Productos Bravo', unit: 'Bote 50 pz', price: 83.00 },
  { cat: 'Adicionales - dulces', name: 'Banderilla el gatito', unit: 'Bote 50 pz', price: 38.90 },
  { cat: 'Adicionales - dulces', name: 'Banderilla el tarugo', unit: 'Bote 50 pz', price: 44.00 },
  { cat: 'Adicionales - dulces', name: 'Gomitas Manguitos Lucky Gummy', unit: 'Bolsa 1000 gr', price: 70.90 },
  { cat: 'Adicionales - dulces', name: 'Gomitas Ositos Lucky Gummy', unit: 'Bolsa 1000 gr', price: 74.00 },
  { cat: 'Adicionales - dulces', name: 'Gomitas Shark', unit: 'Bolsa 1000 gr', price: 90.30 },
  { cat: 'Adicionales - dulces', name: 'Gomita Rainbow', unit: 'Bolsa 1000 gr', price: 126.00 },
  { cat: 'MP indirecta', name: 'Ajonjoli', unit: 'Bolsa 1000 gr', price: 67.50 },
  { cat: 'Cerveza', name: 'Modelo (especial) 355ml', unit: 'Six', price: 108.00 },
  { cat: 'Cerveza', name: 'Modelo (especial) 355ml', unit: '24 Pzas', price: 619.00 },
  { cat: 'Cerveza', name: 'Modelo (especial) Latón', unit: '1 Pza', price: 27.00 },
  { cat: 'Cerveza', name: 'Victoria 355ml', unit: 'Six', price: 112.00 },
  { cat: 'Cerveza', name: 'Victoria Laton', unit: '1 Pza', price: 19.50 },
  { cat: 'Cerveza', name: 'Victoria Laton', unit: '4 Pzas', price: 90.00 },
  { cat: 'Cerveza', name: 'Ultra 355ml', unit: 'Six', price: 120.00 },
  { cat: 'Cerveza', name: 'Ultra 355ml', unit: '24 Pzas', price: 510.00 },
  { cat: 'Cerveza', name: 'Carta blanca 355ml', unit: 'Six', price: 65.60 },
  { cat: 'Cerveza', name: 'Carta blanca Caguama', unit: '940 ml', price: 34.00 },
  { cat: 'Cerveza', name: 'Carta blanca Caguamita', unit: 'Six 300 ml', price: 79.00 },
  { cat: 'MP indirecta', name: 'Limon sin semilla', unit: '1 kilo', price: 20.00 },
  { cat: 'MP indirecta', name: 'Concentrado de limon', unit: 'Bote 1 lt', price: 27.00 },
  { cat: 'MP indirecta', name: 'Sal de grano', unit: 'Bolsa 1000 gr', price: 15.00 },
  { cat: 'Polvo para escarchar', name: 'Miguelito Polvo', unit: 'Botella 250 gr', price: 22.50 },
  { cat: 'Polvo para escarchar', name: 'Miguelito Polvo', unit: 'Bolsa 980 gr', price: 63.70 },
  { cat: 'Polvo para escarchar', name: 'Polvo Aby', unit: 'Bote 1kg', price: 49.90 },
  { cat: 'Pulpa liquida', name: 'Pulparindo Splash', unit: 'Envase 300 gr', price: 39.80 },
  { cat: 'Pulpa liquida', name: 'Salsa Picho', unit: 'Bote 1kg', price: 29.50 },
  { cat: 'Salsas', name: 'Miche mix sal, picante y especias', unit: 'Bote 240 ml', price: 32.00 },
  { cat: 'Salsas', name: 'Miche mix clasica', unit: 'Bote 240 ml', price: 32.00 },
  { cat: 'Salsas', name: 'Miche mix habanero', unit: 'Bote 240 ml', price: 32.00 },
  { cat: 'Salsas', name: 'Miche mix salimon', unit: 'Bote 240 ml', price: 32.00 },
  { cat: 'Pulpa para escarchar', name: 'Forritos Rim Dip', unit: 'Bote 227 gr', price: 43.90 },
  { cat: 'Pulpa para escarchar', name: 'Forritos Rim Dip Mora Azul', unit: 'Bote 227 gr', price: 43.90 },
  { cat: 'Pulpa para escarchar', name: 'Forritos Rim Dip Sandia', unit: 'Bote 227 gr', price: 40.70 },
  { cat: 'Pulpa para escarchar', name: 'Pulparindo Rim Dip Mango', unit: 'Bote 250 gr', price: 34.60 },
  { cat: 'Pulpa para escarchar', name: 'Pulparindo Rim Dip Original', unit: 'Bote 250 gr', price: 34.60 },
  { cat: 'Pulpa para escarchar', name: 'Patuchela Pavito Original', unit: 'Bote 500 gr', price: 54.00 },
  { cat: 'Pulpa para escarchar', name: 'Patuchela Pavito Mora', unit: 'Bote 500 gr', price: 54.00 },
  { cat: 'Pulpa para escarchar', name: 'Patuchela Pavito Mango', unit: 'Bote 500 gr', price: 54.00 },
  { cat: 'Salsas', name: 'Clamato', unit: 'Bote 1.89 lt', price: 60.00 },
  { cat: 'Salsas', name: 'Clamato', unit: 'Bote 946 ml', price: 47.00 },
  { cat: 'Salsas', name: 'Clamato', unit: '2 botes 2.54 lt', price: 115.00 },
  { cat: 'Salsas', name: 'Salsa Tabasco', unit: 'bote 60 ml', price: 50.00 },
  { cat: 'Salsas', name: 'Salsa Tabasco', unit: 'bote 355 ml', price: 220.00 },
  { cat: 'Salsas', name: 'Salsa negra la costeña', unit: 'Bote 360 ml', price: 22.00 },
  { cat: 'Salsas', name: 'Mi chela Maggi', unit: 'Bote 145 ml', price: 28.00 },
  { cat: 'Salsas', name: 'Salsa Maggi', unit: 'Bote 200 ml', price: 81.00 },
  { cat: 'Salsas', name: 'Salsa Maggi', unit: 'Bote 100 ml', price: 47.00 },
  { cat: 'Salsas', name: 'Salsa Inglesa', unit: 'Bote 980 ml', price: 157.42 },
  { cat: 'Salsas', name: 'Mi chela Maggi', unit: 'Bote 1.9L', price: 272.44 },
  { cat: 'Salsas', name: 'Salsa cubana Frutimich', unit: 'Bote 1 lt', price: 60.00 },
  { cat: 'MP indirecta', name: 'Tajin', unit: '3 piezas 255 gr', price: 128.00 },
  { cat: 'Alcohol', name: 'Bacardi Mango', unit: 'Botella 700 ml', price: 310.66 },
  { cat: 'Jarabe', name: 'Frutimich jarabe mango', unit: 'Botella 1 lt', price: 57.00 },
  { cat: 'Alcohol', name: 'Vodka Smirnoff', unit: 'Botella 1 lt', price: 305.86 },
  { cat: 'Alcohol', name: 'Curazao Licor Flamingo', unit: 'Botella 1 lt', price: 208.99 },
  { cat: 'Alcohol', name: 'Mezcal', unit: 'Botella', price: 400.00 },
  { cat: 'Alcohol', name: 'Bacardi', unit: 'Botella 700 ml', price: 271.07 },
  { cat: 'Alcohol', name: 'Bacardi raspberry', unit: 'Botella 750 ml', price: 281.30 },
  { cat: 'Alcohol', name: 'Vino Rosado Riunite Lambrusco', unit: 'Botella 1.5 lt', price: 250.63 },
  { cat: 'Refresco', name: 'Sprite', unit: 'Botella 3 lt', price: 38.50 },
  { cat: 'Energizante', name: 'Boost', unit: '12 piezas 235 ml', price: 230.10 },
  { cat: 'Refresco', name: 'Fresa-Kiwi Mundet', unit: 'Botella 2 lt', price: 26.00 },
  { cat: 'Alcohol', name: 'Gran malo', unit: 'Botella 750 ml', price: 339.00 },
  { cat: 'Alcohol', name: 'Vodka Tamarindo Smirnoff', unit: '1 lt', price: 322.21 },
  { cat: 'MP indirecta', name: 'Sal gusano', unit: 'Bolsa', price: 0 },
  { cat: 'Refresco', name: 'Sprite', unit: '6 latas 355 ml', price: 106.00 },
  { cat: 'Refresco', name: 'Agua mineral', unit: '12 botellas 2 lt', price: 200.00 },
  { cat: 'Jarabe', name: 'Concentrado de tamarindo', unit: 'Botella 1.89 lt', price: 145.00 },
  { cat: 'Jarabe', name: 'Jarabe natural', unit: 'Botella 1 lt', price: 85.00 },
  { cat: 'Adicionales - dulces', name: 'Gomitas Frutas Lucky', unit: 'Bolsa 1kg', price: 71.30 },
  { cat: 'Adicionales - dulces', name: 'Gomitas Pepino enchilada acidul', unit: 'Bolsa 1kg', price: 88.00 },
  { cat: 'Adicionales - dulces', name: 'Gomitas Crazy Rings Sandia', unit: 'Bolsa 1kg', price: 82.50 },
  { cat: 'Adicionales - dulces', name: 'Gomita sandia zumba', unit: '50 piezas', price: 56.20 },
  { cat: 'Pulpa para escarchar', name: 'Patuchela Pavito Chamoy', unit: 'Bote 500 gr', price: 54.00 },
  { cat: 'Pulpa para escarchar', name: 'Pulpa Chamoyazo Miguelito', unit: 'Bote 950 gr', price: 92.30 },
  { cat: 'Pulpa para escarchar', name: 'Pasta Mora Azul Micho', unit: 'Bote 600 gr', price: 52.80 },
  { cat: 'Pulpa para escarchar', name: 'Tamamich', unit: 'Bote 1000 gr', price: 60.10 },
  { cat: 'Adicionales - dulces', name: 'Zumba Roll Mango', unit: '12 piezas', price: 37.20 },
  { cat: 'Pulpa para escarchar', name: 'Salsa mix', unit: 'Bote 1100 gr', price: 62.40 },
  { cat: 'Pulpa para escarchar', name: 'Frutimich pulpa', unit: 'Bote 1100 gr', price: 59.00 },
  { cat: 'Pulpa liquida', name: 'Miguelito botella mango', unit: 'Bote 250 gr', price: 22.50 },
  { cat: 'Pulpa liquida', name: 'Forritos pulpa chamoy', unit: 'Bote 1kg', price: 91.70 },
  { cat: 'Adicionales - dulces', name: 'Gomitas tiburones lucky', unit: 'Bolsa 1kg', price: 82.50 },
  { cat: 'Adicionales - dulces', name: 'Gomitas mangusanos lucky', unit: 'Bolsa 1kg', price: 69.80 },
  { cat: 'MP indirecta', name: 'Ajonjoli garapiñado', unit: 'Bolsa 500gr', price: 31.00 },
  { cat: 'Pulpa para escarchar', name: 'Mr Chela Tamarindo', unit: 'Bote 1.1kg', price: 58.80 },
  { cat: 'Vasos', name: 'Vaso 32 oz delgado', unit: '25 piezas', price: 48.00 },
  { cat: 'Cerveza', name: 'Coronita', unit: 'Caja 24 botellas 210 ml', price: 239.00 },
  { cat: 'Polvo para escarchar', name: 'Miguelito Polvo Mora', unit: 'Bolsa 980 gr', price: 63.70 },
  { cat: 'Pulpa para escarchar', name: 'Dulces Micho Mora', unit: 'Bote 600 gr', price: 52.50 },
  { cat: 'Polvo para escarchar', name: 'Miguelito Polvo Mango', unit: 'Bolsa 980 gr', price: 63.70 },
  { cat: 'Pulpa liquida', name: 'Chamoy Desol', unit: '2 botes 1 lt', price: 72.00 },
  { cat: 'Refresco', name: 'Refresco Toronjalimon Fresca Fusion', unit: 'Botella 2 lt', price: 24.00 },
  { cat: 'Alcohol', name: 'Bacardi Limon', unit: 'Botella 750 ml', price: 239.00 },
  { cat: 'Alcohol', name: 'Bacardi Limon', unit: '4 botellas 750 ml', price: 930.00 },
  { cat: 'Otros', name: 'Mango congelado', unit: 'Bolsa 500gr', price: 50.00 },
  { cat: 'Refresco', name: 'Boing mango', unit: 'Tetrapack 1lt', price: 32.00 },
  { cat: 'Insumo secreto', name: 'Mangazo', unit: 'Mezcla', price: 0.32 },
  { cat: 'Otros', name: 'Caldo de carne', unit: 'Lata 300 gr', price: 30.00 },
];

async function seedInventory() {
  const client = new Client({
    connectionString: process.env.DB_CONNECTION_STRING,
  });

  try {
    await client.connect();
    console.log('--- Iniciando Carga de Inventario Masiva ---');
    
    // Limpiar tabla antes de insertar (opcional, pero para evitar duplicados en este paso)
    // await client.query('DELETE FROM inventario');
    
    for (const item of items) {
      await client.query(
        'INSERT INTO inventario (nombre, categoria, unidad, precio_unitario, cantidad_actual, cantidad_minima) VALUES ($1, $2, $3, $4, $5, $6)',
        [item.name, item.cat, item.unit, item.price, 10, 5]
      );
    }
    
    console.log(`✅ Carga completada. Se insertaron ${items.length} productos.`);
  } catch (err) {
    console.error('❌ Error en la carga:', err.message);
  } finally {
    await client.end();
  }
}

seedInventory();
