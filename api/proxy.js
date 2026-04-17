// Proxy v6 — updated for 3401 V4 AI features
// Change from v5: injects ANTHROPIC_API_KEY from Vercel env variable
// Add to Vercel: Settings → Environment Variables → ANTHROPIC_API_KEY = sk-ant-...
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
 
    // Anthropic — for 3401 AI features
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
 
    // Weather
    'api.open-meteo.com',
 
    // RedFlagDeals
    'forums.redflagdeals.com',
    'www.redflagdeals.com',
 
    // MLB
    'statsapi.mlb.com',
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
    const isRSS = targetUrl.includes('/feed') || targetUrl.includes('rss') || targetUrl.includes('feedburner');
    const isAnthropic = hostname === 'api.anthropic.com';
 
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
 
    // ── Anthropic AI: inject API key from environment variable ──
    // Add ANTHROPIC_API_KEY to Vercel: Settings → Environment Variables
    if (isAnthropic) {
      if (!process.env.ANTHROPIC_API_KEY) {
        return res.status(500).json({
          error: 'ANTHROPIC_API_KEY not set in Vercel environment variables. ' +
                 'Go to Vercel → Your Project → Settings → Environment Variables and add it.'
        });
      }
      headers['x-api-key'] = process.env.ANTHROPIC_API_KEY;
      headers['anthropic-version'] = '2023-06-01';
      headers['content-type'] = 'application/json';
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
        detail: errText.substring(0, 500),
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
