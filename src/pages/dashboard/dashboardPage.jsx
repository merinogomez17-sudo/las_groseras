import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard, TrendingUp, Users, Package, Calendar,
  ArrowUpRight, Clock, AlertCircle, ArrowRight, CheckCircle,
  Save, X, ChevronLeft, ChevronRight, MapPin, Phone,
  User, FileText, DollarSign, ArrowLeft
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

const DashboardPage = () => {
  const [stats, setStats] = useState({
    leads: 0,
    customers: 0,
    inventoryAlerts: 0,
    quotesValue: 0,
    recentEvents: [],
    lowStockItems: []
  });
  const [loading, setLoading] = useState(true);
  const [restockItem, setRestockItem] = useState(null); // { id, nombre, cantidadToAdd }
  const [isRestocking, setIsRestocking] = useState(false);

  // Calendar States
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [selectedEventDetail, setSelectedEventDetail] = useState(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isUpdatingNotes, setIsUpdatingNotes] = useState(false);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    try {
      // 1. Fetch Basic Totals
      const [leadsRes, customersRes, quotesRes] = await Promise.all([
        supabase.from('leads').select('*', { count: 'exact', head: true }),
        supabase.from('clientes').select('*', { count: 'exact', head: true }),
        supabase.from('cotizaciones').select('total')
      ]);

      // 2. Fetch Recent Events (Strictly Finalizado as requested) with full details
      const { data: eventsData, error: eErr } = await supabase.from('eventos')
        .select(`
          *,
          clientes (nombre_completo, telefono),
          cotizaciones (
            numero_cotizacion, paquetes_incluidos, total, lead_id, 
            leads (nombre_contacto, fecha_tentativa)
          ),
          evento_productos (
            recetas_base (nombre)
          )
        `)
        .eq('estado', 'finalizado')
        .order('created_at', { ascending: false })
        .limit(5);

      if (eErr) console.error("Error fetching events:", eErr);

      // 3. Fetch Inventory for alerts
      const { data: invData } = await supabase.from('inventario').select('id, nombre, cantidad_actual, cantidad_minima, unidad');
      const lowStockItems = invData?.filter(i => i.cantidad_actual <= i.cantidad_minima) || [];

      const totalQuotesAmount = quotesRes.data?.reduce((acc, curr) => acc + (curr.total || 0), 0) || 0;

      setStats({
        leads: leadsRes.count || 0,
        customers: customersRes.count || 0,
        inventoryAlerts: lowStockItems.length,
        quotesValue: totalQuotesAmount,
        recentEvents: eventsData || [],
        lowStockItems: lowStockItems
      });

      // 4. Load Calendar
      await fetchCalendarEvents(currentDate);
    } catch (err) {
      console.error('Crash in fetchStats:', err);
      toast.error('Error al cargar datos del dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleRestock = async (id, currentQty, amount) => {
    if (!amount || amount <= 0) return;
    setIsRestocking(true);
    const loadingToast = toast.loading('Actualizando inventario...');

    try {
      const newQty = Number(currentQty) + Number(amount);
      const { error } = await supabase
        .from('inventario')
        .update({
          cantidad_actual: newQty,
          fecha_ultima_actualizacion: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;

      toast.success('Inventario actualizado', { id: loadingToast });
      setRestockItem(null);
      fetchStats();
    } catch (err) {
      toast.error('Error al actualizar: ' + err.message, { id: loadingToast });
    } finally {
      setIsRestocking(false);
    }
  };

  const fetchCalendarEvents = async (viewDate) => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();

    try {
      const { data } = await supabase
        .from('eventos')
        .select(`
          *,
          clientes (nombre_completo, telefono),
          cotizaciones (
            numero_cotizacion, paquetes_incluidos, total, lead_id, 
            leads (nombre_contacto, fecha_tentativa)
          ),
          evento_productos (
            recetas_base (nombre)
          )
        `)
        .eq('estado', 'finalizado');

      const filtered = data?.filter(e => {
        const dateStr = e.fecha_evento || e.cotizaciones?.leads?.fecha_tentativa;
        if (!dateStr) return false;

        const [yearStr, monthStr] = dateStr.split('-');
        const eventYear = parseInt(yearStr);
        const eventMonth = parseInt(monthStr) - 1;

        return eventMonth === month && eventYear === year;
      }) || [];

      setCalendarEvents(filtered);
    } catch (err) {
      console.error('Error fetching calendar events:', err);
    }
  };

  const updateEventNotes = async (id, notes) => {
    setIsUpdatingNotes(true);
    try {
      const { error } = await supabase
        .from('eventos')
        .update({ notas_logisticas: notes })
        .eq('id', id);

      if (error) throw error;
      toast.success('Notas actualizadas');
      fetchCalendarEvents(currentDate);
    } catch (err) {
      toast.error('Error al actualizar notas');
    } finally {
      setIsUpdatingNotes(false);
    }
  };

  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year, month) => {
    const day = new Date(year, month, 1).getDay();
    return day === 0 ? 6 : day - 1; // Ajustar para que Lunes sea 0
  };

  const prevMonth = () => {
    const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
    setCurrentDate(newDate);
    fetchCalendarEvents(newDate);
  };

  const nextMonth = () => {
    const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
    setCurrentDate(newDate);
    fetchCalendarEvents(newDate);
  };

  const openCalendar = () => {
    setIsCalendarOpen(true);
    fetchCalendarEvents(currentDate);
  };

  const statCards = [
    {
      label: 'Leads Totales', value: stats.leads, icon: Users,
      accent: '#40b3ac', bg: 'rgba(64,179,172,0.1)', border: 'rgba(64,179,172,0.2)'
    },
    {
      label: 'Clientes Registrados', value: stats.customers, icon: ArrowUpRight,
      accent: '#fecc30', bg: 'rgba(254,204,48,0.1)', border: 'rgba(254,204,48,0.2)'
    },
    {
      label: 'Valor en Cotizaciones', value: `$${stats.quotesValue.toLocaleString()}`, icon: TrendingUp,
      accent: '#40b3ac', bg: 'rgba(64,179,172,0.1)', border: 'rgba(64,179,172,0.2)'
    },
    {
      label: 'Alertas de Stock', value: stats.inventoryAlerts, icon: Package,
      accent: '#fecc30', bg: 'rgba(254,204,48,0.1)', border: 'rgba(254,204,48,0.2)'
    },
  ];

  if (loading) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-brand-teal border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="lg:h-[calc(100vh-120px)] flex flex-col space-y-6 overflow-hidden">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="lobster text-3xl flex items-center gap-3" style={{ color: 'rgb(var(--brand-cream))' }}>
            <LayoutDashboard style={{ color: '#fecc30' }} size={30} />
            Dashboard
          </h1>
          <p className="mt-1 font-sans text-base" style={{ color: 'rgb(var(--brand-cream) / 0.45)' }}>
            Resumen operativo de Las Groseras.
          </p>
        </div>
        <div className="text-xs flex items-center gap-2 px-3 py-1.5 rounded-full font-sans"
          style={{ background: 'rgb(var(--brand-cream) / 0.05)', border: '1px solid rgb(var(--brand-cream) / 0.08)', color: 'rgb(var(--brand-cream) / 0.35)' }}>
          <Clock size={12} />
          {new Date().toLocaleTimeString()}
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {statCards.map((item, i) => (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            key={i}
            className="relative overflow-hidden p-6 rounded-2xl group cursor-default"
            style={{
              background: 'rgb(var(--brand-cream) / 0.04)',
              border: `1px solid ${item.border}`,
              backdropFilter: 'blur(12px)',
              transition: 'all 0.3s',
            }}
            whileHover={{ scale: 1.02, background: 'rgb(var(--brand-cream) / 0.07)' }}
          >
            {/* Background glow */}
            <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full blur-2xl opacity-20 transition-opacity group-hover:opacity-40"
              style={{ background: item.accent }} />

            <div className="relative z-10">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                style={{ background: item.bg, color: item.accent }}>
                <item.icon size={20} />
              </div>
              <p className="text-sm font-semibold tracking-widest font-sans mb-1"
                style={{ color: 'rgb(var(--brand-cream) / 0.45)' }}>
                {item.label}
              </p>
              <h3 className="text-[34px] tracking-tight" style={{ color: 'rgb(var(--brand-cream))' }}>
                {item.value}
              </h3>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Bottom Row */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Upcoming Events */}
        <div className="lg:col-span-2 glass p-7 relative overflow-hidden flex flex-col h-full">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-brand-teal/50 to-transparent" />
          <div className="flex justify-between items-center mb-6">
            <h2 className="card-title">Eventos Proximos</h2>
            <button
              onClick={openCalendar}
              className="text-xs font-bold font-sans hover:underline" style={{ color: '#40b3ac' }}>
              Ver calendario
            </button>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
            {stats.recentEvents.length > 0 ? (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="pb-3 text-xs font-black tracking-widest uppercase text-slate-500 w-28">Fecha</th>
                    <th className="pb-3 text-xs font-black tracking-widest uppercase text-slate-500">Evento</th>
                    <th className="pb-3 text-xs font-black tracking-widest uppercase text-slate-500 text-right">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentEvents.map((event, idx) => {
                    const dateStr = event.fecha_evento || event.cotizaciones?.leads?.fecha_tentativa;
                    let formattedDate = 'S/N';
                    if (dateStr) {
                      const [y, m, d] = dateStr.split('-').map(Number);
                      const dObj = new Date(y, m - 1, d);
                      formattedDate = dObj.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
                    }
                    return (
                      <motion.tr
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        key={event.id}
                        onClick={() => { setSelectedEventDetail(event); setIsDetailsOpen(true); }}
                        className="border-b border-white/5 hover:bg-white/5 transition-colors group cursor-pointer"
                      >
                        <td className="py-3 pr-4 text-sm font-bold text-slate-400 whitespace-nowrap">{formattedDate}</td>
                        <td className="py-3 pr-4">
                          <span className="text-sm font-bold text-slate-200 group-hover:text-brand-teal transition-colors">{event.nombre_evento}</span>
                        </td>
                        <td className="py-3 text-right">
                          <span className="text-xs font-black px-3 py-1 rounded-full uppercase tracking-tighter bg-emerald-500/10 text-emerald-400">
                            {event.estado === 'finalizado' ? 'Confirmado' : event.estado}
                          </span>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 space-y-4" style={{ color: 'rgb(var(--brand-cream) / 0.2)' }}>
                <Calendar size={44} />
                <p className="text-base font-sans" style={{ color: 'rgb(var(--brand-cream) / 0.3)' }}>
                  No hay eventos confirmados registrados.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Stock Alert */}
        <div className="glass p-7 flex flex-col h-full relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-brand-yellow/50 to-transparent" />
          <div className="flex justify-between items-center mb-6">
            <h2 className="card-title" style={{ color: '#fecc30' }}>Stock Crítico</h2>
            <span className="text-sm font-black px-2 py-1 bg-brand-yellow/10 text-brand-yellow rounded-lg border border-brand-yellow/20">
              {stats.inventoryAlerts} Alertas
            </span>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-4">
            {stats.lowStockItems.length > 0 ? (
              stats.lowStockItems.map((item) => (
                <div key={item.id} className="p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-brand-yellow/20 transition-all">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="text-base font-black text-slate-200">{item.nombre}</h4>
                      <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">{item.unidad}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-black text-rose-500">{item.cantidad_actual} / {item.cantidad_minima}</div>
                      <div className="text-xs font-bold text-slate-600 uppercase">Estado Crítico</div>
                    </div>
                  </div>

                  {restockItem?.id === item.id ? (
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex gap-2 mt-3">
                      <input
                        autoFocus
                        type="number"
                        placeholder="Cant."
                        className="flex-1 bg-black/40 border border-brand-yellow/30 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-brand-yellow"
                        value={restockItem.amount}
                        onChange={(e) => setRestockItem({ ...restockItem, amount: e.target.value })}
                        onKeyPress={(e) => e.key === 'Enter' && handleRestock(item.id, item.cantidad_actual, restockItem.amount)}
                      />
                      <button
                        onClick={() => handleRestock(item.id, item.cantidad_actual, restockItem.amount)}
                        disabled={isRestocking}
                        className="p-2 bg-brand-yellow text-slate-900 rounded-xl hover:bg-brand-yellow/80 transition-colors"
                      >
                        <Save size={16} strokeWidth={3} />
                      </button>
                      <button
                        onClick={() => setRestockItem(null)}
                        className="p-2 bg-white/5 text-slate-400 rounded-xl hover:bg-white/10"
                      >
                        <X size={16} />
                      </button>
                    </motion.div>
                  ) : (
                    <button
                      onClick={() => setRestockItem({ id: item.id, amount: '' })}
                      className="w-full mt-2 py-2 border border-brand-yellow/20 rounded-xl text-sm font-black text-brand-yellow hover:bg-brand-yellow/10 transition-all uppercase tracking-widest flex items-center justify-center gap-2"
                    >
                      <Package size={14} /> Reabastecer Insumo
                    </button>
                  )}
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center opacity-30">
                <CheckCircle size={40} className="mb-4 text-brand-teal" />
                <p className="text-sm font-black uppercase tracking-widest text-slate-400">Todo el inventario está en orden</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* CALENDAR MODAL */}
      <AnimatePresence>
        {isCalendarOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-2xl">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="glass max-w-6xl w-full h-[90vh] overflow-hidden flex flex-col p-8 relative border-white/5"
            >
              {/* Header */}
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h2 className="text-3xl font-black text-white italic tracking-tighter flex items-center gap-4">
                    <Calendar className="text-brand-teal" size={32} />
                    Calendario de Eventos
                  </h2>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Planificación Mensual • Las Groseras</p>
                </div>

                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-4 bg-white/5 p-1 rounded-2xl border border-white/10">
                    <button onClick={prevMonth} className="p-2 hover:bg-white/10 rounded-xl text-white transition-all"><ChevronLeft size={20} /></button>
                    <span className="text-sm font-black text-white uppercase tracking-widest px-4 min-w-[150px] text-center">
                      {currentDate.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })}
                    </span>
                    <button onClick={nextMonth} className="p-2 hover:bg-white/10 rounded-xl text-white transition-all"><ChevronRight size={20} /></button>
                  </div>
                  <button onClick={() => setIsCalendarOpen(false)} className="p-3 bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 rounded-2xl transition-all">
                    <X size={24} />
                  </button>
                </div>
              </div>

              {/* Calendar Grid */}
              <div className="flex-1 grid grid-cols-7 grid-rows-6 gap-px bg-white/5 border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
                {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(day => (
                  <div key={day} className="bg-white/5 p-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center border-b border-white/5 flex items-center justify-center">
                    {day}
                  </div>
                ))}

                {Array.from({ length: 42 }).map((_, i) => {
                  const dayNum = i - getFirstDayOfMonth(currentDate.getFullYear(), currentDate.getMonth()) + 1;
                  const isCurrentMonth = dayNum > 0 && dayNum <= getDaysInMonth(currentDate.getFullYear(), currentDate.getMonth());
                  const tempDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), dayNum);
                  const isToday = isCurrentMonth && tempDate.toDateString() === new Date().toDateString();

                  const dayEvents = isCurrentMonth ? calendarEvents.filter(e => {
                    const dateStr = e.fecha_evento || e.cotizaciones?.leads?.fecha_tentativa;
                    if (!dateStr) return false;
                    const [y, m, d] = dateStr.split('-').map(Number);
                    return d === dayNum && (m - 1) === currentDate.getMonth() && y === currentDate.getFullYear();
                  }) : [];

                  return (
                    <div key={i} className={`p-2 bg-[#0a0a0a]/40 transition-colors flex flex-col ${!isCurrentMonth ? 'opacity-10' : 'hover:bg-white/5'}`}>
                      <div className="flex justify-between items-start mb-1">
                        <span className={`text-[10px] font-black p-1 w-6 h-6 rounded flex items-center justify-center ${isToday ? 'bg-brand-teal text-black' : 'text-slate-500'}`}>
                          {isCurrentMonth ? dayNum : ''}
                        </span>
                      </div>
                      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1">
                        {dayEvents.map(event => (
                          <div
                            key={event.id}
                            className="w-full text-left p-1 rounded text-[8px] font-black truncate border flex items-center gap-1 bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          >
                            <div className="w-1 h-1 rounded-full bg-current shrink-0" />
                            <span className="truncate">{event.nombre_evento}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* EVENT DETAIL POPUP */}
      <AnimatePresence>
        {isDetailsOpen && selectedEventDetail && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/95 backdrop-blur-3xl">
            <motion.div
              initial={{ scale: 0.9, y: 20, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ scale: 0.9, y: 20, opacity: 0 }}
              className="glass max-w-2xl w-full max-h-[90vh] overflow-y-auto p-8 relative border-t-8 border-brand-teal custom-scrollbar"
            >
              <button
                onClick={() => setIsDetailsOpen(false)}
                className="absolute right-6 top-6 p-2 bg-white/5 hover:bg-white/10 text-slate-400 rounded-xl transition-all"
              >
                <X size={20} />
              </button>

              <div className="mb-8">
                <span className="px-3 py-1 rounded text-[10px] font-black tracking-widest uppercase mb-3 inline-block bg-emerald-500/10 text-emerald-400">
                  {selectedEventDetail.estado}
                </span>
                <h3 className="text-4xl font-black text-white italic tracking-tighter">{selectedEventDetail.nombre_evento}</h3>
                <p className="text-slate-500 font-bold text-xs uppercase tracking-widest mt-1">Resumen Ejecutivo Logístico</p>
              </div>

              <div className="grid grid-cols-2 gap-6 mb-8 pt-6 border-t border-white/5">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/5 rounded-xl text-brand-teal"><User size={18} /></div>
                    <div>
                      <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Cliente</p>
                      <p className="text-sm font-bold text-slate-200">{selectedEventDetail.clientes?.nombre_completo || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/5 rounded-xl text-brand-teal"><Phone size={18} /></div>
                    <div>
                      <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Teléfono</p>
                      <p className="text-sm font-bold text-slate-200">{selectedEventDetail.clientes?.telefono || 'Sin registro'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/5 rounded-xl text-brand-teal"><MapPin size={18} /></div>
                    <div>
                      <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Ubicación</p>
                      <p className="text-sm font-bold text-slate-200 truncate">{selectedEventDetail.lugar || 'Por definir'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quotation & Products Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                {/* Quotation Info */}
                <div className="bg-white/5 rounded-3xl p-6 border border-white/5">
                  <h4 className="text-[10px] font-black text-slate-500 tracking-widest uppercase mb-4 flex items-center gap-2">
                    <DollarSign size={14} className="text-brand-teal" /> Información de Cotización
                  </h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-500 font-bold">Folio:</span>
                      <span className="text-sm font-black text-white italic">{selectedEventDetail.cotizaciones?.numero_cotizacion || 'S/N'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-500 font-bold">Total:</span>
                      <span className="text-lg font-black text-brand-teal italic">
                        ${selectedEventDetail.cotizaciones?.total?.toLocaleString() || '0'}
                      </span>
                    </div>
                    <div className="pt-3 border-t border-white/5">
                      <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-2">Paquete Principal</p>
                      <div className="text-xs font-bold text-slate-200 bg-white/5 p-2 rounded-xl">
                        {selectedEventDetail.paquete_contratado || (selectedEventDetail.cotizaciones?.paquetes_incluidos?.[0]?.nombre) || 'Personalizado'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Selected Products */}
                <div className="bg-white/5 rounded-3xl p-6 border border-white/5 flex flex-col max-h-[250px]">
                  <h4 className="text-[10px] font-black text-slate-500 tracking-widest uppercase mb-4 flex items-center gap-2">
                    <CheckCircle size={14} className="text-brand-teal" /> Barra Seleccionada
                  </h4>
                  <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-4">
                    {/* Drinks */}
                    <div>
                      <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-2">Tragos Seleccionados</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedEventDetail.evento_productos?.length > 0 ? (
                          selectedEventDetail.evento_productos.map((prod, idx) => (
                            <span key={idx} className="px-3 py-1 bg-white/5 rounded-lg text-[10px] font-bold text-slate-300 border border-white/5">
                              {prod.recetas_base?.nombre}
                            </span>
                          ))
                        ) : (
                          <span className="text-[10px] text-slate-600 italic">No se han seleccionado tragos.</span>
                        )}
                      </div>
                    </div>
                    {/* Beers */}
                    <div>
                      <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-2">Cervezas Seleccionadas</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedEventDetail.cervezas_seleccionadas?.length > 0 ? (
                          selectedEventDetail.cervezas_seleccionadas.map((beer, idx) => (
                            <span key={idx} className="px-3 py-1 bg-brand-yellow/10 rounded-lg text-[10px] font-bold text-brand-yellow border border-brand-yellow/20">
                              {beer}
                            </span>
                          ))
                        ) : (
                          <span className="text-[10px] text-slate-600 italic">No se han seleccionado cervezas.</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white/5 rounded-3xl p-6 border border-white/5">
                <h4 className="text-[10px] font-black text-slate-500 tracking-widest uppercase mb-4 flex items-center gap-2">
                  <FileText size={14} className="text-brand-teal" /> Notas Logísticas y de Servicio
                </h4>
                <textarea
                  className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-sm text-slate-300 min-h-[120px] outline-none focus:border-brand-teal/50 transition-all"
                  placeholder="Instrucciones especiales, puntos de referencia, etc..."
                  defaultValue={selectedEventDetail.notas_logisticas}
                  onBlur={(e) => updateEventNotes(selectedEventDetail.id, e.target.value)}
                  disabled={isUpdatingNotes}
                ></textarea>
                <div className="mt-2 flex justify-between items-center px-2">
                  <p className="text-[8px] font-bold text-slate-600 italic">Se guarda automáticamente al salir del campo.</p>
                  {isUpdatingNotes && <span className="text-[8px] font-black text-brand-teal animate-pulse uppercase">Guardando...</span>}
                </div>
              </div>

              <div className="mt-8 flex gap-4">
                <button
                  onClick={() => setIsDetailsOpen(false)}
                  className="btn-primary flex-1 py-4 uppercase tracking-[0.2em] text-xs shadow-2xl shadow-brand-teal/20"
                >
                  Regresar al Calendario
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DashboardPage;
