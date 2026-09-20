import React, { useRef } from 'react';
import { List, X } from 'lucide-react';

export default function ScheduleTaskbar({ isOpen, onClose, tasks, onTaskDragStart }) {
  const pressTimer = useRef(null);

  // Sort tasks by deadline, placing null deadlines at the end
  const sortedTasks = [...tasks].sort((a, b) => {
    if (!a.deadline && !b.deadline) return 0;
    if (!a.deadline) return 1;
    if (!b.deadline) return -1;
    return new Date(a.deadline) - new Date(b.deadline);
  });

  const handlePointerDown = (e, task) => {
    // Save coordinates to pass to setTimeout
    const clientX = e.clientX;
    const clientY = e.clientY;
    
    // Start long-press timer for mobile drag compatibility
    pressTimer.current = setTimeout(() => {
      if (onTaskDragStart) {
        onTaskDragStart(task, { clientX, clientY });
      }
    }, 250);
  };

  const cancelPress = () => {
    if (pressTimer.current) clearTimeout(pressTimer.current);
  };

  return (
    <div 
      className={`glass-panel schedule-taskbar ${isOpen ? 'mobile-open' : ''}`}
      style={{
        position: 'absolute',
        top: 0,
        right: isOpen ? 0 : '-320px',
        width: '320px',
        height: '100%',
        zIndex: 100,
        transition: 'right 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        background: 'var(--bg-secondary)',
        borderLeft: '1px solid var(--glass-border)',
        display: 'flex',
        flexDirection: 'column',
        padding: '1rem'
      }}
    >
      <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontWeight: 'bold' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><List size={20} /> タスク一覧</span>
        <button 
          className="btn-icon" 
          onClick={onClose}
          style={{ color: 'var(--text-secondary)' }}
        >
          <X size={20} />
        </button>
      </h3>
      
      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
        ※タスクをタイムテーブルへドラッグ＆ドロップすると予定を作成できます
      </div>

      <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', paddingRight: '0.5rem' }}>
        {sortedTasks.map((t, idx) => (
          <div 
            key={t.id}
            onPointerDown={(e) => handlePointerDown(e, t)}
            onPointerUp={cancelPress}
            onPointerLeave={cancelPress}
            onPointerMove={cancelPress} // Any movement cancels the long press
            className="glass-panel"
            style={{
              padding: '0.75rem',
              borderLeft: `4px solid var(--sticky-${t.color || 'yellow'})`,
              background: 'rgba(255, 255, 255, 0.05)',
              fontSize: '0.875rem',
              marginBottom: '0.5rem',
              cursor: 'grab',
              transition: 'background 0.2s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
          >
            <div style={{ fontWeight: 600, marginBottom: '0.25rem', display: 'flex', alignItems: 'center' }}>
              <span style={{ 
                background: 'rgba(0,0,0,0.1)', 
                borderRadius: '10px', 
                padding: '2px 6px', 
                marginRight: '8px', 
                fontSize: '0.7rem' 
              }}>
                {idx + 1}
              </span>
              {t.title}
            </div>
            {t.deadline && <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>〆 {t.deadline.replace(/-/g, '/')}</div>}
            {t.progress > 0 && (
              <div style={{ width: '100%', height: '4px', background: 'rgba(0,0,0,0.1)', borderRadius: '2px', marginTop: '0.5rem' }}>
                <div style={{ width: `${t.progress}%`, height: '100%', background: 'rgba(0,0,0,0.4)', borderRadius: '2px' }} />
              </div>
            )}
          </div>
        ))}
        {sortedTasks.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--text-secondary)', marginTop: '2rem' }}>
            タスクがありません
          </div>
        )}
      </div>
    </div>
  );
}
