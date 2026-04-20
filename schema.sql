-- Habilitar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Enums para estados consistentes
DO $$ BEGIN
    CREATE TYPE lead_status AS ENUM ('nuevo', 'contactado', 'cotizado', 'negociacion', 'cerrado_ganado', 'cerrado_perdido');
    CREATE TYPE quote_status AS ENUM ('borrador', 'enviada', 'aprobada', 'rechazada', 'cerrada');
    CREATE TYPE event_status AS ENUM ('confirmado', 'en_proceso', 'finalizado', 'cancelado');
    CREATE TYPE movement_type AS ENUM ('entrada', 'salida');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Tabla de Inventario
CREATE TABLE IF NOT EXISTS inventario (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL,
    categoria TEXT NOT NULL,
    cantidad_actual NUMERIC DEFAULT 0,
    cantidad_minima NUMERIC DEFAULT 0,
    unidad TEXT NOT NULL, -- Pzas, Kg, Litros, etc.
    precio_unitario NUMERIC DEFAULT 0,
    proveedor TEXT,
    fecha_ultima_actualizacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notas TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Movimientos de Inventario (Historial)
CREATE TABLE IF NOT EXISTS movimientos_inventario (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_insumo UUID REFERENCES inventario(id) ON DELETE CASCADE,
    tipo movement_type NOT NULL,
    cantidad NUMERIC NOT NULL,
    motivo TEXT, -- Venta, Compra, Mermas, Evento
    fecha TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    usuario_id UUID -- Se vincula con auth.users(id) si se requiere RLS
);

-- 4. Tabla de Clientes
CREATE TABLE IF NOT EXISTS clientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre_completo TEXT NOT NULL,
    telefono TEXT,
    email TEXT,
    tipo_cliente TEXT CHECK (tipo_cliente IN ('particular', 'empresa')),
    empresa TEXT,
    rfc TEXT,
    notas TEXT,
    tags TEXT[],
    fecha_registro TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Tabla de Leads (Prospectos)
CREATE TABLE IF NOT EXISTS leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre_contacto TEXT NOT NULL,
    telefono TEXT,
    email TEXT,
    tipo_evento TEXT,
    fecha_tentativa DATE,
    numero_personas INTEGER,
    presupuesto_estimado NUMERIC,
    canal_origen TEXT, -- Instagram, WhatsApp, Referido, etc.
    estado lead_status DEFAULT 'nuevo',
    notas TEXT,
    cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
    fecha_ingreso TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Tabla de Cotizaciones
CREATE TABLE IF NOT EXISTS cotizaciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    numero_cotizacion TEXT UNIQUE, -- Ej: COT-2025-001
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
    cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
    fecha_cotizacion DATE DEFAULT CURRENT_DATE,
    fecha_validez DATE,
    numero_personas INTEGER,
    tipo_evento TEXT,
    paquetes_incluidos JSONB, -- Formato: [{nombre: "Básica", precio: 1500, items: []}]
    servicios_adicionales JSONB,
    precio_por_persona NUMERIC,
    descuento NUMERIC DEFAULT 0,
    subtotal NUMERIC,
    iva NUMERIC,
    total NUMERIC,
    estado quote_status DEFAULT 'borrador',
    notas TEXT,
    condiciones_pago TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Tabla de Eventos
CREATE TABLE IF NOT EXISTS eventos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre_evento TEXT,
    cliente_id UUID REFERENCES clientes(id) ON DELETE CASCADE,
    cotizacion_id UUID REFERENCES cotizaciones(id) ON DELETE SET NULL,
    fecha_evento DATE,
    hora_inicio TIME,
    hora_fin TIME,
    lugar TEXT,
    tipo_evento TEXT,
    numero_personas INTEGER,
    paquete_contratado TEXT,
    estado event_status DEFAULT 'confirmado',
    notas_logisticas TEXT,
    lista_insumos_generada JSONB, -- Cache de los insumos calculados
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Tabla de Recetas (Configuración)
CREATE TABLE IF NOT EXISTS recetas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    paquete_nombre TEXT,
    id_insumo UUID REFERENCES inventario(id) ON DELETE CASCADE,
    cantidad_por_persona_hora NUMERIC, -- Ej: 0.5 cervezas por persona cada hora
    unidad TEXT
);

-- Habilitar Row Level Security (RLS) básico
ALTER TABLE inventario ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE cotizaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE eventos ENABLE ROW LEVEL SECURITY;

-- Políticas de acceso para todos los usuarios autenticados (Admin-level)
-- Nota: En un sistema productivo real, esto se segmentaría por roles.
CREATE POLICY "Acceso total para usuarios autenticados" ON inventario FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Acceso total para usuarios autenticados" ON clientes FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Acceso total para usuarios autenticados" ON leads FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Acceso total para usuarios autenticados" ON cotizaciones FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Acceso total para usuarios autenticados" ON eventos FOR ALL USING (auth.role() = 'authenticated');

-- Datos Semilla (Seed Data) para pruebas
INSERT INTO inventario (nombre, categoria, cantidad_actual, cantidad_minima, unidad, precio_unitario, proveedor)
VALUES 
('Cerveza Victoria 355ml', 'Cervezas', 120, 50, 'Pzas', 18, 'Modelo'),
('Clamato Original 1.89L', 'Clamatos', 5, 10, 'Botes', 85, 'Costco'),
('Salsa Inglesa 1L', 'Salsas', 2, 3, 'Botellas', 120, 'Sams');
