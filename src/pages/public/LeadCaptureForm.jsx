import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, Calendar, Users, Target, Phone, 
  Mail, Instagram, MessageCircle, CheckCircle2, ArrowRight
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';

const LeadCaptureForm = () => {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nombre_contacto: '',
    telefono: '',
    email: '',
    tipo_evento: '',
    fecha_tentativa: '',
    numero_personas: '',
    canal_origen: 'Web',
    notas: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const sanitizedData = {
        ...formData,
        numero_personas: formData.numero_personas === '' ? null : Number(formData.numero_personas),
        fecha_tentativa: formData.fecha_tentativa === '' ? null : formData.fecha_tentativa,
        estado: 'nuevo'
      };

      const { error } = await supabase
        .from('leads')
        .insert([sanitizedData]);

      if (error) throw error;
      
      setSubmitted(true);
      toast.success('¡Solicitud enviada con éxito!');
    } catch (error) {
      toast.error('Error al enviar: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-brand-dark flex items-center justify-center p-6">
        <div className="absolute inset-0 bg-brand-dark/90 backdrop-blur-sm"></div>
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="glass max-w-md w-full p-10 text-center relative z-10"
        >
          <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-500/20">
            <CheckCircle2 size={40} className="text-white" />
          </div>
          <h2 className="text-3xl font-black text-white italic mb-4">¡RECIBIDO!</h2>
          <p className="text-slate-400 mb-8 leading-relaxed">
            Hemos recibido tus datos correctamente. Un experto de **Las Groseras** se pondrá en contacto contigo muy pronto para preparar la mejor michelada de tu vida.
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="btn-primary w-full justify-center py-4 text-lg"
          >
            Enviar otra solicitud
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-dark font-sans selection:bg-brand-red/30">
      {/* Hero Background */}
      <div className="fixed inset-0">
        <div className="absolute inset-0 bg-gradient-to-b from-brand-dark/40 via-brand-dark/80 to-brand-dark"></div>
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-6 py-12 lg:py-24">
        <div className="text-center mb-16">
          <motion.div 
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="flex flex-col items-center mb-10"
          >
            <div className="w-32 h-32 mb-6 p-2 bg-white/5 rounded-3xl backdrop-blur-md border border-white/10 shadow-2xl relative group">
              <div className="absolute inset-0 bg-brand-red rounded-3xl blur-2xl opacity-10 group-hover:opacity-20 transition-opacity"></div>
              <img src="/logo.png" alt="Logo Las Groseras" className="w-full h-full object-contain relative z-10" />
            </div>
            <div className="bg-brand-red px-6 py-1.5 rounded-full text-[10px] font-black tracking-[0.3em] uppercase text-white italic shadow-lg shadow-brand-red/20">
              Las Groseras • Barra de Micheladas
            </div>
          </motion.div>
          <motion.h1 
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-5xl md:text-7xl font-black text-white italic tracking-tighter mb-4"
          >
            COTIZA TU <span className="text-brand-red">EVENTO</span>
          </motion.h1>
          <motion.p 
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-slate-400 text-lg max-w-xl mx-auto"
          >
            Lleva el sabor más grosero a tu celebración. Cuéntanos qué necesitas y nosotros nos encargamos del resto.
          </motion.p>
        </div>

        <motion.div 
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="glass p-8 md:p-12 border-t-4 border-t-brand-red"
        >
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Personal Info */}
              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">Nombre completo *</label>
                  <input 
                    required
                    type="text" 
                    placeholder="¿A quién buscamos?"
                    className="input-field bg-white/5 border-white/10 text-lg"
                    value={formData.nombre_contacto}
                    onChange={(e) => setFormData({...formData, nombre_contacto: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">Teléfono (WhatsApp) *</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-red opacity-50" size={18} />
                    <input 
                      required
                      type="tel" 
                      placeholder="10 dígitos"
                      className="input-field bg-white/5 border-white/10 pl-10 text-lg"
                      value={formData.telefono}
                      onChange={(e) => setFormData({...formData, telefono: e.target.value})}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">Correo electrónico</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-red opacity-50" size={18} />
                    <input 
                      type="email" 
                      placeholder="ejemplo@correo.com"
                      className="input-field bg-white/5 border-white/10 pl-10 text-lg"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              {/* Event Info */}
              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">Tipo de evento</label>
                  <input 
                    placeholder="Boda, Bautizo, Fiesta..."
                    className="input-field bg-white/5 border-white/10 text-lg"
                    value={formData.tipo_evento}
                    onChange={(e) => setFormData({...formData, tipo_evento: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">¿Cuándo?</label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-red opacity-50" size={18} />
                      <input 
                        type="date" 
                        className="input-field bg-white/5 border-white/10 pl-10 text-sm"
                        value={formData.fecha_tentativa}
                        onChange={(e) => setFormData({...formData, fecha_tentativa: e.target.value})}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">Personas</label>
                    <div className="relative">
                      <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-red opacity-50" size={18} />
                      <input 
                        type="number" 
                        placeholder="PAX"
                        className="input-field bg-white/5 border-white/10 pl-10 text-lg"
                        value={formData.numero_personas}
                        onChange={(e) => setFormData({...formData, numero_personas: e.target.value})}
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">Comentarios adicionales</label>
                  <textarea 
                    placeholder="Detalles sobre el lugar, horario o requerimientos especiales..."
                    rows={3}
                    className="input-field bg-white/5 border-white/10 resize-none"
                    value={formData.notas}
                    onChange={(e) => setFormData({...formData, notas: e.target.value})}
                  />
                </div>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="btn-primary w-full py-5 text-xl justify-center shadow-2xl shadow-brand-red/20 group relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 italic"></div>
              {loading ? 'ENVIANDO...' : 'ENVIAR SOLICITUD'}
              <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
            </button>
          </form>
        </motion.div>

        <div className="mt-12 flex justify-center gap-8 text-slate-500">
           <div className="flex items-center gap-2 hover:text-white transition-colors cursor-pointer">
              <Instagram size={20} />
              <span className="text-xs font-bold">@lasgroseras</span>
           </div>
           <div className="flex items-center gap-2 hover:text-white transition-colors cursor-pointer">
              <MessageCircle size={20} />
              <span className="text-xs font-bold">WhatsApp</span>
           </div>
        </div>
      </div>
    </div>
  );
};

export default LeadCaptureForm;
