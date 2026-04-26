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
import EventShoppingListPDF from '../../components/events/EventShoppingListPDF';

const calcComponentCost = (comp, inventory, genericOptions) => {
  const qty = parseFloat(comp.cantidad) || 0;
  if (comp.is_generic) {
    const gen = genericOptions.find(g => g.value === (comp.tipo_insumo || comp.insumo_nombre_manual));
    return gen ? (gen.avgPrice * qty) : 0;
  } else {
    const insumo = inventory.find(i => i.id === comp.insumo_id);
    if (!insumo) return 0;
    return insumo.precio_x_ml 
      ? (insumo.precio_x_ml * qty) 
      : ((insumo.precio_promedio / (insumo.ml_gr_pieza || 1)) * qty);
  }
};

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

  const [shoppingListItems, setShoppingListItems] = useState([]);
  const [isShoppingModalOpen, setIsShoppingModalOpen] = useState(false);
  const [isCalculatingList, setIsCalculatingList] = useState(false);
  const [shoppingStep, setShoppingStep]           = useState('ai'); // 'ai' | 'distribute' | 'list'
  const [eventProductsForDist, setEventProductsForDist] = useState([]);
  
  // AI Suggestions
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [aiResumen, setAiResumen]         = useState(null);
  const [isAiLoading, setIsAiLoading]     = useState(false);
  const [aiError, setAiError]             = useState(null);
  const [selectedAiOption, setSelectedAiOption] = useState(null);
  const [hasExistingDist, setHasExistingDist]   = useState(false);

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
    try {
      // Fetch recetas con sus componentes
      const { data: recipesData } = await supabase
        .from('recetas_base')
        .select('*, receta_componentes (*, insumos (tipo_insumo, marca, presentacion, precio_promedio, ml_gr_pieza, precio_x_ml))')
        .order('nombre');

      // Fetch insumos del inventario para costos genéricos
      const { data: inventory } = await supabase.from('insumos').select('*').order('marca');
      const inv = inventory || [];

      // Calcular opciones genéricas (precios promedio por categoría)
      const types = {};
      inv.forEach(item => {
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
      const genericOptions = Object.keys(types).sort().map(type => ({
        value: type,
        avgPrice: types[type].total / types[type].count
      }));

      // Calcular costo dinámico para cada receta
      const recipesWithCosts = (recipesData || []).map(recipe => {
        const total = recipe.receta_componentes?.reduce((acc, c) => {
          const isGeneric = !c.insumo_id && !!c.insumo_nombre_manual;
          const normalizedComp = {
            is_generic: isGeneric,
            insumo_id: c.insumo_id,
            tipo_insumo: isGeneric ? c.insumo_nombre_manual : '',
            cantidad: c.cantidad
          };
          return acc + calcComponentCost(normalizedComp, inv, genericOptions);
        }, 0) || 0;
        return { ...recipe, total_cost: total };
      });

      setAvailableRecipes(recipesWithCosts);
    } catch (err) {
      console.error('Error fetching recipes with costs:', err);
      toast.error('No se pudieron calcular los costos de las recetas');
    }
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

  const handleGenerateShoppingList = async (event) => {
    setSelectedEvent(event);
    setIsShoppingModalOpen(true);
    setHasExistingDist(false); // Reset por defecto
    
    try {
      const { data: selection } = await supabase
        .from('evento_productos')
        .select('id, receta_id, cantidad, recetas_base (nombre, categoria)')
        .eq('evento_id', event.id);

      const products = selection.map(p => ({
        id: p.id,
        receta_id: p.receta_id,
        nombre: p.recetas_base?.nombre || 'Receta sin nombre',
        cantidad: p.cantidad || 0,
        categoria: p.recetas_base?.categoria || ''
      }));
      setEventProductsForDist(products);
      
      const alreadyHasDist = products.some(p => p.cantidad > 0);
      
      if (alreadyHasDist) {
        setHasExistingDist(true);
        calculateShoppingList(event.id);
      } else {
        setShoppingStep('ai');
        fetchAiSuggestions(event, selection);
      }
    } catch (err) {
      toast.error('Error al cargar productos');
    }
  };

  const fetchAiSuggestions = async (event, currentSelection = []) => {
    setIsAiLoading(true);
    setAiError(null);
    setSelectedAiOption(null);
    setAiSuggestions([]);
    setAiResumen(null);

    const controller = new AbortController();
    const timeoutId  = setTimeout(() => controller.abort(), 90000);

    try {
      // Si no nos pasaron la selección, la buscamos (fallback)
      let recipesForAi = currentSelection;
      if (recipesForAi.length === 0) {
        const { data } = await supabase
          .from('evento_productos')
          .select('receta_id, recetas_base (nombre, categoria)')
          .eq('evento_id', event.id);
        recipesForAi = data || [];
      }

      const payload = {
        evento_id: event.id,
        nombre_evento: event.nombre_evento,
        tipo_evento: event.tipo_evento || 'fiesta',
        numero_personas: event.numero_personas,
        hora_inicio: event.hora_inicio || null,
        hora_fin: event.hora_fin || null,
        recetas: recipesForAi.map(p => ({
          receta_id: p.receta_id,
          nombre: p.recetas_base?.nombre || p.nombre,
          categoria: p.recetas_base?.categoria || p.categoria
        }))
      };

      const response = await fetch(import.meta.env.VITE_N8N_SHOPPING_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      if (!response.ok) throw new Error('Error en el servidor de sugerencias');
      
      const rawRes = await response.json();
      console.log('N8N Response:', rawRes);

      // Aplanar arrays anidados si existen
      let data = rawRes;
      while (Array.isArray(data) && data.length > 0) {
        data = data[0];
      }
      
      // Si n8n responde con error explícito, ir a manual
      if (data.success === false) {
        console.warn('Asistente IA no disponible:', data.error);
        toast.error('Asistente no disponible. Pasando a modo manual.');
        setShoppingStep('distribute');
        return;
      }

      console.log('Final AI Resumen:', data.resumen);
      console.log('Final AI Escenarios:', data.escenarios);
      
      setAiResumen(data.resumen || null);
      setAiSuggestions(data.escenarios || []);
    } catch (err) {
      console.error('AI Error:', err);
      const isTimeout = err.name === 'AbortError';
      toast.error(isTimeout ? 'Tiempo de espera agotado.' : 'Error al conectar con el asistente. Puedes distribuir manualmente.');
      setAiError(isTimeout ? 'Tiempo de espera agotado (30s)' : 'No pudimos conectar con la IA');
      
      // Fallback automático a manual para evitar pantalla negra o bloqueo
      if (currentSelection.length > 0) {
        setShoppingStep('distribute');
      }
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleManualDistribution = () => {
    setShoppingStep('distribute');
  };

  const handleUseAiSuggestion = (option) => {
    // Aplicar las cantidades sugeridas a lo que ya tenemos cargado
    const newDist = eventProductsForDist.map(p => {
      const suggested = option.distribucion.find(d => d.receta_id === p.receta_id);
      return {
        ...p,
        cantidad: suggested ? suggested.cantidad : 0
      };
    });

    setEventProductsForDist(newDist);
    setShoppingStep('distribute');
    toast.success(`Distribución "${option.titulo}" aplicada`);
  };

  const handleMarkAsFinished = async (event) => {
    if (!window.confirm('¿Marcar este evento como finalizado? El inventario NO se descontará automáticamente.')) return;
    const loadingToast = toast.loading('Actualizando estado...');
    try {
      const { error } = await supabase.from('eventos').update({ estado: 'finalizado' }).eq('id', event.id);
      if (error) throw error;
      toast.success('Evento marcado como finalizado', { id: loadingToast });
      fetchEvents();
    } catch (err) {
      toast.error('Error: ' + err.message, { id: loadingToast });
    }
  };

  const handleDeductInventory = async (event) => {
    if (!window.confirm('¿Deseas DESCONTAR el inventario ahora? Esta acción no se puede deshacer.')) return;
    const loadingToast = toast.loading('Calculando e impactando insumos...');
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
          deficit.push({ 
            nombre: currentItem?.nombre || 'Insumo desconocido', 
            faltante: qty - currentStock, 
            unidad: currentItem?.unidad || 'Pzas', 
            proveedor: currentItem?.proveedor || 'No definido' 
          });
        }

        // Registrar movimiento y actualizar stock
        await supabase.from('movimientos_inventario').insert({ 
          id_insumo: insumoId, 
          tipo: 'salida', 
          cantidad: qty, 
          motivo: `Consumo Evento: ${event.nombre_evento}` 
        });
        await supabase.from('inventario').update({ 
          cantidad_actual: currentStock - qty 
        }).eq('id', insumoId);
      }

      if (deficit.length > 0) {
        setDeficitItems(deficit);
        setIsDeficitModalOpen(true);
        toast.warning('¡Inventario descontado! Se detectaron faltantes.', { id: loadingToast });
      } else {
        toast.success('¡Inventario descontado correctamente!', { id: loadingToast });
      }
      
      fetchEvents();
    } catch (err) {
      toast.error('Error al descontar: ' + err.message, { id: loadingToast });
    }
  };



  const calculateShoppingList = async (eventId) => {
    setIsCalculatingList(true);
    try {
      // Fetch data completa para el cálculo
      const { data: selection } = await supabase
        .from('evento_productos')
        .select(`
          id,
          cantidad,
          recetas_base (
            nombre, 
            receta_componentes (
              insumo_id, 
              insumo_nombre_manual, 
              cantidad, 
              unidad
            )
          )
        `)
        .eq('evento_id', eventId);

      // Fetch inventario, insumos y MEZCLAS
      const { data: inventoryData } = await supabase.from('inventario').select('*');
      const { data: insumosData } = await supabase.from('insumos').select('*');
      const { data: mezclasData } = await supabase
        .from('insumo_mezclas')
        .select('*, insumos(id, marca, tipo_insumo, precio_x_ml, ml_gr_pieza)')
        .order('nombre_generico');

      const totals = {};
      selection.forEach(p => {
        const recipePortions = p.cantidad || 0;
        p.recetas_base.receta_componentes.forEach(comp => {
          const isGeneric = !comp.insumo_id;
          
          if (isGeneric) {
            // Buscar si tiene mezcla definida
            const mixtures = mezclasData?.filter(m => m.nombre_generico.toLowerCase() === comp.insumo_nombre_manual?.toLowerCase());
            
            if (mixtures && mixtures.length > 0) {
              mixtures.forEach(m => {
                const insumoId = m.insumo_id;
                const qtyDesglosada = (comp.cantidad * recipePortions * Number(m.porcentaje)) / 100;
                
                if (!totals[insumoId]) {
                  const ins = insumosData?.find(i => i.id === insumoId);
                  const inv = inventoryData?.find(i => i.insumo_id === insumoId);
                  totals[insumoId] = {
                    nombre: ins?.marca || 'Desconocido',
                    insumo_id: insumoId,
                    necesitas: 0,
                    en_inventario: inv?.cantidad_actual || 0,
                    unidad: ins?.presentacion || inv?.unidad || 'ML',
                    precio_x_ml: ins?.precio_x_ml || 0,
                    is_generic: false,
                    desglosado_de: comp.insumo_nombre_manual
                  };
                }
                totals[insumoId].necesitas += qtyDesglosada;
              });
              return; // Pasar al siguiente componente
            }
            
            // Si NO tiene mezcla, tratar como genérico normal
            const key = `gen_${comp.insumo_nombre_manual}`;
            if (!totals[key]) {
              const precioPromedio = insumosData
                ?.filter(i => i.tipo_insumo?.toLowerCase() === comp.insumo_nombre_manual?.toLowerCase())
                .reduce((sum, i, _, arr) => sum + ((i.precio_x_ml || 0) / arr.length), 0) || 0;

              totals[key] = {
                nombre: comp.insumo_nombre_manual,
                necesitas: 0,
                en_inventario: 0,
                a_comprar: 0,
                unidad: comp.unidad || 'Pzas',
                is_generic: true,
                precio_x_ml: precioPromedio,
                sin_mezcla: true
              };
            }
            totals[key].necesitas += comp.cantidad * recipePortions;
            
          } else {
            // Item específico
            const key = comp.insumo_id;
            if (!totals[key]) {
              const insumo = insumosData?.find(i => i.id === comp.insumo_id);
              const inv = inventoryData?.find(i => i.insumo_id === comp.insumo_id);

              totals[key] = {
                nombre: insumo?.marca || 'Desconocido',
                insumo_id: key,
                necesitas: 0,
                en_inventario: inv?.cantidad_actual || 0,
                unidad: insumo?.presentacion || inv?.unidad || comp.unidad || 'Pzas',
                proveedor: inv?.proveedor || 'N/A',
                precio_x_ml: insumo?.precio_x_ml || 0,
                is_generic: false
              };
            }
            totals[key].necesitas += comp.cantidad * recipePortions;
          }
        });
      });

      const finalItems = Object.values(totals).map(item => ({
        ...item,
        a_comprar: item.is_generic ? item.necesitas : Math.max(0, item.necesitas - item.en_inventario)
      }));

      setShoppingListItems(finalItems);
      setShoppingStep('list');
    } catch (err) {
      console.error('Calculation error:', err);
      toast.error('Error al calcular la lista');
    } finally {
      setIsCalculatingList(false);
    }
  };

  const handleSaveDistAndCalculate = async () => {
    const loadingToast = toast.loading('Guardando y calculando insumos...');
    try {
      // 1. Guardar cantidades en Supabase
      for (const item of eventProductsForDist) {
        await supabase
          .from('evento_productos')
          .update({ cantidad: item.cantidad })
          .eq('id', item.id);
      }

      await calculateShoppingList(selectedEvent.id);
      toast.success('Lista calculada con éxito', { id: loadingToast });
    } catch (err) {
      toast.error('Error: ' + err.message, { id: loadingToast });
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
                  {event.estado !== 'finalizado' ? (
                    <>
                      <button onClick={() => openPanel(event)}
                        className={`btn-secondary w-full py-3 text-[10px] font-black tracking-widest flex items-center justify-center gap-2 ${selectedEvent?.id === event.id && panelOpen ? 'ring-1 ring-brand-red/50' : ''}`}>
                        <Beer size={14} /> Seleccionar Bebidas
                      </button>
                      <button onClick={() => handleGenerateShoppingList(event)}
                        className="btn-secondary w-full py-3 text-[10px] font-black tracking-widest flex items-center justify-center gap-2 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10">
                        <ShoppingBag size={14} /> Lista de compras
                      </button>
                      <button onClick={() => handleMarkAsFinished(event)}
                        className="btn-primary w-full py-3 text-[10px] font-black tracking-widest flex items-center justify-center gap-2 shadow-xl shadow-brand-red/20">
                        <CheckCircle size={14} /> Finalizar Evento
                      </button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => handleGenerateShoppingList(event)}
                        className="btn-secondary w-full py-3 text-[10px] font-black tracking-widest flex items-center justify-center gap-2 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10">
                        <ShoppingBag size={14} /> Lista de compras
                      </button>
                      <button onClick={() => handleDeductInventory(event)}
                        className="btn-primary w-full py-3 text-[10px] font-black tracking-widest flex items-center justify-center gap-2 bg-emerald-600 border-emerald-500 hover:bg-emerald-500 shadow-xl shadow-emerald-500/20">
                        <Play size={14} /> Descontar Inventario
                      </button>
                      <div className="p-3 bg-white/5 rounded-xl border border-white/5 text-center">
                        <p className="text-[9px] font-black text-slate-500 tracking-widest">EVENTO FINALIZADO</p>
                      </div>
                    </>
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

                <div className="mt-5 pt-4 border-t border-white/5 flex flex-col gap-3">
                  <div className="flex justify-between items-center">
                    <div className="text-[10px] font-black text-slate-500 tracking-widest">{selectedRecipes.length} productos sel.</div>
                    <div className="flex gap-3">
                      <button onClick={closePanel} className="btn-secondary text-xs px-5">Cancelar</button>
                      <button onClick={handleSaveSelection} className="btn-primary text-xs px-7 flex items-center gap-2">
                        <Save size={14} /> Guardar
                      </button>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleGenerateShoppingList(selectedEvent)}
                    className="w-full py-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-[10px] font-black tracking-widest flex items-center justify-center gap-2 hover:bg-emerald-500/20 transition-all"
                  >
                    <ShoppingBag size={14} /> Generar Lista de Compras
                  </button>
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

      {/* MODAL LISTA DE COMPRAS (MANUAL) */}
      <AnimatePresence>
        {isShoppingModalOpen && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/95 backdrop-blur-2xl">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="glass max-w-4xl w-full p-8 relative flex flex-col max-h-[90vh]"
            >
              <button onClick={() => setIsShoppingModalOpen(false)} className="absolute right-6 top-6 text-slate-500 hover:text-white transition-colors">
                <X size={24} />
              </button>

              <div className="mb-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-brand-red/20 rounded-xl flex items-center justify-center">
                    <ShoppingBag size={24} className="text-brand-red" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-white tracking-tighter">
                      {shoppingStep === 'distribute' ? 'Distribuir porciones' : 'Lista de preparación'}
                    </h2>
                    <p className="text-slate-500 text-[10px] font-black tracking-widest">{selectedEvent?.nombre_evento} • {selectedEvent?.numero_personas} PAX</p>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                {shoppingStep === 'ai' ? (
                  <div className="space-y-6">
                    {isAiLoading ? (
                      <div className="flex flex-col items-center justify-center py-20 space-y-4">
                        <div className="w-12 h-12 border-4 border-brand-red border-t-transparent rounded-full animate-spin" />
                        <p className="text-slate-400 font-bold animate-pulse">Consultando al experto en micheladas...</p>
                      </div>
                    ) : aiError ? (
                      <div className="p-8 bg-brand-red/5 border border-brand-red/20 rounded-3xl text-center">
                        <TrendingUp size={40} className="mx-auto text-brand-red mb-4 opacity-50" />
                        <h3 className="text-xl font-black text-white mb-2">{aiError}</h3>
                        <p className="text-slate-400 text-sm mb-6">No pudimos obtener las sugerencias automáticas en este momento.</p>
                        <button onClick={handleManualDistribution} className="btn-primary px-8 py-3 w-full">
                          Continuar manualmente
                        </button>
                      </div>
                    ) : (
                      <div className="grid gap-4">
                        <p className="text-xs font-black text-slate-500 tracking-widest uppercase mb-2">Sugerencias de Distribución (IA)</p>
                        
                        {aiResumen && (
                          <div className="p-4 bg-brand-red/10 border border-brand-red/20 rounded-2xl mb-2">
                            <p className="text-[11px] font-black text-brand-red tracking-tight uppercase text-center">
                              Estimado: {aiResumen.bebidas_por_persona} bebidas/persona · {aiResumen.total_porciones} porciones totales · Horario: {aiResumen.horario_label}
                            </p>
                          </div>
                        )}
                        {Array.isArray(aiSuggestions) && aiSuggestions.length > 0 ? (
                          aiSuggestions.map((opt, idx) => {
                            const totalPorciones = opt.distribucion.reduce((sum, item) => sum + item.cantidad, 0);
                            const costoEscenario = opt.distribucion.reduce((total, item) => {
                              const receta = availableRecipes.find(r => r.id === item.receta_id);
                              const costoUnitario = receta?.total_cost || receta?.costo_total || 0;
                              return total + (costoUnitario * item.cantidad);
                            }, 0);

                            return (
                              <motion.div
                                key={idx}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => setSelectedAiOption(idx)}
                                className={`p-5 rounded-3xl border-2 transition-all cursor-pointer relative overflow-hidden group
                                  ${selectedAiOption === idx ? 'bg-brand-red/10 border-brand-red shadow-lg shadow-brand-red/20' : 'bg-white/5 border-white/5 hover:border-white/10'}`}
                              >
                                <div className="flex justify-between items-start mb-3 relative z-10">
                                  <div>
                                    <h4 className={`text-lg font-black tracking-tighter ${selectedAiOption === idx ? 'text-brand-red' : 'text-white'}`}>{opt.titulo}</h4>
                                    <p className="text-xs text-slate-500 font-bold">{opt.descripcion}</p>
                                    {opt.razon && (
                                      <p className="text-[10px] text-brand-red/60 font-bold mt-1 italic">
                                        {opt.razon}
                                      </p>
                                    )}
                                    <p className="text-[11px] font-black text-brand-red mt-2 flex items-center gap-1">
                                      <span>🍺 Total: {totalPorciones} porciones · 💰 Costo estimado:</span> ${costoEscenario.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN
                                    </p>
                                  </div>
                                  {selectedAiOption === idx && <CheckCircle size={20} className="text-brand-red" />}
                                </div>
                              <div className="flex flex-wrap gap-2 relative z-10">
                                {Array.isArray(opt.distribucion) && opt.distribucion.map((d, i) => (
                                  <span key={i} className="text-[10px] font-black px-2 py-1 rounded-lg bg-white/5 text-slate-400 border border-white/5">
                                    {d.nombre}: {d.cantidad}
                                  </span>
                                ))}
                              </div>
                            </motion.div>
                          );
                        })
                      ) : (
                          <div className="p-10 text-center bg-white/5 rounded-3xl border border-white/5">
                            <p className="text-slate-500 font-bold">La IA no devolvió opciones válidas.</p>
                          </div>
                        )}
                        <div className="flex flex-col gap-3 mt-4">
                          <button
                            disabled={selectedAiOption === null}
                            onClick={() => handleUseAiSuggestion(aiSuggestions[selectedAiOption])}
                            className="btn-primary py-4 text-sm font-black shadow-xl shadow-brand-red/20 disabled:opacity-50 disabled:grayscale"
                          >
                            Usar esta distribución
                          </button>
                          <button onClick={handleManualDistribution} className="text-[11px] font-black text-slate-500 hover:text-white transition-colors tracking-widest uppercase py-2">
                            Omitir y distribuir manualmente
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : shoppingStep === 'distribute' ? (
                  <div className="space-y-6">
                    {hasExistingDist && (
                      <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center gap-3">
                        <CheckCircle size={20} className="text-emerald-400 shrink-0" />
                        <p className="text-emerald-400 text-xs font-black uppercase tracking-tight">Distribución guardada — puedes modificarla</p>
                      </div>
                    )}

                    <div className="flex justify-between items-center px-1">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black text-slate-500 tracking-widest uppercase">Total asignado</span>
                        <div className="flex items-baseline gap-1 mt-1">
                          <span className={`text-2xl font-black ${eventProductsForDist.reduce((acc, curr) => acc + Number(curr.cantidad), 0) > selectedEvent?.numero_personas ? 'text-brand-red' : 'text-emerald-400'}`}>
                            {eventProductsForDist.reduce((acc, curr) => acc + Number(curr.cantidad), 0)}
                          </span>
                          <span className="text-slate-500 font-bold text-xs uppercase">/ {selectedEvent?.numero_personas} PAX</span>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setShoppingStep('ai');
                          setHasExistingDist(false);
                          fetchAiSuggestions(selectedEvent, eventProductsForDist);
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-brand-red/10 border border-white/5 hover:border-brand-red/20 rounded-xl text-[10px] font-black text-slate-400 hover:text-brand-red transition-all tracking-widest uppercase"
                      >
                        <RefreshCw size={14} className="shrink-0" />
                        Pedir nuevas sugerencias IA
                      </button>
                    </div>

                    <div className="grid gap-3">
                      {eventProductsForDist.map((item, idx) => (
                        <div key={item.id} className="p-4 bg-white/5 rounded-2xl border border-white/5 flex items-center justify-between group hover:border-brand-red/30 transition-all">
                          <span className="font-bold text-slate-200">{item.nombre}</span>
                          <div className="flex items-center gap-3">
                            <input
                              type="number"
                              className="w-24 bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-center font-black text-white focus:border-brand-red transition-all"
                              value={item.cantidad}
                              onChange={(e) => {
                                const newDist = [...eventProductsForDist];
                                newDist[idx].cantidad = Math.max(0, Number(e.target.value));
                                setEventProductsForDist(newDist);
                              }}
                            />
                            <span className="text-[10px] font-black text-slate-500 tracking-widest uppercase">PORCIONES</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Con stock */}
                    <div>
                      <h3 className="text-xs font-black text-brand-red tracking-widest mb-4 flex items-center gap-2">
                        <Package size={14} /> INSUMOS CON STOCK REGISTRADO
                      </h3>
                      <div className="bg-white/5 rounded-2xl border border-white/5 overflow-hidden">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="bg-white/5 border-b border-white/10">
                              <th className="p-4 font-black text-slate-500 tracking-widest uppercase">Insumo</th>
                              <th className="p-4 font-black text-slate-500 tracking-widest uppercase text-center">Necesitas</th>
                              <th className="p-4 font-black text-slate-500 tracking-widest uppercase text-center">En Inventario</th>
                              <th className="p-4 font-black text-slate-500 tracking-widest uppercase text-center text-brand-red">A Comprar</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5">
                            {shoppingListItems.filter(i => !i.is_generic).map((item, idx) => (
                              <tr key={idx} className="hover:bg-white/5 transition-colors">
                                <td className="p-4 font-bold text-white">{item.nombre}</td>
                                <td className="p-4 font-black text-center text-slate-400">{item.necesitas.toFixed(1)} {item.unidad}</td>
                                <td className="p-4 font-black text-center text-slate-400">{item.en_inventario.toFixed(1)} {item.unidad}</td>
                                <td className={`p-4 font-black text-center ${item.a_comprar > 0 ? 'text-brand-red bg-brand-red/5' : 'text-emerald-400'}`}>
                                  {item.a_comprar > 0 ? item.a_comprar.toFixed(1) : 'OK'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Sin stock / Genéricos */}
                    {shoppingListItems.some(i => i.is_generic) && (
                      <div>
                        <h3 className="text-xs font-black text-emerald-400 tracking-widest mb-4 flex items-center gap-2">
                          <Search size={14} /> INSUMOS SIN STOCK (GENÉRICOS)
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {shoppingListItems.filter(i => i.is_generic).map((item, idx) => (
                            <div key={idx} className="p-4 bg-white/5 rounded-2xl border border-white/5 flex justify-between items-center">
                              <span className="font-bold text-white">{item.nombre}</span>
                              <span className="font-black text-emerald-400">{item.necesitas.toFixed(1)} {item.unidad}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="mt-8 pt-6 border-t border-white/10 flex justify-between items-center">
                <p className="text-[10px] font-black text-slate-500 tracking-widest italic">
                  {shoppingStep === 'distribute' ? '* Define cuántas porciones prepararás de cada bebida.' : '* Basado en porciones asignadas y stock actual.'}
                </p>
                <div className="flex gap-3">
                  <button onClick={() => setIsShoppingModalOpen(false)} className="btn-secondary px-6">Cerrar</button>
                  {shoppingStep === 'distribute' ? (
                    <button onClick={handleSaveDistAndCalculate} className="btn-primary px-8 flex items-center gap-2">
                      <Save size={16} />
                      <span className="font-black">Guardar y ver lista</span>
                    </button>
                  ) : (
                    <>
                      <button 
                        onClick={() => setShoppingStep('distribute')} 
                        className="px-6 py-2 border border-white/10 hover:border-white/20 rounded-xl text-[10px] font-black text-slate-400 hover:text-white transition-all tracking-widest uppercase"
                      >
                        Editar porciones
                      </button>
                      <PDFDownloadLink
                        document={<EventShoppingListPDF event={selectedEvent} items={shoppingListItems} recipes={eventProductsForDist} />}
                        fileName={`Lista_Compras_${selectedEvent?.nombre_evento.replace(/\s+/g, '_')}.pdf`}
                        className="btn-primary px-8 flex items-center gap-2"
                      >
                        {({ loading }) => (
                          <>
                            <Save size={16} />
                            <span className="font-black">{loading ? 'Generando...' : 'Descargar PDF'}</span>
                          </>
                        )}
                      </PDFDownloadLink>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default EventsPage;
