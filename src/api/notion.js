const NOTION_PROXY = '/notion-api/v1';

// IDs
const TASK_DB_ID = '32ac2487-daa9-8081-872a-e19285e2a862';
const SCHEDULE_DB_ID = '3dec2487-daa9-8083-86dd-c94a7fa578c4';

let taskSchemaCache = null;
let scheduleSchemaCache = null;

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

async function getTaskSchema() {
  if (taskSchemaCache) return taskSchemaCache;
  try {
    const db = await fetchNotion(`/databases/${TASK_DB_ID}`);
    if (db && db.properties) {
      taskSchemaCache = db.properties;
      return taskSchemaCache;
    }
  } catch (e) {
    console.warn('Failed to fetch task DB schema:', e);
  }
  return taskSchemaCache;
}

async function getScheduleSchema() {
  if (scheduleSchemaCache) return scheduleSchemaCache;
  try {
    const db = await fetchNotion(`/databases/${SCHEDULE_DB_ID}`);
    if (db && db.properties) {
      scheduleSchemaCache = db.properties;
      return scheduleSchemaCache;
    }
  } catch (e) {
    console.warn('Failed to fetch schedule DB schema:', e);
  }
  return scheduleSchemaCache;
}

function extractTitleFromProps(props) {
  // 1. If there's a property specifically named 'title', check it first
  if (props.title) {
    const t = props.title.rich_text?.[0]?.plain_text ||
              props.title.title?.[0]?.plain_text ||
              props.title.select?.name;
    if (t) return t;
  }
  // 2. Check common name columns (名前, タスク名, name, Name)
  for (const nameKey of ['名前', 'タスク名', 'name', 'Name']) {
    if (props[nameKey]) {
      const t = props[nameKey].title?.[0]?.plain_text ||
                props[nameKey].rich_text?.[0]?.plain_text ||
                props[nameKey].select?.name;
      if (t) return t;
    }
  }
  // 3. Fallback to any property with type === 'title'
  for (const key in props) {
    if (props[key]?.type === 'title') {
      const t = props[key].title?.[0]?.plain_text;
      if (t) return t;
    }
  }
  return '名称未設定';
}

// --- Task & Area Operations ---

export async function fetchTaskTree() {
  const data = await fetchNotion(`/databases/${TASK_DB_ID}/query`, {
    method: 'POST',
    body: JSON.stringify({ page_size: 100 })
  });

  if (data.results && data.results.length > 0 && !taskSchemaCache) {
    taskSchemaCache = {};
    for (const key in data.results[0].properties) {
      taskSchemaCache[key] = {
        type: data.results[0].properties[key].type,
        id: data.results[0].properties[key].id,
        name: key
      };
    }
  }

  const tasks = [];
  const areas = [];
  
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  for (const page of data.results) {
    const props = page.properties;
    const type = props.type?.select?.name || props.type?.status?.name || 'task';
    const title = extractTitleFromProps(props);

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
        color: props.color?.rich_text?.[0]?.plain_text || props.color?.select?.name || 'yellow'
      });
    } else if (type === 'area') {
      areas.push({
        id: page.id,
        name: title,
        title: title,
        x: props.x_position?.number || 0,
        y: props.y_position?.number || 0,
        width: props.end_x_position?.number ? props.end_x_position.number - (props.x_position?.number || 0) : 100,
        height: props.end_y_position?.number ? props.end_y_position.number - (props.y_position?.number || 0) : 100,
        color: props.color?.rich_text?.[0]?.plain_text || props.color?.select?.name || 'rgba(255, 255, 255, 0.1)'
      });
    }
  }
  return { tasks, areas };
}

