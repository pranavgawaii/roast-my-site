import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  deriveUserStatusFromMetadata,
  getClerkUser,
  isAdminAuth,
  listClerkUsers,
  resolveAuthContext,
  updateUserPublicMetadata
} from "./_auth.js";

type WaitlistAction = "approve" | "deny";

function parseLimit(raw: unknown, fallback = 200, max = 500) {
  const value = Array.isArray(raw) ? raw[0] : raw;
  const parsed = Number(value || fallback);
  if (Number.isNaN(parsed)) {
    return fallback;
  }
  return Math.max(1, Math.min(max, Math.floor(parsed)));
}

function waitlistRank(status: string) {
  if (status === "pending") {
    return 0;
  }
  if (status === "approved") {
    return 1;
  }
  if (status === "denied") {
    return 2;
  }
  return 9;
}

function parseIsoTimestamp(value: unknown) {
  const raw = String(value || "").trim();
  if (!raw) {
    return null;
  }
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString();
}

function parseAction(value: unknown): WaitlistAction | null {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "approve" || normalized === "deny") {
    return normalized;
  }
  return null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const auth = await resolveAuthContext(req);
    if (!isAdminAuth(auth)) {
      return res.status(403).json({
        error: "Forbidden",
        message: "Admin access required."
      });
    }

    if (req.method === "GET") {
      const limit = parseLimit(req.query?.limit);
      const users = await listClerkUsers({ limit: Math.min(limit, 100), maxPages: 8 });

      const requests = users
        .map((user) => {
          const metadata = user.publicMetadata || {};
          const status = deriveUserStatusFromMetadata(metadata);
          if (
            status.waitlistStatus !== "pending" &&
            status.waitlistStatus !== "approved" &&
            status.waitlistStatus !== "denied"
          ) {
            return null;
          }

          return {
            userId: user.id,
            email: user.email || "no-email",
            name:
              [user.firstName, user.lastName].filter(Boolean).join(" ").trim() ||
              user.username ||
              "Unknown",
            userStatus: status.userStatus,
            waitlistStatus: status.waitlistStatus,
            proApproved: status.proApproved,
            requestedAt: parseIsoTimestamp(metadata.proRequestedAt) || null,
            reviewedAt: parseIsoTimestamp(metadata.proReviewedAt) || null,
            proSince: parseIsoTimestamp(metadata.proSince) || null
          };
        })
        .filter((row) => row !== null)
        .sort((a, b) => {
          const rankDiff = waitlistRank(a.waitlistStatus) - waitlistRank(b.waitlistStatus);
          if (rankDiff !== 0) {
            return rankDiff;
          }
          const aTime = new Date(a.requestedAt || 0).getTime();
          const bTime = new Date(b.requestedAt || 0).getTime();
          return bTime - aTime;
        })
        .slice(0, limit);

      const summary = {
        total: requests.length,
        pending: requests.filter((row) => row.waitlistStatus === "pending").length,
        approved: requests.filter((row) => row.waitlistStatus === "approved").length,
        denied: requests.filter((row) => row.waitlistStatus === "denied").length
      };

      return res.status(200).json({
        success: true,
        summary,
        requests
      });
    }

    if (req.method === "POST") {
      const userId = String(req.body?.userId || "").trim();
      const action = parseAction(req.body?.action);

      if (!userId || !action) {
        return res.status(400).json({
          error: "Invalid request",
          message: "userId and action (approve|deny) are required."
        });
      }

      const user = await getClerkUser(userId);
      if (!user) {
        return res.status(404).json({
          error: "User not found",
          message: "Requested user was not found in Clerk."
        });
      }

      const nowIso = new Date().toISOString();
      const patch =
        action === "approve"
          ? {
            proApproved: true,
            proWaitlistStatus: "approved",
            proSince: nowIso,
            proReviewedAt: nowIso
          }
          : {
            proApproved: false,
            proWaitlistStatus: "denied",
            proReviewedAt: nowIso
          };

      const merged = await updateUserPublicMetadata({
        userId,
        existing: user.publicMetadata || {},
        patch
      });

      const status = deriveUserStatusFromMetadata(merged);
      console.info(
        "[Telemetry][AdminWaitlistAction]",
        JSON.stringify({
          adminUserId: auth.userId,
          targetUserId: userId,
          action,
          resultStatus: status.waitlistStatus
        })
      );

      return res.status(200).json({
        success: true,
        message:
          action === "approve"
            ? "User approved for Pro access."
            : "User moved to denied state.",
        request: {
          userId: user.id,
          email: user.email || "no-email",
          name:
            [user.firstName, user.lastName].filter(Boolean).join(" ").trim() ||
            user.username ||
            "Unknown",
          userStatus: status.userStatus,
          waitlistStatus: status.waitlistStatus,
          proApproved: status.proApproved,
          requestedAt: parseIsoTimestamp(merged.proRequestedAt) || null,
          reviewedAt: parseIsoTimestamp(merged.proReviewedAt) || null,
          proSince: parseIsoTimestamp(merged.proSince) || null
        }
      });
    }

    return res.status(405).json({ error: "Method not allowed." });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Admin waitlist request failed.";
    return res.status(500).json({ error: "Admin waitlist failed", message });
  }
}

