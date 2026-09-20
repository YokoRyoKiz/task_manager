import React, { useState } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

export default function SplitModal({ parentTask, onClose, onConfirm }) {
  const [subtasks, setSubtasks] = useState([
    { id: uuidv4(), title: '', deadline: '' }
  ]);

  const addSubtask = () => {
    setSubtasks([...subtasks, { id: uuidv4(), title: '', deadline: '' }]);
  };

  const removeSubtask = (id) => {
    if (subtasks.length > 1) {
      setSubtasks(subtasks.filter(t => t.id !== id));
    }
  };

  const updateSubtask = (id, field, value) => {
    setSubtasks(subtasks.map(t => t.id === id ? { ...t, [field]: value } : t));
  };

  const handleConfirm = () => {
    const validTasks = subtasks.filter(t => t.title.trim() !== '');
    if (validTasks.length > 0) {
      onConfirm(parentTask, validTasks);
    } else {
      onClose();
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
        width: '800px',
        maxWidth: '90vw',
        maxHeight: '80vh',
        backgroundColor: 'var(--bg-secondary)',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: 'var(--shadow-lg)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', borderBottom: '1px solid var(--bg-tertiary)' }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem' }}>タスクの分解</h2>
          <button className="btn-icon" onClick={onClose}><X size={20} /></button>
        </div>
        
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Left Side: Parent Task */}
          <div style={{ flex: 1, padding: '2rem', borderRight: '1px solid var(--bg-tertiary)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <h3 style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>親タスク</h3>
            <div style={{
              width: '100%',
              padding: '1.5rem',
              background: `var(--sticky-${parentTask.color || 'yellow'})`,
              color: '#1e293b',
              borderRadius: '8px',
              fontSize: '1.25rem',
              fontWeight: 600,
              boxShadow: 'var(--shadow-md)',
              textAlign: 'center',
              wordBreak: 'break-word'
            }}>
              {parentTask.title}
            </div>
          </div>
          
          {/* Right Side: Decomposed Tasks */}
          <div style={{ flex: 1.5, padding: '1.5rem', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ color: 'var(--text-secondary)', margin: 0 }}>分解後のタスク</h3>
              <button className="btn btn-primary" onClick={addSubtask} style={{ padding: '0.25rem 0.5rem', fontSize: '0.875rem' }}>
                <Plus size={16} /> 追加
              </button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {subtasks.map((t, index) => (
                <div key={t.id} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-secondary)', width: '24px' }}>{index + 1}.</span>
                  <div style={{ display: 'flex', flex: 1, gap: '0.5rem' }}>
                    <input 
                      type="text" 
                      value={t.title}
                      onChange={(e) => updateSubtask(t.id, 'title', e.target.value)}
                      placeholder="タスク名"
                      style={{
                        flex: 1,
                        padding: '0.75rem',
                        borderRadius: '8px',
                        border: '1px solid var(--bg-tertiary)',
                        background: 'var(--bg-primary)',
                        color: 'var(--text-primary)',
                        outline: 'none',
                      }}
                      autoFocus={index === subtasks.length - 1}
                    />
                    <input
                      type="date"
                      value={t.deadline}
                      onChange={(e) => updateSubtask(t.id, 'deadline', e.target.value)}
                      onClick={(e) => e.target.showPicker && e.target.showPicker()}
                      title="締め切りを設定"
                      style={{
                        width: '130px',
                        padding: '0.75rem',
                        borderRadius: '8px',
                        border: '1px solid var(--bg-tertiary)',
                        background: 'var(--bg-primary)',
                        color: 'var(--text-primary)',
                        outline: 'none',
                        cursor: 'pointer'
                      }}
                    />
                  </div>
                  <button 
                    className="btn-icon" 
                    onClick={() => removeSubtask(t.id)}
                    disabled={subtasks.length === 1}
                    style={{ color: subtasks.length === 1 ? 'var(--text-secondary)' : 'var(--accent-danger)' }}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        <div style={{ padding: '1rem', borderTop: '1px solid var(--bg-tertiary)', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
          <button className="btn" onClick={onClose} style={{ border: '1px solid var(--bg-tertiary)' }}>キャンセル</button>
          <button className="btn btn-primary" onClick={handleConfirm}>確定する</button>
        </div>
      </div>
    </div>
  );
}
