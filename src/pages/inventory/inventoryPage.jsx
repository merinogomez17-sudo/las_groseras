import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Package, Search, Plus, Filter, Download,
  AlertTriangle, TrendingUp,
  Edit2, Trash2, X, Save, RefreshCw,
  Layers, ShoppingCart, Calendar
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';
import Papa from 'papaparse';

const categories = [
  'Todas', 'Alcohol', 'Cerveza', 'Salsas', 'Refresco',
  'Pulpa para escarchar', 'Polvo para escarchar', 'Pulpa liquida',
  'Jarabe', 'Adicionales - dulces', 'MP indirecta',
  'Energizante', 'Vasos', 'Insumo secreto', 'Otros'
];

const EMPTY_FORM = {
  nombre: '', producto_base: '', formato: 'Pza', categoria: 'Otros',
  cantidad_actual: 0, cantidad_minima: 0, unidad: 'Pzas',
  precio_unitario: 0, piezas_por_unidad: 1, proveedor: '', notas: '',
  insumo_id: null
};

const EMPTY_INSUMO = {
  tipo_insumo: 'Alcohol', marca: '', presentacion: '', precio_promedio: '', ml_gr_pieza: ''
};

const PANEL = { NONE: null, FORM: 'form', COMPRA: 'compra', QUICK_STOCK: 'quick_stock' };

const TIPOS = [
  'Adicionales - dulces', 'Alcohol', 'Cerveza', 'Energizante',
  'Insumo secreto', 'Jarabe', 'MP indirecta', 'Otros',
  'Polvo para escarchar', 'Pulpa liquida', 'Pulpa para escarchar',
  'Refresco', 'Salsas', 'Vasos'
];

