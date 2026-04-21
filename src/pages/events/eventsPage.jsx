import React, { useState, useEffect } from 'react';
import { 
  Calendar, Search, Filter, 
  Trash2, Edit2, X, Save, RefreshCw, 
  ChevronRight, Calculator, ShoppingBag, 
  MapPin, Users, Package, CheckCircle, 
  Beer, ArrowRight, Play, Share2, Copy
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';
import { PACKAGE_LIMITS, CATEGORY_LABELS, normalizePkgId } from '../../utils/eventUtils';
import { PDFDownloadLink } from '@react-pdf/renderer';
import ShoppingListPDF from '../../components/inventory/ShoppingListPDF';

const EventsPage = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isSelectionModalOpen, setIsSelectionModalOpen] = useState(false);
  const [deficitItems, setDeficitItems] = useState([]);
  const [isDeficitModalOpen, setIsDeficitModalOpen] = useState(false);
  
  // States for recipe selection
  const [availableRecipes, setAvailableRecipes] = useState([]);
  const [selectedRecipes, setSelectedRecipes] = useState([]);
  
  const [availableBeers, setAvailableBeers] = useState([]);
  const [selectedBeers, setSelectedBeers] = useState([]);

  useEffect(() => {
    fetchEvents();
    fetchRecipes();
    fetchBeers();
  }, []);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('eventos')
        .select(`
          *,
          clientes (nombre_completo, telefono),
          cotizaciones (numero_cotizacion, paquetes_incluidos),
          evento_productos (id, receta_id, recetas_base(nombre, categoria))
        `)
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
    const { data } = await supabase
      .from('inventario')
      .select('id, nombre, producto_base')
      .in('categoria', ['Cerveza', 'Cervezas'])
      .order('nombre');
    
    // Filtrar para tener solo una opción por producto base
    const rawBeers = data || [];
    const uniqueBeers = [];
    const seenNames = new Set();
    
    rawBeers.forEach(beer => {
      const name = beer.producto_base || beer.nombre;
      if (!seenNames.has(name)) {
        uniqueBeers.push({ ...beer, displayName: name });
        seenNames.add(name);
      }
    });

    setAvailableBeers(uniqueBeers);
  };

  const handleShareLink = (eventId) => {
    const shareUrl = `${window.location.origin}/selection/${eventId}`;
    navigator.clipboard.writeText(shareUrl);
    toast.success('Link copiado al portapapeles');
  };

  const handleOpenSelection = (event) => {
    setSelectedEvent(event);
    
    // Auto-seleccionar las básicas (siempre incluidas) + lo que ya estaba guardado
    const basics = availableRecipes.filter(r => r.categoria === 'Basica').map(r => r.id);
    const existing = event.evento_productos?.map(p => p.receta_id) || [];
    
    // Unimos ambos asegurando que no haya duplicados
    const initialSelection = Array.from(new Set([...basics, ...existing]));
    
    setSelectedRecipes(initialSelection);
    setSelectedBeers(event.cervezas_seleccionadas || []);
    setIsSelectionModalOpen(true);
  };

  const handleToggleBeer = (beerName) => {
    if (selectedBeers.includes(beerName)) {
      setSelectedBeers(selectedBeers.filter(b => b !== beerName));
    } else {
      setSelectedBeers([...selectedBeers, beerName]);
    }
  };

  const handleToggleRecipe = (id, category) => {
    // Intentar obtener ID desde el evento, y si no, desde la cotización vinculada
    const pkgRaw = selectedEvent.paquete_contratado || selectedEvent.cotizaciones?.paquetes_incluidos?.[0]?.id || '';
    const pkgKey = normalizePkgId(pkgRaw);
    const limits = PACKAGE_LIMITS[pkgKey] || {};
    const limit = limits[category];
    
    if (selectedRecipes.includes(id)) {
      setSelectedRecipes(selectedRecipes.filter(rid => rid !== id));
      return;
    }

    // Si es una categoría con límite
    if (limit !== undefined) {
      const currentSelectedInCategory = availableRecipes
        .filter(r => r.categoria === category && selectedRecipes.includes(r.id))
        .length;
      
      if (currentSelectedInCategory >= limit) {
        toast.error(`Límite alcanzado: Este paquete solo incluye ${limit} ${CATEGORY_LABELS[category]}`);
        return;
      }
    }

    setSelectedRecipes([...selectedRecipes, id]);
  };

  const handleSaveSelection = async () => {
    const loadingToast = toast.loading('Guardando selección...');
    try {
      // 1. Limpiar selecciones previas
      await supabase.from('evento_productos').delete().eq('evento_id', selectedEvent.id);

      // 2. Insertar nuevas
      const payload = selectedRecipes.map(rid => ({
        evento_id: selectedEvent.id,
        receta_id: rid,
        cantidad: 1 // Por ahora manejamos selección de sabores, luego cantidad si se requiere
      }));

      const { error } = await supabase.from('evento_productos').insert(payload);
      if (error) throw error;

      // 3. Actualizar cervezas seleccionadas
      const { error: eventError } = await supabase
        .from('eventos')
        .update({ cervezas_seleccionadas: selectedBeers })
        .eq('id', selectedEvent.id);
      
      if (eventError) throw eventError;

      toast.success('Sabores y cervezas actualizados', { id: loadingToast });
      setIsSelectionModalOpen(false);
      fetchEvents();
    } catch (err) {
      toast.error('Error: ' + err.message, { id: loadingToast });
    }
  };

  const handleFinalizeInventory = async (event) => {
    if (!window.confirm('¿Deseas finalizar el evento y DESCONTAR automáticamente el inventario?')) return;
    
    const loadingToast = toast.loading('Calculando insumos y descontando stock...');
    try {
      // 1. Obtener todos los ingredientes de los productos seleccionados
      const { data: selection } = await supabase
        .from('evento_productos')
        .select(`
          receta_id,
          recetas_base (
            nombre,
            receta_componentes (
              insumo_id,
              cantidad,
              unidad
            )
          )
        `)
        .eq('evento_id', event.id);

      if (!selection || selection.length === 0) {
        throw new Error('No has seleccionado productos para este evento aún.');
      }

      // 2. Acumular cantidades totales: cantidad_receta * numero_personas
      const totals = {}; // { insumo_id: total_cantidad }
      selection.forEach(p => {
        p.recetas_base.receta_componentes.forEach(comp => {
          if (comp.insumo_id) {
            const qtyUsed = comp.cantidad * (event.numero_personas || 1);
            totals[comp.insumo_id] = (totals[comp.insumo_id] || 0) + qtyUsed;
          }
        });
      });

      // 3. Crear movimientos de inventario y actualizar stock
      const deficit = [];
      const { data: inventoryData } = await supabase.from('inventario').select('*');

      for (const insumoId in totals) {
        const qty = totals[insumoId];
        const currentItem = inventoryData?.find(i => i.id === insumoId);
        const currentStock = currentItem?.cantidad_actual || 0;

        // Registrar déficit si no hay suficiente stock
        if (qty > currentStock) {
          deficit.push({
            nombre: currentItem?.nombre || 'Insumo desconocido',
            faltante: qty - currentStock,
            unidad: currentItem?.unidad || 'Pzas',
            proveedor: currentItem?.proveedor || 'No definido'
          });
        }
        
        // Registrar salida
        await supabase.from('movimientos_inventario').insert({
          id_insumo: insumoId,
          tipo: 'salida',
          cantidad: qty,
          motivo: `Consumo Evento: ${event.nombre_evento}`
        });

        // Actualizar stock principal
        await supabase
          .from('inventario')
          .update({ cantidad_actual: currentStock - qty })
          .eq('id', insumoId);
      }

      // 4. Marcar evento como finalizado
      await supabase.from('eventos').update({ estado: 'finalizado' }).eq('id', event.id);

      if (deficit.length > 0) {
        setDeficitItems(deficit);
        setIsDeficitModalOpen(true);
        toast.warning('¡Inventario actualizado! Se detectaron faltantes. Generando lista de compras...');
      } else {
        toast.success('¡Inventario actualizado y evento finalizado!', { id: loadingToast });
      }
      
      setSelectedEvent(event); // Guardar el evento actual para el PDF
      fetchEvents();
    } catch (err) {
      toast.error('Error al procesar: ' + err.message, { id: loadingToast });
    }
  };
  const handleDeleteEvent = async (event) => {
    if (!window.confirm(`¿Estás seguro de cancelar este evento? La cotización volverá a estado 'Aprobada'.`)) return;

    if (event.estado === 'finalizado') {
      if (!window.confirm('Este evento ya tiene el inventario descontado. Si lo borras, el stock NO se recuperará automáticamente. ¿Deseas continuar?')) return;
    }

    const loadingToast = toast.loading('Cancelando evento y revirtiendo pago...');
    try {
      // 1. Regresar la cotización a 'aprobada'
      if (event.cotizacion_id) {
        await supabase
          .from('cotizaciones')
          .update({ estado: 'aprobada' })
          .eq('id', event.cotizacion_id);
      }

      // 2. Eliminar el evento (esto borra selecciones por cascade)
      const { error: deleteError } = await supabase
        .from('eventos')
        .delete()
        .eq('id', event.id);

      if (deleteError) throw deleteError;

      toast.success('Evento cancelado. Cotización disponible de nuevo.', { id: loadingToast });
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
        <div className="flex gap-4 w-full sm:w-auto">
          <button className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl text-slate-400 transition-all" onClick={fetchEvents}>
            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* FILTERS */}
      <div className="glass p-4 flex flex-col md:flex-row gap-4 items-center justify-between border-white/5">
        <div className="relative w-full md:w-96 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-brand-red transition-colors" size={18} />
          <input 
            type="text" placeholder="Buscar evento o cliente..." className="input-field pl-12 bg-white/5 focus:bg-white/10"
            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* EVENTS LIST */}
      <div className="grid grid-cols-1 gap-6">
        {loading ? (
          <div className="p-20 text-center text-slate-500 flex flex-col items-center">
            <RefreshCw className="animate-spin mb-4 opacity-20" size={48} />
            Cargando gestión logística...
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="glass p-20 text-center text-slate-500">No hay pedidos confirmados pendientes.</div>
        ) : filteredEvents.map((event) => (
          <motion.div 
            layout
            key={event.id}
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className={`glass p-8 border-l-8 transition-all overflow-hidden relative group ${event.estado === 'finalizado' ? 'border-l-emerald-500' : 'border-l-brand-red'}`}
          >
            <div className="flex flex-col lg:flex-row justify-between gap-8 h-full">
              <div className="flex-1 space-y-4">
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 rounded text-[10px] font-black tracking-widest ${event.estado === 'finalizado' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-brand-red/10 text-brand-red'}`}>
                    {event.estado}
                  </span>
                  <span className="text-[10px] font-black text-slate-500 tracking-widest bg-white/5 px-2 py-1 rounded">
                    {event.cotizaciones?.numero_cotizacion || 'S/N'}
                  </span>
                </div>

                <div className="flex items-center gap-4 group/title">
                   <h3 className="text-3xl font-black text-white tracking-tighter group-hover/title:text-brand-red transition-colors">{event.nombre_evento}</h3>
                   <div className="flex gap-2">
                    <button 
                      onClick={() => handleShareLink(event.id)}
                      className="p-2 bg-white/5 hover:bg-brand-red/10 rounded-xl text-slate-400 hover:text-brand-red transition-all group/share"
                      title="Compartir link con cliente"
                    >
                      <Share2 size={18} className="group-hover/share:scale-110 transition-transform" />
                    </button>
                    <button 
                      onClick={() => handleDeleteEvent(event)}
                      className="p-2 bg-white/5 hover:bg-brand-red/10 rounded-xl text-slate-400 hover:text-brand-red transition-all"
                      title="Cancelar y Revertir Pago"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-6 mt-2">
                  <div className="flex items-center gap-2 text-slate-400 font-bold text-xs">
                    <Users size={14} className="text-brand-red" /> {event.clientes?.nombre_completo || 'Cliente'}
                  </div>
                  <div className="flex items-center gap-2 text-slate-400 font-bold text-xs">
                    <Users size={14} className="text-brand-red" /> {event.numero_personas} PAX
                  </div>
                  <div className="flex items-center gap-2 text-slate-400 font-bold text-xs">
                    <MapPin size={14} className="text-brand-red" /> {event.ubicacion || 'Por definir'}
                  </div>
                  <div className="flex items-center gap-2 text-slate-400 font-bold text-xs">
                    <ShoppingBag size={14} className="text-brand-red" /> {event.paquete_contratado || 'Personalizado'}
                  </div>
                </div>

                <div className="pt-4 border-t border-white/5">
                   <h4 className="text-[10px] font-black text-slate-500 tracking-widest mb-3 flex items-center gap-2">
                     <Beer size={14} /> Bebidas Seleccionadas
                   </h4>
                   <div className="flex flex-wrap gap-2">
                      {event.evento_productos?.length > 0 ? (
                        event.evento_productos.map(p => (
                          <span key={p.id} className="px-3 py-1.5 bg-white/5 rounded-xl border border-white/5 text-[10px] font-black text-slate-300">
                             {p.recetas_base?.nombre}
                          </span>
                        ))
                      ) : (
                        <p className="text-[10px] text-slate-600 font-bold">No se han seleccionado sabores.</p>
                      )}
                   </div>

                   {/* Display Selected Beers */}
                   {event.cervezas_seleccionadas?.length > 0 && (
                     <div className="mt-4 pt-4 border-t border-white/5">
                       <h4 className="text-[10px] font-black text-slate-500 tracking-widest mb-3 flex items-center gap-2">
                         <Beer size={14} className="text-brand-red" /> Cerveza Base
                       </h4>
                       <div className="flex flex-wrap gap-2">
                         {event.cervezas_seleccionadas.map((beer, idx) => (
                           <span key={idx} className="px-3 py-1.5 bg-brand-red/10 rounded-xl border border-brand-red/20 text-[10px] font-black text-brand-red">
                             {beer}
                           </span>
                         ))}
                       </div>
                     </div>
                   )}
                </div>
              </div>

              <div className="lg:w-72 flex flex-col justify-center gap-3">
                 {event.estado !== 'finalizado' && (
                    <>
                      <button 
                        onClick={() => handleOpenSelection(event)}
                        className="btn-secondary w-full py-4 text-[10px] font-black tracking-widest flex items-center justify-center gap-2"
                      >
                         <Edit2 size={16} /> Seleccionar Bebidas
                      </button>
                      <button 
                        onClick={() => handleFinalizeInventory(event)}
                        className="btn-primary w-full py-4 text-[10px] font-black tracking-widest flex items-center justify-center gap-2 shadow-xl shadow-brand-red/20"
                      >
                         <Play size={16} /> Finalizar y Descontar Stock
                      </button>
                    </>
                 )}
                 {event.estado === 'finalizado' && (
                   <div className="p-6 bg-emerald-500/5 rounded-2xl border border-emerald-500/20 text-center">
                      <CheckCircle size={32} className="mx-auto text-emerald-400 mb-2" />
                      <p className="text-[10px] font-black text-emerald-400 tracking-widest">Insumos Descontados</p>
                      <p className="text-[8px] text-slate-500 mt-1">El stock ha sido actualizado automáticamente.</p>
                   </div>
                 )}
              </div>
            </div>
            
            {/* Background Decorative */}
            <div className="absolute -right-10 -bottom-10 opacity-5 group-hover:opacity-10 transition-opacity">
               <Calendar size={200} />
            </div>
          </motion.div>
        ))}
      </div>

      {/* SELECTION MODAL */}
      <AnimatePresence>
        {isSelectionModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="glass max-w-4xl w-full p-10 relative overflow-hidden flex flex-col max-h-[90vh]"
            >
              <button onClick={() => setIsSelectionModalOpen(false)} className="absolute right-6 top-6 text-slate-500 hover:text-white transition-colors">
                <X size={28} />
              </button>

              <div className="mb-8 border-b border-white/5 pb-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-3xl font-black text-white tracking-tighter flex items-center gap-3">
                       <Beer size={28} className="text-brand-red" /> Seleccionar sabores
                    </h2>
                    <p className="text-slate-500 text-[10px] font-black tracking-[0.2em] mt-1">Selecciona los productos específicos que se servirán en el evento</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-black text-brand-red bg-brand-red/10 px-3 py-1 rounded-full border border-brand-red/20">
                      Paquete: {selectedEvent.paquete_contratado || selectedEvent.cotizaciones?.paquetes_incluidos?.[0]?.nombre || 'Personalizado'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto pr-4 space-y-8 custom-scrollbar">
                {/* Beer Selection Section in Modal */}
                <div className="mb-12">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-[10px] font-black text-brand-red tracking-[0.3em] flex items-center gap-2">
                       <Beer size={14} /> Cerveza Base
                    </h3>
                    <span className="text-[10px] font-black px-2 py-1 rounded bg-brand-red/10 text-brand-red">
                      {selectedBeers.length} Seleccionadas
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {availableBeers.map(beer => (
                      <button 
                        key={beer.id}
                        onClick={() => handleToggleBeer(beer.displayName)}
                        className={`p-4 rounded-2xl border transition-all text-left group relative ${selectedBeers.includes(beer.displayName) ? 'bg-brand-red border-brand-red shadow-lg shadow-brand-red/20' : 'bg-white/5 border-white/5 hover:border-brand-red/30'}`}
                      >
                        <div className={`font-black text-xs tracking-tight ${selectedBeers.includes(beer.displayName) ? 'text-white' : 'text-slate-200'}`}>
                          {beer.displayName}
                        </div>
                        {selectedBeers.includes(beer.displayName) && (
                          <CheckCircle size={16} className="absolute top-2 right-2 text-white" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {Object.keys(CATEGORY_LABELS).map(cat => {
                  const pkgRaw = selectedEvent.paquete_contratado || selectedEvent.cotizaciones?.paquetes_incluidos?.[0]?.id || '';
                  const pkgKey = normalizePkgId(pkgRaw);
                  const limits = PACKAGE_LIMITS[pkgKey] || {};
                  const limit = limits[cat];
                  const currentSelected = availableRecipes.filter(r => r.categoria === cat && selectedRecipes.includes(r.id)).length;
                  const isAvailable = cat === 'Basica' || limit > 0 || !pkgKey;

                  return (
                    <div key={cat} className={!isAvailable ? 'opacity-40 grayscale' : ''}>
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-[10px] font-black text-brand-red tracking-[0.3em] flex items-center gap-2">
                           <ArrowRight size={14} /> {CATEGORY_LABELS[cat]}
                        </h3>
                        {limit && (
                          <span className={`text-[10px] font-black px-2 py-1 rounded ${currentSelected >= limit ? 'bg-emerald-500/10 text-emerald-400' : 'bg-brand-red/10 text-brand-red'}`}>
                            {currentSelected} / {limit}
                          </span>
                        )}
                        {cat === 'Basica' && (
                          <span className="text-[10px] font-black px-2 py-1 rounded bg-emerald-500/10 text-emerald-400">
                            Ilimitado
                          </span>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                         {availableRecipes.filter(r => r.categoria === cat).map(recipe => (
                           <button 
                             key={recipe.id}
                             disabled={!isAvailable}
                             onClick={() => handleToggleRecipe(recipe.id, cat)}
                             className={`p-4 rounded-2xl border transition-all text-left group relative ${selectedRecipes.includes(recipe.id) ? 'bg-brand-red border-brand-red shadow-lg shadow-brand-red/20' : 'bg-white/5 border-white/5 hover:border-brand-red/30 focus-within:border-brand-red/50'}`}
                           >
                              <div className={`font-black text-xs tracking-tight ${selectedRecipes.includes(recipe.id) ? 'text-white' : 'text-slate-200'}`}>
                                {recipe.nombre}
                              </div>
                              <div className={`text-[9px] font-bold mt-1 ${selectedRecipes.includes(recipe.id) ? 'text-white/60' : 'text-slate-500'}`}>
                                $ {recipe.costo_total?.toFixed(2)} / PAX
                              </div>
                              {selectedRecipes.includes(recipe.id) && (
                                <CheckCircle size={16} className="absolute top-2 right-2 text-white" />
                              )}
                           </button>
                         ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-8 pt-6 border-t border-white/5 flex justify-between items-center">
                 <div className="text-[10px] font-black text-slate-500 tracking-widest">
                   {selectedRecipes.length} Productos seleccionados
                 </div>
                 <div className="flex gap-4">
                    <button onClick={() => setIsSelectionModalOpen(false)} className="btn-secondary px-8 font-black text-[10px]">Cancelar</button>
                    <button onClick={handleSaveSelection} className="btn-primary px-10 font-black flex items-center gap-2 tracking-tighter">
                       <Save size={18} /> Guardar Selección
                    </button>
                 </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DEFICIT / SHOPPING LIST MODAL */}
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
              <p className="text-slate-400 mb-8 leading-relaxed">
                El evento ha sido finalizado, pero algunos insumos se han agotado. Hemos generado una **Lista de Compras** con lo que hace falta.
              </p>
              
              <div className="space-y-4 mb-10">
                 {deficitItems.slice(0, 3).map((item, idx) => (
                   <div key={idx} className="flex justify-between items-center p-3 bg-white/5 rounded-xl border border-white/5">
                      <span className="text-[10px] font-black text-slate-300">{item.nombre}</span>
                      <span className="text-xs font-black text-brand-red">-{item.faltante.toFixed(1)} {item.unidad}</span>
                   </div>
                 ))}
                 {deficitItems.length > 3 && (
                   <p className="text-[10px] text-slate-500 font-bold">... y {deficitItems.length - 3} productos más</p>
                 )}
              </div>

              <div className="flex flex-col gap-4">
                <PDFDownloadLink 
                  document={<ShoppingListPDF event={selectedEvent} items={deficitItems} />} 
                  fileName={`Lista_Compras_${selectedEvent?.nombre_evento.replace(/\s+/g, '_')}.pdf`}
                  className="btn-primary w-full py-4 group"
                >
                  {({ loading }) => (
                    <div className="flex items-center justify-center gap-3">
                      <Save size={20} />
                      <span className="font-black text-lg">{loading ? 'Generando PDF...' : 'Descargar lista de compras'}</span>
                    </div>
                  )}
                </PDFDownloadLink>
                
                <button 
                  onClick={() => setIsDeficitModalOpen(false)}
                  className="text-[10px] font-black text-slate-500 tracking-widest hover:text-white transition-colors"
                >
                  Cerrar Ventana
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
