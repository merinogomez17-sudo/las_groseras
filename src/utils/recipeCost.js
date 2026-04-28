// Cálculo de costo de componente de receta — fuente única de verdad
// inventory = rows de tabla `insumos` (con precio_promedio, ml_gr_pieza, precio_x_ml, total_unidades_compradas)
// mezclas   = rows de `insumo_mezclas` con insumos joined
export const calcComponentCost = (comp, inventory, genericOptions, mezclas = []) => {
  const qty = parseFloat(comp.cantidad) || 0;

  if (comp.is_mezcla) {
    const comps = mezclas.filter(m => m.nombre_generico === comp.insumo_nombre_manual);
    if (!comps.length) return 0;
    const total = comps.reduce((s, m) => s + Number(m.cantidad), 0);
    return comps.reduce((sum, m) => {
      const proporcion = Number(m.cantidad) / total;
      const ins = m.insumos || inventory.find(i => i.id === m.insumo_id);
      if (!ins) return sum;
      const pxu = ins.precio_x_ml || (ins.precio_promedio / (ins.ml_gr_pieza || 1));
      return sum + pxu * qty * proporcion;
    }, 0);
  }

  if (comp.is_generic) {
    const gen = genericOptions.find(g => g.value === (comp.tipo_insumo || comp.insumo_nombre_manual));
    return gen ? gen.avgPrice * qty : 0;
  }

  // ESPECÍFICO: promedio ponderado entre todas las presentaciones de esa marca
  const matches = inventory.filter(i => i.tipo_insumo === comp.tipo_insumo && i.marca === comp.marca);
  if (!matches.length) return 0;
  const totalUnits = matches.reduce((s, i) => s + (Number(i.total_unidades_compradas) || 0), 0);
  if (totalUnits > 0) {
    const weightedPxml = matches.reduce((s, i) => s + (i.precio_promedio / (i.ml_gr_pieza || 1)) * (Number(i.total_unidades_compradas) || 0), 0) / totalUnits;
    return weightedPxml * qty;
  }
  const avgPxml = matches.reduce((s, i) => s + (i.precio_x_ml || (i.precio_promedio / (i.ml_gr_pieza || 1))), 0) / matches.length;
  return avgPxml * qty;
};

// Construye las opciones genéricas (precio promedio por tipo_insumo)
export const buildGenericOptions = (inventory) => {
  const types = {};
  inventory.forEach(item => {
    if (!item.tipo_insumo) return;
    if (!types[item.tipo_insumo]) types[item.tipo_insumo] = { total: 0, count: 0 };
    const p = item.precio_x_ml || (item.precio_promedio / (item.ml_gr_pieza || 1)) || 0;
    if (p > 0) { types[item.tipo_insumo].total += p; types[item.tipo_insumo].count += 1; }
  });
  return Object.keys(types).sort().map(type => ({ value: type, avgPrice: types[type].total / types[type].count }));
};
