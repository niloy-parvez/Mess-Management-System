// Frontend type definitions
export type UserRole = "admin" | "member";

export interface User {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  role: UserRole;
  avatar_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Optional canonical member id mapped to members.id (if available)
  member_id?: string;
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, full_name: string, phone?: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  isAdmin: boolean;
}

export interface Member {
  id: string;
  user_id: string;
  roll_number?: string;
  room_number?: string;
  joining_date: string;
  leave_date?: string;
  is_active: boolean;
  dues: number;
  created_at: string;
  updated_at: string;
}

export interface Meal {
  id: string;
  member_id: string;
  meal_type: "breakfast" | "lunch" | "dinner";
  meal_date: string;
  marked_by: string;
  created_at: string;
}

export interface Market {
  id: string;
  item_name: string;
  quantity: number;
  unit: string;
  cost: number;
  vendor_name?: string;
  receipt_url?: string;
  status: "pending" | "approved" | "rejected";
  added_by: string;
  approved_by?: string;
  market_date: string;
  created_at: string;
  updated_at: string;
}

export interface Expense {
  id: string;
  category: "gas" | "electricity" | "internet" | "water" | "maid_salary" | "maintenance" | "others";
  amount: number;
  description: string;
  expense_date: string;
  receipt_url?: string;
  added_by: string;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  member_id: string;
  amount: number;
  payment_method: "cash" | "bkash" | "nagad" | "bank_transfer";
  transaction_id?: string;
  payment_date: string;
  verified: boolean;
  verified_by?: string;
  created_at: string;
  updated_at: string;
}

export interface DashboardStats {
  totalMembers: number;
  activeMembers: number;
  totalExpenses: number;
  totalMarketCost: number;
  totalCollection: number;
  todayMarket: number;
  dueAmount: number;
  todayMeals?: number;
  monthlyMeals?: number;
  todayMarketCost?: number;
  monthlyMarketCost?: number;
  currentMealRate?: number;
  totalDue?: number;
  pendingAmount?: number;
  // Backwards-compatible aliases and optional fields used by older UI components
  approvedMarketCost?: number;
  totalMeals?: number;
  ratePerMeal?: number;
  // Optional list of recent members for dashboard widgets
  members?: Array<Partial<Member> & { name?: string; full_name?: string }>; 
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  notification_type: string;
  related_id?: string;
  is_read: boolean;
  read_at?: string;
  data?: Record<string, unknown> | null;
  created_at: string;
}

export interface ReportSummary {
  overview: {
    totalMembers: number;
    activeMembers: number;
    totalMeals: number;
    totalExpenses: number;
    totalCollection: number;
    totalDue: number;
    todayMarketCost: number;
    currentMealRate: number;
  };
  members: any[];
  meals: any[];
  market: any[];
  expenses: any[];
  payments: any[];
  monthlyBills: any[];
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}
