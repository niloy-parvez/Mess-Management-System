# Mess Management System - Installation & Setup Guide

## Quick Start (5 minutes)

### 1. Prerequisites Check
```bash
node --version  # Should be >= 18.0.0
npm --version   # Should be >= 9.0.0
```

### 2. Setup Supabase Project
1. Go to https://supabase.com
2. Create a new project
3. Wait for project initialization
4. Copy your credentials from Settings > API

### 3. Clone and Setup Backend
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your Supabase credentials
npm run migrate
npm run dev
```

### 4. Setup Frontend (New Terminal)
```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

### 5. Open http://localhost:3000

---

## Complete Setup Guide

### A. Create Supabase Project

#### Step 1: Sign Up
- Go to https://supabase.com
- Sign up with GitHub or email
- Create a new organization

#### Step 2: Create Project
- Click "New project"
- Enter project name: "mess-management"
- Set password securely
- Choose region close to you
- Click "Create new project"

#### Step 3: Get API Keys
- Go to Settings > API
- Copy URL and keys
- Save them securely

#### Step 4: Create Database Tables
- Go to SQL Editor
- Click "New Query"
- Copy entire contents of `database/migrations/001_initial_schema.sql`
- Execute the query

### B. Backend Setup

#### Step 1: Install Dependencies
```bash
cd backend
npm install
```

#### Step 2: Configure Environment
```bash
cp .env.example .env
```

Edit `.env`:
```env
NODE_ENV=development
PORT=5000
SUPABASE_URL=your-url-here
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
JWT_SECRET=generate-random-string-here
JWT_EXPIRY=7d
CORS_ORIGIN=http://localhost:3000
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX_REQUESTS=100
LOG_LEVEL=info
```

#### Step 3: Verify Setup
```bash
npm run build  # Check for TypeScript errors
```

#### Step 4: Start Backend
```bash
npm run dev
```

Expected output:
```
✅ Server running on http://localhost:5000
📝 Environment: development
```

#### Step 5: Test Backend
```bash
curl http://localhost:5000/api/health
```

Should respond:
```json
{"status":"OK","timestamp":"..."}
```

### C. Frontend Setup

#### Step 1: Install Dependencies
```bash
cd frontend
npm install
```

#### Step 2: Configure Environment
```bash
cp .env.example .env
```

Edit `.env`:
```env
VITE_API_BASE_URL=http://localhost:5000/api
VITE_SUPABASE_URL=your-url
VITE_SUPABASE_ANON_KEY=your-key
```

#### Step 3: Start Frontend
```bash
npm run dev
```

Expected output:
```
VITE v5.0.8  ready in 123 ms

➜  Local:   http://localhost:3000/
➜  press h to show help
```

### D. Test the Application

#### Create Admin Account
1. Go to http://localhost:3000
2. Click "Sign up here"
3. Fill in:
   - Email: admin@example.com
   - Password: Admin@123
   - Full Name: Admin User
   - Phone: +880...
4. Click "Sign Up"

#### Login
1. Go to http://localhost:3000/login
2. Enter credentials
3. Click "Login"

#### Verify Dashboard
- You should see dashboard with statistics
- Check recent activities

---

## Docker Setup

### Prerequisites
- Docker Desktop installed
- `.env` file configured

### Commands

#### Start All Services
```bash
docker-compose up -d
```

#### View Logs
```bash
docker-compose logs -f backend
docker-compose logs -f frontend
```

#### Stop Services
```bash
docker-compose down
```

#### View Services Status
```bash
docker-compose ps
```

---

## Common Issues & Solutions

### Issue: CORS Error
**Solution**: Check CORS_ORIGIN in backend `.env` matches frontend URL

### Issue: Connection Refused (5000)
**Solution**: 
- Ensure backend is running: `npm run dev` in backend folder
- Check PORT in .env is 5000

### Issue: Supabase Connection Failed
**Solution**:
- Verify SUPABASE_URL and keys are correct
- Check internet connection
- Ensure Supabase project is active

### Issue: Database Migration Failed
**Solution**:
- Copy SQL from `database/migrations/001_initial_schema.sql`
- Go to Supabase > SQL Editor
- Execute manually

### Issue: npm install fails
**Solution**:
```bash
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

---

## Verify Installation

### Checklist
- [ ] Node.js >= 18 installed
- [ ] Supabase project created
- [ ] Database tables created
- [ ] Backend .env configured
- [ ] Frontend .env configured
- [ ] Backend running on 5000
- [ ] Frontend running on 3000
- [ ] Can create account
- [ ] Can login
- [ ] Dashboard loads

---

## Development Commands

### Backend
```bash
npm run dev      # Start development server
npm run build    # Build TypeScript
npm run lint     # Run linter
npm run format   # Format code
npm run migrate  # Run database migrations
```

### Frontend
```bash
npm run dev      # Start Vite dev server
npm run build    # Build for production
npm run lint     # Run linter
npm run format   # Format code
npm run preview  # Preview production build
```

---

## Next Steps

1. **Create Test Data**
   - Add members manually via admin panel
   - Mark some meals
   - Add market items

2. **Customize**
   - Update branding/logo
   - Modify colors in Tailwind config
   - Add custom features

3. **Deploy**
   - Push to GitHub
   - Deploy frontend to Vercel
   - Deploy backend to Render

4. **Extend**
   - Add more pages (Members, Meals, etc.)
   - Implement reports
   - Add notifications

---

## Resources

- [Supabase Documentation](https://supabase.com/docs)
- [React Documentation](https://react.dev)
- [Express.js Documentation](https://expressjs.com)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [TypeScript Documentation](https://www.typescriptlang.org/docs)

---

## Support

Need help? Check:
1. This guide's FAQ section
2. Documentation in `/docs` folder
3. GitHub Issues
4. API Documentation at `/docs/api/API_DOCUMENTATION.md`
