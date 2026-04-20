import React, { useState, useEffect } from 'react';
import { LayoutDashboard, TrendingUp, Users, Package, Calendar, ArrowUpRight, Clock, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { motion } from 'framer-motion';

const DashboardPage = () => {
  const [stats, setStats] = useState({
    leads: 0,
    customers: 0,
    inventoryAlerts: 0,
    quotesValue: 0,
    recentEvents: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const [leadsRes, customersRes, inventoryRes, quotesRes] = await Promise.all([
        supabase.from('leads').select('*', { count: 'exact', head: true }),
        supabase.from('clientes').select('*', { count: 'exact', head: true }),
        supabase.from('inventario').select('*').lt('cantidad_actual', supabase.rpc('get_min_stock', {}, { count: 'exact' })), // Simplified for now
        supabase.from('cotizaciones').select('total')
      ]);

      // Count low stock manually for now
      const { data: invData } = await supabase.from('inventario').select('nombre, cantidad_actual, cantidad_minima');
      const lowStock = invData?.filter(i => i.cantidad_actual <= i.cantidad_minima).length || 0;
      
      const totalQuotesAmount = quotesRes.data?.reduce((acc, curr) => acc + (curr.total || 0), 0) || 0;

      setStats({
        leads: leadsRes.count || 0,
        customers: customersRes.count || 0,
        inventoryAlerts: lowStock,
        quotesValue: totalQuotesAmount,
        recentEvents: []
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { label: 'Leads Totales', value: stats.leads, icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { label: 'Clientes Registrados', value: stats.customers, icon: ArrowUpRight, color: 'text-amber-400', bg: 'bg-amber-500/10' },
    { label: 'Valor en Cotizaciones', value: `$${stats.quotesValue.toLocaleString()}`, icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { label: 'Alertas de Stock', value: stats.inventoryAlerts, icon: Package, color: 'text-rose-400', bg: 'bg-rose-500/10' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <LayoutDashboard className="text-brand-red" size={32} />
            Control de Misión
          </h1>
          <p className="text-slate-400 mt-1">Resumen operativo de Las Groseras.</p>
        </div>
        <div className="text-xs text-slate-500 flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-full border border-white/5">
          <Clock size={12} />
          Última actualización: {new Date().toLocaleTimeString()}
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((item, i) => (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            key={i} 
            className="glass p-6 glass-hover relative overflow-hidden group"
          >
            <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full opacity-5 group-hover:opacity-10 transition-opacity ${item.bg}`} />
            <div className="flex justify-between items-start mb-4 relative z-10">
              <div className={`p-2 rounded-lg ${item.bg} ${item.color}`}>
                <item.icon size={20} />
              </div>
            </div>
            <p className="text-slate-400 text-sm font-medium relative z-10">{item.label}</p>
            <h3 className="text-2xl font-black mt-1 text-white relative z-10 tracking-tight">{item.value}</h3>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass p-8 relative overflow-hidden">
          <div className="flex justify-between items-center mb-6">
            <h2 className="card-title">Próximos Eventos</h2>
            <button className="text-xs font-bold text-brand-red hover:underline">Ver calendario</button>
          </div>
          <div className="flex flex-col items-center justify-center py-20 text-slate-500 space-y-4">
             <Calendar size={48} className="opacity-10" />
             <p className="italic text-sm">No hay eventos confirmados para esta semana.</p>
             <button className="btn-secondary py-1 text-xs">Agendar nuevo</button>
          </div>
        </div>

        <div className="glass p-8 space-y-6">
          <h2 className="card-title text-rose-500">
             Stock Crítico
          </h2>
          <div className="space-y-4">
             {stats.inventoryAlerts > 0 ? (
               <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-center space-y-2">
                 <AlertCircle size={24} className="text-rose-500 mx-auto" />
                 <p className="text-sm text-slate-300">Hay <span className="text-rose-500 font-bold">{stats.inventoryAlerts}</span> insumos por debajo del mínimo.</p>
                 <button className="btn-primary w-full py-2 text-xs mt-2">Corregir Inventario</button>
               </div>
             ) : (
               <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                 <p className="text-sm text-emerald-400 font-bold">Todo en orden!</p>
                 <p className="text-[10px] text-slate-500 mt-1">Niveles de stock estables.</p>
               </div>
             )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
