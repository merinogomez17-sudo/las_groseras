import React, { useState, useEffect } from 'react';
import { Package, PlusCircle, Edit2, Trash2, X, Save, Plus, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';

const PACKAGES_FALLBACK = [
  { id: 'bien_portado',  nombre: 'Bien Portado',        precio_persona: 210, items: ['Barra libre Micheladas (Clásica/Cubana/Clamato)', '2 Sabores de michelada', '2 Horas de Servicio'] },
  { id: 'algo_tranqui',  nombre: 'Algo Tranqui',         precio_persona: 250, items: ['Barra libre Micheladas (Clásica/Cubana/Clamato)', '3 Sabores de michelada', '1 Trago especial', '3 Horas de Servicio'] },
  { id: 'mal_portado',   nombre: 'Mal Portado',          precio_persona: 290, items: ['Barra libre Micheladas (Clásica/Cubana/Clamato)', '5 Sabores de michelada', '1 Trago especial', '2 Cervezas especiales', '3 Horas de Servicio'] },
  { id: 'el_mas_perro',  nombre: 'El Más Perro',         precio_persona: 330, items: ['Barra libre Micheladas (Clásica/Cubana/Clamato)', '5 Sabores de michelada', '3 Tragos especiales', '3 Cervezas especiales', 'Vasos personalizados con stickers', '4 Horas de Servicio'] },
  { id: 'personalizada', nombre: 'Barra Personalizada',  precio_persona: 0,   items: ['Servicio configurado 100% a la medida', 'Selección de elementos según acuerdo con el cliente'] },
];

const EMPTY_FORM = {
  nombre: '',
  precio_persona: 0,
  items: []
};

const PaquetesConfig = () => {
  const [packages, setPackages] = useState(PACKAGES_FALLBACK);
  const [loading, setLoading] = useState(true);
  const [panelOpen, setPanelOpen] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [newItemText, setNewItemText] = useState('');

  useEffect(() => {
    fetchPackages();
  }, []);

  const fetchPackages = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('paquetes').select('*').order('precio_persona');
      if (error) throw error;
      if (data && data.length > 0) {
        setPackages(data);
      }
    } catch (err) {
      toast.error('Error al cargar paquetes: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const openPanel = (pkg = null) => {
    if (pkg) {
      setFormData({
        nombre: pkg.nombre,
        precio_persona: pkg.precio_persona,
        items: [...pkg.items]
      });
      setEditingId(pkg.id);
    } else {
      setFormData(EMPTY_FORM);
      setEditingId(null);
    }
    setNewItemText('');
    setPanelOpen(true);
  };

  const closePanel = () => {
    setPanelOpen(false);
    setFormData(EMPTY_FORM);
    setEditingId(null);
  };

  const handleAddItem = () => {
    if (newItemText.trim() === '') return;
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, newItemText.trim()]
    }));
    setNewItemText('');
  };

  const handleRemoveItem = (index) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.items.length === 0) {
      toast.error('Debes agregar al menos un item al paquete');
      return;
    }
    
    const loadingToast = toast.loading(editingId ? 'Actualizando paquete...' : 'Creando paquete...');
    try {
      if (editingId) {
        if (typeof editingId === 'string' && !editingId.includes('-')) {
            const { error } = await supabase.from('paquetes').insert([formData]);
            if (error) throw error;
        } else {
            const { error } = await supabase.from('paquetes').update(formData).eq('id', editingId);
            if (error) throw error;
        }
      } else {
        const { error } = await supabase.from('paquetes').insert([formData]);
        if (error) throw error;
      }
      
      toast.success(editingId ? 'Paquete actualizado' : 'Paquete creado', { id: loadingToast });
      closePanel();
      fetchPackages();
    } catch (err) {
      toast.error('Error al guardar: ' + err.message, { id: loadingToast });
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar este paquete?')) return;
    
    if (typeof id === 'string' && !id.includes('-')) {
        toast.error('No se pueden eliminar los paquetes por defecto (fallback). Por favor carga los paquetes en base de datos primero.');
        return;
    }

    const loadingToast = toast.loading('Eliminando paquete...');
    try {
      const { error } = await supabase.from('paquetes').delete().eq('id', id);
      if (error) throw error;
      
      toast.success('Paquete eliminado', { id: loadingToast });
      fetchPackages();
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
            <Package className="text-brand-red shrink-0" size={32} />
            Configuración de Paquetes
          </h1>
          <p className="text-slate-500 text-xs font-bold tracking-[0.2em] mt-1">Gestión de paquetes y precios • Las Groseras</p>
        </div>
        <button
          className={`btn-primary shadow-xl shadow-brand-red/40 px-8 py-3 w-full sm:w-auto ${panelOpen ? 'ring-2 ring-brand-red/50' : ''}`}
          onClick={() => openPanel()}
        >
          <PlusCircle size={20} className="stroke-[3px]" />
          <span className="font-black">Nuevo Paquete</span>
        </button>
      </div>

      <div className="flex gap-5 items-start">
        {/* LISTA DE PAQUETES */}
        <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {packages.map((pkg) => (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              key={pkg.id}
              className="glass p-5 rounded-3xl flex flex-col justify-between hover:border-brand-red/30 transition-all border-l-4 border-l-brand-red group"
            >
              <div>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-black text-white tracking-tighter">{pkg.nombre}</h3>
                    <p className="text-2xl font-black text-emerald-400 mt-1">${pkg.precio_persona.toLocaleString()}<span className="text-[10px] text-slate-500 ml-1">/pax</span></p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => openPanel(pkg)} className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition-all">
                      <Edit2 size={16} />
                    </button>
                    <button onClick={() => handleDelete(pkg.id)} className="p-2 bg-white/5 hover:bg-brand-red/10 rounded-xl text-slate-400 hover:text-brand-red transition-all">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                
                <div className="space-y-2 mb-4">
                  {pkg.items.map((item, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs text-slate-300 font-medium">
                      <div className="mt-1 w-1.5 h-1.5 rounded-full bg-brand-red/50 shrink-0" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* MODAL: FORMULARIO */}
        <AnimatePresence>
          {panelOpen && (
            <motion.div
              key="paquetes-modal"
              className="fixed inset-0 z-[200] flex items-center justify-center p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div 
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={closePanel}
              />
              <motion.div
                initial={{ scale: 0.95, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 20 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="glass border-white/5 p-7 relative w-full max-w-lg max-h-[90vh] overflow-y-auto custom-scrollbar rounded-3xl z-10"
              >
                <button onClick={closePanel} className="absolute right-5 top-5 text-slate-500 hover:text-white transition-colors z-10">
                  <X size={20} />
                </button>

                <h2 className="text-xl font-black text-white tracking-tighter mb-6">
                  {editingId ? 'Editar Paquete' : 'Nuevo Paquete'}
                </h2>

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 tracking-widest mb-2">NOMBRE DEL PAQUETE</label>
                    <input
                      type="text"
                      required
                      className="input-field bg-white/5 border-white/10 w-full"
                      placeholder="Ej. Paquete Premium"
                      value={formData.nombre}
                      onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-500 tracking-widest mb-2">PRECIO POR PERSONA</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-black">$</span>
                      <input
                        type="number"
                        required
                        min="0"
                        className="input-field pl-8 bg-white/5 border-white/10 w-full"
                        placeholder="0"
                        value={formData.precio_persona}
                        onChange={(e) => setFormData({...formData, precio_persona: Number(e.target.value)})}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-500 tracking-widest mb-2">ITEMS INCLUIDOS</label>
                    <div className="flex gap-2 mb-3">
                      <input
                        type="text"
                        className="input-field bg-white/5 border-white/10 flex-1 text-sm"
                        placeholder="Agregar item..."
                        value={newItemText}
                        onChange={(e) => setNewItemText(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddItem();
                          }
                        }}
                      />
                      <button type="button" onClick={handleAddItem} className="btn-secondary px-4">
                        <Plus size={18} />
                      </button>
                    </div>
                    
                    <div className="space-y-2">
                      {formData.items.length === 0 && (
                        <p className="text-xs text-slate-500 italic text-center py-2">No hay items agregados</p>
                      )}
                      {formData.items.map((item, index) => (
                        <div key={index} className="flex justify-between items-center bg-white/5 border border-white/5 p-2 rounded-xl text-xs text-slate-300">
                          <span>{item}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(index)}
                            className="text-slate-500 hover:text-brand-red transition-colors p-1"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {(typeof editingId === 'string' && !editingId.includes('-')) && (
                    <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                      <AlertCircle className="text-amber-500 shrink-0 mt-0.5" size={15} />
                      <p className="text-[10px] font-medium text-amber-500/80 leading-relaxed">Estás editando un paquete por defecto. Al guardar, se creará como un nuevo paquete en tu base de datos.</p>
                    </div>
                  )}

                  <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                    <button type="button" onClick={closePanel} className="btn-secondary px-6">Cancelar</button>
                    <button type="submit" className="btn-primary px-8">
                      <Save size={16} /> Guardar
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default PaquetesConfig;
