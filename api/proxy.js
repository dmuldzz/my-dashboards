// Proxy v4 — updated 2026-03-31 — news & rumours sources expanded
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
 
    // -----------------------------------------------
    // NEWS SOURCES (4 feeds)
    // -----------------------------------------------
    'thehockeywriters.com',         // Hockey Writers — general NHL news
    'prohockeynews.com',            // Pro Hockey News — broad coverage
    'www.sportsnet.ca',             // Sportsnet — Canadian insiders
    'sportsnet.ca',
    'www.tsn.ca',                   // TSN — Canadian insiders
    'tsn.ca',
 
    // -----------------------------------------------
    // RUMOUR SOURCES (6 feeds)
    // -----------------------------------------------
    'www.prohockeyrumors.com',      // Pro Hockey Rumors — primary rumour source
    'nhlrumors.com',                // NHL Rumors — trade/injury rumours
    'www.spectorshockey.net',       // Spector's Hockey — daily rumour roundup
    'www.hockeybuzz.com',           // Hockey Buzz — insider rumours
    'feeds.feedburner.com',         // Kukla's Korner (via FeedBurner)
    'www.nhltraderumor.com',        // NHL Trade Rumor — active rumour site
 
    // -----------------------------------------------
    // PREVIOUSLY EXISTING — kept for other features
    // -----------------------------------------------
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
    const headers = {
      'Accept': 'application/json, text/plain, */*',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept-Language': 'en-US,en;q=0.9',
    };
 
    if (req.headers['content-type']) headers['content-type'] = req.headers['content-type'];
 
    // Inject Anthropic headers server-side (avoids CORS preflight issues)
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
