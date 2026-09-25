import React from 'react';
import { LayoutDashboard, CalendarDays, Monitor, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Header({ currentPage, setCurrentPage }) {
  const { currentUser, logout } = useAuth();

  const navBtn = (page, icon, label) => (
    <button
      className={`btn ${currentPage === page ? 'btn-primary' : ''}`}
      onClick={() => setCurrentPage(page)}
      style={{
        background: currentPage !== page ? 'transparent' : '',
        color: currentPage !== page ? 'var(--text-secondary)' : '',
        padding: '0.5rem 1rem',
      }}
    >
      {icon}
      <span className="hide-on-mobile">{label}</span>
    </button>
  );

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
          fontWeight: 800,
          background: 'linear-gradient(to right, var(--accent-primary), var(--accent-hover))',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          margin: 0,
          letterSpacing: '-0.02em',
        }}>
          OniPro
        </h1>
      </div>

      <nav style={{ display: 'flex', gap: '0.25rem' }}>
        {navBtn('task', <LayoutDashboard size={18} />, 'タスク管理')}
        {navBtn('schedule', <CalendarDays size={18} />, 'スケジュール')}
        {navBtn('monitor', <Monitor size={18} />, 'モニター')}
      </nav>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        {currentUser && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}>
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-hover))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: 700,
              fontSize: '0.8rem',
              flexShrink: 0,
            }}>
              {currentUser.name?.[0]?.toUpperCase() || '?'}
            </div>
            <span className="hide-on-mobile" style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              {currentUser.name}
            </span>
            <button
              className="btn-icon"
              onClick={logout}
              title="ログアウト"
              style={{ color: 'var(--text-secondary)' }}
            >
              <LogOut size={16} />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
