import React, { useState, useEffect, useMemo } from 'react';
import {
  FlaskConical, Plus, Search, ChevronRight,
  Edit2, Trash2, X, Save, ShoppingCart, RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';

const TIPOS = [
  'Adicionales - dulces', 'Alcohol', 'Cerveza', 'Energizante',
  'Insumo secreto', 'Jarabe', 'MP indirecta', 'Otros',
  'Polvo para escarchar', 'Pulpa liquida', 'Pulpa para escarchar',
  'Refresco', 'Salsas', 'Vasos'
];

const EMPTY_INSUMO = {
  tipo_insumo: 'Alcohol', marca: '', presentacion: '', precio_promedio: '', ml_gr_pieza: ''
};

const fmt  = (n) => Number(n).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmt6 = (n) => Number(n).toFixed(6);

// Qué panel está abierto
const PANEL = { NONE: null, INSUMO: 'insumo' };

export default function InsumosPage() {
  const [insumos, setInsumos]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [expanded, setExpanded]   = useState({});
  const [panel, setPanel]         = useState(PANEL.NONE);

  // Insumo CRUD
  const [editingInsumo, setEditingInsumo] = useState(null);
  const [insumoForm, setInsumoForm]       = useState(EMPTY_INSUMO);
  const [savingInsumo, setSavingInsumo]   = useState(false);



  useEffect(() => { fetchInsumos(); }, []);

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

  const grouped = useMemo(() => {
    const g = {};
    insumos.forEach(i => {
      if (!g[i.tipo_insumo]) g[i.tipo_insumo] = [];
      g[i.tipo_insumo].push(i);
    });
    return g;
  }, [insumos]);

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
            onClick={openNewInsumo}
            className={`btn-primary px-5 py-2.5 text-sm font-black ${panel === PANEL.INSUMO && !editingInsumo ? 'ring-2 ring-brand-teal/50' : ''}`}
          >
            <Plus size={18} className="stroke-[3px]" />
            Nuevo Insumo
          </button>
        </div>
      </div>

      {/* ── SPLIT VIEW ── */}
      <div className="flex gap-5 items-start">

        {/* ── COLUMNA IZQUIERDA: acordeones ── */}
        <div className={`space-y-3 transition-all duration-300 ${panelOpen ? 'flex-1 min-w-0' : 'w-full'}`}>
          {Object.keys(grouped).sort().map((tipo) => {
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
          })}
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
              <div className="glass border-white/5 p-7 relative">

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
                        <select
                          required className="input-field"
                          value={insumoForm.tipo_insumo}
                          onChange={e => setInsumoForm(p => ({ ...p, tipo_insumo: e.target.value }))}
                        >
                          {TIPOS.map(t => <option key={t} value={t} className="bg-slate-900">{t}</option>)}
                        </select>
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



              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