export async function createTask(task) {
  const schema = await getTaskSchema();
  const properties = {};
  const taskTitle = task.title || '名称未設定';

  const titlePropName = schema
    ? Object.keys(schema).find(k => schema[k].type === 'title')
    : null;
  if (titlePropName) {
    properties[titlePropName] = {
      title: [{ text: { content: titlePropName.toLowerCase() === 'id' ? (task.id || taskTitle) : taskTitle } }]
    };
  }

  if (schema?.['title'] && schema['title'].type !== 'title') {
    if (schema['title'].type === 'rich_text') {
      properties['title'] = { rich_text: [{ text: { content: taskTitle } }] };
    } else if (schema['title'].type === 'select') {
      properties['title'] = { select: { name: taskTitle } };
    }
  }
  if (schema?.['名前'] && schema['名前'].type !== 'title' && schema['名前'].type === 'rich_text') {
    properties['名前'] = { rich_text: [{ text: { content: taskTitle } }] };
  }
  if (schema?.['タスク名'] && schema['タスク名'].type !== 'title' && schema['タスク名'].type === 'rich_text') {
    properties['タスク名'] = { rich_text: [{ text: { content: taskTitle } }] };
  }

  if (!schema || schema['type']) {
    const typePropType = schema?.['type']?.type || 'select';
    if (typePropType === 'select') properties['type'] = { select: { name: 'task' } };
    else if (typePropType === 'status') properties['type'] = { status: { name: 'task' } };
    else if (typePropType === 'rich_text') properties['type'] = { rich_text: [{ text: { content: 'task' } }] };
  }

  if (!schema || schema['progress']) {
    properties['progress'] = { number: Number(task.progress) || 0 };
  }

  if (!schema || schema['x_position']) {
    properties['x_position'] = { number: Math.round(task.x ?? 0) };
  }
  if (!schema || schema['y_position']) {
    properties['y_position'] = { number: Math.round(task.y ?? 0) };
  }

  if ((!schema || schema['deadline']) && task.deadline) {
    properties['deadline'] = { date: { start: task.deadline } };
  }

  if (!schema || schema['color']) {
    const colorPropType = schema?.['color']?.type || 'rich_text';
    if (colorPropType === 'select') properties['color'] = { select: { name: task.color || 'yellow' } };
    else properties['color'] = { rich_text: [{ text: { content: task.color || 'yellow' } }] };
  }

  const data = await fetchNotion(`/pages`, {
    method: 'POST',
    body: JSON.stringify({
      parent: { database_id: TASK_DB_ID },
      properties
    })
  });
  return data.id;
}

export async function updateTask(taskId, updates) {
  const schema = await getTaskSchema();
  const properties = {};
  const taskTitle = updates.title;

  if (taskTitle !== undefined) {
    const titlePropName = schema
      ? Object.keys(schema).find(k => schema[k].type === 'title')
      : null;
    if (titlePropName) {
      properties[titlePropName] = {
        title: [{ text: { content: titlePropName.toLowerCase() === 'id' ? taskId : (taskTitle || '名称未設定') } }]
      };
    }
    if (schema?.['title'] && schema['title'].type !== 'title') {
      if (schema['title'].type === 'rich_text') {
        properties['title'] = { rich_text: [{ text: { content: taskTitle || '名称未設定' } }] };
      } else if (schema['title'].type === 'select') {
        properties['title'] = { select: { name: taskTitle || '名称未設定' } };
      }
    }
    if (schema?.['名前'] && schema['名前'].type !== 'title' && schema['名前'].type === 'rich_text') {
      properties['名前'] = { rich_text: [{ text: { content: taskTitle || '名称未設定' } }] };
    }
    if (schema?.['タスク名'] && schema['タスク名'].type !== 'title' && schema['タスク名'].type === 'rich_text') {
      properties['タスク名'] = { rich_text: [{ text: { content: taskTitle || '名称未設定' } }] };
    }
  }

  if (updates.progress !== undefined && (!schema || schema['progress'])) {
    properties['progress'] = { number: Number(updates.progress) || 0 };
  }

  if (updates.x !== undefined && (!schema || schema['x_position'])) {
    properties['x_position'] = { number: Math.round(updates.x) };
  }

  if (updates.y !== undefined && (!schema || schema['y_position'])) {
    properties['y_position'] = { number: Math.round(updates.y) };
  }

  if (updates.deadline !== undefined && (!schema || schema['deadline'])) {
    properties['deadline'] = updates.deadline ? { date: { start: updates.deadline } } : null;
  }

  if (updates.color !== undefined && (!schema || schema['color'])) {
    const colorPropType = schema?.['color']?.type || 'rich_text';
    if (colorPropType === 'select') properties['color'] = { select: { name: updates.color } };
    else properties['color'] = { rich_text: [{ text: { content: updates.color } }] };
  }

  if (Object.keys(properties).length === 0) return;

  await fetchNotion(`/pages/${taskId}`, {
    method: 'PATCH',
    body: JSON.stringify({ properties })
  });
}

