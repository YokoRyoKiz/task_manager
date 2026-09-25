import React, { useState, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Trash2 } from 'lucide-react';
import AddScheduleModal from './AddScheduleModal';
import { createSchedule, deletePage, updateSchedule } from '../../api/notion';
import { useAuth } from '../../context/AuthContext';

export default function Timetable({ date, items, setItems, onExternalDropRef, isMobile = false }) {
  const { currentUser } = useAuth();
  const [scale, setScale] = useState(1);
  const hourHeight = 60 * scale;
  const hours = Array.from({ length: 24 }).map((_, i) => i);
  const containerRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartInfo, setDragStartInfo] = useState(null);
  const [tempItem, setTempItem] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [interactingItem, setInteractingItem] = useState(null);

  // Filter items for current date
  const currentItems = items.filter(item => {
    const itemDate = new Date(item.date);
    return itemDate.getDate() === date.getDate() && itemDate.getMonth() === date.getMonth();
  });

  const getHourFromY = (clientY) => {
    if (!containerRef.current) return 0;
    const rect = containerRef.current.getBoundingClientRect();
    const y = clientY - rect.top;
    const hour = Math.max(0, Math.min(24, y / hourHeight));
    return hour;
  };

  const longPressTimerRef = useRef(null);

  const handlePointerDown = (e) => {
    if (!e.isPrimary) return;
    // Only start drag if clicking on the empty background, not on an item
    if (e.target.closest('.schedule-item')) return;
    
    if (isMobile) {
      const clientY = e.clientY;
      const pointerId = e.pointerId;
      const target = e.target;
      
      longPressTimerRef.current = setTimeout(() => {
        setIsDragging(true);
        const startHour = getHourFromY(clientY);
        const snappedStart = Math.floor(startHour * 4) / 4;
        
        setDragStartInfo({ startHour: snappedStart });
        setTempItem({
          id: 'temp',
          title: '新しい予定',
          startHour: snappedStart,
          endHour: snappedStart + 0.5,
          color: 'blue'
        });
        
        if (navigator.vibrate) navigator.vibrate(50);
        try { target.setPointerCapture(pointerId); } catch(err){}
        longPressTimerRef.current = null;
      }, 250); // 250ms long press to start creating
    } else {
      setIsDragging(true);
      const startHour = getHourFromY(e.clientY);
      const snappedStart = Math.floor(startHour * 4) / 4;
      
      setDragStartInfo({ startHour: snappedStart });
      setTempItem({
        id: 'temp',
        title: '新しい予定',
        startHour: snappedStart,
        endHour: snappedStart + 0.5,
        color: 'blue'
      });
      
      try { e.target.setPointerCapture(e.pointerId); } catch (err) {}
    }
  };

  const handlePointerMove = (e) => {
    if (longPressTimerRef.current && !isDragging) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    if (isDragging && tempItem) {
      const currentHour = getHourFromY(e.clientY);
      const snappedCurrent = Math.ceil(currentHour * 4) / 4;
      
      const newStart = Math.min(dragStartInfo.startHour, snappedCurrent);
      const newEnd = Math.max(dragStartInfo.startHour, snappedCurrent);
      
      // Ensure at least 15 min duration
      const finalEnd = Math.max(newEnd, newStart + 0.25);
      
      setTempItem({
        ...tempItem,
        startHour: newStart,
        endHour: finalEnd
      });
    } else if (interactingItem) {
      const deltaY = e.clientY - interactingItem.startY;
      const deltaHour = Math.round(deltaY / hourHeight * 4) / 4;
      
      if (interactingItem.type === 'move') {
        const newStart = Math.max(0, interactingItem.origStartHour + deltaHour);
        const newEnd = Math.min(24, interactingItem.origEndHour + deltaHour);
        setItems(prev => prev.map(t => t.id === interactingItem.id ? { ...t, startHour: newStart, endHour: newEnd } : t));
      } else if (interactingItem.type === 'resize') {
        const newEnd = Math.max(interactingItem.origStartHour + 0.25, Math.min(24, interactingItem.origEndHour + deltaHour));
        setItems(prev => prev.map(t => t.id === interactingItem.id ? { ...t, endHour: newEnd } : t));
      }
    }
  };

  const handlePointerUp = (e) => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    if (isDragging) {
      setIsDragging(false);
      try {
        e.target.releasePointerCapture(e.pointerId);
      } catch (err) {}
      
      if (tempItem) {
        setShowModal(true);
      }
    } else if (interactingItem) {
      const updatedItem = items.find(t => t.id === interactingItem.id);
      if (updatedItem) {
        updateSchedule(updatedItem.id, {
          startHour: updatedItem.startHour,
          endHour: updatedItem.endHour
        }).catch(console.error);
      }
      setInteractingItem(null);
      try { e.target.releasePointerCapture(e.pointerId); } catch (err) {}
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault(); // allow drop
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    const taskDataStr = e.dataTransfer.getData('application/json');
    if (!taskDataStr) return;
    
    try {
      const task = JSON.parse(taskDataStr);
      await createItemFromTask(task, e.clientY);
    } catch (err) {
      console.error('Error handling dropped task:', err);
    }
  };

  const createItemFromTask = async (task, clientY) => {
    const dropHour = getHourFromY(clientY);
    const snappedStart = Math.floor(dropHour * 4) / 4;
    
    const tempId = uuidv4();
    const newItem = {
      id: tempId,
      title: task.title,
      date: date.toISOString(),
      startHour: snappedStart,
      endHour: snappedStart + 1,
      color: task.color || 'blue'
    };
    
    setItems(prev => [...prev, newItem]);
    
    try {
      const realId = await createSchedule(newItem, currentUser?.id || null);
      setItems(prev => prev.map(t => t.id === tempId ? { ...t, id: realId } : t));
    } catch (err) {
      console.error('Error creating schedule in Notion:', err);
    }
  };

  useEffect(() => {
    if (onExternalDropRef) {
      onExternalDropRef.current = (task, clientY) => {
        createItemFromTask(task, clientY);
      };
    }
  }, [onExternalDropRef, date, items]);

  const handleModalConfirm = async (title) => {
    if (tempItem) {
      const tempId = uuidv4();
      const newItem = {
        id: tempId,
        title: title,
        date: date.toISOString(),
        startHour: tempItem.startHour,
        endHour: tempItem.endHour,
        color: ['blue', 'pink', 'yellow', 'green'][Math.floor(Math.random() * 4)]
      };
      setItems([...items, newItem]);
      
      try {
        const realId = await createSchedule(newItem, currentUser?.id || null);
        setItems(prev => prev.map(t => t.id === tempId ? { ...t, id: realId } : t));
      } catch (err) {
        console.error('Failed to create schedule in Notion', err);
      }
    }
    setShowModal(false);
    setTempItem(null);
  };

  const handleModalClose = () => {
    setShowModal(false);
    setTempItem(null);
  };

  const deleteItem = (id) => {
    setItems(items.filter(item => item.id !== id));
    deletePage(id).catch(console.error);
  };

  useEffect(() => {
    const handleTouchMoveNative = (e) => {
      if (isDragging) {
        e.preventDefault(); // Prevent native scroll taking over and firing pointercancel
      }
    };
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('touchmove', handleTouchMoveNative, { passive: false });
      return () => container.removeEventListener('touchmove', handleTouchMoveNative);
    }
  }, [isDragging]);

  const formatTime = (hour) => {
    const h = Math.floor(hour);
    const m = Math.round((hour - h) * 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  const initialTouchRef = useRef(null);
  const scrollContainerRef = useRef(null);

  const handleTouchStart = (e) => {
    if (!isMobile) return;
    if (e.touches.length === 2) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.abs(touch1.clientY - touch2.clientY);
      
      initialTouchRef.current = {
        distance,
        initialScale: scale
      };
    }
  };

  const handleTouchMove = (e) => {
    if (!isMobile) return;
    if (e.touches.length === 2 && initialTouchRef.current) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const currentDistance = Math.abs(touch1.clientY - touch2.clientY);

      const { distance, initialScale } = initialTouchRef.current;
      
      if (distance > 10) { 
        const ratio = currentDistance / distance;
        const newScale = Math.min(Math.max(0.5, initialScale * ratio), 3);
        setScale(newScale);
      }
    }
  };

  const handleTouchEnd = (e) => {
    if (!isMobile) return;
    if (e.touches.length < 2) {
      initialTouchRef.current = null;
    }
  };

  const renderItem = (item, isTemp = false) => {
    const top = item.startHour * hourHeight;
    const height = (item.endHour - item.startHour) * hourHeight;
    
    return (
      <div
        key={item.id}
        className={`schedule-item glass-panel ${isTemp ? 'animate-pulse' : 'animate-fade-in'}`}
        style={{
          position: 'absolute',
          top: `${top}px`,
          height: `${height}px`,
          left: '60px',
          right: '10px',
          background: `var(--sticky-${item.color})`,
          color: '#1e293b',
          padding: '0.25rem 0.5rem',
          fontSize: '0.875rem',
          borderRadius: '4px',
          display: 'flex',
          flexDirection: 'column',
          zIndex: isTemp ? 10 : 5,
          opacity: isTemp ? 0.7 : 1,
          overflow: 'hidden',
          boxShadow: 'var(--shadow-sm)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ fontWeight: 600 }}>{item.title}</div>
          {!isTemp && (
            <button 
              className="btn-icon" 
              onClick={(e) => { e.stopPropagation(); deleteItem(item.id); }}
              style={{ padding: '2px', color: 'rgba(0,0,0,0.5)' }}
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
        <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>
          {formatTime(item.startHour)} - {formatTime(item.endHour)}
        </div>
        
        {/* Top Move Handle */}
        {!isTemp && (
          <div
            style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '15px', cursor: 'move', zIndex: 20 }}
            onPointerDown={(e) => {
              e.stopPropagation();
              setInteractingItem({
                id: item.id,
                type: 'move',
                startY: e.clientY,
                origStartHour: item.startHour,
                origEndHour: item.endHour
              });
              e.currentTarget.setPointerCapture(e.pointerId);
            }}
          />
        )}
        
        {/* Bottom Resize Handle */}
        {!isTemp && (
          <div
            style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '15px', cursor: 'ns-resize', zIndex: 20 }}
            onPointerDown={(e) => {
              e.stopPropagation();
              setInteractingItem({
                id: item.id,
                type: 'resize',
                startY: e.clientY,
                origStartHour: item.startHour,
                origEndHour: item.endHour
              });
              e.currentTarget.setPointerCapture(e.pointerId);
            }}
          />
        )}
      </div>
    );
  };

  return (
    <div 
      className="glass-panel" 
      ref={scrollContainerRef}
      style={{ 
        flex: 1, 
        overflowY: 'auto', 
        position: 'relative',
        touchAction: isMobile ? 'pan-y' : 'auto' 
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      <div 
        id="timetable-drop-zone"
        ref={containerRef}
        style={{ 
          position: 'relative', 
          height: `${24 * hourHeight}px`, 
          width: '100%',
          userSelect: 'none'
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {/* Background grid */}
        {hours.map(hour => (
          <div 
            key={hour} 
            style={{ 
              position: 'absolute', 
              top: `${hour * hourHeight}px`, 
              width: '100%', 
              height: `${hourHeight}px`,
              borderBottom: '1px dashed var(--bg-tertiary)',
              display: 'flex',
              pointerEvents: 'none'
            }}
          >
            <div style={{ width: '50px', textAlign: 'right', paddingRight: '10px', color: 'var(--text-secondary)', fontSize: '0.875rem', transform: 'translateY(-10px)' }}>
              {hour}:00
            </div>
            <div style={{ flex: 1, borderLeft: '1px solid var(--bg-tertiary)' }}></div>
          </div>
        ))}
        
        {/* Actual items */}
        {currentItems.map(item => renderItem(item))}
        
        {/* Temporary item while dragging */}
        {tempItem && !showModal && renderItem(tempItem, true)}
      </div>

      {showModal && tempItem && (
        <AddScheduleModal
          initialStart={tempItem.startHour}
          initialEnd={tempItem.endHour}
          onClose={handleModalClose}
          onConfirm={handleModalConfirm}
        />
      )}
    </div>
  );
}
