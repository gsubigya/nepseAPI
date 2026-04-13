import https from 'https';

export const config = {
  api: {
    bodyParser: true,
  },
};

export default function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'Missing ?url= param' });

  const decoded = decodeURIComponent(url);
  if (!decoded.startsWith('https://www.nepalstock.com/')) {
    return res.status(403).json({ error: 'Only nepalstock.com is allowed' });
  }

  const parsed = new URL(decoded);
  const isPost = req.method === 'POST';
  const bodyStr = (isPost && req.body) ? JSON.stringify(req.body) : null;

  const options = {
    hostname: parsed.hostname,
    path: parsed.pathname + parsed.search,
    method: isPost ? 'POST' : 'GET',
    headers: {
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      'Referer': 'https://www.nepalstock.com/',
      'Origin': 'https://www.nepalstock.com',
      'sec-ch-ua': '"Chromium";v="122", "Not(A:Brand";v="24"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Windows"',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-origin',
      ...(bodyStr ? { 'Content-Length': Buffer.byteLength(bodyStr) } : {}),
    },
  };

  const nepseReq = https.request(options, (nepseRes) => {
    let data = '';
    nepseRes.on('data', chunk => { data += chunk; });
    nepseRes.on('end', () => {
      res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=30');
      res.setHeader('Content-Type', 'application/json');
      res.status(nepseRes.statusCode || 200);
      try {
        res.json(JSON.parse(data));
      } catch {
        res.send(data);
      }
    });
  });

  nepseReq.on('error', (err) => {
    console.error('NEPSE proxy error:', err.message);
    res.status(500).json({ error: 'Proxy request failed', detail: err.message });
  });

  nepseReq.setTimeout(10000, () => {
    nepseReq.destroy();
    res.status(504).json({ error: 'NEPSE timed out' });
  });

  if (bodyStr) nepseReq.write(bodyStr);
  nepseReq.end();
}