export async function createArea(area) {
  const schema = await getTaskSchema();
  const properties = {};
  const areaName = area.name || area.title || '名称未設定';

  const titlePropName = schema
    ? Object.keys(schema).find(k => schema[k].type === 'title')
    : null;
  if (titlePropName) {
    properties[titlePropName] = {
      title: [{ text: { content: titlePropName.toLowerCase() === 'id' ? (area.id || areaName) : areaName } }]
    };
  }

  if (schema?.['title'] && schema['title'].type !== 'title') {
    if (schema['title'].type === 'rich_text') {
      properties['title'] = { rich_text: [{ text: { content: areaName } }] };
    } else if (schema['title'].type === 'select') {
      properties['title'] = { select: { name: areaName } };
    }
  }
  if (schema?.['name'] && schema['name'].type !== 'title' && schema['name'].type === 'rich_text') {
    properties['name'] = { rich_text: [{ text: { content: areaName } }] };
  }
  if (schema?.['名前'] && schema['名前'].type !== 'title' && schema['名前'].type === 'rich_text') {
    properties['名前'] = { rich_text: [{ text: { content: areaName } }] };
  }

  if (!schema || schema['type']) {
    const typePropType = schema?.['type']?.type || 'select';
    if (typePropType === 'select') properties['type'] = { select: { name: 'area' } };
    else if (typePropType === 'status') properties['type'] = { status: { name: 'area' } };
    else if (typePropType === 'rich_text') properties['type'] = { rich_text: [{ text: { content: 'area' } }] };
  }

  if (!schema || schema['x_position']) {
    properties['x_position'] = { number: Math.round(area.x ?? 0) };
  }
  if (!schema || schema['y_position']) {
    properties['y_position'] = { number: Math.round(area.y ?? 0) };
  }

  if (!schema || schema['end_x_position']) {
    properties['end_x_position'] = { number: Math.round((area.x ?? 0) + (area.width ?? 100)) };
  }
  if (!schema || schema['end_y_position']) {
    properties['end_y_position'] = { number: Math.round((area.y ?? 0) + (area.height ?? 100)) };
  }

  if (!schema || schema['color']) {
    const colorPropType = schema?.['color']?.type || 'rich_text';
    const colorVal = area.color || 'rgba(255, 255, 255, 0.1)';
    if (colorPropType === 'select') properties['color'] = { select: { name: colorVal } };
    else properties['color'] = { rich_text: [{ text: { content: colorVal } }] };
  }

  const data = await fetchNotion(`/pages`, {
    method: 'POST',
    body: JSON.stringify({
      parent: { database_id: TASK_DB_ID },
      properties
    })
  });
  return data.id;
}

