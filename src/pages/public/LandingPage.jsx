import React from 'react';

const LandingPage = () => {
  return (
    <div style={{ width: '100%', height: '100vh', margin: 0, padding: 0, overflow: 'hidden' }}>
      <iframe 
        src="/landing_original.html" 
        style={{ width: '100%', height: '100%', border: 'none' }}
        title="Las Groseras"
      />
    </div>
  );
};

export default LandingPage;
