import React, { useState } from 'react';
import { X, Calendar } from 'lucide-react';

export default function AddTaskModal({ onClose, onConfirm }) {
  const [title, setTitle] = useState('');
  const [deadline, setDeadline] = useState('');

  const handleConfirm = () => {
    if (title.trim()) {
      onConfirm(title.trim(), deadline);
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
        width: '500px',
        maxWidth: '90vw',
        backgroundColor: 'var(--bg-secondary)',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: 'var(--shadow-lg)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1.25rem', borderBottom: '1px solid var(--bg-tertiary)' }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem' }}>新しいタスクを追加</h2>
          <button className="btn-icon" onClick={onClose}><X size={20} /></button>
        </div>
        
        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>タイトル (必須)</label>
            <input 
              type="text" 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="タスクのタイトル..."
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
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>締め切り (任意)</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Calendar size={18} style={{ position: 'absolute', left: '1rem', color: 'var(--text-secondary)', pointerEvents: 'none' }} />
              <input 
                type="date" 
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                onClick={(e) => e.target.showPicker && e.target.showPicker()}
                style={{
                  width: '100%',
                  padding: '0.75rem 0.75rem 0.75rem 2.5rem',
                  borderRadius: '8px',
                  border: '1px solid var(--bg-tertiary)',
                  background: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  outline: 'none',
                  fontSize: '1rem',
                  fontFamily: 'inherit'
                }}
              />
            </div>
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
