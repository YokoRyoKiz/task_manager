import React from 'react';

export default function TimelineSlider({ selectedDate, setSelectedDate, tasks = [], isSidebarOpen = false, isMobile = false }) {
  // Generate dates: yesterday to 8 days later (10 days total)
  const dates = Array.from({ length: 10 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - 1 + i);
    return d;
  });

  const getDayName = (date) => {
    const days = ['日', '月', '火', '水', '木', '金', '土'];
    return days[date.getDay()];
  };

  const isToday = (date) => {
    const today = new Date();
    return date.getDate() === today.getDate() && date.getMonth() === today.getMonth();
  };

  return (
    <div 
      className="glass-panel" 
      style={{ 
        padding: isMobile ? '0.5rem' : '1.5rem 0.5rem', 
        overflowY: isMobile ? 'hidden' : 'auto', 
        overflowX: isMobile ? 'auto' : 'hidden',
        width: isMobile ? '100%' : (isSidebarOpen ? '80px' : '220px'), 
        flexShrink: 0, 
        height: isMobile ? 'auto' : '100%',
        transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
      }}
    >
      <div style={{ display: 'flex', flexDirection: isMobile ? 'row' : 'column', alignItems: 'center', position: 'relative', minHeight: isMobile ? 'auto' : '600px', minWidth: isMobile ? 'max-content' : 'auto' }}>
        {/* The line */}
        <div style={{ 
          position: 'absolute', 
          top: isMobile ? '50%' : '20px', 
          bottom: isMobile ? 'auto' : '20px', 
          left: isMobile ? '20px' : (isSidebarOpen ? '50%' : '60px'), 
          right: isMobile ? '20px' : 'auto',
          width: isMobile ? 'auto' : '2px', 
          height: isMobile ? '2px' : 'auto',
          backgroundColor: 'var(--bg-tertiary)', 
          transform: isMobile ? 'translateY(-50%)' : 'translateX(-50%)', 
          zIndex: 0, 
          transition: 'all 0.3s' 
        }}></div>
        
        {dates.map((date, i) => {
          const isSelected = selectedDate.getDate() === date.getDate() && selectedDate.getMonth() === date.getMonth();
          const today = isToday(date);
          
          // Find tasks with deadline on this date
          const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
          const dayTasks = tasks.filter(t => t.deadline === dateStr);
          
          return (
            <div key={i} style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: 'center', width: isMobile ? '80px' : '100%', flexShrink: 0, zIndex: 1, margin: isMobile ? '0 0.5rem' : '1rem 0', position: 'relative' }}>
              <div style={{ 
                width: isMobile ? '100%' : (isSidebarOpen ? '100%' : '120px'), 
                display: 'flex', 
                justifyContent: 'center',
                alignItems: 'center',
                transition: 'width 0.3s'
              }}>
                <button 
                  onClick={() => setSelectedDate(date)}
                  style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    border: isSelected ? '3px solid var(--accent-primary)' : '2px solid var(--bg-tertiary)',
                    backgroundColor: isSelected ? 'var(--bg-primary)' : 'var(--bg-secondary)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: isSelected ? 'var(--shadow-glow)' : 'var(--shadow-sm)',
                    position: 'relative',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: today ? 'var(--accent-primary)' : 'var(--text-primary)',
                    fontWeight: isSelected || today ? 'bold' : 'normal',
                  }}
                >
                  <div style={{ fontSize: '0.85rem', lineHeight: '1.1' }}>{date.getMonth() + 1}/{date.getDate()}</div>
                  <div style={{ fontSize: '0.65rem' }}>({getDayName(date)})</div>
                </button>
              </div>

              {/* Deadline Tasks */}
              {!isSidebarOpen && !isMobile && (
                <div style={{ flex: 1, paddingLeft: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', overflow: 'hidden' }}>
                  {dayTasks.map(t => (
                    <div 
                      key={t.id} 
                      style={{
                        fontSize: '0.7rem',
                        padding: '2px 6px',
                        background: `var(--sticky-${t.color || 'yellow'})`,
                        color: '#1e293b',
                        borderRadius: '4px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        boxShadow: 'var(--shadow-sm)'
                      }}
                    >
                      {t.title}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
