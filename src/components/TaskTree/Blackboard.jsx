import React, { useState, useRef, useEffect } from 'react';
import TaskCard from './TaskCard';
import SplitModal from './SplitModal';
import AddTaskModal from './AddTaskModal';
import AddAreaModal from './AddAreaModal';
import { createTask, updateTask, deletePage, createArea, updateArea } from '../../api/notion';
import { v4 as uuidv4 } from 'uuid';
import { Plus, List, ChevronRight, X, Trash2 } from 'lucide-react';

export default function Blackboard({ tasks, setTasks, areas = [], setAreas }) {
  const [pan, setPan] = useState({ 
    x: typeof window !== 'undefined' ? window.innerWidth / 2 : 0, 
    y: typeof window !== 'undefined' ? window.innerHeight / 2 : 0 
  });
  const [scale, setScale] = useState(0.5);
  
  const [isDrawingArea, setIsDrawingArea] = useState(false);
  const [areaStart, setAreaStart] = useState({ x: 0, y: 0 });
  const [currentArea, setCurrentArea] = useState(null);
  const [showAreaModal, setShowAreaModal] = useState(false);
  
  const [interactingArea, setInteractingArea] = useState(null);
  const [interactingTask, setInteractingTask] = useState(null);
  const [pendingTask, setPendingTask] = useState(null);
  const holdTimerRef = useRef(null);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [flippedTaskId, setFlippedTaskId] = useState(null);
  const [flippedTaskProgress, setFlippedTaskProgress] = useState(0);

  const [splitTask, setSplitTask] = useState(null);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const boardRef = useRef(null);

  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState(null);
  const pointerStartRef = useRef(null);
  const bgHoldTimerRef = useRef(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const colors = ['yellow', 'pink', 'blue', 'green'];

  // --- Spatial Sorting Algorithm ---
  const sortedTasks = React.useMemo(() => {
    if (!tasks || tasks.length === 0) return [];
    
    let unvisited = [...tasks];
    let sortedList = [];
    const PROXIMITY_THRESHOLD = 500; // pixels
    
    while (unvisited.length > 0) {
      // Find the topmost task in remaining unvisited
      let topmostIdx = 0;
      for (let i = 1; i < unvisited.length; i++) {
        if (unvisited[i].y < unvisited[topmostIdx].y) {
          topmostIdx = i;
        }
      }
      
      let currentTask = unvisited[topmostIdx];
      unvisited.splice(topmostIdx, 1);
      sortedList.push(currentTask);
      
      // Chain nearby tasks
      let keepChaining = true;
      while (keepChaining && unvisited.length > 0) {
        let nearestIdx = -1;
        let minDistance = Infinity;
        
        for (let i = 0; i < unvisited.length; i++) {
          const dx = unvisited[i].x - currentTask.x;
          const dy = unvisited[i].y - currentTask.y;
          const dist = Math.sqrt(dx*dx + dy*dy);
          
          if (dist < minDistance) {
            minDistance = dist;
            nearestIdx = i;
          }
        }
        
        if (minDistance <= PROXIMITY_THRESHOLD) {
          currentTask = unvisited[nearestIdx];
          unvisited.splice(nearestIdx, 1);
          sortedList.push(currentTask);
        } else {
          keepChaining = false; // no tasks close enough, break chain to find next topmost
        }
      }
    }
    
    return sortedList;
  }, [tasks]);

  // Wheel to pan/zoom
  const handleWheel = (e) => {
    if (e.ctrlKey || e.metaKey) {
      // Browser might zoom if not prevented, but we can also manually zoom here
      // For reliable zoom without preventDefault passive warning, UI buttons are better
      // But we can support trackpad pinch zoom (which sets ctrlKey)
      const zoomFactor = -e.deltaY * 0.005;
      setScale(prev => Math.min(Math.max(0.1, prev + zoomFactor), 3));
    } else {
      setPan(prev => ({
        x: prev.x - e.deltaX / scale,
        y: prev.y - e.deltaY / scale
      }));
    }
  };

  // Drag to create area or pan
  const handlePointerDown = (e) => {
    if (!e.isPrimary) return;
    if (e.target === boardRef.current) {
      const rect = boardRef.current.getBoundingClientRect();
      const startX = (e.clientX - rect.left - pan.x) / scale;
      const startY = (e.clientY - rect.top - pan.y) / scale;
      
      setIsPanning(true);
      const startData = { clientX: e.clientX, clientY: e.clientY, initialPan: pan };
      setPanStart(startData);
      pointerStartRef.current = startData;
      e.target.setPointerCapture(e.pointerId);

      bgHoldTimerRef.current = setTimeout(() => {
        setIsPanning(false);
        setIsDrawingArea(true);
        setAreaStart({ x: startX, y: startY });
        setCurrentArea({ x: startX, y: startY, width: 0, height: 0 });
        if (navigator.vibrate) navigator.vibrate(50);
        bgHoldTimerRef.current = null;
      }, 250);
    }
  };

  const handlePointerMove = (e) => {
    if (bgHoldTimerRef.current && pointerStartRef.current) {
      const dx = Math.abs(e.clientX - pointerStartRef.current.clientX);
      const dy = Math.abs(e.clientY - pointerStartRef.current.clientY);
      if (dx > 5 || dy > 5) {
        clearTimeout(bgHoldTimerRef.current);
        bgHoldTimerRef.current = null;
      }
    }

    if (pointerStartRef.current && !isDrawingArea) {
      const dx = e.clientX - pointerStartRef.current.clientX;
      const dy = e.clientY - pointerStartRef.current.clientY;
      setPan({ x: pointerStartRef.current.initialPan.x + dx, y: pointerStartRef.current.initialPan.y + dy });
    } else if (isDrawingArea) {
      const rect = boardRef.current.getBoundingClientRect();
      const currentX = (e.clientX - rect.left - pan.x) / scale;
      const currentY = (e.clientY - rect.top - pan.y) / scale;
      
      const x = Math.min(areaStart.x, currentX);
      const y = Math.min(areaStart.y, currentY);
      const width = Math.abs(currentX - areaStart.x);
      const height = Math.abs(currentY - areaStart.y);
      
      setCurrentArea({ x, y, width, height });
    } else if (interactingArea) {
      const rect = boardRef.current.getBoundingClientRect();
      const currentX = (e.clientX - rect.left - pan.x) / scale;
      const currentY = (e.clientY - rect.top - pan.y) / scale;
      
      const dx = currentX - interactingArea.startX;
      const dy = currentY - interactingArea.startY;
      
      if (setAreas) {
        setAreas(prev => prev.map(a => {
          if (a.id === interactingArea.id) {
            if (interactingArea.type === 'move') {
              return { ...a, x: interactingArea.origX + dx, y: interactingArea.origY + dy };
            } else if (interactingArea.type === 'resize-right') {
              return { ...a, width: Math.max(0, interactingArea.origW + dx) };
            } else if (interactingArea.type === 'resize-bottom') {
              return { ...a, height: Math.max(0, interactingArea.origH + dy) };
            } else if (interactingArea.type === 'resize-br') {
              return { 
                ...a, 
                width: Math.max(0, interactingArea.origW + dx),
                height: Math.max(0, interactingArea.origH + dy)
              };
            }
          }
          return a;
        }));
      }
    }
  };

  const handlePointerUp = (e) => {
    if (bgHoldTimerRef.current) {
      clearTimeout(bgHoldTimerRef.current);
      bgHoldTimerRef.current = null;
    }
    
    if (pointerStartRef.current) {
      setIsPanning(false);
      setPanStart(null);
      pointerStartRef.current = null;
      try { e.target.releasePointerCapture(e.pointerId); } catch(err) {}
    }

    if (isDrawingArea) {
      setIsDrawingArea(false);
      try {
        e.target.releasePointerCapture(e.pointerId);
      } catch (err) {}
      
      if (currentArea && currentArea.width > 20 && currentArea.height > 20) {
        setShowAreaModal(true);
      } else {
        setCurrentArea(null);
      }
    } else if (interactingArea) {
      const updatedArea = areas.find(a => a.id === interactingArea.id);
      if (updatedArea) {
        if (updatedArea.width <= 10 || updatedArea.height <= 10) {
          if (window.confirm(`領域「${updatedArea.name}」を削除しますか？`)) {
            setAreas(prev => prev.filter(a => a.id !== updatedArea.id));
            deletePage(updatedArea.id).catch(err => console.error(err));
          } else {
            // Cancel deletion, revert size
            setAreas(prev => prev.map(a => a.id === updatedArea.id ? { ...a, width: interactingArea.origW, height: interactingArea.origH } : a));
            updateArea(updatedArea.id, {
              x: updatedArea.x,
              y: updatedArea.y,
              end_x: updatedArea.x + interactingArea.origW,
              end_y: updatedArea.y + interactingArea.origH
            }).catch(err => console.error(err));
          }
        } else {
          updateArea(updatedArea.id, {
            x: updatedArea.x,
            y: updatedArea.y,
            end_x: updatedArea.x + updatedArea.width,
            end_y: updatedArea.y + updatedArea.height
          }).catch(err => console.error(err));
        }
      }
      setInteractingArea(null);
      try { e.target.releasePointerCapture(e.pointerId); } catch (err) {}
    }
  };

  const handleAddAreaConfirm = async (name, color) => {
    const tempId = uuidv4();
    const newArea = {
      id: tempId,
      ...currentArea,
      name,
      color
    };
    if (setAreas) {
      setAreas([...areas, newArea]);
    }
    setShowAreaModal(false);
    setCurrentArea(null);

    // Call API
    try {
      const realId = await createArea(newArea);
      if (setAreas) {
        setAreas(prev => prev.map(a => a.id === tempId ? { ...a, id: realId } : a));
      }
    } catch (err) {
      console.error('Failed to create area in Notion', err);
    }
  };

  // interactingTask/pendingTask の最新値を ref でも保持（クロージャ問題回避）
  const interactingTaskRef = useRef(null);
  const pendingTaskRef = useRef(null);

  const handleTaskPointerDown = (e, task) => {
    if (!e.isPrimary) return;
    e.stopPropagation(); // ボードの handlePointerDown を発火させない
    const rect = boardRef.current.getBoundingClientRect();
    const interactionData = {
      id: task.id,
      startX: (e.clientX - rect.left - pan.x) / scale,
      startY: (e.clientY - rect.top - pan.y) / scale,
      origX: task.x,
      origY: task.y
    };
    pendingTaskRef.current = interactionData;
    setPendingTask(interactionData);

    holdTimerRef.current = setTimeout(() => {
      const pending = pendingTaskRef.current;
      if (pending?.id === interactionData.id) {
        // 長押し確定時点の最新指位置を起点としてドラッグ開始
        interactingTaskRef.current = pending;
        setInteractingTask(pending);
        pendingTaskRef.current = null;
        setPendingTask(null);
        if (navigator.vibrate) navigator.vibrate(40);
      }
      holdTimerRef.current = null;
    }, 250);
  };

  const handleTaskPointerMove = (e, task) => {
    if (!e.isPrimary) return;

    // 長押し待機中：指位置を追跡（キャンセルはしない）
    if (pendingTaskRef.current?.id === task.id) {
      const rect = boardRef.current.getBoundingClientRect();
      const currentX = (e.clientX - rect.left - pan.x) / scale;
      const currentY = (e.clientY - rect.top - pan.y) / scale;
      // 最新の指位置を startX/Y として更新 → タイマー確定時にここから動き始める
      pendingTaskRef.current = {
        ...pendingTaskRef.current,
        startX: currentX,
        startY: currentY,
        origX: task.x,
        origY: task.y,
      };
    }

    // ドラッグ中：タスク位置を更新
    if (interactingTaskRef.current?.id === task.id) {
      const rect = boardRef.current.getBoundingClientRect();
      const currentX = (e.clientX - rect.left - pan.x) / scale;
      const currentY = (e.clientY - rect.top - pan.y) / scale;
      const dx = currentX - interactingTaskRef.current.startX;
      const dy = currentY - interactingTaskRef.current.startY;
      setTasks(prev => prev.map(t =>
        t.id === task.id
          ? { ...t, x: interactingTaskRef.current.origX + dx, y: interactingTaskRef.current.origY + dy }
          : t
      ));
    }
  };

  const handleTaskPointerUp = (e, task) => {
    if (!e.isPrimary) return;
    if (holdTimerRef.current) { clearTimeout(holdTimerRef.current); holdTimerRef.current = null; }
    pendingTaskRef.current = null;
    setPendingTask(null);

    if (interactingTaskRef.current?.id === task.id) {
      setTasks(prevTasks => {
        const updatedTask = prevTasks.find(t => t.id === task.id);
        if (updatedTask) {
          updateTask(updatedTask.id, { x: updatedTask.x, y: updatedTask.y }).catch(err => console.error(err));
        }
        return prevTasks;
      });
      interactingTaskRef.current = null;
      setInteractingTask(null);
    }
    try { e.target.releasePointerCapture(e.pointerId); } catch (_) {}
  };

  const handleAddTaskConfirm = async (title, deadline) => {
    const tempId = uuidv4();
    const newTask = {
      id: tempId,
      title: title,
      deadline: deadline || null,
      x: (-pan.x + window.innerWidth / 2 - 100) / scale,
      y: (-pan.y + window.innerHeight / 2 - 100) / scale,
      color: colors[tasks.length % colors.length]
    };
    setTasks([...tasks, newTask]);
    setIsAddingTask(false);

    try {
      const realId = await createTask(newTask);
      setTasks(prev => prev.map(t => t.id === tempId ? { ...t, id: realId } : t));
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteTask = (id) => {
    setTasks(tasks.filter(t => t.id !== id));
    deletePage(id).catch(err => console.error(err));
  };

  const handleSplitConfirm = async (parentTask, newSubtasks) => {
    // Remove parent, add children
    const newTasksList = tasks.filter(t => t.id !== parentTask.id);
    
    const children = newSubtasks.map((st, i) => ({
      id: st.id, // temp id
      title: st.title,
      deadline: st.deadline || null,
      x: parentTask.x + (i * 220) - ((newSubtasks.length - 1) * 110),
      y: parentTask.y + 150,
      color: parentTask.color
    }));
    
    setTasks([...newTasksList, ...children]);
    setSplitTask(null);

    // Call API: Delete parent
    deletePage(parentTask.id).catch(err => console.error(err));

    // Call API: Create children
    for (const child of children) {
      try {
        const realId = await createTask(child);
        setTasks(prev => prev.map(t => t.id === child.id ? { ...t, id: realId } : t));
      } catch (err) {
        console.error(err);
      }
    }
  };

  const initialTouchRef = useRef(null);

  const handleTouchStart = (e) => {
    if (!isMobile) return;
    if (e.touches.length === 2) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.hypot(touch1.clientX - touch2.clientX, touch1.clientY - touch2.clientY);
      initialTouchRef.current = { distance, initialScale: scale };
      
      setIsPanning(false);
      setIsDrawingArea(false);
      if (bgHoldTimerRef.current) {
        clearTimeout(bgHoldTimerRef.current);
        bgHoldTimerRef.current = null;
      }
    }
  };

  const handleTouchMove = (e) => {
    if (!isMobile) return;
    if (e.touches.length === 2 && initialTouchRef.current) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const currentDistance = Math.hypot(touch1.clientX - touch2.clientX, touch1.clientY - touch2.clientY);
      
      const { distance, initialScale } = initialTouchRef.current;
      if (distance > 20) {
        const ratio = currentDistance / distance;
        const newScale = Math.min(Math.max(0.1, initialScale * ratio), 3);
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

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
      {/* Fixed UI Controls */}
      <div style={{ position: 'absolute', top: '1rem', left: '1rem', zIndex: 50, display: 'flex', gap: '1rem' }}>
        <button className="btn btn-primary glass-panel" onClick={() => setIsAddingTask(true)}>
          <Plus size={18} /> タスク追加
        </button>
      </div>
      
      <div style={{ position: 'absolute', top: '1rem', right: '1rem', zIndex: 50, display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        {!isSidebarOpen && (
          <button 
            className="btn-icon glass-panel" 
            style={{ width: '36px', height: '36px', background: 'var(--bg-secondary)' }} 
            onClick={() => setIsSidebarOpen(true)}
            title="タスク一覧を開く"
          >
            <List size={18} />
          </button>
        )}
        <button className="btn-icon glass-panel" style={{ width: '36px', height: '36px', background: 'var(--bg-secondary)' }} onClick={() => setScale(s => Math.max(0.1, s - 0.2))}>-</button>
        <span className="glass-panel" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '60px', height: '36px', background: 'var(--bg-secondary)', fontSize: '0.875rem' }}>
          {Math.round(scale * 100)}%
        </span>
        <button className="btn-icon glass-panel" style={{ width: '36px', height: '36px', background: 'var(--bg-secondary)' }} onClick={() => setScale(s => Math.min(3, s + 0.2))}>+</button>
      </div>

      <div style={{ position: 'absolute', bottom: '1rem', right: isSidebarOpen ? '336px' : '1rem', zIndex: 50, color: 'var(--text-secondary)', transition: 'right 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }}>
        <small>マウスホイールで移動 (Pinchでズーム) / 背景をドラッグして領域を選択</small>
      </div>

      {/* Blackboard Canvas */}
      <div 
        ref={boardRef}
        style={{
          width: '100%',
          height: '100%',
          backgroundColor: 'var(--board-bg)',
          backgroundImage: `
            linear-gradient(rgba(0,0,0,0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,0,0,0.05) 1px, transparent 1px)
          `,
          backgroundSize: `${20 * scale}px ${20 * scale}px`,
          backgroundPosition: `${pan.x}px ${pan.y}px`,
          cursor: isDrawingArea ? 'crosshair' : 'default',
          border: '12px solid var(--board-border)',
          borderRadius: '12px',
          boxShadow: 'inset 0 0 50px rgba(0,0,0,0.05)',
          touchAction: 'none',
          overscrollBehavior: 'none'
        }}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <div style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
          transformOrigin: '0 0',
          position: 'absolute',
          top: 0,
          left: 0,
          width: 0,
          height: 0
        }}>
          
          {/* Areas */}
          {areas.map(area => {
            const isOldWhiteColor = area.color === 'rgba(255, 255, 255, 0.1)';
            const bgColor = isOldWhiteColor ? 'rgba(0, 0, 0, 0.03)' : area.color;
            const borderColor = isOldWhiteColor ? 'rgba(0, 0, 0, 0.15)' : area.color.replace(/0\.[0-9]+\)/, '0.8)');
            
            return (
            <div
              key={area.id}
              style={{
                position: 'absolute',
                left: area.x,
                top: area.y,
                width: area.width,
                height: area.height,
                backgroundColor: bgColor,
                border: `2px dashed ${borderColor}`,
                borderRadius: '16px',
                pointerEvents: 'none',
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'flex-start',
                padding: '0.5rem',
                zIndex: 5
              }}
            >
              {/* Handles */}
              <div 
                style={{ position: 'absolute', top: -5, left: 0, right: 0, height: '20px', cursor: 'move', pointerEvents: 'auto', zIndex: 10 }}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  const rect = boardRef.current.getBoundingClientRect();
                  setInteractingArea({ 
                    id: area.id, type: 'move', 
                    startX: (e.clientX - rect.left - pan.x) / scale, startY: (e.clientY - rect.top - pan.y) / scale,
                    origX: area.x, origY: area.y, origW: area.width, origH: area.height
                  });
                  e.currentTarget.setPointerCapture(e.pointerId);
                }}
              />
              <div 
                style={{ position: 'absolute', top: 0, right: -10, bottom: 0, width: '20px', cursor: 'ew-resize', pointerEvents: 'auto', zIndex: 10 }}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  const rect = boardRef.current.getBoundingClientRect();
                  setInteractingArea({ 
                    id: area.id, type: 'resize-right', 
                    startX: (e.clientX - rect.left - pan.x) / scale, startY: (e.clientY - rect.top - pan.y) / scale,
                    origX: area.x, origY: area.y, origW: area.width, origH: area.height
                  });
                  e.currentTarget.setPointerCapture(e.pointerId);
                }}
              />
              <div 
                style={{ position: 'absolute', bottom: -10, left: 0, right: 0, height: '20px', cursor: 'ns-resize', pointerEvents: 'auto', zIndex: 10 }}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  const rect = boardRef.current.getBoundingClientRect();
                  setInteractingArea({ 
                    id: area.id, type: 'resize-bottom', 
                    startX: (e.clientX - rect.left - pan.x) / scale, startY: (e.clientY - rect.top - pan.y) / scale,
                    origX: area.x, origY: area.y, origW: area.width, origH: area.height
                  });
                  e.currentTarget.setPointerCapture(e.pointerId);
                }}
              />
              <div 
                style={{ position: 'absolute', bottom: -10, right: -10, width: '20px', height: '20px', cursor: 'nwse-resize', pointerEvents: 'auto', zIndex: 11 }}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  const rect = boardRef.current.getBoundingClientRect();
                  setInteractingArea({ 
                    id: area.id, type: 'resize-br', 
                    startX: (e.clientX - rect.left - pan.x) / scale, startY: (e.clientY - rect.top - pan.y) / scale,
                    origX: area.x, origY: area.y, origW: area.width, origH: area.height
                  });
                  e.currentTarget.setPointerCapture(e.pointerId);
                }}
              />

              <div style={{
                color: 'var(--text-primary)',
                fontWeight: 'bold',
                fontSize: '1.25rem',
                marginTop: '15px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                pointerEvents: 'auto'
              }}>
                <span>{area.name || area.title}</span>
                <button
                  className="btn-icon"
                  title="領域を削除"
                  style={{ padding: '0.25rem', color: '#ef4444', cursor: 'pointer', zIndex: 12 }}
                  onPointerDown={(e) => e.stopPropagation()}
                  onTouchStart={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (setAreas) {
                      setAreas(areas.filter(a => a.id !== area.id));
                    }
                    deletePage(area.id).catch(err => console.error(err));
                  }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          )})}

          {/* Current drawing area */}
          {currentArea && (
            <div
              style={{
                position: 'absolute',
                left: currentArea.x,
                top: currentArea.y,
                width: currentArea.width,
                height: currentArea.height,
                backgroundColor: 'rgba(0,0,0,0.03)',
                border: '2px dashed rgba(0,0,0,0.2)',
                pointerEvents: 'none',
                zIndex: 5,
                borderRadius: '16px'
              }}
            />
          )}

          {tasks.map(task => (
            <TaskCard 
              key={task.id} 
              task={task} 
              isInteracting={interactingTask?.id === task.id || pendingTask?.id === task.id}
              isHeld={interactingTask?.id === task.id}
              onPointerDown={handleTaskPointerDown}
              onPointerMove={handleTaskPointerMove}
              onPointerUp={handleTaskPointerUp}
              onSplitClick={(t) => setSplitTask(t)}
              onDelete={handleDeleteTask}
            />
          ))}
        </div>
      </div>

      {/* Expandable Taskbar (Sidebar) */}
      <div 
        className={`glass-panel mobile-sidebar ${isSidebarOpen ? 'open' : ''}`}
        style={{
          position: 'absolute',
          top: 0,
          right: isSidebarOpen ? 0 : '-320px',
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
            onClick={() => setIsSidebarOpen(false)}
            style={{ color: 'var(--text-secondary)' }}
          >
            <X size={20} />
          </button>
        </h3>
        <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', paddingRight: '0.5rem' }}>
          {sortedTasks.map((t, idx) => {
            const isFlipped = flippedTaskId === t.id;
            return (
              <div 
                key={t.id}
                style={{ perspective: '1000px', minHeight: '60px', marginBottom: '0.5rem' }}
              >
                <div style={{
                  display: 'grid',
                  width: '100%',
                  transformStyle: 'preserve-3d',
                  transition: 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                  transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
                }}>
                  {/* FRONT FACE */}
                  <div 
                    className="glass-panel"
                    style={{
                      gridArea: '1/1',
                      backfaceVisibility: 'hidden',
                      padding: '0.75rem',
                      borderLeft: `4px solid var(--sticky-${t.color || 'yellow'})`,
                      background: 'rgba(255, 255, 255, 0.05)',
                      fontSize: '0.875rem',
                      transition: 'transform 0.2s, box-shadow 0.2s, background 0.2s',
                      transform: interactingTask?.id === t.id || pendingTask?.id === t.id ? 'scale(1.02)' : 'scale(1)',
                      boxShadow: interactingTask?.id === t.id || pendingTask?.id === t.id ? 'var(--shadow-md)' : 'none',
                      cursor: isFlipped ? 'default' : 'pointer'
                    }}
                    onMouseEnter={(e) => { if (!isFlipped) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'; }}
                    onMouseLeave={(e) => { if (!isFlipped) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'; }}
                    onClick={() => {
                      if (isFlipped) return;
                      setFlippedTaskId(t.id);
                      setFlippedTaskProgress(t.progress || 0);
                    }}
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

                  {/* BACK FACE */}
                  <div
                    className="glass-panel"
                    style={{
                      gridArea: '1/1',
                      backfaceVisibility: 'hidden',
                      transform: 'rotateY(180deg)',
                      padding: '0.75rem',
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-primary)',
                      borderLeft: `4px solid var(--sticky-${t.color || 'yellow'})`,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      gap: '0.5rem'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.875rem', fontWeight: 'bold' }}>進捗: {flippedTaskProgress}%</span>
                      <button 
                        className="btn btn-primary"
                        style={{ padding: '0.1rem 0.5rem', fontSize: '0.75rem' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setFlippedTaskId(null);
                          setTasks(prev => prev.map(task => task.id === t.id ? { ...task, progress: flippedTaskProgress } : task));
                          updateTask(t.id, { progress: flippedTaskProgress }).catch(console.error);
                        }}
                      >
                        保存
                      </button>
                    </div>
                    <input 
                      type="range" 
                      min="0" max="100" step="10"
                      value={flippedTaskProgress}
                      onChange={(e) => setFlippedTaskProgress(Number(e.target.value))}
                      style={{ width: '100%', cursor: 'pointer' }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
          {sortedTasks.length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--text-secondary)', marginTop: '2rem' }}>
              タスクがありません
            </div>
          )}
        </div>
      </div>

      {splitTask && (
        <SplitModal 
          parentTask={splitTask} 
          onClose={() => setSplitTask(null)}
          onConfirm={handleSplitConfirm}
        />
      )}
      
      {isAddingTask && (
        <AddTaskModal 
          onClose={() => setIsAddingTask(false)}
          onConfirm={handleAddTaskConfirm}
        />
      )}
      
      {showAreaModal && (
        <AddAreaModal
          onClose={() => {
            setShowAreaModal(false);
            setCurrentArea(null);
          }}
          onConfirm={handleAddAreaConfirm}
        />
      )}
    </div>
  );
}
