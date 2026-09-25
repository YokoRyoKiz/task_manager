import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Header from './components/Header';
import TaskPage from './pages/TaskPage';
import SchedulePage from './pages/SchedulePage';
import MonitorPage from './pages/MonitorPage';
import LoginPage from './pages/LoginPage';

function AppContent() {
  const { currentUser } = useAuth();
  const [currentPage, setCurrentPage] = useState('task'); // 'task' | 'schedule' | 'monitor'

  if (!currentUser) {
    return <LoginPage />;
  }

  return (
    <div className="app-container">
      <Header currentPage={currentPage} setCurrentPage={setCurrentPage} />
      
      <main className="main-content">
        {currentPage === 'task' && <TaskPage />}
        {currentPage === 'schedule' && <SchedulePage />}
        {currentPage === 'monitor' && <MonitorPage />}
      </main>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
