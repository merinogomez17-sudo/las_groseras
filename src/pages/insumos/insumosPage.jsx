import React, { useState, useEffect, useMemo } from 'react';
import {
  FlaskConical, Plus, Search, ChevronRight,
  Edit2, Trash2, X, Save, ShoppingCart, RefreshCw
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
        className="w-full bg-slate-900 rounded-xl flex items-center px-3 py-2 cursor-text border border-white/5 focus-within:border-brand-teal/50 transition-colors"
        onClick={() => setIsOpen(true)}
      >
        <Search size={13} className="text-slate-500 mr-2 shrink-0" />
        <input
          type="text"
          className="w-full bg-transparent border-none outline-none text-[11px] font-bold text-white placeholder:text-slate-500"
          placeholder={selectedOption ? '' : placeholder}
          value={isOpen ? search : displayValue}
          onChange={(e) => { setSearch(e.target.value); setIsOpen(true); }}
          onFocus={() => { setIsOpen(true); setSearch(''); }}
          onBlur={() => { setTimeout(() => setIsOpen(false), 200); }}
        />
        {value && !isOpen && (
          <button type="button"
            onClick={(e) => { e.stopPropagation(); onChange(''); setSearch(''); }}
            className="text-slate-500 hover:text-rose-500 ml-2 shrink-0">
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
              <div className="p-3 text-[11px] text-slate-500 text-center">No results</div>
            ) : filteredOptions.map(opt => (
              <div key={opt.value}
                className={`px-4 py-2 text-[11px] font-bold cursor-pointer hover:bg-white/10 transition-colors ${opt.value === value ? 'text-brand-teal bg-brand-teal/5' : 'text-white'}`}
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



const EMPTY_INSUMO = {
  tipo_insumo: 'Alcohol', marca: '', presentacion: '', precio_promedio: '', ml_gr_pieza: ''
};

const fmt  = (n) => Number(n).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmt6 = (n) => Number(n).toFixed(6);

// Qué panel está abierto
const PANEL = { NONE: null, INSUMO: 'insumo', MEZCLA: 'mezcla' };

export default function InsumosPage() {
  const [insumos, setInsumos]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [expanded, setExpanded]   = useState({});
  const [panel, setPanel]         = useState(PANEL.NONE);
  const [activeTab, setActiveTab] = useState('insumos'); // 'insumos' | 'mezclas'

  // Insumo CRUD
  const [editingInsumo, setEditingInsumo] = useState(null);
  const [insumoForm, setInsumoForm]       = useState(EMPTY_INSUMO);
  const [savingInsumo, setSavingInsumo]   = useState(false);

  // Mezclas CRUD
  const [mezclas, setMezclas]             = useState([]);
  const [genericosNames, setGenericosNames] = useState([]);
  const [editingMezcla, setEditingMezcla] = useState(null); // nombre_generico
  const [mezclaForm, setMezclaForm]       = useState({ nombre_generico: '', componentes: [{ insumo_id: '', cantidad: '' }] });
  const [savingMezcla, setSavingMezcla]   = useState(false);



  useEffect(() => { 
    fetchInsumos(); 
    fetchMezclas();
    fetchGenericosFromRecetas();
  }, []);

  const fetchInsumos = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('insumos').select('*').order('tipo_insumo').order('marca');
      if (error) throw error;
      setInsumos(data || []);
    } catch (e) {
      toast.error('Error al cargar insumos: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchMezclas = async () => {
    try {
      const { data, error } = await supabase
        .from('insumo_mezclas')
        .select('*, insumos(marca, tipo_insumo, precio_x_ml, ml_gr_pieza)')
        .order('nombre_generico');
      if (error) throw error;
      setMezclas(data || []);
    } catch (e) {
      console.error('Error mezclas:', e);
    }
  };

  const fetchGenericosFromRecetas = async () => {
    try {
      const { data, error } = await supabase
        .from('receta_componentes')
        .select('insumo_nombre_manual')
        .is('insumo_id', null)
        .not('insumo_nombre_manual', 'is', null);
      if (error) throw error;
      const uniqueNames = [...new Set(data.map(d => d.insumo_nombre_manual))].sort();
      setGenericosNames(uniqueNames);
    } catch (e) {
      console.error('Error genéricos:', e);
    }
  };

  const grouped = useMemo(() => {
    const g = {};
    insumos.forEach(i => {
      if (!g[i.tipo_insumo]) g[i.tipo_insumo] = [];
      g[i.tipo_insumo].push(i);
    });
    return g;
  }, [insumos]);

  const tiposExistentes = useMemo(() => 
    [...new Set(insumos.map(i => i.tipo_insumo).filter(Boolean))].sort()
  , [insumos]);

  const toggleTipo = (tipo) => setExpanded(p => ({ ...p, [tipo]: !p[tipo] }));

  // ── Panel helpers ────────────────────────────────────────────
  const closePanel = () => setPanel(PANEL.NONE);

  const openNewInsumo = () => {
    setEditingInsumo(null);
    setInsumoForm(EMPTY_INSUMO);
    setPanel(PANEL.INSUMO);
  };

  const openEditInsumo = (item) => {
    setEditingInsumo(item);
    setInsumoForm({
      tipo_insumo:     item.tipo_insumo,
      marca:           item.marca,
      presentacion:    item.presentacion,
      precio_promedio: item.precio_promedio,
      ml_gr_pieza:     item.ml_gr_pieza,
    });
    setPanel(PANEL.INSUMO);
  };



  // ── CRUD Insumo ──────────────────────────────────────────────
  const handleSaveInsumo = async (e) => {
    e.preventDefault();
    setSavingInsumo(true);
    const payload = {
      tipo_insumo:     insumoForm.tipo_insumo,
      marca:           insumoForm.marca.trim(),
      presentacion:    insumoForm.presentacion.trim(),
      precio_promedio: parseFloat(insumoForm.precio_promedio),
      ml_gr_pieza:     parseFloat(insumoForm.ml_gr_pieza),
    };
    try {
      if (editingInsumo) {
        const { error } = await supabase.from('insumos').update(payload).eq('id', editingInsumo.id);
        if (error) throw error;
        toast.success('Insumo actualizado');
      } else {
        const { error } = await supabase.from('insumos').insert([payload]);
        if (error) throw error;
        toast.success('Insumo creado');
      }
      closePanel();
      fetchInsumos();
    } catch (e) {
      toast.error('Error: ' + e.message);
    } finally {
      setSavingInsumo(false);
    }
  };

  const handleDeleteInsumo = async (id) => {
    if (!window.confirm('¿Eliminar este insumo del catálogo?')) return;
    try {
      const { error } = await supabase.from('insumos').delete().eq('id', id);
      if (error) throw error;
      toast.success('Insumo eliminado');
      fetchInsumos();
    } catch (e) {
      toast.error('Error: ' + e.message);
    }
  };

  const openNewMezcla = () => {
    setEditingMezcla(null);
    setMezclaForm({ nombre_generico: '', componentes: [{ insumo_id: '', cantidad: '' }] });
    setPanel(PANEL.MEZCLA);
  };

  const openEditMezcla = (nombreGenerico, items) => {
    setEditingMezcla(nombreGenerico);
    setMezclaForm({
      nombre_generico: nombreGenerico,
      componentes: items.map(m => ({ insumo_id: m.insumo_id, cantidad: m.cantidad }))
    });
    setPanel(PANEL.MEZCLA);
  };

  // ── CRUD Mezclas ──────────────────────────────────────────────
  const handleSaveMezcla = async (e) => {
    e.preventDefault();
    if (mezclaForm.componentes.some(c => !c.insumo_id || !c.cantidad || Number(c.cantidad) <= 0)) {
      toast.error('Todos los componentes deben tener insumo y cantidad mayor a 0');
      return;
    }

    setSavingMezcla(true);
    try {
      // 1. Limpiar anteriores
      await supabase.from('insumo_mezclas').delete().eq('nombre_generico', mezclaForm.nombre_generico);

      // 2. Insertar nuevos
      const payload = mezclaForm.componentes.map(c => ({
        nombre_generico: mezclaForm.nombre_generico,
        insumo_id: c.insumo_id,
        cantidad: Number(c.cantidad)
      }));

      const { error } = await supabase.from('insumo_mezclas').insert(payload);
      if (error) throw error;

      toast.success('Mezcla guardada');
      closePanel();
      fetchMezclas();
    } catch (e) {
      toast.error('Error: ' + e.message);
    } finally {
      setSavingMezcla(false);
    }
  };

  const handleDeleteMezcla = async (nombreGenerico) => {
    if (!window.confirm(`¿Eliminar el desglose completo de "${nombreGenerico}"?`)) return;
    try {
      const { error } = await supabase.from('insumo_mezclas').delete().eq('nombre_generico', nombreGenerico);
      if (error) throw error;
      toast.success('Mezcla eliminada');
      fetchMezclas();
    } catch (e) {
      toast.error('Error: ' + e.message);
    }
  };

  const mezclasGrouped = useMemo(() => {
    const g = {};
    mezclas.forEach(m => {
      if (!g[m.nombre_generico]) g[m.nombre_generico] = [];
      g[m.nombre_generico].push(m);
    });
    return g;
  }, [mezclas]);





  const precioXmlPreview = useMemo(() => {
    const p = parseFloat(insumoForm.precio_promedio);
    const m = parseFloat(insumoForm.ml_gr_pieza);
    return p > 0 && m > 0 ? (p / m).toFixed(6) : '—';
  }, [insumoForm.precio_promedio, insumoForm.ml_gr_pieza]);

  if (loading) return (
    <div className="h-full flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-brand-teal border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const panelOpen = panel !== PANEL.NONE;

  return (
    <div className="space-y-6">

      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4
                      bg-slate-900/40 p-6 rounded-3xl border border-white/5 backdrop-blur-md">
        <div>
          <h1 className="lobster text-3xl text-white flex items-center gap-3">
            <FlaskConical className="text-brand-teal" size={30} />
            Costo de Insumos
          </h1>
          <p className="text-slate-500 text-sm font-bold tracking-[0.15em] mt-1">
            Catálogo de precios y costo por unidad mínima
          </p>
        </div>
        <div className="flex gap-3">
          <button onClick={fetchInsumos} className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl text-slate-400 transition-all">
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>

          <button
            onClick={activeTab === 'insumos' ? openNewInsumo : openNewMezcla}
            className={`btn-primary px-5 py-2.5 text-sm font-black transition-all`}
          >
            <Plus size={18} className="stroke-[3px]" />
            {activeTab === 'insumos' ? 'Nuevo Insumo' : 'Nueva Mezcla'}
          </button>
        </div>
      </div>

      {/* ── TABS ── */}
      <div className="flex gap-2 p-1 bg-slate-900/40 rounded-2xl border border-white/5 w-fit">
        <button
          onClick={() => { setActiveTab('insumos'); closePanel(); }}
          className={`px-6 py-2 rounded-xl text-[11px] font-black tracking-widest uppercase transition-all
            ${activeTab === 'insumos' ? 'bg-brand-teal text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
        >
          Catálogo Insumos
        </button>
        <button
          onClick={() => { setActiveTab('mezclas'); closePanel(); }}
          className={`px-6 py-2 rounded-xl text-[11px] font-black tracking-widest uppercase transition-all
            ${activeTab === 'mezclas' ? 'bg-brand-teal text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
        >
          Mezclas (Genéricos)
        </button>
      </div>

      {/* ── SPLIT VIEW ── */}
      <div className="flex gap-5 items-start">

        {/* ── COLUMNA IZQUIERDA: acordeones ── */}
        <div className={`space-y-3 transition-all duration-300 ${panelOpen ? 'flex-1 min-w-0' : 'w-full'}`}>
          {activeTab === 'insumos' ? (
            Object.keys(grouped).sort().map((tipo) => {
              const items  = grouped[tipo];
              const isOpen = !!expanded[tipo];
              return (
                <div key={tipo} className="glass border-white/5 overflow-hidden">
                  <button
                    onClick={() => toggleTipo(tipo)}
                    className="w-full flex items-center justify-between px-6 py-4 hover:bg-white/5 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-brand-teal" />
                      <span className="text-base font-black text-slate-200 group-hover:text-brand-teal transition-colors tracking-wide">
                        {tipo}
                      </span>
                      <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-brand-teal/10 text-brand-teal border border-brand-teal/20">
                        {items.length}
                      </span>
                    </div>
                    <motion.div animate={{ rotate: isOpen ? 90 : 0 }} transition={{ duration: 0.2 }}>
                      <ChevronRight size={18} className="text-slate-500 group-hover:text-brand-teal transition-colors" />
                    </motion.div>
                  </button>

                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: 'easeInOut' }}
                        className="overflow-hidden"
                      >
                        <div className="border-t border-white/5 overflow-x-auto">
                          <table className="w-full text-left">
                            <thead className="bg-white/[0.02]">
                              <tr>
                                <th className="px-6 py-3 text-xs font-black tracking-widest text-slate-500">Marca</th>
                                {!panelOpen && <th className="px-6 py-3 text-xs font-black tracking-widest text-slate-500">Presentación</th>}
                                <th className="px-6 py-3 text-xs font-black tracking-widest text-slate-500 text-right">Precio Prom.</th>
                                {!panelOpen && <th className="px-6 py-3 text-xs font-black tracking-widest text-slate-500 text-right">ML / GR / Pza</th>}
                                <th className="px-6 py-3 text-xs font-black tracking-widest text-slate-500 text-right">$/ML</th>
                                <th className="px-6 py-3 text-xs font-black tracking-widest text-slate-500 text-right">Acciones</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-white/[0.03]">
                              {items.map((item) => (
                                <motion.tr
                                  key={item.id}
                                  initial={{ opacity: 0, x: -8 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  className={`hover:bg-white/[0.03] transition-colors group/row
                                    ${editingInsumo?.id === item.id ? 'bg-brand-teal/5' : ''}`}
                                >
                                  <td className="px-6 py-3.5 text-sm font-bold text-slate-200">{item.marca}</td>
                                  {!panelOpen && <td className="px-6 py-3.5 text-sm text-slate-400">{item.presentacion}</td>}
                                  <td className="px-6 py-3.5 text-sm font-black text-emerald-400 text-right">
                                    ${fmt(item.precio_promedio)}
                                  </td>
                                  {!panelOpen && (
                                    <td className="px-6 py-3.5 text-sm text-slate-400 text-right">
                                      {Number(item.ml_gr_pieza).toLocaleString()}
                                    </td>
                                  )}
                                  <td className="px-6 py-3.5 text-sm font-bold text-brand-teal text-right">
                                    ${fmt6(item.precio_x_ml)}
                                  </td>
                                  <td className="px-6 py-3.5 text-right">
                                    <div className="flex justify-end gap-1 opacity-0 group-hover/row:opacity-100 transition-opacity">
                                      <button
                                        onClick={() => openEditInsumo(item)}
                                        className="p-1.5 hover:bg-emerald-500/10 rounded-lg text-emerald-400/60 hover:text-emerald-400 transition-colors"
                                      >
                                        <Edit2 size={14} />
                                      </button>
                                      <button
                                        onClick={() => handleDeleteInsumo(item.id)}
                                        className="p-1.5 hover:bg-rose-500/10 rounded-lg text-rose-400/60 hover:text-rose-400 transition-colors"
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    </div>
                                  </td>
                                </motion.tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })
          ) : (
            Object.keys(mezclasGrouped).sort().map((nombreGen) => {
              const components = mezclasGrouped[nombreGen];
              const totalCantidad = components.reduce((acc, curr) => acc + Number(curr.cantidad), 0);
              return (
                <div key={nombreGen} className="glass border-white/5 p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-black text-white tracking-tight">{nombreGen}</h3>
                      <span className="text-[9px] font-black bg-white/5 text-slate-500 px-2 py-0.5 rounded-full border border-white/5 uppercase tracking-widest">
                        Total: {totalCantidad} unidades
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {components.map((c, idx) => {
                        const pct = totalCantidad > 0 ? ((Number(c.cantidad) / totalCantidad) * 100).toFixed(1) : 0;
                        return (
                          <span key={idx} className="text-[10px] font-bold text-slate-400 bg-white/5 px-2 py-1 rounded-lg">
                            {c.insumos?.marca}: <span className="text-brand-teal">{c.cantidad}</span>
                            <span className="text-slate-600 ml-1">({pct}%)</span>
                          </span>
                        );
                      })}
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => openEditMezcla(nombreGen, components)}
                      className="p-2.5 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 rounded-xl transition-all"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDeleteMezcla(nombreGen)}
                      className="p-2.5 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 rounded-xl transition-all"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
          {activeTab === 'mezclas' && Object.keys(mezclasGrouped).length === 0 && (
            <div className="py-20 text-center">
              <FlaskConical size={48} className="mx-auto text-slate-700 mb-4" />
              <p className="text-slate-500 font-bold">No hay mezclas definidas para genéricos.</p>
              <button onClick={openNewMezcla} className="text-brand-teal text-xs font-black mt-2 underline">Crear la primera mezcla</button>
            </div>
          )}
        </div>

        {/* ── PANEL DERECHO ── */}
        <AnimatePresence>
          {panelOpen && (
            <motion.div
              key="side-panel"
              initial={{ opacity: 0, x: 32 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 32 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="w-[400px] shrink-0 sticky top-6"
            >
              <div className="glass border-white/5 p-7 relative max-h-[calc(100vh-6rem)] overflow-y-auto custom-scrollbar">

                {/* Cerrar */}
                <button
                  onClick={closePanel}
                  className="absolute right-5 top-5 text-slate-500 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>

                {/* ── Contenido: Insumo ── */}
                {panel === PANEL.INSUMO && (
                  <>
                    <h2 className="text-xl font-black text-white tracking-tighter mb-1 flex items-center gap-3">
                      {editingInsumo
                        ? <Edit2 size={20} className="text-emerald-400" />
                        : <Plus size={20} className="text-brand-teal" />}
                      {editingInsumo ? 'Editar insumo' : 'Nuevo insumo'}
                    </h2>
                    <p className="text-slate-500 text-xs font-bold tracking-widest mb-6">
                      Catálogo de costo de insumos
                    </p>

                    <form onSubmit={handleSaveInsumo} className="space-y-4">
                      <div>
                        <label className="block text-xs font-black text-slate-500 tracking-widest mb-2">Tipo de Insumo</label>
                        <input
                          required
                          list="tipos-insumo-list"
                          className="input-field"
                          placeholder="Selecciona o escribe un tipo nuevo..."
                          value={insumoForm.tipo_insumo}
                          onChange={e => setInsumoForm(p => ({ ...p, tipo_insumo: e.target.value }))}
                        />
                        <datalist id="tipos-insumo-list">
                          {tiposExistentes.map(t => <option key={t} value={t} />)}
                        </datalist>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-black text-slate-500 tracking-widest mb-2">Marca</label>
                          <input required type="text" placeholder="Ej: Bacardi" className="input-field"
                            value={insumoForm.marca}
                            onChange={e => setInsumoForm(p => ({ ...p, marca: e.target.value }))} />
                        </div>
                        <div>
                          <label className="block text-xs font-black text-slate-500 tracking-widest mb-2">Presentación</label>
                          <input required type="text" placeholder="Ej: Botella 700 ml" className="input-field"
                            value={insumoForm.presentacion}
                            onChange={e => setInsumoForm(p => ({ ...p, presentacion: e.target.value }))} />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-black text-slate-500 tracking-widest mb-2">Precio Promedio ($)</label>
                          <input required type="number" step="0.01" min="0" placeholder="0.00" className="input-field"
                            value={insumoForm.precio_promedio}
                            onChange={e => setInsumoForm(p => ({ ...p, precio_promedio: e.target.value }))} />
                        </div>
                        <div>
                          <label className="block text-xs font-black text-slate-500 tracking-widest mb-2">ML / GR / Pieza</label>
                          <input required type="number" step="0.01" min="0.01" placeholder="0" className="input-field"
                            value={insumoForm.ml_gr_pieza}
                            onChange={e => setInsumoForm(p => ({ ...p, ml_gr_pieza: e.target.value }))} />
                        </div>
                      </div>

                      <div className="flex justify-between items-center px-4 py-3 rounded-xl bg-brand-teal/5 border border-brand-teal/20">
                        <span className="text-xs font-black text-slate-500 tracking-widest">PRECIO × ML / GR / PZA</span>
                        <span className="text-base font-black text-brand-teal">${precioXmlPreview}</span>
                      </div>

                      <div className="flex justify-end gap-3 pt-1">
                        <button type="button" onClick={closePanel} className="btn-secondary text-sm px-5">Cancelar</button>
                        <button type="submit" disabled={savingInsumo} className="btn-primary text-sm px-7">
                          <Save size={15} />
                          {savingInsumo ? 'Guardando...' : editingInsumo ? 'Actualizar' : 'Crear'}
                        </button>
                      </div>
                    </form>
                  </>
                )}

                {/* ── Contenido: Mezcla ── */}
                {panel === PANEL.MEZCLA && (
                  <>
                    <h2 className="text-xl font-black text-white tracking-tighter mb-1 flex items-center gap-3">
                      <RefreshCw size={20} className="text-brand-teal" />
                      {editingMezcla ? 'Editar desglose' : 'Nuevo desglose'}
                    </h2>
                    <p className="text-slate-500 text-xs font-bold tracking-widest mb-6">
                      Ingresa la cantidad real de cada insumo — el sistema calcula la proporción
                    </p>

                    <form onSubmit={handleSaveMezcla} className="space-y-6">
                      <div>
                        <label className="block text-xs font-black text-slate-500 tracking-widest mb-2 uppercase">Nombre Genérico</label>
                        <input
                          required
                          list="genericos-list"
                          placeholder="Ej: Salsas negras"
                          className="input-field"
                          value={mezclaForm.nombre_generico}
                          onChange={e => setMezclaForm(p => ({ ...p, nombre_generico: e.target.value }))}
                        />
                        <datalist id="genericos-list">
                          {genericosNames.map(g => <option key={g} value={g} />)}
                        </datalist>
                      </div>

                      <div className="space-y-3">
                        <div className="flex justify-between items-center px-1">
                          <label className="text-xs font-black text-slate-500 tracking-widest uppercase">Componentes</label>
                          {mezclaForm.componentes.length > 0 && (
                            <span className="text-[10px] font-black text-slate-600">
                              Total: {mezclaForm.componentes.reduce((acc, c) => acc + Number(c.cantidad || 0), 0)} unidades
                            </span>
                          )}
                        </div>

                        {mezclaForm.componentes.map((comp, idx) => (
                          <div key={idx} className="flex gap-2 items-start">
                            <div className="flex-1">
                              <SearchableSelect
                                placeholder="Elegir insumo..."
                                value={comp.insumo_id}
                                options={insumos.map(i => ({ value: i.id, label: `${i.marca} (${i.tipo_insumo})` }))}
                                onChange={(val) => {
                                  const newC = [...mezclaForm.componentes];
                                  newC[idx].insumo_id = val;
                                  setMezclaForm(p => ({ ...p, componentes: newC }));
                                }}
                              />
                            </div>
                            <div className="w-24">
                              <input
                                required type="number" step="0.01" min="0.01"
                                placeholder="Cant."
                                className="input-field text-center font-black text-brand-teal"
                                value={comp.cantidad}
                                onChange={(e) => {
                                  const newC = [...mezclaForm.componentes];
                                  newC[idx].cantidad = e.target.value;
                                  setMezclaForm(p => ({ ...p, componentes: newC }));
                                }}
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                if (mezclaForm.componentes.length === 1) return;
                                const newC = mezclaForm.componentes.filter((_, i) => i !== idx);
                                setMezclaForm(p => ({ ...p, componentes: newC }));
                              }}
                              className="p-3 bg-white/5 text-rose-500/50 hover:text-rose-500 rounded-xl"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))}

                        <button
                          type="button"
                          onClick={() => setMezclaForm(p => ({ ...p, componentes: [...p.componentes, { insumo_id: '', cantidad: '' }] }))}
                          className="w-full py-3 border border-dashed border-white/10 rounded-xl text-[10px] font-black text-slate-500 hover:text-brand-teal hover:border-brand-teal/30 transition-all uppercase tracking-widest"
                        >
                          + Agregar insumo a la mezcla
                        </button>
                      </div>

                      <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                        <button type="button" onClick={closePanel} className="btn-secondary text-sm px-5">Cancelar</button>
                        <button type="submit" disabled={savingMezcla} className="btn-primary text-sm px-7">
                          <Save size={15} />
                          {savingMezcla ? 'Guardando...' : 'Guardar Mezcla'}
                        </button>
                      </div>
                    </form>
                  </>
                )}



              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
