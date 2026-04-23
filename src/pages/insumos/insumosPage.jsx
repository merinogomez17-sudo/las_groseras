import React, { useState, useEffect, useMemo } from 'react';
import {
  FlaskConical, Plus, Search, ChevronDown, ChevronRight,
  Edit2, Trash2, X, Save, ShoppingCart, RefreshCw, Package
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

const fmt = (n) => Number(n).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmt6 = (n) => Number(n).toFixed(6);

export default function InsumosPage() {
  const [insumos, setInsumos]           = useState([]);
  const [loading, setLoading]           = useState(true);
  const [expanded, setExpanded]         = useState({});

  // Modal: insumo CRUD
  const [isInsumoOpen, setIsInsumoOpen] = useState(false);
  const [editingInsumo, setEditingInsumo] = useState(null);
  const [insumoForm, setInsumoForm]     = useState(EMPTY_INSUMO);
  const [savingInsumo, setSavingInsumo] = useState(false);

  // Modal: registrar compra
  const [isCompraOpen, setIsCompraOpen] = useState(false);
  const [compraSearch, setCompraSearch] = useState('');
  const [selectedInsumo, setSelectedInsumo] = useState(null);
  const [showNewInComp, setShowNewInComp] = useState(false);
  const [compraForm, setCompraForm]     = useState({ cantidad_comprada: '', precio_total_compra: '', fecha_compra: new Date().toISOString().split('T')[0] });
  const [savingCompra, setSavingCompra] = useState(false);

  useEffect(() => { fetchInsumos(); }, []);

  const fetchInsumos = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('insumos')
        .select('*')
        .order('tipo_insumo')
        .order('marca');
      if (error) throw error;
      setInsumos(data || []);
    } catch (e) {
      toast.error('Error al cargar insumos: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Agrupación por tipo ──────────────────────────────────────
  const grouped = useMemo(() => {
    const g = {};
    insumos.forEach(i => {
      if (!g[i.tipo_insumo]) g[i.tipo_insumo] = [];
      g[i.tipo_insumo].push(i);
    });
    return g;
  }, [insumos]);

  const toggleTipo = (tipo) => setExpanded(p => ({ ...p, [tipo]: !p[tipo] }));

  // ── CRUD Insumo ──────────────────────────────────────────────
  const openNewInsumo = () => {
    setEditingInsumo(null);
    setInsumoForm(EMPTY_INSUMO);
    setIsInsumoOpen(true);
  };

  const openEditInsumo = (item) => {
    setEditingInsumo(item);
    setInsumoForm({
      tipo_insumo:    item.tipo_insumo,
      marca:          item.marca,
      presentacion:   item.presentacion,
      precio_promedio: item.precio_promedio,
      ml_gr_pieza:    item.ml_gr_pieza,
    });
    setIsInsumoOpen(true);
  };

  const handleSaveInsumo = async (e) => {
    e.preventDefault();
    setSavingInsumo(true);
    const payload = {
      tipo_insumo:    insumoForm.tipo_insumo,
      marca:          insumoForm.marca.trim(),
      presentacion:   insumoForm.presentacion.trim(),
      precio_promedio: parseFloat(insumoForm.precio_promedio),
      ml_gr_pieza:    parseFloat(insumoForm.ml_gr_pieza),
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
      setIsInsumoOpen(false);
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

  // ── Registrar Compra ─────────────────────────────────────────
  const openCompra = () => {
    setCompraSearch('');
    setSelectedInsumo(null);
    setShowNewInComp(false);
    setInsumoForm(EMPTY_INSUMO);
    setCompraForm({ cantidad_comprada: '', precio_total_compra: '', fecha_compra: new Date().toISOString().split('T')[0] });
    setIsCompraOpen(true);
  };

  const searchResults = useMemo(() => {
    if (!compraSearch || compraSearch.length < 2) return [];
    const q = compraSearch.toLowerCase();
    return insumos.filter(i =>
      i.marca.toLowerCase().includes(q) ||
      i.tipo_insumo.toLowerCase().includes(q) ||
      i.presentacion.toLowerCase().includes(q)
    ).slice(0, 8);
  }, [compraSearch, insumos]);

  const handleSaveCompra = async (e) => {
    e.preventDefault();
    setSavingCompra(true);
    try {
      let insumoId = selectedInsumo?.id;

      // Si es insumo nuevo dentro del modal de compra, primero lo creamos
      if (showNewInComp) {
        const payload = {
          tipo_insumo:     insumoForm.tipo_insumo,
          marca:           insumoForm.marca.trim(),
          presentacion:    insumoForm.presentacion.trim(),
          precio_promedio: parseFloat(insumoForm.precio_promedio) || 0,
          ml_gr_pieza:     parseFloat(insumoForm.ml_gr_pieza),
        };
        const { data, error } = await supabase.from('insumos').insert([payload]).select().single();
        if (error) throw error;
        insumoId = data.id;
      }

      const { error } = await supabase.from('compras').insert([{
        insumo_id:           insumoId,
        fecha_compra:        compraForm.fecha_compra,
        cantidad_comprada:   parseFloat(compraForm.cantidad_comprada),
        precio_total_compra: parseFloat(compraForm.precio_total_compra),
      }]);
      if (error) throw error;

      toast.success('Compra registrada y precio promedio actualizado');
      setIsCompraOpen(false);
      fetchInsumos();
    } catch (e) {
      toast.error('Error: ' + e.message);
    } finally {
      setSavingCompra(false);
    }
  };

  // ── Precio x ML preview en formulario ───────────────────────
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
          <button onClick={openCompra} className="btn-secondary px-5 py-2.5 text-sm font-black">
            <ShoppingCart size={18} />
            Registrar Compra
          </button>
          <button onClick={openNewInsumo} className="btn-primary px-5 py-2.5 text-sm font-black">
            <Plus size={18} className="stroke-[3px]" />
            Nuevo Insumo
          </button>
        </div>
      </div>

      {/* ── ACORDEONES POR TIPO ── */}
      <div className="space-y-3">
        {Object.keys(grouped).sort().map((tipo) => {
          const items = grouped[tipo];
          const isOpen = !!expanded[tipo];
          return (
            <div key={tipo} className="glass border-white/5 overflow-hidden">

              {/* Cabecera del grupo */}
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

              {/* Tabla desplegable */}
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: 'easeInOut' }}
                    className="overflow-hidden"
                  >
                    <div className="border-t border-white/5">
                      <table className="w-full text-left">
                        <thead className="bg-white/[0.02]">
                          <tr>
                            <th className="px-6 py-3 text-xs font-black tracking-widest text-slate-500">Marca</th>
                            <th className="px-6 py-3 text-xs font-black tracking-widest text-slate-500">Presentación</th>
                            <th className="px-6 py-3 text-xs font-black tracking-widest text-slate-500 text-right">Precio Promedio</th>
                            <th className="px-6 py-3 text-xs font-black tracking-widest text-slate-500 text-right">ML / GR / Pieza</th>
                            <th className="px-6 py-3 text-xs font-black tracking-widest text-slate-500 text-right">Precio x ML</th>
                            <th className="px-6 py-3 text-xs font-black tracking-widest text-slate-500 text-right">Acciones</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.03]">
                          {items.map((item) => (
                            <motion.tr
                              key={item.id}
                              initial={{ opacity: 0, x: -8 }}
                              animate={{ opacity: 1, x: 0 }}
                              className="hover:bg-white/[0.03] transition-colors group/row"
                            >
                              <td className="px-6 py-3.5 text-sm font-bold text-slate-200">{item.marca}</td>
                              <td className="px-6 py-3.5 text-sm text-slate-400">{item.presentacion}</td>
                              <td className="px-6 py-3.5 text-sm font-black text-emerald-400 text-right">
                                ${fmt(item.precio_promedio)}
                              </td>
                              <td className="px-6 py-3.5 text-sm text-slate-400 text-right">
                                {Number(item.ml_gr_pieza).toLocaleString()}
                              </td>
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

      {/* ══ MODAL: INSUMO CRUD ══════════════════════════════════ */}
      <AnimatePresence>
        {isInsumoOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="glass max-w-lg w-full p-8 relative"
            >
              <button onClick={() => setIsInsumoOpen(false)} className="absolute right-5 top-5 text-slate-500 hover:text-white transition-colors">
                <X size={22} />
              </button>

              <h2 className="text-2xl font-black text-white tracking-tighter mb-1 flex items-center gap-3">
                {editingInsumo ? <Edit2 size={22} className="text-emerald-400" /> : <Plus size={22} className="text-brand-teal" />}
                {editingInsumo ? 'Editar insumo' : 'Nuevo insumo'}
              </h2>
              <p className="text-slate-500 text-xs font-bold tracking-widest mb-7">Catálogo de costo de insumos</p>

              <form onSubmit={handleSaveInsumo} className="space-y-5">

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

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black text-slate-500 tracking-widest mb-2">Marca</label>
                    <input required type="text" placeholder="Ej: Bacardi" className="input-field"
                      value={insumoForm.marca} onChange={e => setInsumoForm(p => ({ ...p, marca: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-500 tracking-widest mb-2">Presentación</label>
                    <input required type="text" placeholder="Ej: Botella 700 ml" className="input-field"
                      value={insumoForm.presentacion} onChange={e => setInsumoForm(p => ({ ...p, presentacion: e.target.value }))} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black text-slate-500 tracking-widest mb-2">Precio Promedio ($)</label>
                    <input required type="number" step="0.01" min="0" placeholder="0.00" className="input-field"
                      value={insumoForm.precio_promedio} onChange={e => setInsumoForm(p => ({ ...p, precio_promedio: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-500 tracking-widest mb-2">ML / GR / Pieza</label>
                    <input required type="number" step="0.01" min="0.01" placeholder="0" className="input-field"
                      value={insumoForm.ml_gr_pieza} onChange={e => setInsumoForm(p => ({ ...p, ml_gr_pieza: e.target.value }))} />
                  </div>
                </div>

                {/* Preview precio x ml */}
                <div className="flex justify-between items-center px-4 py-3 rounded-xl bg-brand-teal/5 border border-brand-teal/20">
                  <span className="text-xs font-black text-slate-500 tracking-widest">PRECIO × ML / GR / PZA</span>
                  <span className="text-base font-black text-brand-teal">${precioXmlPreview}</span>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setIsInsumoOpen(false)} className="btn-secondary text-sm px-6">Cancelar</button>
                  <button type="submit" disabled={savingInsumo} className="btn-primary text-sm px-8">
                    <Save size={16} />
                    {savingInsumo ? 'Guardando...' : editingInsumo ? 'Actualizar' : 'Crear'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ══ MODAL: REGISTRAR COMPRA ═════════════════════════════ */}
      <AnimatePresence>
        {isCompraOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="glass max-w-lg w-full p-8 relative max-h-[90vh] overflow-y-auto custom-scrollbar"
            >
              <button onClick={() => setIsCompraOpen(false)} className="absolute right-5 top-5 text-slate-500 hover:text-white transition-colors">
                <X size={22} />
              </button>

              <h2 className="text-2xl font-black text-white tracking-tighter mb-1 flex items-center gap-3">
                <ShoppingCart size={22} className="text-brand-yellow" />
                Registrar Compra
              </h2>
              <p className="text-slate-500 text-xs font-bold tracking-widest mb-6">
                Actualiza el precio promedio al registrar cada compra
              </p>

              <form onSubmit={handleSaveCompra} className="space-y-5">

                {/* Toggle: insumo existente vs nuevo */}
                <div className="flex gap-2 p-1 bg-white/5 rounded-xl border border-white/5">
                  <button type="button"
                    onClick={() => { setShowNewInComp(false); setSelectedInsumo(null); setCompraSearch(''); }}
                    className={`flex-1 py-2 rounded-lg text-xs font-black tracking-widest transition-all ${!showNewInComp ? 'bg-brand-teal text-black' : 'text-slate-400 hover:text-slate-200'}`}>
                    INSUMO EXISTENTE
                  </button>
                  <button type="button"
                    onClick={() => { setShowNewInComp(true); setSelectedInsumo(null); setCompraSearch(''); setInsumoForm(EMPTY_INSUMO); }}
                    className={`flex-1 py-2 rounded-lg text-xs font-black tracking-widest transition-all ${showNewInComp ? 'bg-brand-yellow text-black' : 'text-slate-400 hover:text-slate-200'}`}>
                    INSUMO NUEVO
                  </button>
                </div>

                {/* ── Insumo existente ── */}
                {!showNewInComp && (
                  <div className="space-y-3">
                    <div className="relative">
                      <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input
                        type="text" placeholder="Buscar por marca, tipo o presentación..."
                        className="input-field pl-10"
                        value={compraSearch}
                        onChange={e => { setCompraSearch(e.target.value); setSelectedInsumo(null); }}
                      />
                    </div>

                    {/* Resultados */}
                    {searchResults.length > 0 && !selectedInsumo && (
                      <div className="rounded-xl border border-white/10 overflow-hidden">
                        {searchResults.map(item => (
                          <button key={item.id} type="button"
                            onClick={() => { setSelectedInsumo(item); setCompraSearch(`${item.marca} — ${item.presentacion}`); }}
                            className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors text-left border-b border-white/5 last:border-0"
                          >
                            <div>
                              <p className="text-sm font-bold text-slate-200">{item.marca}</p>
                              <p className="text-xs text-slate-500">{item.tipo_insumo} · {item.presentacion}</p>
                            </div>
                            <span className="text-sm font-black text-emerald-400">${fmt(item.precio_promedio)}</span>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Insumo seleccionado */}
                    {selectedInsumo && (
                      <div className="px-4 py-3 rounded-xl bg-brand-teal/5 border border-brand-teal/20 flex justify-between items-center">
                        <div>
                          <p className="text-sm font-black text-slate-200">{selectedInsumo.marca}</p>
                          <p className="text-xs text-slate-500">{selectedInsumo.tipo_insumo} · {selectedInsumo.presentacion}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-slate-500">Precio actual</p>
                          <p className="text-sm font-black text-emerald-400">${fmt(selectedInsumo.precio_promedio)}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ── Insumo nuevo ── */}
                {showNewInComp && (
                  <div className="space-y-4 p-4 rounded-xl bg-white/[0.02] border border-white/5">
                    <p className="text-xs font-black text-brand-yellow tracking-widest">DATOS DEL NUEVO INSUMO</p>

                    <div>
                      <label className="block text-xs font-black text-slate-500 tracking-widest mb-2">Tipo de Insumo</label>
                      <select required className="input-field" value={insumoForm.tipo_insumo}
                        onChange={e => setInsumoForm(p => ({ ...p, tipo_insumo: e.target.value }))}>
                        {TIPOS.map(t => <option key={t} value={t} className="bg-slate-900">{t}</option>)}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-black text-slate-500 tracking-widest mb-2">Marca</label>
                        <input required type="text" placeholder="Ej: Bacardi" className="input-field"
                          value={insumoForm.marca} onChange={e => setInsumoForm(p => ({ ...p, marca: e.target.value }))} />
                      </div>
                      <div>
                        <label className="block text-xs font-black text-slate-500 tracking-widest mb-2">Presentación</label>
                        <input required type="text" placeholder="Ej: Botella 750 ml" className="input-field"
                          value={insumoForm.presentacion} onChange={e => setInsumoForm(p => ({ ...p, presentacion: e.target.value }))} />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-black text-slate-500 tracking-widest mb-2">ML / GR / Pieza</label>
                      <input required type="number" step="0.01" min="0.01" placeholder="0" className="input-field"
                        value={insumoForm.ml_gr_pieza} onChange={e => setInsumoForm(p => ({ ...p, ml_gr_pieza: e.target.value }))} />
                    </div>
                  </div>
                )}

                {/* ── Datos de la compra ── */}
                {(selectedInsumo || showNewInComp) && (
                  <div className="space-y-4 p-4 rounded-xl bg-brand-yellow/5 border border-brand-yellow/20">
                    <p className="text-xs font-black text-brand-yellow tracking-widest">DATOS DE LA COMPRA</p>

                    <div>
                      <label className="block text-xs font-black text-slate-500 tracking-widest mb-2">Fecha de Compra</label>
                      <input type="date" required className="input-field"
                        value={compraForm.fecha_compra}
                        onChange={e => setCompraForm(p => ({ ...p, fecha_compra: e.target.value }))} />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-black text-slate-500 tracking-widest mb-2">Cantidad Comprada</label>
                        <input required type="number" step="0.01" min="0.01" placeholder="1" className="input-field"
                          value={compraForm.cantidad_comprada}
                          onChange={e => setCompraForm(p => ({ ...p, cantidad_comprada: e.target.value }))} />
                      </div>
                      <div>
                        <label className="block text-xs font-black text-slate-500 tracking-widest mb-2">Precio Total Pagado ($)</label>
                        <input required type="number" step="0.01" min="0" placeholder="0.00" className="input-field"
                          value={compraForm.precio_total_compra}
                          onChange={e => setCompraForm(p => ({ ...p, precio_total_compra: e.target.value }))} />
                      </div>
                    </div>

                    {/* Preview del nuevo precio promedio */}
                    {selectedInsumo && compraForm.cantidad_comprada && compraForm.precio_total_compra && (
                      <div className="flex justify-between items-center text-xs font-bold px-1">
                        <span className="text-slate-500">Nuevo precio promedio estimado:</span>
                        <span className="text-emerald-400 font-black">
                          ${fmt(
                            (selectedInsumo.precio_promedio * selectedInsumo.total_unidades_compradas + parseFloat(compraForm.precio_total_compra)) /
                            (selectedInsumo.total_unidades_compradas + parseFloat(compraForm.cantidad_comprada))
                          )}
                        </span>
                      </div>
                    )}

                    {showNewInComp && compraForm.cantidad_comprada && compraForm.precio_total_compra && (
                      <div className="flex justify-between items-center text-xs font-bold px-1">
                        <span className="text-slate-500">Precio promedio inicial:</span>
                        <span className="text-emerald-400 font-black">
                          ${fmt(parseFloat(compraForm.precio_total_compra) / parseFloat(compraForm.cantidad_comprada))}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setIsCompraOpen(false)} className="btn-secondary text-sm px-6">Cancelar</button>
                  <button
                    type="submit"
                    disabled={savingCompra || (!selectedInsumo && !showNewInComp)}
                    className="btn-primary text-sm px-8 disabled:opacity-40"
                  >
                    <Save size={16} />
                    {savingCompra ? 'Guardando...' : 'Guardar Compra'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
