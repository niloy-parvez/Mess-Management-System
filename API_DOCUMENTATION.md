# 📚 Mess Management System - API Documentation

## Base URL
```
https://api.messmanagement.local/api
```

## Authentication
All endpoints (except `/auth/login` and `/auth/register`) require:
- **Header**: `Authorization: Bearer <JWT_TOKEN>`
- **Header**: `X-Session-ID: <SESSION_ID>` (for CSRF)
- **Header**: `X-CSRF-Token: <CSRF_TOKEN>` (for state-changing operations)

---

## 🔐 Authentication Endpoints

### Login
```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response (200)**:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "role": "admin",
      "name": "Admin Name"
    },
    "token": "jwt_token",
    "expiresIn": 604800
  }
}
```

### Register
```http
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "name": "User Name",
  "role": "member"
}
```

### Change Password
```http
POST /auth/change-password
Authorization: Bearer <TOKEN>
Content-Type: application/json

{
  "oldPassword": "oldpass123",
  "newPassword": "newpass123"
}
```

### Forgot Password
```http
POST /auth/forgot-password
Content-Type: application/json

{
  "email": "user@example.com"
}
```

### Reset Password
```http
POST /auth/reset-password
Content-Type: application/json

{
  "token": "reset_token",
  "newPassword": "newpass123"
}
```

---

## 👥 Member Endpoints

### Get All Members
```http
GET /members?limit=10&offset=0
Authorization: Bearer <TOKEN>
```

### Get Member by ID
```http
GET /members/{memberId}
Authorization: Bearer <TOKEN>
```

### Create Member
```http
POST /members
Authorization: Bearer <TOKEN>
X-CSRF-Token: <TOKEN>
Content-Type: application/json

{
  "name": "Member Name",
  "email": "member@example.com",
  "phone": "01712345678",
  "room_number": "101",
  "join_date": "2024-01-01"
}
```

### Update Member
```http
PATCH /members/{memberId}
Authorization: Bearer <TOKEN>
X-CSRF-Token: <TOKEN>
Content-Type: application/json

{
  "name": "Updated Name",
  "phone": "01712345678",
  "room_number": "102"
}
```

### Deactivate Member
```http
PATCH /members/{memberId}/deactivate
Authorization: Bearer <TOKEN>
X-CSRF-Token: <TOKEN>
```

### Activate Member
```http
PATCH /members/{memberId}/activate
Authorization: Bearer <TOKEN>
X-CSRF-Token: <TOKEN>
```

### Upload Member Photo
```http
POST /members/{memberId}/upload-photo
Authorization: Bearer <TOKEN>
Content-Type: multipart/form-data

{
  "photo": <FILE>
}
```

### Delete Member (Soft Delete)
```http
DELETE /members/{memberId}
Authorization: Bearer <TOKEN>
X-CSRF-Token: <TOKEN>
```

### Get Deleted Members
```http
GET /members/deleted
Authorization: Bearer <TOKEN>
```

### Restore Member
```http
PATCH /members/{memberId}/restore
Authorization: Bearer <TOKEN>
X-CSRF-Token: <TOKEN>
```

---

## 🍽️ Meal Endpoints

### Record Meal
```http
POST /meals
Authorization: Bearer <TOKEN>
X-CSRF-Token: <TOKEN>
Content-Type: application/json

{
  "member_id": "member_uuid",
  "meal_type": "breakfast",
  "date": "2024-01-01"
}
```

### Get Daily Meals
```http
GET /meals?date=2024-01-01
Authorization: Bearer <TOKEN>
```

### Get Monthly Meals
```http
GET /meals?month=1&year=2024
Authorization: Bearer <TOKEN>
```

---

## 🛒 Market Endpoints

### Create Market Entry
```http
POST /market
Authorization: Bearer <TOKEN>
X-CSRF-Token: <TOKEN>
Content-Type: application/json

{
  "date": "2024-01-01",
  "items": [
    {
      "name": "Rice",
      "quantity": 5,
      "unit": "kg",
      "price": 500
    }
  ],
  "total_cost": 500
}
```

### Get Market History
```http
GET /market?limit=10&offset=0
Authorization: Bearer <TOKEN>
```

### Approve Market Entry
```http
PATCH /market/{marketId}/approve
Authorization: Bearer <TOKEN>
X-CSRF-Token: <TOKEN>
```

### Lock Market Month
```http
POST /market-lock/lock
Authorization: Bearer <TOKEN>
X-CSRF-Token: <TOKEN>
Content-Type: application/json

{
  "month": 1,
  "year": 2024
}
```

### Check Market Lock Status
```http
GET /market-lock/status?month=1&year=2024
Authorization: Bearer <TOKEN>
```

---

## 💰 Payment Endpoints

### Record Payment
```http
POST /payments
Authorization: Bearer <TOKEN>
X-CSRF-Token: <TOKEN>
Content-Type: application/json

{
  "member_id": "member_uuid",
  "amount": 5000,
  "method": "cash",
  "date": "2024-01-01",
  "reference": "Payment reference"
}
```

