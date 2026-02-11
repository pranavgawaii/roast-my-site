import type { VercelRequest, VercelResponse } from "@vercel/node";
import { resolveAuthContext, updateUserPublicMetadata } from "./_auth.js";

const PRO_TIER_ENABLED = process.env.PRO_TIER_ENABLED !== "0";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed." });
  }

  if (!PRO_TIER_ENABLED) {
    return res.status(403).json({
      error: "Pro tier disabled",
      message: "Pro waitlist is currently disabled."
    });
  }

  try {
    const auth = await resolveAuthContext(req);
    if (!auth.isAuthenticated || !auth.userId) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Please sign in first to join the Pro waitlist."
      });
    }

    if (auth.userStatus === "pro" || auth.waitlistStatus === "approved") {
      console.info(
        "[Telemetry][Waitlist]",
        JSON.stringify({ userId: auth.userId, status: "already_pro" })
      );
      return res.status(200).json({
        success: true,
        userStatus: "pro",
        waitlistStatus: "approved",
        message: "You already have Pro access."
      });
    }

    if (auth.waitlistStatus === "pending") {
      console.info(
        "[Telemetry][Waitlist]",
        JSON.stringify({ userId: auth.userId, status: "already_pending" })
      );
      return res.status(200).json({
        success: true,
        userStatus: "waitlist",
        waitlistStatus: "pending",
        message: "Your Pro request is already pending review."
      });
    }

    await updateUserPublicMetadata({
      userId: auth.userId,
      existing: auth.publicMetadata,
      patch: {
        proWaitlistStatus: "pending",
        proRequestedAt: new Date().toISOString()
      }
    });

    console.info(
      "[Telemetry][Waitlist]",
      JSON.stringify({ userId: auth.userId, status: "requested" })
    );

    return res.status(200).json({
      success: true,
      userStatus: "waitlist",
      waitlistStatus: "pending",
      message: "Request submitted. We will review and approve Pro access manually."
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to join waitlist.";
    return res.status(500).json({ error: "Waitlist request failed", message });
  }
}
