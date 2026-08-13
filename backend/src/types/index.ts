// Backend type definitions
export interface User {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  role: "admin" | "member";
  avatar_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
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

export interface MealRate {
  id: string;
  month: string;
  year: number;
  rate_per_meal: number;
  total_expenses: number;
  total_market_cost: number;
  calculated_at: string;
}

export interface MonthlyBill {
  id: string;
  member_id: string;
  month: string;
  year: number;
  total_meals: number;
  meal_rate: number;
  total_cost: number;
  paid_amount: number;
  due_amount: number;
  status: "pending" | "paid" | "partial";
  generated_at: string;
}

export interface Notice {
  id: string;
  title: string;
  content: string;
  created_by: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data?: {
    user: User;
    token: string;
  };
  error?: string;
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
