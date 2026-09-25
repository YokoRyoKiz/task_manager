import React, { useState, useRef } from 'react';
import { Network, Trash2, Calendar, Check, X } from 'lucide-react';

export default function TaskCard({ task, isInteracting, isHeld, onPointerDown, onPointerMove, onPointerUp, onSplitClick, onDelete, onRename }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(task.title);
  const inputRef = useRef(null);

  // Double-tap detection for mobile
  const lastTapRef = useRef(0);

  const handleDoubleClick = (e) => {
    if (e.target.closest('button')) return;
    e.stopPropagation();
    startEdit();
  };

  const handleTap = (e) => {
    if (e.target.closest('button')) return;
    const now = Date.now();
    if (now - lastTapRef.current < 350) {
      e.stopPropagation();
      startEdit();
    }
    lastTapRef.current = now;
  };

  const startEdit = () => {
    setEditValue(task.title);
    setIsEditing(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const commitEdit = () => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== task.title) {
      onRename?.(task.id, trimmed);
    }
    setIsEditing(false);
  };

  const cancelEdit = () => {
    setEditValue(task.title);
    setIsEditing(false);
  };

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
        cursor: isHeld ? 'grabbing' : isEditing ? 'default' : 'grab',
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
        transition: isHeld ? 'transform 0.1s, box-shadow 0.1s' : 'transform 0.2s, box-shadow 0.2s',
        opacity: isHeld ? 0.95 : 1
      }}
      onPointerDown={(e) => {
        if (isEditing) return;
        if (e.target.closest('button') || e.target.closest('input')) return;
        e.stopPropagation();
        try { e.currentTarget.setPointerCapture(e.pointerId); } catch (_) {}
        handleTap(e);
        onPointerDown(e, task);
      }}
      onPointerMove={(e) => {
        if (isEditing) return;
        if (e.target.closest('button')) return;
        onPointerMove?.(e, task);
      }}
      onPointerUp={(e) => {
        if (isEditing) return;
        if (e.target.closest('button')) return;
        onPointerUp?.(e, task);
      }}
      onPointerCancel={(e) => {
        if (!isEditing) onPointerUp?.(e, task);
      }}
      onDoubleClick={handleDoubleClick}
    >
      {/* Title area */}
      <div style={{ flex: 1, fontWeight: 600, marginBottom: '0.5rem', wordBreak: 'break-word' }}>
        {isEditing ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <input
              ref={inputRef}
              value={editValue}
              onChange={e => setEditValue(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') commitEdit();
                if (e.key === 'Escape') cancelEdit();
                e.stopPropagation();
              }}
              onClick={e => e.stopPropagation()}
              onPointerDown={e => e.stopPropagation()}
              style={{
                width: '100%',
                padding: '0.25rem 0.5rem',
                borderRadius: '8px',
                border: '2px solid rgba(0,0,0,0.2)',
                background: 'rgba(255,255,255,0.7)',
                fontFamily: 'inherit',
                fontWeight: 600,
                fontSize: '0.9rem',
                outline: 'none',
                color: '#1e293b',
                userSelect: 'text',
                WebkitUserSelect: 'text',
              }}
            />
            <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'flex-end' }}>
              <button
                onClick={e => { e.stopPropagation(); commitEdit(); }}
                onPointerDown={e => e.stopPropagation()}
                style={{
                  padding: '2px 8px',
                  borderRadius: '6px',
                  border: 'none',
                  background: 'rgba(0,0,0,0.2)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  color: '#1e293b',
                }}
              >
                <Check size={12} />
              </button>
              <button
                onClick={e => { e.stopPropagation(); cancelEdit(); }}
                onPointerDown={e => e.stopPropagation()}
                style={{
                  padding: '2px 8px',
                  borderRadius: '6px',
                  border: 'none',
                  background: 'rgba(0,0,0,0.1)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  color: '#1e293b',
                }}
              >
                <X size={12} />
              </button>
            </div>
          </div>
        ) : (
          <span title="ダブルタップで名前変更">{task.title}</span>
        )}
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
      
      <div 
        style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(0,0,0,0.1)', paddingTop: '0.5rem', pointerEvents: 'auto' }}
        onPointerDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button 
          className="btn-icon" 
          title="タスクを分解"
          style={{ padding: '0.25rem', color: '#475569', cursor: 'pointer', zIndex: 20 }}
          onPointerDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
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
          style={{ padding: '0.25rem', color: '#ef4444', cursor: 'pointer', zIndex: 20 }}
          onPointerDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
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
