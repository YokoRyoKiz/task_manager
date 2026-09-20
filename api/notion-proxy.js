export default async function handler(req, res) {
  const { endpoint, ...queryParams } = req.query;
  
  if (!endpoint) {
    return res.status(400).json({ error: 'Endpoint is required' });
  }

  // URLを組み立てる
  const url = new URL(`https://api.notion.com/${endpoint}`);
  for (const [key, value] of Object.entries(queryParams)) {
    url.searchParams.append(key, value);
  }

  const options = {
    method: req.method,
    headers: {
      'Authorization': `Bearer ${process.env.NOTION_API_KEY}`,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json'
    }
  };

  // POSTやPATCHの場合、bodyを付与する
  if (req.body && req.method !== 'GET' && req.method !== 'HEAD') {
    options.body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
  }

  try {
    const response = await fetch(url.toString(), options);
    
    // レスポンスのコンテンツタイプがJSONでない可能性を考慮する
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const data = await response.json();
      res.status(response.status).json(data);
    } else {
      const text = await response.text();
      res.status(response.status).send(text);
    }
  } catch (error) {
    console.error('Notion API Error:', error);
    res.status(500).json({ error: error.message });
  }
}
