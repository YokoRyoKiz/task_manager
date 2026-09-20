import React, { useState, useEffect, useRef } from 'react';
import TimelineSlider from '../components/Schedule/TimelineSlider';
import Timetable from '../components/Schedule/Timetable';
import ScheduleTaskbar from '../components/Schedule/ScheduleTaskbar';
import { fetchSchedules, fetchTaskTree } from '../api/notion';
import { List } from 'lucide-react';

export default function SchedulePage() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const [items, setItems] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  // Global Drag State
  const [draggedTask, setDraggedTask] = useState(null);
  const onExternalDropRef = useRef(null);

  useEffect(() => {
    Promise.all([fetchSchedules(), fetchTaskTree()])
      .then(([schedulesData, taskData]) => {
        setItems(schedulesData);
        setTasks(taskData.tasks);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch data from Notion:', err);
        setLoading(false);
      });

    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleTaskDragStart = (task, e) => {
    setDraggedTask({
      task,
      x: e.clientX,
      y: e.clientY
    });
  };

  const handlePointerMove = (e) => {
    if (draggedTask) {
      setDraggedTask(prev => ({
        ...prev,
        x: e.clientX,
        y: e.clientY
      }));
    }
  };

  const handlePointerUp = (e) => {
    if (draggedTask) {
      // Check if dropped over timetable
      const dropZone = document.getElementById('timetable-drop-zone');
      if (dropZone) {
        const rect = dropZone.getBoundingClientRect();
        if (
          e.clientX >= rect.left && e.clientX <= rect.right &&
          e.clientY >= rect.top && e.clientY <= rect.bottom
        ) {
          if (onExternalDropRef.current) {
            onExternalDropRef.current(draggedTask.task, e.clientY);
          }
        }
      }
      setDraggedTask(null);
    }
  };

  return (
    <div 
      className="schedule-container" 
      style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'row', gap: '1rem', padding: '1rem', maxWidth: '1200px', margin: '0 auto', width: '100%', overflow: 'hidden' }}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      <div className={`schedule-timeline ${isSidebarOpen ? 'mobile-hidden' : ''}`} style={{ display: 'flex', height: isMobile ? 'auto' : '100%' }}>
        <TimelineSlider selectedDate={selectedDate} setSelectedDate={setSelectedDate} tasks={tasks} isSidebarOpen={isSidebarOpen} isMobile={isMobile} />
      </div>
      
      {/* Mobile horizontal taskbar inside the flex column */}
      {isMobile && (
        <ScheduleTaskbar 
          isOpen={true} 
          onClose={() => {}} 
          tasks={tasks} 
          onTaskDragStart={handleTaskDragStart}
          isMobile={true}
        />
      )}

      {loading ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="animate-pulse">Loading from Notion...</div>
        </div>
      ) : (
        <Timetable date={selectedDate} items={items} setItems={setItems} onExternalDropRef={onExternalDropRef} isMobile={isMobile} />
      )}

      {/* Sidebar Toggle Button - Desktop only */}
      {!isMobile && !isSidebarOpen && (
        <div className="schedule-toggle-btn" style={{ position: 'absolute', top: '1rem', right: '1rem', zIndex: 50 }}>
          <button 
            className="btn-icon glass-panel" 
            style={{ width: '36px', height: '36px', background: 'var(--bg-secondary)' }} 
            onClick={() => setIsSidebarOpen(true)}
            title="タスク一覧を開く"
          >
            <List size={18} />
          </button>
        </div>
      )}

      {!isMobile && (
        <ScheduleTaskbar 
          isOpen={isSidebarOpen} 
          onClose={() => setIsSidebarOpen(false)} 
          tasks={tasks} 
          onTaskDragStart={handleTaskDragStart}
          isMobile={false}
        />
      )}

      {/* Ghost Element for Dragging */}
      {draggedTask && (
        <div
          style={{
            position: 'fixed',
            left: draggedTask.x,
            top: draggedTask.y,
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none',
            zIndex: 9999,
            padding: '0.75rem',
            borderLeft: `4px solid var(--sticky-${draggedTask.task.color || 'yellow'})`,
            background: 'var(--bg-secondary)',
            boxShadow: 'var(--shadow-lg)',
            borderRadius: '8px',
            opacity: 0.8,
            fontSize: '0.875rem',
            fontWeight: 600,
            color: 'var(--text-primary)',
            width: '250px'
          }}
        >
          {draggedTask.task.title}
        </div>
      )}
    </div>
  );
}
