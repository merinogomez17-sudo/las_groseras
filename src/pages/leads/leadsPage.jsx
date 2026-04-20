import React, { useState, useEffect } from 'react';
import { 
  Target, Plus, Search, MoreVertical, 
  Calendar, Phone, Mail, Instagram, MessageCircle,
  Clock, Trash2, Edit2, X, Save, AlertCircle, Users,
  Filter, ChevronDown, CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';

/**
 * MÓDULO DE LEADS - VISTA DE TABLA
 * Permite gestionar todos los prospectos con edición total de campos.
 */

const LEAD_STATUSES = [
  { id: 'nuevo', label: 'Nuevo', color: 'bg-blue-500', text: 'text-blue-400' },
  { id: 'contactado', label: 'Contactado', color: 'bg-amber-500', text: 'text-amber-400' },
  { id: 'cotizado', label: 'Cotizado', color: 'bg-purple-500', text: 'text-purple-400' },
  { id: 'negociacion', label: 'Negociación', color: 'bg-indigo-500', text: 'text-indigo-400' },
  { id: 'cerrado_ganado', label: 'Ganado', color: 'bg-emerald-500', text: 'text-emerald-400' },
  { id: 'cerrado_perdido', label: 'Perdido', color: 'bg-rose-500', text: 'text-rose-400' }
];

const LeadsPage = () => {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState(null);

  const [formData, setFormData] = useState({
    nombre_contacto: '',
    telefono: '',
    email: '',
    tipo_evento: '',
    fecha_tentativa: '',
    numero_personas: '',
    presupuesto_estimado: '',
    canal_origen: 'WhatsApp',
    estado: 'nuevo',
    notas: ''
  });

  useEffect(() => {
    fetchLeads();
    
    // Realtime subscription
    const subscription = supabase
      .channel('leads_table_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, () => {
        fetchLeads();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('fecha_ingreso', { ascending: false });

      if (error) throw error;
      setLeads(data || []);
    } catch (error) {
      toast.error('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (lead = null) => {
    if (lead) {
      setEditingLead(lead);
      setFormData({ 
        ...lead,
        // Convert nulls to empty strings for uncontrolled input warnings if any
        nombre_contacto: lead.nombre_contacto || '',
        telefono: lead.telefono || '',
        email: lead.email || '',
        tipo_evento: lead.tipo_evento || '',
        fecha_tentativa: lead.fecha_tentativa || '',
        numero_personas: lead.numero_personas || '',
        presupuesto_estimado: lead.presupuesto_estimado || '',
        canal_origen: lead.canal_origen || 'WhatsApp',
        estado: lead.estado || 'nuevo',
        notas: lead.notas || ''
      });
    } else {
      setEditingLead(null);
      setFormData({
        nombre_contacto: '',
        telefono: '',
        email: '',
        tipo_evento: '',
        fecha_tentativa: '',
        numero_personas: '',
        presupuesto_estimado: '',
        canal_origen: 'WhatsApp',
        estado: 'nuevo',
        notas: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const loadingToast = toast.loading('Guardando...');
    
    // Sanitización
    const sanitizedData = {
      ...formData,
      numero_personas: formData.numero_personas === '' ? null : Number(formData.numero_personas),
      presupuesto_estimado: formData.presupuesto_estimado === '' ? null : Number(formData.presupuesto_estimado),
      fecha_tentativa: formData.fecha_tentativa === '' ? null : formData.fecha_tentativa,
    };

    try {
      if (editingLead) {
        const { error } = await supabase
          .from('leads')
          .update(sanitizedData)
          .eq('id', editingLead.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('leads')
          .insert([sanitizedData]);
        if (error) throw error;
      }
      toast.success('Lead actualizado correctamente', { id: loadingToast });
      setIsModalOpen(false);
      fetchLeads();
    } catch (error) {
      toast.error('Error: ' + error.message, { id: loadingToast });
    }
  };

  const updateStatus = async (id, newStatus) => {
    try {
      const { error } = await supabase
        .from('leads')
        .update({ estado: newStatus })
        .eq('id', id);
      if (error) throw error;
      toast.success('Estado actualizado');
      fetchLeads();
    } catch (error) {
      toast.error('Error: ' + error.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar este prospecto?')) return;
    
    const loadingToast = toast.loading('Eliminando...');
    try {
      const { error } = await supabase
        .from('leads')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      toast.success('Lead eliminado', { id: loadingToast });
      setIsModalOpen(false);
      fetchLeads();
    } catch (error) {
      toast.error('Error al eliminar: ' + error.message, { id: loadingToast });
    }
  };

  const getSourceIcon = (source) => {
    switch (source?.toLowerCase()) {
      case 'instagram': return <Instagram size={16} className="text-pink-400" />;
      case 'whatsapp': return <MessageCircle size={16} className="text-emerald-400" />;
      case 'facebook': return <Target size={16} className="text-blue-400" />;
      default: return <Target size={16} className="text-slate-400" />;
    }
  };

  const filteredLeads = leads.filter(l => 
    l.nombre_contacto.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (l.telefono && l.telefono.includes(searchTerm)) ||
    (l.tipo_evento && l.tipo_evento.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* HEADER SECTION */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center bg-slate-900/40 p-6 rounded-3xl border border-white/5 backdrop-blur-md gap-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white italic tracking-tighter flex items-center gap-3">
            <Target className="text-brand-red animate-pulse shrink-0" size={32} />
            GESTIÓN DE LEADS
          </h1>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-[0.2em] mt-1">Pipeline de Ventas • Las Groseras CRM</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
          <div className="relative group w-full lg:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-brand-red transition-colors" size={18} />
            <input 
              type="text" 
              placeholder="Buscar por nombre, tel..." 
              className="input-field pl-10 w-full border-white/5 bg-white/5 focus:bg-white/10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button 
            className="btn-primary shadow-xl shadow-brand-red/40 px-8 py-3 group overflow-hidden relative w-full lg:w-auto flex justify-center" 
            onClick={() => handleOpenModal()}
          >
            <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500 italic"></div>
            <Plus size={20} className="stroke-[3px]" />
            <span className="font-black italic">NUEVO LEAD</span>
          </button>
        </div>
      </div>

      {/* TABLE SECTION */}
      <div className="glass overflow-hidden border border-white/5 shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/[0.02] border-b border-white/5">
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-500">Prospecto</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-500">Evento & PAX</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-500">Fecha Tentativa</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-500">Status</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-500">Origen</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-500 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.03]">
              {loading && leads.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-20 text-center text-slate-500 italic">
                    <Clock className="mx-auto mb-2 opacity-10 animate-spin" size={32} />
                    Cargando base de datos...
                  </td>
                </tr>
              ) : filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-20 text-center text-slate-500 italic">No se encontraron prospectos que coincidan.</td>
                </tr>
              ) : filteredLeads.map((lead) => (
                <tr 
                  key={lead.id} 
                  className="hover:bg-white/[0.02] transition-colors group cursor-pointer"
                  onClick={() => handleOpenModal(lead)}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-brand-red/10 border border-brand-red/20 flex items-center justify-center text-brand-red font-black italic">
                        {lead.nombre_contacto.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-bold text-white text-sm group-hover:text-brand-red transition-colors capitalize">{lead.nombre_contacto}</div>
                        <div className="flex items-center gap-2 mt-0.5">
                           {lead.telefono && <span className="text-[10px] text-slate-500 flex items-center gap-1"><Phone size={10} /> {lead.telefono}</span>}
                           {lead.email && <span className="text-[10px] text-slate-500 flex items-center gap-1"><Mail size={10} /> {lead.email}</span>}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-xs font-bold text-slate-300 capitalize">{lead.tipo_evento || 'S/N'}</div>
                    <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                      <Users size={10} /> {lead.numero_personas || '--'} PAX
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-xs font-bold text-slate-300">
                      {lead.fecha_tentativa ? new Date(lead.fecha_tentativa).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Pendiente'}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Ingreso: {new Date(lead.fecha_ingreso).toLocaleDateString()}</div>
                  </td>
                  <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                    <select 
                      className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border-0 bg-white/5 cursor-pointer focus:ring-1 focus:ring-brand-red/50 ${LEAD_STATUSES.find(s => s.id === lead.estado)?.text || 'text-slate-400'}`}
                      value={lead.estado}
                      onChange={(e) => updateStatus(lead.id, e.target.value)}
                    >
                      {LEAD_STATUSES.map(s => (
                        <option key={s.id} value={s.id} className="bg-slate-900 text-slate-300">{s.label}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                       {getSourceIcon(lead.canal_origen)}
                       <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{lead.canal_origen}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => handleOpenModal(lead)}
                        className="p-2 hover:bg-white/5 rounded-lg text-slate-400 hover:text-white transition-colors"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => handleDelete(lead.id)}
                        className="p-2 hover:bg-rose-500/10 rounded-lg text-rose-500/60 hover:text-rose-500 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL EDIT / CREATE */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="glass max-w-3xl w-full p-8 relative max-h-[90vh] overflow-y-auto custom-scrollbar"
            >
              <button onClick={() => setIsModalOpen(false)} className="absolute right-4 top-4 text-slate-500 hover:text-white transition-colors">
                <X size={24} />
              </button>
              
              <div className="mb-8 border-b border-white/5 pb-6">
                <h2 className="text-3xl font-black text-white italic tracking-tighter flex items-center gap-3">
                  {editingLead ? <Edit2 size={28} className="text-amber-400" /> : <Plus size={28} className="text-brand-red font-black" />}
                  {editingLead ? 'EDITAR PROSPECTO' : 'REGISTRAR NUEVO LEAD'}
                </h2>
                <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mt-1">
                  {editingLead ? `ID: ${editingLead.id.split('-')[0]} • Actualizando seguimiento` : 'Ingresa los datos del cliente para el flujo de ventas'}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* INFORMACIÓN PERSONAL */}
                <div className="space-y-5">
                   <h3 className="text-xs font-black text-brand-red uppercase tracking-widest flex items-center gap-2">
                     <Users size={14} /> Datos del Cliente
                   </h3>
                   <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Nombre del Contacto *</label>
                    <input 
                      required
                      type="text" 
                      className="input-field bg-white/5 border-white/10"
                      value={formData.nombre_contacto}
                      onChange={(e) => setFormData({...formData, nombre_contacto: e.target.value})}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">WhatsApp / Tel</label>
                      <input 
                        type="tel"
                        className="input-field bg-white/5 border-white/10"
                        value={formData.telefono}
                        onChange={(e) => setFormData({...formData, telefono: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Email</label>
                      <input 
                        type="email"
                        className="input-field bg-white/5 border-white/10"
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Canal de Origen</label>
                    <select 
                      className="input-field bg-white/5 border-white/10"
                      value={formData.canal_origen}
                      onChange={(e) => setFormData({...formData, canal_origen: e.target.value})}
                    >
                      <option value="WhatsApp" className="bg-slate-900">WhatsApp</option>
                      <option value="Instagram" className="bg-slate-900">Instagram</option>
                      <option value="Facebook" className="bg-slate-900">Facebook</option>
                      <option value="Referido" className="bg-slate-900">Referido</option>
                      <option value="Web" className="bg-slate-900">Formulario Web</option>
                    </select>
                  </div>
                </div>

                {/* DETALLES DEL EVENTO */}
                <div className="space-y-5">
                   <h3 className="text-xs font-black text-brand-red uppercase tracking-widest flex items-center gap-2">
                     <Calendar size={14} /> Detalles del Evento
                   </h3>
                   <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Tipo de Evento</label>
                    <input 
                      placeholder="Boda, XV, Corporativo..."
                      className="input-field bg-white/5 border-white/10"
                      value={formData.tipo_evento}
                      onChange={(e) => setFormData({...formData, tipo_evento: e.target.value})}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Fecha Tentativa</label>
                      <input 
                        type="date"
                        className="input-field bg-white/5 border-white/10"
                        value={formData.fecha_tentativa}
                        onChange={(e) => setFormData({...formData, fecha_tentativa: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Nº Personas (PAX)</label>
                      <input 
                        type="number"
                        className="input-field bg-white/5 border-white/10"
                        value={formData.numero_personas}
                        onChange={(e) => setFormData({...formData, numero_personas: e.target.value})}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Estado en Pipeline</label>
                    <select 
                      className="input-field bg-white/5 border-white/10 font-bold"
                      value={formData.estado}
                      onChange={(e) => setFormData({...formData, estado: e.target.value})}
                    >
                      {LEAD_STATUSES.map(s => (
                        <option key={s.id} value={s.id} className="bg-slate-900">{s.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* NOTAS */}
                <div className="md:col-span-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Notas de Seguimiento</label>
                  <textarea 
                    rows={3}
                    className="input-field bg-white/5 border-white/10 resize-none min-h-[100px]"
                    placeholder="Escribe aquí cualquier detalle importante del prospecto..."
                    value={formData.notas}
                    onChange={(e) => setFormData({...formData, notas: e.target.value})}
                  />
                </div>

                {/* ACCIONES DEL FORMULARIO */}
                <div className="md:col-span-2 flex justify-between items-center mt-6 pt-6 border-t border-white/5">
                  {editingLead ? (
                    <button 
                      type="button" 
                      onClick={() => handleDelete(editingLead.id)}
                      className="text-rose-500 hover:text-rose-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 px-4 py-2 hover:bg-rose-500/10 rounded-xl transition-all"
                    >
                      <Trash2 size={16} />
                      Eliminar Registro
                    </button>
                  ) : <div></div>}
                  <div className="flex gap-4">
                    <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary rounded-xl px-6">Cancelar</button>
                    <button type="submit" className="btn-primary rounded-xl px-10 shadow-xl shadow-brand-red/20">
                      <Save size={20} />
                      <span className="font-black italic uppercase tracking-tighter">
                        {editingLead ? 'ACTUALIZAR' : 'GUARDAR LEAD'}
                      </span>
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LeadsPage;
