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
        supabase.from('inventario').select('*').lt('cantidad_actual', supabase.rpc('get_min_stock', {}, { count: 'exact' })),
        supabase.from('cotizaciones').select('total')
      ]);

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="lobster text-3xl flex items-center gap-3" style={{ color: '#f7ebd7' }}>
            <LayoutDashboard style={{ color: '#fecc30' }} size={30} />
            Control de Misión
          </h1>
          <p className="mt-1 font-sans text-sm" style={{ color: 'rgba(247,235,215,0.45)' }}>
            Resumen operativo de Las Groseras.
          </p>
        </div>
        <div className="text-xs flex items-center gap-2 px-3 py-1.5 rounded-full font-sans"
          style={{ background: 'rgba(247,235,215,0.05)', border: '1px solid rgba(247,235,215,0.08)', color: 'rgba(247,235,215,0.35)' }}>
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
              background: 'rgba(247,235,215,0.04)',
              border: `1px solid ${item.border}`,
              backdropFilter: 'blur(12px)',
              transition: 'all 0.3s',
            }}
            whileHover={{ scale: 1.02, background: 'rgba(247,235,215,0.07)' }}
          >
            {/* Background glow */}
            <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full blur-2xl opacity-20 transition-opacity group-hover:opacity-40"
              style={{ background: item.accent }} />

            <div className="relative z-10">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                style={{ background: item.bg, color: item.accent }}>
                <item.icon size={20} />
              </div>
              <p className="text-xs font-semibold tracking-widest font-sans mb-1"
                style={{ color: 'rgba(247,235,215,0.45)' }}>
                {item.label}
              </p>
              <h3 className="text-3xl tracking-tight" style={{ color: '#f7ebd7' }}>
                {item.value}
              </h3>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Upcoming Events */}
        <div className="lg:col-span-2 glass p-7 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-brand-teal/50 to-transparent" />
          <div className="flex justify-between items-center mb-6">
            <h2 className="card-title">Próximos Eventos</h2>
            <button className="text-xs font-bold font-sans hover:underline" style={{ color: '#40b3ac' }}>
              Ver calendario
            </button>
          </div>
          <div className="flex flex-col items-center justify-center py-16 space-y-4" style={{ color: 'rgba(247,235,215,0.2)' }}>
            <Calendar size={44} />
            <p className="text-sm font-sans" style={{ color: 'rgba(247,235,215,0.3)' }}>
              No hay eventos confirmados para esta semana.
            </p>
            <button className="btn-secondary py-1.5 text-xs">Agendar nuevo</button>
          </div>
        </div>

        {/* Stock Alert */}
        <div className="glass p-7 space-y-5">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-brand-yellow/50 to-transparent" />
          <h2 className="card-title" style={{ color: '#fecc30' }}>
            Stock Crítico
          </h2>
          <div>
            {stats.inventoryAlerts > 0 ? (
              <div className="p-5 rounded-2xl text-center space-y-3"
                style={{ background: 'rgba(254,204,48,0.08)', border: '1px solid rgba(254,204,48,0.2)' }}>
                <AlertCircle size={28} className="mx-auto" style={{ color: '#fecc30' }} />
                <p className="text-sm font-sans" style={{ color: 'rgba(247,235,215,0.7)' }}>
                  Hay <span className="font-bold" style={{ color: '#fecc30' }}>{stats.inventoryAlerts}</span> insumos
                  por debajo del mínimo.
                </p>
                <button className="btn-primary w-full py-2 text-xs mt-2">Corregir Inventario</button>
              </div>
            ) : (
              <div className="p-5 rounded-2xl text-center"
                style={{ background: 'rgba(64,179,172,0.08)', border: '1px solid rgba(64,179,172,0.2)' }}>
                <p className="text-sm font-bold font-sans" style={{ color: '#40b3ac' }}>¡Todo en orden!</p>
                <p className="text-[11px] mt-1 font-sans" style={{ color: 'rgba(247,235,215,0.3)' }}>
                  Niveles de stock estables.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
