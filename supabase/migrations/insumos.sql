-- ============================================================
--  MÓDULO DE INSUMOS - LAS GROSERAS
--  Ejecutar en el SQL Editor de Supabase
-- ============================================================

-- ── 1. TABLA DE INSUMOS ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS insumos (
  id                      uuid          DEFAULT gen_random_uuid() PRIMARY KEY,

  tipo_insumo             text          NOT NULL,
  marca                   text          NOT NULL,
  presentacion            text          NOT NULL,

  -- Precio promedio ponderado.
  -- Al inicio refleja el precio actual de mercado.
  -- Se actualiza automáticamente con cada compra registrada
  -- usando la fórmula: Σ(precio_i × qty_i) / Σ(qty_i)
  precio_promedio         numeric(10,4) NOT NULL DEFAULT 0,
  total_unidades_compradas numeric(10,4) NOT NULL DEFAULT 0, -- acumulado interno para el cálculo

  ml_gr_pieza             numeric(10,4) NOT NULL DEFAULT 1,  -- contenido por unidad (ML, GR o Pza)

  -- Se recalcula automáticamente cada vez que cambia precio_promedio o ml_gr_pieza
  precio_x_ml             numeric(10,6) GENERATED ALWAYS AS (
                            CASE WHEN ml_gr_pieza > 0
                                 THEN precio_promedio / ml_gr_pieza
                                 ELSE 0 END
                          ) STORED,

  created_at              timestamptz   DEFAULT now(),
  updated_at              timestamptz   DEFAULT now(),

  UNIQUE (marca, presentacion)
);

-- ── 2. TABLA DE COMPRAS ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS compras (
  id                     uuid          DEFAULT gen_random_uuid() PRIMARY KEY,
  insumo_id              uuid          NOT NULL REFERENCES insumos(id) ON DELETE CASCADE,

  fecha_compra           date          NOT NULL DEFAULT CURRENT_DATE,
  cantidad_comprada      numeric(10,2) NOT NULL CHECK (cantidad_comprada > 0),
  precio_total_compra    numeric(10,2) NOT NULL CHECK (precio_total_compra >= 0),

  created_at             timestamptz   DEFAULT now()
);

-- ── 3. TRIGGER: recalcular precio_promedio en cada compra ────

CREATE OR REPLACE FUNCTION fn_actualizar_precio_promedio()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_precio_actual      numeric(10,4);
  v_total_comprado     numeric(10,4);
BEGIN
  SELECT precio_promedio, total_unidades_compradas
    INTO v_precio_actual, v_total_comprado
    FROM insumos WHERE id = NEW.insumo_id;

  UPDATE insumos SET
    precio_promedio          = (v_precio_actual * v_total_comprado + NEW.precio_total_compra)
                               / (v_total_comprado + NEW.cantidad_comprada),
    total_unidades_compradas = v_total_comprado + NEW.cantidad_comprada,
    updated_at               = now()
  WHERE id = NEW.insumo_id;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_actualizar_precio_promedio
AFTER INSERT ON compras
FOR EACH ROW EXECUTE FUNCTION fn_actualizar_precio_promedio();

-- ── 4. DATOS INICIALES ───────────────────────────────────────

INSERT INTO insumos (tipo_insumo, marca, presentacion, precio_promedio, ml_gr_pieza) VALUES

-- Adicionales - dulces
('Adicionales - dulces', 'Banderillon Productos Bravo',     'Bote 50 pz',            83.00,   50),
('Adicionales - dulces', 'Banderilla el gatito',            'Bote 50 pz',            38.90,   50),
('Adicionales - dulces', 'Banderilla el tarugo',            'Bote 50 pz',            44.00,   50),
('Adicionales - dulces', 'Gomitas Manguitos Lucky Gummy',   'Bolsa 1000 gr',         70.90,   1000),
('Adicionales - dulces', 'Gomitas Ositos Lucky Gummy',      'Bolsa 1000 gr',         74.00,   1000),
('Adicionales - dulces', 'Gomitas Shark',                   'Bolsa 1000 gr',         90.30,   1000),
('Adicionales - dulces', 'Gomita Rainbow',                  'Bolsa 1000 gr',        126.00,   1000),
('Adicionales - dulces', 'Gomitas Frutas Lucky',            'Bolsa 1kg',             71.30,   1000),
('Adicionales - dulces', 'Gomitas Pepino enchilada acidul', 'Bolsa 1kg',             88.00,   1000),
('Adicionales - dulces', 'Gomitas Crazy Rings Sandia',      'Bolsa 1kg',             82.50,   1000),
('Adicionales - dulces', 'Gomita sandia zumba',             '50 piezas',             56.20,   50),
('Adicionales - dulces', 'Zumba Roll Mango',                'Paquete 12 piezas',     37.20,   12),
('Adicionales - dulces', 'Gomitas tiburones lucky',         'Bolsa 1kg',             82.50,   1000),
('Adicionales - dulces', 'Gomitas mangusanos lucky',        'Bolsa 1kg',             69.80,   1000),

