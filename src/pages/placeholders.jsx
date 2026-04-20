import React from 'react';
const Placeholder = ({ title }) => (
  <div className="glass p-10 flex flex-col items-center justify-center text-center space-y-4">
    <h2 className="text-3xl font-bold text-white">{title}</h2>
    <p className="text-slate-400 max-w-md">Este módulo está en construcción como parte del desarrollo fase por fase del CRM Las Groseras.</p>
    <div className="w-20 h-1 bg-brand-red rounded-full"></div>
  </div>
);

export const CustomersPage = () => <Placeholder title="Gestión de Clientes" />;
export const LeadsPage = () => <Placeholder title="Pipeline de Leads (Kanban)" />;
export const QuotesPage = () => <Placeholder title="Generador de Cotizaciones" />;
export const EventsPage = () => <Placeholder title="Calendario de Eventos" />;
export const SettingsPage = () => <Placeholder title="Configuración del Sistema" />;
