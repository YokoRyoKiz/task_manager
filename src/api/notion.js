const NOTION_PROXY = '/notion-api/v1';

// IDs
const TASK_DB_ID = '32ac2487-daa9-8081-872a-e19285e2a862';
const SCHEDULE_DB_ID = '3dec2487-daa9-8083-86dd-c94a7fa578c4';

let taskSchemaCache = null;
let scheduleSchemaCache = null;

// Resolved property name maps (populated after schema load)
let taskProps = null;    // { title, type, progress, x, y, endX, endY, deadline, color }
let scheduleProps = null; // { title, date, startTime, endTime }

// ─── HTTP helper ────────────────────────────────────────────────────────────

async function fetchNotion(endpoint, options = {}) {
  const url = `${NOTION_PROXY}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });
  if (!response.ok) {
    const errorText = await response.text();
    let detail = `Notion API Error: ${response.status} - ${errorText}`;
    if (options.body) detail += `\n\n【送信Payload】\n${options.body}`;
    if (taskSchemaCache)     detail += `\n\n【Task DB Schema】\n`     + schemaStr(taskSchemaCache);
    if (scheduleSchemaCache) detail += `\n\n【Schedule DB Schema】\n` + schemaStr(scheduleSchemaCache);
    if (typeof window !== 'undefined') window.alert('【DB保存エラー】\n' + detail);
    throw new Error(detail);
  }
  return response.json();
}

function schemaStr(schema) {
  return JSON.stringify(
    Object.keys(schema).map(k => `${k} (${schema[k].type})`),
    null, 2
  );
}

// ─── Schema fetchers ─────────────────────────────────────────────────────────

async function getTaskSchema() {
  if (taskSchemaCache) return taskSchemaCache;
  try {
    const db = await fetchNotion(`/databases/${TASK_DB_ID}`);
    if (db?.properties) {
      taskSchemaCache = db.properties;
      taskProps = resolveTaskProps(taskSchemaCache);
      console.log('[Notion] Task DB props resolved:', taskProps);
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
    if (db?.properties) {
      scheduleSchemaCache = db.properties;
      scheduleProps = resolveScheduleProps(scheduleSchemaCache);
      console.log('[Notion] Schedule DB props resolved:', scheduleProps);
    }
  } catch (e) {
    console.warn('Failed to fetch schedule DB schema:', e);
  }
  return scheduleSchemaCache;
}

// ─── Schema resolution: タイプでプロパティ名を自動解決 ──────────────────────

/**
 * Notion reserved words that conflict with the API's own field names.
 * When a property's display name is one of these, we use its internal property ID instead.
 */
const NOTION_RESERVED = new Set(['id', 'object', 'archived', 'properties', 'parent', 'url',
  'created_time', 'last_edited_time', 'created_by', 'last_edited_by', 'cover', 'icon']);

/**
 * Returns the safe API key for a property.
 * If the display name conflicts with Notion's reserved words, use the internal property ID.
 */
function safeKey(displayName, schema) {
  if (!displayName) return null;
  if (NOTION_RESERVED.has(displayName) && schema?.[displayName]?.id) {
    console.warn(`[Notion] Property "${displayName}" is reserved → using internal ID "${schema[displayName].id}"`);
    return schema[displayName].id;
  }
  return displayName;
}

/**
 * Find the first property name that matches any of the given candidates (exact match, case-insensitive),
 * filtered by the expected type.
 */
function findProp(schema, expectedType, ...candidates) {
  // 1. Try exact candidate names
  for (const c of candidates) {
    const lower = c.toLowerCase();
    for (const [key, prop] of Object.entries(schema)) {
      if (prop.type === expectedType && key.toLowerCase() === lower) return key;
    }
  }
  // 2. Fallback: partial match
  for (const c of candidates) {
    const lower = c.toLowerCase();
    for (const [key, prop] of Object.entries(schema)) {
      if (prop.type === expectedType && key.toLowerCase().includes(lower)) return key;
    }
  }
  // 3. Fallback: first property of the expected type
  for (const [key, prop] of Object.entries(schema)) {
    if (prop.type === expectedType) return key;
  }
  return null;
}

function resolveTaskProps(schema) {
  const title     = findProp(schema, 'title');
  // 実際の表示名（rich_text）—「タイトル」や「名前」など
  const nameField = findProp(schema, 'rich_text', 'タイトル', '名前', '名称', 'name', 'Name', 'title_text');
  // 種別/タイプ (select or status or rich_text)
  const typeKey   = findProp(schema, 'select',    'タイプ', 'type', '種別', '区分', '区別')
                 || findProp(schema, 'status',    'タイプ', 'type', '種別', '区分', '区別')
                 || findProp(schema, 'rich_text', 'タイプ', 'type', '種別', '区分', '区別');
  const progress  = findProp(schema, 'number',    '進捗', 'progress', '進捗率');
  const x         = findProp(schema, 'number',    'x座標', 'x_position', 'x位置', 'x');
  const y         = findProp(schema, 'number',    'y座標', 'y_position', 'y位置', 'y');
  const endX      = findProp(schema, 'number',    'x終点', 'end_x_position', '終点x', 'end_x');
  const endY      = findProp(schema, 'number',    'y終点', 'end_y_position', '終点y', 'end_y');
  const deadline  = findProp(schema, 'date',      '締め切り', 'deadline', '期限', '〆切', '最終期限');
  const color     = findProp(schema, 'select',    '色', 'color')
                 || findProp(schema, 'rich_text', '色', 'color');
  return { title, nameField, typeKey, progress, x, y, endX, endY, deadline, color };
}

function resolveScheduleProps(schema) {
  const title     = findProp(schema, 'title');
  // 実際の表示名（rich_text）—「タイトル」や「名前」など
  const nameField = findProp(schema, 'rich_text', 'タイトル', '名前', '名称', 'name', 'Name', 'title_text');
  const date      = findProp(schema, 'date',   '日', '日付', 'target_date', '実施日', 'date');
  const startTime = findProp(schema, 'number', '開始時間', '開始時刻', 'start_time', '開始', 'start');
  const endTime   = findProp(schema, 'number', '終了時間', '終了時刻', 'end_time',   '終了', 'end');
  // If start/end not found by name, use 1st/2nd number prop
  const st = startTime || findNthNumberProp(schema, 0, endTime);
  const et = endTime   || findNthNumberProp(schema, 1, startTime);
  return { title, nameField, date, startTime: st, endTime: et };
}

// ─── Title extraction from page properties ───────────────────────────────────

function extractTitleFromProps(props) {
  // 1. Prefer rich_text name fields (e.g. "タイトル", "名前") — these hold the real display name
  for (const key of ['タイトル', '名前', '名称', 'name', 'Name', 'title_text']) {
    if (props[key]?.type === 'rich_text') {
      const t = props[key].rich_text?.[0]?.plain_text;
      if (t) return t;
    }
  }
  // 2. Fall back to the Notion title-type property (avoid UUID-like strings)
  for (const key in props) {
    if (props[key]?.type === 'title') {
      const t = props[key].title?.[0]?.plain_text;
      // Skip if it looks like a UUID (36 chars with hyphens) — those are garbage values
      if (t && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(t)) return t;
    }
  }
  return '名称未設定';
}

// ─── Build properties for Notion API ─────────────────────────────────────────

async function buildTaskProperties(data, isCreate = true) {
  const schema = await getTaskSchema();
  if (schema && !taskProps) taskProps = resolveTaskProps(schema);

  const properties = {};
  const titleText = data.title ?? data.name ?? (isCreate ? '名称未設定' : undefined);

  const setProp = (propName, value) => {
    if (!propName || value === undefined) return;
    const k = safeKey(propName, schema);
    if (k) properties[k] = value;
  };

  // Title (Notion required primary column — e.g. "区別")
  if (titleText !== undefined && taskProps?.title) {
    setProp(taskProps.title, { title: [{ text: { content: String(titleText || '名称未設定') } }] });
  }
  // Also save to the rich_text name field (e.g. "タイトル") — this is the actual display name
  if (titleText !== undefined && taskProps?.nameField) {
    setProp(taskProps.nameField, { rich_text: [{ text: { content: String(titleText || '名称未設定') } }] });
  }

  if (schema && taskProps) {
    // Type (task | area)
    const typeVal = data.type ?? (isCreate ? 'task' : undefined);
    if (typeVal !== undefined && taskProps.typeKey) {
      const propType = schema[taskProps.typeKey]?.type;
      if (propType === 'select')    setProp(taskProps.typeKey, { select: { name: String(typeVal) } });
      else if (propType === 'status')    setProp(taskProps.typeKey, { status: { name: String(typeVal) } });
      else if (propType === 'rich_text') setProp(taskProps.typeKey, { rich_text: [{ text: { content: String(typeVal) } }] });
    }

    // Progress
    if (taskProps.progress) {
      if (data.progress !== undefined)        setProp(taskProps.progress, { number: Number(data.progress) || 0 });
      else if (isCreate)                       setProp(taskProps.progress, { number: 0 });
    }

    // X position
    if (taskProps.x && data.x !== undefined)   setProp(taskProps.x, { number: Math.round(Number(data.x) || 0) });
    else if (taskProps.x && isCreate)           setProp(taskProps.x, { number: Math.round(Number(data.x) || 0) });

    // Y position
    if (taskProps.y && data.y !== undefined)   setProp(taskProps.y, { number: Math.round(Number(data.y) || 0) });
    else if (taskProps.y && isCreate)           setProp(taskProps.y, { number: Math.round(Number(data.y) || 0) });

    // End X (area only)
    if (taskProps.endX) {
      if (data.end_x !== undefined)
        setProp(taskProps.endX, { number: Math.round(Number(data.end_x) || 0) });
      else if (data.width !== undefined && data.x !== undefined)
        setProp(taskProps.endX, { number: Math.round((Number(data.x) || 0) + (Number(data.width) || 100)) });
    }

    // End Y (area only)
    if (taskProps.endY) {
      if (data.end_y !== undefined)
        setProp(taskProps.endY, { number: Math.round(Number(data.end_y) || 0) });
      else if (data.height !== undefined && data.y !== undefined)
        setProp(taskProps.endY, { number: Math.round((Number(data.y) || 0) + (Number(data.height) || 100)) });
    }

    // Deadline
    if (taskProps.deadline && data.deadline !== undefined) {
      setProp(taskProps.deadline, data.deadline ? { date: { start: data.deadline } } : null);
    }

    // Color
    if (taskProps.color) {
      const colorVal = data.color ?? (data.type === 'area' ? 'rgba(255, 255, 255, 0.1)' : 'yellow');
      if (data.color !== undefined || isCreate) {
        const propType = schema[taskProps.color]?.type;
        if (propType === 'select')    setProp(taskProps.color, { select: { name: String(colorVal) } });
        else if (propType === 'rich_text') setProp(taskProps.color, { rich_text: [{ text: { content: String(colorVal) } }] });
      }
    }
  }

  return properties;
}

async function buildScheduleProperties(data, isCreate = true) {
  const schema = await getScheduleSchema();
  if (schema && !scheduleProps) scheduleProps = resolveScheduleProps(schema);

  const properties = {};
  const titleText = data.title ?? (isCreate ? '名称未設定' : undefined);

  const setProp = (propName, value) => {
    if (!propName || value === undefined) return;
    const k = safeKey(propName, schema);
    if (k) properties[k] = value;
  };

  // Title (Notion required column — e.g. "区別")
  if (titleText !== undefined && scheduleProps?.title) {
    setProp(scheduleProps.title, { title: [{ text: { content: String(titleText || '名称未設定') } }] });
  }
  // Also save to rich_text name field (e.g. "タイトル") — actual display name
  if (titleText !== undefined && scheduleProps?.nameField) {
    setProp(scheduleProps.nameField, { rich_text: [{ text: { content: String(titleText || '名称未設定') } }] });
  }

  if (schema && scheduleProps) {
    if (data.date !== undefined && scheduleProps.date)
      setProp(scheduleProps.date, { date: { start: data.date.split('T')[0] } });
    if (data.startHour !== undefined && scheduleProps.startTime)
      setProp(scheduleProps.startTime, { number: Number(data.startHour) || 0 });
    if (data.endHour !== undefined && scheduleProps.endTime)
      setProp(scheduleProps.endTime, { number: Number(data.endHour) || 1 });
  }

  return properties;
}

// ─── fetchTaskTree ────────────────────────────────────────────────────────────

export async function fetchTaskTree() {
  const schema = await getTaskSchema();

  const data = await fetchNotion(`/databases/${TASK_DB_ID}/query`, {
    method: 'POST',
    body: JSON.stringify({ page_size: 100 }),
  });

  // Build schema from query results if DB fetch failed
  if (data.results?.length > 0 && !taskSchemaCache) {
    taskSchemaCache = {};
    for (const key in data.results[0].properties) {
      taskSchemaCache[key] = {
        type: data.results[0].properties[key].type,
        id:   data.results[0].properties[key].id,
        name: key,
      };
    }
    taskProps = resolveTaskProps(taskSchemaCache);
  }

  const tp = taskProps || resolveTaskProps(taskSchemaCache || {});
  console.log('[Notion] fetchTaskTree using props:', tp);

  const tasks = [];
  const areas = [];
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  for (const page of data.results) {
    const props = page.properties;

    // ── Type determination ──────────────────────────────────────────────────
    // typeKey が見つかっていればそのプロパティの値、なければ 'task' をデフォルトに
    let type = 'task';
    if (tp.typeKey && props[tp.typeKey]) {
      type = props[tp.typeKey].select?.name
          || props[tp.typeKey].status?.name
          || props[tp.typeKey].rich_text?.[0]?.plain_text
          || 'task';
    }

    const title = extractTitleFromProps(props);

    if (type === 'task') {
      const progress = (tp.progress ? props[tp.progress]?.number : null) ?? 0;

      if (progress === 100) {
        const lastEdited = new Date(page.last_edited_time);
        if (lastEdited < startOfToday) {
          deletePage(page.id).catch(err => console.error('Failed to auto-cleanup task:', err));
          continue;
        }
      }

      tasks.push({
        id:        page.id,
        title,
        progress,
        completed: progress === 100,
        x:         (tp.x        ? props[tp.x]?.number        : null) ?? 0,
        y:         (tp.y        ? props[tp.y]?.number        : null) ?? 0,
        deadline:  (tp.deadline ? props[tp.deadline]?.date?.start : null) ?? null,
        color:     (tp.color    ? props[tp.color]?.rich_text?.[0]?.plain_text || props[tp.color]?.select?.name : null) ?? 'yellow',
      });

    } else if (type === 'area') {
      const x    = (tp.x    ? props[tp.x]?.number    : null) ?? 0;
      const y    = (tp.y    ? props[tp.y]?.number    : null) ?? 0;
      const endX = (tp.endX ? props[tp.endX]?.number : null) ?? (x + 200);
      const endY = (tp.endY ? props[tp.endY]?.number : null) ?? (y + 150);

      areas.push({
        id:     page.id,
        name:   title,
        title:  title,
        x,
        y,
        width:  endX - x,
        height: endY - y,
        color:  (tp.color ? props[tp.color]?.rich_text?.[0]?.plain_text || props[tp.color]?.select?.name : null) ?? 'rgba(255, 255, 255, 0.1)',
      });
    }
  }

  return { tasks, areas };
}

// ─── CRUD operations ──────────────────────────────────────────────────────────

export async function createTask(task) {
  const properties = await buildTaskProperties({ ...task, type: 'task' }, true);
  const data = await fetchNotion(`/pages`, {
    method: 'POST',
    body: JSON.stringify({ parent: { database_id: TASK_DB_ID }, properties }),
  });
  return data.id;
}

export async function updateTask(taskId, updates) {
  const properties = await buildTaskProperties(updates, false);
  if (Object.keys(properties).length === 0) return;
  await fetchNotion(`/pages/${taskId}`, {
    method: 'PATCH',
    body: JSON.stringify({ properties }),
  });
}

export async function createArea(area) {
  const properties = await buildTaskProperties({
    name:   area.name,
    type:   'area',
    x:      area.x,
    y:      area.y,
    width:  area.width,
    height: area.height,
    color:  area.color,
  }, true);
  const data = await fetchNotion(`/pages`, {
    method: 'POST',
    body: JSON.stringify({ parent: { database_id: TASK_DB_ID }, properties }),
  });
  return data.id;
}

export async function updateArea(areaId, updates) {
  const properties = await buildTaskProperties(updates, false);
  if (Object.keys(properties).length === 0) return;
  await fetchNotion(`/pages/${areaId}`, {
    method: 'PATCH',
    body: JSON.stringify({ properties }),
  });
}

export async function deletePage(pageId) {
  await fetchNotion(`/pages/${pageId}`, {
    method: 'PATCH',
    body: JSON.stringify({ archived: true }),
  });
}

// ─── Schedule operations ──────────────────────────────────────────────────────

export async function fetchSchedules() {
  const schema = await getScheduleSchema();

  const data = await fetchNotion(`/databases/${SCHEDULE_DB_ID}/query`, {
    method: 'POST',
    body: JSON.stringify({ page_size: 100 }),
  });

  if (data.results?.length > 0 && !scheduleSchemaCache) {
    scheduleSchemaCache = {};
    for (const key in data.results[0].properties) {
      scheduleSchemaCache[key] = {
        type: data.results[0].properties[key].type,
        id:   data.results[0].properties[key].id,
        name: key,
      };
    }
    scheduleProps = resolveScheduleProps(scheduleSchemaCache);
  }

  const sp = scheduleProps || resolveScheduleProps(scheduleSchemaCache || {});
  console.log('[Notion] fetchSchedules using props:', sp);

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const schedules = [];
  for (const page of data.results) {
    const props   = page.properties;
    const dateStr = sp.date ? props[sp.date]?.date?.start : null;

    if (dateStr) {
      const targetDate = new Date(dateStr);
      targetDate.setHours(0, 0, 0, 0);
      const diffDays = Math.ceil((startOfToday - targetDate) / (1000 * 60 * 60 * 24));
      if (diffDays >= 2) {
        deletePage(page.id).catch(err => console.error('Failed to auto-cleanup schedule:', err));
        continue;
      }
    }

    const title = extractTitleFromProps(props);

    schedules.push({
      id:        page.id,
      title,
      date:      dateStr || new Date().toISOString().split('T')[0],
      startHour: (sp.startTime ? props[sp.startTime]?.number : null) ?? 0,
      endHour:   (sp.endTime   ? props[sp.endTime]?.number   : null) ?? 1,
      color:     'blue',
    });
  }
  return schedules;
}

export async function createSchedule(item) {
  const properties = await buildScheduleProperties(item, true);
  const data = await fetchNotion(`/pages`, {
    method: 'POST',
    body: JSON.stringify({ parent: { database_id: SCHEDULE_DB_ID }, properties }),
  });
  return data.id;
}

export async function updateSchedule(scheduleId, updates) {
  const properties = await buildScheduleProperties(updates, false);
  if (Object.keys(properties).length === 0) return;
  await fetchNotion(`/pages/${scheduleId}`, {
    method: 'PATCH',
    body: JSON.stringify({ properties }),
  });
}
