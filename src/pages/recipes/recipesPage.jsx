import React, { useState, useEffect } from 'react';
import { 
  BookOpen, Search, Plus, Filter, 
  Trash2, Edit2, X, Save, RefreshCw, 
  ChevronRight, Calculator, ShoppingBag, 
  Settings, Info, TrendingUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';

/**
 * MÓDULO DE ESCANDALLOS (RECETAS) - LAS GROSERAS
 * Permite gestionar las fórmulas de los productos y calcular costos reales.
 */

const RecipesPage = () => {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Todas');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [inventory, setInventory] = useState([]);
  
  // Editor State
  const [editorData, setEditorData] = useState({
    id: null,
    nombre: '',
    categoria: 'Cerveza con sabor',
    componentes: []
  });

  const categories = ['Basica', 'Cerveza con sabor', 'Bebida especial', 'Cerveza especial'];

  useEffect(() => {
    fetchRecipes();
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    const { data } = await supabase.from('inventario').select('*').order('nombre');
    setInventory(data || []);
  };

  const fetchRecipes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('recetas_base')
        .select(`
          *,
          receta_componentes (
            *,
            inventario (nombre, precio_unitario, unidad, piezas_por_unidad)
          )
        `)
        .order('nombre');

      if (error) throw error;
      setRecipes(data || []);
    } catch (error) {
      toast.error('Error al cargar recetas: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredRecipes = recipes.filter(r => {
    const matchesSearch = r.nombre.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'Todas' || r.categoria === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar esta receta?')) return;
    try {
      const { error } = await supabase.from('recetas_base').delete().eq('id', id);
      if (error) throw error;
      toast.success('Receta eliminada');
      fetchRecipes();
    } catch (error) {
      toast.error('Error: ' + error.message);
    }
  };

  const openEditor = (recipe = null) => {
    if (recipe) {
      setEditorData({
        id: recipe.id,
        nombre: recipe.nombre,
        categoria: recipe.categoria,
        componentes: recipe.receta_componentes?.map(c => ({
          id: c.id,
          insumo_id: c.insumo_id,
          cantidad: c.cantidad,
          unidad: c.unidad
        })) || []
      });
    } else {
      setEditorData({
        id: null,
        nombre: '',
        categoria: 'Cerveza con sabor',
        componentes: []
      });
    }
    setIsEditorOpen(true);
    setIsModalOpen(false); // Por si venía del detalle
  };

  const handleAddComponent = () => {
    setEditorData(prev => ({
      ...prev,
      componentes: [...prev.componentes, { insumo_id: '', cantidad: '', unidad: '' }]
    }));
  };

  const handleRemoveComponent = (idx) => {
    setEditorData(prev => ({
      ...prev,
      componentes: prev.componentes.filter((_, i) => i !== idx)
    }));
  };

  const handleUpdateComponent = (idx, field, value) => {
    const newComps = [...editorData.componentes];
    newComps[idx][field] = value;
    
    // Si cambia el insumo, sugerir unidad
    if (field === 'insumo_id') {
      const insumo = inventory.find(i => i.id === value);
      if (insumo) newComps[idx].unidad = insumo.unidad === 'Pieza' ? 'Pieza' : 'Ml/Gr';
    }
    
    setEditorData({ ...editorData, componentes: newComps });
  };

  const handleSaveRecipe = async () => {
    if (!editorData.nombre) return toast.error('El nombre es obligatorio');
    if (editorData.componentes.length === 0) return toast.error('Debes agregar al menos un ingrediente');

    const loadingToast = toast.loading('Guardando receta...');
    try {
      // 1. Calcular costo total
      let costoTotal = 0;
      const componentsToSave = editorData.componentes.map(comp => {
        const insumo = inventory.find(i => i.id === comp.insumo_id);
        const qty = parseFloat(comp.cantidad) || 0;
        const proporcional = insumo ? (insumo.precio_unitario / insumo.piezas_por_unidad) * qty : 0;
        costoTotal += proporcional;
        return {
          ...comp,
          costo_proporcional: proporcional
        };
      });

      // 2. Upsert receta_base
      const recipePayload = {
        nombre: editorData.nombre,
        categoria: editorData.categoria,
        costo_total: costoTotal
      };

      let recipeId = editorData.id;
      if (recipeId) {
        await supabase.from('recetas_base').update(recipePayload).eq('id', recipeId);
      } else {
        const { data, error } = await supabase.from('recetas_base').insert([recipePayload]).select().single();
        if (error) throw error;
        recipeId = data.id;
      }

      // 3. Sync componentes (delete old, insert new)
      if (editorData.id) {
         await supabase.from('receta_componentes').delete().eq('receta_id', recipeId);
      }

      const finalComponents = componentsToSave.map(c => ({
        receta_id: recipeId,
        insumo_id: c.insumo_id,
        cantidad: c.cantidad,
        unidad: c.unidad,
        costo_proporcional: c.costo_proporcional
      }));

      const { error: compError } = await supabase.from('receta_componentes').insert(finalComponents);
      if (compError) throw compError;

      toast.success('¡Receta guardada con éxito!', { id: loadingToast });
      setIsEditorOpen(false);
      fetchRecipes();
    } catch (err) {
      toast.error('Error al guardar: ' + err.message, { id: loadingToast });
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex justify-between items-center bg-slate-900/40 p-6 rounded-3xl border border-white/5 backdrop-blur-md">
        <div>
          <h1 className="text-3xl font-black text-white italic tracking-tighter flex items-center gap-3 uppercase">
             <BookOpen className="text-brand-red animate-pulse" size={32} />
             ESCANDALLOS & RECETAS
          </h1>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-[0.2em] mt-1">Costeo de Productos Elaborados • Las Groseras</p>
        </div>
        <div className="flex gap-4">
          <button className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl text-slate-400 transition-all" onClick={fetchRecipes}>
            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
          </button>
          <button 
            onClick={() => openEditor()}
            className="btn-primary shadow-xl shadow-brand-red/40 px-8 group"
          >
            <Plus size={20} className="stroke-[3px]" />
            <span className="font-black italic">NUEVA RECETA</span>
          </button>
        </div>
      </div>

      {/* FILTERS */}
      <div className="glass p-4 flex flex-col md:flex-row gap-4 items-center justify-between border-white/5">
        <div className="relative w-full md:w-96 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-brand-red transition-colors" size={18} />
          <input 
            type="text" placeholder="Buscar bebida..." className="input-field pl-12 bg-white/5 focus:bg-white/10"
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

      {/* GRID RECETAS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredRecipes.map((recipe) => (
          <motion.div 
            layout
            key={recipe.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass group hover:border-brand-red/30 transition-all cursor-pointer overflow-hidden relative"
            onClick={() => { setSelectedRecipe(recipe); setIsModalOpen(true); }}
          >
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <span className="px-2 py-1 rounded-md bg-white/5 text-[9px] font-black uppercase tracking-widest text-slate-400">
                  {recipe.categoria}
                </span>
                <div className="flex gap-1">
                  <button 
                    onClick={(e) => { e.stopPropagation(); openEditor(recipe); }}
                    className="p-2 opacity-0 group-hover:opacity-100 hover:bg-white/10 rounded-lg text-slate-400 transition-all"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleDelete(recipe.id); }}
                    className="p-2 opacity-0 group-hover:opacity-100 hover:bg-brand-red/10 rounded-lg text-brand-red transition-all"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <h3 className="text-xl font-black text-white italic tracking-tighter group-hover:text-brand-red transition-colors uppercase">
                {recipe.nombre}
              </h3>

              <div className="mt-4 p-4 bg-white/5 rounded-2xl border border-white/5">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic">Costo Proyectado</span>
                  <span className="text-xl font-black text-emerald-400 italic">${recipe.costo_total?.toFixed(2)}</span>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {recipe.receta_componentes?.slice(0, 3).map((item, i) => (
                  <span key={i} className="text-[9px] font-bold text-slate-500 bg-white/5 py-1 px-2 rounded-md italic">
                    {item.insumo_nombre_manual || item.inventario?.nombre}
                  </span>
                ))}
                {recipe.receta_componentes?.length > 3 && (
                  <span className="text-[9px] font-bold text-brand-red bg-brand-red/5 py-1 px-2 rounded-md italic">
                    +{recipe.receta_componentes.length - 3} más
                  </span>
                )}
              </div>
            </div>
            
            <div className="absolute bottom-0 left-0 w-full h-1 bg-white/5 group-hover:bg-brand-red transition-colors" />
          </motion.div>
        ))}
      </div>

      {/* DETAIL MODAL */}
      <AnimatePresence>
        {isModalOpen && selectedRecipe && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="glass max-w-2xl w-full p-10 relative"
            >
              <button 
                onClick={() => setIsModalOpen(false)}
                className="absolute right-6 top-6 text-slate-400 hover:text-white transition-colors"
              >
                <X size={28} />
              </button>

              <div className="mb-8 border-b border-white/10 pb-6">
                <div className="flex items-center gap-3 mb-2">
                  <span className="px-3 py-1 rounded bg-brand-red/10 text-brand-red text-[10px] font-black uppercase tracking-widest">
                    {selectedRecipe.categoria}
                  </span>
                </div>
                <h2 className="text-4xl font-black text-white italic tracking-tighter uppercase">{selectedRecipe.nombre}</h2>
                <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mt-1">Desglose detallado de ingredientes y costos</p>
              </div>

              <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
                {selectedRecipe.receta_componentes?.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center p-4 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-brand-red font-black italic">
                        {idx + 1}
                      </div>
                      <div>
                        <div className="font-black text-sm uppercase text-white">{item.insumo_nombre_manual || item.inventario?.nombre}</div>
                        <div className="text-[10px] text-slate-500 font-bold uppercase">
                          {item.cantidad} {item.unidad}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-black text-emerald-400 italic">${item.costo_proporcional?.toFixed(2)}</div>
                      <div className="text-[9px] text-slate-600 font-bold">COSTO INV</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8 pt-6 border-t border-white/10 flex justify-between items-center">
                <div>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Total Bebida</p>
                  <p className="text-3xl font-black text-white italic tracking-tighter mt-1">${selectedRecipe.costo_total?.toFixed(2)}</p>
                </div>
                <div className="flex gap-4">
                  <button onClick={() => setIsModalOpen(false)} className="btn-secondary px-8 font-black text-[10px] uppercase">Cerrar</button>
                  <button 
                    onClick={() => openEditor(selectedRecipe)}
                    className="btn-primary px-8 group"
                  >
                    <Edit2 size={18} className="stroke-[3px]" />
                    <span className="font-black italic">EDITAR FORMULA</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* EDITOR MODAL */}
      <AnimatePresence>
        {isEditorOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/95 backdrop-blur-2xl">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="glass max-w-4xl w-full p-10 relative flex flex-col max-h-[90vh] overflow-hidden"
            >
              <button onClick={() => setIsEditorOpen(false)} className="absolute right-6 top-6 text-slate-400 hover:text-white transition-colors">
                <X size={28} />
              </button>

              <div className="mb-8 flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-brand-red flex items-center justify-center text-white shadow-lg shadow-brand-red/20">
                  <Settings size={28} />
                </div>
                <div>
                  <h2 className="text-3xl font-black text-white italic tracking-tighter uppercase">
                    {editorData.id ? 'EDITAR RECETA' : 'NUEVA FORMULA/ESCANDALLO'}
                  </h2>
                  <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mt-1">Configuración técnica de insumos y proporciones</p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto pr-4 custom-scrollbar space-y-8">
                {/* INFO BASE */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className="space-y-2">
                     <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Nombre de la Bebida</label>
                     <input 
                       type="text" placeholder="Ej: Michelada Clásica Pro" className="input-field italic font-black uppercase"
                       value={editorData.nombre} onChange={(e) => setEditorData({...editorData, nombre: e.target.value})}
                     />
                   </div>
                   <div className="space-y-2">
                     <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Categoría</label>
                     <select 
                       className="input-field bg-slate-800 font-bold uppercase tracking-widest cursor-pointer"
                       value={editorData.categoria} onChange={(e) => setEditorData({...editorData, categoria: e.target.value})}
                     >
                       {categories.map(c => <option key={c} value={c}>{c}</option>)}
                     </select>
                   </div>
                </div>

                {/* COMPONENTES */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center px-1">
                     <h3 className="text-xs font-black text-brand-red uppercase tracking-widest flex items-center gap-2">
                        <ShoppingBag size={14} /> INGREDIENTES / COMPONENTES
                     </h3>
                     <button onClick={handleAddComponent} className="flex items-center gap-2 text-[10px] font-black text-emerald-400 hover:text-emerald-300 transition-colors uppercase tracking-widest">
                       <Plus size={14} /> Agregar Fila
                     </button>
                  </div>

                  <div className="space-y-3">
                    {editorData.componentes.map((comp, idx) => {
                      const insumo = inventory.find(i => i.id === comp.insumo_id);
                      const unitQty = parseFloat(comp.cantidad) || 0;
                      const proportionalCost = insumo ? (insumo.precio_unitario / insumo.piezas_por_unidad) * unitQty : 0;

                      return (
                        <div key={idx} className="flex flex-col md:flex-row gap-3 p-4 bg-white/5 rounded-2xl border border-white/5 group relative">
                          <div className="flex-1">
                            <select 
                              className="w-full bg-slate-900 border-none rounded-xl p-3 text-xs font-bold text-white uppercase"
                              value={comp.insumo_id}
                              onChange={(e) => handleUpdateComponent(idx, 'insumo_id', e.target.value)}
                            >
                              <option value="">Seleccionar Insumo...</option>
                              {inventory.map(i => (
                                <option key={i.id} value={i.id}>{i.nombre} (${i.precio_unitario})</option>
                              ))}
                            </select>
                          </div>
                          <div className="w-full md:w-32">
                            <input 
                              type="number" placeholder="Cantidad" className="w-full bg-slate-900 border-none rounded-xl p-3 text-xs font-black text-center text-white"
                              value={comp.cantidad} onChange={(e) => handleUpdateComponent(idx, 'cantidad', e.target.value)}
                            />
                          </div>
                          <div className="w-full md:w-32">
                             <div className="w-full bg-slate-800/50 rounded-xl p-3 text-[10px] font-black text-center text-slate-500 uppercase">
                               {comp.unidad || 'Unidad'}
                             </div>
                          </div>
                          <div className="w-full md:w-32 flex items-center justify-center">
                             <div className="text-sm font-black text-emerald-400 italic">${proportionalCost.toFixed(2)}</div>
                          </div>
                          <button 
                            onClick={() => handleRemoveComponent(idx)}
                            className="absolute -right-2 -top-2 w-6 h-6 bg-slate-800 text-slate-500 hover:text-brand-red rounded-full flex items-center justify-center border border-white/10 opacity-0 group-hover:opacity-100 transition-all shadow-lg"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* FOOTER EDITOR */}
              <div className="mt-8 pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-6">
                 <div>
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Costo Total por Bebida</span>
                    <h4 className="text-4xl font-black text-emerald-400 italic tracking-tighter">
                      ${editorData.componentes.reduce((acc, comp) => {
                        const insumo = inventory.find(i => i.id === comp.insumo_id);
                        return acc + (insumo ? (insumo.precio_unitario / insumo.piezas_por_unidad) * (parseFloat(comp.cantidad) || 0) : 0);
                      }, 0).toFixed(2)}
                    </h4>
                 </div>
                 <div className="flex gap-4 w-full md:w-auto">
                    <button onClick={() => setIsEditorOpen(false)} className="btn-secondary flex-1 md:px-12 font-black uppercase text-[10px]">Cerrar</button>
                    <button onClick={handleSaveRecipe} className="btn-primary flex-1 md:px-12 font-black italic uppercase tracking-tighter shadow-xl shadow-brand-red/20 group">
                      <Save size={18} /> GUARDAR RECETA
                    </button>
                 </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default RecipesPage;
