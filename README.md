# 🏠 Mess Management System

A modern, secure, and responsive web-based Mess Management System designed to automate meal tracking, market management, expenses, payments, member management, and monthly accounting.

---

## 📌 Project Overview

This project is developed to simplify the management of student messes and boarding houses by replacing manual calculations with an automated system.

The application is scalable and future-ready, allowing additional features such as:

- Online Payment
- Mobile App
- Multi-Mess Support

---

## 🔧 Recent Fixes

- Added complete Supabase PostgreSQL schema migration scripts for all Phase-1 tables and relationships.
- Fixed backend auth registration flow to log detailed Supabase errors and correctly handle missing profile table errors.
- Added `migration_logs` schema support and improved the database migration runner for direct `DATABASE_URL` usage.
- Hardened protected API authentication and CSRF handling so local development requests now send JWT and CSRF headers correctly.
- Normalized the application identity flow around the authenticated Supabase `auth.users.id` as the canonical source of truth for business writes and documented the requirement to run the auth-FK normalization migrations for production-grade market/member records.
- Fixed backend report and notice controller mismatches with current schema fields.
- Fixed frontend navigation links to use React Router `<Link>` components.
- Hardened the backend startup flow so `npm run dev` now respects `backend/.env` `PORT`, falls back to the next free port when 5000 is occupied, and avoids the previous `EADDRINUSE` crash path.
- Added the missing reporting dashboard surface with searchable, sortable, paginated report views and CSV/PDF export helpers.
- Added the admin panel, member panel, and notifications center to complete the Phase 9-13 UX while preserving the existing authenticated flows.
- Confirmed the project runs without Docker and uses normal Node.js development commands only.
- Hardened the auth identity contract so login/register/current-user responses now consistently return the canonical `auth.users.id` as `user.id`, with `profile_id` retained for backward-compatible profile metadata.
- Completed the member profile dashboard so it loads real meal, payment, and billing data from the database rather than placeholder or partially derived UI state.
- Added the missing edit workflow in the members page so admins can update a member record directly from the list screen.
- Fixed runtime Authorization headers in the frontend API client and refresh flow so protected requests consistently send `Authorization: Bearer <token>`.
- Updated backend authentication middleware to resolve role/active status from `public.users` and member linkage from `public.members` for database-driven RBAC enforcement.
- Tightened backend access control so non-admin users can only access their own member, meal, market, and payment records, while admin-only payment management and member-management actions remain enforced server-side.
- Added the authoritative backend financial calculation service in `backend/src/services/financialCalculationService.ts` and consolidated the monthly summary logic to a single source of truth.
- Corrected the Meal Rate formula to use only approved market cost divided by valid meal count, excluding pending, rejected, voided, deleted, and unverified market entries.
- Corrected payment logic to count only verified payments when calculating collection, due, and balance, while preserving pending payments as non-operative until verification.
- Fixed dashboard/member summary logic so due and balance are clearly differentiated instead of clamping negative balances to zero.
- Added deterministic financial tests covering approved/pending market transitions, due/balance outcomes, zero-meal handling, and previous-month isolation.

---

## 💰 Finance Calculation Rules

The application now uses a single authoritative calculation engine for all relevant summaries.

Rules:

- Meal Rate = Total approved market cost / total valid meals.
- Pending, unverified, rejected, voided, deleted, and non-approved market entries are excluded from financial totals.
- Only verified payments are counted toward collection, balance, and due.
- Member bill = member valid meal count × current month meal rate.
- Member balance = verified payments − member bill.
- If balance is positive, the member has a credit; if negative, the member has a due amount.
- General expenses are kept separate from market cost and do not alter meal rate unless explicit business rules require otherwise.
- Previous month calculations are isolated by month/year and are not mixed into current month totals.

The authoritative service lives in `backend/src/services/financialCalculationService.ts` and is consumed by dashboard and report flows instead of independent local formulas.

---

# ✨ Features

## Authentication

- Admin Login
- Member Login
- Forgot Password
- Change Password
- Secure Authentication

---

## Dashboard

- Total Members
- Active Members
- Today's Market
- Meal Rate
- Total Expenses
- Total Collection
- Due Amount
- Recent Activities

---

## Member Management

- Add Member
- Edit Member
- Delete Member
- Activate Member
- Deactivate Member
- Profile Photo
- Leave Management

---

## Meal Management

- Breakfast
- Lunch
- Dinner

Automatic Calculation

- Daily Meals
- Monthly Meals
- Total Meals

---

## Market Management

- Shopping List
- Custom Items
- Receipt Upload
- Market Approval
- Market History
- Monthly Lock

---

## Expense Management

Categories

- Gas
- Electricity
- Internet
- Water
- Maid Salary
- Maintenance
- Others

---

## Payment Management

Payment Methods

- Cash
- bKash
- Nagad
- Bank Transfer

---

## Reports

Automatically Generate

- Meal Rate
- Monthly Bill
- Total Expenses
- Total Market Cost
- Paid Amount
- Due Amount

Export

- PDF
- Print

---

## Notice Board

- Create Notice
- Edit Notice
- Delete Notice
- Member View

---

## Notifications

Admin

- New Market
- Payment
- Backup
- Monthly Lock

Member

- Notice
- Due Update
- Payment Update

---

## Backup & Restore

- Database Backup
- Restore
- Recycle Bin

---

## Security

- Password Encryption
- RBAC
- SQL Injection Protection
- XSS Protection
- CSRF Protection
- Secure API
- Session Management

---

## Canonical Authentication & Database Identity Model

The production-ready identity model is:

