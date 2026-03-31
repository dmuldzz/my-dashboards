// Proxy v5 — updated 2026-03-31 — improved headers to fix RSS 403s
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
    // NHL APIs
    'api-web.nhle.com',
    'api.nhle.com',
    'suggest.svc.nhl.com',
    'records.nhl.com',
    'stats.nhl.com',
    'www.nhl.com',
    'nhl.com',
 
    // Sports data
    'site.api.espn.com',
    'api.mysportsfeeds.com',
    'financialmodelingprep.com',
 
    // Finance / misc
    'api.coingecko.com',
    'finnhub.io',
    'api.alternative.me',
    'query1.finance.yahoo.com',
    'query2.finance.yahoo.com',
    'finance.yahoo.com',
    'sports.yahoo.com',
 
    // Anthropic
    'api.anthropic.com',
 
    // NEWS SOURCES
    'thehockeywriters.com',
    'prohockeynews.com',
    'www.sportsnet.ca',
    'sportsnet.ca',
    'www.tsn.ca',
    'tsn.ca',
 
    // RUMOUR SOURCES
    'www.prohockeyrumors.com',
    'nhlrumors.com',
    'www.spectorshockey.net',
    'www.hockeybuzz.com',
    'feeds.feedburner.com',
    'www.nhltraderumor.com',
 
    // PREVIOUSLY EXISTING
    'rss.cbssports.com',
    'sportsnaut.com',
    'www.reddit.com',
    'reddit.com',
    'api.rss2json.com',
    'www.dailyfaceoff.com',
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
    // Detect RSS requests — they need browser-style headers or many servers 403
    const isRSS = targetUrl.includes('/feed') || targetUrl.includes('rss') || targetUrl.includes('feedburner');
 
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
      'Accept': isRSS
        ? 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8'
        : 'application/json, text/plain, */*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
      'Sec-Fetch-Dest': isRSS ? 'document' : 'empty',
      'Sec-Fetch-Mode': isRSS ? 'navigate' : 'cors',
      'Sec-Fetch-Site': 'none',
      'Sec-Ch-Ua': '"Google Chrome";v="123", "Not:A-Brand";v="8"',
      'Sec-Ch-Ua-Mobile': '?0',
      'Sec-Ch-Ua-Platform': '"Windows"',
    };
 
    if (req.headers['content-type']) headers['content-type'] = req.headers['content-type'];
 
    // Inject Anthropic headers server-side
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
        error: 'Upstream error',
        status: response.status,
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
 
