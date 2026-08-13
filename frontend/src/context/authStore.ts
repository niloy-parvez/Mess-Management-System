import { create } from "zustand";
import { User, AuthContextType } from "../types";
import { authService } from "../services/authService";
import { ensureCsrfHeaders, invalidateCsrfCache } from "../services/apiClient";

interface AuthStore extends AuthContextType {
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  setLoading: (loading: boolean) => void;
  hydrateUser: () => Promise<void>;
}

const getStoredTokenRole = (): User["role"] | null => {
  try {
    const token = localStorage.getItem("authToken");
    if (!token) return null;
    const [, payload] = token.split(".");
    if (!payload) return null;
    const parsed = JSON.parse(atob(payload)) as { role?: string };
    return parsed.role === "admin" || parsed.role === "member" ? parsed.role : null;
  } catch {
    return null;
  }
};

const initialToken = localStorage.getItem("authToken");
const initialRole = getStoredTokenRole();

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  token: initialToken,
  loading: !!initialToken,
  isAuthenticated: !!initialToken,
  isAdmin: initialRole === "admin",

  setUser: (user) => set({ user, isAdmin: user?.role === "admin" }),
  setToken: (token) => {
    set({ token });
    if (token) {
      localStorage.setItem("authToken", token);
    } else {
      localStorage.removeItem("authToken");
    }
  },
  setLoading: (loading) => set({ loading }),

  hydrateUser: async () => {
    const token = localStorage.getItem("authToken");
    if (!token) {
      set({ user: null, token: null, isAuthenticated: false, isAdmin: false, loading: false });
      return;
    }

    set({ loading: true, token, isAuthenticated: true });
    try {
      const response = await authService.getCurrentUser();
      if (response.success && response.data) {
        set({
          user: response.data,
          isAdmin: response.data.role === "admin",
          isAuthenticated: true,
        });
      } else {
        set({ user: null, token: null, isAuthenticated: false, isAdmin: false });
        localStorage.removeItem("authToken");
        invalidateCsrfCache();
      }
    } catch (error: any) {
      console.error("Auth hydration error:", error);
      const status = error?.response?.status;
      if (status === 401) {
        set({ user: null, token: null, isAuthenticated: false, isAdmin: false });
        localStorage.removeItem("authToken");
        invalidateCsrfCache();
      } else {
        set((state) => ({ ...state, isAuthenticated: true }));
      }
    } finally {
      set({ loading: false });
    }
  },

  login: async (email: string, password: string) => {
    set({ loading: true });
    try {
      const response = await authService.login(email, password);
      if (response.success && response.data) {
        set({
          user: response.data.user,
          token: response.data.token,
          isAuthenticated: true,
          isAdmin: response.data.user.role === "admin",
        });
        localStorage.setItem("authToken", response.data.token);
        try {
          await ensureCsrfHeaders();
        } catch (csrfError) {
          console.warn("Failed to prefetch CSRF token after login", csrfError);
        }

        // If backend returned a canonical member_id, merge it into stored user to keep a single source of truth
        if (response.data && (response.data as any).member_id) {
          set((state) => ({ user: { ...((state.user as any) || {}), member_id: (response.data as any).member_id } }));
        }
      }
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  register: async (email: string, password: string, full_name: string, phone?: string) => {
    set({ loading: true });
    try {
      const response = await authService.register(email, password, full_name, phone);
      if (response.success && response.data) {
        set({
          user: response.data.user,
          token: response.data.token,
          isAuthenticated: true,
          isAdmin: response.data.user.role === "admin",
        });
        localStorage.setItem("authToken", response.data.token);
        try {
          await ensureCsrfHeaders();
        } catch (csrfError) {
          console.warn("Failed to prefetch CSRF token after register", csrfError);
        }

        // If backend returned a canonical member_id, merge it into stored user to keep a single source of truth
        if (response.data && (response.data as any).member_id) {
          set((state) => ({ user: { ...((state.user as any) || {}), member_id: (response.data as any).member_id } }));
        }
      }
    } catch (error) {
      console.error("Register error:", error);
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  logout: () => {
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      isAdmin: false,
    });
    localStorage.removeItem("authToken");
    invalidateCsrfCache();
  },
}));
