# 📊 Database Schema Documentation - Mess Management System v1.1.0

## Table of Contents

1. [Overview](#overview)
2. [Database Architecture](#database-architecture)
3. [Entity-Relationship Diagram](#entity-relationship-diagram)
4. [Tables Reference](#tables-reference)
5. [Indexes](#indexes)
6. [Triggers & Functions](#triggers--functions)
7. [Row Level Security (RLS)](#row-level-security-rls)
8. [Migration Guide](#migration-guide)
9. [Backup & Recovery](#backup--recovery)

---

## Overview

The Mess Management System uses **Supabase PostgreSQL** as the primary database. The schema is designed to:

- ✅ Support multi-role access (Admin & Members)
- ✅ Ensure data integrity with foreign keys
- ✅ Optimize query performance with strategic indexes
- ✅ Implement security with Row Level Security policies
- ✅ Track changes with audit logs
- ✅ Support complex business logic with triggers and functions

### Database Statistics

| Metric | Value |
|--------|-------|
| **Total Tables** | 18 |
| **Total Columns** | 200+ |
| **Indexes** | 60+ |
| **Triggers** | 11 |
| **Functions** | 4 |
| **RLS Policies** | 60+ |
| **Enum Types** | 6 |

---

## Database Architecture

### System Architecture

```
┌─────────────────────────────────────┐
│     Supabase PostgreSQL Database    │
├─────────────────────────────────────┤
│  Authentication Layer (Supabase Auth)│
├─────────────────────────────────────┤
│  RLS Policies (Row Level Security)   │
├─────────────────────────────────────┤
│  Application Tables (18 tables)      │
├─────────────────────────────────────┤
│  Triggers & Functions                │
├─────────────────────────────────────┤
│  Indexes (60+)                       │
└─────────────────────────────────────┘
```

### Data Flow

```
User Request
    ↓
Supabase Auth (JWT validation)
    ↓
RLS Policies (Authorization check)
    ↓
SQL Query Execution
    ↓
Triggers (Auto-update timestamps, logging)
    ↓
Index Lookup (Performance optimization)
    ↓
Return Data
```

---

## Entity-Relationship Diagram

### Core Relationships

```
┌─────────────┐
│    Users    │
│ (Auth)      │
└──────┬──────┘
       │
       ├─────────────────────────┐
       │                         │
    1:1                       1:N
       │                         │
       ↓                         ↓
   ┌─────────────┐         ┌──────────────┐
   │   Members   │         │ Activity Logs│
   └──────┬──────┘         └──────────────┘
          │
          ├─────────┬──────────┬──────────┬──────────┬──────────┐
          │         │          │          │          │          │
       1:N     1:N         1:N        1:N        1:N        1:N
          │         │          │          │          │          │
          ↓         ↓          ↓          ↓          ↓          ↓
      ┌─────────┐ ┌──────┐ ┌─────────┐ ┌────────┐ ┌──────────┐ ┌────────┐
      │ Meals   │ │Market│ │Expenses │ │Payments│ │ Notices  │ │ Bills  │
      └─────────┘ └──────┘ └─────────┘ └────────┘ └──────────┘ └────────┘
```

### Supporting Tables

```
┌──────────────────────────────────────────┐
│         Supporting Infrastructure         │
├──────────────────────────────────────────┤
│ • Notifications (User alerts)             │
│ • Meal Rates (Monthly calculations)      │
│ • Market Locks (Monthly freezing)        │
│ • Password Reset Tokens (Auth)           │
│ • CSRF Tokens (Security)                 │
│ • Backups (Data recovery)                │
│ • Backup Logs (Audit trail)              │
└──────────────────────────────────────────┘
```

---

## Tables Reference

### 1. USERS TABLE

**Purpose**: Store authenticated users linked to Supabase Auth

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PRIMARY KEY | System generated |
| auth_id | UUID | UNIQUE, NOT NULL | Reference to Supabase Auth |
| email | VARCHAR(255) | UNIQUE, NOT NULL | Lowercase enforced |
| name | VARCHAR(255) | NOT NULL | User display name |
| phone | VARCHAR(20) | | Optional contact |
| role | user_role | DEFAULT 'member' | admin or member |
| is_active | BOOLEAN | DEFAULT TRUE | Soft delete flag |
| avatar_url | TEXT | | Profile picture URL |
| last_login_at | TIMESTAMP | | Track login |
| created_at | TIMESTAMP | DEFAULT NOW() | Creation timestamp |
| updated_at | TIMESTAMP | DEFAULT NOW() | Updated timestamp |

**Indexes**: auth_id, email, role, is_active

**RLS Policies**:
- Admins can view all users
- Members can view only themselves

---

### 2. MEMBERS TABLE

**Purpose**: Store mess members information

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PRIMARY KEY | |
| user_id | UUID | UNIQUE, FK:users | One member per user |
| name | VARCHAR(255) | NOT NULL | Member name |
| email | VARCHAR(255) | UNIQUE, NOT NULL | Contact email |
| phone | VARCHAR(20) | NOT NULL | Contact phone |
| room_number | VARCHAR(50) | UNIQUE, NOT NULL | Unique room ID |
| join_date | DATE | NOT NULL | When joined |
| leave_date | DATE | | When left (soft delete) |
| is_active | BOOLEAN | DEFAULT TRUE | Active status |
| photo_url | TEXT | | Profile picture |
| notes | TEXT | | Admin notes |
| created_at | TIMESTAMP | DEFAULT NOW() | |
| updated_at | TIMESTAMP | DEFAULT NOW() | |

**Indexes**: is_active, room_number, email, user_id, created_at

**RLS Policies**:
- Everyone sees active members
- Admins see all members

---

### 3. MEALS TABLE

**Purpose**: Track daily meals per member

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PRIMARY KEY | |
| member_id | UUID | NOT NULL, FK:members | Member reference |
| meal_type | meal_type | NOT NULL | breakfast/lunch/dinner |
| meal_date | DATE | NOT NULL, DEFAULT TODAY | Date of meal |
| created_at | TIMESTAMP | DEFAULT NOW() | |
| updated_at | TIMESTAMP | DEFAULT NOW() | |

**Unique Constraint**: (member_id, meal_type, meal_date)

**Indexes**: member_id, meal_date, meal_type, (meal_date, member_id)

**RLS Policies**:
- Members can only see their own meals
- Admins can see all meals

---

### 4. MARKET TABLE

**Purpose**: Track market shopping and expenses

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PRIMARY KEY | |
| market_date | DATE | NOT NULL, DEFAULT TODAY | Date of shopping |
| items | JSONB | NOT NULL | Array of items |
| total_cost | DECIMAL(10,2) | NOT NULL | Total amount spent |
| description | TEXT | | Additional notes |
| receipt_url | TEXT | | Receipt image URL |
| approved_by | UUID | FK:users | Approver |
| approved_at | TIMESTAMP | | Approval time |
| is_approved | BOOLEAN | DEFAULT FALSE | Approval status |
| created_by | UUID | NOT NULL, FK:users | Creator |
| created_at | TIMESTAMP | DEFAULT NOW() | |
| updated_at | TIMESTAMP | DEFAULT NOW() | |

**JSONB Sample**:
```json
[
  {"name": "Rice", "quantity": 5, "unit": "kg", "price": 500},
  {"name": "Oil", "quantity": 2, "unit": "liter", "price": 400}
]
```

**Indexes**: market_date, is_approved, created_by, created_at

---

### 5. EXPENSES TABLE

**Purpose**: Track all expenses by category

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PRIMARY KEY | |
| category | expense_category | NOT NULL | gas, electricity, etc |
| amount | DECIMAL(10,2) | NOT NULL, >= 0 | Amount spent |
| expense_date | DATE | NOT NULL, DEFAULT TODAY | |
| description | TEXT | | Details |
| created_by | UUID | FK:users | Who created |
| created_at | TIMESTAMP | DEFAULT NOW() | |
| updated_at | TIMESTAMP | DEFAULT NOW() | |

**Categories**: gas, electricity, internet, water, maid_salary, maintenance, others

**Indexes**: category, expense_date, created_by, created_at, (expense_date, category)

---

### 6. PAYMENTS TABLE

**Purpose**: Track member payments

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PRIMARY KEY | |
| member_id | UUID | NOT NULL, FK:members | Payer |
| amount | DECIMAL(10,2) | NOT NULL, > 0 | Amount paid |
| payment_method | payment_method | NOT NULL | cash, bkash, etc |
| payment_date | DATE | NOT NULL, DEFAULT TODAY | |
| reference | VARCHAR(255) | | Transaction ref |
| notes | TEXT | | Additional info |
| receipt_url | TEXT | | Payment receipt |
| created_by | UUID | FK:users | Recorded by |
| created_at | TIMESTAMP | DEFAULT NOW() | |
| updated_at | TIMESTAMP | DEFAULT NOW() | |

**Payment Methods**: cash, bkash, nagad, bank_transfer

**Indexes**: member_id, payment_date, payment_method, created_by, (member_id, payment_date DESC)

---

### 7. NOTICES TABLE

**Purpose**: Store admin notices for members

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PRIMARY KEY | |
| title | VARCHAR(255) | NOT NULL | Notice title |
| content | TEXT | NOT NULL | Full content |
| priority | VARCHAR(20) | DEFAULT 'normal' | low/normal/high/urgent |
| created_by | UUID | NOT NULL, FK:users | Author |
| is_archived | BOOLEAN | DEFAULT FALSE | Visibility |
| archived_at | TIMESTAMP | | Archive time |
| created_at | TIMESTAMP | DEFAULT NOW() | |
| updated_at | TIMESTAMP | DEFAULT NOW() | |

**Indexes**: is_archived, created_by, created_at, priority

---

### 8. NOTIFICATIONS TABLE

**Purpose**: User notifications for various events

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PRIMARY KEY | |
| user_id | UUID | NOT NULL, FK:users | Recipient |
| title | VARCHAR(255) | NOT NULL | Notification title |
| message | TEXT | NOT NULL | Message content |
| notification_type | notification_type | | Type of notification |
| is_read | BOOLEAN | DEFAULT FALSE | Read status |
| read_at | TIMESTAMP | | Read time |
| related_id | UUID | | Related entity ID |
| data | JSONB | | Additional data |
| created_at | TIMESTAMP | DEFAULT NOW() | |
| updated_at | TIMESTAMP | DEFAULT NOW() | |

**Types**: payment, market, notice, backup, member, due_update, payment_update, monthly_lock

**Indexes**: user_id, is_read, created_at, (user_id, is_read, created_at DESC)

---

### 9. ACTIVITY LOGS TABLE

**Purpose**: Audit trail for all changes

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PRIMARY KEY | |
| user_id | UUID | FK:users | Who made change |
| activity_type | activity_type | NOT NULL | Type of activity |
| description | TEXT | | What happened |
| related_id | UUID | | Entity affected |
| old_values | JSONB | | Previous values |
| new_values | JSONB | | New values |
| ip_address | INET | | Source IP |
| user_agent | TEXT | | Browser info |
| created_at | TIMESTAMP | DEFAULT NOW() | |

**Activity Types**: member_added, member_removed, meal_added, market_entry, payment_recorded, expense_added, etc

**Indexes**: user_id, activity_type, created_at, related_id

---

### 10. MARKET LOCKS TABLE

**Purpose**: Freeze market for specific months

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PRIMARY KEY | |
| month | INTEGER | 1-12 | Month number |
| year | INTEGER | >= 2020 | Year |
| locked_at | TIMESTAMP | DEFAULT NOW() | Lock time |
| unlocked_at | TIMESTAMP | | Unlock time |
| created_by | UUID | NOT NULL, FK:users | Who locked |
| notes | TEXT | | Lock reason |
| created_at | TIMESTAMP | DEFAULT NOW() | |
| updated_at | TIMESTAMP | DEFAULT NOW() | |

**Unique**: (month, year)

**Indexes**: (year, month DESC), created_by

---

### 11. MEAL RATES TABLE

**Purpose**: Store calculated monthly meal rates

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PRIMARY KEY | |
| month | INTEGER | 1-12 | Month number |
| year | INTEGER | >= 2020 | Year |
| rate_per_meal | DECIMAL(10,2) | >= 0 | Calculated rate |
| total_meals | INTEGER | >= 0 | Total meals |
| total_expenses | DECIMAL(10,2) | >= 0 | Expenses sum |
| market_cost | DECIMAL(10,2) | >= 0 | Market sum |
| calculated_by | UUID | FK:users | Calculator |
| created_at | TIMESTAMP | DEFAULT NOW() | |
| updated_at | TIMESTAMP | DEFAULT NOW() | |

**Unique**: (month, year)

**Formula**: rate_per_meal = (total_expenses + market_cost) / total_meals

**Indexes**: (year DESC, month DESC), calculated_by

---

### 12. MONTHLY BILLS TABLE

**Purpose**: Individual member bills for each month

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PRIMARY KEY | |
| member_id | UUID | NOT NULL, FK:members | Member |
| month | INTEGER | 1-12 | Month |
| year | INTEGER | >= 2020 | Year |
| meals_taken | INTEGER | >= 0 | Meal count |
| rate_per_meal | DECIMAL(10,2) | >= 0 | Rate used |
| total_bill | DECIMAL(10,2) | >= 0 | meals_taken * rate |
| paid_amount | DECIMAL(10,2) | >= 0 | Amount paid |
| due_amount | DECIMAL(10,2) | GENERATED | total_bill - paid |
| due_date | DATE | | Payment deadline |
| is_paid | BOOLEAN | DEFAULT FALSE | Payment status |
| generated_by | UUID | FK:users | Generator |
| created_at | TIMESTAMP | DEFAULT NOW() | |
| updated_at | TIMESTAMP | DEFAULT NOW() | |

**Unique**: (member_id, month, year)

**Indexes**: member_id, (year DESC, month DESC), is_paid, due_date, (member_id, year DESC, month DESC)

---

### 13-18. Supporting Tables

**PASSWORD_RESET_TOKENS**: Secure password reset
- Tokens expire after 1 hour
- One-time use only

**CSRF_TOKENS**: CSRF protection
- Session-based tokens
- Auto-expire after 1 hour

**BACKUPS**: Database backups
- JSON snapshot storage
- Restore capability

**BACKUP_LOGS**: Backup audit trail
- Track all restore operations
- Error logging

---

## Indexes

### Performance Indexes

**Query Optimization**:
```sql
-- Frequently used queries have dedicated indexes:

-- Get active members
CREATE INDEX idx_members_is_active

-- Find meals for date range
CREATE INDEX idx_meals_composite (meal_date, member_id)

-- Filter expenses by category
CREATE INDEX idx_expenses_composite (expense_date, category)

-- Get member payments history
CREATE INDEX idx_payments_composite (member_id, payment_date DESC)

-- List user notifications
CREATE INDEX idx_notifications_composite (user_id, is_read, created_at DESC)

-- Search activity logs
CREATE INDEX idx_activity_logs_created_at (created_at DESC)
```

### Total Indexes: 60+

---

## Triggers & Functions

### Auto-Update Timestamps

**Trigger**: `update_*_updated_at`

All tables have automatic `updated_at` timestamp updates on any modification.

```sql
-- Applied to all 11 main tables
CREATE TRIGGER update_[table]_updated_at
BEFORE UPDATE ON public.[table]
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
```

### Business Logic Functions

#### 1. Calculate Meal Rate
```sql
SELECT * FROM public.calculate_meal_rate(1, 2024);
-- Returns: rate_per_meal, total_meals, total_expenses, market_cost
```

#### 2. Get Member Due Amount
```sql
SELECT * FROM public.get_member_due_amount(member_id);
-- Returns: total due amount for member
```

#### 3. Log Activity
```sql
SELECT public.log_activity(
  user_id,
  'member_added'::activity_type,
  'New member John Doe added',
  member_id
);
-- Automatically logs all changes to activity table
```

---

## Row Level Security (RLS)

### Security Model

**Three-tier access control**:

1. **Authentication**: JWT via Supabase Auth
2. **Authorization**: Role-based (admin/member)
3. **Row-level**: Data-specific policies

### Policy Examples

#### Admin Full Access
```sql
CREATE POLICY "Admins can view all members"
ON public.members FOR SELECT
USING (public.is_admin());
```

#### Member Self-Access
```sql
CREATE POLICY "Members can view themselves"
ON public.members FOR SELECT
USING (
  is_active = TRUE AND (
    user_id = public.auth_user_id() OR
    public.is_admin()
  )
);
```

#### Public Read-Only
```sql
CREATE POLICY "Everyone can view notices"
ON public.notices FOR SELECT
USING (is_archived = FALSE OR public.is_admin());
```

### Total RLS Policies: 60+

**Coverage**:
- ✅ All 18 tables have RLS enabled
- ✅ Average 3-4 policies per table
- ✅ Role-based and data-based policies
- ✅ Insert, Update, Delete protection

---

## Migration Guide

### 1. Create Base Schema
```bash
# Run first migration
supabase migration up 001_create_schema.sql
```

### 2. Enable RLS Policies
```bash
# Run second migration
supabase migration up 002_enable_rls.sql
```

### 3. Seed Test Data
```bash
# Run third migration
supabase migration up 003_seed_data.sql
```

### Complete Migration
```bash
# Or run all migrations at once
supabase db reset
```

---

## Backup & Recovery

### Automated Backups

**Daily backups** via `backups` table:

```sql
-- Create backup
INSERT INTO public.backups (backup_data, created_by, status)
VALUES (snapshot_json, user_id, 'completed');

-- View backup history
SELECT * FROM public.backups
ORDER BY created_at DESC
LIMIT 10;

-- Restore from backup
INSERT INTO public.backup_logs (backup_id, action, status)
VALUES (backup_id, 'restore', 'completed');
```

### Recovery Points

- **Daily**: Automated backups at midnight
- **On-Demand**: Manual backups via API
- **Point-in-Time**: Supabase WAL recovery

---

## Database Maintenance

### Cleanup Tasks

```sql
-- Remove expired password tokens (older than 24 hours)
DELETE FROM public.password_reset_tokens
WHERE expires_at < NOW() - INTERVAL '24 hours';

-- Remove expired CSRF tokens
DELETE FROM public.csrf_tokens
WHERE expires_at < NOW();

-- Archive old activity logs (older than 90 days)
UPDATE public.activity_logs
SET is_archived = TRUE
WHERE created_at < NOW() - INTERVAL '90 days'
  AND is_archived = FALSE;
```

### Performance Optimization

```sql
-- Analyze query performance
EXPLAIN ANALYZE
SELECT m.* FROM public.meals m
JOIN public.members mb ON m.member_id = mb.id
WHERE mb.is_active = TRUE
  AND m.meal_date BETWEEN CURRENT_DATE - 30 AND CURRENT_DATE;

-- Vacuum for maintenance
VACUUM ANALYZE public.meals;
```

---

## Data Integrity Constraints

### Referential Integrity

- ✅ All foreign keys enforced
- ✅ Cascade deletes where appropriate
- ✅ Set NULL for optional references

### Business Rules

- ✅ Leave date must be after join date
- ✅ Paid amount cannot exceed bill
- ✅ Meal rate cannot be negative
- ✅ Market cost must match approval status

### Audit Trail

All user-triggered changes are logged in `activity_logs` table with:
- Old values (before change)
- New values (after change)
- Timestamp and user info
- Related entity ID

---

## Summary

| Aspect | Count |
|--------|-------|
| **Tables** | 18 |
| **Columns** | 200+ |
| **Indexes** | 60+ |
| **Triggers** | 11 |
| **Functions** | 4+ |
| **RLS Policies** | 60+ |
| **Migrations** | 3 |
| **Enum Types** | 6 |
| **Constraints** | 40+ |

---

**Database Version**: 1.1.0
**Last Updated**: January 2024
**Maintenance**: Automated via Supabase
**Backup Strategy**: Daily + On-Demand
