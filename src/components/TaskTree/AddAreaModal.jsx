import React, { useState } from 'react';
import { X } from 'lucide-react';

export default function AddAreaModal({ onClose, onConfirm }) {
  const [name, setName] = useState('');
  const [color, setColor] = useState('rgba(255, 255, 255, 0.1)'); // default subtle white
  
  const colors = [
    { label: '白 (半透明)', value: 'rgba(255, 255, 255, 0.1)' },
    { label: '赤 (半透明)', value: 'rgba(239, 68, 68, 0.2)' },
    { label: '青 (半透明)', value: 'rgba(59, 130, 246, 0.2)' },
    { label: '緑 (半透明)', value: 'rgba(16, 185, 129, 0.2)' },
    { label: '黄 (半透明)', value: 'rgba(245, 158, 11, 0.2)' }
  ];

  const handleConfirm = () => {
    if (name.trim()) {
      onConfirm(name.trim(), color);
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
          <h2 style={{ margin: 0, fontSize: '1.25rem' }}>領域の作成</h2>
          <button className="btn-icon" onClick={onClose}><X size={20} /></button>
        </div>
        
        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>領域の名前 (必須)</label>
            <input 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例: フェーズ1"
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
                if (e.key === 'Enter' && name.trim()) handleConfirm();
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>色</label>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {colors.map(c => (
                <button
                  key={c.value}
                  onClick={() => setColor(c.value)}
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    backgroundColor: c.value,
                    border: color === c.value ? '2px solid white' : '1px solid var(--bg-tertiary)',
                    cursor: 'pointer'
                  }}
                  title={c.label}
                />
              ))}
            </div>
          </div>
        </div>
        
        <div style={{ padding: '1.25rem', borderTop: '1px solid var(--bg-tertiary)', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
          <button className="btn" onClick={onClose} style={{ border: '1px solid var(--bg-tertiary)' }}>キャンセル</button>
          <button className="btn btn-primary" onClick={handleConfirm} disabled={!name.trim()}>追加する</button>
        </div>
      </div>
    </div>
  );
}
