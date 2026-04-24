import React, { useState, useEffect } from 'react';
import {
  Users, Search, Plus, Mail, Phone,
  Tag, Edit2, Trash2, X, Save,
  ChevronRight, Calendar, UserCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';

const EMPTY_FORM = {
  nombre_completo: '', telefono: '', email: '',
  tipo_cliente: 'particular', empresa: '', rfc: '', notas: '', tags: []
};

const CustomersPage = () => {
  const [customers, setCustomers]         = useState([]);
  const [loading, setLoading]             = useState(true);
  const [searchTerm, setSearchTerm]       = useState('');
  const [panelOpen, setPanelOpen]         = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [formData, setFormData]           = useState(EMPTY_FORM);

  useEffect(() => { fetchCustomers(); }, []);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('clientes').select('*').order('nombre_completo', { ascending: true });
      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      toast.error('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const openPanel = (customer = null) => {
    if (customer) {
      setEditingCustomer(customer);
      setFormData({ ...customer });
    } else {
      setEditingCustomer(null);
      setFormData(EMPTY_FORM);
    }
    setPanelOpen(true);
  };

  const closePanel = () => setPanelOpen(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const loadingToast = toast.loading('Guardando...');
    try {
      if (editingCustomer) {
        const { error } = await supabase.from('clientes').update(formData).eq('id', editingCustomer.id);
        if (error) throw error;
        toast.success('Cliente actualizado', { id: loadingToast });
      } else {
        const { error } = await supabase.from('clientes').insert([formData]);
        if (error) throw error;
        toast.success('Cliente agregado', { id: loadingToast });
      }
      closePanel();
      fetchCustomers();
    } catch (error) {
      toast.error('Error: ' + error.message, { id: loadingToast });
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar este cliente definitivamente?')) return;
    try {
      const { error } = await supabase.from('clientes').delete().eq('id', id);
      if (error) throw error;
      toast.success('Cliente eliminado');
      closePanel();
      fetchCustomers();
    } catch (error) {
      toast.error('Error al eliminar');
    }
  };

  const filteredCustomers = customers.filter(c =>
    c.nombre_completo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.email && c.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (c.telefono && c.telefono.includes(searchTerm))
  );

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 bg-slate-900/40 p-6 rounded-3xl border border-white/5 backdrop-blur-md">
        <div>
          <h1 className="lobster text-2xl sm:text-3xl text-white flex items-center gap-3">
            <Users className="text-brand-red shrink-0" size={32} />
            Clientes
          </h1>
          <p className="text-slate-500 text-xs font-bold tracking-[0.2em] mt-1">Base de datos de clientes particulares y empresas.</p>
        </div>
        <button
          className={`btn-primary shadow-xl shadow-brand-red/40 px-8 py-3 w-full sm:w-auto flex justify-center ${panelOpen && !editingCustomer ? 'ring-2 ring-brand-red/50' : ''}`}
          onClick={() => openPanel()}
        >
          <Plus size={20} className="stroke-[3px]" />
          <span className="font-black">Nuevo cliente</span>
        </button>
      </div>

      {/* BÚSQUEDA */}
      <div className="glass p-4">
        <div className="relative w-full max-w-xl">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
          <input
            type="text" placeholder="Buscar por nombre, email o teléfono..."
            className="input-field pl-10"
            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* SPLIT VIEW */}
      <div className="flex gap-5 items-start">

        {/* GRID DE TARJETAS */}
        <div className={`flex-1 min-w-0 grid gap-5 ${panelOpen ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3'}`}>
          {loading ? (
            <div className="col-span-full text-center py-20 text-slate-500">Cargando clientes...</div>
          ) : filteredCustomers.map((customer) => (
            <motion.div
              layout key={customer.id}
              className={`glass p-6 glass-hover group cursor-pointer transition-all ${editingCustomer?.id === customer.id ? 'ring-1 ring-brand-red/40' : ''}`}
              onClick={() => openPanel(customer)}
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 bg-white/5 rounded-full flex items-center justify-center text-brand-red border border-white/10 group-hover:bg-brand-red group-hover:text-white transition-all duration-300">
                    <UserCheck size={22} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white leading-tight">{customer.nombre_completo}</h3>
                    <span className={`text-[10px] tracking-wider font-black px-2 py-0.5 rounded-full mt-1 inline-block ${customer.tipo_cliente === 'empresa' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-brand-red/10 text-brand-red border border-brand-red/20'}`}>
                      {customer.tipo_cliente}
                    </span>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={(e) => { e.stopPropagation(); openPanel(customer); }}
                    className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors">
                    <Edit2 size={14} />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); handleDelete(customer.id); }}
                    className="p-1.5 hover:bg-rose-500/10 rounded-lg text-slate-400 hover:text-rose-500 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <div className="space-y-1.5 mt-3">
                {customer.email && (
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <Mail size={13} className="text-slate-500" /> {customer.email}
                  </div>
                )}
                {customer.telefono && (
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <Phone size={13} className="text-slate-500" /> {customer.telefono}
                  </div>
                )}
                {customer.empresa && (
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <Tag size={13} className="text-slate-500" /> {customer.empresa}
                  </div>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-white/5 flex justify-between items-center">
                <span className="text-xs text-slate-500 flex items-center gap-1">
                  <Calendar size={11} /> Desde {new Date(customer.fecha_registro).toLocaleDateString()}
                </span>
                <span className="text-xs font-bold text-brand-red flex items-center gap-1">
                  Ver historial <ChevronRight size={11} />
                </span>
              </div>
            </motion.div>
          ))}
        </div>

        {/* PANEL DERECHO */}
        <AnimatePresence>
          {panelOpen && (
            <motion.div
              key="customer-panel"
              initial={{ opacity: 0, x: 32 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 32 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="w-[400px] shrink-0 sticky top-6"
            >
              <div className="glass border-white/5 p-7 relative max-h-[calc(100vh-120px)] overflow-y-auto custom-scrollbar">
                <button onClick={closePanel} className="absolute right-5 top-5 text-slate-500 hover:text-white transition-colors">
                  <X size={20} />
                </button>

                <h2 className="text-xl font-black text-white tracking-tighter mb-6 flex items-center gap-3">
                  {editingCustomer ? <Edit2 size={20} className="text-emerald-400" /> : <Plus size={20} className="text-brand-red" />}
                  {editingCustomer ? 'Editar Cliente' : 'Nuevo Cliente'}
                </h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-2">Nombre Completo</label>
                    <input required type="text" className="input-field"
                      value={formData.nombre_completo}
                      onChange={(e) => setFormData({...formData, nombre_completo: e.target.value})} />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-2">Tipo de Cliente</label>
                    <select className="input-field"
                      value={formData.tipo_cliente}
                      onChange={(e) => setFormData({...formData, tipo_cliente: e.target.value})}>
                      <option value="particular" className="bg-slate-900">Particular</option>
                      <option value="empresa"    className="bg-slate-900">Empresa</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 mb-2">Teléfono</label>
                      <input type="tel" className="input-field"
                        value={formData.telefono}
                        onChange={(e) => setFormData({...formData, telefono: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 mb-2">Email</label>
                      <input type="email" className="input-field"
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})} />
                    </div>
                  </div>

                  {formData.tipo_cliente === 'empresa' && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-400 mb-2">Empresa</label>
                        <input type="text" className="input-field"
                          value={formData.empresa}
                          onChange={(e) => setFormData({...formData, empresa: e.target.value})} />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-400 mb-2">RFC</label>
                        <input type="text" className="input-field"
                          value={formData.rfc}
                          onChange={(e) => setFormData({...formData, rfc: e.target.value})} />
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-2">Notas Internas</label>
                    <textarea rows={3} className="input-field resize-none"
                      value={formData.notas}
                      onChange={(e) => setFormData({...formData, notas: e.target.value})} />
                  </div>

                  <div className="flex justify-between items-center pt-3 border-t border-white/5">
                    {editingCustomer ? (
                      <button type="button" onClick={() => handleDelete(editingCustomer.id)}
                        className="text-rose-500 hover:text-rose-400 text-[10px] font-black tracking-widest flex items-center gap-2 px-3 py-2 hover:bg-rose-500/10 rounded-xl transition-all">
                        <Trash2 size={14} /> Eliminar
                      </button>
                    ) : <div />}
                    <div className="flex gap-3">
                      <button type="button" onClick={closePanel} className="btn-secondary text-sm px-5">Cancelar</button>
                      <button type="submit" className="btn-primary text-sm px-7">
                        <Save size={15} />
                        {editingCustomer ? 'Actualizar' : 'Crear'}
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

export default CustomersPage;
