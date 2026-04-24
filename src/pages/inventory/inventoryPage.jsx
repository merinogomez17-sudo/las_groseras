import React, { useState, useEffect } from 'react';
import {
  Package, Search, Plus, Filter, Download,
  AlertTriangle, TrendingUp,
  Edit2, Trash2, X, Save, RefreshCw, Calculator,
  Layers, Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';
import Papa from 'papaparse';

const categories = [
  'Todas', 'Alcohol', 'Cerveza', 'Salsas', 'Refresco',
  'Pulpa para escarchar', 'Polvo para escarchar', 'Pulpa liquida',
  'Jarabe', 'Adicionales - dulces', 'MP indirecta',
  'Energizante', 'Vasos', 'Insumo secreto', 'Otros'
];

const EMPTY_FORM = {
  nombre: '', producto_base: '', formato: 'Pza', categoria: 'Otros',
  cantidad_actual: 0, cantidad_minima: 0, unidad: 'Pzas',
  precio_unitario: 0, piezas_por_unidad: 1, proveedor: '', notas: ''
};

const InventoryPage = () => {
  const [items, setItems]                   = useState([]);
  const [loading, setLoading]               = useState(true);
  const [searchTerm, setSearchTerm]         = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Todas');
  const [panelOpen, setPanelOpen]           = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [editingItem, setEditingItem]       = useState(null);
  const [formData, setFormData]             = useState(EMPTY_FORM);
  const [expandedProducts, setExpandedProducts] = useState({});

  useEffect(() => {
    fetchInventory();
    const subscription = supabase
      .channel('inventory_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventario' }, () => fetchInventory())
      .subscribe();
    return () => supabase.removeChannel(subscription);
  }, []);

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('inventario').select('*')
        .order('producto_base', { ascending: true })
        .order('formato', { ascending: true });
      if (error) throw error;
      setItems(data || []);
    } catch (error) {
      toast.error('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const openPanel = (item = null) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        ...item,
        producto_base:    item.producto_base || item.nombre,
        formato:          item.formato || 'Pza',
        piezas_por_unidad: item.piezas_por_unidad || 1
      });
    } else {
      setEditingItem(null);
      setFormData(EMPTY_FORM);
    }
    setPanelOpen(true);
  };

  const closePanel = () => setPanelOpen(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const loadingToast = toast.loading('Guardando...');
    const finalData = { ...formData, nombre: `${formData.producto_base} (${formData.formato})` };
    try {
      if (editingItem) {
        const { error } = await supabase.from('inventario').update(finalData).eq('id', editingItem.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('inventario').insert([finalData]);
        if (error) throw error;
      }
      toast.success('Insumo guardado correctamente', { id: loadingToast });
      closePanel();
      fetchInventory();
    } catch (error) {
      toast.error('Error: ' + error.message, { id: loadingToast });
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar este insumo?')) return;
    try {
      const { error } = await supabase.from('inventario').delete().eq('id', id);
      if (error) throw error;
      toast.success('Insumo eliminado');
      closePanel();
      fetchInventory();
    } catch (error) {
      toast.error('Error: ' + error.message);
    }
  };

  const toggleProduct = (baseName) => {
    setExpandedProducts(prev => ({ ...prev, [baseName]: !prev[baseName] }));
  };

  const baseProductNames = Array.from(new Set(items.map(i => i.producto_base || i.nombre))).sort();

  const handleBaseNameChange = (val) => {
    const existing = items.find(i => (i.producto_base || i.nombre) === val);
    if (existing) {
      setFormData(prev => ({
        ...prev, producto_base: val,
        categoria: existing.categoria,
        proveedor: existing.proveedor || prev.proveedor,
        unidad: existing.unidad || prev.unidad
      }));
    } else {
      setFormData(prev => ({ ...prev, producto_base: val }));
    }
  };

  const filteredItems = items.filter(item => {
    const searchString = `${item.producto_base} ${item.formato} ${item.nombre} ${item.proveedor}`.toLowerCase();
    return searchString.includes(searchTerm.toLowerCase()) &&
      (categoryFilter === 'Todas' || item.categoria === categoryFilter);
  });

  const groupedProducts = filteredItems.reduce((acc, item) => {
    const base = item.producto_base || item.nombre;
    if (!acc[base]) acc[base] = { name: base, category: item.categoria, totalStock: 0, unit: item.unidad, presentations: [], hasAlert: false };
    acc[base].presentations.push(item);
    acc[base].totalStock += Number(item.cantidad_actual);
    if (item.cantidad_actual <= item.cantidad_minima) acc[base].hasAlert = true;
    return acc;
  }, {});

  const productList = Object.values(groupedProducts);

  const handleDownloadLayout = () => {
    const headers = ['producto_base','formato','categoria','unidad','cantidad_actual','cantidad_minima','precio_unitario','piezas_por_unidad','proveedor','notas'];
    const sampleRow = ['Cerveza Corona','355ml','Cerveza','Pzas','10','5','300.50','6','Modelo','Notas opcionales'];
    const csvContent = Papa.unparse([headers, sampleRow]);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.setAttribute('href', URL.createObjectURL(blob));
    link.setAttribute('download', 'layout_inventario_groseras.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const loadingToast = toast.loading('Procesando archivo...');
    Papa.parse(file, {
      header: true, skipEmptyLines: true,
      complete: async (results) => {
        try {
          const transformedData = results.data.map(row => {
            const base = row.producto_base || row.nombre || '';
            const fmt  = row.formato || 'Pza';
            return {
              producto_base: base, formato: fmt, nombre: `${base} (${fmt})`,
              categoria: row.categoria || 'Otros', unidad: row.unidad || 'Pzas',
              cantidad_actual: Number(row.cantidad_actual) || 0,
              cantidad_minima: Number(row.cantidad_minima) || 0,
              precio_unitario: Number(row.precio_unitario) || 0,
              piezas_por_unidad: Number(row.piezas_por_unidad) || 1,
              proveedor: row.proveedor || '', notas: row.notas || ''
            };
          });
          if (transformedData.length === 0) throw new Error('El archivo está vacío');
          const { error } = await supabase.from('inventario').upsert(transformedData, { onConflict: 'nombre' });
          if (error) throw error;
          toast.success(`Se cargaron ${transformedData.length} insumos correctamente`, { id: loadingToast });
          setIsBulkModalOpen(false);
          fetchInventory();
        } catch (error) {
          toast.error('Error al procesar CSV: ' + error.message, { id: loadingToast });
        }
      }
    });
  };

  const lowStockCount = items.filter(i => i.cantidad_actual <= i.cantidad_minima).length;
  const totalValue    = items.reduce((acc, curr) => acc + (curr.cantidad_actual * curr.precio_unitario), 0);

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center bg-slate-900/40 p-6 rounded-3xl border border-white/5 backdrop-blur-md gap-6">
        <div>
          <h1 className="lobster text-[27px] sm:text-[33px] text-white flex items-center gap-3">
            <Layers className="text-brand-red animate-pulse shrink-0" size={32} />
            Inventario & Costos
          </h1>
          <p className="text-slate-500 text-[15px] font-bold tracking-[0.2em] mt-1">Gestión de stock</p>
        </div>
        <div className="flex flex-wrap gap-4 w-full lg:w-auto">
          <button className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl text-slate-400 transition-all" onClick={fetchInventory}>
            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            className={`btn-primary shadow-xl shadow-brand-red/40 px-6 py-3 flex-1 sm:flex-none justify-center ${panelOpen && !editingItem ? 'ring-2 ring-brand-red/50' : ''}`}
            onClick={() => openPanel()}
          >
            <Plus size={20} className="stroke-[3px]" />
            <span className="font-black">Nuevo insumo</span>
          </button>
          <button
            className="flex items-center justify-center gap-2 px-6 py-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl hover:bg-emerald-500/20 transition-all font-black shadow-xl shadow-emerald-500/10 flex-1 sm:flex-none text-[15px]"
            onClick={() => setIsBulkModalOpen(true)}
          >
            <Download size={18} className="rotate-180" />
            CARGA MASIVA
          </button>
        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {[
          { label: 'Variedad de Insumos',        value: items.length,          icon: Package,       color: 'text-blue-400',    bg: 'bg-blue-500/10' },
          { label: 'Alerta de Reabastecimiento', value: lowStockCount,          icon: AlertTriangle, color: 'text-brand-red',   bg: 'bg-brand-red/10 animate-pulse' },
          { label: 'Valorización Total',         value: `$${totalValue.toLocaleString()}`, icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
        ].map((stat, i) => (
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
            key={stat.label} className="glass p-6 relative overflow-hidden group"
          >
            <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full opacity-10 group-hover:opacity-20 transition-opacity ${stat.bg}`} />
            <div className="flex justify-between items-start relative z-10">
              <div>
                <p className="text-[13px] font-black text-slate-500 tracking-widest">{stat.label}</p>
                <h3 className={`text-[33px] font-black mt-2 tracking-tighter ${stat.color}`}>{stat.value}</h3>
              </div>
              <div className={`p-4 rounded-2xl ${stat.bg} ${stat.color}`}>
                <stat.icon size={24} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* FILTROS */}
      <div className="glass p-4 flex flex-col md:flex-row gap-4 items-center justify-between border-white/5">
        <div className="relative w-full lg:w-96 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-brand-red transition-colors" size={18} />
          <input
            type="text" placeholder="Buscar por nombre o proveedor..."
            className="input-field pl-12 bg-white/5 focus:bg-white/10"
            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl px-4 py-2">
          <Filter size={16} className="text-brand-red" />
          <select
            className="bg-transparent focus:outline-none text-white text-[15px] font-bold tracking-widest cursor-pointer"
            value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}
          >
            {categories.map(c => <option key={c} value={c} className="bg-slate-900">{c}</option>)}
          </select>
        </div>
      </div>

      {/* SPLIT VIEW */}
      <div className="flex gap-5 items-start">

        {/* TABLA */}
        <div className="flex-1 min-w-0 glass overflow-hidden shadow-2xl border-white/5">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-white/[0.02] border-b border-white/5">
                <tr>
                  <th className="px-6 py-5 text-[13px] font-black tracking-widest text-slate-500">Insumo & Presentación</th>
                  {!panelOpen && <th className="px-6 py-5 text-[13px] font-black tracking-widest text-slate-500">Categoría</th>}
                  <th className="px-6 py-5 text-[13px] font-black tracking-widest text-slate-500">Stock</th>
                  {!panelOpen && <th className="px-6 py-5 text-[13px] font-black tracking-widest text-slate-500 text-center">Pzas/U</th>}
                  {!panelOpen && <th className="px-6 py-5 text-[13px] font-black tracking-widest text-slate-500">Precios</th>}
                  <th className="px-6 py-5 text-[13px] font-black tracking-widest text-slate-500 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03]">
                {productList.map((product) => (
                  <React.Fragment key={product.name}>
                    <motion.tr
                      className="hover:bg-white/[0.04] transition-colors group cursor-pointer border-l-4 border-transparent hover:border-brand-red"
                      onClick={() => toggleProduct(product.name)}
                    >
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg bg-white/5 transition-transform duration-300 ${expandedProducts[product.name] ? 'rotate-90' : ''}`}>
                            <Plus size={13} className={expandedProducts[product.name] ? 'hidden' : 'block'} />
                            <div className={expandedProducts[product.name] ? 'block' : 'hidden'} style={{width: 13, height: 2, background: 'currentColor'}} />
                          </div>
                          <div>
                            <div className="font-black text-white text-base tracking-tight group-hover:text-brand-red transition-colors">{product.name}</div>
                            <div className="text-[12px] text-slate-500 font-bold">{product.presentations.length} presentaciones</div>
                          </div>
                        </div>
                      </td>
                      {!panelOpen && (
                        <td className="px-6 py-5">
                          <span className="px-3 py-1.5 rounded-lg bg-white/5 text-[12px] font-black tracking-widest text-slate-400 border border-white/5">
                            {product.category}
                          </span>
                        </td>
                      )}
                      <td className="px-6 py-5">
                        <div className={`text-base font-black tracking-tighter ${product.hasAlert ? 'text-brand-red flex items-center gap-1.5' : 'text-emerald-400'}`}>
                          {product.totalStock} <span className="opacity-50 lowercase">{product.unit}</span>
                          {product.hasAlert && <AlertTriangle size={13} className="animate-bounce" />}
                        </div>
                      </td>
                      {!panelOpen && <td className="px-6 py-5 text-center text-slate-500">—</td>}
                      {!panelOpen && <td className="px-6 py-5 text-slate-500 text-[14px]">Agrupado</td>}
                      <td className="px-6 py-5 text-right">
                        <div className="text-slate-600 group-hover:text-brand-red transition-colors font-black text-[12px] tracking-widest">
                          {expandedProducts[product.name] ? 'Cerrar' : 'Ver'}
                        </div>
                      </td>
                    </motion.tr>

                    <AnimatePresence>
                      {expandedProducts[product.name] && product.presentations.map((item) => {
                        const unitPrice = item.precio_unitario / (item.piezas_por_unidad || 1);
                        return (
                          <motion.tr
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            key={item.id}
                            className={`bg-white/[0.01] hover:bg-white/[0.03] transition-colors group/row border-l-4 border-brand-red/30 ${editingItem?.id === item.id ? 'bg-brand-red/5' : ''}`}
                          >
                            <td className="px-6 py-4 pl-16">
                              <div className="font-bold text-slate-200 text-base">{item.formato || 'Estándar'}</div>
                              <div className="text-[11px] text-slate-500 font-bold">{item.proveedor || 'S/N'}</div>
                            </td>
                            {!panelOpen && <td className="px-6 py-4" />}
                            <td className="px-6 py-4">
                              <div className={`text-base font-black tracking-tighter ${item.cantidad_actual <= item.cantidad_minima ? 'text-brand-red' : 'text-slate-300'}`}>
                                {item.cantidad_actual} <span className="opacity-40">{item.unidad}</span>
                              </div>
                            </td>
                            {!panelOpen && (
                              <td className="px-6 py-4 text-center">
                                <div className="bg-white/5 py-1 px-2 rounded-lg inline-block border border-white/5 text-[13px] font-black text-slate-400">
                                  x {item.piezas_por_unidad || 1}
                                </div>
                              </td>
                            )}
                            {!panelOpen && (
                              <td className="px-6 py-4">
                                <div className="text-[14px] font-black text-emerald-400/80">${item.precio_unitario?.toLocaleString()}</div>
                                <div className="text-[11px] font-bold text-slate-500">Unitario: ${unitPrice.toFixed(2)}</div>
                              </td>
                            )}
                            <td className="px-6 py-4 text-right">
                              <div className="flex justify-end gap-1">
                                <button onClick={(e) => { e.stopPropagation(); openPanel(item); }}
                                  className="p-2 hover:bg-emerald-500/10 rounded-lg text-emerald-400/60 hover:text-emerald-400">
                                  <Edit2 size={13} />
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}
                                  className="p-2 hover:bg-brand-red/10 rounded-lg text-brand-red/60 hover:text-brand-red">
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </td>
                          </motion.tr>
                        );
                      })}
                    </AnimatePresence>
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* PANEL DERECHO */}
        <AnimatePresence>
          {panelOpen && (
            <motion.div
              key="inventory-panel"
              initial={{ opacity: 0, x: 32 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 32 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="w-[420px] shrink-0 sticky top-6"
            >
              <div className="glass border-white/5 p-7 relative max-h-[calc(100vh-120px)] overflow-y-auto custom-scrollbar">
                <button onClick={closePanel} className="absolute right-5 top-5 text-slate-500 hover:text-white transition-colors">
                  <X size={20} />
                </button>

                <h2 className="text-xl font-black text-white tracking-tighter mb-1 flex items-center gap-3">
                  {editingItem ? <Edit2 size={20} className="text-emerald-400" /> : <Plus size={20} className="text-brand-red" />}
                  {editingItem ? 'Editar insumo' : 'Nuevo insumo'}
                </h2>
                <p className="text-slate-500 text-[12px] font-black tracking-[0.2em] mb-6">Stock y costos unitarios</p>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[12px] font-black text-slate-500 tracking-widest mb-2">Producto Base</label>
                      <input required type="text" list="base-product-list" placeholder="Ej: Cerveza Corona"
                        className="input-field bg-white/5 border-white/10"
                        value={formData.producto_base} onChange={(e) => handleBaseNameChange(e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-[12px] font-black text-slate-500 tracking-widest mb-2">Formato</label>
                      <input required type="text" placeholder="Ej: 355ml"
                        className="input-field bg-white/5 border-white/10"
                        value={formData.formato} onChange={(e) => setFormData({...formData, formato: e.target.value})} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[12px] font-black text-slate-500 tracking-widest mb-2">Categoría</label>
                      <select className="input-field cursor-pointer bg-white/5 border-white/10 font-bold"
                        value={formData.categoria} onChange={(e) => setFormData({...formData, categoria: e.target.value})}>
                        {categories.filter(c => c !== 'Todas').map(c => <option key={c} value={c} className="bg-slate-900">{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[12px] font-black text-slate-500 tracking-widest mb-2">Unidad</label>
                      <input placeholder="Pzas, Litros..." className="input-field bg-white/5 border-white/10"
                        value={formData.unidad} onChange={(e) => setFormData({...formData, unidad: e.target.value})} />
                    </div>
                  </div>

                  <div className="p-4 bg-brand-red/5 rounded-2xl border border-brand-red/20 space-y-3">
                    <h4 className="text-[12px] font-black text-brand-red tracking-widest flex items-center gap-2">
                      <Calculator size={13} /> Desglose de unidades
                    </h4>
                    <div>
                      <label className="block text-[11px] font-black text-slate-500 mb-2">Precio de la Presentación ($)</label>
                      <input type="number" step="0.01"
                        className="input-field bg-white/10 border-brand-red/20 text-emerald-400 font-black"
                        value={formData.precio_unitario}
                        onChange={(e) => setFormData({...formData, precio_unitario: Number(e.target.value)})} />
                    </div>
                    <div>
                      <label className="block text-[11px] font-black text-slate-500 mb-2">¿Cuántas piezas vienen dentro?</label>
                      <input type="number"
                        className="input-field bg-white/10 border-brand-red/20 font-black"
                        value={formData.piezas_por_unidad}
                        onChange={(e) => setFormData({...formData, piezas_por_unidad: Math.max(1, Number(e.target.value))})} />
                    </div>
                    <div className="pt-2 border-t border-brand-red/10 flex justify-between items-center text-[13px] font-bold">
                      <span className="text-slate-500">Costo Unitario Real:</span>
                      <span className="text-white">${(formData.precio_unitario / (formData.piezas_por_unidad || 1)).toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[12px] font-black text-slate-500 tracking-widest mb-2">Stock Actual</label>
                      <input type="number"
                        className="input-field bg-white/5 border-white/10 font-black text-xl"
                        value={formData.cantidad_actual}
                        onChange={(e) => setFormData({...formData, cantidad_actual: Number(e.target.value)})} />
                    </div>
                    <div>
                      <label className="block text-[12px] font-black text-slate-500 tracking-widest mb-2">Mínimo Crítico</label>
                      <input type="number"
                        className="input-field bg-white/5 border-white/10 font-bold"
                        value={formData.cantidad_minima}
                        onChange={(e) => setFormData({...formData, cantidad_minima: Number(e.target.value)})} />
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-2 border-t border-white/5">
                    <button type="button" onClick={closePanel} className="btn-secondary text-sm px-5">Cancelar</button>
                    <button type="submit" className="btn-primary text-sm px-7">
                      <Save size={15} />
                      {editingItem ? 'Actualizar' : 'Crear'}
                    </button>
                  </div>
                </form>

                <datalist id="base-product-list">
                  {baseProductNames.map(name => <option key={name} value={name} />)}
                </datalist>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* MODAL CARGA MASIVA (se mantiene flotante por ser utilidad de archivo) */}
      <AnimatePresence>
        {isBulkModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="glass max-w-xl w-full p-10 relative overflow-hidden"
            >
              <button onClick={() => setIsBulkModalOpen(false)} className="absolute right-6 top-6 text-slate-500 hover:text-white transition-colors">
                <X size={28} />
              </button>

              <div className="mb-8 border-b border-white/5 pb-6">
                <h2 className="text-[33px] font-black text-white tracking-tighter flex items-center gap-3">
                  <Download size={28} className="text-emerald-400 rotate-180" />
                  Carga masiva CSV
                </h2>
                <p className="text-slate-500 text-[13px] font-black tracking-[0.2em] mt-1">Actualización masiva de inventario vía archivo CSV</p>
              </div>

              <div className="space-y-6">
                <div
                  className="border-2 border-dashed border-white/10 rounded-3xl p-12 flex flex-col items-center justify-center gap-4 hover:border-emerald-500/40 transition-colors bg-white/5 cursor-pointer relative group"
                  onClick={() => document.getElementById('bulk-file-input').click()}
                >
                  <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                    <Plus size={32} />
                  </div>
                  <div className="text-center">
                    <p className="text-white font-black">Seleccionar archivo CSV</p>
                    <p className="text-slate-500 text-[13px] font-bold mt-1">Arrastra tu archivo aquí o haz clic</p>
                  </div>
                  <input id="bulk-file-input" type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
                </div>

                <div className="bg-slate-900/50 p-6 rounded-2xl border border-white/5">
                  <h4 className="text-[13px] font-black text-slate-400 tracking-widest mb-4 flex items-center gap-2">
                    <Info size={14} className="text-brand-red" /> INSTRUCCIONES
                  </h4>
                  <ul className="text-[13px] text-slate-500 space-y-2 font-bold leading-relaxed">
                    <li>• Formato <span className="text-white">.CSV</span></li>
                    <li>• No cambies los nombres de columnas.</li>
                    <li>• Si la combinación ya existe, se <span className="text-emerald-400">actualizará</span>.</li>
                  </ul>
                </div>

                <button onClick={handleDownloadLayout}
                  className="w-full flex items-center justify-center gap-2 p-4 bg-white/5 hover:bg-white/10 rounded-2xl text-slate-300 transition-all font-black text-[15px] border border-white/5">
                  <Download size={16} /> Descargar Layout de Ejemplo
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default InventoryPage;
