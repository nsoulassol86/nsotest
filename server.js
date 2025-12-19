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

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!response.ok) {
      return res.status(response.status).send(`HTTP error: ${response.status}`);
    }

    res.set('Content-Type', 'text/plain; charset=utf-8');
    res.set('Access-Control-Allow-Origin', '*');
    res.send(text);
  } catch (error) {
    console.error('Proxy error:', error.message);
    res.status(500).send(`Proxy error: ${error.message}`);
  }
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
