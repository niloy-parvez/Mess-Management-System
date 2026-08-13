# Database Schema

## Tables Overview

### Users Table
Stores user account information with roles (admin/member).

```sql
- id (UUID, Primary Key)
- email (VARCHAR, Unique)
- password (VARCHAR, Hashed)
- full_name (VARCHAR)
- phone (VARCHAR)
- role (ENUM: admin, member)
- avatar_url (VARCHAR)
- is_active (BOOLEAN)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

### Members Table
Stores member-specific information linked to users.

```sql
- id (UUID, Primary Key)
- user_id (UUID, Foreign Key → users)
- roll_number (VARCHAR)
- room_number (VARCHAR)
- joining_date (DATE)
- leave_date (DATE)
- is_active (BOOLEAN)
- dues (DECIMAL)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

### Meals Table
Tracks meal consumption by members.

```sql
- id (UUID, Primary Key)
- member_id (UUID, Foreign Key → members)
- meal_type (ENUM: breakfast, lunch, dinner)
- meal_date (DATE)
- marked_by (UUID, Foreign Key → users)
- created_at (TIMESTAMP)
```

### Market Table
Stores market items and expenses.

```sql
- id (UUID, Primary Key)
- item_name (VARCHAR)
- quantity (DECIMAL)
- unit (VARCHAR)
- cost (DECIMAL)
- vendor_name (VARCHAR)
- receipt_url (VARCHAR)
- status (ENUM: pending, approved, rejected)
- added_by (UUID, Foreign Key → users)
- approved_by (UUID, Foreign Key → users)
- market_date (DATE)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

### Expenses Table
Tracks fixed expenses like utilities.

```sql
- id (UUID, Primary Key)
- category (ENUM: gas, electricity, internet, water, maid_salary, maintenance, others)
- amount (DECIMAL)
- description (TEXT)
- expense_date (DATE)
- receipt_url (VARCHAR)
- added_by (UUID, Foreign Key → users)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

### Payments Table
Records member payments.

```sql
- id (UUID, Primary Key)
- member_id (UUID, Foreign Key → members)
- amount (DECIMAL)
- payment_method (ENUM: cash, bkash, nagad, bank_transfer)
- transaction_id (VARCHAR)
- payment_date (DATE)
- verified (BOOLEAN)
- verified_by (UUID, Foreign Key → users)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

### Meal Rates Table
Stores calculated meal rates.

```sql
- id (UUID, Primary Key)
- month (VARCHAR)
- year (INT)
- rate_per_meal (DECIMAL)
- total_expenses (DECIMAL)
- total_market_cost (DECIMAL)
- calculated_at (TIMESTAMP)
```

### Monthly Bills Table
Stores monthly bill details for members.

```sql
- id (UUID, Primary Key)
- member_id (UUID, Foreign Key → members)
- month (VARCHAR)
- year (INT)
- total_meals (INT)
- meal_rate (DECIMAL)
- total_cost (DECIMAL)
- paid_amount (DECIMAL)
- due_amount (DECIMAL)
- status (ENUM: pending, paid, partial)
- generated_at (TIMESTAMP)
```

### Notices Table
Stores notices/announcements.

```sql
- id (UUID, Primary Key)
- title (VARCHAR)
- content (TEXT)
- created_by (UUID, Foreign Key → users)
- is_active (BOOLEAN)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

## Indexes
- Users: email, role, is_active
- Members: user_id, is_active
- Meals: member_id, meal_date, meal_type
- Payments: member_id, verified, payment_date
- Expenses: category, expense_date
- Market: status, market_date
- Notices: is_active