export async function updateArea(areaId, updates) {
  const schema = await getTaskSchema();
  const properties = {};
  const areaName = updates.name !== undefined ? updates.name : updates.title;

  if (areaName !== undefined) {
    const titlePropName = schema
      ? Object.keys(schema).find(k => schema[k].type === 'title')
      : null;
    if (titlePropName) {
      properties[titlePropName] = {
        title: [{ text: { content: titlePropName.toLowerCase() === 'id' ? areaId : (areaName || '名称未設定') } }]
      };
    }
    if (schema?.['title'] && schema['title'].type !== 'title') {
      if (schema['title'].type === 'rich_text') {
        properties['title'] = { rich_text: [{ text: { content: areaName || '名称未設定' } }] };
      } else if (schema['title'].type === 'select') {
        properties['title'] = { select: { name: areaName || '名称未設定' } };
      }
    }
    if (schema?.['name'] && schema['name'].type !== 'title' && schema['name'].type === 'rich_text') {
      properties['name'] = { rich_text: [{ text: { content: areaName || '名称未設定' } }] };
    }
    if (schema?.['名前'] && schema['名前'].type !== 'title' && schema['名前'].type === 'rich_text') {
      properties['名前'] = { rich_text: [{ text: { content: areaName || '名称未設定' } }] };
    }
  }

  if (updates.x !== undefined && (!schema || schema['x_position'])) {
    properties['x_position'] = { number: Math.round(updates.x) };
  }

  if (updates.y !== undefined && (!schema || schema['y_position'])) {
    properties['y_position'] = { number: Math.round(updates.y) };
  }

  if (updates.end_x !== undefined && (!schema || schema['end_x_position'])) {
    properties['end_x_position'] = { number: Math.round(updates.end_x) };
  }

  if (updates.end_y !== undefined && (!schema || schema['end_y_position'])) {
    properties['end_y_position'] = { number: Math.round(updates.end_y) };
  }

  if (Object.keys(properties).length === 0) return;

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

  if (data.results && data.results.length > 0 && !scheduleSchemaCache) {
    scheduleSchemaCache = {};
    for (const key in data.results[0].properties) {
      scheduleSchemaCache[key] = {
        type: data.results[0].properties[key].type,
        id: data.results[0].properties[key].id,
        name: key
      };
    }
  }

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

    const title = extractTitleFromProps(props);

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
  const schema = await getScheduleSchema();
  const properties = {};
  const scheduleTitle = item.title || '名称未設定';

  const titlePropName = schema
    ? Object.keys(schema).find(k => schema[k].type === 'title')
    : null;
  if (titlePropName) {
    properties[titlePropName] = {
      title: [{ text: { content: titlePropName.toLowerCase() === 'id' ? (item.id || scheduleTitle) : scheduleTitle } }]
    };
  }

  if (schema?.['title'] && schema['title'].type !== 'title') {
    if (schema['title'].type === 'rich_text') {
      properties['title'] = { rich_text: [{ text: { content: scheduleTitle } }] };
    } else if (schema['title'].type === 'select') {
      properties['title'] = { select: { name: scheduleTitle } };
    }
  }

  if (!schema || schema['target_date']) {
    properties['target_date'] = { date: { start: item.date.split('T')[0] } };
  }

  if (!schema || schema['start_time']) {
    properties['start_time'] = { number: Number(item.startHour) || 0 };
  }

  if (!schema || schema['end_time']) {
    properties['end_time'] = { number: Number(item.endHour) || 1 };
  }

  const data = await fetchNotion(`/pages`, {
    method: 'POST',
    body: JSON.stringify({
      parent: { database_id: SCHEDULE_DB_ID },
      properties
    })
  });
  return data.id;
}

export async function updateSchedule(scheduleId, updates) {
  const schema = await getScheduleSchema();
  const properties = {};
  const scheduleTitle = updates.title;

  if (scheduleTitle !== undefined) {
    const titlePropName = schema
      ? Object.keys(schema).find(k => schema[k].type === 'title')
      : null;
    if (titlePropName) {
      properties[titlePropName] = {
        title: [{ text: { content: titlePropName.toLowerCase() === 'id' ? scheduleId : (scheduleTitle || '名称未設定') } }]
      };
    }
    if (schema?.['title'] && schema['title'].type !== 'title') {
      if (schema['title'].type === 'rich_text') {
        properties['title'] = { rich_text: [{ text: { content: scheduleTitle || '名称未設定' } }] };
      } else if (schema['title'].type === 'select') {
        properties['title'] = { select: { name: scheduleTitle || '名称未設定' } };
      }
    }
  }

  if (updates.date !== undefined && (!schema || schema['target_date'])) {
    properties['target_date'] = { date: { start: updates.date.split('T')[0] } };
  }

  if (updates.startHour !== undefined && (!schema || schema['start_time'])) {
    properties['start_time'] = { number: Number(updates.startHour) || 0 };
  }

  if (updates.endHour !== undefined && (!schema || schema['end_time'])) {
    properties['end_time'] = { number: Number(updates.endHour) || 1 };
  }

  if (Object.keys(properties).length === 0) return;

  await fetchNotion(`/pages/${scheduleId}`, {
    method: 'PATCH',
    body: JSON.stringify({ properties })
  });
}
