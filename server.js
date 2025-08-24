import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import UnifiedWebSocketServer from './src/lib/websocket/unified-server.js';

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = parseInt(process.env.PORT || '9002', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url!, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('Internal server error');
    }
  });

  // Initialize unified WebSocket server for all services
  const webSocketServer = new UnifiedWebSocketServer(server);

  server.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
    console.log('> Unified WebSocket server enabled (Whiteboard, Telemedicine)');
    
    // Log WebSocket stats periodically in development
    if (dev) {
      setInterval(() => {
        const stats = webSocketServer.getStats();
        if (stats.totalClients > 0) {
          console.log('WebSocket Stats:', stats);
        }
      }, 30000); // Every 30 seconds
    }
  });
});
