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
  BookOpen,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Sidebar = ({ isCollapsed, setIsCollapsed, isMobile, isMobileOpen, setIsMobileOpen }) => {
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

  const sidebarVariants = {
    expanded: { width: '256px' },
    collapsed: { width: '80px' },
    mobileOpen: { x: 0, width: '256px' },
    mobileClosed: { x: '-100%', width: '256px' }
  };

  const getActiveVariant = () => {
    if (isMobile) return isMobileOpen ? 'mobileOpen' : 'mobileClosed';
    return isCollapsed ? 'collapsed' : 'expanded';
  };

  return (
    <motion.div 
      initial={false}
      animate={getActiveVariant()}
      variants={sidebarVariants}
      className={`bg-slate-900/60 backdrop-blur-2xl border-r border-white/5 h-screen fixed left-0 top-0 flex flex-col p-4 z-[100] transition-colors duration-300 ${isCollapsed ? 'items-center' : ''}`}
    >
      {/* Desktop Toggle Button */}
      {!isMobile && (
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-24 w-7 h-7 bg-white/10 hover:bg-brand-red backdrop-blur-xl border border-white/10 rounded-full flex items-center justify-center text-white transition-all shadow-xl z-[110] group"
        >
          {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          
          {/* Subtle Glow Effect */}
          <div className="absolute inset-0 rounded-full bg-brand-red/20 blur-md opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>
      )}

      {/* Header / Logo */}
      <div className={`flex items-center gap-4 px-2 mb-12 ${isCollapsed ? 'justify-center' : ''}`}>
        <div className="shrink-0 w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center p-1 shadow-2xl border border-white/5">
          <img src="/logo.png" alt="Las Groseras" className="w-full h-full object-contain" />
        </div>
        
        <AnimatePresence>
          {!isCollapsed && (
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="flex flex-col whitespace-nowrap overflow-hidden"
            >
              <h1 className="text-lg font-black italic tracking-tighter text-white">
                LAS <span className="text-brand-red">GROSERAS</span>
              </h1>
              <span className="text-[7px] font-black uppercase tracking-[0.3em] text-slate-500">Admin Control</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 w-full">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={() => isMobile && setIsMobileOpen(false)}
            className={({ isActive }) => `
              flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 relative group
              ${isActive 
                ? 'bg-brand-red text-white shadow-lg shadow-brand-red/20' 
                : 'text-slate-400 hover:bg-white/5 hover:text-white'}
              ${isCollapsed ? 'justify-center px-0' : ''}
            `}
          >
            <item.icon size={20} className="shrink-0" />
            
            <AnimatePresence>
              {!isCollapsed && (
                <motion.span 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="font-medium text-sm whitespace-nowrap overflow-hidden"
                >
                  {item.label}
                </motion.span>
              )}
            </AnimatePresence>

            {/* Tooltip for collapsed mode */}
            {isCollapsed && !isMobile && (
              <div className="absolute left-full ml-4 px-2 py-1 bg-slate-800 text-white text-[10px] rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50 shadow-xl border border-white/5">
                {item.label}
              </div>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer / Logout */}
      <div className={`mt-auto pt-6 border-t border-white/5 w-full ${isCollapsed ? 'flex justify-center' : ''}`}>
        <button className={`flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-rose-500/10 hover:text-rose-500 transition-all duration-300 relative group ${isCollapsed ? 'justify-center px-0' : 'w-full'}`}>
          <LogOut size={20} className="shrink-0" />
          <AnimatePresence>
            {!isCollapsed && (
              <motion.span 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="font-medium text-sm whitespace-nowrap overflow-hidden"
              >
                Cerrar sesión
              </motion.span>
            )}
          </AnimatePresence>
          {isCollapsed && !isMobile && (
            <div className="absolute left-full ml-4 px-2 py-1 bg-rose-500 text-white text-[10px] rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50 shadow-xl">
              Cerrar sesión
            </div>
          )}
        </button>
      </div>
    </motion.div>
  );
};

export default Sidebar;
