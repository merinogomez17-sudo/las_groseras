import React, { useState, useEffect, useMemo } from 'react';
import {
  BookOpen, Search, Plus, Filter,
  Trash2, Edit2, X, Save, RefreshCw,
  Calculator, ShoppingBag, Settings
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';

const SearchableSelect = ({ options, value, onChange, placeholder }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const selectedOption  = options.find(o => o.value === value);
  const displayValue    = selectedOption ? selectedOption.label : '';
  const filteredOptions = options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="relative w-full">
      <div
        className="w-full bg-slate-900 rounded-xl flex items-center px-3 py-3 cursor-text border border-white/5 focus-within:border-brand-red/50 transition-colors"
        onClick={() => setIsOpen(true)}
      >
        <Search size={13} className="text-slate-500 mr-2 shrink-0" />
        <input
          type="text"
          className="w-full bg-transparent border-none outline-none text-xs font-bold text-white placeholder:text-slate-500"
          placeholder={selectedOption ? '' : placeholder}
          value={isOpen ? search : displayValue}
          onChange={(e) => { setSearch(e.target.value); setIsOpen(true); }}
          onFocus={() => { setIsOpen(true); setSearch(''); }}
          onBlur={() => { setTimeout(() => setIsOpen(false), 200); }}
        />
        {value && !isOpen && (
          <button type="button"
            onClick={(e) => { e.stopPropagation(); onChange(''); setSearch(''); }}
            className="text-slate-500 hover:text-brand-red ml-2 shrink-0">
            <X size={13} />
          </button>
        )}
      </div>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}
            className="absolute z-[100] w-full mt-2 bg-slate-800 border border-white/10 rounded-xl shadow-2xl max-h-48 overflow-y-auto custom-scrollbar"
          >
            {filteredOptions.length === 0 ? (
              <div className="p-3 text-xs text-slate-500 text-center">No se encontraron resultados</div>
            ) : filteredOptions.map(opt => (
              <div key={opt.value}
                className={`px-4 py-3 text-xs font-bold cursor-pointer hover:bg-white/10 transition-colors ${opt.value === value ? 'text-brand-red bg-brand-red/5' : 'text-white'}`}
                onClick={() => { onChange(opt.value); setIsOpen(false); setSearch(''); }}
              >
                {opt.label}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const categories = ['Basica', 'Cerveza con sabor', 'Bebida especial', 'Cerveza especial'];

// Qué panel está abierto
const PANEL = { NONE: null, DETAIL: 'detail', EDITOR: 'editor' };

const calcComponentCost = (comp, inventory, genericOptions, mezclas = []) => {
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
    return gen ? (gen.avgPrice * qty) : 0;
  }
  const insumo = inventory.find(i => i.id === comp.insumo_id);
  if (!insumo) return 0;
  return insumo.precio_x_ml
    ? (insumo.precio_x_ml * qty)
    : ((insumo.precio_promedio / (insumo.ml_gr_pieza || 1)) * qty);
};

const RecipesPage = () => {
  const [recipes, setRecipes]           = useState([]);
  const [loading, setLoading]           = useState(true);
  const [searchTerm, setSearchTerm]     = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Todas');
  const [inventory, setInventory]       = useState([]);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [panel, setPanel]               = useState(PANEL.NONE);
  const [mezclas, setMezclas]           = useState([]);

  const [editorData, setEditorData]     = useState({
    id: null, nombre: '', categoria: 'Cerveza con sabor', componentes: []
  });

  useEffect(() => { fetchRecipes(); fetchInventory(); fetchMezclas(); }, []);

  const fetchMezclas = async () => {
    const { data } = await supabase.from('insumo_mezclas').select('*, insumos(*)');
    setMezclas(data || []);
  };

  const fetchInventory = async () => {
    const { data } = await supabase.from('insumos').select('*').order('marca');
    setInventory(data || []);
  };

  const genericOptions = useMemo(() => {
    const types = {};
    inventory.forEach(item => {
      if (!item.tipo_insumo) return;
      if (!types[item.tipo_insumo]) {
        types[item.tipo_insumo] = { total: 0, count: 0 };
      }
      const pricePerUnit = item.precio_x_ml || (item.precio_promedio / (item.ml_gr_pieza || 1)) || 0;
      if (pricePerUnit > 0) {
        types[item.tipo_insumo].total += pricePerUnit;
        types[item.tipo_insumo].count += 1;
      }
    });
    return Object.keys(types).sort().map(type => ({
      label: type,
      value: type,
      avgPrice: types[type].total / types[type].count
    }));
  }, [inventory]);

  const recipesWithCosts = useMemo(() => {
    return recipes.map(recipe => {
      const total = recipe.receta_componentes?.reduce((acc, c) => {
        const isGeneric = !c.insumo_id && !!c.insumo_nombre_manual;
        const normalizedComp = {
          is_generic: isGeneric,
          insumo_id: c.insumo_id,
          tipo_insumo: isGeneric ? c.insumo_nombre_manual : '',
          cantidad: c.cantidad
        };
        return acc + calcComponentCost(normalizedComp, inventory, genericOptions, mezclas);
      }, 0) || 0;
      return { ...recipe, dynamic_cost: total };
    });
  }, [recipes, inventory, genericOptions]);

  const fetchRecipes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('recetas_base')
        .select('*, receta_componentes (*, insumos (tipo_insumo, marca, presentacion, precio_promedio, ml_gr_pieza, precio_x_ml))')
        .order('nombre');
      if (error) throw error;
      setRecipes(data || []);
    } catch (error) {
      toast.error('Error al cargar recetas: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredRecipes = recipesWithCosts.filter(r => {
    const matchesSearch   = r.nombre.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'Todas' || r.categoria === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar esta receta?')) return;
    try {
      const { error } = await supabase.from('recetas_base').delete().eq('id', id);
      if (error) throw error;
      toast.success('Receta eliminada');
      setPanel(PANEL.NONE);
      fetchRecipes();
    } catch (error) {
      toast.error('Error: ' + error.message);
    }
  };

  const openDetail = (recipe) => {
    setSelectedRecipe(recipe);
    setPanel(PANEL.DETAIL);
  };

  const openEditor = (recipe = null) => {
    if (recipe) {
      const mezclaNames = new Set(mezclas.map(m => m.nombre_generico.toLowerCase()));
      setEditorData({
        id: recipe.id, nombre: recipe.nombre, categoria: recipe.categoria,
        componentes: recipe.receta_componentes?.map(c => {
          const isGeneric = !c.insumo_id && !!c.insumo_nombre_manual;
          const isMezcla  = isGeneric && mezclaNames.has(c.insumo_nombre_manual?.toLowerCase());
          return {
            id: c.id,
            insumo_id: c.insumo_id || '',
            tipo_insumo: (isGeneric && !isMezcla) ? c.insumo_nombre_manual : '',
            insumo_nombre_manual: isMezcla ? c.insumo_nombre_manual : '',
            is_generic: isGeneric && !isMezcla,
            is_mezcla:  isMezcla,
            cantidad: c.cantidad,
            unidad: c.unidad
          };
        }) || []
      });
    } else {
      setEditorData({ id: null, nombre: '', categoria: 'Cerveza con sabor', componentes: [] });
    }
    setPanel(PANEL.EDITOR);
  };

  const closePanel = () => setPanel(PANEL.NONE);

  const handleAddComponent = () => {
    setEditorData(prev => ({ 
      ...prev, 
      componentes: [...prev.componentes, {
        insumo_id: '', tipo_insumo: '', insumo_nombre_manual: '',
        is_generic: false, is_mezcla: false,
        cantidad: '', unidad: 'Ml/Gr/Pza'
      }]
    }));
  };

  const handleRemoveComponent = (idx) => {
    setEditorData(prev => ({ ...prev, componentes: prev.componentes.filter((_, i) => i !== idx) }));
  };

  const handleUpdateComponent = (idx, field, value) => {
    const newComps = [...editorData.componentes];
    newComps[idx][field] = value;
    
    if (field === 'insumo_id' && !newComps[idx].is_generic) {
      const insumo = inventory.find(i => i.id === value);
      if (insumo) newComps[idx].unidad = 'Ml/Gr/Pza';
    }

    if (field === 'is_generic') {
      newComps[idx].is_mezcla = false;
      newComps[idx].insumo_nombre_manual = '';
      if (value) { newComps[idx].insumo_id = ''; }
      else { newComps[idx].tipo_insumo = ''; }
    }
    if (field === 'is_mezcla') {
      newComps[idx].is_generic = false;
      newComps[idx].insumo_id = '';
      newComps[idx].tipo_insumo = '';
      if (!value) newComps[idx].insumo_nombre_manual = '';
    }

    setEditorData({ ...editorData, componentes: newComps });
  };

  const handleSaveRecipe = async () => {
    if (!editorData.nombre) return toast.error('El nombre es obligatorio');
    if (editorData.componentes.length === 0) return toast.error('Agrega al menos un ingrediente');
    const loadingToast = toast.loading('Guardando receta...');
    try {
      let costoTotal = 0;
      const componentsToSave = editorData.componentes.map(comp => {
        const costo = calcComponentCost(comp, inventory, genericOptions, mezclas);
        const insumoNombreManual = comp.is_mezcla
          ? comp.insumo_nombre_manual
          : comp.is_generic ? comp.tipo_insumo : null;

        return {
          ...comp,
          costo_proporcional: costo,
          insumo_id: (comp.is_generic || comp.is_mezcla) ? null : comp.insumo_id,
          insumo_nombre_manual: insumoNombreManual
        };
      });

      const recipePayload = { nombre: editorData.nombre, categoria: editorData.categoria };
      let recipeId = editorData.id;
      if (recipeId) {
        await supabase.from('recetas_base').update(recipePayload).eq('id', recipeId);
      } else {
        const { data, error } = await supabase.from('recetas_base').insert([recipePayload]).select().single();
        if (error) throw error;
        recipeId = data.id;
      }

      if (editorData.id) await supabase.from('receta_componentes').delete().eq('receta_id', recipeId);

      const finalComponents = componentsToSave.map(c => ({
        receta_id: recipeId, 
        insumo_id: c.insumo_id, 
        insumo_nombre_manual: c.insumo_nombre_manual,
        cantidad: c.cantidad,
        unidad: c.unidad, 
        costo_proporcional: c.costo_proporcional
      }));

      const { error: compError } = await supabase.from('receta_componentes').insert(finalComponents);
      if (compError) throw compError;

      toast.success('¡Receta guardada!', { id: loadingToast });
      closePanel();
      fetchRecipes();
    } catch (err) {
      toast.error('Error al guardar: ' + err.message, { id: loadingToast });
    }
  };

  const totalCost = editorData.componentes.reduce((acc, comp) => {
    return acc + calcComponentCost(comp, inventory, genericOptions, mezclas);
  }, 0);

  const panelOpen = panel !== PANEL.NONE;

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-900/40 p-6 rounded-3xl border border-white/5 backdrop-blur-md gap-6">
        <div>
          <h1 className="lobster text-2xl sm:text-3xl text-white flex items-center gap-3">
            <BookOpen className="text-brand-red animate-pulse shrink-0" size={32} />
            Costos
          </h1>
          <p className="text-slate-500 text-xs font-bold tracking-[0.2em] mt-1">Costeo de Productos Elaborados • Las Groseras</p>
        </div>
        <div className="flex gap-4 w-full sm:w-auto">
          <button className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl text-slate-400 transition-all" onClick={fetchRecipes}>
            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => openEditor()}
            className={`btn-primary shadow-xl shadow-brand-red/40 px-8 py-3 flex-1 sm:flex-none justify-center ${panel === PANEL.EDITOR && !editorData.id ? 'ring-2 ring-brand-red/50' : ''}`}
          >
            <Plus size={20} className="stroke-[3px]" />
            <span className="font-black">Nueva receta</span>
          </button>
        </div>
      </div>

      {/* FILTROS */}
      <div className="glass p-4 flex flex-col md:flex-row gap-4 items-center justify-between border-white/5">
        <div className="relative w-full md:w-96 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-brand-red transition-colors" size={18} />
          <input type="text" placeholder="Buscar bebida..." className="input-field pl-12 bg-white/5 focus:bg-white/10"
            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl px-4 py-2">
          <Filter size={16} className="text-brand-red" />
          <select className="bg-transparent focus:outline-none text-white text-xs font-bold tracking-widest cursor-pointer"
            value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
            {['Todas', ...categories].map(c => <option key={c} value={c} className="bg-slate-900">{c}</option>)}
          </select>
        </div>
      </div>

      {/* SPLIT VIEW */}
      <div className="flex gap-5 items-start">

        {/* GRID DE RECETAS */}
        <div className={`flex-1 min-w-0 grid gap-4 ${panelOpen ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'}`}>
          {filteredRecipes.map((recipe) => (
            <motion.div
              layout key={recipe.id}
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              className={`glass group hover:border-brand-red/30 transition-all cursor-pointer overflow-hidden relative ${(selectedRecipe?.id === recipe.id && panelOpen) ? 'ring-1 ring-brand-red/40' : ''}`}
              onClick={() => openDetail(recipe)}
            >
              <div className="p-5">
                <div className="flex justify-between items-start mb-3">
                  <span className="px-2 py-1 rounded-md bg-white/5 text-[9px] font-black tracking-widest text-slate-400">
                    {recipe.categoria}
                  </span>
                  <div className="flex gap-1">
                    <button onClick={(e) => { e.stopPropagation(); openEditor(recipe); }}
                      className={`p-1.5 opacity-0 group-hover:opacity-100 hover:bg-white/10 rounded-lg text-slate-400 transition-all ${panel === PANEL.EDITOR && editorData.id === recipe.id ? 'opacity-100 text-emerald-400' : ''}`}>
                      <Edit2 size={14} />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(recipe.id); }}
                      className="p-1.5 opacity-0 group-hover:opacity-100 hover:bg-brand-red/10 rounded-lg text-brand-red transition-all">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <h3 className="text-lg font-black text-white tracking-tighter group-hover:text-brand-red transition-colors">
                  {recipe.nombre}
                </h3>

                <div className="mt-3 p-3 bg-white/5 rounded-xl border border-white/5">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-slate-500 tracking-widest">COSTO</span>
                    <span className="text-lg font-black text-emerald-400">${recipe.dynamic_cost?.toFixed(2)}</span>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {recipe.receta_componentes?.slice(0, 3).map((item, i) => (
                    <span key={i} className="text-[9px] font-bold text-slate-500 bg-white/5 py-1 px-2 rounded-md">
                      {item.insumo_nombre_manual || (item.insumos ? `${item.insumos.marca}` : 'Insumo')}
                    </span>
                  ))}
                  {recipe.receta_componentes?.length > 3 && (
                    <span className="text-[9px] font-bold text-brand-red bg-brand-red/5 py-1 px-2 rounded-md">
                      +{recipe.receta_componentes.length - 3} más
                    </span>
                  )}
                </div>
              </div>
              <div className="absolute bottom-0 left-0 w-full h-1 bg-white/5 group-hover:bg-brand-red transition-colors" />
            </motion.div>
          ))}
        </div>

        {/* PANEL DERECHO */}
        <AnimatePresence>
          {panelOpen && (
            <motion.div
              key="recipes-panel"
              initial={{ opacity: 0, x: 32 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 32 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="w-[460px] shrink-0 sticky top-6"
            >
              <div className="glass border-white/5 p-7 relative max-h-[calc(100vh-120px)] flex flex-col">
                <button onClick={closePanel} className="absolute right-5 top-5 text-slate-500 hover:text-white transition-colors z-10">
                  <X size={20} />
                </button>

                {/* ── DETALLE ── */}
                {panel === PANEL.DETAIL && selectedRecipe && (
                  <>
                    <div className="mb-5 pb-4 border-b border-white/10">
                      <span className="px-3 py-1 rounded bg-brand-red/10 text-brand-red text-xs font-black tracking-widest">
                        {selectedRecipe.categoria}
                      </span>
                      <h2 className="text-3xl font-black text-white tracking-tighter mt-2">{selectedRecipe.nombre}</h2>
                      <p className="text-slate-500 text-xs font-black tracking-widest mt-1">Desglose de ingredientes y costos</p>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
                          {selectedRecipe.receta_componentes?.map((item, idx) => {
                            const isGeneric = !item.insumo_id && !!item.insumo_nombre_manual;
                            const normalizedComp = {
                              is_generic: isGeneric,
                              insumo_id: item.insumo_id,
                              insumo_nombre_manual: item.insumo_nombre_manual,
                              cantidad: item.cantidad
                            };
                            const itemCost = calcComponentCost(normalizedComp, inventory, genericOptions, mezclas);

                            return (
                              <div key={idx} className="flex justify-between items-center p-4 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 transition-colors">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center text-brand-red font-black text-sm">
                                    {idx + 1}
                                  </div>
                                  <div>
                                    <div className="font-black text-sm text-white">
                                      {item.insumo_nombre_manual || (item.insumos ? `${item.insumos.marca} (${item.insumos.presentacion})` : 'Insumo')}
                                    </div>
                                    <div className="text-xs text-slate-500 font-bold">{item.cantidad} {item.unidad}</div>
                                    {isGeneric && (() => {
                                      const comps = mezclas.filter(m => m.nombre_generico.toLowerCase() === item.insumo_nombre_manual?.toLowerCase());
                                      if (!comps.length) return null;
                                      const total = comps.reduce((s, m) => s + Number(m.cantidad), 0);
                                      return (
                                        <div className="mt-1 text-[9px] font-bold text-slate-400">
                                          └ {comps.map(m => `${m.insumos?.marca}: ~${(item.cantidad * Number(m.cantidad) / total).toFixed(1)}${item.unidad}`).join(' · ')}
                                        </div>
                                      );
                                    })()}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-sm font-black text-emerald-400">${itemCost.toFixed(2)}</div>
                                </div>
                              </div>
                            );
                          })}
                    </div>

                    <div className="mt-5 pt-4 border-t border-white/10 flex justify-between items-center">
                      <div>
                        <p className="text-xs font-black text-slate-500 tracking-widest">Total</p>
                        <p className="text-2xl font-black text-white tracking-tighter">${recipesWithCosts.find(r => r.id === selectedRecipe.id)?.dynamic_cost?.toFixed(2)}</p>
                      </div>
                      <div className="flex gap-3">
                        <button onClick={closePanel} className="btn-secondary text-sm px-5">Cerrar</button>
                        <button onClick={() => openEditor(selectedRecipe)} className="btn-primary text-sm px-6">
                          <Edit2 size={15} /> Editar
                        </button>
                      </div>
                    </div>
                  </>
                )}

                {/* ── EDITOR ── */}
                {panel === PANEL.EDITOR && (
                  <>
                    <div className="mb-5 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-brand-red flex items-center justify-center text-white shadow-lg shadow-brand-red/20">
                        <Settings size={22} />
                      </div>
                      <div>
                        <h2 className="text-xl font-black text-white tracking-tighter">
                          {editorData.id ? 'Editar receta' : 'Nueva fórmula'}
                        </h2>
                        <p className="text-slate-500 text-[10px] font-black tracking-widest">Insumos y proporciones</p>
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar space-y-5">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="col-span-2">
                          <label className="text-[10px] font-black text-slate-500 tracking-widest pl-1 block mb-2">Nombre de la Bebida</label>
                          <input type="text" placeholder="Ej: Michelada Clásica Pro" className="input-field font-black"
                            value={editorData.nombre} onChange={(e) => setEditorData({...editorData, nombre: e.target.value})} />
                        </div>
                        <div className="col-span-2">
                          <label className="text-[10px] font-black text-slate-500 tracking-widest pl-1 block mb-2">Categoría</label>
                          <select className="input-field bg-slate-800 font-bold tracking-widest cursor-pointer"
                            value={editorData.categoria} onChange={(e) => setEditorData({...editorData, categoria: e.target.value})}>
                            {categories.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between items-center px-1 mb-3">
                          <h3 className="text-xs font-black text-brand-red tracking-widest flex items-center gap-2">
                            <ShoppingBag size={13} /> Ingredientes
                          </h3>
                          <button onClick={handleAddComponent}
                            className="flex items-center gap-1.5 text-[10px] font-black text-emerald-400 hover:text-emerald-300 transition-colors tracking-widest">
                            <Plus size={13} /> Agregar
                          </button>
                        </div>

                        <div className="space-y-2">
                          {editorData.componentes.map((comp, idx) => {
                            const cost = calcComponentCost(comp, inventory, genericOptions);

                            const inventoryOptions = inventory.map(i => ({
                              value: i.id,
                              label: `${i.marca} (${i.presentacion}) — $${i.precio_promedio}`
                            }));

                            const mezclaNames = [...new Set(mezclas.map(m => m.nombre_generico))];
                            const mezclaOptions = mezclaNames.map(n => ({ value: n, label: n }));
                            const mezclaComps = comp.is_mezcla
                              ? mezclas.filter(m => m.nombre_generico === comp.insumo_nombre_manual)
                              : [];
                            const mezclaTotal = mezclaComps.reduce((s, m) => s + Number(m.cantidad), 0);

                            return (
                              <div key={idx} className="flex flex-col gap-2 p-3 bg-white/5 rounded-xl border border-white/5 group relative">
                                {/* Tipo */}
                                <div className="flex items-center gap-1.5">
                                  {[
                                    { key: 'specific', label: 'ESPECÍFICO', active: !comp.is_generic && !comp.is_mezcla },
                                    { key: 'generic',  label: 'GENÉRICO',   active: comp.is_generic },
                                    { key: 'mezcla',   label: 'MEZCLA',     active: comp.is_mezcla },
                                  ].map(btn => (
                                    <button key={btn.key} type="button"
                                      onClick={() => {
                                        if (btn.key === 'generic')  handleUpdateComponent(idx, 'is_generic', true);
                                        if (btn.key === 'mezcla')   handleUpdateComponent(idx, 'is_mezcla', true);
                                        if (btn.key === 'specific') {
                                          const newC = [...editorData.componentes];
                                          newC[idx] = { ...newC[idx], is_generic: false, is_mezcla: false, tipo_insumo: '', insumo_nombre_manual: '' };
                                          setEditorData(p => ({ ...p, componentes: newC }));
                                        }
                                      }}
                                      className={`px-2 py-0.5 rounded text-[9px] font-black tracking-widest transition-all ${
                                        btn.active
                                          ? btn.key === 'mezcla' ? 'bg-brand-teal text-black' : 'bg-brand-red text-white'
                                          : 'bg-slate-800 text-slate-500 hover:text-slate-300'
                                      }`}
                                    >
                                      {btn.label}
                                    </button>
                                  ))}
                                </div>

                                <div className="flex gap-2">
                                  <div className="flex-1">
                                    {comp.is_mezcla ? (
                                      <SearchableSelect
                                        options={mezclaOptions}
                                        value={comp.insumo_nombre_manual}
                                        onChange={(val) => handleUpdateComponent(idx, 'insumo_nombre_manual', val)}
                                        placeholder="Seleccionar mezcla..."
                                      />
                                    ) : comp.is_generic ? (
                                      <SearchableSelect
                                        options={genericOptions}
                                        value={comp.tipo_insumo}
                                        onChange={(val) => handleUpdateComponent(idx, 'tipo_insumo', val)}
                                        placeholder="Categoría (ej: Cerveza)..."
                                      />
                                    ) : (
                                      <SearchableSelect
                                        options={inventoryOptions}
                                        value={comp.insumo_id}
                                        onChange={(val) => handleUpdateComponent(idx, 'insumo_id', val)}
                                        placeholder="Buscar insumo..."
                                      />
                                    )}
                                  </div>
                                  <div className="w-20">
                                    <input type="number" placeholder="Cant." className="w-full bg-slate-900 border-none rounded-xl p-3 text-xs font-black text-center text-white"
                                      value={comp.cantidad} onChange={(e) => handleUpdateComponent(idx, 'cantidad', e.target.value)} />
                                  </div>
                                  <div className="w-20 flex items-center justify-center">
                                    <div className="text-sm font-black text-emerald-400">${cost.toFixed(2)}</div>
                                  </div>
                                </div>

                                {/* Preview desglose de mezcla */}
                                {comp.is_mezcla && mezclaComps.length > 0 && (
                                  <div className="mt-1 flex flex-wrap gap-1.5 px-1">
                                    {mezclaComps.map((m, i) => {
                                      const pct = mezclaTotal > 0 ? ((Number(m.cantidad) / mezclaTotal) * 100).toFixed(0) : 0;
                                      const qty = comp.cantidad ? (parseFloat(comp.cantidad) * Number(m.cantidad) / mezclaTotal).toFixed(1) : '—';
                                      return (
                                        <span key={i} className="text-[9px] font-bold text-slate-500 bg-brand-teal/5 border border-brand-teal/10 px-2 py-0.5 rounded-full">
                                          {m.insumos?.marca}: <span className="text-brand-teal">{qty} {comp.unidad}</span>
                                          <span className="text-slate-600 ml-1">({pct}%)</span>
                                        </span>
                                      );
                                    })}
                                  </div>
                                )}

                                <button onClick={() => handleRemoveComponent(idx)}
                                  className="absolute -right-2 -top-2 w-5 h-5 bg-slate-800 text-slate-500 hover:text-brand-red rounded-full flex items-center justify-center border border-white/10 opacity-0 group-hover:opacity-100 transition-all z-10">
                                  <X size={10} />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 pt-4 border-t border-white/10 flex justify-between items-center">
                      <div>
                        <span className="text-[10px] font-black text-slate-500 tracking-widest block">Costo Total</span>
                        <h4 className="text-3xl font-black text-emerald-400 tracking-tighter">${totalCost.toFixed(2)}</h4>
                      </div>
                      <div className="flex gap-3">
                        <button onClick={closePanel} className="btn-secondary text-sm px-5">Cerrar</button>
                        <button onClick={handleSaveRecipe} className="btn-primary text-sm px-7">
                          <Save size={15} /> Guardar
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default RecipesPage;
