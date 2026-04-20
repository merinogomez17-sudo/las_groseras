import React, { useState, useEffect } from 'react';
import { 
  Package, Search, Plus, Filter, Download, 
  AlertTriangle, TrendingUp, TrendingDown, 
  Edit2, Trash2, X, Save, RefreshCw, Calculator,
  Layers, Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';
import Papa from 'papaparse';

/**
 * MÓDULO DE INVENTARIO - LAS GROSERAS
 * Permite gestionar insumos con desglose de precio por presentación vs precio unitario.
 */

const InventoryPage = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Todas');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  const categories = [
    'Todas', 'Alcohol', 'Cerveza', 'Salsas', 'Refresco', 
    'Pulpa para escarchar', 'Polvo para escarchar', 'Pulpa liquida', 
    'Jarabe', 'Adicionales - dulces', 'MP indirecta', 
    'Energizante', 'Vasos', 'Insumo secreto', 'Otros'
  ];

  const [formData, setFormData] = useState({
    nombre: '',
    categoria: 'Otros',
    cantidad_actual: 0,
    cantidad_minima: 0,
    unidad: 'Pzas',
    precio_unitario: 0, // Este actuará como precio de la presentación completa
    piezas_por_unidad: 1, // Multiplicador (ej: 6 para un Six)
    proveedor: '',
    notas: ''
  });

  useEffect(() => {
    fetchInventory();
    
    const subscription = supabase
      .channel('inventory_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventario' }, () => {
        fetchInventory();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('inventario')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setItems(data || []);
    } catch (error) {
      toast.error('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (item = null) => {
    if (item) {
      setEditingItem(item);
      setFormData({ 
        ...item,
        piezas_por_unidad: item.piezas_por_unidad || 1
      });
    } else {
      setEditingItem(null);
      setFormData({
        nombre: '',
        categoria: 'Otros',
        cantidad_actual: 0,
        cantidad_minima: 0,
        unidad: 'Pzas',
        precio_unitario: 0,
        piezas_por_unidad: 1,
        proveedor: '',
        notas: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const loadingToast = toast.loading('Guardando...');
    
    try {
      if (editingItem) {
        const { error } = await supabase
          .from('inventario')
          .update(formData)
          .eq('id', editingItem.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('inventario')
          .insert([formData]);
        if (error) throw error;
      }
      toast.success('Insumo guardado correctamente', { id: loadingToast });
      setIsModalOpen(false);
      fetchInventory();
    } catch (error) {
      toast.error('Error: ' + error.message, { id: loadingToast });
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar este insumo?')) return;
    try {
      const { error } = await supabase.from('inventario').delete().eq('id', id);
      if (error) throw error;
      toast.success('Insumo eliminado');
      fetchInventory();
    } catch (error) {
      toast.error('Error: ' + error.message);
    }
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = item.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         (item.proveedor && item.proveedor.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = categoryFilter === 'Todas' || item.categoria === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const handleDownloadLayout = () => {
    const headers = ['nombre', 'categoria', 'unidad', 'cantidad_actual', 'cantidad_minima', 'precio_unitario', 'piezas_por_unidad', 'proveedor', 'notas'];
    const sampleRow = ['Ejemplo Insumo', 'Cerveza', 'Pzas', '10', '5', '300.50', '6', 'Proveedor SA', 'Notas opcionales'];
    const csvContent = Papa.unparse([headers, sampleRow]);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
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
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const transformedData = results.data.map(row => ({
            nombre: row.nombre || '',
            categoria: row.categoria || 'Otros',
            unidad: row.unidad || 'Pzas',
            cantidad_actual: Number(row.cantidad_actual) || 0,
            cantidad_minima: Number(row.cantidad_minima) || 0,
            precio_unitario: Number(row.precio_unitario) || 0,
            piezas_por_unidad: Number(row.piezas_por_unidad) || 1,
            proveedor: row.proveedor || '',
            notas: row.notas || ''
          }));

          if (transformedData.length === 0) throw new Error('El archivo está vacío');

          // Usamos upsert por el campo 'nombre' si existe la restricción,
          // de lo contrario insert normal. En Supabase usaremos upsert.
          const { error } = await supabase
            .from('inventario')
            .upsert(transformedData, { onConflict: 'nombre' });

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
  const totalValue = items.reduce((acc, curr) => acc + (curr.cantidad_actual * curr.precio_unitario), 0);

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center bg-slate-900/40 p-6 rounded-3xl border border-white/5 backdrop-blur-md gap-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white italic tracking-tighter flex items-center gap-3">
             <Layers className="text-brand-red animate-pulse shrink-0" size={32} />
             INVENTARIO & COSTOS
          </h1>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-[0.2em] mt-1">Gestión de Stock y Escandallos • Las Groseras</p>
        </div>
        <div className="flex flex-wrap gap-4 w-full lg:w-auto">
          <button className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl text-slate-400 transition-all" onClick={fetchInventory}>
            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
          </button>
          <button className="btn-primary shadow-xl shadow-brand-red/40 px-6 py-3 group flex-1 sm:flex-none justify-center" onClick={() => handleOpenModal()}>
            <Plus size={20} className="stroke-[3px]" />
            <span className="font-black italic">NUEVO INSUMO</span>
          </button>
          <button 
            className="flex items-center justify-center gap-2 px-6 py-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl hover:bg-emerald-500/20 transition-all font-black italic shadow-xl shadow-emerald-500/10 flex-1 sm:flex-none text-xs"
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
          { label: 'Variedad de Insumos', value: items.length, icon: Package, color: 'text-blue-400', bg: 'bg-blue-500/10' },
          { label: 'Alerta de Reabastecimiento', value: lowStockCount, icon: AlertTriangle, color: 'text-brand-red', bg: 'bg-brand-red/10 animate-pulse' },
          { label: 'Valorización Total', value: `$${totalValue.toLocaleString()}`, icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
        ].map((stat, i) => (
          <motion.div 
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
            key={stat.label} className="glass p-6 relative overflow-hidden group"
          >
             <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full opacity-10 group-hover:opacity-20 transition-opacity ${stat.bg}`} />
             <div className="flex justify-between items-start relative z-10">
               <div>
                 <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{stat.label}</p>
                 <h3 className={`text-3xl font-black mt-2 italic tracking-tighter ${stat.color}`}>{stat.value}</h3>
               </div>
               <div className={`p-4 rounded-2xl ${stat.bg} ${stat.color}`}>
                 <stat.icon size={24} />
               </div>
             </div>
          </motion.div>
        ))}
      </div>

      {/* FILTERS */}
      <div className="glass p-4 flex flex-col md:flex-row gap-4 items-center justify-between border-white/5">
        <div className="relative w-full lg:w-96 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-brand-red transition-colors" size={18} />
          <input 
            type="text" placeholder="Buscar por nombre o proveedor..." className="input-field pl-12 bg-white/5 focus:bg-white/10"
            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl px-4 py-2">
            <Filter size={16} className="text-brand-red" />
            <select 
              className="bg-transparent focus:outline-none text-white text-xs font-bold uppercase tracking-widest cursor-pointer"
              value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}
            >
              {categories.map(c => <option key={c} value={c} className="bg-slate-900">{c}</option>)}
            </select>
        </div>
      </div>

      {/* TABLE */}
      <div className="glass overflow-hidden shadow-2xl border-white/5">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-white/[0.02] border-b border-white/5">
              <tr>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-500">Insumo & Presentación</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-500">Categoría</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-500">Stock Actual</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center">Piezas/U</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-500">Desglose de Precios</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-500 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.03]">
                {filteredItems.map((item) => {
                  const unitPrice = item.precio_unitario / (item.piezas_por_unidad || 1);
                  return (
                    <motion.tr 
                      key={item.id} className="hover:bg-white/[0.02] transition-colors group"
                    >
                      <td className="px-6 py-4">
                        <div className="font-black text-white text-sm uppercase tracking-tight group-hover:text-brand-red transition-colors">{item.nombre}</div>
                        <div className="text-[10px] text-slate-500 font-bold flex items-center gap-1 uppercase">{item.proveedor || 'S/N'} • {item.unidad}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-3 py-1.5 rounded-lg bg-white/5 text-[10px] font-black uppercase tracking-widest text-slate-400 border border-white/5">
                          {item.categoria}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className={`text-sm font-black italic tracking-tighter ${item.cantidad_actual <= item.cantidad_minima ? 'text-brand-red flex items-center gap-1.5' : 'text-slate-200'}`}>
                          {item.cantidad_actual} <span className="opacity-50">{item.unidad}</span>
                          {item.cantidad_actual <= item.cantidad_minima && <AlertTriangle size={14} className="animate-bounce" />}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                         <div className="bg-white/5 py-1 px-2 rounded-lg inline-block border border-white/5 text-[11px] font-black text-slate-300">
                           x {item.piezas_por_unidad || 1}
                         </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                           <div className="text-xs font-black text-emerald-400">Total: ${item.precio_unitario?.toLocaleString()}</div>
                           <div className="text-[10px] font-bold text-slate-500 flex items-center gap-1.5">
                             <Calculator size={10} /> 
                             Unitario: <span className="text-white">${unitPrice.toFixed(2)}</span>
                           </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => handleOpenModal(item)} className="p-2 hover:bg-emerald-500/10 rounded-lg text-emerald-400 hover:text-emerald-300">
                            <Edit2 size={16} />
                          </button>
                          <button onClick={() => handleDelete(item.id)} className="p-2 hover:bg-brand-red/10 rounded-lg text-brand-red">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL AGREGAR/EDITAR */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="glass max-w-2xl w-full p-10 relative overflow-hidden"
            >
              <button onClick={() => setIsModalOpen(false)} className="absolute right-6 top-6 text-slate-500 hover:text-white transition-colors">
                <X size={28} />
              </button>
              
              <div className="mb-8 border-b border-white/5 pb-6">
                <h2 className="text-3xl font-black text-white italic tracking-tighter flex items-center gap-3 uppercase">
                  {editingItem ? <Edit2 size={28} className="text-emerald-400" /> : <Plus size={28} className="text-brand-red" />}
                  {editingItem ? 'EDITAR INSUMO' : 'NUEVO INSUMO'}
                </h2>
                <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mt-1">Configuración técnica de stock y costos unitarios</p>
              </div>

              <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Nombre del Insumo / Producto</label>
                  <input 
                    required type="text" className="input-field py-4 bg-white/5 border-white/10"
                    value={formData.nombre} onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                  />
                </div>
                
                <div className="space-y-6">
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Categoría</label>
                    <select 
                      className="input-field cursor-pointer bg-white/5 border-white/10 italic font-bold"
                      value={formData.categoria} onChange={(e) => setFormData({...formData, categoria: e.target.value})}
                    >
                      {categories.filter(c => c !== 'Todas').map(c => <option key={c} value={c} className="bg-slate-900">{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Unidad de Gestión</label>
                    <input 
                      placeholder="Pzas, Litros, Caja..." className="input-field bg-white/5 border-white/10"
                      value={formData.unidad} onChange={(e) => setFormData({...formData, unidad: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-6">
                   <div className="p-6 bg-brand-red/5 rounded-3xl border border-brand-red/20">
                      <h4 className="text-[10px] font-black text-brand-red uppercase tracking-widest mb-4 flex items-center gap-2">
                        <Calculator size={14} /> DESGLOSE DE UNIDADES
                      </h4>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-[9px] font-black text-slate-500 uppercase mb-2">Precio de la Presentación ($)</label>
                          <input 
                            type="number" step="0.01" className="input-field bg-white/10 border-brand-red/20 text-emerald-400 font-black text-lg"
                            value={formData.precio_unitario} onChange={(e) => setFormData({...formData, precio_unitario: Number(e.target.value)})}
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-black text-slate-500 uppercase mb-2 italic">¿Cuántas piezas vienen dentro?</label>
                          <input 
                            type="number" className="input-field bg-white/10 border-brand-red/20 font-black"
                            value={formData.piezas_por_unidad} onChange={(e) => setFormData({...formData, piezas_por_unidad: Math.max(1, Number(e.target.value))})}
                          />
                        </div>
                        <div className="pt-2 border-t border-brand-red/10 flex justify-between items-center text-[11px] font-bold">
                           <span className="text-slate-500">Costo Unitario Real:</span>
                           <span className="text-white">${(formData.precio_unitario / (formData.piezas_por_unidad || 1)).toFixed(2)}</span>
                        </div>
                      </div>
                   </div>
                </div>

                <div className="md:col-span-1">
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Stock Actual</label>
                  <input 
                    type="number" className="input-field bg-white/5 border-white/10 text-xl font-black italic"
                    value={formData.cantidad_actual} onChange={(e) => setFormData({...formData, cantidad_actual: Number(e.target.value)})}
                  />
                </div>

                <div className="md:col-span-1">
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Mínimo Crítico</label>
                  <input 
                    type="number" className="input-field bg-white/5 border-white/10 font-bold"
                    value={formData.cantidad_minima} onChange={(e) => setFormData({...formData, cantidad_minima: Number(e.target.value)})}
                  />
                </div>

                <div className="md:col-span-2 flex justify-end gap-4 mt-4 pt-6 border-t border-white/5">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary px-8 font-black text-[10px] uppercase">Cancelar</button>
                  <button type="submit" className="btn-primary px-12 py-4 rounded-2xl shadow-xl shadow-brand-red/20 font-black italic uppercase tracking-tighter">
                    <Save size={20} className="stroke-[3px]" />
                    {editingItem ? 'ACTUALIZAR DATOS' : 'CREAR INSUMO'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL CARGA MASIVA */}
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
                <h2 className="text-3xl font-black text-white italic tracking-tighter flex items-center gap-3 uppercase">
                  <Download size={28} className="text-emerald-400 rotate-180" />
                  CARGA MASIVA CSV
                </h2>
                <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mt-1">Actualización masiva de inventario vía archivo CSV</p>
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
                    <p className="text-white font-black italic uppercase">Seleccionar archivo CSV</p>
                    <p className="text-slate-500 text-[10px] uppercase font-bold mt-1">Arrastra tu archivo aquí o haz clic</p>
                  </div>
                  <input 
                    id="bulk-file-input" type="file" accept=".csv" className="hidden" 
                    onChange={handleFileUpload}
                  />
                </div>

                <div className="bg-slate-900/50 p-6 rounded-2xl border border-white/5">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Info size={14} className="text-brand-red" /> INSTRUCCIONES
                  </h4>
                  <ul className="text-[10px] text-slate-500 space-y-2 font-bold leading-relaxed">
                    <li>• El archivo debe estar en formato <span className="text-white">.CSV</span></li>
                    <li>• No cambies el nombre de las columnas del layout.</li>
                    <li>• Si el nombre del insumo ya existe, se <span className="text-emerald-400">ACTUALIZARÁN</span> sus datos.</li>
                    <li>• Los campos vacíos tomarán valores por defecto.</li>
                  </ul>
                </div>

                <button 
                  onClick={handleDownloadLayout}
                  className="w-full flex items-center justify-center gap-2 p-4 bg-white/5 hover:bg-white/10 rounded-2xl text-slate-300 transition-all font-black italic text-xs border border-white/5 uppercase"
                >
                  <Download size={16} />
                  Descargar Layout de Ejemplo
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
