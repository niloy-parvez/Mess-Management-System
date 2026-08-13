import { ApiResponse } from "../types";

const BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) || "http://localhost:5000/api";

async function fetchJson<T>(path: string, opts: RequestInit = {}): Promise<ApiResponse<T>> {
  const token = localStorage.getItem("authToken");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) headers["Authorization"] = "Bearer " + token;

  const base = BASE.replace(/\/+$/, "");
  const url = base + (path.startsWith("/") ? path : "/" + path);

  // Helper: obtain CSRF token for mutating requests
  const method = (opts.method || "GET").toUpperCase();
  const isMutating = ["POST", "PUT", "PATCH", "DELETE"].includes(method);

  const attachCsrfHeaders = async (hdrs: Record<string,string>) => {
    try {
      const stored = localStorage.getItem("csrf:session");
      const storedToken = localStorage.getItem("csrf:token");
      const storedExpiry = localStorage.getItem("csrf:expiry");
      if (stored && storedToken && storedExpiry && new Date(storedExpiry) > new Date()) {
        hdrs["X-Session-ID"] = stored;
        hdrs["X-CSRF-Token"] = storedToken;
        return hdrs;
      }

      // Fetch fresh CSRF token
      const resp = await fetch(base + "/csrf-token", { method: "GET", credentials: "include" });
      const body = await resp.json().catch(() => ({}));
      const sessionId = body?.sessionId;
      const tokenVal = body?.token;
      if (sessionId && tokenVal) {
        // store with 55 minutes expiry margin
        const expiry = new Date(Date.now() + 55 * 60 * 1000).toISOString();
        localStorage.setItem("csrf:session", sessionId);
        localStorage.setItem("csrf:token", tokenVal);
        localStorage.setItem("csrf:expiry", expiry);
        hdrs["X-Session-ID"] = sessionId;
        hdrs["X-CSRF-Token"] = tokenVal;
      }
    } catch (e) {
      // ignore: let request proceed without CSRF and let server reject; we'll handle retry below
      console.warn("Failed to fetch CSRF token", e);
    }
    return hdrs;
  };

  const doFetch = async (attempt = 0): Promise<Response> => {
    const hdrs = { ...headers, ...(opts.headers as any || {}) } as Record<string,string>;
    if (isMutating) {
      await attachCsrfHeaders(hdrs);
    }

    const res = await fetch(url, {
      ...opts,
      headers: hdrs,
      credentials: "include",
    });

    // If CSRF rejected and we haven't retried yet, try to refresh token and retry once
    if (isMutating && res.status === 403) {
      const body = await res.json().catch(() => ({}));
      const msg = String(body?.message || body?.error || "").toLowerCase();
      if ((msg.includes("csrf") || msg.includes("forbidden") || msg.includes("missing")) && attempt === 0) {
        // refresh token and retry once
        try {
          // clear stored to force refresh
          localStorage.removeItem("csrf:session");
          localStorage.removeItem("csrf:token");
          localStorage.removeItem("csrf:expiry");
          const hdrsRetry = { ...headers, ...(opts.headers as any || {}) } as Record<string,string>;
          await attachCsrfHeaders(hdrsRetry);
          const retryRes = await fetch(url, { ...opts, headers: hdrsRetry, credentials: "include" });
          return retryRes;
        } catch (e) {
          return res; // original response
        }
      }
    }

    return res;
  };

  const res = await doFetch(0);
  const body = await res.json().catch(() => ({}));
  return {
    success: res.ok,
    data: body?.data ?? body,
    message: body?.message || (res.ok ? undefined : body?.error || String(body)),
    status: res.status,
  } as ApiResponse<T>;
}

export const expenseService = {
  createExpense: async (data: {
    category: string;
    amount: number;
    description?: string;
    expense_date?: string;
  }) => {
    return await fetchJson<any>("/expenses", { method: "POST", body: JSON.stringify(data) });
  },

  getExpenses: async (page = 1, limit = 20, filters?: Record<string, unknown>) => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (filters) {
      Object.entries(filters).forEach(([k, v]) => { if (v !== undefined && v !== null) params.set(k, String(v)); });
    }
    return await fetchJson<any[]>("/expenses?" + params.toString());
  },

  updateExpense: async (id: string, data: { category: string; amount: number; description?: string; expense_date?: string; }) => {
    return await fetchJson<any>("/expenses/" + id, { method: "PATCH", body: JSON.stringify(data) });
  },

  deleteExpense: async (id: string) => {
    return await fetchJson<null>("/expenses/" + id, { method: "DELETE" });
  },
};
