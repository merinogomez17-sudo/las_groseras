import React, { useState, useEffect } from 'react';
import {
  Calendar, Search,
  Trash2, X, Save, RefreshCw,
  Users, Package, CheckCircle,
  Beer, ArrowRight, Play, Share2, ShoppingBag, MapPin
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';
import { PACKAGE_LIMITS, CATEGORY_LABELS, normalizePkgId, getEventLimits } from '../../utils/eventUtils';
import { PDFDownloadLink } from '@react-pdf/renderer';
import ShoppingListPDF from '../../components/inventory/ShoppingListPDF';

const EventsPage = () => {
  const [events, setEvents]                     = useState([]);
  const [loading, setLoading]                   = useState(true);
  const [searchTerm, setSearchTerm]             = useState('');
  const [selectedEvent, setSelectedEvent]       = useState(null);
  const [panelOpen, setPanelOpen]               = useState(false);
  const [deficitItems, setDeficitItems]         = useState([]);
  const [isDeficitModalOpen, setIsDeficitModalOpen] = useState(false);

  const [availableRecipes, setAvailableRecipes] = useState([]);
  const [selectedRecipes, setSelectedRecipes]   = useState([]);
  const [availableBeers, setAvailableBeers]     = useState([]);
  const [selectedBeers, setSelectedBeers]       = useState([]);

  useEffect(() => { fetchEvents(); fetchRecipes(); fetchBeers(); }, []);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('eventos')
        .select('*, clientes (nombre_completo, telefono), cotizaciones (numero_cotizacion, paquetes_incluidos), evento_productos (id, receta_id, recetas_base(nombre, categoria))')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      toast.error('Error al cargar eventos: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecipes = async () => {
    const { data } = await supabase.from('recetas_base').select('*').order('nombre');
    setAvailableRecipes(data || []);
  };

  const fetchBeers = async () => {
    const { data } = await supabase.from('inventario').select('id, nombre, producto_base').in('categoria', ['Cerveza', 'Cervezas']).order('nombre');
    const rawBeers = data || [];
    const uniqueBeers = [];
    const seenNames = new Set();
    rawBeers.forEach(beer => {
      const name = beer.producto_base || beer.nombre;
      if (!seenNames.has(name)) { uniqueBeers.push({ ...beer, displayName: name }); seenNames.add(name); }
    });
    setAvailableBeers(uniqueBeers);
  };

  const handleShareLink = (eventId) => {
    const shareUrl = `${window.location.origin}/selection/${eventId}`;
    navigator.clipboard.writeText(shareUrl);
    toast.success('Link copiado al portapapeles');
  };

  const openPanel = (event) => {
    setSelectedEvent(event);
    const basics  = availableRecipes.filter(r => r.categoria === 'Basica').map(r => r.id);
    const existing = event.evento_productos?.map(p => p.receta_id) || [];
    setSelectedRecipes(Array.from(new Set([...basics, ...existing])));
    setSelectedBeers(event.cervezas_seleccionadas || []);
    setPanelOpen(true);
  };

  const closePanel = () => setPanelOpen(false);

  const handleToggleBeer = (beerName) => {
    setSelectedBeers(selectedBeers.includes(beerName)
      ? selectedBeers.filter(b => b !== beerName)
      : [...selectedBeers, beerName]);
  };

  const handleToggleRecipe = (id, category) => {
    const limits = getEventLimits(selectedEvent);
    const limit  = limits[category];
    if (selectedRecipes.includes(id)) {
      setSelectedRecipes(selectedRecipes.filter(rid => rid !== id));
      return;
    }
    if (limit !== undefined) {
      const currentSelected = availableRecipes.filter(r => r.categoria === category && selectedRecipes.includes(r.id)).length;
      if (currentSelected >= limit) {
        toast.error(`Límite alcanzado: Solo ${limit} ${CATEGORY_LABELS[category]}`);
        return;
      }
    }
    setSelectedRecipes([...selectedRecipes, id]);
  };

  const handleSaveSelection = async () => {
    const loadingToast = toast.loading('Guardando selección...');
    try {
      await supabase.from('evento_productos').delete().eq('evento_id', selectedEvent.id);
      const payload = selectedRecipes.map(rid => ({ evento_id: selectedEvent.id, receta_id: rid, cantidad: 1 }));
      const { error } = await supabase.from('evento_productos').insert(payload);
      if (error) throw error;
      const { error: eventError } = await supabase.from('eventos').update({ cervezas_seleccionadas: selectedBeers }).eq('id', selectedEvent.id);
      if (eventError) throw eventError;
      toast.success('Sabores y cervezas actualizados', { id: loadingToast });
      closePanel();
      fetchEvents();
    } catch (err) {
      toast.error('Error: ' + err.message, { id: loadingToast });
    }
  };

  const handleFinalizeInventory = async (event) => {
    if (!window.confirm('¿Finalizar el evento y DESCONTAR automáticamente el inventario?')) return;
    const loadingToast = toast.loading('Calculando insumos...');
    try {
      const { data: selection } = await supabase
        .from('evento_productos')
        .select('receta_id, recetas_base (nombre, receta_componentes (insumo_id, cantidad, unidad))')
        .eq('evento_id', event.id);
      if (!selection || selection.length === 0) throw new Error('No has seleccionado productos para este evento.');

      const totals = {};
      selection.forEach(p => {
        p.recetas_base.receta_componentes.forEach(comp => {
          if (comp.insumo_id) {
            totals[comp.insumo_id] = (totals[comp.insumo_id] || 0) + comp.cantidad * (event.numero_personas || 1);
          }
        });
      });

      const deficit = [];
      const { data: inventoryData } = await supabase.from('inventario').select('*');

      for (const insumoId in totals) {
        const qty          = totals[insumoId];
        const currentItem  = inventoryData?.find(i => i.id === insumoId);
        const currentStock = currentItem?.cantidad_actual || 0;
        if (qty > currentStock) {
          deficit.push({ nombre: currentItem?.nombre || 'Insumo desconocido', faltante: qty - currentStock, unidad: currentItem?.unidad || 'Pzas', proveedor: currentItem?.proveedor || 'No definido' });
        }
        await supabase.from('movimientos_inventario').insert({ id_insumo: insumoId, tipo: 'salida', cantidad: qty, motivo: `Consumo Evento: ${event.nombre_evento}` });
        await supabase.from('inventario').update({ cantidad_actual: currentStock - qty }).eq('id', insumoId);
      }

      await supabase.from('eventos').update({ estado: 'finalizado' }).eq('id', event.id);

      if (deficit.length > 0) {
        setDeficitItems(deficit);
        setIsDeficitModalOpen(true);
        toast.warning('¡Inventario actualizado! Se detectaron faltantes.');
      } else {
        toast.success('¡Inventario actualizado y evento finalizado!', { id: loadingToast });
      }

      setSelectedEvent(event);
      fetchEvents();
    } catch (err) {
      toast.error('Error al procesar: ' + err.message, { id: loadingToast });
    }
  };

  const handleDeleteEvent = async (event) => {
    if (!window.confirm('¿Cancelar este evento? La cotización volverá a estado Aprobada.')) return;
    if (event.estado === 'finalizado') {
      if (!window.confirm('Este evento ya tiene inventario descontado. El stock NO se recuperará. ¿Continuar?')) return;
    }
    const loadingToast = toast.loading('Cancelando evento...');
    try {
      if (event.cotizacion_id) {
        await supabase.from('cotizaciones').update({ estado: 'aprobada' }).eq('id', event.cotizacion_id);
      }
      const { error: deleteError } = await supabase.from('eventos').delete().eq('id', event.id);
      if (deleteError) throw deleteError;
      toast.success('Evento cancelado.', { id: loadingToast });
      fetchEvents();
    } catch (err) {
      toast.error('Error al revertir: ' + err.message, { id: loadingToast });
    }
  };

  const filteredEvents = events.filter(e =>
    e.nombre_evento.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.clientes?.nombre_completo?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-900/40 p-6 rounded-3xl border border-white/5 backdrop-blur-md gap-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tighter flex items-center gap-3">
            <Calendar className="text-brand-red shrink-0" size={32} />
            Pedidos confirmados
          </h1>
          <p className="text-slate-500 text-xs font-bold tracking-[0.2em] mt-1">Gestión Logística y Despacho • Las Groseras</p>
        </div>
        <button className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl text-slate-400 transition-all" onClick={fetchEvents}>
          <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* FILTROS */}
      <div className="glass p-4 border-white/5">
        <div className="relative w-full md:w-96 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-brand-red transition-colors" size={18} />
          <input type="text" placeholder="Buscar evento o cliente..." className="input-field pl-12 bg-white/5 focus:bg-white/10"
            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
      </div>

      {/* SPLIT VIEW */}
      <div className="flex gap-5 items-start">

        {/* LISTA DE EVENTOS */}
        <div className="flex-1 min-w-0 space-y-5">
          {loading ? (
            <div className="p-20 text-center text-slate-500 flex flex-col items-center">
              <RefreshCw className="animate-spin mb-4 opacity-20" size={48} />
              Cargando gestión logística...
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="glass p-20 text-center text-slate-500">No hay pedidos confirmados pendientes.</div>
          ) : filteredEvents.map((event) => (
            <motion.div
              layout key={event.id}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className={`glass p-6 border-l-8 transition-all relative group ${selectedEvent?.id === event.id && panelOpen ? 'border-l-brand-red ring-1 ring-brand-red/20' : event.estado === 'finalizado' ? 'border-l-emerald-500' : 'border-l-brand-red'}`}
            >
              <div className="flex flex-col lg:flex-row justify-between gap-6">
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded text-[10px] font-black tracking-widest ${event.estado === 'finalizado' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-brand-red/10 text-brand-red'}`}>
                      {event.estado === 'finalizado' ? 'Confirmado' : event.estado}
                    </span>
                    <span className="text-[10px] font-black text-slate-500 tracking-widest bg-white/5 px-2 py-1 rounded">
                      {event.cotizaciones?.numero_cotizacion || 'S/N'}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <h3 className="text-2xl font-black text-white tracking-tighter group-hover:text-brand-red transition-colors">{event.nombre_evento}</h3>
                    <div className="flex gap-2">
                      <button onClick={() => handleShareLink(event.id)}
                        className="p-1.5 bg-white/5 hover:bg-brand-red/10 rounded-xl text-slate-400 hover:text-brand-red transition-all" title="Compartir link">
                        <Share2 size={15} />
                      </button>
                      <button onClick={() => handleDeleteEvent(event)}
                        className="p-1.5 bg-white/5 hover:bg-brand-red/10 rounded-xl text-slate-400 hover:text-brand-red transition-all">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-slate-400 font-bold text-xs">
                    <div className="flex items-center gap-1.5"><Users size={13} className="text-brand-red" /> {event.clientes?.nombre_completo || 'Cliente'}</div>
                    <div className="flex items-center gap-1.5"><Users size={13} className="text-brand-red" /> {event.numero_personas} PAX</div>
                    <div className="flex items-center gap-1.5"><MapPin size={13} className="text-brand-red" /> {event.ubicacion || 'Por definir'}</div>
                    <div className="flex items-center gap-1.5"><ShoppingBag size={13} className="text-brand-red" /> {event.paquete_contratado || 'Personalizado'}</div>
                  </div>

                  <div className="pt-3 border-t border-white/5">
                    <div className="flex flex-wrap gap-1.5">
                      {event.evento_productos?.length > 0 ? (
                        event.evento_productos.map(p => (
                          <span key={p.id} className="px-2.5 py-1 bg-white/5 rounded-lg border border-white/5 text-[10px] font-black text-slate-300">
                            {p.recetas_base?.nombre}
                          </span>
                        ))
                      ) : (
                        <p className="text-[10px] text-slate-600 font-bold">Sin sabores seleccionados.</p>
                      )}
                    </div>
                    {event.cervezas_seleccionadas?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {event.cervezas_seleccionadas.map((beer, idx) => (
                          <span key={idx} className="px-2.5 py-1 bg-brand-red/10 rounded-lg border border-brand-red/20 text-[10px] font-black text-brand-red">{beer}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="lg:w-56 flex flex-col justify-center gap-3">
                  {event.estado !== 'finalizado' && (
                    <>
                      <button onClick={() => openPanel(event)}
                        className={`btn-secondary w-full py-3 text-[10px] font-black tracking-widest flex items-center justify-center gap-2 ${selectedEvent?.id === event.id && panelOpen ? 'ring-1 ring-brand-red/50' : ''}`}>
                        <Beer size={14} /> Seleccionar Bebidas
                      </button>
                      <button onClick={() => handleFinalizeInventory(event)}
                        className="btn-primary w-full py-3 text-[10px] font-black tracking-widest flex items-center justify-center gap-2 shadow-xl shadow-brand-red/20">
                        <Play size={14} /> Finalizar y Descontar
                      </button>
                    </>
                  )}
                  {event.estado === 'finalizado' && (
                    <div className="p-4 bg-emerald-500/5 rounded-2xl border border-emerald-500/20 text-center">
                      <CheckCircle size={28} className="mx-auto text-emerald-400 mb-1" />
                      <p className="text-[10px] font-black text-emerald-400 tracking-widest">Stock Actualizado</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* PANEL DERECHO: SELECCIÓN DE BEBIDAS */}
        <AnimatePresence>
          {panelOpen && selectedEvent && (
            <motion.div
              key="events-panel"
              initial={{ opacity: 0, x: 32 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 32 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="w-[420px] shrink-0 sticky top-6"
            >
              <div className="glass border-white/5 p-6 relative max-h-[calc(100vh-120px)] flex flex-col">
                <button onClick={closePanel} className="absolute right-5 top-5 text-slate-500 hover:text-white transition-colors z-10">
                  <X size={20} />
                </button>

                <div className="mb-5 pb-4 border-b border-white/5">
                  <h2 className="text-lg font-black text-white tracking-tighter flex items-center gap-3">
                    <Beer size={20} className="text-brand-red" /> Seleccionar sabores
                  </h2>
                  <p className="text-slate-500 text-[10px] font-black tracking-widest mt-1">{selectedEvent.nombre_evento}</p>
                  <span className="text-[10px] font-black text-brand-red bg-brand-red/10 px-2 py-0.5 rounded-full border border-brand-red/20 inline-block mt-1">
                    {selectedEvent.paquete_contratado || selectedEvent.cotizaciones?.paquetes_incluidos?.[0]?.nombre || 'Personalizado'}
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto pr-2 space-y-6 custom-scrollbar">
                  {/* Cerveza Base */}
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="text-[10px] font-black text-brand-red tracking-widest flex items-center gap-2">
                        <Beer size={13} /> Cerveza Base
                      </h3>
                      <span className="text-[10px] font-black px-2 py-0.5 rounded bg-brand-red/10 text-brand-red">
                        {selectedBeers.length} sel.
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {availableBeers.map(beer => (
                        <button key={beer.id} onClick={() => handleToggleBeer(beer.displayName)}
                          className={`p-3 rounded-xl border transition-all text-left relative ${selectedBeers.includes(beer.displayName) ? 'bg-brand-red border-brand-red' : 'bg-white/5 border-white/5 hover:border-brand-red/30'}`}>
                          <div className={`font-black text-xs ${selectedBeers.includes(beer.displayName) ? 'text-white' : 'text-slate-200'}`}>
                            {beer.displayName}
                          </div>
                          {selectedBeers.includes(beer.displayName) && (
                            <CheckCircle size={13} className="absolute top-2 right-2 text-white" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Sabores por categoría */}
                  {Object.keys(CATEGORY_LABELS).map(cat => {
                    const limits  = getEventLimits(selectedEvent);
                    const limit   = limits[cat];
                    const currentSelected = availableRecipes.filter(r => r.categoria === cat && selectedRecipes.includes(r.id)).length;
                    const pkgId   = normalizePkgId(selectedEvent.paquete_contratado || selectedEvent.cotizaciones?.paquetes_incluidos?.[0]?.id || '');
                    const isAvailable = cat === 'Basica' || limit > 0 || !pkgId;

                    return (
                      <div key={cat} className={!isAvailable ? 'opacity-40 grayscale' : ''}>
                        <div className="flex justify-between items-center mb-3">
                          <h3 className="text-[10px] font-black text-brand-red tracking-widest flex items-center gap-2">
                            <ArrowRight size={12} /> {CATEGORY_LABELS[cat]}
                          </h3>
                          {limit && (
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded ${currentSelected >= limit ? 'bg-emerald-500/10 text-emerald-400' : 'bg-brand-red/10 text-brand-red'}`}>
                              {currentSelected} / {limit}
                            </span>
                          )}
                          {cat === 'Basica' && <span className="text-[10px] font-black px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400">Ilimitado</span>}
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {availableRecipes.filter(r => r.categoria === cat).map(recipe => (
                            <button key={recipe.id} disabled={!isAvailable}
                              onClick={() => handleToggleRecipe(recipe.id, cat)}
                              className={`p-3 rounded-xl border transition-all text-left relative ${selectedRecipes.includes(recipe.id) ? 'bg-brand-red border-brand-red' : 'bg-white/5 border-white/5 hover:border-brand-red/30'}`}>
                              <div className={`font-black text-xs ${selectedRecipes.includes(recipe.id) ? 'text-white' : 'text-slate-200'}`}>
                                {recipe.nombre}
                              </div>
                              <div className={`text-[9px] font-bold mt-0.5 ${selectedRecipes.includes(recipe.id) ? 'text-white/60' : 'text-slate-500'}`}>
                                ${recipe.costo_total?.toFixed(2)} / PAX
                              </div>
                              {selectedRecipes.includes(recipe.id) && (
                                <CheckCircle size={13} className="absolute top-2 right-2 text-white" />
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-5 pt-4 border-t border-white/5 flex justify-between items-center">
                  <div className="text-[10px] font-black text-slate-500 tracking-widest">{selectedRecipes.length} productos sel.</div>
                  <div className="flex gap-3">
                    <button onClick={closePanel} className="btn-secondary text-xs px-5">Cancelar</button>
                    <button onClick={handleSaveSelection} className="btn-primary text-xs px-7 flex items-center gap-2">
                      <Save size={14} /> Guardar
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* MODAL DEFICIT (se mantiene flotante: aparece tras acción, no iniciado por usuario) */}
      <AnimatePresence>
        {isDeficitModalOpen && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/95 backdrop-blur-2xl">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="glass max-w-lg w-full p-10 text-center relative border-t-4 border-brand-red"
            >
              <div className="w-20 h-20 bg-brand-red/20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                <ShoppingBag size={40} className="text-brand-red" />
              </div>
              <h2 className="text-4xl font-black text-white tracking-tighter mb-4">¡Stock insuficiente!</h2>
              <p className="text-slate-400 mb-8 leading-relaxed">El evento fue finalizado, pero algunos insumos se agotaron. Lista de compras generada.</p>
              <div className="space-y-3 mb-8">
                {deficitItems.slice(0, 3).map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center p-3 bg-white/5 rounded-xl border border-white/5">
                    <span className="text-[10px] font-black text-slate-300">{item.nombre}</span>
                    <span className="text-xs font-black text-brand-red">-{item.faltante.toFixed(1)} {item.unidad}</span>
                  </div>
                ))}
                {deficitItems.length > 3 && <p className="text-[10px] text-slate-500 font-bold">... y {deficitItems.length - 3} más</p>}
              </div>
              <div className="flex flex-col gap-3">
                <PDFDownloadLink
                  document={<ShoppingListPDF event={selectedEvent} items={deficitItems} />}
                  fileName={`Lista_Compras_${selectedEvent?.nombre_evento.replace(/\s+/g, '_')}.pdf`}
                  className="btn-primary w-full py-4"
                >
                  {({ loading }) => (
                    <div className="flex items-center justify-center gap-3">
                      <Save size={18} />
                      <span className="font-black">{loading ? 'Generando PDF...' : 'Descargar lista de compras'}</span>
                    </div>
                  )}
                </PDFDownloadLink>
                <button onClick={() => setIsDeficitModalOpen(false)} className="text-[10px] font-black text-slate-500 tracking-widest hover:text-white transition-colors">
                  Cerrar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default EventsPage;
