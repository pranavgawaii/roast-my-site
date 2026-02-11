import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getUserHistory } from "./_history.js";
import { resolveAuthContext } from "./_auth.js";

function parseLimit(value: unknown) {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number(raw || 20);
  if (Number.isNaN(parsed)) {
    return 20;
  }
  return Math.max(1, Math.min(50, Math.floor(parsed)));
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed." });
  }

  try {
    const auth = await resolveAuthContext(req);
    if (!auth.isAuthenticated || !auth.userId) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Sign in to access roast history."
      });
    }

    const limit = parseLimit(req.query?.limit);
    const history = await getUserHistory(auth.userId, limit);

    return res.status(200).json({
      success: true,
      history
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load history.";
    return res.status(500).json({ error: "History failed", message });
  }
}