### Get Member Payments
```http
GET /payments?member_id=member_uuid&limit=10
Authorization: Bearer <TOKEN>
```

### Get Payment Summary
```http
GET /payments/summary
Authorization: Bearer <TOKEN>
```

---

## 💸 Expense Endpoints

### Create Expense
```http
POST /expenses
Authorization: Bearer <TOKEN>
X-CSRF-Token: <TOKEN>
Content-Type: application/json

{
  "category": "electricity",
  "amount": 2000,
  "date": "2024-01-01",
  "description": "Electricity bill"
}
```

### Get Monthly Expenses
```http
GET /expenses?month=1&year=2024
Authorization: Bearer <TOKEN>
```

### Get Expense by Category
```http
GET /expenses?category=electricity
Authorization: Bearer <TOKEN>
```

---

## 📊 Report Endpoints

### Get Meal Rate Report
```http
GET /reports/meal-rate?month=1&year=2024
Authorization: Bearer <TOKEN>
```

### Get Monthly Bill Report
```http
GET /reports/monthly-bill?month=1&year=2024
Authorization: Bearer <TOKEN>
```

### Export Reports (PDF)
```http
GET /reports/export?format=pdf&type=monthly-bill
Authorization: Bearer <TOKEN>
```

---

## 🔔 Notification Endpoints

### Get All Notifications
```http
GET /notifications?limit=20&offset=0
Authorization: Bearer <TOKEN>
```

### Mark Notification as Read
```http
PATCH /notifications/{notificationId}/read
Authorization: Bearer <TOKEN>
X-CSRF-Token: <TOKEN>
```

### Delete Notification
```http
DELETE /notifications/{notificationId}
Authorization: Bearer <TOKEN>
X-CSRF-Token: <TOKEN>
```

---

## 💾 Backup Endpoints

### Create Backup
```http
POST /backup/create
Authorization: Bearer <TOKEN>
X-CSRF-Token: <TOKEN>
```

### Download Backup
```http
GET /backup/download/{backupId}
Authorization: Bearer <TOKEN>
```

### Restore Backup
```http
POST /backup/restore/{backupId}
Authorization: Bearer <TOKEN>
X-CSRF-Token: <TOKEN>
```

### Get Backup History
```http
GET /backup/history?limit=10&offset=0
Authorization: Bearer <TOKEN>
```

### Get Recycle Bin
```http
GET /backup/recycle-bin
Authorization: Bearer <TOKEN>
```

### Permanently Delete Member
```http
DELETE /backup/recycle-bin/{memberId}
Authorization: Bearer <TOKEN>
X-CSRF-Token: <TOKEN>
```

---

## 📈 Dashboard Endpoints

### Get Dashboard Statistics
```http
GET /dashboard/statistics
Authorization: Bearer <TOKEN>
```

**Response**:
```json
{
  "success": true,
  "data": {
    "total_members": 10,
    "active_members": 8,
    "total_expenses": 50000,
    "total_collection": 45000,
    "due_amount": 5000,
    "today_meals": 24,
    "meal_rate": 625,
    "recent_activities": []
  }
}
```

### Get Recent Activities
```http
GET /dashboard/activities?limit=20
Authorization: Bearer <TOKEN>
```

---

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "message": "Invalid input",
  "error": "Validation failed"
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "message": "Invalid or expired token",
  "error": "Unauthorized"
}
```

### 403 Forbidden
```json
{
  "success": false,
  "message": "You don't have permission to perform this action",
  "error": "Forbidden"
}
```

### 404 Not Found
```json
{
  "success": false,
  "message": "Resource not found",
  "error": "Not Found"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "message": "Internal server error",
  "error": "Server error details"
}
```

---

## Rate Limiting

- **General Limit**: 100 requests per 15 minutes
- **Auth Limit**: 5 requests per 15 minutes
- **Headers**: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

---

## Security Headers

All responses include:
- `X-Frame-Options: SAMEORIGIN` - Prevent clickjacking
- `X-Content-Type-Options: nosniff` - Disable MIME sniffing
- `X-XSS-Protection: 1; mode=block` - Enable XSS protection
- `Content-Security-Policy: ...` - Content security policy
- `Referrer-Policy: strict-origin-when-cross-origin` - Referrer policy

---

## Pagination

For endpoints with pagination:
- **limit**: Number of records to return (default: 10, max: 100)
- **offset**: Number of records to skip (default: 0)

**Response**:
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "limit": 10,
    "offset": 0,
    "total": 50
  }
}
```

---

## Date Formats

- **Date**: `YYYY-MM-DD` (e.g., `2024-01-01`)
- **DateTime**: `YYYY-MM-DDTHH:mm:ss.sssZ` (ISO 8601)

---

## Environment Variables

Required for production deployment:
```env
DATABASE_URL=postgresql://...
JWT_SECRET=your-secret-key
JWT_EXPIRY=7d
NODE_ENV=production
FRONTEND_URL=https://yourfrontend.com
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=app-password
```

---

## Last Updated
January 2024 - v1.0
