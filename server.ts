import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;
  const isProduction = process.env.NODE_ENV === 'production';

  app.use(express.json());

  // Global CORS headers for API routes
  app.use('/api', (req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Range, Authorization, Accept');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Content-Type');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // Diagnostic Endpoint to test connectivity to an IPTV stream or server
  app.get('/api/test-stream', async (req, res) => {
    const targetUrl = req.query.url as string;
    if (!targetUrl || (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://'))) {
      return res.status(400).json({ error: 'URL invalide. Doit commencer par http:// ou https://' });
    }

    const startTime = Date.now();
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 7000);

      const response = await fetch(targetUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'VLC/3.0.18 LibVLC/3.0.18',
          'Accept': '*/*',
        },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      const latencyMs = Date.now() - startTime;
      const contentType = response.headers.get('content-type') || 'inconnu';
      const isOk = response.ok;

      return res.json({
        success: isOk,
        status: response.status,
        statusText: response.statusText,
        contentType,
        latencyMs,
        message: isOk
          ? `Flux accessible (${latencyMs}ms, ${contentType})`
          : `Le serveur a renvoyé le statut HTTP ${response.status} (${response.statusText})`,
      });
    } catch (err: any) {
      const latencyMs = Date.now() - startTime;
      return res.status(502).json({
        success: false,
        error: err.name === 'AbortError' ? 'TIMEOUT' : 'CONNECTION_ERROR',
        latencyMs,
        message: err.name === 'AbortError'
          ? 'Délai d’attente dépassé (timeout 7s). Le serveur ne répond pas.'
          : `Erreur de connexion : ${err.message || 'Serveur inaccessible'}`,
      });
    }
  });

  // Secure Streaming Proxy Endpoint for Browser Playback
  // Solves Mixed Content (HTTP on HTTPS) and CORS limitations of IPTV servers
  app.get('/api/stream-proxy', async (req, res) => {
    const targetUrl = req.query.url as string;
    if (!targetUrl || (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://'))) {
      return res.status(400).send('Paramètre url manquant ou invalide');
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);

      const forwardHeaders: Record<string, string> = {
        'User-Agent': 'VLC/3.0.18 LibVLC/3.0.18',
        'Accept': '*/*',
      };

      if (req.headers.range) {
        forwardHeaders['Range'] = req.headers.range;
      }

      const upstreamRes = await fetch(targetUrl, {
        headers: forwardHeaders,
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!upstreamRes.ok && upstreamRes.status !== 206) {
        let errorHint = `Erreur HTTP ${upstreamRes.status} (${upstreamRes.statusText})`;
        if (upstreamRes.status === 401) {
          errorHint = 'Identifiants IPTV invalides ou compte expiré (401 Unauthorized)';
        } else if (upstreamRes.status === 403) {
          errorHint = 'Accès interdit par le serveur IPTV (403 Forbidden - vérifiez l’adresse IP ou le token)';
        } else if (upstreamRes.status === 404) {
          errorHint = 'Flux introuvable ou chaîne temporairement hors ligne (404 Not Found)';
        }
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        return res.status(upstreamRes.status).send(errorHint);
      }

      const contentType = upstreamRes.headers.get('content-type') || '';
      const isM3U8 =
        targetUrl.includes('.m3u8') ||
        contentType.includes('mpegurl') ||
        contentType.includes('application/x-mpegurl');

      if (isM3U8) {
        // Parse and rewrite M3U8 playlist lines so chunks route through this secure proxy
        const text = await upstreamRes.text();
        const lines = text.split(/\r?\n/);
        const rewrittenLines: string[] = [];

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) {
            rewrittenLines.push(line);
            continue;
          }

          if (trimmed.startsWith('#')) {
            // Rewrite URI="..." in EXT-X-KEY or EXT-X-MEDIA if present
            if (trimmed.includes('URI="')) {
              const rewrittenTag = trimmed.replace(/URI="([^"]+)"/g, (_match, uri) => {
                try {
                  const absoluteUri = new URL(uri, targetUrl).href;
                  return `URI="/api/stream-proxy?url=${encodeURIComponent(absoluteUri)}"`;
                } catch {
                  return _match;
                }
              });
              rewrittenLines.push(rewrittenTag);
            } else {
              rewrittenLines.push(line);
            }
          } else {
            // URI line (segment or sub-playlist)
            try {
              const absoluteUri = new URL(trimmed, targetUrl).href;
              rewrittenLines.push(`/api/stream-proxy?url=${encodeURIComponent(absoluteUri)}`);
            } catch {
              rewrittenLines.push(line);
            }
          }
        }

        res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        return res.send(rewrittenLines.join('\n'));
      }

      // Binary media chunk (.ts, .mp4, audio/aac, etc.)
      res.status(upstreamRes.status);
      if (contentType) {
        res.setHeader('Content-Type', contentType);
      } else if (targetUrl.includes('.ts')) {
        res.setHeader('Content-Type', 'video/mp2t');
      }
      const contentLength = upstreamRes.headers.get('content-length');
      if (contentLength) {
        res.setHeader('Content-Length', contentLength);
      }
      const contentRange = upstreamRes.headers.get('content-range');
      if (contentRange) {
        res.setHeader('Content-Range', contentRange);
      }
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Cache-Control', 'public, max-age=3600');

      if (upstreamRes.body) {
        // Stream the chunk bytes to response
        // @ts-ignore Node ReadableStream compatibility
        const reader = upstreamRes.body.getReader();
        const pump = async () => {
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              if (!res.write(value)) {
                await new Promise((resolve) => res.once('drain', resolve));
              }
            }
            res.end();
          } catch (streamErr) {
            res.destroy();
          }
        };
        pump();
      } else {
        res.end();
      }
    } catch (err: any) {
      if (!res.headersSent) {
        res.status(502).setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.send(
          err.name === 'AbortError'
            ? 'Timeout : le serveur IPTV distant met trop de temps à répondre.'
            : `Erreur proxy : ${err.message || 'Serveur distant inaccessible'}`
        );
      }
    }
  });

  // Frontend mounting
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`BeShare TV server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
