// api/proxy.js — hosted in my-dashboards repo
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key, anthropic-version, Accept');
 
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
 
  const targetUrl = req.query.url;
  if (!targetUrl) {
    return res.status(400).json({ error: 'Missing ?url= parameter' });
  }
 
  const allowedDomains = [
    // NHL
    'api-web.nhle.com', 'api.nhle.com', 'suggest.svc.nhl.com',
    'records.nhl.com', 'stats.nhl.com', 'www.nhl.com', 'nhl.com',
    // Market data
    'finnhub.io', 'api.coingecko.com', 'api.alternative.me',
    'query1.finance.yahoo.com', 'query2.finance.yahoo.com', 'finance.yahoo.com',
    // FMP
    'financialmodelingprep.com',
    // Anthropic
    'api.anthropic.com',
    // News
    'sports.yahoo.com', 'www.prohockeyrumors.com', 'nhlrumors.com',
    'thehockeywriters.com', 'www.dailyfaceoff.com',
    'site.api.espn.com', 'rss.cbssports.com',
    // Other
    'api.mysportsfeeds.com', 'www.tsn.ca', 'tsn.ca',
    'www.sportsnet.ca', 'sportsnet.ca',
  ];
 
  let parsedUrl;
  try {
    parsedUrl = new URL(targetUrl);
  } catch (e) {
    return res.status(400).json({ error: 'Invalid URL' });
  }
 
  const hostname = parsedUrl.hostname;
  const isAllowed = allowedDomains.some(d => hostname === d || hostname.endsWith('.' + d));
  if (!isAllowed) {
    return res.status(403).json({ error: 'Domain not allowed: ' + hostname });
  }
 
  try {
    const headers = {
      'Accept': 'application/json, text/plain, */*',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept-Language': 'en-US,en;q=0.9',
    };
 
    if (req.headers['content-type']) headers['content-type'] = req.headers['content-type'];
 
    // Inject Anthropic required headers server-side
    if (hostname === 'api.anthropic.com') {
      headers['x-api-key'] = '';
      headers['anthropic-version'] = '2023-06-01';
    }
 
    const fetchOptions = { headers, redirect: 'follow', method: req.method };
 
    if (req.method === 'POST' && req.body) {
      fetchOptions.body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
      if (!headers['content-type']) headers['content-type'] = 'application/json';
    }
 
    const response = await fetch(targetUrl, fetchOptions);
 
    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({
        error: 'Upstream error', status: response.status,
        detail: errText.substring(0, 200),
      });
    }
 
    const contentType = response.headers.get('content-type') || 'application/json';
    const data = await response.text();
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).send(data);
 
  } catch (error) {
    return res.status(500).json({ error: 'Proxy fetch failed', message: error.message });
  }
}
