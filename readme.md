# nepseAPI — NEPSE Live Stock Market Dashboard

A dynamic dashboard for the Nepal Stock Exchange (NEPSE) live market data, deployed on [Vercel](https://vercel.com).

**Live:** [nepalstock.vercel.app](https://nepalstock.vercel.app)

## Features

- **Real-time stock data** from NEPSE via proxy
- **Summary stat cards** — total stocks, advancing/declining counts, top gainer & loser
- **Best & worst performers** — top 5 gainers and losers by % change
- **Search** — instant client-side filtering by symbol or company name
- **Filters** — positive/negative change, volume bucket, sector
- **Sortable columns** — click any column header to sort (LTP, change, %, volume, turnover)
- **High/low highlighting** — rows highlighted when LTP equals day high or day low
- **Responsive layout** — works on desktop, tablet, and mobile
- **Error resilience** — graceful handling of API failures, loading and empty states

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
- Returns consistent JSON error payloads on failure (never raw text)

## Local Development

```bash
npm install -g vercel
vercel dev
```

Then open `http://localhost:3000`.

## Deployment

Push to your GitHub repo and connect it to a Vercel project. Vercel will automatically deploy `api/proxy.js` as a serverless function.
