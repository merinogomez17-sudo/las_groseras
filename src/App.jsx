import React, { useState, useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import Sidebar from './components/layout/sidebar';
import Dashboard from './pages/dashboard/dashboardPage';
import Inventory from './pages/inventory/inventoryPage';
import { Toaster } from 'sonner';
import LeadCaptureForm from './pages/public/LeadCaptureForm';
import DrinkSelectionPage from './pages/public/DrinkSelectionPage';
import Customers from './pages/customers/customersPage';
import Leads from './pages/leads/leadsPage';
import Quotes from './pages/quotes/quotesPage';
import Recipes from './pages/recipes/recipesPage';
import Events from './pages/events/eventsPage';
import { 
  SettingsPage as Settings 
} from './pages/placeholders';
import { Menu } from 'lucide-react';

function App() {
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  const isPublicRoute = location.pathname === '/reserva' || location.pathname.startsWith('/selection/');

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) setIsMobileOpen(false);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className={`flex min-h-screen bg-brand-dark text-brand-cream ${isPublicRoute ? 'block' : 'flex'}`}>
      <Toaster position="top-right" expand={false} richColors theme="dark" />
      
      {!isPublicRoute && (
        <>
          {/* Mobile Overlay */}
          {isMobile && isMobileOpen && (
            <div 
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90]" 
              onClick={() => setIsMobileOpen(false)}
            />
          )}

          <Sidebar 
            isCollapsed={isCollapsed} 
            setIsCollapsed={setIsCollapsed}
            isMobile={isMobile}
            isMobileOpen={isMobileOpen}
            setIsMobileOpen={setIsMobileOpen}
          />
        </>
      )}

      {/* Mobile Menu Trigger */}
      {!isPublicRoute && isMobile && (
        <button 
          onClick={() => setIsMobileOpen(true)}
          className="fixed top-6 left-6 z-[80] w-12 h-12 backdrop-blur-xl rounded-2xl flex items-center justify-center"
          style={{ background: 'rgba(254,204,48,0.12)', border: '1px solid rgba(254,204,48,0.25)', color: '#fecc30' }}
        >
          <Menu size={24} />
        </button>
      )}

      <main 
        className={`flex-1 transition-all duration-300 ${
          isPublicRoute 
            ? 'p-0 ml-0' 
            : isMobile 
              ? 'p-4 pt-24 ml-0' 
              : isCollapsed 
                ? 'p-8 ml-20' 
                : 'p-8 ml-64'
        } overflow-y-auto`}
      >
        <Routes>
          <Route path="/reserva" element={<LeadCaptureForm />} />
          <Route path="/selection/:eventId" element={<DrinkSelectionPage />} />
          <Route path="/" element={<Dashboard />} />
          <Route path="/inventario" element={<Inventory />} />
          <Route path="/clientes" element={<Customers />} />
          <Route path="/leads" element={<Leads />} />
          <Route path="/cotizaciones" element={<Quotes />} />
          <Route path="/recetas" element={<Recipes />} />
          <Route path="/eventos" element={<Events />} />
          <Route path="/configuracion" element={<Settings />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
