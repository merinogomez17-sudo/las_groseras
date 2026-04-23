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
  ChevronRight,
  Sun,
  Moon,
  FlaskConical,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../../context/ThemeContext';

const Sidebar = ({ isCollapsed, setIsCollapsed, isMobile, isMobileOpen, setIsMobileOpen }) => {
  const { isDark, toggle } = useTheme();

  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/admin/' },
    { icon: Package, label: 'Inventario', path: '/admin/inventario' },
    { icon: Users, label: 'Clientes', path: '/admin/clientes' },
    { icon: Target, label: 'Leads', path: '/admin/leads' },
    { icon: BookOpen, label: 'Costos', path: '/admin/recetas' },
    { icon: FlaskConical, label: 'Insumos', path: '/admin/insumos' },
    { icon: FileText, label: 'Cotizaciones', path: '/admin/cotizaciones' },
    { icon: Calendar, label: 'Eventos', path: '/admin/eventos' },
    { icon: SettingsIcon, label: 'Configuración', path: '/admin/configuracion' },
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
      className={`h-screen fixed left-0 top-0 flex flex-col p-4 z-[100] transition-colors duration-300 ${isCollapsed ? 'items-center' : ''}`}
      style={{
        background: 'var(--sidebar-bg)',
        borderRight: '1px solid var(--sidebar-border)',
        backdropFilter: 'blur(24px)',
      }}
    >
      {/* Accent glow top */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-brand-yellow/40 to-transparent" />

      {/* Desktop Toggle Button */}
      {!isMobile && (
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3.5 top-24 w-7 h-7 backdrop-blur-xl rounded-full flex items-center justify-center transition-all shadow-xl z-[110] group"
          style={{
            background: 'rgb(var(--brand-yellow))',
            border: '1px solid rgb(var(--brand-yellow) / 0.4)',
            color: 'rgb(var(--brand-dark))',
          }}
        >
          {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          <div className="absolute inset-0 rounded-full bg-brand-yellow/30 blur-md opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>
      )}

      {/* Header / Logo */}
      <div className={`flex items-center gap-4 px-2 mb-10 mt-2 ${isCollapsed ? 'justify-center' : ''}`}>
        <div className="shrink-0 w-11 h-11 rounded-xl flex items-center justify-center p-1 shadow-2xl"
          style={{ background: 'rgb(var(--brand-yellow) / 0.1)', border: '1px solid rgb(var(--brand-yellow) / 0.2)' }}>
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
              <h1 className="lobster" style={{ fontSize: '1.25rem', lineHeight: 1.2 }}>
                <span style={{ color: 'rgb(var(--brand-cream))' }}>Las </span>
                <span style={{ color: 'rgb(var(--brand-yellow))' }}>groseras</span>
              </h1>
              <span className="text-[8px] font-bold uppercase tracking-[0.35em]"
                style={{ color: 'rgb(var(--brand-cream) / 0.35)' }}>
                Admin Control
              </span>
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
            end={item.path === '/admin/'}
            onClick={() => isMobile && setIsMobileOpen(false)}
            className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-300 relative group ${isCollapsed ? 'justify-center px-0' : ''}`}
            style={({ isActive }) => isActive ? {
              background: 'rgb(var(--brand-yellow) / 0.15)',
              color: 'rgb(var(--brand-yellow))',
              boxShadow: '0 0 20px rgb(var(--brand-yellow) / 0.12)',
              border: '1px solid rgb(var(--brand-yellow) / 0.25)',
            } : {
              color: 'rgb(var(--brand-cream) / 0.5)',
              border: '1px solid transparent',
            }}
          >
            {({ isActive }) => (
              <>
                <item.icon size={18} className="shrink-0"
                  style={{ color: isActive ? 'rgb(var(--brand-yellow))' : 'rgb(var(--brand-cream) / 0.45)' }} />

                <AnimatePresence>
                  {!isCollapsed && (
                    <motion.span
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      className="text-sm whitespace-nowrap overflow-hidden font-sans font-semibold tracking-wide"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>

                {isCollapsed && !isMobile && (
                  <div className="absolute left-full ml-4 px-3 py-1.5 text-[11px] font-semibold rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50 shadow-xl"
                    style={{ background: 'rgb(var(--brand-yellow))', color: 'rgb(var(--brand-dark))' }}>
                    {item.label}
                  </div>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Divider */}
      <div className="w-full h-px my-2" style={{ background: 'rgb(var(--brand-cream) / 0.08)' }} />

      {/* Theme Toggle */}
      <div className={`pt-1 pb-1 w-full ${isCollapsed ? 'flex justify-center' : ''}`}>
        <button
          onClick={toggle}
          className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-300 relative group ${isCollapsed ? 'justify-center px-0' : 'w-full'}`}
          style={{
            color: 'rgb(var(--brand-teal))',
            border: '1px solid rgb(var(--brand-teal) / 0.2)',
            background: 'rgb(var(--brand-teal) / 0.08)',
          }}
        >
          {isDark
            ? <Sun size={18} className="shrink-0" />
            : <Moon size={18} className="shrink-0" />
          }
          <AnimatePresence>
            {!isCollapsed && (
              <motion.span
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="font-semibold text-sm whitespace-nowrap overflow-hidden font-sans tracking-wide"
              >
                {isDark ? 'Modo Claro' : 'Modo Oscuro'}
              </motion.span>
            )}
          </AnimatePresence>
          {isCollapsed && !isMobile && (
            <div className="absolute left-full ml-4 px-3 py-1.5 text-[11px] font-semibold rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50 shadow-xl"
              style={{ background: 'rgb(var(--brand-teal))', color: 'rgb(var(--brand-dark))' }}>
              {isDark ? 'Modo Claro' : 'Modo Oscuro'}
            </div>
          )}
        </button>
      </div>

      {/* Logout */}
      <div className={`pt-1 w-full ${isCollapsed ? 'flex justify-center' : ''}`}>
        <button
          onClick={() => {
            sessionStorage.removeItem('lg_admin_auth');
            window.location.href = '/admin';
          }}
          className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-300 relative group ${isCollapsed ? 'justify-center px-0' : 'w-full'}`}
          style={{ color: 'rgb(var(--brand-cream) / 0.35)', border: '1px solid transparent' }}
          onMouseEnter={e => {
            e.currentTarget.style.color = 'rgb(var(--brand-teal))';
            e.currentTarget.style.background = 'rgb(var(--brand-teal) / 0.1)';
            e.currentTarget.style.borderColor = 'rgb(var(--brand-teal) / 0.2)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.color = 'rgb(var(--brand-cream) / 0.35)';
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.borderColor = 'transparent';
          }}
        >
          <LogOut size={18} className="shrink-0" />
          <AnimatePresence>
            {!isCollapsed && (
              <motion.span
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="font-semibold text-sm whitespace-nowrap overflow-hidden font-sans tracking-wide"
              >
                Cerrar sesión
              </motion.span>
            )}
          </AnimatePresence>
          {isCollapsed && !isMobile && (
            <div className="absolute left-full ml-4 px-3 py-1.5 text-[11px] font-semibold rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50 shadow-xl"
              style={{ background: 'rgb(var(--brand-teal))', color: 'rgb(var(--brand-dark))' }}>
              Cerrar sesión
            </div>
          )}
        </button>
      </div>

      {/* Bottom accent line */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-brand-teal/30 to-transparent" />
    </motion.div>
  );
};

export default Sidebar;
