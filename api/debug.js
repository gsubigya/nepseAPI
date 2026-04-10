// Debug endpoint - visit /api/debug to test if proxy works at all
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  const results = {};

  // Test 1: basic fetch to NEPSE
  try {
    const r = await fetch('https://www.nepalstock.com/api/nots/nepse-data/market-open', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://www.nepalstock.com/',
        'Accept': 'application/json',
      }
    });
    results.fetch_status = r.status;
    results.fetch_ok = r.ok;
    if (r.ok) {
      results.fetch_body = await r.json();
    } else {
      results.fetch_text = await r.text();
    }
  } catch(e) {
    results.fetch_error = e.message;
  }

  return res.status(200).json({
    node_version: process.version,
    timestamp: new Date().toISOString(),
    results,
  });
}
