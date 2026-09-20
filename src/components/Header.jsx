import React from 'react';
import { LayoutDashboard, CalendarDays } from 'lucide-react';

export default function Header({ currentPage, setCurrentPage }) {
  return (
    <header className="glass-panel" style={{ 
      margin: '1rem', 
      padding: '0.5rem 1rem', 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center',
      zIndex: 100
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <h1 style={{ 
          fontSize: '1.25rem', 
          fontWeight: 700, 
          background: 'linear-gradient(to right, var(--accent-primary), var(--accent-hover))',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          margin: 0
        }}>
          OmniTask
        </h1>
      </div>
      
      <nav style={{ display: 'flex', gap: '0.5rem' }}>
        <button 
          className={`btn ${currentPage === 'task' ? 'btn-primary' : ''}`}
          onClick={() => setCurrentPage('task')}
          style={{ 
            background: currentPage !== 'task' ? 'transparent' : '',
            color: currentPage !== 'task' ? 'var(--text-secondary)' : ''
          }}
        >
          <LayoutDashboard size={18} />
          <span className="hide-on-mobile">タスク管理</span>
        </button>
        <button 
          className={`btn ${currentPage === 'schedule' ? 'btn-primary' : ''}`}
          onClick={() => setCurrentPage('schedule')}
          style={{ 
            background: currentPage !== 'schedule' ? 'transparent' : '',
            color: currentPage !== 'schedule' ? 'var(--text-secondary)' : ''
          }}
        >
          <CalendarDays size={18} />
          <span className="hide-on-mobile">スケジュール管理</span>
        </button>
      </nav>
      
      <div style={{ width: '40px' }}>
        {/* Placeholder for future settings/profile */}
      </div>
    </header>
  );
}
