import type { IncomingMessage, ServerResponse } from 'http';
import fs from 'fs';
import path from 'path';

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  let stats = {
    channelsCount: 0,
    categoriesCount: 0,
    moviesCount: 0,
    seriesCount: 0,
    sourcesCount: 0,
  };

  try {
    const p = path.resolve(process.cwd(), 'data/catalogue.json');
    if (fs.existsSync(p)) {
      const data = JSON.parse(fs.readFileSync(p, 'utf-8'));
      stats = {
        channelsCount: data.channels?.length || 0,
        categoriesCount: data.categories?.length || 0,
        moviesCount: data.movies?.length || 0,
        seriesCount: data.series?.length || 0,
        sourcesCount: data.sources?.length || 0,
      };
    }
  } catch {}

  res.statusCode = 200;
  res.end(JSON.stringify(stats));
}
