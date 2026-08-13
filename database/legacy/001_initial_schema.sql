-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  role VARCHAR(50) DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  avatar_url VARCHAR(500),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_role (role),
  INDEX idx_is_active (is_active)
);

-- Members table
CREATE TABLE IF NOT EXISTS members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  roll_number VARCHAR(50),
  room_number VARCHAR(50),
  joining_date DATE NOT NULL,
  leave_date DATE,
  is_active BOOLEAN DEFAULT true,
  dues DECIMAL(10, 2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_is_active (is_active)
);

-- Meals table
CREATE TABLE IF NOT EXISTS meals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL,
  meal_type VARCHAR(50) NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner')),
  meal_date DATE NOT NULL,
  marked_by UUID NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE,
  FOREIGN KEY (marked_by) REFERENCES users(id),
  INDEX idx_member_id (member_id),
  INDEX idx_meal_date (meal_date),
  INDEX idx_meal_type (meal_type),
  UNIQUE KEY unique_meal (member_id, meal_type, meal_date)
);

-- Market table
CREATE TABLE IF NOT EXISTS market (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_name VARCHAR(255) NOT NULL,
  quantity DECIMAL(10, 2) NOT NULL,
  unit VARCHAR(50) DEFAULT 'kg',
  cost DECIMAL(10, 2) NOT NULL,
  vendor_name VARCHAR(255),
  receipt_url VARCHAR(500),
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  added_by UUID NOT NULL,
  approved_by UUID,
  market_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (added_by) REFERENCES users(id),
  FOREIGN KEY (approved_by) REFERENCES users(id),
  INDEX idx_status (status),
  INDEX idx_market_date (market_date)
);

-- Expenses table
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category VARCHAR(50) NOT NULL CHECK (category IN ('gas', 'electricity', 'internet', 'water', 'maid_salary', 'maintenance', 'others')),
  amount DECIMAL(10, 2) NOT NULL,
  description TEXT,
  expense_date DATE NOT NULL,
  receipt_url VARCHAR(500),
  added_by UUID NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (added_by) REFERENCES users(id),
  INDEX idx_category (category),
  INDEX idx_expense_date (expense_date)
);

-- Payments table
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  payment_method VARCHAR(50) NOT NULL CHECK (payment_method IN ('cash', 'bkash', 'nagad', 'bank_transfer')),
  transaction_id VARCHAR(255),
  payment_date DATE NOT NULL,
  verified BOOLEAN DEFAULT false,
  verified_by UUID,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE,
  FOREIGN KEY (verified_by) REFERENCES users(id),
  INDEX idx_member_id (member_id),
  INDEX idx_verified (verified),
  INDEX idx_payment_date (payment_date)
);

-- Meal Rates table
CREATE TABLE IF NOT EXISTS meal_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  month VARCHAR(50) NOT NULL,
  year INT NOT NULL,
  rate_per_meal DECIMAL(10, 2) NOT NULL,
  total_expenses DECIMAL(10, 2) NOT NULL,
  total_market_cost DECIMAL(10, 2) NOT NULL,
  calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_month_year (month, year)
);

-- Monthly Bills table
CREATE TABLE IF NOT EXISTS monthly_bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL,
  month VARCHAR(50) NOT NULL,
  year INT NOT NULL,
  total_meals INT DEFAULT 0,
  meal_rate DECIMAL(10, 2) DEFAULT 0,
  total_cost DECIMAL(10, 2) DEFAULT 0,
  paid_amount DECIMAL(10, 2) DEFAULT 0,
  due_amount DECIMAL(10, 2) DEFAULT 0,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'partial')),
  generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE,
  INDEX idx_member_id (member_id),
  INDEX idx_status (status),
  UNIQUE KEY unique_member_month (member_id, month, year)
);

-- Notices table
CREATE TABLE IF NOT EXISTS notices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  created_by UUID NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id),
  INDEX idx_is_active (is_active)
);

-- Create indexes for better performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_members_user_id ON members(user_id);
CREATE INDEX idx_meals_member_id ON meals(member_id);
CREATE INDEX idx_payments_member_id ON payments(member_id);
