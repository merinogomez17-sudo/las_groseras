# Las Groseras — CRM & Back Office

## Stack

- **Frontend**: React 18 + React Router 6 + Vite 5 (SWC)
- **Backend**: Supabase (PostgreSQL) — anon key en cliente, RLS para acceso
- **Estilos**: Tailwind CSS 3 + CSS variables para theming (dark/light)
- **PDF**: @react-pdf/renderer (cotizaciones y listas de compras)
- **Notificaciones**: sonner (toasts)
- **Animaciones**: framer-motion + @hello-pangea/dnd
- **Deploy**: Vercel (SPA rewrite en vercel.json)

## Estructura de rutas

```
/                        → LandingPage (iframe de landing_original.html)
/reserva                 → LeadCaptureForm (formulario público)
/selection/:eventId      → DrinkSelectionPage (selección de bebidas para invitados)
/admin/*                 → Protegido por AdminGuard (contraseña: dpddLG2026, sessionStorage)
  /admin/dashboard
  /admin/leads
  /admin/cotizaciones
  /admin/clientes
  /admin/eventos
  /admin/inventario
  /admin/insumos
  /admin/recetas
  /admin/configuracion
```

## Archivos clave

| Archivo | Propósito |
|---|---|
| `src/lib/supabase.js` | Cliente Supabase (única instancia) |
| `src/App.jsx` | Router principal, ThemeProvider wrapper |
| `src/context/ThemeContext.jsx` | Dark/light theme, persiste en localStorage |
| `src/components/auth/AdminGuard.jsx` | Guard de sesión con contraseña hardcodeada |
| `src/components/layout/sidebar.jsx` | Sidebar responsive con grupos CRM y Back Office |
| `src/utils/eventUtils.js` | PACKAGE_LIMITS y getEventLimits() para eventos |

## Páginas

| Página | Descripción |
|---|---|
| `dashboardPage.jsx` | Métricas globales, alertas de stock, calendario de eventos |
| `leadsPage.jsx` | Pipeline de leads con 6 estados, suscripción real-time |
| `quotesPage.jsx` | Cotizador con paquetes preset (210–330 $/persona), PDF export |
| `customersPage.jsx` | CRUD de clientes con tags y tipo (particular/empresa) |
| `eventsPage.jsx` | Gestión de eventos, selección de recetas/cervezas, PDF lista de compras |
| `inventoryPage.jsx` | Stock físico (tabla `inventario`) + historial de compras + log de ajustes |
| `insumosPage.jsx` | Catálogo de insumos con costo promedio ponderado (tabla `insumos`) |
| `recipesPage.jsx` | Recetas con componentes y costo calculado |

## Base de datos — Tablas principales

### `insumos` (catálogo de ingredientes con costos)
- `tipo_insumo, marca, presentacion` — UNIQUE juntos
- `precio_promedio` — promedio ponderado, actualizado por trigger en cada compra
- `ml_gr_pieza` — contenido por unidad
- `precio_x_ml` — columna GENERATED STORED (precio_promedio / ml_gr_pieza)
- `total_unidades_compradas` — acumulador para cálculo WAMP

### `compras` (historial de compras)
- FK → insumos
- `fecha_compra, cantidad_comprada, precio_total_compra`
- **Trigger** `fn_actualizar_precio_promedio()`: recalcula precio promedio en insumos después de cada INSERT

### `inventario` (stock físico — sistema legacy)
- `nombre, producto_base, formato, categoria`
- `cantidad_actual, cantidad_minima, unidad`
- `precio_unitario, piezas_por_unidad`

### `movimientos_inventario` (log de ajustes de stock)
- FK → inventario, tipo ENUM (entrada/salida), cantidad, motivo

### `clientes` / `leads` / `cotizaciones` / `eventos`
- Pipeline CRM completo: leads → cotizaciones (JSONB paquetes) → clientes → eventos
- `cotizaciones.paquetes_incluidos` es JSONB array con id, nombre, precio_persona, items[], limites_personalizados
- `eventos.paquete_contratado` guarda el ID normalizado del paquete
- `eventos.cervezas_seleccionadas` — array de selecciones de invitados

### `recetas_base` + `receta_componentes`
- Recetas con ingredientes linkeados a `insumos` (o nombre manual)
- `costo_proporcional` calculado por componente

### `insumo_mezclas`
- Tabla para mezclas/ingredientes de recetas especiales
- RLS: policy `public_full_access_insumo_mezclas` (FOR ALL TO public, USING true)

## RLS — Regla importante

**Las políticas deben usar `TO public USING (true)`**, NO `TO authenticated USING (auth.role() = 'authenticated')`.
La app usa la anon key del cliente sin sesión de usuario Supabase Auth.

```sql
-- CORRECTO
CREATE POLICY "nombre" ON tabla FOR ALL TO public USING (true) WITH CHECK (true);

-- INCORRECTO — bloquea todas las operaciones
CREATE POLICY "nombre" ON tabla FOR ALL TO authenticated USING (auth.role() = 'authenticated');
```

## Theming — CSS variables

No hardcodear colores. Usar siempre variables CSS:

```css
/* En CSS */
background: rgb(var(--brand-yellow) / 0.1);
color: rgb(var(--brand-cream));

/* En Tailwind */
className="bg-brand-yellow/10 text-brand-cream"
```

**Tokens principales**:
- `--brand-yellow`: 232 168 32 → amber accent
- `--brand-cream`: 216 212 204 → texto principal
- `--brand-dark`: 17 19 21 → fondo base
- `--brand-teal`: 120 120 115 → secundario
- `--color-surface` / `--color-card` → superficies de cards

Clases utilitarias definidas en `index.css`: `.glass`, `.btn-primary`, `.btn-secondary`, `.btn-danger`, `.input-field`, `.badge-*`, `.alert-*`

## Variables de entorno

```
VITE_SUPABASE_URL=https://kcfvjorpgucdrbjbfdef.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_...
DB_CONNECTION_STRING=postgresql://postgres:...@db....supabase.co:5432/postgres
```

`VITE_*` → accesibles en el cliente via `import.meta.env`
`DB_CONNECTION_STRING` → solo para scripts Node.js en `scripts/` y `scratch/`

## Scripts de base de datos

Los scripts de migración y seed están en `scripts/` y `scratch/`, son archivos `.cjs` o `.js` que usan `pg` directamente con `DB_CONNECTION_STRING`.

**Ejecutar así**:
```bash
node scripts/nombre_script.cjs
# o
node scratch/fix_algo.cjs
```

No dejar SQL manual para que Diana lo ejecute — correr siempre con scripts.

## Paquetes de cotización (preset)

| ID | Nombre | Precio/persona |
|---|---|---|
| `bien_portado` | Bien Portado | $210 |
| `algo_tranqui` | Algo Tranqui | $250 |
| `mal_portado` | Mal Portado | $290 |
| `el_mas_perro` | El Más Perro | $330 |
| `personalizada` | Personalizada | variable |

Definidos en `quotesPage.jsx` (PACKAGES array) y `eventUtils.js` (PACKAGE_LIMITS).
