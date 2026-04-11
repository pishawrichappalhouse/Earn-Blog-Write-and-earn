import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // API routes (if any) should go here
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  if (process.env.NODE_ENV !== "production") {
    // Development mode: Use Vite's connect instance as middleware
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "custom", // Use custom to handle fallback manually if needed
    });
    app.use(vite.middlewares);

    // SPA fallback for development
    app.get('*', async (req, res, next) => {
      if (req.originalUrl.startsWith('/api')) {
        return next();
      }
      try {
        const url = req.originalUrl;
        const template = await vite.transformIndexHtml(url, await (await import('fs/promises')).readFile(path.resolve(__dirname, 'index.html'), 'utf-8'));
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } else {
    // Production mode: Serve static files from dist
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    
    // Catch-all route for SPA
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
