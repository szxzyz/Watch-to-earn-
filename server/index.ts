import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { setupAuth } from "./auth";

console.log('🚀 Starting Money AXN server...');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Add webhook route
app.post('/api/telegram/webhook', async (req: any, res) => {
  try {
    const { handleTelegramMessage, handleTelegramCallback } = await import('./telegram');
    const handled = await handleTelegramMessage(req.body);
    
    if (req.body.callback_query) {
      try {
        await handleTelegramCallback(req.body.callback_query);
      } catch (err) {
        console.error('Error in callback handler:', err);
      }
    }
    res.status(200).json({ ok: true, handled });
  } catch (error) {
    console.error('❌ Direct webhook error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/test-direct', (req: any, res) => {
  res.json({ status: 'Direct API route working!', timestamp: new Date().toISOString() });
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      log(`${req.method} ${path} ${res.statusCode} in ${duration}ms`);
    }
  });
  next();
});

(async () => {
  await setupAuth(app);
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
  });

  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  let port = process.env.PORT ? parseInt(process.env.PORT, 10) : 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, async () => {
    log(`serving on port ${port}`);
  });
})();
