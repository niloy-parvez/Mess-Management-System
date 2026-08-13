# Mess Management System - API Documentation

## Base URL
```
http://localhost:5000/api
```

## Authentication
All endpoints (except /auth/register and /auth/login) require an Authorization header:
```
Authorization: Bearer <token>
```

---

## Authentication Endpoints

### Register User
- **POST** `/auth/register`
- **Body:**
  ```json
  {
    "email": "user@example.com",
    "password": "securepass",
    "full_name": "Full Name",
    "phone": "+880..."
  }
  ```
- **Response:** User object + JWT token

### Login User
- **POST** `/auth/login`
- **Body:**
  ```json
  {
    "email": "user@example.com",
    "password": "securepass"
  }
  ```
- **Response:** User object + JWT token

### Get Current User
- **GET** `/auth/me`
- **Response:** Current user object

### Change Password
- **POST** `/auth/change-password`
- **Body:**
  ```json
  {
    "oldPassword": "current",
    "newPassword": "new"
  }
  ```

---

## Members Endpoints

### Create Member (Admin)
- **POST** `/members`
- **Body:**
  ```json
  {
    "email": "member@example.com",
    "full_name": "Member Name",
    "phone": "+880...",
    "roll_number": "A-001",
    "room_number": "101",
    "joining_date": "2024-01-01"
  }
  ```

### Get All Members
- **GET** `/members?page=1&limit=10&is_active=true`
- **Response:** Paginated list of members

### Get Member by ID
- **GET** `/members/:id`

### Update Member (Admin)
- **PATCH** `/members/:id`

### Deactivate Member (Admin)
- **PATCH** `/members/:id/deactivate`

### Activate Member (Admin)
- **PATCH** `/members/:id/activate`

---

## Meals Endpoints

### Mark Meal (Admin)
- **POST** `/meals`
- **Body:**
  ```json
  {
    "member_id": "uuid",
    "meal_type": "breakfast|lunch|dinner",
    "meal_date": "2024-01-01"
  }
  ```

### Get Meals
- **GET** `/meals?page=1&limit=20&member_id=uuid`

### Get Meal Statistics
- **GET** `/meals/stats`

### Delete Meal (Admin)
- **DELETE** `/meals/:id`

---

## Market Endpoints

### Create Market Item
- **POST** `/market`
- **Body:**
  ```json
  {
    "item_name": "Rice",
    "quantity": 10,
    "unit": "kg",
    "cost": 500,
    "vendor_name": "Local Market",
    "receipt_url": "https://...",
    "market_date": "2024-01-01"
  }
  ```

### Get Market Items
- **GET** `/market?page=1&limit=20&status=pending|approved|rejected`

### Approve Market Item (Admin)
- **PATCH** `/market/:id/approve`

### Reject Market Item (Admin)
- **PATCH** `/market/:id/reject`

### Delete Market Item (Admin)
- **DELETE** `/market/:id`

---

## Expenses Endpoints

### Create Expense (Admin)
- **POST** `/expenses`
- **Body:**
  ```json
  {
    "category": "gas|electricity|internet|water|maid_salary|maintenance|others",
    "amount": 1000,
    "description": "Monthly electricity bill",
    "expense_date": "2024-01-01",
    "receipt_url": "https://..."
  }
  ```

### Get Expenses
- **GET** `/expenses?page=1&limit=20&category=gas`

### Get Expense Statistics
- **GET** `/expenses/stats`

### Delete Expense (Admin)
- **DELETE** `/expenses/:id`

---

## Payments Endpoints

### Create Payment
- **POST** `/payments`
- **Body:**
  ```json
  {
    "member_id": "uuid",
    "amount": 5000,
    "payment_method": "cash|bkash|nagad|bank_transfer",
    "transaction_id": "ref123",
    "payment_date": "2024-01-01"
  }
  ```

### Get Payments
- **GET** `/payments?page=1&limit=20&member_id=uuid&verified=true`

### Verify Payment (Admin)
- **PATCH** `/payments/:id/verify`

### Delete Payment (Admin)
- **DELETE** `/payments/:id`

---

## Dashboard Endpoints

### Get Dashboard Statistics
- **GET** `/dashboard/stats`
- **Response:**
  ```json
  {
    "totalMembers": 20,
    "activeMembers": 18,
    "totalExpenses": 50000,
    "totalMarketCost": 30000,
    "totalCollection": 75000,
    "todayMarket": 5,
    "dueAmount": 5000
  }
  ```

### Get Recent Activities
- **GET** `/dashboard/activities?limit=10`
