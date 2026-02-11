import type { VercelRequest, VercelResponse } from "@vercel/node";

type ApiHandler = (req: VercelRequest, res: VercelResponse) => Promise<unknown> | unknown;

export interface HandlerRunOptions {
  method?: string;
  body?: unknown;
  query?: Record<string, unknown>;
  headers?: Record<string, string>;
  ip?: string;
}

export interface HandlerResult {
  statusCode: number;
  jsonBody: unknown;
  headers: Record<string, string>;
}

export async function runApiHandler(
  handler: ApiHandler,
  options: HandlerRunOptions = {}
): Promise<HandlerResult> {
  const headers = options.headers || {};
  const req = {
    method: options.method || "GET",
    body: options.body || {},
    query: options.query || {},
    headers,
    socket: {
      remoteAddress: options.ip || "127.0.0.1"
    }
  } as unknown as VercelRequest;

  const responseHeaders: Record<string, string> = {};
  let statusCode = 200;
  let jsonBody: unknown = null;

  const res = {
    status(code: number) {
      statusCode = code;
      return this;
    },
    setHeader(name: string, value: string) {
      responseHeaders[name.toLowerCase()] = value;
      return this;
    },
    json(payload: unknown) {
      jsonBody = payload;
      return this;
    },
    send(payload: unknown) {
      jsonBody = payload;
      return this;
    },
    end(payload?: unknown) {
      if (typeof payload !== "undefined") {
        jsonBody = payload;
      }
      return this;
    }
  } as unknown as VercelResponse;

  await handler(req, res);

  return {
    statusCode,
    jsonBody,
    headers: responseHeaders
  };
}
