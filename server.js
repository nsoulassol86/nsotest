const express = require('express');
const path = require('path');
const app = express();

const PORT = process.env.PORT || 3000;

// Log toutes les requêtes
app.use((req, res, next) => {
  next();
});

// Proxy pour les URLs HTTP
app.get('/api/proxy', async (req, res) => {
  const url = req.query.url;

  if (!url) {
    return res.status(400).send('Missing url parameter');
  }

  // Liste de proxies à essayer
  const proxyServices = [
    // Direct fetch
    { name: 'direct', getUrl: (u) => u },
    // AllOrigins
    { name: 'allorigins', getUrl: (u) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}` },
    // corsproxy.io
    { name: 'corsproxy', getUrl: (u) => `https://corsproxy.io/?${encodeURIComponent(u)}` },
  ];

  for (const proxy of proxyServices) {
    try {
      const targetUrl = proxy.getUrl(url);
      console.log(`Trying ${proxy.name}: ${targetUrl}`);

      const response = await fetch(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': '*/*',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      });

      if (response.ok) {
        const text = await response.text();
        console.log(`Success with ${proxy.name}`);

        res.set('Content-Type', 'text/plain; charset=utf-8');
        res.set('Access-Control-Allow-Origin', '*');
        return res.send(text);
      }

      console.log(`${proxy.name} failed with status ${response.status}`);
    } catch (error) {
      console.log(`${proxy.name} error: ${error.message}`);
    }
  }

  res.status(502).send('All proxy methods failed');
});

// Servir l'app Angular (fichiers statiques)
app.use(express.static(path.join(__dirname, 'dist/nsotest/browser')));

// SPA fallback - toutes les routes vers index.html
app.get('/{*path}', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist/nsotest/browser/index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
