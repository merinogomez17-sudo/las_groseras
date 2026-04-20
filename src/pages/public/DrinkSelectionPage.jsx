import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Beer, CheckCircle, ArrowRight, Info, 
  MapPin, Calendar, Users, Star,
  Instagram, MessageCircle, Share2
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';
import { PACKAGE_LIMITS, CATEGORY_LABELS, normalizePkgId } from '../../utils/eventUtils';

const DrinkSelectionPage = () => {
  const { eventId } = useParams();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  
  const [availableRecipes, setAvailableRecipes] = useState([]);
  const [selectedRecipes, setSelectedRecipes] = useState([]);
  
  const [availableBeers, setAvailableBeers] = useState([]);
  const [selectedBeers, setSelectedBeers] = useState([]);

  useEffect(() => {
    fetchEventData();
    fetchRecipes();
    fetchBeers();
  }, [eventId]);

  const fetchEventData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('eventos')
        .select(`
          *,
          clientes (nombre_completo),
          cotizaciones (paquetes_incluidos)
        `)
        .eq('id', eventId)
        .single();

      if (error) throw error;
      setEvent(data);
      
      // If event is already finalized or locked, handle that here
      if (data.estado === 'finalizado') {
        setSubmitted(true);
      }

      // Load existing selection
      if (data.cervezas_seleccionadas) {
        setSelectedBeers(data.cervezas_seleccionadas);
      }

      // Pre-select basic micheladas
      const basics = availableRecipes.filter(r => r.categoria === 'Basica').map(r => r.id);
      setSelectedRecipes(prev => Array.from(new Set([...prev, ...basics])));
    } catch (error) {
      toast.error('Error al cargar la selección: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecipes = async () => {
    const { data } = await supabase.from('recetas_base').select('*').order('nombre');
    const recipes = data || [];
    setAvailableRecipes(recipes);
    
    // Auto-selection of basics once recipes are loaded
    const basics = recipes.filter(r => r.categoria === 'Basica').map(r => r.id);
    setSelectedRecipes(prev => Array.from(new Set([...prev, ...basics])));
  };

  const fetchBeers = async () => {
    const { data } = await supabase
      .from('inventario')
      .select('id, nombre')
      .in('categoria', ['Cerveza', 'Cervezas'])
      .order('nombre');
    setAvailableBeers(data || []);
  };

  const handleToggleBeer = (beerName) => {
    if (selectedBeers.includes(beerName)) {
      setSelectedBeers(selectedBeers.filter(b => b !== beerName));
    } else {
      setSelectedBeers([...selectedBeers, beerName]);
    }
  };

  const handleToggleRecipe = (id, category) => {
    const pkgRaw = event.paquete_contratado || event.cotizaciones?.paquetes_incluidos?.[0]?.id || '';
    const pkgKey = normalizePkgId(pkgRaw);
    const limits = PACKAGE_LIMITS[pkgKey] || {};
    const limit = limits[category];
    
    if (selectedRecipes.includes(id)) {
      if (category === 'Basica') return; // Cannot unselect basics
      setSelectedRecipes(selectedRecipes.filter(rid => rid !== id));
      return;
    }

    if (limit !== undefined) {
      const currentSelectedInCategory = availableRecipes
        .filter(r => r.categoria === category && selectedRecipes.includes(r.id))
        .length;
      
      if (currentSelectedInCategory >= limit) {
        toast.error(`¡Límite alcanzado! Este paquete incluye ${limit} ${CATEGORY_LABELS[category]}`);
        return;
      }
    }

    setSelectedRecipes([...selectedRecipes, id]);
  };

  const handleConfirmSelection = async () => {
    if (selectedRecipes.length === 0) return;
    
    setLoading(true);
    try {
      // 1. Clear existing products (in case they are re-submitting)
      await supabase.from('evento_productos').delete().eq('evento_id', event.id);

      // 2. Insert new selections
      const products = selectedRecipes.map(rid => ({
        evento_id: event.id,
        receta_id: rid
      }));

      const { error } = await supabase.from('evento_productos').insert(products);
      if (error) throw error;

      // 3. Update event with selected beers
      const { error: eventError } = await supabase
        .from('eventos')
        .update({ cervezas_seleccionadas: selectedBeers })
        .eq('id', event.id);
      
      if (eventError) throw eventError;

      // 4. Mark as confirmed/locked (optional: change event status)
      // We'll keep it as 'confirmado' but set the submitted state
      setSubmitted(true);
      toast.success('¡Selección enviada con éxito!');
    } catch (error) {
      toast.error('Error al guardar: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !event) {
    return (
      <div className="min-h-screen bg-brand-dark flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-brand-red border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-brand-dark flex items-center justify-center p-6 bg-[url('https://images.unsplash.com/photo-1470337458703-46ad1756a187?auto=format&fit=crop&q=80&w=2069')] bg-cover bg-center">
        <div className="absolute inset-0 bg-brand-dark/95 backdrop-blur-md"></div>
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          className="glass max-w-md w-full p-10 text-center relative z-10 border-t-4 border-emerald-500"
        >
          <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-500/20">
            <CheckCircle size={40} className="text-white" />
          </div>
          <h2 className="text-4xl font-black text-white italic tracking-tighter mb-4 uppercase">¡LISTO!</h2>
          <p className="text-slate-400 mb-8 leading-relaxed">
            Hemos recibido tus preferencias. Nos encargaremos de llevar todo el sabor de **Las Groseras** a tu evento.
          </p>
          <div className="space-y-4">
             <div className="p-4 bg-white/5 rounded-2xl text-left border border-white/5">
                <div className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">Tu Selección</div>
                <div className="text-sm font-bold text-white">
                  {selectedRecipes.length} Productos seleccionados
                </div>
             </div>
             <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Si necesitas cambios, contacta a tu asesor.</p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-dark font-sans selection:bg-brand-red/30">
      {/* Background Decor */}
      <div className="fixed inset-0 bg-[url('https://images.unsplash.com/photo-1541533848490-bc8115cd6522?auto=format&fit=crop&q=80&w=2069')] bg-cover bg-fixed bg-center opacity-20 grayscale brightness-50"></div>
      
      <div className="relative z-10 max-w-4xl mx-auto px-4 pt-12 pb-40">
        {/* Header Section */}
        <header className="text-center mb-12">
          <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="flex flex-col items-center">
            <div className="w-24 h-24 mb-6 p-2 bg-white/5 rounded-2xl backdrop-blur-md border border-white/10 shadow-2xl">
              <img src="/logo.png" alt="Las Groseras" className="w-full h-full object-contain" />
            </div>
            <div className="bg-brand-red px-6 py-1.5 rounded-full text-[10px] font-black tracking-[0.3em] uppercase text-white italic shadow-lg mb-6">
              Selección de Bebidas
            </div>
            <h1 className="text-4xl md:text-6xl font-black text-white italic tracking-tighter mb-3 uppercase">
              ¡HOLA, <span className="text-brand-red">{event?.clientes?.nombre_completo.split(' ')[0]}</span>!
            </h1>
            <p className="text-slate-400 text-sm md:text-base max-w-lg mx-auto mb-8">
              Diseña la barra perfecta para tu evento. Selecciona los sabores que más te gusten según tu paquete.
            </p>

            <a 
              href="/menu_las_groseras.pdf" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 px-8 py-3 bg-white/5 border border-white/10 rounded-2xl text-slate-200 hover:bg-white/10 hover:text-white transition-all group/menu shadow-xl"
            >
              <div className="w-10 h-10 rounded-xl bg-brand-red/10 flex items-center justify-center text-brand-red group-hover/menu:scale-110 transition-transform">
                <Info size={20} />
              </div>
              <div className="text-left">
                <div className="text-[9px] font-black uppercase tracking-widest leading-none mb-1 opacity-60">Consultar Catálogo</div>
                <div className="text-sm font-black uppercase italic tracking-tighter">DESCARGAR MENÚ COMPLETO</div>
              </div>
            </a>
          </motion.div>
        </header>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
          <div className="glass p-5 flex items-center gap-4 border-l-4 border-brand-red">
            <div className="w-10 h-10 rounded-xl bg-brand-red/10 flex items-center justify-center text-brand-red">
              <Star size={20} />
            </div>
            <div>
              <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">Paquete Contratado</div>
              <div className="text-sm font-black text-white italic uppercase">{event?.paquete_contratado || 'Personalizado'}</div>
            </div>
          </div>
          <div className="glass p-5 flex items-center gap-4 border-l-4 border-emerald-500">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
              <Users size={20} />
            </div>
            <div>
              <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">Capacidad</div>
              <div className="text-sm font-black text-white italic uppercase">{event?.numero_personas} Invitados</div>
            </div>
          </div>
          <div className="glass p-5 flex items-center gap-4 border-l-4 border-slate-500">
            <div className="w-10 h-10 rounded-xl bg-slate-500/10 flex items-center justify-center text-slate-400">
              <Calendar size={20} />
            </div>
            <div>
              <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">Estado de Selección</div>
              <div className="text-sm font-black text-white italic uppercase">Pendiente</div>
            </div>
          </div>
        </div>

      {/* Beer Brand Selection */}
        {availableBeers.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="space-y-6 mb-12"
          >
            <div className="flex justify-between items-center px-2">
              <h3 className="text-xl font-black text-white italic tracking-tight uppercase flex items-center gap-3">
                <Beer size={20} className="text-brand-red" /> Selecciona tu Cerveza Base
              </h3>
              <span className="text-[10px] font-black px-3 py-1.5 rounded-full bg-brand-red/10 text-brand-red border border-brand-red/20 uppercase tracking-widest">
                {selectedBeers.length} Seleccionadas
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {availableBeers.map(beer => (
                <button 
                  key={beer.id}
                  onClick={() => handleToggleBeer(beer.nombre)}
                  className={`group relative p-6 rounded-3xl border transition-all text-left ${selectedBeers.includes(beer.nombre) ? 'bg-brand-red border-brand-red shadow-xl shadow-brand-red/30' : 'bg-white/5 border-white/5 hover:border-white/20'}`}
                >
                  <div className="flex flex-col gap-1">
                    <div className={`text-sm font-black uppercase italic tracking-tighter ${selectedBeers.includes(beer.nombre) ? 'text-white' : 'text-slate-200'}`}>
                      {beer.nombre}
                    </div>
                    <div className={`text-[9px] font-bold uppercase tracking-widest ${selectedBeers.includes(beer.nombre) ? 'text-white/60' : 'text-slate-500'}`}>
                      Pincha para seleccionar
                    </div>
                  </div>
                  
                  {selectedBeers.includes(beer.nombre) && (
                    <div className="absolute top-4 right-4 text-white">
                      <CheckCircle size={20} />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Categories Loop */}
        <div className="space-y-12 mb-20">
          {Object.keys(CATEGORY_LABELS).map(cat => {
            const pkgRaw = event?.paquete_contratado || event?.cotizaciones?.paquetes_incluidos?.[0]?.id || '';
            const pkgKey = normalizePkgId(pkgRaw);
            const limits = PACKAGE_LIMITS[pkgKey] || {};
            const limit = limits[cat];
            const currentSelected = availableRecipes.filter(r => r.categoria === cat && selectedRecipes.includes(r.id)).length;
            const isAvailable = cat === 'Basica' || limit > 0 || !pkgKey;

            if (!isAvailable) return null;

            return (
              <motion.div 
                key={cat} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                className="space-y-6"
              >
                <div className="flex justify-between items-center px-2">
                  <h3 className="text-xl font-black text-white italic tracking-tight uppercase flex items-center gap-3">
                    <ArrowRight size={20} className="text-brand-red" /> {CATEGORY_LABELS[cat]}
                  </h3>
                  {limit && (
                    <span className={`text-[10px] font-black px-3 py-1.5 rounded-full border ${currentSelected >= limit ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-brand-red/10 text-brand-red border-brand-red/20'}`}>
                      {currentSelected} de {limit} permitidos
                    </span>
                  )}
                  {cat === 'Basica' && (
                    <span className="text-[10px] font-black px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-widest">
                      Incluido ILIMITADO
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                   {availableRecipes.filter(r => r.categoria === cat).map(recipe => (
                     <button 
                       key={recipe.id}
                       onClick={() => handleToggleRecipe(recipe.id, cat)}
                       disabled={cat === 'Basica'}
                       className={`group relative p-6 rounded-3xl border transition-all text-left ${selectedRecipes.includes(recipe.id) ? 'bg-brand-red border-brand-red shadow-xl shadow-brand-red/30' : 'bg-white/5 border-white/5 hover:border-white/20'}`}
                     >
                       <div className="flex flex-col gap-1">
                         <div className={`text-sm font-black uppercase italic tracking-tighter ${selectedRecipes.includes(recipe.id) ? 'text-white' : 'text-slate-200'}`}>
                           {recipe.nombre}
                         </div>
                         {cat !== 'Basica' && (
                           <div className={`text-[9px] font-bold uppercase tracking-widest ${selectedRecipes.includes(recipe.id) ? 'text-white/60' : 'text-slate-500'}`}>
                              Pincha para seleccionar
                           </div>
                         )}
                       </div>
                       
                       {selectedRecipes.includes(recipe.id) && (
                         <div className="absolute top-4 right-4 text-white">
                           <CheckCircle size={20} />
                         </div>
                       )}
                     </button>
                   ))}
                </div>
              </motion.div>
            );
          })}
        </div>
        
  {/* Footer Bar */}
  <div className="fixed bottom-0 left-0 w-full bg-brand-dark/95 backdrop-blur-2xl border-t border-white/10 z-50">
    <div className="max-w-4xl mx-auto px-6 py-4">
      <div className="flex items-center justify-between gap-6">
        <div className="hidden sm:block">
           <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Seleccionado</div>
           <div className="text-base font-black text-white italic tracking-tighter uppercase">{selectedRecipes.length + selectedBeers.length} Productos</div>
        </div>
        
        <button 
          onClick={handleConfirmSelection}
          disabled={loading}
          className="btn-primary flex-1 sm:flex-none px-10 py-4 text-lg group shadow-2xl shadow-brand-red/40"
        >
          {loading ? 'GUARDANDO...' : 'CONFIRMAR SELECCIÓN'}
          <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>

      <div className="mt-4 flex flex-col items-center gap-3">
        <div className="flex justify-center gap-8 opacity-50 hover:opacity-100 transition-opacity">
          <Instagram size={18} className="text-white hover:text-brand-red cursor-pointer transition-colors" />
          <MessageCircle size={18} className="text-white hover:text-brand-red cursor-pointer transition-colors" />
          <Share2 size={18} className="text-white hover:text-brand-red cursor-pointer transition-colors" />
        </div>
        <p className="text-[8px] font-bold text-slate-600 uppercase tracking-[0.3em]">Las Groseras • 2024</p>
      </div>
    </div>
  </div>
      </div>
      
    </div>
  );
};

export default DrinkSelectionPage;