- `auth.users.id` is the canonical authentication identity.
- `public.users` is treated as a backward-compatibility profile table that stores `auth_id` and profile metadata.
- `members.user_id` must resolve to the same canonical `auth.users.id` for all business-linked writes.
- `market.created_by`, `market.approved_by`, `payments.created_by`, `expenses.created_by`, and related audit columns must reference `auth.users(id)`.

Important:

- The backend must not silently remap writes to a legacy profile UUID.
- The database must be normalized by applying the supplied Supabase SQL migrations before any production deployment.
- `006_migrate_user_fks_to_auth_users.sql` and `007_migrate_members_user_to_auth.sql` are the authoritative normalization steps for the live Supabase deployment.

---

# 🛠 Tech Stack
 
Frontend
 
- React.js
- Tailwind CSS
 
Backend
 
- Node.js
- Express.js
 
Database
 
- Supabase PostgreSQL
 
Authentication
 
- Supabase Auth
 
Hosting
 
- Vercel
- Render

---

# 🚀 Getting Started

1. Copy `backend/.env.example` to `backend/.env`.
2. Configure `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and `JWT_SECRET`.
3. Optionally set `DATABASE_URL` if you want to run schema migrations directly from the repository.
4. Install dependencies:
   - `cd backend && npm install`
   - `cd ../frontend && npm install`
5. Run the backend:
   - `cd backend && npm run dev`
6. Run the frontend:
   - `cd frontend && npm run dev`

# 🧱 Database Setup

This repository includes complete SQL migration scripts in `database/migrations/` for:

- `users`
- `members`
- `meals`
- `market`
- `expenses`
- `payments`
- `notices`
- `notifications`
- `settings`
- `activity_logs`
- `backup_logs`
- `meal_rates`
- `monthly_bills`
- `password_reset_tokens`
- `csrf_tokens`
- `migration_logs`

## ⚠️ IMPORTANT: Apply Schema Before Using System

The Supabase project **must have the schema deployed** before the backend APIs will work. Without the schema:
- Registration creates Auth user but fails to create profile (logs: "Could not find the table 'public.users'")
- All protected APIs return 500 errors (PGRST205)
- Dashboard and member pages fail to load

### Schema Deployment Methods

**Method 1: Manual via Supabase SQL Editor (Recommended for beginners)**

1. Go to https://app.supabase.com and open your project
2. Navigate to **SQL Editor** → **New Query**
3. Copy content from `database/migrations/001_create_schema.sql` and paste into SQL Editor
4. Click **Run**
5. Repeat steps 2-4 for `002_enable_rls.sql`
6. Repeat steps 2-4 for `003_seed_data.sql` (optional, adds test data)
7. Verify in **Table Editor** that tables now exist

**Method 2: Automatic via Migration Runner (Requires DATABASE_URL)**

1. Set `DATABASE_URL` in `backend/.env` to your Supabase PostgreSQL connection string:
   ```
   DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@YOUR_PROJECT.supabase.co:5432/postgres
   ```

2. Run the migration script from repository root:
   ```bash
   node database/db-migrate.js up
   ```

3. Verify migration status:
   ```bash
   node database/db-migrate.js status
   ```

**Method 3: Using Supabase CLI (Advanced)**

1. Install Supabase CLI: `npm install -g supabase`
2. Link project: `supabase link --project-ref YOUR_PROJECT_REF`
3. Push schema: `supabase db push`

### Verification

After applying schema, verify it worked:

```bash
# Start backend (if not already running)
cd backend
npm run dev

# In another terminal, test registration
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPass123!",
    "full_name": "Test User",
    "phone": "01700000000"
  }'

# Response should include a token (no more PGRST205 errors)
```

If you still see `PGRST205` errors, the schema was not fully applied. Check Supabase SQL Editor for error messages.

Version Control

- Git & GitHub

---

# 📂 Project Structure

frontend/

backend/

database/

docs/

screenshots/

README.md

---

# 🚀 Installation

Clone Repository


git clone https://github.com/yourusername/mess-management-system.git

Frontend

cd frontend

npm install

npm run dev

Backend

cd backend

npm install

npm run dev

---

# 🔐 Backend Authentication Fixes

- Backend registration now creates Supabase Auth users using the service role key.
- User profile information is stored safely in Supabase Auth `user_metadata`.
- Registration, login, current user lookup, password reset, and password change now work even if the custom `public.users` profile table has not yet been created.
- When the `public.users` table exists, the backend will also create and load profile records from it.
- Detailed Supabase error logging was added to the registration endpoint for easier debugging.

---
# Environment Variables

Backend

SUPABASE_URL=

SUPABASE_ANON_KEY=

SUPABASE_SERVICE_ROLE_KEY=

SUPABASE_JWKS_URL=

JWT_SECRET=

JWT_EXPIRY=7d

PORT=5000

---

# Future Features

- Mobile App
- Online Payment Gateway
- SMS Notification
- Email Notification
- QR Payment
- Multi Mess Management
- AI Expense Analysis

---

# License

MIT License

---

## DevOps & Automation

- Postman collection: docs/postman_collection.json
- CI/CD: .github/workflows/ci-cd.yml (runs backend+frontend build, tests, deploys to Vercel/Render)
- Tests: backend uses Jest + Supertest (run with `npm test` in backend)
- Local development: Run backend and frontend separately with `npm run dev`

## Running Locally (No Docker Required)

### Backend
```bash
cd backend
npm install
npm run dev
```
Backend runs on http://localhost:5000

### Frontend  
```bash
cd frontend
npm install
npm run dev
```
Frontend runs on http://localhost:5173

## Notes

- The repository includes database migrations under `database/` for Supabase.
- Before running seeds that reference `auth.users`, create corresponding Supabase Auth users or run the seed with the `SUPABASE_SERVICE_ROLE_KEY`.
