import type { VercelRequest, VercelResponse } from "@vercel/node";
import { isAdminEmail, resolveAuthContext } from "./_auth";
import { getUsageSnapshot } from "./_rateLimit";

const PRO_TIER_ENABLED = process.env.PRO_TIER_ENABLED !== "0";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed." });
  }

  try {
    const auth = await resolveAuthContext(req);
    if (!auth.isAuthenticated || !auth.userId) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Login required to access account status."
      });
    }

    const admin = isAdminEmail(auth.user?.email || null);
    const userStatus = admin ? "pro" : PRO_TIER_ENABLED ? auth.userStatus : "free";
    const waitlistStatus = admin ? "approved" : PRO_TIER_ENABLED ? auth.waitlistStatus : "none";
    const proApproved = admin ? true : PRO_TIER_ENABLED ? auth.proApproved : false;

    const usage = await getUsageSnapshot(userStatus, auth.userId);

    return res.status(200).json({
      success: true,
      userStatus,
      dailyLimit: usage.dailyLimit,
      usedToday: usage.usedToday,
      remaining: usage.remaining,
      proApproved,
      waitlistStatus,
      userId: auth.userId
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to read account status.";
    return res.status(500).json({ error: "Account status failed", message });
  }
}
