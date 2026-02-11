import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import fs from "fs";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  Object.assign(process.env, env);

  return {
    envPrefix: ["VITE_", "NEXT_PUBLIC_"],
    plugins: [
      react(),
      {
        name: "api-simulator",
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            if (req.url && (req.url.startsWith("/api/") || req.url.startsWith("/api?"))) {
              console.log(`[API Simulator] Intercepted: ${req.url}`);
              const url = new URL(req.url, `http://${req.headers.host}`);
              const apiName = url.pathname.replace(/^\/api\//, "").split("?")[0];
              const handlerPath = path.resolve(process.cwd(), "api", `${apiName}.ts`);

              if (fs.existsSync(handlerPath)) {
                try {
                  const mod = await server.ssrLoadModule(handlerPath);
                  const handler = mod.default;

                  let body: unknown = {};
                  if (req.method === "POST") {
                    const buffers: Buffer[] = [];
                    for await (const chunk of req) {
                      buffers.push(chunk);
                    }
                    const data = Buffer.concat(buffers).toString();
                    try {
                      body = JSON.parse(data);
                    } catch {
                      body = data;
                    }
                  }

                  const vercelReq = Object.assign(req, {
                    body,
                    query: Object.fromEntries(url.searchParams)
                  });

                  const vercelRes = Object.assign(res, {
                    status: (code: number) => {
                      res.statusCode = code;
                      return vercelRes;
                    },
                    json: (data: unknown) => {
                      res.setHeader("Content-Type", "application/json");
                      res.end(JSON.stringify(data));
                      return vercelRes;
                    },
                    send: (data: unknown) => {
                      res.end(data);
                      return vercelRes;
                    }
                  });

                  await handler(vercelReq, vercelRes);
                  return;
                } catch (err: unknown) {
                  const message = err instanceof Error ? err.message : String(err);
                  console.error("API Error:", err);
                  res.statusCode = 500;
                  res.setHeader("Content-Type", "application/json");
                  res.end(JSON.stringify({ error: "Internal Server Error", message }));
                  return;
                }
              }
            }
            next();
          });
        }
      }
    ],
    server: {
      port: 5173
    }
  };
});
