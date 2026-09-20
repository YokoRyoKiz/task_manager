import React, { useState } from 'react';
import Header from './components/Header';
import TaskPage from './pages/TaskPage';
import SchedulePage from './pages/SchedulePage';

function App() {
  const [currentPage, setCurrentPage] = useState('task'); // 'task' or 'schedule'

  return (
    <div className="app-container">
      <Header currentPage={currentPage} setCurrentPage={setCurrentPage} />
      
      <main className="main-content">
        {currentPage === 'task' ? <TaskPage /> : <SchedulePage />}
      </main>
    </div>
  );
}

export default App;
