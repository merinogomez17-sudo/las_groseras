import React, { useState, useEffect } from 'react';
import { ClipboardList, Search, Edit2, Save, X, UserCheck, Mail, Phone, Tag } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';

const EMPTY_FORM = {
  nombre_completo: '', telefono: '', email: '',
  tipo_cliente: 'particular', empresa: '', rfc: '', notas: '', tags: []
};

const FormularioPage = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selected, setSelected] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchCustomers(); }, []);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('clientes').select('*').order('nombre_completo', { ascending: true });
      if (error) throw error;
      setCustomers(data || []);
    } catch (err) {
      toast.error('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const selectCustomer = (c) => {
    setSelected(c);
    setFormData({ ...c });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { error } = await supabase.from('clientes').update(formData).eq('id', selected.id);
      if (error) throw error;
      toast.success('Cliente actualizado');
      fetchCustomers();
      setSelected({ ...selected, ...formData });
    } catch (err) {
      toast.error('Error: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const filtered = customers.filter(c =>
    c.nombre_completo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.email && c.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (c.telefono && c.telefono.includes(searchTerm))
  );

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="bg-slate-900/40 p-6 rounded-3xl border border-white/5 backdrop-blur-md">
        <h1 className="lobster text-2xl sm:text-3xl text-white flex items-center gap-3">
          <ClipboardList className="text-brand-red shrink-0" size={28} />
          Formulario de Clientes
        </h1>
        <p className="text-slate-500 text-xs font-bold tracking-[0.2em] mt-1">
          Selecciona un cliente para editar sus datos.
        </p>
      </div>

      <div className="flex gap-5 items-start">
        {/* LISTA */}
        <div className="w-80 shrink-0 glass p-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <input
              type="text"
              placeholder="Buscar cliente..."
              className="input-field pl-9 text-sm"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="space-y-1 max-h-[calc(100vh-280px)] overflow-y-auto custom-scrollbar pr-1">
            {loading ? (
              <p className="text-slate-500 text-sm text-center py-8">Cargando...</p>
            ) : filtered.map(c => (
              <button
                key={c.id}
                onClick={() => selectCustomer(c)}
                className={`w-full text-left px-3 py-2.5 rounded-xl transition-all flex items-center gap-3 ${
                  selected?.id === c.id
                    ? 'bg-brand-red/10 border border-brand-red/30 text-white'
                    : 'hover:bg-white/5 text-slate-300 border border-transparent'
                }`}
              >
                <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                  <UserCheck size={14} className={selected?.id === c.id ? 'text-brand-red' : 'text-slate-500'} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">{c.nombre_completo}</p>
                  <p className="text-xs text-slate-500 truncate">{c.email || c.telefono || '—'}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* FORMULARIO */}
        <div className="flex-1 min-w-0">
          {!selected ? (
            <div className="glass p-12 text-center text-slate-500">
              <Edit2 size={32} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">Selecciona un cliente de la lista para editar sus datos.</p>
            </div>
          ) : (
            <div className="glass p-7">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-black text-white tracking-tighter flex items-center gap-3">
                  <Edit2 size={20} className="text-emerald-400" />
                  {selected.nombre_completo}
                </h2>
                <button onClick={() => setSelected(null)} className="text-slate-500 hover:text-white transition-colors">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSave} className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-2">Nombre Completo</label>
                    <input required type="text" className="input-field"
                      value={formData.nombre_completo}
                      onChange={e => setFormData({ ...formData, nombre_completo: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-2">Tipo de Cliente</label>
                    <select className="input-field"
                      value={formData.tipo_cliente}
                      onChange={e => setFormData({ ...formData, tipo_cliente: e.target.value })}>
                      <option value="particular" className="bg-slate-900">Particular</option>
                      <option value="empresa" className="bg-slate-900">Empresa</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-2">
                      <Phone size={11} className="inline mr-1" />Teléfono
                    </label>
                    <input type="tel" className="input-field"
                      value={formData.telefono || ''}
                      onChange={e => setFormData({ ...formData, telefono: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-2">
                      <Mail size={11} className="inline mr-1" />Email
                    </label>
                    <input type="email" className="input-field"
                      value={formData.email || ''}
                      onChange={e => setFormData({ ...formData, email: e.target.value })} />
                  </div>
                </div>

                {formData.tipo_cliente === 'empresa' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 mb-2">
                        <Tag size={11} className="inline mr-1" />Empresa
                      </label>
                      <input type="text" className="input-field"
                        value={formData.empresa || ''}
                        onChange={e => setFormData({ ...formData, empresa: e.target.value })} />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 mb-2">RFC</label>
                      <input type="text" className="input-field"
                        value={formData.rfc || ''}
                        onChange={e => setFormData({ ...formData, rfc: e.target.value })} />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-2">Notas Internas</label>
                  <textarea rows={4} className="input-field resize-none"
                    value={formData.notas || ''}
                    onChange={e => setFormData({ ...formData, notas: e.target.value })} />
                </div>

                <div className="flex justify-end gap-3 pt-2 border-t border-white/5">
                  <button type="button" onClick={() => setFormData({ ...selected })} className="btn-secondary text-sm px-5">
                    Restablecer
                  </button>
                  <button type="submit" disabled={saving} className="btn-primary text-sm px-7">
                    <Save size={15} />
                    {saving ? 'Guardando...' : 'Guardar cambios'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FormularioPage;
