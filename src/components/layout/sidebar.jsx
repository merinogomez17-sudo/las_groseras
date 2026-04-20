import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Package, 
  Users, 
  Target, 
  FileText, 
  Calendar, 
  Settings as SettingsIcon,
  LogOut,
  BookOpen
} from 'lucide-react';
import { motion } from 'framer-motion';

const Sidebar = () => {
  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
    { icon: Package, label: 'Inventario', path: '/inventario' },
    { icon: Users, label: 'Clientes', path: '/clientes' },
    { icon: Target, label: 'Leads', path: '/leads' },
    { icon: BookOpen, label: 'Escandallos', path: '/recetas' },
    { icon: FileText, label: 'Cotizaciones', path: '/cotizaciones' },
    { icon: Calendar, label: 'Eventos', path: '/eventos' },
    { icon: SettingsIcon, label: 'Configuración', path: '/configuracion' },
  ];

  return (
    <div className="w-64 bg-slate-900/50 backdrop-blur-xl border-r border-white/5 h-screen fixed left-0 top-0 flex flex-col p-4">
      <div className="flex items-center gap-4 px-2 mb-12">
        <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center p-1 shadow-2xl border border-white/5 group-hover:scale-110 transition-transform">
          <img src="/logo.png" alt="Las Groseras" className="w-full h-full object-contain" />
        </div>
        <div className="flex flex-col">
          <h1 className="text-xl font-black italic tracking-tighter text-white">
            LAS <span className="text-brand-red">GROSERAS</span>
          </h1>
          <span className="text-[8px] font-black uppercase tracking-[0.3em] text-slate-500">Admin Control</span>
        </div>
      </div>

      <nav className="flex-1 space-y-1">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `
              flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300
              ${isActive 
                ? 'bg-brand-red text-white shadow-lg shadow-brand-red/20' 
                : 'text-slate-400 hover:bg-white/5 hover:text-white'}
            `}
          >
            <item.icon size={20} />
            <span className="font-medium text-sm">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto pt-6 border-t border-white/5">
        <button className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-slate-400 hover:bg-rose-500/10 hover:text-rose-500 transition-all duration-300">
          <LogOut size={20} />
          <span className="font-medium text-sm">Cerrar sesión</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
