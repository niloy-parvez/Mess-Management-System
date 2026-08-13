# Architecture Overview

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Client (React.js)                       │
│                  - Tailwind CSS Styling                     │
│                  - Zustand State Management                 │
│                  - TypeScript                               │
└────────────────────────┬──────────────────────────────────────┘
                         │ HTTP/REST API
┌────────────────────────▼──────────────────────────────────────┐
│                    API Gateway / Backend                      │
│                    (Express.js + Node.js)                     │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │  Routes Layer (REST Endpoints)                          │  │
│  │  - Auth Routes                                          │  │
│  │  - Member Routes                                        │  │
│  │  - Meal Routes                                          │  │
│  │  - Market Routes                                        │  │
│  │  - Expense Routes                                       │  │
│  │  - Payment Routes                                       │  │
│  │  - Dashboard Routes                                     │  │
│  └─────────────────────────────────────────────────────────┘  │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │  Middleware Layer                                       │  │
│  │  - Authentication (JWT)                                 │  │
│  │  - Authorization (RBAC)                                 │  │
│  │  - Error Handling                                       │  │
│  │  - Logging                                              │  │
│  │  - Rate Limiting                                        │  │
│  │  - Security Headers (Helmet)                            │  │
│  └─────────────────────────────────────────────────────────┘  │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │  Controllers Layer                                      │  │
│  │  - Auth Controller                                      │  │
│  │  - Member Controller                                    │  │
│  │  - Meal Controller                                      │  │
│  │  - Market Controller                                    │  │
│  │  - Expense Controller                                   │  │
│  │  - Payment Controller                                   │  │
│  │  - Dashboard Controller                                 │  │
│  └─────────────────────────────────────────────────────────┘  │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │  Services Layer                                         │  │
│  │  - Business Logic                                       │  │
│  │  - Database Operations                                  │  │
│  │  - External Integrations                                │  │
│  └─────────────────────────────────────────────────────────┘  │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │  Utils Layer                                            │  │
│  │  - Authentication Utils                                 │  │
│  │  - Response Formatting                                  │  │
│  │  - Validation                                           │  │
│  └─────────────────────────────────────────────────────────┘  │
└─────────────────────────┬──────────────────────────────────────┘
                         │ PostgreSQL Protocol
┌────────────────────────▼──────────────────────────────────────┐
│               Database (Supabase PostgreSQL)                   │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │  Core Tables                                            │  │
│  │  - Users                                                │  │
│  │  - Members                                              │  │
│  │  - Meals                                                │  │
│  │  - Market                                               │  │
│  │  - Expenses                                             │  │
│  │  - Payments                                             │  │
│  │  - Meal Rates                                           │  │
│  │  - Monthly Bills                                        │  │
│  │  - Notices                                              │  │
│  └─────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

## Design Patterns

### MVC Pattern
- **Models**: Data structures and database operations
- **Views**: Frontend components (React)
- **Controllers**: Request handlers and business logic

### Clean Architecture
- **Separation of Concerns**: Each layer has specific responsibilities
- **Dependency Injection**: Services injected into controllers
- **Testability**: Each layer can be tested independently

### RBAC (Role-Based Access Control)
- **Admin**: Full system access
- **Member**: Limited access (view own data, submit meals/payments)

## Security Implementation

1. **Authentication**: JWT tokens for stateless authentication
2. **Authorization**: Middleware-based role checking
3. **Password Security**: Bcrypt hashing
4. **API Security**:
   - Helmet for HTTP headers
   - CORS configuration
   - Rate limiting
   - Input validation (Joi)
5. **Database Security**: Row-level constraints, foreign keys

## Frontend Architecture

```
App
├── Pages
│   ├── LoginPage
│   ├── RegisterPage
│   └── DashboardPage
├── Components
│   ├── Common
│   │   ├── Button
│   │   ├── Card
│   │   ├── Input
│   │   └── ...
│   ├── Layout
│   │   ├── Header
│   │   └── Footer
│   ├── Auth
│   │   └── ProtectedRoute
│   ├── Dashboard
│   ├── Members
│   ├── Meals
│   ├── Market
│   ├── Expenses
│   └── Payments
├── Services
│   ├── api.ts
│   ├── authService.ts
│   ├── dashboardService.ts
│   └── ...
├── Context
│   └── authStore.ts (Zustand)
├── Types
│   └── index.ts
└── Styles
    └── index.css
```

## Data Flow

### Authentication Flow
1. User submits credentials
2. Backend validates and hashes password
3. JWT token generated
4. Token stored in localStorage
5. Subsequent requests include token in headers
6. Middleware validates token

### API Request Flow
1. Frontend makes API call
2. Interceptor adds authorization header
3. Backend middleware validates JWT
4. Controller processes request
5. Service performs operations
6. Database returns data
7. Response formatted and sent back

## Deployment Strategy

- **Frontend**: Vercel
- **Backend**: Render
- **Database**: Supabase
- **Version Control**: GitHub
- **CI/CD**: GitHub Actions
