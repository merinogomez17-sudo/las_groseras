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

function App() {
  const location = useLocation();
  const isPublicRoute = location.pathname === '/reserva' || location.pathname.startsWith('/selection/');

  return (
    <div className={`flex min-h-screen bg-brand-dark text-slate-100 ${isPublicRoute ? 'block' : 'flex'}`}>
      <Toaster position="top-right" expand={false} richColors dark />
      {!isPublicRoute && <Sidebar />}
      <main className={`flex-1 ${isPublicRoute ? 'p-0 ml-0' : 'p-8 ml-64'} overflow-y-auto`}>
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
