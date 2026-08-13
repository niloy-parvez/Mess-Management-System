# 🍽️ Mess Management System - Production Ready

A modern, secure, and scalable web application for managing student messes and boarding houses. Automates meal tracking, market management, expense tracking, payments, member management, and monthly billing.

![Status](https://img.shields.io/badge/status-production--ready-green)
![License](https://img.shields.io/badge/license-MIT-blue)
![Node Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)
![React Version](https://img.shields.io/badge/react-18.2.0-61dafb)

---

## ✨ Features

### Phase 1 Implementation (Complete)

#### 🔐 Authentication & Authorization
- ✅ Admin & Member registration
- ✅ Secure JWT-based authentication
- ✅ Role-Based Access Control (RBAC)
- ✅ Password encryption (Bcrypt)
- ✅ Change password functionality
- ✅ Session management

#### 👥 Member Management
- ✅ Add/Edit/Delete members
- ✅ Activate/Deactivate members
- ✅ Member profiles with contact info
- ✅ Leave management
- ✅ Member statistics

#### 🍴 Meal Management
- ✅ Mark meals (breakfast, lunch, dinner)
- ✅ Daily meal tracking
- ✅ Monthly meal statistics
- ✅ Meal history view
- ✅ Automatic meal rate calculation

#### 🛒 Market Management
- ✅ Add shopping items
- ✅ Receipt upload
- ✅ Market approval workflow (Admin)
- ✅ Market history
- ✅ Cost tracking

#### 💰 Expense Management
- ✅ Track expenses by category
  - Gas
  - Electricity
  - Internet
  - Water
  - Maid Salary
  - Maintenance
  - Others
- ✅ Receipt documentation
- ✅ Monthly expense reports

#### 💳 Payment Management
- ✅ Record payments (Cash, bKash, Nagad, Bank Transfer)
- ✅ Payment verification (Admin)
- ✅ Transaction ID tracking
- ✅ Payment history
- ✅ Due amount calculation

#### 📊 Dashboard & Reports
- ✅ Real-time statistics
  - Total members & active members
  - Total expenses
  - Total market cost
  - Total collection
  - Due amount
- ✅ Recent activities feed
- ✅ Meal rate calculation
- ✅ Monthly bill generation

#### 🔔 Notifications
- ✅ In-app activity notifications
- ✅ Alert system (ready for extension)

#### 🛡️ Security Features
- ✅ SQL injection prevention
- ✅ XSS protection
- ✅ CSRF token support (ready)
- ✅ Rate limiting
- ✅ CORS configuration
- ✅ Helmet security headers
- ✅ Input validation (Joi)

---

## 🏗️ Project Structure

```
Mess Management System/
├── frontend/                          # React.js + Tailwind CSS
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/               # Reusable UI components
│   │   │   ├── layout/               # Header, Footer
│   │   │   ├── auth/                 # Auth components
│   │   │   ├── dashboard/            # Dashboard components
│   │   │   ├── members/              # Member components
│   │   │   ├── meals/                # Meal components
│   │   │   ├── market/               # Market components
│   │   │   ├── expenses/             # Expense components
│   │   │   └── payments/             # Payment components
│   │   ├── pages/                    # Page components
│   │   ├── hooks/                    # Custom React hooks
│   │   ├── services/                 # API services
│   │   ├── context/                  # Zustand state stores
│   │   ├── types/                    # TypeScript types
│   │   ├── utils/                    # Utility functions
│   │   ├── styles/                   # Global styles
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── public/                       # Static assets
│   ├── index.html
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   ├── package.json
│   └── .env.example
│
├── backend/                           # Node.js + Express.js
│   ├── src/
│   │   ├── config/                   # Configuration files
│   │   │   ├── index.ts              # Main config
│   │   │   └── supabase.ts           # Supabase client
│   │   ├── controllers/              # Request handlers
│   │   │   ├── authController.ts
│   │   │   ├── memberController.ts
│   │   │   ├── mealController.ts
│   │   │   ├── marketController.ts
│   │   │   ├── expenseController.ts
│   │   │   ├── paymentController.ts
│   │   │   └── dashboardController.ts
│   │   ├── services/                 # Business logic
│   │   ├── routes/                   # API routes
│   │   │   ├── authRoutes.ts
│   │   │   ├── memberRoutes.ts
│   │   │   ├── mealRoutes.ts
│   │   │   ├── marketRoutes.ts
│   │   │   ├── expenseRoutes.ts
│   │   │   ├── paymentRoutes.ts
│   │   │   └── dashboardRoutes.ts
│   │   ├── middlewares/              # Express middlewares
│   │   │   ├── auth.ts
│   │   │   └── errorHandler.ts
│   │   ├── utils/                    # Utility functions
│   │   │   ├── auth.ts               # JWT & password utils
│   │   │   └── response.ts           # Response formatting
│   │   ├── types/                    # TypeScript types
│   │   ├── models/                   # Data models
│   │   └── index.ts                  # App entry point
│   ├── tsconfig.json
│   ├── package.json
│   ├── Dockerfile
│   └── .env.example
│
├── database/
│   ├── migrations/
│   │   └── 001_initial_schema.sql   # Initial database schema
│   └── seeds/                        # Seed data
│
├── docs/
│   ├── api/
│   │   └── API_DOCUMENTATION.md     # Complete API docs
│   ├── database/
│   │   └── DATABASE_SCHEMA.md       # Database schema details
│   └── architecture/
│       └── ARCHITECTURE.md           # System architecture
│
├── .github/
│   └── workflows/                    # CI/CD workflows
│
├── docker-compose.yml                # Docker Compose setup
├── .gitignore
├── COMPLETE_README.md                # This file
└── LICENSE
```

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: React.js 18.2.0
- **Styling**: Tailwind CSS 3.3.6
- **Language**: TypeScript 5.3.3
- **State Management**: Zustand 4.4.3
- **HTTP Client**: Axios 1.6.2
- **Router**: React Router DOM 6.18.0
- **UI Icons**: Lucide React 0.292.0
- **Build Tool**: Vite 5.0.8

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js 4.18.2
- **Language**: TypeScript 5.3.3
- **Authentication**: JWT (jsonwebtoken 9.1.2)
- **Password Hashing**: Bcryptjs 2.4.3
- **Security**: Helmet 7.0.0, CORS 2.8.5
- **Rate Limiting**: express-rate-limit 7.1.5
- **Validation**: Joi 17.11.0
- **Logging**: Winston 3.11.0
- **Database Client**: @supabase/supabase-js 2.38.4

### Database
- **Primary**: Supabase PostgreSQL
- **Authentication**: Supabase Auth

### DevOps
- **Containerization**: Docker
- **Orchestration**: Docker Compose
- **Frontend Hosting**: Vercel
- **Backend Hosting**: Render
- **Version Control**: GitHub

---

## 🚀 Getting Started

### Prerequisites
- Node.js >= 18.0.0
- npm or yarn
- Supabase account (free tier available)
- Docker (optional, for containerization)

### 1. Clone Repository
```bash
git clone https://github.com/yourusername/mess-management-system.git
cd mess-management-system
```

### 2. Setup Backend

#### Install Dependencies
```bash
cd backend
npm install
```

#### Configure Environment Variables
```bash
cp .env.example .env
```

Edit `.env` with your Supabase credentials:
```env
NODE_ENV=development
PORT=5000
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
JWT_SECRET=your-jwt-secret-key-here
JWT_EXPIRY=7d
CORS_ORIGIN=http://localhost:3000
```

#### Run Database Migration
```bash
npm run migrate
```

#### Start Backend
```bash
npm run dev
```

The backend will be available at `http://localhost:5000`

### 3. Setup Frontend

#### Install Dependencies
```bash
cd frontend
npm install
```

#### Configure Environment Variables
```bash
cp .env.example .env
```

Edit `.env`:
```env
VITE_API_BASE_URL=http://localhost:5000/api
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

#### Start Frontend
```bash
npm run dev
```

The frontend will be available at `http://localhost:3000`

### 4. Access the Application
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000/api
- **Health Check**: http://localhost:5000/api/health

---

## 🐳 Docker Setup (Optional)

### Run with Docker Compose
```bash
# Build and start all services
docker-compose up -d

# Check logs
docker-compose logs -f

# Stop services
docker-compose down
```

---

## 📚 API Documentation

See [API_DOCUMENTATION.md](docs/api/API_DOCUMENTATION.md) for complete API reference.

### Quick API Examples

#### Register
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "SecurePass123",
    "full_name": "Admin User",
    "phone": "+880..."
  }'
```

#### Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "SecurePass123"
  }'
```

#### Get Dashboard Stats
```bash
curl -X GET http://localhost:5000/api/dashboard/stats \
  -H "Authorization: Bearer <your-token>"
```

---

## 🗄️ Database Schema

See [DATABASE_SCHEMA.md](docs/database/DATABASE_SCHEMA.md) for detailed schema documentation.

### Core Tables
- **users**: User accounts with roles
- **members**: Member profiles
- **meals**: Meal consumption tracking
- **market**: Shopping items and costs
- **expenses**: Fixed expenses
- **payments**: Member payments
- **meal_rates**: Calculated meal rates
- **monthly_bills**: Monthly billing records
- **notices**: Announcements

---

## 🏛️ System Architecture

See [ARCHITECTURE.md](docs/architecture/ARCHITECTURE.md) for detailed architecture documentation.

### Key Architecture Principles
- **Clean Architecture**: Separation of concerns
- **MVC Pattern**: Models, Views, Controllers
- **RBAC**: Role-based access control
- **JWT Authentication**: Stateless auth
- **Middleware Pattern**: Request processing chain

---

## 🔐 Security Best Practices Implemented

1. **Authentication**
   - JWT token-based authentication
   - Secure password hashing (Bcrypt)
   - Token expiration (7 days configurable)

2. **Authorization**
   - Role-based access control (Admin/Member)
   - Route-level permission checks
   - Resource-level authorization

3. **API Security**
   - CORS configuration
   - Rate limiting (100 requests/15 minutes)
   - Input validation (Joi schemas)
   - SQL injection prevention (Parameterized queries)
   - XSS protection headers

4. **Data Protection**
   - Encrypted passwords
   - HTTPS ready (production)
   - Secure session management
   - Data encryption in transit

5. **Infrastructure**
   - Helmet security headers
   - Environment variable protection
   - Audit logging capability
   - Error handling without sensitive info leakage

---

## 📋 Development Workflow

### Code Style
- ESLint for code linting
- Prettier for code formatting
- TypeScript for type safety

### Linting
```bash
# Backend
cd backend
npm run lint
npm run format

# Frontend
cd frontend
npm run lint
npm run format
```

### Building
```bash
# Backend
cd backend
npm run build

# Frontend
cd frontend
npm run build
```

---

## 🧪 Testing (Ready for Extension)

The project structure supports:
- Unit testing with Jest
- Integration testing with Supertest (backend)
- Component testing with React Testing Library (frontend)
- E2E testing with Cypress

---

## 📦 Deployment

### Frontend Deployment (Vercel)
```bash
# Connect to GitHub and deploy automatically
# Or manual deploy:
vercel
```

### Backend Deployment (Render)
```bash
# Push to GitHub, Render auto-deploys
# Or create Render service manually with Dockerfile
```

### Database
- Supabase PostgreSQL is cloud-hosted
- No additional setup needed

---

## 🔄 Future Features (Phase 2+)

- [ ] Mobile app (React Native)
- [ ] SMS notifications
- [ ] Email notifications
- [ ] Online payment gateway integration
- [ ] QR code payments
- [ ] Multi-mess management
- [ ] AI-powered expense analysis
- [ ] Advanced reporting & analytics
- [ ] Backup & restore functionality
- [ ] Audit logs

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📝 License

This project is licensed under the MIT License - see [LICENSE](LICENSE) file for details.

---

## 💬 Support

For issues, questions, or suggestions:
- Open an issue on GitHub
- Contact: support@messmanagementsystem.com
- Documentation: See `/docs` folder

---

## 🙏 Acknowledgments

- Supabase for excellent backend-as-a-service
- React community for amazing libraries
- Node.js ecosystem contributors

---

## 📞 Contact

- **Project Lead**: Your Name
- **Email**: your.email@example.com
- **Website**: www.messmanagementsystem.com

---

**Made with ❤️ for mess management automation**

Last Updated: January 2024
