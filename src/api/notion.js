const NOTION_PROXY = '/notion-api/v1';

// IDs
const TASK_DB_ID = '32ac2487-daa9-8081-872a-e19285e2a862';
const SCHEDULE_DB_ID = '3dec2487-daa9-8083-86dd-c94a7fa578c4';

let cachedTaskTitleKey = (typeof window !== 'undefined' && localStorage.getItem('notion_task_title_key')) || null;
let cachedScheduleTitleKey = (typeof window !== 'undefined' && localStorage.getItem('notion_schedule_title_key')) || null;

// Helper to make API calls
async function fetchNotion(endpoint, options = {}) {
  const url = `${NOTION_PROXY}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  if (!response.ok) {
    const errorText = await response.text();
    const errorMsg = `Notion API Error: ${response.status} - ${errorText}`;
    if (typeof window !== 'undefined') window.alert("【DB保存エラー】\n" + errorMsg);
    throw new Error(errorMsg);
  }
  return response.json();
}

async function getTaskTitleKey() {
  if (cachedTaskTitleKey) return cachedTaskTitleKey;
  try {
    const db = await fetchNotion(`/databases/${TASK_DB_ID}`);
    if (db && db.properties) {
      for (const [key, prop] of Object.entries(db.properties)) {
        if (prop.type === 'title') {
          cachedTaskTitleKey = key;
          if (typeof window !== 'undefined') localStorage.setItem('notion_task_title_key', key);
          return key;
        }
      }
    }
  } catch (e) {
    console.warn('Failed to fetch task DB schema:', e);
  }
  return cachedTaskTitleKey || '名前';
}

async function getScheduleTitleKey() {
  if (cachedScheduleTitleKey) return cachedScheduleTitleKey;
  try {
    const db = await fetchNotion(`/databases/${SCHEDULE_DB_ID}`);
    if (db && db.properties) {
      for (const [key, prop] of Object.entries(db.properties)) {
        if (prop.type === 'title') {
          cachedScheduleTitleKey = key;
          if (typeof window !== 'undefined') localStorage.setItem('notion_schedule_title_key', key);
          return key;
        }
      }
    }
  } catch (e) {
    console.warn('Failed to fetch schedule DB schema:', e);
  }
  return cachedScheduleTitleKey || '名前';
}

// --- Task & Area Operations ---

export async function fetchTaskTree() {
  const data = await fetchNotion(`/databases/${TASK_DB_ID}/query`, {
    method: 'POST',
    body: JSON.stringify({ page_size: 100 })
  });

  const tasks = [];
  const areas = [];
  
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  for (const page of data.results) {
    const props = page.properties;
    const type = props.type?.select?.name;
    
    let title = '名称未設定';
    for (const key in props) {
      if (props[key]?.type === 'title') {
        title = props[key].title?.[0]?.plain_text || '名称未設定';
        if (!cachedTaskTitleKey || cachedTaskTitleKey !== key) {
          cachedTaskTitleKey = key;
          if (typeof window !== 'undefined') localStorage.setItem('notion_task_title_key', key);
        }
        break;
      }
    }

    if (type === 'task') {
      const progress = props.progress?.number || 0;
      
      if (progress === 100) {
        const lastEdited = new Date(page.last_edited_time);
        if (lastEdited < startOfToday) {
          deletePage(page.id).catch(err => console.error('Failed to auto-cleanup task:', err));
          continue;
        }
      }

      tasks.push({
        id: page.id,
        title,
        progress: progress,
        completed: progress === 100,
        x: props.x_position?.number || 0,
        y: props.y_position?.number || 0,
        deadline: props.deadline?.date?.start || null,
        color: props.color?.rich_text?.[0]?.plain_text || 'yellow'
      });
    } else if (type === 'area') {
      areas.push({
        id: page.id,
        name: title,
        x: props.x_position?.number || 0,
        y: props.y_position?.number || 0,
        width: props.end_x_position?.number ? props.end_x_position.number - (props.x_position?.number || 0) : 100,
        height: props.end_y_position?.number ? props.end_y_position.number - (props.y_position?.number || 0) : 100,
        color: props.color?.rich_text?.[0]?.plain_text || 'rgba(255, 255, 255, 0.1)'
      });
    }
  }
  return { tasks, areas };
}

export async function createTask(task) {
  const titleKey = await getTaskTitleKey();
  const data = await fetchNotion(`/pages`, {
    method: 'POST',
    body: JSON.stringify({
      parent: { database_id: TASK_DB_ID },
      properties: {
        [titleKey]: { title: [{ text: { content: task.title || '名称未設定' } }] },
        type: { select: { name: 'task' } },
        progress: { number: task.progress || 0 },
        x_position: { number: task.x ?? 0 },
        y_position: { number: task.y ?? 0 },
        deadline: task.deadline ? { date: { start: task.deadline } } : null,
        color: { rich_text: [{ text: { content: task.color || 'yellow' } }] }
      }
    })
  });
  return data.id;
}

export async function updateTask(taskId, updates) {
  const properties = {};
  if (updates.title !== undefined) {
    const titleKey = await getTaskTitleKey();
    properties[titleKey] = { title: [{ text: { content: updates.title || '名称未設定' } }] };
  }
  if (updates.progress !== undefined) properties.progress = { number: updates.progress };
  if (updates.x !== undefined) properties.x_position = { number: updates.x };
  if (updates.y !== undefined) properties.y_position = { number: updates.y };
  if (updates.deadline !== undefined) properties.deadline = updates.deadline ? { date: { start: updates.deadline } } : null;
  if (updates.color !== undefined) properties.color = { rich_text: [{ text: { content: updates.color } }] };

  await fetchNotion(`/pages/${taskId}`, {
    method: 'PATCH',
    body: JSON.stringify({ properties })
  });
}

export async function createArea(area) {
  const titleKey = await getTaskTitleKey();
  const data = await fetchNotion(`/pages`, {
    method: 'POST',
    body: JSON.stringify({
      parent: { database_id: TASK_DB_ID },
      properties: {
        [titleKey]: { title: [{ text: { content: area.name || '名称未設定' } }] },
        type: { select: { name: 'area' } },
        x_position: { number: area.x ?? 0 },
        y_position: { number: area.y ?? 0 },
        end_x_position: { number: (area.x ?? 0) + (area.width ?? 100) },
        end_y_position: { number: (area.y ?? 0) + (area.height ?? 100) },
        color: { rich_text: [{ text: { content: area.color || 'rgba(255, 255, 255, 0.1)' } }] }
      }
    })
  });
  return data.id;
}

export async function updateArea(areaId, updates) {
  const properties = {};
  if (updates.name !== undefined) {
    const titleKey = await getTaskTitleKey();
    properties[titleKey] = { title: [{ text: { content: updates.name || '名称未設定' } }] };
  }
  if (updates.x !== undefined) properties.x_position = { number: updates.x };
  if (updates.y !== undefined) properties.y_position = { number: updates.y };
  if (updates.end_x !== undefined) properties.end_x_position = { number: updates.end_x };
  if (updates.end_y !== undefined) properties.end_y_position = { number: updates.end_y };

  await fetchNotion(`/pages/${areaId}`, {
    method: 'PATCH',
    body: JSON.stringify({ properties })
  });
}

export async function deletePage(pageId) {
  // Archive the page to delete it
  await fetchNotion(`/pages/${pageId}`, {
    method: 'PATCH',
    body: JSON.stringify({ archived: true })
  });
}


// --- Schedule Operations ---

export async function fetchSchedules() {
  const data = await fetchNotion(`/databases/${SCHEDULE_DB_ID}/query`, {
    method: 'POST',
    body: JSON.stringify({ page_size: 100 })
  });

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const schedules = [];
  for (const page of data.results) {
    const props = page.properties;
    const dateStr = props.target_date?.date?.start;
    
    if (dateStr) {
      const targetDate = new Date(dateStr);
      targetDate.setHours(0, 0, 0, 0);
      
      const diffTime = startOfToday.getTime() - targetDate.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays >= 2) {
        deletePage(page.id).catch(err => console.error('Failed to auto-cleanup schedule:', err));
        continue;
      }
    }

    let title = '名称未設定';
    for (const key in props) {
      if (props[key]?.type === 'title') {
        title = props[key].title?.[0]?.plain_text || '名称未設定';
        if (!cachedScheduleTitleKey || cachedScheduleTitleKey !== key) {
          cachedScheduleTitleKey = key;
          if (typeof window !== 'undefined') localStorage.setItem('notion_schedule_title_key', key);
        }
        break;
      }
    }

    schedules.push({
      id: page.id,
      title: title,
      date: dateStr || new Date().toISOString().split('T')[0],
      startHour: props.start_time?.number || 0,
      endHour: props.end_time?.number || 1,
      color: 'blue'
    });
  }
  return schedules;
}

export async function createSchedule(item) {
  const titleKey = await getScheduleTitleKey();
  const data = await fetchNotion(`/pages`, {
    method: 'POST',
    body: JSON.stringify({
      parent: { database_id: SCHEDULE_DB_ID },
      properties: {
        [titleKey]: { title: [{ text: { content: item.title || '名称未設定' } }] },
        target_date: { date: { start: item.date.split('T')[0] } },
        start_time: { number: item.startHour },
        end_time: { number: item.endHour }
      }
    })
  });
  return data.id;
}

export async function updateSchedule(scheduleId, updates) {
  const properties = {};
  if (updates.title !== undefined) {
    const titleKey = await getScheduleTitleKey();
    properties[titleKey] = { title: [{ text: { content: updates.title || '名称未設定' } }] };
  }
  if (updates.date !== undefined) properties.target_date = { date: { start: updates.date.split('T')[0] } };
  if (updates.startHour !== undefined) properties.start_time = { number: updates.startHour };
  if (updates.endHour !== undefined) properties.end_time = { number: updates.endHour };

  await fetchNotion(`/pages/${scheduleId}`, {
    method: 'PATCH',
    body: JSON.stringify({ properties })
  });
}
