# Mess Management System - Quick Start Guide

## ✅ Current Status

- **Backend:** Running on http://localhost:5000 ✅
- **Frontend:** Running on http://localhost:3000 ✅  
- **Database:** Supabase PostgreSQL configured ✅
- **Authentication:** Supabase Auth integrated ✅
- **Port Management:** Automatic fallback enabled ✅

## 🚀 Getting Started

### Step 1: Backend Setup

```bash
cd backend
npm install
npm run dev
```

**Expected Output:**
```
✅ Server running on http://localhost:5000
📝 Environment: development
🔌 Port: 5000
```

### Step 2: Frontend Setup (New Terminal)

```bash
cd frontend
npm install
npm run dev
```

**Expected Output:**
```
VITE v5.4.21  ready in 564 ms
➜  Local:   http://localhost:3000/
```

### Step 3: Access the Application

Open your browser and navigate to:
```
http://localhost:3000
```

## 📝 Common Tasks

### Test API Health
```bash
curl http://localhost:5000/api/health
```

### Register a New User
1. Go to http://localhost:3000/register
2. Enter email and password
3. Click "Register"

### Login
1. Go to http://localhost:3000/login
2. Enter credentials
3. Click "Login"

### Access Dashboard
After login, you're automatically redirected to:
```
http://localhost:3000/dashboard
```

## 🔧 Environment Variables

### Backend (.env)
Located at: `backend/.env`

Key variables:
- `PORT=5000` - Server port (auto-fallback to 5001, 5002... if needed)
- `NODE_ENV=development` - Environment
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_ANON_KEY` - Supabase public API key
- `JWT_SECRET` - JWT signing secret
- `CORS_ORIGIN=http://localhost:3000` - Frontend URL

### Frontend (.env)
Located at: `frontend/.env.local` (create if needed)

Key variables:
- `VITE_API_BASE_URL=http://localhost:5000/api` - Backend API URL

## 🛠️ Troubleshooting

### Backend Won't Start - EADDRINUSE Error

**Problem:** Port 5000 is already in use

**Solution 1:** Find and kill the process
```powershell
# Find process using port 5000
netstat -ano | findstr :5000

# Kill process (replace PID with actual number)
taskkill /PID [PID_NUMBER] /F
```

**Solution 2:** Let it auto-fallback
The backend will automatically use port 5001, 5002, etc. if 5000 is in use. Check console output for the actual port.

### Frontend Can't Connect to Backend

**Check:**
1. Backend is running: http://localhost:5000/api/health
2. CORS is enabled in backend
3. Frontend API client points to correct URL

### Clear Browser Cache

If login/logout doesn't work:
```javascript
// Open browser console and run:
localStorage.clear();
sessionStorage.clear();
location.reload();
```

## 📦 Project Structure

```
Mess Management System/
├── backend/                 # Express.js API
│   ├── src/
│   │   ├── routes/         # API routes
│   │   ├── controllers/    # Route handlers
│   │   ├── services/       # Business logic
│   │   ├── middlewares/    # Custom middleware
│   │   └── config/         # Configuration
│   ├── .env                # Environment variables
│   └── package.json        # Dependencies
│
└── frontend/               # React + Vite
    ├── src/
    │   ├── pages/         # Page components
    │   ├── components/    # Reusable components
    │   ├── services/      # API services
    │   └── styles/        # Tailwind CSS
    └── package.json       # Dependencies
```

## 🔐 Security Notes

- Never commit `.env` files to git (already in .gitignore)
- JWT tokens stored in localStorage (secure alternative: httpOnly cookies)
- CSRF protection enabled on all POST/PUT/DELETE requests
- Rate limiting active: 100 requests per 15 minutes per IP
- CORS restricted to configured origins

## 📊 Testing the System

### Manual API Testing

#### 1. Health Check
```bash
curl -X GET http://localhost:5000/api/health
```

#### 2. Get CSRF Token
```bash
curl -X GET http://localhost:5000/api/csrf-token
```

#### 3. Register
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

#### 4. Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

## 🚨 Port Configuration

The backend automatically handles port conflicts:

- **Tries first:** Port 5000
- **If in use:** Port 5001
- **If in use:** Port 5002
- **And so on...**

No manual configuration needed!

## 📚 Next Steps

1. ✅ Start backend and frontend
2. ✅ Register a test account
3. ✅ Login to verify authentication
4. ✅ Test all modules (Members, Meals, Market, etc.)
5. ✅ Check dashboard displays real data
6. ✅ Deploy to production when ready

## 📞 Support

For issues with:
- **Backend startup:** See `BACKEND_STARTUP_FIX.md`
- **Database schema:** See `SCHEMA_DEPLOYMENT_GUIDE.md`
- **Authentication:** Check `backend/src/middlewares/auth.ts`
- **API routes:** Check `backend/src/routes/`

## 🎉 You're Ready!

The Mess Management System is fully set up and ready to use. Just run:

```bash
# Terminal 1 - Backend
cd backend && npm run dev

# Terminal 2 - Frontend  
cd frontend && npm run dev

# Then open browser to http://localhost:3000
```

Happy coding! 🚀
