import React, { useState, useEffect } from 'react';
import { 
  FileText, Plus, Search, Filter, Download, 
  Send, Trash2, Edit2, X, Save, Calculator,
  User, Users, Calendar, Package, ChevronRight, CheckCircle,
  PlusCircle, MinusCircle, AlertCircle, Clock, ShieldCheck, CreditCard
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { PDFDownloadLink } from '@react-pdf/renderer';
import QuotePDF from '../../components/quotes/QuotePDF';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';

/**
 * MÓDULO DE COTIZACIONES - WIZARD MEJORADO
 * Incluye selección de paquetes y servicios adicionales (extras).
 */

const PACKAGES = [
  { 
    id: 'bien_portado', 
    nombre: 'Bien Portado', 
    precio_persona: 210, 
    items: ['Barra libre Micheladas (Clásica/Cubana/Clamato)', '2 Sabores de michelada', '2 Horas de Servicio'] 
  },
  { 
    id: 'algo_tranqui', 
    nombre: 'Algo Tranqui', 
    precio_persona: 250, 
    items: ['Barra libre Micheladas (Clásica/Cubana/Clamato)', '3 Sabores de michelada', '1 Trago especial', '3 Horas de Servicio'] 
  },
  { 
    id: 'mal_portado', 
    nombre: 'Mal Portado', 
    precio_persona: 290, 
    items: ['Barra libre Micheladas (Clásica/Cubana/Clamato)', '5 Sabores de michelada', '1 Trago especial', '2 Cervezas especiales', '3 Horas de Servicio'] 
  },
  { 
    id: 'el_mas_perro', 
    nombre: 'El Más Perro', 
    precio_persona: 330, 
    items: ['Barra libre Micheladas (Clásica/Cubana/Clamato)', '5 Sabores de michelada', '3 Tragos especiales', '3 Cervezas especiales', 'Vasos personalizados con stickers', '4 Horas de Servicio'] 
  },
  { 
    id: 'personalizada', 
    nombre: 'Barra Personalizada', 
    precio_persona: 0, 
    items: ['Servicio configurado 100% a la medida', 'Selección de elementos según acuerdo con el cliente'] 
  },
];

const EXTRA_SERVICES = [
  { id: 'shots_tequila', nombre: 'Ronda de Shots Tequila (100)', precio: 1500, icono: '🥃' },
  { id: 'shots_mezcal', nombre: 'Ronda de Shots Mezcal (100)', precio: 1800, icono: '🌵' },
  { id: 'garnish_premium', nombre: 'Garnish Premium (Frutas/Dulces)', precio: 850, icono: '🍓' },
  { id: 'hora_extra', nombre: 'Hora Extra de Servicio', precio: 2200, icono: '⏳' },
  { id: 'hielo_extra', nombre: 'Suministro Hielo Extra', precio: 450, icono: '🧊' },
];

const QuotesPage = () => {
  const [quotes, setQuotes] = useState([]);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [showSuccess, setShowSuccess] = useState(false);
  const [createdQuote, setCreatedQuote] = useState(null);
  
  const [formData, setFormData] = useState({
    lead_id: '',
    numero_personas: 50,
    tipo_evento: '',
    paquete_id: 'bien_portado',
    precio_personalizado: 0,
    personalizado_barra_libre: true,
    personalizado_sabores: 2,
    personalizado_tragos: 0,
    personalizado_cervezas: 0,
    personalizado_horas: 2,
    servicios_adicionales: [], // Array de {id, nombre, precio}
    descuento: 0,
    subtotal: 0,
    iva: 0,
    total: 0,
    notas: ''
  });

  useEffect(() => {
    fetchQuotes();
    fetchLeads();
  }, []);

  const fetchQuotes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('cotizaciones')
        .select(`
          *,
          leads (nombre_contacto, email, telefono, cliente_id),
          clientes (nombre_completo)
        `)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setQuotes(data || []);
    } catch (err) {
      toast.error('Error al cargar cotizaciones');
    } finally {
      setLoading(false);
    }
  };

  const fetchLeads = async () => {
    const { data } = await supabase.from('leads').select('id, nombre_contacto, tipo_evento, numero_personas').eq('estado', 'nuevo');
    setLeads(data || []);
  };

  const calculateTotal = () => {
    const pkg = PACKAGES.find(p => p.id === formData.paquete_id);
    if (!pkg) return;
    
    const precioBase = formData.paquete_id === 'personalizada' ? Number(formData.precio_personalizado || 0) : pkg.precio_persona;
    const subtotalPaquete = (precioBase * formData.numero_personas);
    const subtotalExtras = formData.servicios_adicionales.reduce((acc, curr) => acc + curr.precio, 0);
    
    const subtotal = (subtotalPaquete + subtotalExtras) - formData.descuento;
    const total = subtotal;
    setFormData(prev => ({ ...prev, subtotal, iva: 0, total }));
  };

  useEffect(() => {
    calculateTotal();
  }, [formData.paquete_id, formData.numero_personas, formData.descuento, formData.servicios_adicionales, formData.precio_personalizado]);

  const toggleExtra = (extra) => {
    setFormData(prev => {
      const isSelected = prev.servicios_adicionales.find(e => e.id === extra.id);
      if (isSelected) {
        return {
          ...prev,
          servicios_adicionales: prev.servicios_adicionales.filter(e => e.id !== extra.id)
        };
      } else {
        return {
          ...prev,
          servicios_adicionales: [...prev.servicios_adicionales, extra]
        };
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const loadingToast = toast.loading('Generando cotización...');
    
    try {
      const selectedPkg = PACKAGES.find(p => p.id === formData.paquete_id);
      const { paquete_id, precio_personalizado, personalizado_barra_libre, personalizado_sabores, personalizado_tragos, personalizado_cervezas, personalizado_horas, ...dbData } = formData;
      const precioFinal = paquete_id === 'personalizada' ? Number(precio_personalizado || 0) : selectedPkg.precio_persona;
      
      let finalItems = selectedPkg.items;
      if (paquete_id === 'personalizada') {
        finalItems = [];
        if (personalizado_barra_libre) finalItems.push('Barra libre Micheladas (Clásica/Cubana/Clamato)');
        if (personalizado_sabores > 0) finalItems.push(`${personalizado_sabores} Sabores de michelada`);
        if (personalizado_tragos > 0) finalItems.push(`${personalizado_tragos} ${personalizado_tragos === 1 ? 'Trago especial' : 'Tragos especiales'}`);
        if (personalizado_cervezas > 0) finalItems.push(`${personalizado_cervezas} ${personalizado_cervezas === 1 ? 'Cerveza especial' : 'Cervezas especiales'}`);
        if (personalizado_horas > 0) finalItems.push(`${personalizado_horas} Horas de Servicio`);
        if (finalItems.length === 0) finalItems.push('Servicio configurado a la medida');
      }
      
      const payload = {
        ...dbData,
        paquetes_incluidos: [{
          ...selectedPkg,
          items: finalItems,
          precio_persona: precioFinal,
          // Guardamos los límites numéricos para que las páginas de selección los puedan leer
          limites_personalizados: paquete_id === 'personalizada' ? {
            'Cerveza con sabor': personalizado_sabores,
            'Bebida especial': personalizado_tragos,
            'Cerveza especial': personalizado_cervezas
          } : null
        }],
        precio_por_persona: precioFinal,
        numero_cotizacion: `COT-${Date.now().toString().slice(-4)}`,
        estado: 'borrador'
      };

      const { error } = await supabase
        .from('cotizaciones')
        .insert([payload]);
      
      if (error) throw error;
      
      setCreatedQuote(payload);
      setShowSuccess(true);
      toast.success('Cotización creada con éxito', { id: loadingToast });
      fetchQuotes();
    } catch (err) {
      toast.error('Error al guardar: ' + err.message, { id: loadingToast });
    }
  };

  const handleConfirmPayment = async (quote) => {
    if (!window.confirm(`¿Confirmar pago de la cotización ${quote.numero_cotizacion}? Esto creará un evento confirmado.`)) return;
    
    const loadingToast = toast.loading('Procesando pago y creando evento...');
    try {
      let finalClientId = quote.cliente_id || quote.leads?.cliente_id;

      // Si no hay cliente_id, crear el cliente a partir del lead
      if (!finalClientId) {
        const { data: newClient, error: clientError } = await supabase
          .from('clientes')
          .insert([{
            nombre_completo: quote.leads?.nombre_contacto || 'Cliente cotización ' + quote.numero_cotizacion,
            email: quote.leads?.email,
            telefono: quote.leads?.telefono,
            tipo_cliente: 'particular'
          }])
          .select()
          .single();

        if (clientError) throw clientError;
        finalClientId = newClient.id;

        // Actualizar el lead con el nuevo cliente_id
        await supabase.from('leads').update({ cliente_id: finalClientId }).eq('id', quote.lead_id);
        // Actualizar la cotización con el nuevo cliente_id
        await supabase.from('cotizaciones').update({ cliente_id: finalClientId }).eq('id', quote.id);
      }

      // 1. Actualizar estado de la cotización
      const { error: quoteError } = await supabase
        .from('cotizaciones')
        .update({ estado: 'pagada' })
        .eq('id', quote.id);
      
      if (quoteError) throw quoteError;

      // 2. Crear el evento con el cliente_id correcto
      const packageId = quote.paquetes_incluidos?.[0]?.id || 'personalizado';
      
      const { error: eventError } = await supabase
        .from('eventos')
        .insert([{
          nombre_evento: `Evento: ${quote.leads?.nombre_contacto || 'Cliente'}`,
          cliente_id: finalClientId,
          cotizacion_id: quote.id,
          paquete_contratado: packageId,
          numero_personas: quote.numero_personas,
          estado: 'confirmado'
        }]);

      if (eventError) throw eventError;
      
      toast.success('¡Pago confirmado! Evento creado.', { id: loadingToast });
      fetchQuotes();
    } catch (err) {
      toast.error('Error al confirmar: ' + err.message, { id: loadingToast });
    }
  };

  const handleDeleteQuote = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar esta cotización?')) return;
    
    const loadingToast = toast.loading('Eliminando cotización...');
    try {
      const { error } = await supabase
        .from('cotizaciones')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      toast.success('Cotización eliminada', { id: loadingToast });
      fetchQuotes();
    } catch (err) {
      toast.error('Error al eliminar: ' + err.message, { id: loadingToast });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-900/40 p-6 rounded-3xl border border-white/5 backdrop-blur-md gap-6">
        <div>
          <h1 className="lobster text-2xl sm:text-3xl text-white flex items-center gap-3">
            <FileText className="text-brand-red shrink-0" size={32} />
            Cotizaciones
          </h1>
          <p className="text-slate-500 text-xs font-bold tracking-[0.2em] mt-1">Generador de Presupuestos • Las Groseras</p>
        </div>
        <button 
          className="btn-primary shadow-xl shadow-brand-red/40 px-8 py-3 group w-full sm:w-auto" 
          onClick={() => {
            setFormData({
              lead_id: '',
              numero_personas: 50,
              tipo_evento: '',
              paquete_id: 'bien_portado',
              precio_personalizado: 0,
              personalizado_barra_libre: true,
              personalizado_sabores: 2,
              personalizado_tragos: 0,
              personalizado_cervezas: 0,
              personalizado_horas: 2,
              servicios_adicionales: [],
              descuento: 0,
              subtotal: 0,
              iva: 0,
              total: 0,
              notas: ''
            });
            setIsModalOpen(true);
          }}
        >
          <PlusCircle size={20} className="stroke-[3px]" />
          <span className="font-black">Nueva cotización</span>
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {loading ? (
          <div className="p-20 text-center text-slate-500 flex flex-col items-center">
            <Calculator className="animate-spin mb-4 opacity-20" size={48} />
            Cargando historial...
          </div>
        ) : quotes.length === 0 ? (
          <div className="glass p-20 text-center text-slate-500">No hay cotizaciones registradas hoy.</div>
        ) : quotes.map((quote) => (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            key={quote.id} 
            className="glass p-5 flex flex-col md:flex-row justify-between items-center gap-4 hover:border-brand-red/30 transition-all border-l-4 border-l-brand-red group"
          >
            <div className="flex items-center gap-5 flex-1">
              <div className="p-4 bg-brand-red/10 rounded-2xl text-brand-red group-hover:bg-brand-red group-hover:text-white transition-all">
                <FileText size={24} />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-black text-slate-500 tracking-widest bg-white/5 px-2 py-0.5 rounded">{quote.numero_cotizacion}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-black tracking-tighter ${quote.estado === 'aprobada' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-500/10 text-slate-400'}`}>
                    {quote.estado}
                  </span>
                </div>
                <h3 className="text-xl font-black text-white tracking-tighter">{quote.leads?.nombre_contacto || 'Cliente Directo'}</h3>
                <p className="text-xs text-slate-500 font-bold tracking-widest">{quote.tipo_evento} • {quote.numero_personas} <span className="text-brand-red">Pax</span></p>
              </div>
            </div>
            
            <div className="text-right px-8 border-l border-white/5 hidden md:block">
              <p className="text-[10px] font-black text-slate-500 tracking-widest mb-1">Presupuesto Estimado</p>
              <h4 className="text-3xl font-black text-emerald-400">${quote.total?.toLocaleString()}</h4>
            </div>

            <div className="flex gap-2">
              {quote.estado !== 'pagada' && (
                <button 
                  onClick={() => handleConfirmPayment(quote)}
                  className="px-4 py-3 bg-brand-red shadow-lg shadow-brand-red/20 hover:bg-brand-red/80 text-white rounded-xl transition-all flex items-center gap-2 group"
                >
                  <CreditCard size={18} className="group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-black">Confirmar Pago</span>
                </button>
              )}
              <PDFDownloadLink 
                document={<QuotePDF quote={quote} />} 
                fileName={`${quote.numero_cotizacion}.pdf`}
                className="p-3 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl text-slate-400 transition-all"
              >
                {({ loading }) => (
                  loading ? <Clock size={20} className="animate-spin" /> : <Download size={20} />
                )}
              </PDFDownloadLink>
              <button 
                onClick={() => handleDeleteQuote(quote.id)}
                className="p-3 bg-white/5 hover:bg-brand-red/10 rounded-xl text-slate-400 hover:text-brand-red transition-all"
              >
                <Trash2 size={20} />
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* WIZARD MODAL */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="glass max-w-5xl w-full p-10 relative overflow-hidden max-h-[95vh] overflow-y-auto custom-scrollbar"
            >
              <button onClick={() => { 
                setIsModalOpen(false); 
                setStep(1); 
                setShowSuccess(false);
              }} className="absolute right-6 top-6 text-slate-500 hover:text-white z-10 p-2 hover:bg-white/5 rounded-full transition-all">
                <X size={28} />
              </button>

              {showSuccess ? (
                <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in zoom-in duration-500 max-w-lg mx-auto">
                   <div className="w-24 h-24 bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center mb-8 shadow-2xl shadow-emerald-500/20 border border-emerald-500/30">
                      <ShieldCheck size={48} className="stroke-[2.5px]" />
                   </div>
                   <h2 className="text-4xl font-black text-white tracking-tighter mb-3">¡Cotización Generada!</h2>
                   <p className="text-slate-500 font-bold tracking-widest text-[10px] mb-10">Referencia: {createdQuote?.numero_cotizacion}</p>
                   
                   <div className="flex flex-col gap-4 w-full">
                      <PDFDownloadLink 
                        document={<QuotePDF quote={createdQuote} />} 
                        fileName={`${createdQuote?.numero_cotizacion}.pdf`}
                        className="btn-primary py-5 rounded-2xl flex items-center justify-center gap-4 shadow-2xl shadow-brand-red/30 transition-all hover:scale-[1.02] active:scale-95"
                      >
                        {({ loading }) => (
                          <>
                            {loading ? <Clock className="animate-spin" /> : <Download size={24} className="stroke-[3px]" />}
                            <span className="text-lg font-black tracking-tighter">Descargar PDF Profesional</span>
                          </>
                        )}
                      </PDFDownloadLink>
                      
                      <button 
                         onClick={() => {
                           setIsModalOpen(false);
                           setShowSuccess(false);
                           setStep(1);
                         }}
                         className="py-4 text-slate-500 font-black tracking-widest text-xs hover:text-white transition-colors"
                      >
                        Volver al Panel de Control
                      </button>
                   </div>
                </div>
              ) : (
              <>
                {/* Progress Steps */}
                <div className="flex items-center gap-8 mb-12 border-b border-white/5 pb-8">
                   {[1, 2, 3].map((s) => (
                     <div key={s} className="flex items-center gap-3">
                       <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-lg transition-all ${step >= s ? 'bg-brand-red text-white shadow-lg shadow-brand-red/30' : 'bg-white/5 text-slate-600'}`}>
                         {step > s ? <CheckCircle size={24} /> : s}
                       </div>
                       <span className={`text-[10px] font-black tracking-[0.2em] ${step >= s ? 'text-white' : 'text-slate-600'}`}>
                         {s === 1 ? 'Cliente' : s === 2 ? 'Configuración' : 'Resumen'}
                       </span>
                       {s < 3 && <ChevronRight size={14} className="text-slate-800 mx-2" />}
                     </div>
                   ))}
                </div>

                <form onSubmit={handleSubmit} className="space-y-8">
                {/* STEP 1: LEAD SELECTION */}
                {step === 1 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10 animate-in fade-in slide-in-from-right-10 duration-500">
                    <div className="md:col-span-2">
                       <h3 className="text-sm font-black text-brand-red tracking-widest mb-6 flex items-center gap-2">
                         <User size={18} /> Asignar prospecto
                       </h3>
                      <label className="block text-[10px] font-black text-slate-500 tracking-widest mb-3">Buscar Lead Activo</label>
                      <select 
                        required
                        className="input-field py-4 text-lg bg-white/5 border-white/10"
                        value={formData.lead_id}
                        onChange={(e) => {
                          const lead = leads.find(l => l.id === e.target.value);
                          setFormData({
                            ...formData, 
                            lead_id: e.target.value,
                            tipo_evento: lead?.tipo_evento || '',
                            numero_personas: lead?.numero_personas || 50
                          });
                        }}
                      >
                        <option value="" className="bg-slate-900">-- Seleccionar Prospecto --</option>
                        {leads.map(l => <option key={l.id} value={l.id} className="bg-slate-900 capitalize">{l.nombre_contacto} ({l.tipo_evento || 'S/N'})</option>)}
                      </select>
                    </div>
                    <div className="space-y-6">
                      <div>
                        <label className="block text-[10px] font-black text-slate-500 tracking-widest mb-3">Número de Personas (PAX)</label>
                        <div className="relative">
                           <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-red opacity-50" size={20} />
                           <input 
                            type="number"
                            className="input-field py-4 pl-12 text-lg font-black bg-white/5 border-white/10"
                            value={formData.numero_personas}
                            onChange={(e) => setFormData({...formData, numero_personas: Number(e.target.value)})}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="space-y-6">
                      <div>
                        <label className="block text-[10px] font-black text-slate-500 tracking-widest mb-3">Tipo de Evento</label>
                        <div className="relative">
                           <Package className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-red opacity-50" size={20} />
                           <input 
                            className="input-field py-4 pl-12 text-lg bg-white/5 border-white/10"
                            placeholder="Ej: Boda, Corporativo..."
                            value={formData.tipo_evento}
                            onChange={(e) => setFormData({...formData, tipo_evento: e.target.value})}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="md:col-span-2 flex justify-end pt-8">
                      <button type="button" onClick={() => setStep(2)} className="btn-primary py-4 px-10 rounded-2xl shadow-2xl" disabled={!formData.lead_id}>
                        Siguiente: Paquetes
                        <ChevronRight size={20} />
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP 2: PACKAGES & EXTRAS */}
                {step === 2 && (
                  <div className="space-y-10 animate-in fade-in slide-in-from-right-10 duration-500">
                    <div>
                      <h3 className="text-sm font-black text-brand-red tracking-widest mb-6 flex items-center gap-2">
                         <Package size={18} /> Selecciona tu paquete
                       </h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {PACKAGES.map((pkg) => (
                          <div 
                            key={pkg.id}
                            onClick={() => setFormData({...formData, paquete_id: pkg.id})}
                            className={`
                              p-6 rounded-3xl border-2 cursor-pointer transition-all duration-300 relative overflow-hidden group
                              ${formData.paquete_id === pkg.id 
                                ? 'bg-brand-red/10 border-brand-red shadow-xl shadow-brand-red/20 scale-[1.02]' 
                                : 'bg-white/5 border-white/5 hover:border-white/20'}
                            `}
                          >
                            <div className="flex justify-between items-start mb-4">
                               <h4 className="font-black text-white text-lg tracking-tight">{pkg.nombre}</h4>
                               {formData.paquete_id === pkg.id && <CheckCircle className="text-brand-red shrink-0" size={20} />}
                            </div>
                            
                            {pkg.id === 'personalizada' ? (
                              <div className="mb-6 pb-2 border-b border-brand-red/30" onClick={(e) => e.stopPropagation()}>
                                <label className="text-[10px] font-black tracking-widest text-slate-500 block mb-2">FIJAR PRECIO POR PERSONA</label>
                                <div className="flex items-center text-brand-red bg-white/5 border border-brand-red/20 px-3 py-1.5 rounded-lg w-full max-w-[140px] focus-within:border-brand-red focus-within:bg-brand-red/10 transition-colors">
                                  <span className="text-xl font-black mr-1">$</span>
                                  <input 
                                    type="number"
                                    className="bg-transparent outline-none flex-1 text-2xl font-black text-white w-full"
                                    value={formData.precio_personalizado || ''}
                                    placeholder="0"
                                    onChange={(e) => setFormData({...formData, precio_personalizado: e.target.value})}
                                  />
                                </div>
                              </div>
                            ) : (
                              <p className="text-3xl font-black text-brand-red mb-6">${pkg.precio_persona}<span className="text-[10px] text-slate-500 font-bold ml-1 tracking-widest">/ pax</span></p>
                            )}
                            
                            {pkg.id === 'personalizada' ? (
                              <div className="space-y-3 mt-4" onClick={(e) => e.stopPropagation()}>
                                <label className="flex items-center gap-2 cursor-pointer text-[12px] font-black text-white hover:text-brand-red transition-colors">
                                  <input 
                                    type="checkbox" 
                                    checked={formData.personalizado_barra_libre}
                                    onChange={(e) => setFormData({...formData, personalizado_barra_libre: e.target.checked})}
                                    className="accent-brand-red w-4 h-4 cursor-pointer"
                                  />
                                  Barra libre Micheladas
                                </label>
                                
                                <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 bg-black/20 p-2 rounded-lg border border-white/5">
                                  <span>Sabores de micheladas</span>
                                  <input type="number" min="0" max="10" value={formData.personalizado_sabores} onChange={e=>setFormData({...formData, personalizado_sabores: Number(e.target.value)})} className="w-14 bg-white/5 p-1 text-center rounded border border-white/10 text-white outline-none focus:border-brand-red" />
                                </div>
                                
                                <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 bg-black/20 p-2 rounded-lg border border-white/5">
                                  <span>Tragos especiales</span>
                                  <input type="number" min="0" max="10" value={formData.personalizado_tragos} onChange={e=>setFormData({...formData, personalizado_tragos: Number(e.target.value)})} className="w-14 bg-white/5 p-1 text-center rounded border border-white/10 text-white outline-none focus:border-brand-red" />
                                </div>
                                
                                <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 bg-black/20 p-2 rounded-lg border border-white/5">
                                  <span>Cervezas especiales</span>
                                  <input type="number" min="0" max="20" value={formData.personalizado_cervezas} onChange={e=>setFormData({...formData, personalizado_cervezas: Number(e.target.value)})} className="w-14 bg-white/5 p-1 text-center rounded border border-white/10 text-white outline-none focus:border-brand-red" />
                                </div>
                                
                                <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 bg-black/20 p-2 rounded-lg border border-white/5">
                                  <span>Horas de servicio</span>
                                  <input type="number" min="1" max="12" value={formData.personalizado_horas} onChange={e=>setFormData({...formData, personalizado_horas: Number(e.target.value)})} className="w-14 bg-brand-red/10 p-1 text-center rounded border border-brand-red/30 text-white outline-none focus:border-brand-red" />
                                </div>
                              </div>
                            ) : (
                              <ul className="space-y-2">
                                {pkg.items.map((item, i) => (
                                  <li key={i} className="text-[11px] font-bold text-slate-400 flex items-center gap-3">
                                    <div className={`w-1.5 h-1.5 rounded-full ${formData.paquete_id === pkg.id ? 'bg-brand-red' : 'bg-slate-700'}`} />
                                    {item}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* EXTRAS SECTION */}
                    <div>
                      <h3 className="text-sm font-black text-brand-red tracking-widest mb-6 flex items-center gap-2">
                         <PlusCircle size={18} /> Servicios adicionales (extras fijos)
                       </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                         {EXTRA_SERVICES.map((extra) => {
                           const isSelected = formData.servicios_adicionales.find(e => e.id === extra.id);
                           return (
                             <div 
                              key={extra.id}
                              onClick={() => toggleExtra(extra)}
                              className={`
                                p-4 rounded-2xl flex items-center justify-between cursor-pointer transition-all border-2
                                ${isSelected 
                                  ? 'bg-emerald-500/10 border-emerald-500/50 shadow-lg shadow-emerald-500/10' 
                                  : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10'}
                              `}
                             >
                               <div className="flex items-center gap-3">
                                 <span className="text-2xl">{extra.icono}</span>
                                 <div>
                                   <div className="text-[11px] font-black text-white tracking-tight leading-tight">{extra.nombre}</div>
                                   <div className="text-[10px] font-bold text-emerald-400 mt-0.5">${extra.precio.toLocaleString()}</div>
                                 </div>
                               </div>
                               {isSelected ? <CheckCircle size={18} className="text-emerald-500" /> : <Plus size={18} className="text-slate-700" />}
                             </div>
                           );
                         })}
                      </div>
                    </div>

                    <div className="flex justify-between items-center mt-12 pt-8 border-t border-white/5">
                       <button type="button" onClick={() => setStep(1)} className="btn-secondary rounded-xl px-8 font-black tracking-widest text-xs">Regresar</button>
                       <button type="button" onClick={() => setStep(3)} className="btn-primary rounded-xl px-12 py-4 shadow-xl">
                        Resumen Final
                        <ChevronRight size={20} />
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP 3: SUMMARY & SAVE */}
                {step === 3 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10 animate-in fade-in slide-in-from-right-10 duration-500">
                    <div className="space-y-6">
                       <div className="glass p-8 border-l-4 border-l-emerald-500 bg-white/[0.02]">
                          <h4 className="text-[10px] font-black text-slate-500 tracking-widest mb-6 px-1">Conceptos de Venta</h4>
                          <div className="space-y-4">
                            <div className="flex justify-between items-center bg-white/5 p-3 rounded-xl border border-white/5">
                               <div className="flex flex-col">
                                 <span className="text-[8px] font-black text-slate-500 tracking-widest">Paquete Base</span>
                                 <span className="text-white font-black text-sm tracking-tight">{PACKAGES.find(p => p.id === formData.paquete_id)?.nombre || 'Seleccione un paquete'}</span>
                               </div>
                               <span className="text-brand-red font-black text-lg">
                                 ${((formData.paquete_id === 'personalizada' ? Number(formData.precio_personalizado || 0) : PACKAGES.find(p => p.id === formData.paquete_id)?.precio_persona) * formData.numero_personas).toLocaleString()}
                               </span>
                            </div>

                            {/* EXTRAS LIST */}
                            {formData.servicios_adicionales.map((extra) => (
                              <div key={extra.id} className="flex justify-between items-center bg-emerald-500/5 p-3 rounded-xl border border-emerald-500/10">
                                 <div className="flex flex-col">
                                   <span className="text-[8px] font-black text-emerald-500/70 tracking-widest">Servicio Extra</span>
                                   <span className="text-slate-200 font-bold text-xs">{extra.nombre}</span>
                                 </div>
                                 <span className="text-emerald-400 font-black text-sm">${extra.precio.toLocaleString()}</span>
                              </div>
                            ))}

                            <div className="pt-6 mt-6 border-t border-white/10">
                               <label className="block text-[10px] font-black text-slate-500 tracking-[0.2em] mb-3">🏷️ Aplicar descuento global ($)</label>
                               <input 
                                  type="number"
                                  className="input-field py-3 text-lg font-black text-rose-400 bg-white/5 border-white/10"
                                  value={formData.descuento}
                                  onChange={(e) => setFormData({...formData, descuento: Number(e.target.value)})}
                               />
                            </div>
                          </div>
                       </div>
                       
                       <div className="glass p-6 text-slate-400">
                         <div className="flex items-start gap-3">
                           <AlertCircle className="text-amber-500 shrink-0" size={18} />
                           <p className="text-[10px] font-medium leading-relaxed">Esta cotización tiene una validez de 15 días. Los precios incluyen montaje básico.</p>
                         </div>
                       </div>
                    </div>
                    
                    <div className="bg-brand-red p-10 rounded-[40px] text-white shadow-[0_20px_50px_rgba(190,18,60,0.3)] flex flex-col justify-between relative overflow-hidden group">
                       {/* Background design elements */}
                       <div className="absolute top-[-50px] right-[-50px] w-64 h-64 bg-white/10 rounded-full blur-3xl opacity-30 group-hover:scale-125 transition-transform duration-1000"></div>
                       <div className="absolute bottom-[-50px] left-[-50px] w-48 h-48 bg-black/20 rounded-full blur-2xl opacity-20"></div>

                       <div className="space-y-6 relative z-10">
                          <h4 className="text-[10px] font-black tracking-[0.3em] opacity-80 border-b border-white/20 pb-4">Desglose Financiero</h4>
                          <div className="space-y-3">
                             <div className="flex justify-between font-bold text-lg opacity-90 tracking-tight">
                                <span>Subtotal:</span>
                                <span>${formData.subtotal.toLocaleString()}</span>
                             </div>
                             <div className="pt-8 mt-5 border-t border-white/30 flex flex-col items-end">
                                <span className="text-[11px] font-black tracking-[0.4em] opacity-60 mb-2">Inversión Final</span>
                                <span className="text-6xl font-black tracking-tighter leading-tight drop-shadow-2xl">
                                  ${formData.total.toLocaleString()}
                                </span>
                             </div>
                          </div>
                       </div>

                       <div className="mt-12 flex gap-4 relative z-10">
                          <button type="button" onClick={() => setStep(2)} className="w-1/4 py-4 border-2 border-white/20 rounded-2xl font-black tracking-widest text-[10px] hover:bg-white/10 transition-colors">Atrás</button>
                          <button type="submit" className="flex-1 py-4 bg-white text-brand-red rounded-2xl font-black tracking-[0.1em] hover:bg-slate-100 transition-all active:scale-95 shadow-2xl flex items-center justify-center gap-3">
                            <Save size={24} className="stroke-[3px]" />
                            Generar cotización
                          </button>
                       </div>
                    </div>
                  </div>
                )}
              </form>
            </>
          )}
        </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default QuotesPage;
