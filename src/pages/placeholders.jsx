import React from 'react';
const Placeholder = ({ title }) => (
  <div className="glass p-10 flex flex-col items-center justify-center text-center space-y-4 min-h-[60vh]">
    <h2 className="lobster text-4xl" style={{ color: 'rgb(var(--brand-cream))' }}>{title}</h2>
    <p className="max-w-md font-sans text-sm" style={{ color: 'rgb(var(--brand-cream) / 0.4)' }}>
      Este módulo está en construcción como parte del desarrollo fase por fase del CRM Las Groseras.
    </p>
    <div className="w-20 h-0.5 rounded-full" style={{ background: 'linear-gradient(90deg, #fecc30, #40b3ac)' }} />
  </div>
);

export const CustomersPage = () => <Placeholder title="Gestión de Clientes" />;
export const LeadsPage = () => <Placeholder title="Pipeline de Leads (Kanban)" />;
export const QuotesPage = () => <Placeholder title="Generador de Cotizaciones" />;
export const EventsPage = () => <Placeholder title="Calendario de Eventos" />;
export const SettingsPage = () => <Placeholder title="Configuración del Sistema" />;
