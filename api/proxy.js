export default async function handler(req, res) {
  // Allow all origins (public dashboard)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // ?url= param tells us which NEPSE endpoint to hit
  const { url } = req.query;
  if (!url) {
    return res.status(400).json({ error: 'Missing ?url= parameter' });
  }

  // Only allow NEPSE domains for security
  const decoded = decodeURIComponent(url);
  if (!decoded.startsWith('https://www.nepalstock.com/')) {
    return res.status(403).json({ error: 'Only nepalstock.com URLs are allowed' });
  }

  try {
    const fetchOptions = {
      method: req.method === 'POST' ? 'POST' : 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Referer': 'https://www.nepalstock.com/',
        'Origin': 'https://www.nepalstock.com',
      },
    };

    if (req.method === 'POST' && req.body) {
      fetchOptions.body = JSON.stringify(req.body);
    }

    const nepseRes = await fetch(decoded, fetchOptions);

    if (!nepseRes.ok) {
      return res.status(nepseRes.status).json({
        error: `NEPSE returned ${nepseRes.status}`,
        statusText: nepseRes.statusText,
      });
    }

    const data = await nepseRes.json();

    // Cache for 60 seconds on Vercel edge
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=30');
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
