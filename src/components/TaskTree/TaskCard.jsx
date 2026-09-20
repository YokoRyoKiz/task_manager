import React from 'react';
import { Network, Trash2, Calendar } from 'lucide-react';

export default function TaskCard({ task, isInteracting, isHeld, onPointerDown, onSplitClick, onDelete }) {
  return (
    <div 
      className="glass-panel"
      style={{
        position: 'absolute',
        left: task.x,
        top: task.y,
        width: '200px',
        minHeight: '100px',
        padding: '1rem',
        cursor: 'grab',
        background: `var(--sticky-${task.color || 'yellow'})`,
        color: '#1e293b',
        boxShadow: isHeld ? 'var(--shadow-xl)' : 'var(--shadow-md)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: isHeld || isInteracting ? 50 : 10,
        touchAction: 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        WebkitTouchCallout: 'none',
        transform: isHeld ? 'scale(1.05)' : 'scale(1)',
        transition: 'transform 0.2s, box-shadow 0.2s',
        opacity: isHeld ? 0.95 : 1
      }}
      onPointerDown={(e) => {
        e.stopPropagation();
        onPointerDown(e, task);
        e.currentTarget.setPointerCapture(e.pointerId);
      }}
    >
      <div style={{ flex: 1, fontWeight: 600, marginBottom: '0.5rem', wordBreak: 'break-word' }}>
        {task.title}
      </div>
      
      {task.deadline && (
        <div style={{ fontSize: '0.75rem', color: '#475569', display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
          <Calendar size={12} style={{ marginRight: '4px' }} />
          {task.deadline.replace(/-/g, '/')}
        </div>
      )}
      
      {task.progress > 0 && (
        <div style={{ width: '100%', height: '4px', background: 'rgba(0,0,0,0.1)', borderRadius: '2px', marginTop: 'auto', marginBottom: '0.5rem' }}>
          <div style={{ width: `${task.progress}%`, height: '100%', background: 'rgba(0,0,0,0.4)', borderRadius: '2px' }} />
        </div>
      )}
      
      <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(0,0,0,0.1)', paddingTop: '0.5rem' }}>
        <button 
          className="btn-icon" 
          title="タスクを分解"
          style={{ padding: '0.25rem', color: '#475569' }}
          onClick={(e) => {
            e.stopPropagation();
            onSplitClick(task);
          }}
        >
          <Network size={16} />
        </button>
        <button 
          className="btn-icon" 
          title="削除"
          style={{ padding: '0.25rem', color: '#ef4444' }}
          onClick={(e) => {
            e.stopPropagation();
            onDelete(task.id);
          }}
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}
