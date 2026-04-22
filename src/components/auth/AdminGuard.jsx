import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Lock, ArrowRight, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

const AdminGuard = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if previously authenticated in this session
    const authStatus = sessionStorage.getItem('lg_admin_auth');
    if (authStatus === 'true') {
      setIsAuthenticated(true);
    }
    setLoading(false);
  }, []);

  const handleLogin = (e) => {
    e.preventDefault();
    if (password === 'dpddLG2026') {
      sessionStorage.setItem('lg_admin_auth', 'true');
      setIsAuthenticated(true);
      toast.success('Acceso autorizado al panel CRM');
    } else {
      toast.error('Contraseña incorrecta');
      setPassword('');
    }
  };

  if (loading) return null;

  if (isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-brand-dark flex flex-col items-center justify-center p-6 bg-[url('https://images.unsplash.com/photo-1541533848490-bc8115cd6522?auto=format&fit=crop&q=80&w=2069')] bg-cover bg-center">
      <div className="absolute inset-0 bg-brand-dark/95 backdrop-blur-2xl"></div>
      
      <motion.div 
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="glass max-w-sm w-full p-8 relative z-10 border-t-4 border-brand-red overflow-hidden"
      >
        <div className="absolute -top-10 -right-10 opacity-5">
          <ShieldCheck size={180} />
        </div>

        <div className="w-16 h-16 bg-brand-red/10 border border-brand-red/20 rounded-2xl flex items-center justify-center mb-6 mx-auto shadow-lg shadow-brand-red/10">
          <Lock size={28} className="text-brand-red" />
        </div>

        <div className="text-center mb-8">
          <h1 className="text-2xl font-black text-white italic tracking-tighter uppercase mb-1">Acceso CRM</h1>
          <p className="text-xs font-bold tracking-[0.2em] text-slate-500 uppercase">Las Groseras • Área Restringida</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Contraseña de administrador..."
              className="input-field w-full text-center tracking-widest text-lg py-4 bg-black/40 border-white/10 focus:border-brand-red/50 focus:bg-white/5 transition-all"
              autoFocus
            />
          </div>
          <button 
            type="submit"
            className="btn-primary w-full py-4 text-xs font-black uppercase tracking-widest group shadow-xl shadow-brand-red/20 flex items-center justify-center gap-2"
          >
            Verificar Acceso 
            <ArrowRight className="group-hover:translate-x-1 transition-transform" size={16} />
          </button>
        </form>

      </motion.div>
    </div>
  );
};

export default AdminGuard;
