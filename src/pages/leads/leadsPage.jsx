import React, { useState, useEffect } from 'react';
import {
  Target, Plus, Search,
  Calendar, Phone, Mail, Instagram, MessageCircle,
  Trash2, Edit2, X, Save, Users,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';

const LEAD_STATUSES = [
  { id: 'nuevo',          label: 'Nuevo',       text: 'text-blue-400' },
  { id: 'contactado',     label: 'Contactado',  text: 'text-amber-400' },
  { id: 'cotizado',       label: 'Cotizado',    text: 'text-purple-400' },
  { id: 'negociacion',    label: 'Negociación', text: 'text-indigo-400' },
  { id: 'cerrado_ganado', label: 'Ganado',      text: 'text-emerald-400' },
  { id: 'cerrado_perdido',label: 'Perdido',     text: 'text-rose-400' }
];

const EMPTY_FORM = {
  nombre_contacto: '', telefono: '', email: '', tipo_evento: '',
  fecha_tentativa: '', numero_personas: '', presupuesto_estimado: '',
  canal_origen: 'WhatsApp', estado: 'nuevo', notas: ''
};

const LeadsPage = () => {
  const [leads, setLeads]             = useState([]);
  const [loading, setLoading]         = useState(true);
  const [searchTerm, setSearchTerm]   = useState('');
  const [panelOpen, setPanelOpen]     = useState(false);
  const [editingLead, setEditingLead] = useState(null);
  const [formData, setFormData]       = useState(EMPTY_FORM);

  useEffect(() => {
    fetchLeads();
    const subscription = supabase
      .channel('leads_table_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, () => fetchLeads())
      .subscribe();
    return () => supabase.removeChannel(subscription);
  }, []);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('leads').select('*').order('fecha_ingreso', { ascending: false });
      if (error) throw error;
      setLeads(data || []);
    } catch (error) {
      toast.error('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const openPanel = (lead = null) => {
    if (lead) {
      setEditingLead(lead);
      setFormData({
        ...lead,
        nombre_contacto:      lead.nombre_contacto || '',
        telefono:             lead.telefono || '',
        email:                lead.email || '',
        tipo_evento:          lead.tipo_evento || '',
        fecha_tentativa:      lead.fecha_tentativa || '',
        numero_personas:      lead.numero_personas || '',
        presupuesto_estimado: lead.presupuesto_estimado || '',
        canal_origen:         lead.canal_origen || 'WhatsApp',
        estado:               lead.estado || 'nuevo',
        notas:                lead.notas || ''
      });
    } else {
      setEditingLead(null);
      setFormData(EMPTY_FORM);
    }
    setPanelOpen(true);
  };

  const closePanel = () => setPanelOpen(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const loadingToast = toast.loading('Guardando...');
    const sanitizedData = {
      ...formData,
      numero_personas:      formData.numero_personas === '' ? null : Number(formData.numero_personas),
      presupuesto_estimado: formData.presupuesto_estimado === '' ? null : Number(formData.presupuesto_estimado),
      fecha_tentativa:      formData.fecha_tentativa === '' ? null : formData.fecha_tentativa,
    };
    try {
      if (editingLead) {
        const { error } = await supabase.from('leads').update(sanitizedData).eq('id', editingLead.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('leads').insert([sanitizedData]);
        if (error) throw error;
      }
      toast.success('Lead actualizado correctamente', { id: loadingToast });
      closePanel();
      fetchLeads();
    } catch (error) {
      toast.error('Error: ' + error.message, { id: loadingToast });
    }
  };

  const updateStatus = async (id, newStatus) => {
    try {
      const { error } = await supabase.from('leads').update({ estado: newStatus }).eq('id', id);
      if (error) throw error;
      fetchLeads();
    } catch (error) {
      toast.error('Error: ' + error.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar este prospecto?')) return;
    const loadingToast = toast.loading('Eliminando...');
    try {
      const { error } = await supabase.from('leads').delete().eq('id', id);
      if (error) throw error;
      toast.success('Lead eliminado', { id: loadingToast });
      closePanel();
      fetchLeads();
    } catch (error) {
      toast.error('Error al eliminar: ' + error.message, { id: loadingToast });
    }
  };

  const getSourceIcon = (source) => {
    switch (source?.toLowerCase()) {
      case 'instagram': return <Instagram size={15} className="text-pink-400" />;
      case 'whatsapp':  return <MessageCircle size={15} className="text-emerald-400" />;
      default:          return <Target size={15} className="text-slate-400" />;
    }
  };

  const filteredLeads = leads.filter(l =>
    l.nombre_contacto.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (l.telefono && l.telefono.includes(searchTerm)) ||
    (l.tipo_evento && l.tipo_evento.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center bg-slate-900/40 p-6 rounded-3xl border border-white/5 backdrop-blur-md gap-6">
        <div>
          <h1 className="lobster text-2xl sm:text-3xl text-white flex items-center gap-3">
            <Target className="text-brand-red animate-pulse shrink-0" size={32} />
            Gestión de Leads
          </h1>
          <p className="text-slate-500 text-xs font-bold tracking-[0.2em] mt-1">Pipeline de Ventas • Las Groseras CRM</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
          <div className="relative group w-full lg:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-brand-red transition-colors" size={18} />
            <input
              type="text" placeholder="Buscar por nombre, tel..."
              className="input-field pl-10 w-full border-white/5 bg-white/5 focus:bg-white/10"
              value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button
            className={`btn-primary shadow-xl shadow-brand-red/40 px-8 py-3 w-full lg:w-auto flex justify-center ${panelOpen && !editingLead ? 'ring-2 ring-brand-red/50' : ''}`}
            onClick={() => openPanel()}
          >
            <Plus size={20} className="stroke-[3px]" />
            <span className="font-black">Nuevo lead</span>
          </button>
        </div>
      </div>

      {/* SPLIT VIEW */}
      <div className="flex gap-5 items-start">

        {/* TABLA */}
        <div className={`flex-1 min-w-0 glass overflow-hidden border border-white/5 shadow-2xl`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white/[0.02] border-b border-white/5">
                  <th className="px-6 py-5 text-[10px] font-black tracking-widest text-slate-500">Prospecto</th>
                  {!panelOpen && <th className="px-6 py-5 text-[10px] font-black tracking-widest text-slate-500">Evento & PAX</th>}
                  {!panelOpen && <th className="px-6 py-5 text-[10px] font-black tracking-widest text-slate-500">Fecha</th>}
                  <th className="px-6 py-5 text-[10px] font-black tracking-widest text-slate-500">Status</th>
                  {!panelOpen && <th className="px-6 py-5 text-[10px] font-black tracking-widest text-slate-500">Origen</th>}
                  <th className="px-6 py-5 text-[10px] font-black tracking-widest text-slate-500 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03]">
                {loading && leads.length === 0 ? (
                  <tr><td colSpan="6" className="px-6 py-20 text-center text-slate-500">Cargando...</td></tr>
                ) : filteredLeads.length === 0 ? (
                  <tr><td colSpan="6" className="px-6 py-20 text-center text-slate-500">No se encontraron prospectos.</td></tr>
                ) : filteredLeads.map((lead) => (
                  <tr
                    key={lead.id}
                    className={`hover:bg-white/[0.02] transition-colors group cursor-pointer ${editingLead?.id === lead.id ? 'bg-brand-red/5' : ''}`}
                    onClick={() => openPanel(lead)}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-brand-red/10 border border-brand-red/20 flex items-center justify-center text-brand-red font-black text-sm">
                          {lead.nombre_contacto.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-white text-sm group-hover:text-brand-red transition-colors capitalize">{lead.nombre_contacto}</div>
                          {!panelOpen && (
                            <div className="flex items-center gap-2 mt-0.5">
                              {lead.telefono && <span className="text-[10px] text-slate-500 flex items-center gap-1"><Phone size={9} /> {lead.telefono}</span>}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    {!panelOpen && (
                      <td className="px-6 py-4">
                        <div className="text-xs font-bold text-slate-300 capitalize">{lead.tipo_evento || 'S/N'}</div>
                        <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <Users size={10} /> {lead.numero_personas || '--'} PAX
                        </div>
                      </td>
                    )}
                    {!panelOpen && (
                      <td className="px-6 py-4">
                        <div className="text-xs font-bold text-slate-300">
                          {lead.fecha_tentativa ? new Date(lead.fecha_tentativa).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' }) : 'Pendiente'}
                        </div>
                      </td>
                    )}
                    <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                      <select
                        className={`text-[10px] font-black tracking-widest px-2 py-1.5 rounded-full border-0 bg-white/5 cursor-pointer ${LEAD_STATUSES.find(s => s.id === lead.estado)?.text || 'text-slate-400'}`}
                        value={lead.estado}
                        onChange={(e) => updateStatus(lead.id, e.target.value)}
                      >
                        {LEAD_STATUSES.map(s => (
                          <option key={s.id} value={s.id} className="bg-slate-900 text-slate-300">{s.label}</option>
                        ))}
                      </select>
                    </td>
                    {!panelOpen && (
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {getSourceIcon(lead.canal_origen)}
                          <span className="text-[10px] font-bold text-slate-400">{lead.canal_origen}</span>
                        </div>
                      </td>
                    )}
                    <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openPanel(lead)} className="p-1.5 hover:bg-white/5 rounded-lg text-slate-400 hover:text-white transition-colors">
                          <Edit2 size={14} />
                        </button>
                        <button onClick={() => handleDelete(lead.id)} className="p-1.5 hover:bg-rose-500/10 rounded-lg text-rose-500/60 hover:text-rose-500 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* PANEL DERECHO */}
        <AnimatePresence>
          {panelOpen && (
            <motion.div
              key="lead-panel"
              initial={{ opacity: 0, x: 32 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 32 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="w-[420px] shrink-0 sticky top-6"
            >
              <div className="glass border-white/5 p-7 relative max-h-[calc(100vh-120px)] overflow-y-auto custom-scrollbar">
                <button onClick={closePanel} className="absolute right-5 top-5 text-slate-500 hover:text-white transition-colors">
                  <X size={20} />
                </button>

                <h2 className="text-xl font-black text-white tracking-tighter mb-1 flex items-center gap-3">
                  {editingLead ? <Edit2 size={20} className="text-amber-400" /> : <Plus size={20} className="text-brand-red" />}
                  {editingLead ? 'Editar prospecto' : 'Nuevo lead'}
                </h2>
                <p className="text-slate-500 text-[10px] font-black tracking-widest mb-6">
                  {editingLead ? `ID: ${editingLead.id.split('-')[0]}` : 'Ingresa los datos del cliente'}
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Datos del cliente */}
                  <p className="text-[10px] font-black text-brand-red tracking-widest flex items-center gap-2">
                    <Users size={12} /> Datos del Cliente
                  </p>

                  <div>
                    <label className="text-[10px] font-black text-slate-500 tracking-widest mb-1.5 block">Nombre *</label>
                    <input required type="text" className="input-field bg-white/5 border-white/10"
                      value={formData.nombre_contacto}
                      onChange={(e) => setFormData({...formData, nombre_contacto: e.target.value})} />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-black text-slate-500 tracking-widest mb-1.5 block">WhatsApp / Tel</label>
                      <input type="tel" className="input-field bg-white/5 border-white/10"
                        value={formData.telefono}
                        onChange={(e) => setFormData({...formData, telefono: e.target.value})} />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-500 tracking-widest mb-1.5 block">Email</label>
                      <input type="email" className="input-field bg-white/5 border-white/10"
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})} />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-slate-500 tracking-widest mb-1.5 block">Canal de Origen</label>
                    <select className="input-field bg-white/5 border-white/10"
                      value={formData.canal_origen}
                      onChange={(e) => setFormData({...formData, canal_origen: e.target.value})}>
                      {['WhatsApp','Instagram','Facebook','Referido','Web'].map(c => (
                        <option key={c} value={c} className="bg-slate-900">{c}</option>
                      ))}
                    </select>
                  </div>

                  {/* Detalles del evento */}
                  <p className="text-[10px] font-black text-brand-red tracking-widest flex items-center gap-2 pt-2">
                    <Calendar size={12} /> Detalles del Evento
                  </p>

                  <div>
                    <label className="text-[10px] font-black text-slate-500 tracking-widest mb-1.5 block">Tipo de Evento</label>
                    <input placeholder="Boda, XV, Corporativo..." className="input-field bg-white/5 border-white/10"
                      value={formData.tipo_evento}
                      onChange={(e) => setFormData({...formData, tipo_evento: e.target.value})} />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-black text-slate-500 tracking-widest mb-1.5 block">Fecha Tentativa</label>
                      <input type="date" className="input-field bg-white/5 border-white/10"
                        value={formData.fecha_tentativa}
                        onChange={(e) => setFormData({...formData, fecha_tentativa: e.target.value})} />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-500 tracking-widest mb-1.5 block">PAX</label>
                      <input type="number" className="input-field bg-white/5 border-white/10"
                        value={formData.numero_personas}
                        onChange={(e) => setFormData({...formData, numero_personas: e.target.value})} />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-slate-500 tracking-widest mb-1.5 block">Estado en Pipeline</label>
                    <select className="input-field bg-white/5 border-white/10 font-bold"
                      value={formData.estado}
                      onChange={(e) => setFormData({...formData, estado: e.target.value})}>
                      {LEAD_STATUSES.map(s => (
                        <option key={s.id} value={s.id} className="bg-slate-900">{s.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-slate-500 tracking-widest mb-1.5 block">Notas</label>
                    <textarea rows={3}
                      className="input-field bg-white/5 border-white/10 resize-none"
                      placeholder="Detalles importantes del prospecto..."
                      value={formData.notas}
                      onChange={(e) => setFormData({...formData, notas: e.target.value})} />
                  </div>

                  <div className="flex justify-between items-center pt-3 border-t border-white/5">
                    {editingLead ? (
                      <button type="button" onClick={() => handleDelete(editingLead.id)}
                        className="text-rose-500 hover:text-rose-400 text-[10px] font-black tracking-widest flex items-center gap-2 px-3 py-2 hover:bg-rose-500/10 rounded-xl transition-all">
                        <Trash2 size={14} /> Eliminar
                      </button>
                    ) : <div />}
                    <div className="flex gap-3">
                      <button type="button" onClick={closePanel} className="btn-secondary text-sm px-5">Cancelar</button>
                      <button type="submit" className="btn-primary text-sm px-7">
                        <Save size={15} />
                        {editingLead ? 'Actualizar' : 'Guardar'}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default LeadsPage;
