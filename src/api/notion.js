const NOTION_PROXY = '/notion-api/v1';

// IDs
const TASK_DB_ID = '32ac2487-daa9-8081-872a-e19285e2a862';
const SCHEDULE_DB_ID = '3dec2487-daa9-8083-86dd-c94a7fa578c4';

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
    const type = props.type.select?.name;
    const title = props.title.rich_text[0]?.plain_text || '名称未設定';

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
        id: page.id, // Notion Page ID is uuid
        title,
        progress: progress,
        completed: progress === 100,
        x: props.x_position?.number || 0,
        y: props.y_position?.number || 0,
        deadline: props.deadline?.date?.start || null,
        color: props.color?.rich_text[0]?.plain_text || 'yellow'
      });
    } else if (type === 'area') {
      areas.push({
        id: page.id,
        name: title,
        x: props.x_position?.number || 0,
        y: props.y_position?.number || 0,
        width: props.end_x_position?.number ? props.end_x_position.number - (props.x_position?.number || 0) : 100,
        height: props.end_y_position?.number ? props.end_y_position.number - (props.y_position?.number || 0) : 100,
        color: props.color?.rich_text[0]?.plain_text || 'rgba(255, 255, 255, 0.1)'
      });
    }
  }
  return { tasks, areas };
}

export async function createTask(task) {
  const data = await fetchNotion(`/pages`, {
    method: 'POST',
    body: JSON.stringify({
      parent: { database_id: TASK_DB_ID },
      properties: {
        "title": { title: [{ text: { content: task.id || 'task' } }] },
        "%60mnP": { rich_text: [{ text: { content: task.title } }] },
        type: { select: { name: 'task' } },
        progress: { number: task.progress || 0 },
        x_position: { number: task.x },
        y_position: { number: task.y },
        deadline: task.deadline ? { date: { start: task.deadline } } : null,
        color: { rich_text: [{ text: { content: task.color } }] }
      }
    })
  });
  return data.id;
}

export async function updateTask(taskId, updates) {
  const properties = {};
  if (updates.title !== undefined) properties["%60mnP"] = { rich_text: [{ text: { content: updates.title } }] };
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
  const data = await fetchNotion(`/pages`, {
    method: 'POST',
    body: JSON.stringify({
      parent: { database_id: TASK_DB_ID },
      properties: {
        "title": { title: [{ text: { content: area.id || 'area' } }] },
        "%60mnP": { rich_text: [{ text: { content: area.name } }] },
        type: { select: { name: 'area' } },
        x_position: { number: area.x },
        y_position: { number: area.y },
        end_x_position: { number: area.x + area.width },
        end_y_position: { number: area.y + area.height },
        color: { rich_text: [{ text: { content: area.color } }] }
      }
    })
  });
  return data.id;
}

export async function updateArea(areaId, updates) {
  const properties = {};
  if (updates.name !== undefined) properties["%60mnP"] = { rich_text: [{ text: { content: updates.name } }] };
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
        continue; // Skip adding to results
      }
    }

    schedules.push({
      id: page.id,
      title: props.title.rich_text[0]?.plain_text || '名称未設定',
      date: dateStr || new Date().toISOString().split('T')[0],
      startHour: props.start_time?.number || 0,
      endHour: props.end_time?.number || 1,
      color: 'blue' // schedule items are mostly blue for now
    });
  }
  return schedules;
}

export async function createSchedule(item) {
  const data = await fetchNotion(`/pages`, {
    method: 'POST',
    body: JSON.stringify({
      parent: { database_id: SCHEDULE_DB_ID },
      properties: {
        "title": { title: [{ text: { content: item.id || 'schedule' } }] },
        "uO_J": { rich_text: [{ text: { content: item.title } }] },
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
  if (updates.title !== undefined) properties["uO_J"] = { rich_text: [{ text: { content: updates.title } }] };
  if (updates.date !== undefined) properties.target_date = { date: { start: updates.date.split('T')[0] } };
  if (updates.startHour !== undefined) properties.start_time = { number: updates.startHour };
  if (updates.endHour !== undefined) properties.end_time = { number: updates.endHour };

  await fetchNotion(`/pages/${scheduleId}`, {
    method: 'PATCH',
    body: JSON.stringify({ properties })
  });
}
