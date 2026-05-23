/**
 * CONFIGURACIÓN DE LÍMITES POR PAQUETE
 */
export const PACKAGE_LIMITS = {
  'bien_portado': { },
  'algo_tranqui': { 'Cerveza con sabor': 2, 'Bebida especial': 1 },
  'mal_portado': { 'Cerveza con sabor': 2, 'Bebida especial': 2 },
  'el_mas_perro': { 'Cerveza con sabor': 2, 'Bebida especial': 5 }
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

  let baseLimits = {};

  // 1. Manejar tanto 'personalizada' como 'personalizado'
  if (pkgId.startsWith('personaliza')) {
    if (pkgData.limites_personalizados) {
      baseLimits = pkgData.limites_personalizados;
    } else if (pkgData.items && Array.isArray(pkgData.items)) {
      const extracted = {};
      pkgData.items.forEach(item => {
        const matchSabores = item.match(/(\d+)\s+Sabores/i);
        const matchTragos = item.match(/(\d+)\s+Trago/i);
        const matchCervezas = item.match(/(\d+)\s+Cerveza/i);
        if (matchSabores) extracted['Cerveza con sabor'] = parseInt(matchSabores[1]);
        if (matchTragos) extracted['Bebida especial'] = parseInt(matchTragos[1]);
        if (matchCervezas) extracted['Cerveza especial'] = parseInt(matchCervezas[1]);
      });
      baseLimits = extracted;
    }
  } else if (PACKAGE_LIMITS[pkgId]) {
    // 2. Buscar por pkgId directo (ej. 'algo_tranqui', 'mal_portado')
    baseLimits = { ...PACKAGE_LIMITS[pkgId] };
  } else {
    // 3. Si pkgId es un UUID, buscar por nombre normalizado
    const nameKey = normalizePkgId(pkgData.nombre || '');
    if (nameKey && PACKAGE_LIMITS[nameKey]) baseLimits = { ...PACKAGE_LIMITS[nameKey] };
  }

  // Sumar bebidas adicionales a los límites base
  const bebidasAdicionales = pkgData.bebidas_adicionales || [];
  if (bebidasAdicionales.length > 0) {
    const finalLimits = { ...baseLimits };
    bebidasAdicionales.forEach(b => {
      if (b.categoria && b.cantidad > 0) {
        finalLimits[b.categoria] = (finalLimits[b.categoria] || 0) + b.cantidad;
      }
    });
    return finalLimits;
  }

  return baseLimits;
};
