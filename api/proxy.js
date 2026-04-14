import fs from 'fs';
import https from 'https';

const SYSTEM_CA_PATHS = [
  '/etc/ssl/certs/ca-certificates.crt',
  '/etc/pki/tls/certs/ca-bundle.crt',
  '/etc/ssl/ca-bundle.pem',
];

const getSystemCaBundle = () => {
  for (const p of SYSTEM_CA_PATHS) {
    try {
      if (fs.existsSync(p)) return fs.readFileSync(p, 'utf8');
    } catch {
      // ignore and try the next common location
    }
  }
  return null;
};

const systemCaBundle = getSystemCaBundle();
const systemCaAgent = systemCaBundle ? new https.Agent({ ca: systemCaBundle }) : null;

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

  let parsed;
  try {
    parsed = new URL(decoded);
  } catch {
    return res.status(400).json({ error: 'Invalid URL' });
  }

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
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
      'Referer': 'https://www.nepalstock.com/',
      'Origin': 'https://www.nepalstock.com',
      'sec-ch-ua': '"Chromium";v="130", "Not?A_Brand";v="99"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Windows"',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-origin',
      ...(bodyStr ? { 'Content-Length': Buffer.byteLength(bodyStr) } : {}),
    },
  };

  const isTlsChainError = (err) => {
    const msg = String(err?.message || '').toLowerCase();
    return (
      err?.code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE' ||
      err?.code === 'UNABLE_TO_GET_ISSUER_CERT_LOCALLY' ||
      msg.includes('unable to verify the first certificate')
    );
  };

  let responded = false;

  const sendRequest = (useSystemCaRetry = false) => {
    const reqOptions = (useSystemCaRetry && systemCaAgent) ? { ...options, agent: systemCaAgent } : options;
    const nepseReq = https.request(reqOptions, (nepseRes) => {
      let data = '';
      nepseRes.on('data', chunk => { data += chunk; });
      nepseRes.on('end', () => {
        if (responded) return;
        responded = true;
        res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=30');
        res.setHeader('Content-Type', 'application/json');

        const upstream = nepseRes.statusCode || 200;
        if (upstream >= 400) {
          return res.status(upstream).json({
            error: `Upstream returned ${upstream}`,
            detail: data.substring(0, 500),
          });
        }

        try {
          res.status(200).json(JSON.parse(data));
        } catch {
          res.status(502).json({
            error: 'Invalid JSON from upstream',
            detail: data.substring(0, 500),
          });
        }
      });
    });

    nepseReq.on('error', (err) => {
      if (responded) return;
      if (!useSystemCaRetry && systemCaAgent && isTlsChainError(err)) {
        console.warn('NEPSE proxy TLS verification failed; retrying with system CA bundle:', err.message);
        return sendRequest(true);
      }
      responded = true;
      console.error('NEPSE proxy error:', err.message);
      res.status(502).json({ error: 'Proxy request failed', detail: err.message });
    });

    nepseReq.setTimeout(15000, () => {
      nepseReq.destroy();
      if (responded) return;
      responded = true;
      res.status(504).json({ error: 'NEPSE request timed out' });
    });

    if (bodyStr) nepseReq.write(bodyStr);
    nepseReq.end();
  };

  sendRequest(false);
}
