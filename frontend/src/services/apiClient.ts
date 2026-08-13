import axios, { AxiosInstance } from "axios";

const DEFAULT_DEV_API_BASE_URL = "http://localhost:5000/api";
const API_BASE_URL = (
  (import.meta.env.VITE_API_BASE_URL as string | undefined) || DEFAULT_DEV_API_BASE_URL
).replace(/\/+$/, "");

let resolvedApiBaseUrl = API_BASE_URL;
let csrfPromise: Promise<void> | null = null;

const normalizeBaseUrl = (value: string) => value.replace(/\/+$/, "");

const ensureResolvedApiBaseUrl = async (): Promise<string> => {
  resolvedApiBaseUrl = normalizeBaseUrl(API_BASE_URL || DEFAULT_DEV_API_BASE_URL);
  try {
    localStorage.removeItem("resolvedApiBaseUrl");
  } catch (error) {
    console.warn("Failed to clear stale API base URL cache", error);
  }
  return resolvedApiBaseUrl;
};

const invalidateCsrfCache = (): void => {
  csrfPromise = null;
  try {
    localStorage.removeItem("csrfSessionId");
    localStorage.removeItem("csrfToken");
  } catch (error) {
    console.warn("Failed to clear CSRF cache", error);
  }
};

const requestCsrfToken = async (): Promise<void> => {
  await ensureResolvedApiBaseUrl();

  const storedSessionId = localStorage.getItem("csrfSessionId");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (storedSessionId) {
    headers["X-Session-ID"] = storedSessionId;
  }

  const response = await fetch(`${resolvedApiBaseUrl}/csrf-token`, {
    method: "GET",
    headers,
  });

  if (!response.ok) {
    invalidateCsrfCache();
    throw new Error("Failed to obtain CSRF token");
  }

  const data = await response.json();

  if (data.sessionId) {
    localStorage.setItem("csrfSessionId", data.sessionId);
  }
  if (data.token) {
    localStorage.setItem("csrfToken", data.token);
  }
};

const ensureCsrfHeaders = async (): Promise<void> => {
  if (csrfPromise) {
    await csrfPromise;
    return;
  }

  const storedSessionId = localStorage.getItem("csrfSessionId");
  const storedToken = localStorage.getItem("csrfToken");

  if (storedSessionId && storedToken) {
    return;
  }

  csrfPromise = (async () => {
    try {
      await requestCsrfToken();
    } catch (error) {
      invalidateCsrfCache();
      throw error;
    }
  })();

  try {
    await csrfPromise;
  } catch (error) {
    invalidateCsrfCache();
    throw error;
  }
};

const apiClient: AxiosInstance = axios.create({
  baseURL: resolvedApiBaseUrl,
  timeout: 10000,
});

// Refresh queue helpers
interface RefreshQueueItem {
  resolve: (value?: any) => void;
  reject: (reason?: any) => void;
  config: any;
}

(apiClient as any)._isRefreshing = false;
(apiClient as any)._refreshQueue = [] as RefreshQueueItem[];

apiClient.interceptors.request.use(async (config) => {
  try {
    await ensureResolvedApiBaseUrl();
    config.baseURL = resolvedApiBaseUrl;
    apiClient.defaults.baseURL = resolvedApiBaseUrl;

    const token = localStorage.getItem("authToken");
    if (token) {
      config.headers = config.headers || {};
      (config.headers as Record<string, string>).Authorization = `Bearer ${token}`;
    }

    const method = (config.method || "get").toString().toLowerCase();
    const isMutationRequest = method && method !== "get" && method !== "options";

    if (isMutationRequest) {
      await ensureCsrfHeaders();
      const csrfSessionId = localStorage.getItem("csrfSessionId");
      const csrfToken = localStorage.getItem("csrfToken");
      if (csrfSessionId && csrfToken) {
        config.headers = config.headers || {};
        (config.headers as any)["X-Session-ID"] = csrfSessionId;
        (config.headers as any)["X-CSRF-Token"] = csrfToken;
      }
    }
  } catch (error) {
    console.warn("apiClient request interceptor error", error);
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => {
    try {
      const method = (response?.config?.method || "get").toString().toLowerCase();
      const isMutation = method && method !== "get" && method !== "options";
      if (isMutation && typeof window !== "undefined") {
        try {
          window.dispatchEvent(new CustomEvent("app:dataChanged", { detail: { url: response.config.url, method } }));
        } catch (e) {
          // ignore
        }
      }
    } catch (e) {
      // ignore
    }
    return response;
  },
  async (error) => {
    const originalRequest = error?.config as any;
    const status = error?.response?.status;
    const message = error?.response?.data?.message || "";

    // Handle 403 CSRF errors by refreshing CSRF token and retrying once
    if (
      status === 403 &&
      typeof message === "string" &&
      message.toLowerCase().includes("csrf") &&
      originalRequest &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;
      invalidateCsrfCache();

      try {
        await requestCsrfToken();
        // Attach refreshed CSRF headers to original request before retry
        const csrfSessionId = localStorage.getItem("csrfSessionId");
        const csrfToken = localStorage.getItem("csrfToken");
        if (csrfSessionId && csrfToken) {
          originalRequest.headers = originalRequest.headers || {};
          originalRequest.headers["X-Session-ID"] = csrfSessionId;
          originalRequest.headers["X-CSRF-Token"] = csrfToken;
        }
        return apiClient(originalRequest);
      } catch (retryError) {
        return Promise.reject(retryError);
      }
    }

    // Handle 401 Unauthorized by attempting token refresh once (with request queueing)
    if (status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;

      const replayRequest = (token: string) => {
        originalRequest.headers = originalRequest.headers || {};
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return apiClient(originalRequest);
      };

      if (!(apiClient as any)._isRefreshing) {
        (apiClient as any)._isRefreshing = true;

        try {
          await ensureResolvedApiBaseUrl();
          const currentToken = localStorage.getItem("authToken") || "";
          const refreshResp = await axios.post(
            `${resolvedApiBaseUrl}/auth/refresh`,
            {},
            {
              headers: {
                Authorization: `Bearer ${currentToken}`,
              },
            }
          );

          const newToken =
            refreshResp?.data?.data?.token ||
            refreshResp?.data?.token;
          if (!newToken) {
            throw new Error("Refresh did not return new token");
          }

          localStorage.setItem("authToken", newToken);

          const queue: any[] = (apiClient as any)._refreshQueue || [];
          for (const queued of queue) {
            queued.resolve(newToken);
          }
          (apiClient as any)._refreshQueue = [];

          return replayRequest(newToken);
        } catch (refreshError) {
          const queue: any[] = (apiClient as any)._refreshQueue || [];
          for (const queued of queue) {
            queued.reject(refreshError);
          }
          (apiClient as any)._refreshQueue = [];

          const refreshStatus = (refreshError as any)?.response?.status;
          if (refreshStatus === 401) {
            try {
              localStorage.removeItem("authToken");
              invalidateCsrfCache();
            } catch (e) {
              // ignore
            }
            window.location.href = "/login";
          }
          return Promise.reject(refreshError);
        } finally {
          (apiClient as any)._isRefreshing = false;
        }
      }

      return new Promise((resolve, reject) => {
        (apiClient as any)._refreshQueue.push({
          resolve: (newToken: string) => {
            replayRequest(newToken).then(resolve).catch(reject);
          },
          reject,
          config: originalRequest,
        });
      });
    }

    // Default reject
    return Promise.reject(error);
  }
);

export { apiClient, ensureCsrfHeaders, invalidateCsrfCache };
export default apiClient;
