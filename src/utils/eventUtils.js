/**
 * CONFIGURACIÓN DE LÍMITES POR PAQUETE
 */
export const PACKAGE_LIMITS = {
  'bien_portado': { 'Cerveza con sabor': 2 },
  'algo_tranqui': { 'Cerveza con sabor': 3, 'Bebida especial': 1 },
  'mal_portado': { 'Cerveza con sabor': 5, 'Bebida especial': 1, 'Cerveza especial': 2 },
  'el_mas_perro': { 'Cerveza con sabor': 5, 'Bebida especial': 3, 'Cerveza especial': 3 }
};

export const CATEGORY_LABELS = {
  'Basica': 'Barra Libre (Básicas)',
  'Cerveza con sabor': 'Sabores de Michelada',
  'Bebida especial': 'Tragos Especiales',
  'Cerveza especial': 'Cervezas Especiales'
};

export const normalizePkgId = (id) => {
  if (!id) return '';
  return id.toLowerCase().trim().replace(/\s+/g, '_');
};

/**
 * DETERMINA LOS LÍMITES REALES DE UN EVENTO
 * Resuelve límites de paquetes fijos o de la configuración personalizada de la cotización.
 */
export const getEventLimits = (event) => {
  if (!event) return {};

  const pkgData = event.cotizaciones?.paquetes_incluidos?.[0] || {};
  const pkgId = normalizePkgId(event.paquete_contratado || pkgData.id || '');

  // 1. Manejar tanto 'personalizada' como 'personalizado'
  if (pkgId.startsWith('personaliza')) {
    // Si ya tiene los límites numéricos guardados, usarlos
    if (pkgData.limites_personalizados) {
      return pkgData.limites_personalizados;
    }

    // FALLBACK para registros viejos: Intentar extraer de la lista de items (strings)
    if (pkgData.items && Array.isArray(pkgData.items)) {
      const extracted = {};
      pkgData.items.forEach(item => {
        const matchSabores = item.match(/(\d+)\s+Sabores/i);
        const matchTragos = item.match(/(\d+)\s+Trago/i);
        const matchCervezas = item.match(/(\d+)\s+Cerveza/i);
        
        if (matchSabores) extracted['Cerveza con sabor'] = parseInt(matchSabores[1]);
        if (matchTragos) extracted['Bebida especial'] = parseInt(matchTragos[1]);
        if (matchCervezas) extracted['Cerveza especial'] = parseInt(matchCervezas[1]);
      });
      return extracted;
    }
  }

  // 2. Buscar por pkgId directo (ej. 'algo_tranqui', 'mal_portado')
  if (PACKAGE_LIMITS[pkgId]) return PACKAGE_LIMITS[pkgId];

  // 3. Si pkgId es un UUID (paquete guardado con ID de BD), buscar por nombre normalizado
  const nameKey = normalizePkgId(pkgData.nombre || '');
  if (nameKey && PACKAGE_LIMITS[nameKey]) return PACKAGE_LIMITS[nameKey];

  return {};
};
