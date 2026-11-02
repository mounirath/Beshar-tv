import type { IncomingMessage, ServerResponse } from 'http';
import fs from 'fs';
import path from 'path';

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  let m3uContent = '#EXTM3U\n';
  try {
    const p = path.resolve(process.cwd(), 'data/catalogue.json');
    if (fs.existsSync(p)) {
      const data = JSON.parse(fs.readFileSync(p, 'utf-8'));
      const channels = data.channels || [];
      for (const ch of channels.slice(0, 500)) {
        m3uContent += `#EXTINF:-1 tvg-id="${ch.id}" tvg-name="${ch.name}" group-title="${ch.category_name || 'Général'}",${ch.name}\n${ch.stream_url}\n`;
      }
    }
  } catch {}

  res.setHeader('Content-Type', 'audio/x-mpegurl; charset=utf-8');
  res.statusCode = 200;
  if (req.method === 'HEAD') {
    res.end();
  } else {
    res.end(m3uContent);
  }
}
