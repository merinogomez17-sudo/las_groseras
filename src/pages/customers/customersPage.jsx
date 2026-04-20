import React, { useState, useEffect } from 'react';
import { 
  Users, Search, Plus, Mail, Phone, 
  MapPin, Tag, Edit2, Trash2, X, Save, 
  ChevronRight, Calendar, UserCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';

const CustomersPage = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);

  const [formData, setFormData] = useState({
    nombre_completo: '',
    telefono: '',
    email: '',
    tipo_cliente: 'particular',
    empresa: '',
    rfc: '',
    notas: '',
    tags: []
  });

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .order('nombre_completo', { ascending: true });

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      toast.error('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (customer = null) => {
    if (customer) {
      setEditingCustomer(customer);
      setFormData({ ...customer });
    } else {
      setEditingCustomer(null);
      setFormData({
        nombre_completo: '',
        telefono: '',
        email: '',
        tipo_cliente: 'particular',
        empresa: '',
        rfc: '',
        notas: '',
        tags: []
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const loadingToast = toast.loading('Guardando...');
    
    try {
      if (editingCustomer) {
        const { error } = await supabase
          .from('clientes')
          .update(formData)
          .eq('id', editingCustomer.id);
        if (error) throw error;
        toast.success('Cliente actualizado', { id: loadingToast });
      } else {
        const { error } = await supabase
          .from('clientes')
          .insert([formData]);
        if (error) throw error;
        toast.success('Cliente agregado', { id: loadingToast });
      }
      setIsModalOpen(false);
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 bg-slate-900/40 p-6 rounded-3xl border border-white/5 backdrop-blur-md">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white italic tracking-tighter flex items-center gap-3 uppercase">
            <Users className="text-brand-red shrink-0" size={32} />
            CLIENTES
          </h1>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-[0.2em] mt-1">Base de datos de clientes particulares y empresas.</p>
        </div>
        <button className="btn-primary shadow-xl shadow-brand-red/40 px-8 py-3 group w-full sm:w-auto flex justify-center" onClick={() => handleOpenModal()}>
          <Plus size={20} className="stroke-[3px]" />
          <span className="font-black italic">NUEVO CLIENTE</span>
        </button>
      </div>

      {/* Quick Search */}
      <div className="glass p-4">
        <div className="relative w-full max-w-xl">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
          <input 
            type="text" 
            placeholder="Buscar por nombre, email o teléfono..." 
            className="input-field pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full text-center py-20 text-slate-500">Cargando clientes...</div>
        ) : filteredCustomers.map((customer) => (
          <motion.div 
            layout
            key={customer.id} 
            className="glass p-6 glass-hover group"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center text-brand-red border border-white/10 group-hover:bg-brand-red group-hover:text-white transition-all duration-300">
                  <UserCheck size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white leading-tight">{customer.nombre_completo}</h3>
                  <span className={`text-[10px] uppercase tracking-wider font-black px-2 py-0.5 rounded-full mt-1 inline-block ${customer.tipo_cliente === 'empresa' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-brand-red/10 text-brand-red border border-brand-red/20'}`}>
                    {customer.tipo_cliente}
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleOpenModal(customer)} className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors">
                  <Edit2 size={16} />
                </button>
                <button onClick={() => handleDelete(customer.id)} className="p-2 hover:bg-rose-500/10 rounded-lg text-slate-400 hover:text-rose-500 transition-colors">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            <div className="space-y-2 mt-4">
              {customer.email && (
                <div className="flex items-center gap-3 text-sm text-slate-400">
                  <Mail size={14} className="text-slate-500" />
                  {customer.email}
                </div>
              )}
              {customer.telefono && (
                <div className="flex items-center gap-3 text-sm text-slate-400">
                  <Phone size={14} className="text-slate-500" />
                  {customer.telefono}
                </div>
              )}
              {customer.empresa && (
                <div className="flex items-center gap-3 text-sm text-slate-400">
                  <Tag size={14} className="text-slate-500" />
                  {customer.empresa}
                </div>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-white/5 flex justify-between items-center">
              <span className="text-xs text-slate-500 flex items-center gap-1">
                <Calendar size={12} />
                Desde {new Date(customer.fecha_registro).toLocaleDateString()}
              </span>
              <button className="text-xs font-bold text-brand-red hover:underline flex items-center gap-1">
                Ver historial <ChevronRight size={12} />
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Modal CRUD Clientes */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass max-w-2xl w-full p-8 relative max-h-[90vh] overflow-y-auto"
            >
              <button onClick={() => setIsModalOpen(false)} className="absolute right-4 top-4 text-slate-500 hover:text-white">
                <X size={24} />
              </button>
              
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-3 text-white">
                {editingCustomer ? 'Editar Cliente' : 'Nuevo Cliente'}
              </h2>

              <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-400 mb-2">Nombre Completo</label>
                  <input 
                    required
                    type="text" 
                    className="input-field"
                    value={formData.nombre_completo}
                    onChange={(e) => setFormData({...formData, nombre_completo: e.target.value})}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Tipo de Cliente</label>
                  <select 
                    className="input-field"
                    value={formData.tipo_cliente}
                    onChange={(e) => setFormData({...formData, tipo_cliente: e.target.value})}
                  >
                    <option value="particular" className="bg-slate-900">Particular</option>
                    <option value="empresa" className="bg-slate-900">Empresa</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Teléfono</label>
                  <input 
                    type="tel"
                    className="input-field"
                    value={formData.telefono}
                    onChange={(e) => setFormData({...formData, telefono: e.target.value})}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Email</label>
                  <input 
                    type="email"
                    className="input-field"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                  />
                </div>

                {formData.tipo_cliente === 'empresa' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-slate-400 mb-2">Nombre de la Empresa</label>
                      <input 
                        type="text"
                        className="input-field"
                        value={formData.empresa}
                        onChange={(e) => setFormData({...formData, empresa: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-400 mb-2">RFC</label>
                      <input 
                        type="text"
                        className="input-field"
                        value={formData.rfc}
                        onChange={(e) => setFormData({...formData, rfc: e.target.value})}
                      />
                    </div>
                  </>
                )}

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-400 mb-2">Notas Internas</label>
                  <textarea 
                    rows={3}
                    className="input-field resize-none focus:ring-brand-red/50"
                    value={formData.notas}
                    onChange={(e) => setFormData({...formData, notas: e.target.value})}
                  />
                </div>

                <div className="md:col-span-2 flex justify-end gap-3 mt-4">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary">Cancelar</button>
                  <button type="submit" className="btn-primary">
                    <Save size={20} />
                    {editingCustomer ? 'Actualizar' : 'Crear Cliente'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CustomersPage;