-- MP indirecta
('MP indirecta', 'Ajonjoli',             'Bolsa 1000 gr',          67.50,   1000),
('MP indirecta', 'Limon sin semilla',    '1 kilo',                 20.00,   1000),
('MP indirecta', 'Concentrado de limon', 'Bote 1 lt',              27.00,   1000),
('MP indirecta', 'Sal de grano',         'Bolsa 1000 gr',          15.00,   1000),
('MP indirecta', 'Tajin',               '3 piezas 255 gr',        128.00,   765),
('MP indirecta', 'Ajonjoli garapiñado',  'Bolsa 500gr',            31.00,   500),

-- Cerveza
('Cerveza', 'Modelo (especial)', 'Six 355ml',               108.00,  2130),
('Cerveza', 'Modelo (especial)', '24 de 355ml',             619.00,  8520),
('Cerveza', 'Modelo (especial)', 'Latón 1 pieza',            27.00,   473),
('Cerveza', 'Victoria',          'Six 355ml',               112.00,  2130),
('Cerveza', 'Victoria',          'Laton',                    19.50,   473),
('Cerveza', 'Victoria',          '4 latones',                90.00,  1892),
('Cerveza', 'Ultra',             'Six 355ml',               120.00,  2130),
('Cerveza', 'Ultra',             '24 de 355ml',             510.00,  8520),
('Cerveza', 'Carta blanca',      'Six 355ml',                65.60,  2130),
('Cerveza', 'Carta blanca',      'Caguama 940 ml',           34.00,   940),
('Cerveza', 'Carta blanca',      'Six Caguamita 300 ml',     79.00,  1800),
('Cerveza', 'Coronita',          'Caja 24 botellas 210 ml', 239.00,  5040),

-- Polvo para escarchar
('Polvo para escarchar', 'Miguelito',             'Botella 250 gr',   22.50,  250),
('Polvo para escarchar', 'Miguelito',             'Bolsa 980 gr',     63.70,  980),
('Polvo para escarchar', 'Polvo Aby',             'Bote 1g',          49.90,  1000),
('Polvo para escarchar', 'Miguelito Polvo Mora',  'Bolsa 980 gr',     63.70,  980),
('Polvo para escarchar', 'Miguelito Polvo Mango', 'Bolsa 980 gr',     63.70,  980),

-- Pulpa liquida
('Pulpa liquida', 'Pulparindo Splash',       'Envase 300 gr',    39.80,  300),
('Pulpa liquida', 'Salsa Picho',             'Bote 1kg',         29.50,  1000),
('Pulpa liquida', 'Miguelito botella mango', 'Bote 250 gr',      22.50,  250),
('Pulpa liquida', 'Forritos pulpa chamoy',   'Bote 1kg',         91.70,  1000),
('Pulpa liquida', 'Chamoy Desol',            '2 botes de 1 lt',  72.00,  2000),

-- Pulpa para escarchar
('Pulpa para escarchar', 'Forritos Rim Dip',            'Bote 227 gr',     43.90,  227),
('Pulpa para escarchar', 'Forritos Rim Dip Mora Azul',  'Bote 227 gr',     43.90,  227),
('Pulpa para escarchar', 'Forritos Rim Dip Sandia',     'Bote 227 gr',     40.70,  227),
('Pulpa para escarchar', 'Pulparindo Rim Dip Mango',    'Bote 250 gr',     34.60,  250),
('Pulpa para escarchar', 'Pulparindo Rim Dip Original', 'Bote 250 gr',     34.60,  250),
('Pulpa para escarchar', 'Patuchela Pavito',            'Bote 500 gr',     54.00,  500),
('Pulpa para escarchar', 'Patuchela Pavito Mora',       'Bote 500 gr',     54.00,  500),
('Pulpa para escarchar', 'Patuchela Pavito Mango',      'Bote 500 gr',     54.00,  500),
('Pulpa para escarchar', 'Patuchela Pavito Chamoy',     'Bote 500 gr',     54.00,  500),
('Pulpa para escarchar', 'Pulpa Chamoyazo Miguelito',   'Bote 950 gr',     92.30,  950),
('Pulpa para escarchar', 'Pasta Mora Azul Micho',       'Bote 600 gr',     52.80,  600),
('Pulpa para escarchar', 'Tamamich',                    'Bote 1000 gr',    60.10,  1000),
('Pulpa para escarchar', 'Salsa mix',                   'Bote 1100 gr',    62.40,  1100),
('Pulpa para escarchar', 'Frutimich',                   'Bote 1100 gr',    59.00,  1100),
('Pulpa para escarchar', 'Mr Chela Tamarindo',          'Bote 1.1kg',      58.80,  1100),
('Pulpa para escarchar', 'Dulces Micho Mora',           'Bote 600 gr',     52.50,  600),

