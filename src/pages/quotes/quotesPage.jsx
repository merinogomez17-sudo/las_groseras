import React, { useState, useEffect } from 'react';
import {
  FileText, Plus, Download,
  Trash2, X, Save, Calculator,
  User, Users, Calendar, Package, ChevronRight, CheckCircle,
  PlusCircle, AlertCircle, Clock, ShieldCheck, CreditCard
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { PDFDownloadLink } from '@react-pdf/renderer';
import QuotePDF from '../../components/quotes/QuotePDF';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';

const PACKAGES = [
  { id: 'bien_portado',  nombre: 'Bien Portado',        precio_persona: 210, items: ['Barra libre Micheladas (Clásica/Cubana/Clamato)', '2 Sabores de michelada', '2 Horas de Servicio'] },
  { id: 'algo_tranqui',  nombre: 'Algo Tranqui',         precio_persona: 250, items: ['Barra libre Micheladas (Clásica/Cubana/Clamato)', '3 Sabores de michelada', '1 Trago especial', '3 Horas de Servicio'] },
  { id: 'mal_portado',   nombre: 'Mal Portado',          precio_persona: 290, items: ['Barra libre Micheladas (Clásica/Cubana/Clamato)', '5 Sabores de michelada', '1 Trago especial', '2 Cervezas especiales', '3 Horas de Servicio'] },
  { id: 'el_mas_perro',  nombre: 'El Más Perro',         precio_persona: 330, items: ['Barra libre Micheladas (Clásica/Cubana/Clamato)', '5 Sabores de michelada', '3 Tragos especiales', '3 Cervezas especiales', 'Vasos personalizados con stickers', '4 Horas de Servicio'] },
  { id: 'personalizada', nombre: 'Barra Personalizada',  precio_persona: 0,   items: ['Servicio configurado 100% a la medida', 'Selección de elementos según acuerdo con el cliente'] },
];

const EXTRA_SERVICES = [
  { id: 'shots_tequila',  nombre: 'Ronda de Shots Tequila (100)', precio: 1500, icono: '🥃' },
  { id: 'shots_mezcal',   nombre: 'Ronda de Shots Mezcal (100)',  precio: 1800, icono: '🌵' },
  { id: 'garnish_premium',nombre: 'Garnish Premium (Frutas/Dulces)', precio: 850, icono: '🍓' },
  { id: 'hora_extra',     nombre: 'Hora Extra de Servicio',       precio: 2200, icono: '⏳' },
  { id: 'hielo_extra',    nombre: 'Suministro Hielo Extra',       precio: 450,  icono: '🧊' },
];

const EMPTY_FORM = {
  lead_id: '', numero_personas: 50, tipo_evento: '',
  paquete_id: 'bien_portado', precio_personalizado: 0,
  personalizado_barra_libre: true, personalizado_sabores: 2,
  personalizado_tragos: 0, personalizado_cervezas: 0, personalizado_horas: 2,
  servicios_adicionales: [], descuento: 0, subtotal: 0, iva: 0, total: 0, notas: ''
};

const QuotesPage = () => {
  const [quotes, setQuotes]         = useState([]);
  const [leads, setLeads]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [panelOpen, setPanelOpen]   = useState(false);
  const [step, setStep]             = useState(1);
  const [showSuccess, setShowSuccess] = useState(false);
  const [createdQuote, setCreatedQuote] = useState(null);
  const [formData, setFormData]     = useState(EMPTY_FORM);

  useEffect(() => { fetchQuotes(); fetchLeads(); }, []);

  const fetchQuotes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('cotizaciones')
        .select('*, leads (nombre_contacto, email, telefono, cliente_id), clientes (nombre_completo)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setQuotes(data || []);
    } catch { toast.error('Error al cargar cotizaciones'); } finally { setLoading(false); }
  };

  const fetchLeads = async () => {
    const { data } = await supabase.from('leads').select('id, nombre_contacto, tipo_evento, numero_personas').eq('estado', 'nuevo');
    setLeads(data || []);
  };

  const calculateTotal = (fd = formData) => {
    const pkg = PACKAGES.find(p => p.id === fd.paquete_id);
    if (!pkg) return;
    const precioBase       = fd.paquete_id === 'personalizada' ? Number(fd.precio_personalizado || 0) : pkg.precio_persona;
    const subtotalPaquete  = precioBase * fd.numero_personas;
    const subtotalExtras   = fd.servicios_adicionales.reduce((acc, curr) => acc + curr.precio, 0);
    const subtotal         = (subtotalPaquete + subtotalExtras) - fd.descuento;
    return { subtotal, iva: 0, total: subtotal };
  };

  useEffect(() => {
    const totals = calculateTotal();
    if (totals) setFormData(prev => ({ ...prev, ...totals }));
  }, [formData.paquete_id, formData.numero_personas, formData.descuento, formData.servicios_adicionales, formData.precio_personalizado]);

  const toggleExtra = (extra) => {
    setFormData(prev => {
      const isSelected = prev.servicios_adicionales.find(e => e.id === extra.id);
      return {
        ...prev,
        servicios_adicionales: isSelected
          ? prev.servicios_adicionales.filter(e => e.id !== extra.id)
          : [...prev.servicios_adicionales, extra]
      };
    });
  };

  const openPanel = () => {
    setFormData(EMPTY_FORM);
    setStep(1);
    setShowSuccess(false);
    setPanelOpen(true);
  };

  const closePanel = () => { setPanelOpen(false); setStep(1); setShowSuccess(false); };

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
        if (personalizado_tragos > 0)  finalItems.push(`${personalizado_tragos} Trago(s) especiale(s)`);
        if (personalizado_cervezas > 0) finalItems.push(`${personalizado_cervezas} Cerveza(s) especiale(s)`);
        if (personalizado_horas > 0)   finalItems.push(`${personalizado_horas} Horas de Servicio`);
        if (finalItems.length === 0) finalItems.push('Servicio configurado a la medida');
      }

      const payload = {
        ...dbData,
        paquetes_incluidos: [{
          ...selectedPkg, items: finalItems, precio_persona: precioFinal,
          limites_personalizados: paquete_id === 'personalizada' ? {
            'Cerveza con sabor': personalizado_sabores,
            'Bebida especial':   personalizado_tragos,
            'Cerveza especial':  personalizado_cervezas
          } : null
        }],
        precio_por_persona: precioFinal,
        numero_cotizacion: `COT-${Date.now().toString().slice(-4)}`,
        estado: 'borrador'
      };

      const { error } = await supabase.from('cotizaciones').insert([payload]);
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
    if (!window.confirm(`¿Confirmar pago de la cotización ${quote.numero_cotizacion}?`)) return;
    const loadingToast = toast.loading('Procesando pago...');
    try {
      let finalClientId = quote.cliente_id || quote.leads?.cliente_id;
      if (!finalClientId) {
        const { data: newClient, error: clientError } = await supabase
          .from('clientes').insert([{
            nombre_completo: quote.leads?.nombre_contacto || 'Cliente ' + quote.numero_cotizacion,
            email: quote.leads?.email, telefono: quote.leads?.telefono, tipo_cliente: 'particular'
          }]).select().single();
        if (clientError) throw clientError;
        finalClientId = newClient.id;
        await supabase.from('leads').update({ cliente_id: finalClientId }).eq('id', quote.lead_id);
        await supabase.from('cotizaciones').update({ cliente_id: finalClientId }).eq('id', quote.id);
      }

      const { error: quoteError } = await supabase.from('cotizaciones').update({ estado: 'pagada' }).eq('id', quote.id);
      if (quoteError) throw quoteError;

      const { error: eventError } = await supabase.from('eventos').insert([{
        nombre_evento: `Evento: ${quote.leads?.nombre_contacto || 'Cliente'}`,
        cliente_id: finalClientId, cotizacion_id: quote.id,
        paquete_contratado: quote.paquetes_incluidos?.[0]?.id || 'personalizado',
        numero_personas: quote.numero_personas, estado: 'confirmado'
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
    const loadingToast = toast.loading('Eliminando...');
    try {
      const { error } = await supabase.from('cotizaciones').delete().eq('id', id);
      if (error) throw error;
      toast.success('Cotización eliminada', { id: loadingToast });
      fetchQuotes();
    } catch (err) {
      toast.error('Error al eliminar: ' + err.message, { id: loadingToast });
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-900/40 p-6 rounded-3xl border border-white/5 backdrop-blur-md gap-6">
        <div>
          <h1 className="lobster text-2xl sm:text-3xl text-white flex items-center gap-3">
            <FileText className="text-brand-red shrink-0" size={32} />
            Cotizaciones
          </h1>
          <p className="text-slate-500 text-xs font-bold tracking-[0.2em] mt-1">Generador de Presupuestos • Las Groseras</p>
        </div>
        <button
          className={`btn-primary shadow-xl shadow-brand-red/40 px-8 py-3 w-full sm:w-auto ${panelOpen ? 'ring-2 ring-brand-red/50' : ''}`}
          onClick={openPanel}
        >
          <PlusCircle size={20} className="stroke-[3px]" />
          <span className="font-black">Nueva cotización</span>
        </button>
      </div>

      {/* SPLIT VIEW */}
      <div className="flex gap-5 items-start">

        {/* LISTA */}
        <div className="flex-1 min-w-0 space-y-4">
          {loading ? (
            <div className="p-20 text-center text-slate-500 flex flex-col items-center">
              <Calculator className="animate-spin mb-4 opacity-20" size={48} />
              Cargando historial...
            </div>
          ) : quotes.length === 0 ? (
            <div className="glass p-20 text-center text-slate-500">No hay cotizaciones registradas.</div>
          ) : quotes.map((quote) => (
            <motion.div
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              key={quote.id}
              className="glass p-5 flex flex-col md:flex-row justify-between items-center gap-4 hover:border-brand-red/30 transition-all border-l-4 border-l-brand-red group"
            >
              <div className="flex items-center gap-5 flex-1">
                <div className="p-4 bg-brand-red/10 rounded-2xl text-brand-red group-hover:bg-brand-red group-hover:text-white transition-all">
                  <FileText size={22} />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-black text-slate-500 tracking-widest bg-white/5 px-2 py-0.5 rounded">{quote.numero_cotizacion}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-black tracking-tighter ${quote.estado === 'aprobada' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-500/10 text-slate-400'}`}>
                      {quote.estado}
                    </span>
                  </div>
                  <h3 className="text-lg font-black text-white tracking-tighter">{quote.leads?.nombre_contacto || 'Cliente Directo'}</h3>
                  <p className="text-xs text-slate-500 font-bold tracking-widest">{quote.tipo_evento} • {quote.numero_personas} <span className="text-brand-red">Pax</span></p>
                </div>
              </div>

              {!panelOpen && (
                <div className="text-right px-6 border-l border-white/5 hidden md:block">
                  <p className="text-[10px] font-black text-slate-500 tracking-widest mb-1">Presupuesto</p>
                  <h4 className="text-2xl font-black text-emerald-400">${quote.total?.toLocaleString()}</h4>
                </div>
              )}

              <div className="flex gap-2">
                {quote.estado !== 'pagada' && (
                  <button onClick={() => handleConfirmPayment(quote)}
                    className="px-3 py-2.5 bg-brand-red shadow-lg shadow-brand-red/20 hover:bg-brand-red/80 text-white rounded-xl transition-all flex items-center gap-2">
                    <CreditCard size={16} />
                    <span className="text-[10px] font-black">Confirmar Pago</span>
                  </button>
                )}
                <PDFDownloadLink
                  document={<QuotePDF quote={quote} />}
                  fileName={`${quote.numero_cotizacion}.pdf`}
                  className="p-2.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl text-slate-400 transition-all"
                >
                  {({ loading }) => loading ? <Clock size={18} className="animate-spin" /> : <Download size={18} />}
                </PDFDownloadLink>
                <button onClick={() => handleDeleteQuote(quote.id)}
                  className="p-2.5 bg-white/5 hover:bg-brand-red/10 rounded-xl text-slate-400 hover:text-brand-red transition-all">
                  <Trash2 size={18} />
                </button>
              </div>
            </motion.div>
          ))}
        </div>

        {/* PANEL DERECHO: WIZARD */}
        <AnimatePresence>
          {panelOpen && (
            <motion.div
              key="quotes-panel"
              initial={{ opacity: 0, x: 32 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 32 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="w-[500px] shrink-0 sticky top-6"
            >
              <div className="glass border-white/5 p-7 relative max-h-[calc(100vh-120px)] overflow-y-auto custom-scrollbar">
                <button onClick={closePanel} className="absolute right-5 top-5 text-slate-500 hover:text-white transition-colors z-10">
                  <X size={20} />
                </button>

                {showSuccess ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <div className="w-20 h-20 bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center mb-6 border border-emerald-500/30">
                      <ShieldCheck size={40} className="stroke-[2.5px]" />
                    </div>
                    <h2 className="text-3xl font-black text-white tracking-tighter mb-2">¡Cotización Generada!</h2>
                    <p className="text-slate-500 font-bold tracking-widest text-[10px] mb-8">Ref: {createdQuote?.numero_cotizacion}</p>
                    <div className="flex flex-col gap-3 w-full">
                      <PDFDownloadLink
                        document={<QuotePDF quote={createdQuote} />}
                        fileName={`${createdQuote?.numero_cotizacion}.pdf`}
                        className="btn-primary py-4 rounded-2xl flex items-center justify-center gap-3"
                      >
                        {({ loading }) => (
                          <>
                            {loading ? <Clock className="animate-spin" /> : <Download size={20} className="stroke-[3px]" />}
                            <span className="font-black">Descargar PDF</span>
                          </>
                        )}
                      </PDFDownloadLink>
                      <button onClick={closePanel} className="py-3 text-slate-500 font-black tracking-widest text-xs hover:text-white transition-colors">
                        Volver al panel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Steps */}
                    <div className="flex items-center gap-4 mb-8 pb-6 border-b border-white/5">
                      {[1, 2, 3].map((s) => (
                        <div key={s} className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-sm transition-all ${step >= s ? 'bg-brand-red text-white' : 'bg-white/5 text-slate-600'}`}>
                            {step > s ? <CheckCircle size={18} /> : s}
                          </div>
                          <span className={`text-[10px] font-black tracking-widest ${step >= s ? 'text-white' : 'text-slate-600'}`}>
                            {s === 1 ? 'Cliente' : s === 2 ? 'Paquete' : 'Resumen'}
                          </span>
                          {s < 3 && <ChevronRight size={12} className="text-slate-700 mx-1" />}
                        </div>
                      ))}
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                      {/* STEP 1 */}
                      {step === 1 && (
                        <div className="space-y-5">
                          <h3 className="text-xs font-black text-brand-red tracking-widest flex items-center gap-2">
                            <User size={14} /> Asignar prospecto
                          </h3>
                          <div>
                            <label className="block text-[10px] font-black text-slate-500 tracking-widest mb-2">Lead Activo</label>
                            <select required className="input-field bg-white/5 border-white/10"
                              value={formData.lead_id}
                              onChange={(e) => {
                                const lead = leads.find(l => l.id === e.target.value);
                                setFormData({ ...formData, lead_id: e.target.value, tipo_evento: lead?.tipo_evento || '', numero_personas: lead?.numero_personas || 50 });
                              }}>
                              <option value="" className="bg-slate-900">-- Seleccionar Prospecto --</option>
                              {leads.map(l => <option key={l.id} value={l.id} className="bg-slate-900 capitalize">{l.nombre_contacto} ({l.tipo_evento || 'S/N'})</option>)}
                            </select>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[10px] font-black text-slate-500 tracking-widest mb-2">PAX</label>
                              <div className="relative">
                                <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-red opacity-50" size={16} />
                                <input type="number" className="input-field pl-9 font-black bg-white/5 border-white/10"
                                  value={formData.numero_personas}
                                  onChange={(e) => setFormData({...formData, numero_personas: Number(e.target.value)})} />
                              </div>
                            </div>
                            <div>
                              <label className="block text-[10px] font-black text-slate-500 tracking-widest mb-2">Tipo de Evento</label>
                              <input className="input-field bg-white/5 border-white/10" placeholder="Boda, Corporativo..."
                                value={formData.tipo_evento}
                                onChange={(e) => setFormData({...formData, tipo_evento: e.target.value})} />
                            </div>
                          </div>
                          <div className="flex justify-end pt-2">
                            <button type="button" onClick={() => setStep(2)} className="btn-primary px-8" disabled={!formData.lead_id}>
                              Siguiente <ChevronRight size={16} />
                            </button>
                          </div>
                        </div>
                      )}

                      {/* STEP 2 */}
                      {step === 2 && (
                        <div className="space-y-6">
                          <h3 className="text-xs font-black text-brand-red tracking-widest flex items-center gap-2">
                            <Package size={14} /> Selecciona tu paquete
                          </h3>
                          <div className="space-y-3">
                            {PACKAGES.map((pkg) => (
                              <div
                                key={pkg.id}
                                onClick={() => setFormData({...formData, paquete_id: pkg.id})}
                                className={`p-4 rounded-2xl border-2 cursor-pointer transition-all relative ${formData.paquete_id === pkg.id ? 'bg-brand-red/10 border-brand-red' : 'bg-white/5 border-white/5 hover:border-white/20'}`}
                              >
                                <div className="flex justify-between items-center mb-2">
                                  <h4 className="font-black text-white text-sm">{pkg.nombre}</h4>
                                  {formData.paquete_id === pkg.id && <CheckCircle className="text-brand-red" size={16} />}
                                </div>
                                {pkg.id === 'personalizada' ? (
                                  <div onClick={(e) => e.stopPropagation()} className="space-y-2 mt-2">
                                    <div className="flex items-center text-brand-red bg-white/5 border border-brand-red/20 px-3 py-1.5 rounded-lg w-32 focus-within:border-brand-red transition-colors">
                                      <span className="font-black mr-1">$</span>
                                      <input type="number" className="bg-transparent outline-none flex-1 font-black text-white w-full"
                                        value={formData.precio_personalizado || ''}
                                        placeholder="0"
                                        onChange={(e) => setFormData({...formData, precio_personalizado: e.target.value})} />
                                      <span className="text-[9px] text-slate-500 ml-1">/pax</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 mt-2">
                                      {[
                                        { label: 'Sabores', key: 'personalizado_sabores' },
                                        { label: 'Tragos',  key: 'personalizado_tragos' },
                                        { label: 'Cervezas',key: 'personalizado_cervezas' },
                                        { label: 'Horas',   key: 'personalizado_horas' },
                                      ].map(f => (
                                        <div key={f.key} className="flex items-center justify-between text-[11px] font-bold text-slate-400 bg-black/20 p-2 rounded-lg border border-white/5">
                                          <span>{f.label}</span>
                                          <input type="number" min="0" max="20"
                                            value={formData[f.key]}
                                            onChange={(e) => setFormData({...formData, [f.key]: Number(e.target.value)})}
                                            className="w-12 bg-white/5 p-1 text-center rounded border border-white/10 text-white outline-none focus:border-brand-red" />
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ) : (
                                  <p className="text-xl font-black text-brand-red">${pkg.precio_persona}<span className="text-[9px] text-slate-500 ml-1">/pax</span></p>
                                )}
                              </div>
                            ))}
                          </div>

                          <h3 className="text-xs font-black text-brand-red tracking-widest flex items-center gap-2">
                            <PlusCircle size={14} /> Extras
                          </h3>
                          <div className="space-y-2">
                            {EXTRA_SERVICES.map((extra) => {
                              const isSelected = formData.servicios_adicionales.find(e => e.id === extra.id);
                              return (
                                <div
                                  key={extra.id}
                                  onClick={() => toggleExtra(extra)}
                                  className={`p-3 rounded-xl flex items-center justify-between cursor-pointer transition-all border-2 ${isSelected ? 'bg-emerald-500/10 border-emerald-500/50' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}
                                >
                                  <div className="flex items-center gap-3">
                                    <span className="text-xl">{extra.icono}</span>
                                    <div>
                                      <div className="text-[11px] font-black text-white">{extra.nombre}</div>
                                      <div className="text-[10px] font-bold text-emerald-400">${extra.precio.toLocaleString()}</div>
                                    </div>
                                  </div>
                                  {isSelected ? <CheckCircle size={16} className="text-emerald-500" /> : <Plus size={16} className="text-slate-700" />}
                                </div>
                              );
                            })}
                          </div>

                          <div className="flex justify-between items-center pt-2">
                            <button type="button" onClick={() => setStep(1)} className="btn-secondary text-xs px-6">Regresar</button>
                            <button type="button" onClick={() => setStep(3)} className="btn-primary px-8">
                              Resumen <ChevronRight size={16} />
                            </button>
                          </div>
                        </div>
                      )}

                      {/* STEP 3 */}
                      {step === 3 && (
                        <div className="space-y-5">
                          <div className="glass p-5 border-l-4 border-l-emerald-500 bg-white/[0.02]">
                            <h4 className="text-[10px] font-black text-slate-500 tracking-widest mb-4">Conceptos de Venta</h4>
                            <div className="space-y-3">
                              <div className="flex justify-between items-center bg-white/5 p-3 rounded-xl border border-white/5">
                                <div>
                                  <span className="text-[8px] font-black text-slate-500 tracking-widest block">Paquete Base</span>
                                  <span className="text-white font-black text-sm">{PACKAGES.find(p => p.id === formData.paquete_id)?.nombre}</span>
                                </div>
                                <span className="text-brand-red font-black text-lg">
                                  ${((formData.paquete_id === 'personalizada' ? Number(formData.precio_personalizado || 0) : PACKAGES.find(p => p.id === formData.paquete_id)?.precio_persona) * formData.numero_personas).toLocaleString()}
                                </span>
                              </div>
                              {formData.servicios_adicionales.map((extra) => (
                                <div key={extra.id} className="flex justify-between items-center bg-emerald-500/5 p-3 rounded-xl border border-emerald-500/10">
                                  <div>
                                    <span className="text-[8px] font-black text-emerald-500/70 tracking-widest block">Extra</span>
                                    <span className="text-slate-200 font-bold text-xs">{extra.nombre}</span>
                                  </div>
                                  <span className="text-emerald-400 font-black">${extra.precio.toLocaleString()}</span>
                                </div>
                              ))}
                              <div className="pt-3 border-t border-white/10">
                                <label className="block text-[10px] font-black text-slate-500 tracking-widest mb-2">Descuento global ($)</label>
                                <input type="number" className="input-field py-2 font-black text-rose-400 bg-white/5 border-white/10"
                                  value={formData.descuento}
                                  onChange={(e) => setFormData({...formData, descuento: Number(e.target.value)})} />
                              </div>
                            </div>
                          </div>

                          <div className="bg-brand-red p-6 rounded-3xl text-white shadow-xl shadow-brand-red/30 relative overflow-hidden">
                            <div className="absolute top-[-30px] right-[-30px] w-40 h-40 bg-white/10 rounded-full blur-2xl opacity-30" />
                            <div className="space-y-2 relative z-10">
                              <div className="flex justify-between font-bold opacity-90">
                                <span>Subtotal:</span>
                                <span>${formData.subtotal.toLocaleString()}</span>
                              </div>
                              <div className="pt-4 mt-2 border-t border-white/30 flex flex-col items-end">
                                <span className="text-[10px] font-black tracking-widest opacity-60 mb-1">Inversión Final</span>
                                <span className="text-5xl font-black tracking-tighter">${formData.total.toLocaleString()}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-start gap-2 p-4 glass rounded-xl">
                            <AlertCircle className="text-amber-500 shrink-0 mt-0.5" size={15} />
                            <p className="text-[10px] font-medium text-slate-400 leading-relaxed">Cotización válida por 15 días. Los precios incluyen montaje básico.</p>
                          </div>

                          <div className="flex justify-between items-center pt-2">
                            <button type="button" onClick={() => setStep(2)} className="btn-secondary text-xs px-6">Regresar</button>
                            <button type="submit" className="btn-primary px-8">
                              <Save size={16} /> Generar cotización
                            </button>
                          </div>
                        </div>
                      )}
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
};

export default QuotesPage;