const fmt = (n) => Number(n).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const InventoryPage = () => {
  const [activeTab, setActiveTab]             = useState('stock'); // 'stock', 'compra', 'historial'
  const [items, setItems]                   = useState([]);
  const [loading, setLoading]               = useState(true);
  const [searchTerm, setSearchTerm]         = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Todas');
  const [panel, setPanel]                   = useState(PANEL.NONE);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [editingItem, setEditingItem]       = useState(null);
  const [formData, setFormData]             = useState(EMPTY_FORM);
  const [expandedProducts, setExpandedProducts] = useState({});

  // Ajuste manual de stock
  const [adjustingItem, setAdjustingItem]     = useState(null);
  const [adjustQty, setAdjustQty]             = useState(1);

  // Búsqueda de insumo en panel de stock manual
  const [panelInsumoSearch, setPanelInsumoSearch] = useState('');
  const [panelInsumoSelected, setPanelInsumoSelected] = useState(null);

  // Registro de compra
  const [insumos, setInsumos]                 = useState([]);
  const [compras, setCompras]                 = useState([]);
  const [loadingCompras, setLoadingCompras]   = useState(false);
  const [compraSearch, setCompraSearch]       = useState('');
  const [selectedInsumo, setSelectedInsumo]   = useState(null);
  const [newInsumoModal, setNewInsumoModal]   = useState(false);
  const [savingNewInsumo, setSavingNewInsumo] = useState(false);
  const compraSearchRef = useRef(null);
  const quickSearchRef  = useRef(null);
  const [insumoForm, setInsumoForm]           = useState(EMPTY_INSUMO);
  const [compraForm, setCompraForm]           = useState({
    cantidad_comprada: '', precio_total_compra: '', lugar_compra: '',
    fecha_compra: new Date().toISOString().split('T')[0]
  });
  const [savingCompra, setSavingCompra]       = useState(false);

  // Quick stock (agregar stock existente sin compra)
  const [quickSearch, setQuickSearch]         = useState('');
  const [quickItem, setQuickItem]             = useState(null);
  const [quickQty, setQuickQty]               = useState('');

  useEffect(() => {
    fetchInventory();
    fetchCompras();
    fetchInsumos();
    const subscription = supabase
      .channel('inventory_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventario' }, () => fetchInventory())
      .subscribe();
    return () => supabase.removeChannel(subscription);
  }, []);

  const fetchInsumos = async () => {
    try {
      const { data, error } = await supabase.from('insumos').select('*').order('marca');
      if (error) throw error;
      setInsumos(data || []);
    } catch (e) {
      console.error('Error fetching insumos:', e);
    }
  };

  const fetchCompras = async () => {
    setLoadingCompras(true);
    try {
      const { data, error } = await supabase
        .from('compras')
        .select('*, insumos(marca, presentacion, tipo_insumo)')
        .order('fecha_compra', { ascending: false })
        .limit(20);
      if (error) throw error;
      setCompras(data || []);
    } catch (error) {
      toast.error('Error al cargar compras: ' + error.message);
    } finally {
      setLoadingCompras(false);
    }
  };

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('inventario').select('*')
        .order('producto_base', { ascending: true })
        .order('formato', { ascending: true });
      if (error) throw error;
      setItems(data || []);
    } catch (error) {
      toast.error('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const openPanel = (item = null) => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setPanelInsumoSearch('');
    setPanelInsumoSelected(null);
    if (item) {
      setEditingItem(item);
      setFormData({
        ...item,
        producto_base:    item.producto_base || item.nombre,
        formato:          item.formato || 'Pza',
        piezas_por_unidad: item.piezas_por_unidad || 1
      });
      // Pre-llenar insumo vinculado si existe
      if (item.insumo_id) {
        const linked = insumos.find(i => i.id === item.insumo_id);
        if (linked) { setPanelInsumoSelected(linked); setPanelInsumoSearch(`${linked.marca} — ${linked.presentacion}`); }
      }
    } else {
      setEditingItem(null);
      setFormData(EMPTY_FORM);
    }
    setPanel(PANEL.FORM);
  };

  const openCompra = () => {
    setCompraSearch('');
    setSelectedInsumo(null);
    setNewInsumoModal(false);
    setInsumoForm(EMPTY_INSUMO);
    setCompraForm({
      cantidad_comprada: '', precio_total_compra: '', lugar_compra: '',
      fecha_compra: new Date().toISOString().split('T')[0]
    });
    setPanel(PANEL.COMPRA);
  };

  const closePanel = () => setPanel(PANEL.NONE);

  const handleQuickStockSave = async (e) => {
    e.preventDefault();
    if (!quickItem) return toast.error('Selecciona un insumo');
    const qty = parseFloat(quickQty);
    if (isNaN(qty) || qty <= 0) return toast.error('Ingresa una cantidad válida');

    const loadingToast = toast.loading('Agregando stock...');
    try {
      const precio = quickItem.precio_promedio || 0;

      // Buscar si ya existe en inventario vinculado a este insumo
      const { data: existing } = await supabase
        .from('inventario').select('id, cantidad_actual')
        .eq('insumo_id', quickItem.id);

      if (existing && existing.length > 0) {
        const { error } = await supabase.from('inventario').update({
          cantidad_actual: parseFloat(existing[0].cantidad_actual) + qty,
          precio_unitario: precio,
        }).eq('id', existing[0].id);
        if (error) throw error;
      } else {
        // Crear nuevo registro en inventario
        const { error } = await supabase.from('inventario').insert([{
          insumo_id: quickItem.id,
          nombre: `${quickItem.marca} (${quickItem.presentacion})`,
          producto_base: quickItem.marca,
          formato: quickItem.presentacion,
          cantidad_actual: qty,
          cantidad_minima: 0,
          unidad: quickItem.presentacion,
          precio_unitario: precio,
          categoria: quickItem.tipo_insumo || 'Otros',
          proveedor: '', notas: '',
        }]);
        if (error) throw error;
      }

      toast.success('Stock actualizado', { id: loadingToast });
      closePanel();
      fetchInventory();
    } catch (err) {
      toast.error('Error: ' + err.message, { id: loadingToast });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const loadingToast = toast.loading('Guardando...');
    const precioFinal = (formData.precio_unitario === 0 || formData.precio_unitario === '')
      && panelInsumoSelected
      ? panelInsumoSelected.precio_promedio
      : formData.precio_unitario;
    const finalData = {
      ...formData,
      nombre: `${formData.producto_base} (${formData.formato})`,
      insumo_id: panelInsumoSelected?.id ?? formData.insumo_id ?? null,
      precio_unitario: precioFinal,
    };
    try {
      if (editingItem) {
        const { error } = await supabase.from('inventario').update(finalData).eq('id', editingItem.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('inventario').insert([finalData]);
        if (error) throw error;
      }
      toast.success('Insumo guardado correctamente', { id: loadingToast });
      closePanel();
      fetchInventory();
    } catch (error) {
      toast.error('Error: ' + error.message, { id: loadingToast });
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar este insumo?')) return;
    try {
      const { error } = await supabase.from('inventario').delete().eq('id', id);
      if (error) throw error;
      toast.success('Insumo eliminado');
      closePanel();
      fetchInventory();
    } catch (error) {
      toast.error('Error: ' + error.message);
    }
  };

  // ── Búsqueda de insumo en panel de stock manual ───────────────
  const panelInsumoResults = useMemo(() => {
    if (!panelInsumoSearch || panelInsumoSearch.length < 2 || panelInsumoSelected) return [];
    const q = panelInsumoSearch.toLowerCase();
    return insumos.filter(i =>
      i.marca.toLowerCase().includes(q) ||
      i.tipo_insumo.toLowerCase().includes(q) ||
      i.presentacion.toLowerCase().includes(q)
    ).slice(0, 6);
  }, [panelInsumoSearch, panelInsumoSelected, insumos]);

  // ── Registrar Compra ─────────────────────────────────────────
  const searchResults = useMemo(() => {
    if (!compraSearch || compraSearch.length < 2) return [];
    const q = compraSearch.toLowerCase();
    return insumos.filter(i =>
      i.marca.toLowerCase().includes(q) ||
      i.tipo_insumo.toLowerCase().includes(q) ||
      i.presentacion.toLowerCase().includes(q)
    ).slice(0, 8);
  }, [compraSearch, insumos]);

  const handleSaveNewInsumo = async (e) => {
    e.preventDefault();
    setSavingNewInsumo(true);
    try {
      const payload = {
        tipo_insumo:  insumoForm.tipo_insumo,
        marca:        insumoForm.marca.trim(),
        presentacion: insumoForm.presentacion.trim(),
        ml_gr_pieza:  parseFloat(insumoForm.ml_gr_pieza) || null,
        precio_promedio: parseFloat(insumoForm.precio_promedio) || 0,
        total_unidades_compradas: 0,
      };
      const { data, error } = await supabase.from('insumos').insert([payload]).select().single();
      if (error) throw error;
      await fetchInsumos();
      setSelectedInsumo(data);
      setCompraSearch(`${data.marca} — ${data.presentacion}`);
      setNewInsumoModal(false);
      setInsumoForm(EMPTY_INSUMO);
      toast.success('Insumo creado y seleccionado');
    } catch (err) {
      toast.error('Error: ' + err.message);
    } finally {
      setSavingNewInsumo(false);
    }
  };

  const handleSaveCompra = async (e) => {
    e.preventDefault();
    setSavingCompra(true);
    const loadingToast = toast.loading('Registrando compra y actualizando inventario...');
    try {
      const insumoId = selectedInsumo?.id;
      const targetInsumo = selectedInsumo;

      if (!insumoId) throw new Error('Selecciona un producto del catálogo');

      // 1. Insertar en tabla compras
      const { error: compError } = await supabase.from('compras').insert([{
        insumo_id:           insumoId,
        fecha_compra:        compraForm.fecha_compra,
        cantidad_comprada:   parseFloat(compraForm.cantidad_comprada),
        precio_total_compra: parseFloat(compraForm.precio_total_compra),
        lugar_compra:        compraForm.lugar_compra.trim() || null,
      }]);
      if (compError) throw compError;

      // 2. Actualizar Insumo (precio promedio, total unidades, precio x ml)
      if (targetInsumo) {
        const oldTotal = parseFloat(targetInsumo.total_unidades_compradas || 0);
        const newQty   = parseFloat(compraForm.cantidad_comprada);
        const oldPrice = parseFloat(targetInsumo.precio_promedio || 0);
        const newTotalPay = parseFloat(compraForm.precio_total_compra);
        
        const newTotalUnits = oldTotal + newQty;
        const newAvgPrice   = ((oldPrice * oldTotal) + newTotalPay) / newTotalUnits;
        const precioXMl     = newTotalPay / (newQty * (parseFloat(targetInsumo.ml_gr_pieza) || 1));

        await supabase.from('insumos').update({
          precio_promedio: newAvgPrice,
          total_unidades_compradas: newTotalUnits,
          precio_x_ml: precioXMl
        }).eq('id', insumoId);
      }

      // 3. Actualizar o crear registro en inventario
      const { data: invItems } = await supabase
        .from('inventario')
        .select('id, cantidad_actual, insumo_id, producto_base')
        .eq('insumo_id', insumoId);

      if (invItems && invItems.length > 0) {
        // Ya existe — actualizar cantidad
        const invItem = invItems[0];
        const { error: invError } = await supabase.from('inventario').update({
          cantidad_actual: parseFloat(invItem.cantidad_actual || 0) + parseFloat(compraForm.cantidad_comprada)
        }).eq('id', invItem.id);
        if (invError) throw invError;
      } else {
        // No existe — crear nuevo registro en inventario con insumo_id vinculado
        const { error: createError } = await supabase
          .from('inventario')
          .insert([{
            insumo_id: insumoId,
            nombre: targetInsumo?.marca || targetInsumo?.tipo_insumo || 'Sin nombre',
            producto_base: targetInsumo?.marca || targetInsumo?.tipo_insumo || 'Sin nombre',
            cantidad_actual: parseFloat(compraForm.cantidad_comprada),
            cantidad_minima: 0,
            unidad: targetInsumo?.presentacion || 'ML',
            precio_unitario: parseFloat(compraForm.precio_total_compra) / parseFloat(compraForm.cantidad_comprada),
            categoria: targetInsumo?.tipo_insumo || 'Otros',
            proveedor: '',
            notas: 'Creado automáticamente al registrar compra'
          }])
          .select();

        if (createError) {
          console.error('Error creando inventario:', createError);
          toast.error('Error al crear stock: ' + createError.message, { id: loadingToast });
          setSavingCompra(false);
          return;
        }
      }

      toast.success('Compra y Stock actualizados correctamente', { id: loadingToast });
      setActiveTab('stock');
      fetchCompras();
      fetchInsumos();
      fetchInventory();
    } catch (e) {
      toast.error('Error: ' + e.message, { id: loadingToast });
    } finally {
      setSavingCompra(false);
    }
  };

  const handleManualAdjust = async (item, type) => {
    const qty = parseFloat(adjustQty);
    if (isNaN(qty) || qty <= 0) return;

    const loadingToast = toast.loading('Ajustando stock...');
    try {
      const newQty = type === 'add' ? (item.cantidad_actual + qty) : (item.cantidad_actual - qty);
      const { error } = await supabase.from('inventario').update({ cantidad_actual: Math.max(0, newQty) }).eq('id', item.id);
      if (error) throw error;
      toast.success('Stock ajustado', { id: loadingToast });
      setAdjustingItem(null);
      setAdjustQty(1);
      fetchInventory();
    } catch (e) {
      toast.error('Error: ' + e.message, { id: loadingToast });
    }
  };

  const toggleProduct = (baseName) => {
    setExpandedProducts(prev => ({ ...prev, [baseName]: !prev[baseName] }));
  };

  const baseProductNames = Array.from(new Set(items.map(i => i.producto_base || i.nombre))).sort();

  const handleBaseNameChange = (val) => {
    const existing = items.find(i => (i.producto_base || i.nombre) === val);
    if (existing) {
      setFormData(prev => ({
        ...prev, producto_base: val,
        categoria: existing.categoria,
        proveedor: existing.proveedor || prev.proveedor,
        unidad: existing.unidad || prev.unidad
      }));
    } else {
      setFormData(prev => ({ ...prev, producto_base: val }));
    }
  };

  const filteredItems = items.filter(item => {
    const searchString = `${item.producto_base} ${item.formato} ${item.nombre} ${item.proveedor}`.toLowerCase();
    return searchString.includes(searchTerm.toLowerCase()) &&
      (categoryFilter === 'Todas' || item.categoria === categoryFilter);
  });

  const groupedProducts = filteredItems.reduce((acc, item) => {
    const base = item.producto_base || item.nombre;
    if (!acc[base]) acc[base] = { name: base, category: item.categoria, totalStock: 0, unit: item.unidad, presentations: [], hasAlert: false };
    acc[base].presentations.push(item);
    acc[base].totalStock += Number(item.cantidad_actual);
    if (item.cantidad_actual <= item.cantidad_minima) acc[base].hasAlert = true;
    return acc;
  }, {});

  const productList = Object.values(groupedProducts);

  const handleDownloadLayout = () => {
    const headers = ['producto_base','formato','categoria','unidad','cantidad_actual','cantidad_minima','precio_unitario','piezas_por_unidad','proveedor','notas'];
    const sampleRow = ['Cerveza Corona','355ml','Cerveza','Pzas','10','5','300.50','6','Modelo','Notas opcionales'];
    const csvContent = Papa.unparse([headers, sampleRow]);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.setAttribute('href', URL.createObjectURL(blob));
    link.setAttribute('download', 'layout_inventario_groseras.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const loadingToast = toast.loading('Procesando archivo...');
    Papa.parse(file, {
      header: true, skipEmptyLines: true,
      complete: async (results) => {
        try {
          const transformedData = results.data.map(row => {
            const base = row.producto_base || row.nombre || '';
            const fmt  = row.formato || 'Pza';
            return {
              producto_base: base, formato: fmt, nombre: `${base} (${fmt})`,
              categoria: row.categoria || 'Otros', unidad: row.unidad || 'Pzas',
              cantidad_actual: Number(row.cantidad_actual) || 0,
              cantidad_minima: Number(row.cantidad_minima) || 0,
              precio_unitario: Number(row.precio_unitario) || 0,
              piezas_por_unidad: Number(row.piezas_por_unidad) || 1,
              proveedor: row.proveedor || '', notas: row.notas || ''
            };
          });
          if (transformedData.length === 0) throw new Error('El archivo está vacío');
          const { error } = await supabase.from('inventario').upsert(transformedData, { onConflict: 'nombre' });
          if (error) throw error;
          toast.success(`Se cargaron ${transformedData.length} insumos correctamente`, { id: loadingToast });
          setIsBulkModalOpen(false);
          fetchInventory();
        } catch (error) {
          toast.error('Error al procesar CSV: ' + error.message, { id: loadingToast });
        }
      }
    });
  };

  const lowStockCount = items.filter(i => i.cantidad_actual <= i.cantidad_minima).length;
  const totalValue    = items.reduce((acc, curr) => acc + (curr.cantidad_actual * curr.precio_unitario), 0);

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center bg-slate-900/40 p-6 rounded-3xl border border-white/5 backdrop-blur-md gap-6">
        <div>
          <h1 className="lobster text-[27px] sm:text-[33px] text-white flex items-center gap-3">
            <Layers className="text-brand-red animate-pulse shrink-0" size={32} />
            Inventario & Costos
          </h1>
          <p className="text-slate-500 text-[15px] font-bold tracking-[0.2em] mt-1">Gestión de stock</p>
        </div>
        <div className="flex flex-wrap gap-4 w-full lg:w-auto">
          <button className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl text-slate-400 transition-all" onClick={() => { fetchInventory(); fetchCompras(); }}>
            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => { window.scrollTo({ top: 0, behavior: 'smooth' }); setQuickSearch(''); setQuickItem(null); setQuickQty(''); setPanel(PANEL.QUICK_STOCK); }}
            className={`btn-secondary shadow-xl shadow-brand-teal/10 px-6 py-3 flex-1 sm:flex-none justify-center ${panel === PANEL.QUICK_STOCK ? 'ring-2 ring-brand-teal/50' : ''}`}
          >
            <Plus size={20} />
            <span className="font-black">Agregar Stock</span>
          </button>
          <button
            className="flex items-center justify-center gap-2 px-6 py-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl hover:bg-emerald-500/20 transition-all font-black shadow-xl shadow-emerald-500/10 flex-1 sm:flex-none text-[15px]"
            onClick={() => setIsBulkModalOpen(true)}
          >
            <Download size={18} className="rotate-180" />
            CARGA MASIVA
          </button>
        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {[
          { label: 'Variedad de Insumos',        value: items.length,          icon: Package,       color: 'text-blue-400',    bg: 'bg-blue-500/10' },
          { label: 'Alerta de Reabastecimiento', value: lowStockCount,          icon: AlertTriangle, color: 'text-brand-red',   bg: 'bg-brand-red/10 animate-pulse' },
          { label: 'Valorización Total',         value: `$${totalValue.toLocaleString()}`, icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
        ].map((stat, i) => (
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
            key={stat.label} className="glass p-6 relative overflow-hidden group"
          >
            <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full opacity-10 group-hover:opacity-20 transition-opacity ${stat.bg}`} />
            <div className="flex justify-between items-start relative z-10">
              <div>
                <p className="text-[13px] font-black text-slate-500 tracking-widest">{stat.label}</p>
                <h3 className={`text-[33px] font-black mt-2 tracking-tighter ${stat.color}`}>{stat.value}</h3>
              </div>
              <div className={`p-4 rounded-2xl ${stat.bg} ${stat.color}`}>
                <stat.icon size={24} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* TABS SELECTOR */}
      <div className="flex gap-2 p-1 bg-slate-900/40 rounded-2xl border border-white/5 backdrop-blur-md">
        {[
          { id: 'stock', label: 'Stock Actual', icon: Package },
          { id: 'compra', label: 'Registrar Compra', icon: ShoppingCart },
          { id: 'historial', label: 'Historial', icon: Calendar }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); setPanel(PANEL.NONE); if (tab.id === 'compra') openCompra(); }}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-black tracking-widest transition-all
              ${activeTab === tab.id ? 'bg-brand-red text-white shadow-lg shadow-brand-red/20' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'}`}
          >
            <tab.icon size={18} />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {activeTab === 'stock' && (
        <div className="space-y-6">
          {/* FILTROS */}
          <div className="glass p-4 flex flex-col md:flex-row gap-4 items-center justify-between border-white/5">
            <div className="relative w-full lg:w-96 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-brand-red transition-colors" size={18} />
              <input
                type="text" placeholder="Buscar por nombre o proveedor..."
                className="input-field pl-12 bg-white/5 focus:bg-white/10"
                value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl px-4 py-2">
              <Filter size={16} className="text-brand-red" />
              <select
                className="bg-transparent focus:outline-none text-white text-[15px] font-bold tracking-widest cursor-pointer"
                value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}
              >
                {categories.map(c => <option key={c} value={c} className="bg-slate-900">{c}</option>)}
              </select>
            </div>
          </div>

          <div className="flex gap-5 items-start">
            {/* TABLA */}
            <div className="flex-1 min-w-0 glass overflow-hidden shadow-2xl border-white/5">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-white/[0.02] border-b border-white/5">
                    <tr>
                      <th className="px-6 py-5 text-[13px] font-black tracking-widest text-slate-500">Insumo & Presentación</th>
                      {panel === PANEL.NONE && <th className="px-6 py-5 text-[13px] font-black tracking-widest text-slate-500">Categoría</th>}
                      <th className="px-6 py-5 text-[13px] font-black tracking-widest text-slate-500">Stock</th>
                      {panel === PANEL.NONE && <th className="px-6 py-5 text-[13px] font-black tracking-widest text-slate-500 text-center">Pzas/U</th>}
                      <th className="px-6 py-5 text-[13px] font-black tracking-widest text-slate-500 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.03]">
                    {productList.map((product) => (
                      <React.Fragment key={product.name}>
                        <motion.tr
                          className="hover:bg-white/[0.04] transition-colors group cursor-pointer border-l-4 border-transparent hover:border-brand-red"
                          onClick={() => toggleProduct(product.name)}
                        >
                          <td className="px-6 py-5">
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-lg bg-white/5 transition-transform duration-300 ${expandedProducts[product.name] ? 'rotate-90' : ''}`}>
                                <Plus size={13} className={expandedProducts[product.name] ? 'hidden' : 'block'} />
                                <div className={expandedProducts[product.name] ? 'block' : 'hidden'} style={{width: 13, height: 2, background: 'currentColor'}} />
                              </div>
                              <div>
                                <div className="font-black text-white text-base tracking-tight group-hover:text-brand-red transition-colors">{product.name}</div>
                                <div className="text-[12px] text-slate-500 font-bold">{product.presentations.length} presentaciones</div>
                              </div>
                            </div>
                          </td>
                          {panel === PANEL.NONE && (
                            <td className="px-6 py-5">
                              <span className="px-3 py-1.5 rounded-lg bg-white/5 text-[12px] font-black tracking-widest text-slate-400 border border-white/5">
                                {product.category}
                              </span>
                            </td>
                          )}
                          <td className="px-6 py-5">
                            <div className={`text-base font-black tracking-tighter ${product.hasAlert ? 'text-brand-red flex items-center gap-1.5' : 'text-emerald-400'}`}>
                              {product.totalStock} <span className="opacity-50 lowercase">{product.unit}</span>
                              {product.hasAlert && <AlertTriangle size={13} className="animate-bounce" />}
                            </div>
                          </td>
                          {panel === PANEL.NONE && <td className="px-6 py-5 text-center text-slate-500">—</td>}
                          <td className="px-6 py-5 text-right">
                            <div className="text-slate-600 group-hover:text-brand-red transition-colors font-black text-[12px] tracking-widest">
                              {expandedProducts[product.name] ? 'Cerrar' : 'Ver'}
                            </div>
                          </td>
                        </motion.tr>

                        <AnimatePresence>
                          {expandedProducts[product.name] && product.presentations.map((item) => {
                            return (
                              <motion.tr
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                key={item.id}
                                className={`bg-white/[0.01] hover:bg-white/[0.03] transition-colors group/row border-l-4 border-brand-red/30 ${editingItem?.id === item.id ? 'bg-brand-red/5' : ''}`}
                              >
                                <td className="px-6 py-4 pl-16">
                                  <div className="flex items-center gap-2">
                                    <div className="font-bold text-slate-200 text-base">{item.formato || 'Estándar'}</div>
                                    {!item.insumo_id && (
                                      <span className="text-[9px] bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded uppercase font-black">Sin Vincular</span>
                                    )}
                                  </div>
                                  <div className="text-[11px] text-slate-500 font-bold">{item.proveedor || 'S/N'}</div>
                                </td>
                                {panel === PANEL.NONE && <td className="px-6 py-4" />}
                                <td className="px-6 py-4">
                                  <div className={`text-base font-black tracking-tighter ${item.cantidad_actual <= item.cantidad_minima ? 'text-brand-red' : 'text-slate-300'}`}>
                                    {item.cantidad_actual} <span className="opacity-40">{item.unidad}</span>
                                  </div>
                                </td>
                                {panel === PANEL.NONE && (
                                  <td className="px-6 py-4 text-center">
                                    <div className="bg-white/5 py-1 px-2 rounded-lg inline-block border border-white/5 text-[13px] font-black text-slate-400">
                                      x {item.piezas_por_unidad || 1}
                                    </div>
                                  </td>
                                )}
                                <td className="px-6 py-4 text-right">
                                  <div className="flex justify-end gap-1">
                                    <button onClick={(e) => { e.stopPropagation(); setQuickItem(item); setQuickSearch(`${item.producto_base} (${item.formato})`); setQuickQty(''); setPanel(PANEL.QUICK_STOCK); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                                      title="Agregar stock existente"
                                      className="p-2 hover:bg-brand-teal/10 rounded-lg text-brand-teal/60 hover:text-brand-teal">
                                      <Plus size={13} />
                                    </button>
                                    <button onClick={(e) => { e.stopPropagation(); setAdjustingItem(item); }}
                                      title="Ajustar stock"
                                      className="p-2 hover:bg-brand-yellow/10 rounded-lg text-brand-yellow/60 hover:text-brand-yellow">
                                      <RefreshCw size={13} />
                                    </button>
                                    <button onClick={(e) => { e.stopPropagation(); openPanel(item); }}
                                      className="p-2 hover:bg-emerald-500/10 rounded-lg text-emerald-400/60 hover:text-emerald-400">
                                      <Edit2 size={13} />
                                    </button>
                                    <button onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}
                                      className="p-2 hover:bg-brand-red/10 rounded-lg text-brand-red/60 hover:text-brand-red">
                                      <Trash2 size={13} />
                                    </button>
                                  </div>
                                </td>
                              </motion.tr>
                            );
                          })}
                        </AnimatePresence>
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* PANEL DERECHO EDITAR */}
            <AnimatePresence>
              {panel === PANEL.FORM && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                  className="w-96 glass border-white/5 p-6 shrink-0 sticky top-6 max-h-[calc(100vh-6rem)] overflow-y-auto custom-scrollbar"
                >
                  <button onClick={closePanel} className="absolute right-4 top-4 text-slate-500 hover:text-white"><X size={18}/></button>
                  <h2 className="text-xl font-black text-white tracking-tighter mb-4 flex items-center gap-2">
                    {editingItem ? <Edit2 size={18} className="text-emerald-400" /> : <Plus size={18} className="text-brand-red" />}
                    {editingItem ? 'Editar Insumo' : 'Nuevo Insumo'}
                  </h2>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Vincular a catálogo de insumos */}
                    <div>
                      <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-1">Vincular a Insumo del Catálogo</label>
                      {panelInsumoSelected ? (
                        <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-brand-teal/10 border border-brand-teal/20">
                          <div>
                            <p className="text-sm font-black text-white">{panelInsumoSelected.marca}</p>
                            <p className="text-[10px] text-slate-500 font-bold">{panelInsumoSelected.tipo_insumo} · {panelInsumoSelected.presentacion} · ${fmt(panelInsumoSelected.precio_promedio)}</p>
                          </div>
                          <button type="button" onClick={() => { setPanelInsumoSelected(null); setPanelInsumoSearch(''); setFormData(p => ({ ...p, insumo_id: null })); }}
                            className="text-slate-500 hover:text-white"><X size={14}/></button>
                        </div>
                      ) : (
                        <div className="relative">
                          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                          <input type="text" placeholder="Buscar en catálogo (opcional)..."
                            className="input-field text-sm pl-9"
                            value={panelInsumoSearch}
                            onChange={e => setPanelInsumoSearch(e.target.value)} />
                          {panelInsumoResults.length > 0 && (
                            <div className="absolute z-10 top-full mt-1 w-full rounded-xl border border-white/10 bg-slate-900/95 overflow-hidden shadow-2xl">
                              {panelInsumoResults.map(i => (
                                <button key={i.id} type="button"
                                  onClick={() => { setPanelInsumoSelected(i); setPanelInsumoSearch(`${i.marca} — ${i.presentacion}`); setFormData(p => ({ ...p, insumo_id: i.id, categoria: i.tipo_insumo, precio_unitario: p.precio_unitario || i.precio_promedio })); }}
                                  className="w-full flex justify-between items-center px-3 py-2 hover:bg-white/5 text-left border-b border-white/5 last:border-0">
                                  <div>
                                    <p className="text-sm font-bold text-slate-200">{i.marca}</p>
                                    <p className="text-[10px] text-slate-500">{i.tipo_insumo} · {i.presentacion}</p>
                                  </div>
                                  <span className="text-xs font-black text-emerald-400">${fmt(i.precio_promedio)}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                      <p className="text-[10px] text-slate-600 mt-1">Si vinculas un insumo y no pones precio, se usará el precio promedio del catálogo.</p>
                    </div>

                    <div>
                      <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-1">Producto Base</label>
                      <input required type="text" list="base-product-list" className="input-field text-sm"
                        value={formData.producto_base} onChange={(e) => handleBaseNameChange(e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-1">Formato</label>
                      <input required type="text" className="input-field text-sm"
                        value={formData.formato} onChange={(e) => setFormData({...formData, formato: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-1">Stock Actual</label>
                        <input type="number" className="input-field text-sm font-black text-brand-teal"
                          value={formData.cantidad_actual} onChange={(e) => setFormData({...formData, cantidad_actual: Number(e.target.value)})} />
                      </div>
                      <div>
                        <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-1">Min. Requerido</label>
                        <input type="number" className="input-field text-sm font-bold text-brand-red"
                          value={formData.cantidad_minima} onChange={(e) => setFormData({...formData, cantidad_minima: Number(e.target.value)})} />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-1">
                        Precio Unitario ($) {panelInsumoSelected && !formData.precio_unitario ? <span className="text-brand-teal normal-case">— se usará precio promedio</span> : ''}
                      </label>
                      <input type="number" step="0.01" min="0" placeholder={panelInsumoSelected ? `$${fmt(panelInsumoSelected.precio_promedio)} (promedio)` : '0.00'}
                        className="input-field text-sm"
                        value={formData.precio_unitario || ''}
                        onChange={(e) => setFormData({...formData, precio_unitario: Number(e.target.value)})} />
                    </div>
                    <div className="pt-4">
                      <button type="submit" className="btn-primary w-full py-3 font-black">
                        <Save size={16} /> GUARDAR CAMBIOS
                      </button>
                    </div>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>

            {/* PANEL AGREGAR STOCK EXISTENTE */}
            <AnimatePresence>
              {panel === PANEL.QUICK_STOCK && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                  className="w-96 glass border-white/5 p-6 shrink-0 sticky top-6 max-h-[calc(100vh-6rem)] overflow-y-auto custom-scrollbar"
                >
                  <button onClick={closePanel} className="absolute right-4 top-4 text-slate-500 hover:text-white"><X size={18}/></button>
                  <h2 className="text-xl font-black text-white tracking-tighter mb-1 flex items-center gap-2">
                    <Plus size={18} className="text-brand-teal" />
                    Agregar Stock Existente
                  </h2>
                  <p className="text-[11px] text-slate-500 font-bold mb-5">Sin registrar compra. Usa el precio promedio actual del insumo.</p>

                  <form onSubmit={handleQuickStockSave} className="space-y-4">
                    <div>
                      <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2">Insumo</label>
                      {quickItem ? (
                        <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-brand-teal/10 border border-brand-teal/20">
                          <div>
                            <p className="text-sm font-black text-white">{quickItem.marca}</p>
                            <p className="text-[10px] text-slate-500 font-bold">{quickItem.tipo_insumo} · {quickItem.presentacion}</p>
                          </div>
                          <button type="button" onClick={() => { setQuickItem(null); setQuickSearch(''); }}
                            className="text-slate-500 hover:text-white p-1"><X size={14}/></button>
                        </div>
                      ) : (
                        <div className="relative" ref={quickSearchRef}>
                          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                          <input
                            autoFocus
                            type="text" placeholder="Buscar insumo..."
                            className="input-field pl-9 text-sm"
                            value={quickSearch}
                            onChange={e => setQuickSearch(e.target.value)}
                          />
                          {quickSearch.length >= 2 && quickSearchRef.current && createPortal(
                            <div style={{
                              position: 'fixed',
                              top: quickSearchRef.current.getBoundingClientRect().bottom + 4,
                              left: quickSearchRef.current.getBoundingClientRect().left,
                              width: quickSearchRef.current.getBoundingClientRect().width,
                              zIndex: 9999,
                            }} className="rounded-xl border border-white/10 overflow-hidden bg-slate-900 shadow-2xl">
                              {insumos.filter(i => {
                                const q = quickSearch.toLowerCase();
                                return `${i.marca} ${i.tipo_insumo} ${i.presentacion}`.toLowerCase().includes(q);
                              }).slice(0, 7).map(i => (
                                <button key={i.id} type="button"
                                  onClick={() => { setQuickItem(i); setQuickSearch(`${i.marca} — ${i.presentacion}`); }}
                                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors text-left border-b border-white/5"
                                >
                                  <div>
                                    <p className="text-sm font-bold text-slate-200">{i.marca}</p>
                                    <p className="text-[10px] text-slate-500 font-bold">{i.tipo_insumo} · {i.presentacion}</p>
                                  </div>
                                  <span className="text-xs font-black text-emerald-400">${fmt(i.precio_promedio)}</span>
                                </button>
                              ))}
                              {insumos.filter(i => `${i.marca} ${i.tipo_insumo} ${i.presentacion}`.toLowerCase().includes(quickSearch.toLowerCase())).length === 0 && (
                                <p className="px-4 py-3 text-xs text-slate-500 italic">Sin resultados</p>
                              )}
                              <button type="button"
                                onClick={() => { setInsumoForm(EMPTY_INSUMO); setNewInsumoModal(true); }}
                                className="w-full flex items-center gap-2 px-4 py-3 hover:bg-brand-yellow/5 transition-colors text-left text-brand-yellow font-black text-xs border-t border-white/5"
                              >
                                <Plus size={13} className="stroke-[3px]" /> Agregar nuevo insumo
                              </button>
                            </div>,
                            document.body
                          )}
                        </div>
                      )}
                    </div>

                    {quickItem && (
                      <div className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 flex justify-between items-center">
                        <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Precio promedio</span>
                        <span className="text-base font-black text-emerald-400">${fmt(quickItem.precio_promedio)}</span>
                      </div>
                    )}

                    {/* Cantidad */}
                    <div>
                      <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2">Cantidad a agregar</label>
                      <input
                        required type="number" step="0.01" min="0.01"
                        className="input-field font-black text-brand-teal text-lg"
                        placeholder="0"
                        value={quickQty}
                        onChange={e => setQuickQty(e.target.value)}
                      />
                    </div>

                    <div className="pt-2">
                      <button type="submit" className="btn-primary w-full py-3 font-black">
                        <Save size={16} /> AGREGAR AL STOCK
                      </button>
                    </div>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}

      {activeTab === 'compra' && (
        <div className="max-w-3xl mx-auto">
          <div className="glass p-8 space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-black text-white tracking-tighter flex items-center gap-3">
                  <ShoppingCart size={24} className="text-brand-yellow" />
                  Registrar Nueva Compra
                </h2>
                <p className="text-slate-500 text-sm font-bold mt-1">El stock se actualizará automáticamente al guardar</p>
              </div>
            </div>

            <form onSubmit={handleSaveCompra} className="space-y-6">
              {/* Buscador de insumo */}
              <div>
                <label className="block text-xs font-black text-slate-500 tracking-widest uppercase mb-3">Producto</label>
                {selectedInsumo ? (
                  <div className="p-5 rounded-2xl bg-brand-teal/5 border border-brand-teal/20 flex justify-between items-center shadow-xl shadow-brand-teal/5">
                    <div>
                      <p className="text-lg font-black text-white">{selectedInsumo.marca}</p>
                      <p className="text-sm text-slate-500 font-bold uppercase tracking-widest">{selectedInsumo.tipo_insumo} · {selectedInsumo.presentacion}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-[10px] text-slate-500 font-black tracking-widest uppercase mb-1">Costo Promedio</p>
                        <p className="text-2xl font-black text-emerald-400">${fmt(selectedInsumo.precio_promedio)}</p>
                      </div>
                      <button type="button" onClick={() => { setSelectedInsumo(null); setCompraSearch(''); }}
                        className="p-1.5 text-slate-500 hover:text-white transition-colors">
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="relative" ref={compraSearchRef}>
                    <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      autoFocus
                      type="text" placeholder="Buscar por marca, tipo o presentación..."
                      className="input-field pl-12"
                      value={compraSearch}
                      onChange={e => setCompraSearch(e.target.value)}
                    />
                    {compraSearch.length >= 2 && compraSearchRef.current && createPortal(
                      <div style={{
                        position: 'fixed',
                        top: compraSearchRef.current.getBoundingClientRect().bottom + 4,
                        left: compraSearchRef.current.getBoundingClientRect().left,
                        width: compraSearchRef.current.getBoundingClientRect().width,
                        zIndex: 9999,
                      }} className="rounded-2xl border border-white/10 overflow-hidden bg-slate-900 shadow-2xl">
                        {searchResults.map(item => (
                          <button key={item.id} type="button"
                            onClick={() => { setSelectedInsumo(item); setCompraSearch(`${item.marca} — ${item.presentacion}`); }}
                            className="w-full flex items-center justify-between px-6 py-4 hover:bg-white/5 transition-colors text-left border-b border-white/5"
                          >
                            <div>
                              <p className="text-base font-bold text-slate-200">{item.marca}</p>
                              <p className="text-xs text-slate-500 font-bold">{item.tipo_insumo} · {item.presentacion}</p>
                            </div>
                            <span className="text-base font-black text-emerald-400">${fmt(item.precio_promedio)}</span>
                          </button>
                        ))}
                        {searchResults.length === 0 && (
                          <p className="px-6 py-3 text-sm text-slate-500 italic">Sin resultados para "{compraSearch}"</p>
                        )}
                        <button type="button"
                          onClick={() => { setInsumoForm(EMPTY_INSUMO); setNewInsumoModal(true); }}
                          className="w-full flex items-center gap-3 px-6 py-4 hover:bg-brand-yellow/5 transition-colors text-left text-brand-yellow font-black text-sm border-t border-white/5"
                        >
                          <Plus size={16} className="stroke-[3px]" /> Agregar nuevo insumo
                        </button>
                      </div>,
                      document.body
                    )}
                  </div>
                )}
              </div>

              {/* Datos de la compra */}
              {selectedInsumo && (
                <div className="space-y-6 p-6 rounded-2xl bg-brand-yellow/5 border border-brand-yellow/20">
                  <h3 className="text-xs font-black text-brand-yellow tracking-[0.2em] uppercase">Datos de la Transacción</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-black text-slate-500 tracking-widest mb-2 uppercase">Fecha</label>
                      <input type="date" required className="input-field"
                        value={compraForm.fecha_compra} onChange={e => setCompraForm(p => ({ ...p, fecha_compra: e.target.value }))} />
                    </div>
                    <div>
                      <label className="block text-[11px] font-black text-slate-500 tracking-widest mb-2 uppercase">Lugar de Compra</label>
                      <input type="text" list="lugares-compra-list" placeholder="Ej: Sam's Club, Costco..."
                        className="input-field"
                        value={compraForm.lugar_compra} onChange={e => setCompraForm(p => ({ ...p, lugar_compra: e.target.value }))} />
                      <datalist id="lugares-compra-list">
                        {Array.from(new Set(compras.map(c => c.lugar_compra).filter(Boolean))).map(l => <option key={l} value={l} />)}
                      </datalist>
                    </div>
                    <div>
                      <label className="block text-[11px] font-black text-slate-500 tracking-widest mb-2 uppercase">Cantidad</label>
                      <input required type="number" step="0.01" className="input-field font-black text-brand-teal"
                        value={compraForm.cantidad_comprada} onChange={e => setCompraForm(p => ({ ...p, cantidad_comprada: e.target.value }))} />
                    </div>
                    <div>
                      <label className="block text-[11px] font-black text-slate-500 tracking-widest mb-2 uppercase">Total Pagado ($)</label>
                      <input required type="number" step="0.01" className="input-field font-black text-emerald-400"
                        value={compraForm.precio_total_compra} onChange={e => setCompraForm(p => ({ ...p, precio_total_compra: e.target.value }))} />
                    </div>
                  </div>

                  <div className="pt-4 border-t border-brand-yellow/10 flex justify-between items-center">
                    <div className="text-sm font-bold text-slate-400">
                      Costo unitario de esta compra: <span className="text-white">${fmt(parseFloat(compraForm.precio_total_compra || 0) / parseFloat(compraForm.cantidad_comprada || 1))}</span>
                    </div>
                    <button type="submit" disabled={savingCompra} className="btn-primary px-10 py-4 font-black shadow-2xl shadow-brand-red/30">
                      {savingCompra ? 'PROCESANDO...' : 'GUARDAR Y ACTUALIZAR STOCK'}
                    </button>
                  </div>
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      {activeTab === 'historial' && (
        <div className="glass overflow-hidden shadow-2xl border-white/5">
          <div className="p-8 border-b border-white/5 flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-black text-white tracking-tighter flex items-center gap-3">
                <ShoppingCart size={24} className="text-brand-yellow" />
                Historial de Compras
              </h2>
              <p className="text-slate-500 text-sm font-bold mt-1">Registro cronológico de abastecimiento</p>
            </div>
            <button onClick={fetchCompras} className="p-3 bg-white/5 hover:bg-white/10 rounded-xl text-slate-400 transition-all">
              <RefreshCw size={20} className={loadingCompras ? 'animate-spin' : ''} />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-white/[0.02]">
                <tr>
                  <th className="px-8 py-5 text-[11px] font-black tracking-widest text-slate-500 uppercase">Fecha</th>
                  <th className="px-8 py-5 text-[11px] font-black tracking-widest text-slate-500 uppercase">Producto (Catálogo)</th>
                  <th className="px-8 py-5 text-[11px] font-black tracking-widest text-slate-500 uppercase">Tipo / Presentación</th>
                  <th className="px-8 py-5 text-[11px] font-black tracking-widest text-slate-500 uppercase">Lugar</th>
                  <th className="px-8 py-5 text-[11px] font-black tracking-widest text-slate-500 uppercase text-right">Cantidad</th>
                  <th className="px-8 py-5 text-[11px] font-black tracking-widest text-slate-500 uppercase text-right">Total</th>
                  <th className="px-8 py-5 text-[11px] font-black tracking-widest text-slate-500 uppercase text-right">Unitario</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03]">
                {loadingCompras ? (
                  <tr><td colSpan="7" className="px-8 py-20 text-center text-slate-500 animate-pulse font-bold">Cargando historial...</td></tr>
                ) : compras.length === 0 ? (
                  <tr><td colSpan="7" className="px-8 py-20 text-center text-slate-500 italic">No hay compras registradas</td></tr>
                ) : compras.map(compra => {
                  const uPrice = compra.precio_total_compra / compra.cantidad_comprada;
                  return (
                    <tr key={compra.id} className="hover:bg-white/[0.01] transition-colors group">
                      <td className="px-8 py-5 text-sm text-slate-400 font-bold">
                        {new Date(compra.fecha_compra).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-8 py-5">
                        <div className="font-black text-white tracking-tight">{compra.insumos?.marca}</div>
                      </td>
                      <td className="px-8 py-5 text-xs text-slate-500 font-bold uppercase tracking-tighter">
                        {compra.insumos?.tipo_insumo} · {compra.insumos?.presentacion}
                      </td>
                      <td className="px-8 py-5 text-xs text-slate-400 font-bold">
                        {compra.lugar_compra || <span className="text-slate-600 italic">—</span>}
                      </td>
                      <td className="px-8 py-5 text-base font-black text-emerald-400 text-right">
                        {compra.cantidad_comprada}
                      </td>
                      <td className="px-8 py-5 text-sm font-bold text-slate-300 text-right">
                        ${fmt(compra.precio_total_compra)}
                      </td>
                      <td className="px-8 py-5 text-xs font-black text-slate-500 text-right">
                        ${fmt(uPrice)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL NUEVO INSUMO */}
      <AnimatePresence>
        {newInsumoModal && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="glass p-8 max-w-lg w-full border-brand-yellow/20 relative">
              <button onClick={() => setNewInsumoModal(false)} className="absolute right-5 top-5 text-slate-500 hover:text-white"><X size={20}/></button>
              <h3 className="text-xl font-black text-white mb-1 flex items-center gap-2">
                <Plus size={18} className="text-brand-yellow" /> Nuevo Insumo
              </h3>
              <p className="text-[11px] text-slate-500 font-bold mb-6 tracking-widest">Se creará en el catálogo y quedará seleccionado para la compra</p>
              <form onSubmit={handleSaveNewInsumo} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-[11px] font-black text-slate-500 tracking-widest mb-2 uppercase">Tipo</label>
                    <select required className="input-field font-bold" value={insumoForm.tipo_insumo}
                      onChange={e => setInsumoForm(p => ({ ...p, tipo_insumo: e.target.value }))}>
                      {TIPOS.map(t => <option key={t} value={t} className="bg-slate-900">{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-black text-slate-500 tracking-widest mb-2 uppercase">Marca</label>
                    <input autoFocus required type="text" placeholder="Ej: Bacardi" className="input-field"
                      value={insumoForm.marca} onChange={e => setInsumoForm(p => ({ ...p, marca: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-[11px] font-black text-slate-500 tracking-widest mb-2 uppercase">Presentación</label>
                    <input required type="text" placeholder="Ej: 750 ml" className="input-field"
                      value={insumoForm.presentacion} onChange={e => setInsumoForm(p => ({ ...p, presentacion: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-[11px] font-black text-slate-500 tracking-widest mb-2 uppercase">ML / GR / Pieza</label>
                    <input required type="number" step="0.01" min="0.01" placeholder="750" className="input-field font-black"
                      value={insumoForm.ml_gr_pieza} onChange={e => setInsumoForm(p => ({ ...p, ml_gr_pieza: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-[11px] font-black text-slate-500 tracking-widest mb-2 uppercase">Precio promedio inicial ($)</label>
                    <input type="number" step="0.01" min="0" placeholder="0" className="input-field font-black"
                      value={insumoForm.precio_promedio} onChange={e => setInsumoForm(p => ({ ...p, precio_promedio: e.target.value }))} />
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setNewInsumoModal(false)} className="btn-secondary flex-1 py-3">Cancelar</button>
                  <button type="submit" disabled={savingNewInsumo} className="btn-primary flex-1 py-3 font-black">
                    {savingNewInsumo ? 'Creando...' : 'Crear y Seleccionar'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL AJUSTE RÁPIDO */}
      <AnimatePresence>
        {adjustingItem && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass p-8 max-w-sm w-full border-brand-yellow/20">
              <h3 className="text-xl font-black text-white mb-2">Ajustar Stock</h3>
              <p className="text-slate-500 text-sm mb-6">{adjustingItem.producto_base} ({adjustingItem.formato})</p>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Cantidad a ajustar</label>
                  <div className="flex items-center gap-4">
                    <button onClick={() => setAdjustQty(Math.max(1, adjustQty - 1))} className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-xl font-bold">-</button>
                    <input type="number" className="flex-1 bg-white/10 border-0 rounded-xl h-12 text-center text-2xl font-black text-brand-yellow"
                      value={adjustQty} onChange={e => setAdjustQty(Number(e.target.value))} />
                    <button onClick={() => setAdjustQty(adjustQty + 1)} className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-xl font-bold">+</button>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button onClick={() => handleManualAdjust(adjustingItem, 'remove')} className="flex-1 py-4 bg-brand-red/10 border border-brand-red/20 text-brand-red rounded-2xl font-black text-xs tracking-widest hover:bg-brand-red/20 transition-all">SALIDA (-)</button>
                  <button onClick={() => handleManualAdjust(adjustingItem, 'add')} className="flex-1 py-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl font-black text-xs tracking-widest hover:bg-emerald-500/20 transition-all">ENTRADA (+)</button>
                </div>
                
                <button onClick={() => setAdjustingItem(null)} className="w-full py-3 text-slate-500 font-bold text-sm">Cancelar</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isBulkModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="glass max-w-xl w-full p-10 relative overflow-hidden">
              <button onClick={() => setIsBulkModalOpen(false)} className="absolute right-6 top-6 text-slate-500 hover:text-white"><X size={28} /></button>
              <div className="mb-8 border-b border-white/5 pb-6">
                <h2 className="text-[33px] font-black text-white tracking-tighter flex items-center gap-3">
                  <Download size={28} className="text-emerald-400 rotate-180" />
                  Carga masiva CSV
                </h2>
              </div>
              <div className="space-y-6">
                <div className="border-2 border-dashed border-white/10 rounded-3xl p-12 flex flex-col items-center justify-center gap-4 hover:border-emerald-500/40 transition-colors bg-white/5 cursor-pointer relative group"
                  onClick={() => document.getElementById('bulk-file-input').click()}>
                  <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform"><Plus size={32} /></div>
                  <div className="text-center">
                    <p className="text-white font-black">Seleccionar archivo CSV</p>
                    <p className="text-slate-500 text-[13px] font-bold mt-1">Arrastra tu archivo aquí o haz clic</p>
                  </div>
                  <input id="bulk-file-input" type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
                </div>
                <button onClick={handleDownloadLayout} className="w-full flex items-center justify-center gap-2 p-4 bg-white/5 hover:bg-white/10 rounded-2xl text-slate-300 transition-all font-black text-[15px] border border-white/5">
                  <Download size={16} /> Descargar Layout
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <datalist id="base-product-list">
        {baseProductNames.map(name => <option key={name} value={name} />)}
      </datalist>
    </div>
  );
};

export default InventoryPage;