-- Salsas
('Salsas', 'Miche mix sal picante y especias', 'Bote 240 ml',        32.00,  240),
('Salsas', 'Miche mix clasica',                'Bote 240 ml',        32.00,  240),
('Salsas', 'Miche mix habanero',               'Bote 240 ml',        32.00,  240),
('Salsas', 'Miche mix salimon',                'Bote 240 ml',        32.00,  240),
('Salsas', 'Clamato',                          'Bote 1.89 lt',       60.00,  1890),
('Salsas', 'Clamato',                          'Bote 946 ml',        47.00,  946),
('Salsas', 'Clamato',                          '2 botes de 2.54 lt', 115.00, 5080),
('Salsas', 'Salsa Tabasco',                    'Bote 60 ml',         50.00,  60),
('Salsas', 'Salsa Tabasco',                    'Bote 355 ml',       220.00,  355),
('Salsas', 'Salsa negra la costeña',           'Bote 360 ml',        22.00,  360),
('Salsas', 'Mi chela Maggi',                   'Bote 145 ml',        28.00,  145),
('Salsas', 'Mi chela Maggi',                   'Bote 1.9L',         272.44,  1900),
('Salsas', 'Salsa Maggi',                      'Bote 200 ml',        81.00,  200),
('Salsas', 'Salsa Maggi',                      'Bote 100 ml',        47.00,  100),
('Salsas', 'Salsa Inglesa',                    'Bote 980 ml',       157.42,  980),
('Salsas', 'Salsa cubana Frutimich',           'Bote 1 lt',          60.00,  1000),

-- Alcohol
('Alcohol', 'Bacardi Mango',               'Botella 700 ml',         310.66, 700),
('Alcohol', 'Vodka Smirnoff',              'Botella 1 lt',           305.86, 1000),
('Alcohol', 'Curazao Licor Flamingo',      'Botella 1 lt',           208.99, 1000),
('Alcohol', 'Mezcal',                      'Botella 750 ml',         400.00, 750),
('Alcohol', 'Bacardi',                     'Botella 700 ml',         271.07, 700),
('Alcohol', 'Bacardi raspberry',           'Botella 750 ml',         281.30, 750),
('Alcohol', 'Vino Rosado Riunite Lambrusco','Botella 1.5 lt',        250.63, 1500),
('Alcohol', 'Gran malo',                   'Botella 750 ml',         339.00, 750),
('Alcohol', 'Vodka Tamarindo',             'Smirnoff Tamarindo 1lt', 322.21, 1000),
('Alcohol', 'Bacardi Limon',               'Botella 750 ml',         239.00, 750),
('Alcohol', 'Bacardi Limon',               '4 botellas 750 ml',      930.00, 3000),

-- Jarabe
('Jarabe', 'Frutimich jarabe mango',    'Botella 1 lt',    57.00,  700),
('Jarabe', 'Concentrado de tamarindo', 'Botella 1.89 lt', 145.00,  1890),
('Jarabe', 'Jarabe natural',           'Botella 1 lt',    85.00,  1000),

-- Refresco
('Refresco', 'Sprite',                           'Botella 3 lt',           38.50,  3000),
('Refresco', 'Sprite',                           '6 latas de 355 ml',     106.00,  2130),
('Refresco', 'Fresa-Kiwi Mundet',                'Botella 2 lt',           26.00,  2000),
('Refresco', 'Agua mineral',                     '12 botellas de 2 lt',   200.00,  24000),
('Refresco', 'Boing mango',                      'Tetrapack 1lt',          32.00,  1000),
('Refresco', 'Refresco Toronjalimon Fresca Fusion','Botella 2 lt',         24.00,  2000),

-- Energizante
('Energizante', 'Boost', 'Paquete 12 piezas 235 ml', 230.10, 2820),

-- Vasos
('Vasos', 'Vaso 32 oz delgado (bodegas atizapan)', '25 piezas', 48.00, 25),

-- Insumo secreto
('Insumo secreto', 'Mangazo', 'Mezcla', 0.32, 2.5),

-- Otros
('Otros', 'Mango congelado', 'Bolsa 500gr', 50.00, 500),
('Otros', 'Caldo de carne',  'Lata 300 gr', 30.00, 300)

ON CONFLICT (marca, presentacion) DO NOTHING;

-- ── 5. RLS ───────────────────────────────────────────────────

ALTER TABLE insumos ENABLE ROW LEVEL SECURITY;
ALTER TABLE compras ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_full_access_insumos" ON insumos
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "auth_full_access_compras" ON compras
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
