import React, { useState, useEffect } from 'react';
import Blackboard from '../components/TaskTree/Blackboard';
import { fetchTaskTree } from '../api/notion';
import { useAuth } from '../context/AuthContext';

export default function TaskPage() {
  const { currentUser } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTaskTree(currentUser?.id || null)
      .then(data => {
        setTasks(data.tasks);
        setAreas(data.areas);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch tasks from Notion:', err);
        setLoading(false);
      });
  }, []);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="animate-pulse">Loading from Notion...</div>
          </div>
        ) : (
          <Blackboard tasks={tasks} setTasks={setTasks} areas={areas} setAreas={setAreas} />
        )}
      </div>
    </div>
  );
}
