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
