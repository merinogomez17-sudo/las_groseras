-- Nuevas tablas para el Módulo de Recetas y Costos

-- 1. Tabla de Recetas (Productos Finales)
CREATE TABLE IF NOT EXISTS recetas_base (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL, -- Ej: Michelada Clásica
    categoria TEXT, -- Basica, Especial, etc.
    costo_total NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Componentes de la Receta (Ingredientes de Inventario)
CREATE TABLE IF NOT EXISTS receta_componentes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    receta_id UUID REFERENCES recetas_base(id) ON DELETE CASCADE,
    insumo_id UUID REFERENCES inventario(id) ON DELETE SET NULL,
    insumo_nombre_manual TEXT, -- Para casos donde no hay ID (Indirectos)
    cantidad NUMERIC NOT NULL,
    unidad TEXT,
    costo_proporcional NUMERIC DEFAULT 0
);

-- 3. Habilitar RLS
ALTER TABLE recetas_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE receta_componentes ENABLE ROW LEVEL SECURITY;

-- 4. Políticas
DROP POLICY IF EXISTS "Acceso total recetas" ON recetas_base;
CREATE POLICY "Acceso total recetas" ON recetas_base FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Acceso total componentes" ON receta_componentes;
CREATE POLICY "Acceso total componentes" ON receta_componentes FOR ALL USING (auth.role() = 'authenticated');
