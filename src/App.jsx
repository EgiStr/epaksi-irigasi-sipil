import React, { useState } from 'react';
import Layout from './components/Layout';
import Home from './components/Home';
import IrigasiMap from './components/IrigasiMap';
import TableDaerahIrigasi from './components/TableDaerahIrigasi';
import './App.css';

function App() {
  const [currentPage, setCurrentPage] = useState('home');

  const renderContent = () => {
    switch(currentPage) {
      case 'home':
        return <Home onNavigate={setCurrentPage} />;
      case 'peta':
        return (
          <div style={{ 
            backgroundColor: 'white', 
            padding: '1.5rem', 
            borderRadius: '12px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            border: '1px solid #e5e7eb',
            height: 'calc(100vh - 200px)',
            minHeight: '600px'
          }}>
            <IrigasiMap />
          </div>
        );
      case 'tabel':
        return <TableDaerahIrigasi />;
      default:
        return <Home onNavigate={setCurrentPage} />;
    }
  };

  return (
    <Layout 
      activeMenu={currentPage} 
      onMenuChange={setCurrentPage}
    >
      {renderContent()}
    </Layout>
  );
}

export default App;
