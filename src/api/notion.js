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
    let detail = `Notion API Error: ${response.status} - ${errorText}`;
    if (options.body) {
      detail += `\n\n【送信Payload】\n${options.body}`;
    }
    if (taskSchemaCache) {
      detail += `\n\n【Task DB Schema】\n` + JSON.stringify(Object.keys(taskSchemaCache).map(k => `${k} (${taskSchemaCache[k].type})`), null, 2);
    }
    if (typeof window !== 'undefined') window.alert("【DB保存エラー】\n" + detail);
    throw new Error(detail);
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
  // 1. Find the property that has type === 'title'
  for (const key in props) {
    if (props[key]?.type === 'title') {
      const t = props[key].title?.[0]?.plain_text;
      if (t) return t;
    }
  }
  // 2. Check common name/title properties
  for (const nameKey of ['名前', 'タスク名', 'name', 'Name', 'title', 'Title']) {
    if (props[nameKey]) {
      const t = props[nameKey].title?.[0]?.plain_text ||
                props[nameKey].rich_text?.[0]?.plain_text ||
                props[nameKey].select?.name;
      if (t) return t;
    }
  }
  return '名称未設定';
}

async function buildTaskProperties(data, isCreate = true) {
  const schema = await getTaskSchema();
  const properties = {};
  const titleText = data.title !== undefined ? data.title : (data.name !== undefined ? data.name : (isCreate ? '名称未設定' : undefined));

  // 1. Find the title column (the column whose schema type is 'title')
  let titlePropName = null;
  if (schema) {
    for (const [key, prop] of Object.entries(schema)) {
      if (prop.type === 'title') {
        titlePropName = key;
        break;
      }
    }
  }

  if (titleText !== undefined) {
    const propKey = titlePropName || '名前';
    properties[propKey] = {
      title: [{ text: { content: String(titleText || '名称未設定') } }]
    };
  }

  // 2. Only add other properties if they exist in schema and match expected types
  if (schema) {
    // Type ('task' | 'area')
    if (data.type !== undefined && schema['type']) {
      if (schema['type'].type === 'select') properties['type'] = { select: { name: String(data.type) } };
      else if (schema['type'].type === 'status') properties['type'] = { status: { name: String(data.type) } };
      else if (schema['type'].type === 'rich_text') properties['type'] = { rich_text: [{ text: { content: String(data.type) } }] };
    } else if (isCreate && schema['type']) {
      const defType = data.type || 'task';
      if (schema['type'].type === 'select') properties['type'] = { select: { name: defType } };
      else if (schema['type'].type === 'status') properties['type'] = { status: { name: defType } };
      else if (schema['type'].type === 'rich_text') properties['type'] = { rich_text: [{ text: { content: defType } }] };
    }

    // Progress
    if (data.progress !== undefined && schema['progress']?.type === 'number') {
      properties['progress'] = { number: Number(data.progress) || 0 };
    } else if (isCreate && schema['progress']?.type === 'number') {
      properties['progress'] = { number: 0 };
    }

    // x_position
    if (data.x !== undefined && schema['x_position']?.type === 'number') {
      properties['x_position'] = { number: Math.round(Number(data.x) || 0) };
    } else if (isCreate && schema['x_position']?.type === 'number') {
      properties['x_position'] = { number: Math.round(Number(data.x) || 0) };
    }

    // y_position
    if (data.y !== undefined && schema['y_position']?.type === 'number') {
      properties['y_position'] = { number: Math.round(Number(data.y) || 0) };
    } else if (isCreate && schema['y_position']?.type === 'number') {
      properties['y_position'] = { number: Math.round(Number(data.y) || 0) };
    }

    // end_x_position (area)
    if (schema['end_x_position']?.type === 'number') {
      if (data.end_x !== undefined) {
        properties['end_x_position'] = { number: Math.round(Number(data.end_x) || 0) };
      } else if (data.width !== undefined && data.x !== undefined) {
        properties['end_x_position'] = { number: Math.round((Number(data.x) || 0) + (Number(data.width) || 100)) };
      }
    }

    // end_y_position (area)
    if (schema['end_y_position']?.type === 'number') {
      if (data.end_y !== undefined) {
        properties['end_y_position'] = { number: Math.round(Number(data.end_y) || 0) };
      } else if (data.height !== undefined && data.y !== undefined) {
        properties['end_y_position'] = { number: Math.round((Number(data.y) || 0) + (Number(data.height) || 100)) };
      }
    }

    // Deadline
    if (schema['deadline']?.type === 'date') {
      if (data.deadline !== undefined) {
        properties['deadline'] = data.deadline ? { date: { start: data.deadline } } : null;
      }
    }

    // Color
    if (schema['color']) {
      const colorVal = data.color || (data.type === 'area' ? 'rgba(255, 255, 255, 0.1)' : 'yellow');
      if (data.color !== undefined || isCreate) {
        if (schema['color'].type === 'select') properties['color'] = { select: { name: String(colorVal) } };
        else if (schema['color'].type === 'rich_text') properties['color'] = { rich_text: [{ text: { content: String(colorVal) } }] };
      }
    }
  }

  return properties;
}

async function buildScheduleProperties(data, isCreate = true) {
  const schema = await getScheduleSchema();
  const properties = {};
  const titleText = data.title !== undefined ? data.title : (isCreate ? '名称未設定' : undefined);

  let titlePropName = null;
  if (schema) {
    for (const [key, prop] of Object.entries(schema)) {
      if (prop.type === 'title') {
        titlePropName = key;
        break;
      }
    }
  }

  if (titleText !== undefined) {
    const propKey = titlePropName || '名前';
    properties[propKey] = {
      title: [{ text: { content: String(titleText || '名称未設定') } }]
    };
  }

  if (schema) {
    if (data.date !== undefined && schema['target_date']?.type === 'date') {
      properties['target_date'] = { date: { start: data.date.split('T')[0] } };
    }
    if (data.startHour !== undefined && schema['start_time']?.type === 'number') {
      properties['start_time'] = { number: Number(data.startHour) || 0 };
    }
    if (data.endHour !== undefined && schema['end_time']?.type === 'number') {
      properties['end_time'] = { number: Number(data.endHour) || 1 };
    }
  }

  return properties;
}

// --- Task & Area Operations ---

export async function fetchTaskTree() {
  await getTaskSchema();

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
    const type = props.type?.select?.name || props.type?.status?.name || props.type?.rich_text?.[0]?.plain_text || 'task';
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
  const properties = await buildTaskProperties({ ...task, type: 'task' }, true);
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
  const properties = await buildTaskProperties(updates, false);
  if (Object.keys(properties).length === 0) return;
  await fetchNotion(`/pages/${taskId}`, {
    method: 'PATCH',
    body: JSON.stringify({ properties })
  });
}

export async function createArea(area) {
  const properties = await buildTaskProperties({ 
    name: area.name, 
    type: 'area', 
    x: area.x, 
    y: area.y, 
    width: area.width, 
    height: area.height, 
    color: area.color 
  }, true);
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
  const properties = await buildTaskProperties(updates, false);
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
  await getScheduleSchema();

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
  const properties = await buildScheduleProperties(item, true);
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
  const properties = await buildScheduleProperties(updates, false);
  if (Object.keys(properties).length === 0) return;
  await fetchNotion(`/pages/${scheduleId}`, {
    method: 'PATCH',
    body: JSON.stringify({ properties })
  });
}
