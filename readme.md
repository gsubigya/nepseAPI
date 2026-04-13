# nepseAPI — NEPSE Live Stock Market Dashboard

A lightweight dashboard for the Nepal Stock Exchange (NEPSE) live market data, deployed on [Vercel](https://vercel.com).

## Architecture

```
index.html          — frontend dashboard (fetches via /api/proxy)
api/proxy.js        — Vercel serverless function that proxies requests to nepalstock.com
vercel.json         — routing: API calls go to serverless functions, everything else serves index.html
```

## How It Works

The browser cannot call `https://www.nepalstock.com` directly due to CORS restrictions.  
`api/proxy.js` is a Vercel serverless function that:
- Accepts a `?url=` query parameter pointing to a `nepalstock.com` endpoint
- Forwards the request (with the required headers) to NEPSE
- Returns the JSON response to the browser

## Local Development

```bash
npm install -g vercel
vercel dev
```

Then open `http://localhost:3000`.

## Deployment

Push to your GitHub repo and connect it to a Vercel project. Vercel will automatically deploy `api/proxy.js` as a serverless function.
