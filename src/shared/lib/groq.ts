import type {
  AdminWaitlistActionResponse,
  AdminWaitlistResponse,
  AdminOverviewResponse,
  AccountStatusResponse,
  PersonaOption,
  ProWaitlistResponse,
  RoastMode,
  RoastHistoryResponse,
  RoastResult
} from "../types";

export const ROAST_API_ENDPOINT = "/api/roast";

function buildHeaders(token?: string) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json"
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

async function requestJson<T>(
  endpoint: string,
  options: {
    method?: "GET" | "POST";
    token?: string;
    body?: Record<string, unknown>;
  } = {}
) {
  const response = await fetch(endpoint, {
    method: options.method || "GET",
    headers: buildHeaders(options.token),
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  const contentType = response.headers.get("content-type");
  if (!contentType || !contentType.includes("application/json")) {
    const text = await response.text();
    throw {
      error: "Invalid Response",
      message:
        response.status === 404
          ? "API endpoint not found. If running locally, use 'npm run dev'."
          : `Server returned non-JSON response (${response.status}): ${text.slice(0, 120)}...`
    };
  }

  const payload = await response.json();
  if (!response.ok) {
    throw payload;
  }

  return payload as T;
}

export async function roastWebsite(
  url: string,
  options?: { persona?: PersonaOption; roastMode?: RoastMode | "auto"; token?: string }
) {
  return requestJson<RoastResult>(ROAST_API_ENDPOINT, {
    method: "POST",
    token: options?.token,
    body: {
      url,
      persona: options?.persona || "auto",
      roastMode: options?.roastMode || "auto"
    }
  });
}

export async function getAccountStatus(token?: string) {
  return requestJson<AccountStatusResponse>("/api/account", {
    method: "GET",
    token
  });
}

export async function joinProWaitlist(token: string) {
  return requestJson<ProWaitlistResponse>("/api/pro-waitlist", {
    method: "POST",
    token
  });
}

export async function getRoastHistory(token: string, limit = 20) {
  const safeLimit = Math.max(1, Math.min(50, Math.floor(limit)));
  return requestJson<RoastHistoryResponse>(`/api/history?limit=${safeLimit}`, {
    method: "GET",
    token
  });
}

export async function getAdminOverview(token: string, limit = 120) {
  const safeLimit = Math.max(1, Math.min(200, Math.floor(limit)));
  return requestJson<AdminOverviewResponse>(`/api/admin-overview?limit=${safeLimit}`, {
    method: "GET",
    token
  });
}

export async function getAdminWaitlist(token: string, limit = 300) {
  const safeLimit = Math.max(1, Math.min(500, Math.floor(limit)));
  return requestJson<AdminWaitlistResponse>(`/api/admin-waitlist?limit=${safeLimit}`, {
    method: "GET",
    token
  });
}

export async function updateAdminWaitlist(
  token: string,
  userId: string,
  action: "approve" | "deny"
) {
  return requestJson<AdminWaitlistActionResponse>("/api/admin-waitlist", {
    method: "POST",
    token,
    body: {
      userId,
      action
    }
  });
}
