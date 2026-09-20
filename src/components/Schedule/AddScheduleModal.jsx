import React, { useState } from 'react';
import { X } from 'lucide-react';

export default function AddScheduleModal({ initialStart, initialEnd, onClose, onConfirm }) {
  const [title, setTitle] = useState('');
  
  const formatTime = (hour) => {
    const h = Math.floor(hour);
    const m = Math.round((hour - h) * 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  const handleConfirm = () => {
    if (title.trim()) {
      onConfirm(title.trim());
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      backdropFilter: 'blur(4px)'
    }}>
      <div className="glass-panel" style={{
        width: '400px',
        maxWidth: '90vw',
        backgroundColor: 'var(--bg-secondary)',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: 'var(--shadow-lg)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1.25rem', borderBottom: '1px solid var(--bg-tertiary)' }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem' }}>予定を追加</h2>
          <button className="btn-icon" onClick={onClose}><X size={20} /></button>
        </div>
        
        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            時間: {formatTime(initialStart)} - {formatTime(initialEnd)}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>タイトル (必須)</label>
            <input 
              type="text" 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="予定のタイトル..."
              autoFocus
              style={{
                padding: '0.75rem',
                borderRadius: '8px',
                border: '1px solid var(--bg-tertiary)',
                background: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                outline: 'none',
                fontSize: '1rem'
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && title.trim()) {
                  handleConfirm();
                }
              }}
            />
          </div>
        </div>
        
        <div style={{ padding: '1.25rem', borderTop: '1px solid var(--bg-tertiary)', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
          <button className="btn" onClick={onClose} style={{ border: '1px solid var(--bg-tertiary)' }}>キャンセル</button>
          <button className="btn btn-primary" onClick={handleConfirm} disabled={!title.trim()}>追加する</button>
        </div>
      </div>
    </div>
  );
}
