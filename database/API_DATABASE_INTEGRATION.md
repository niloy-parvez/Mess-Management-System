# API Database Integration Guide
## Mess Management System v1.1.0

Complete guide for integrating the database with backend APIs.

## Table of Contents

1. [Overview](#overview)
2. [Supabase Client Setup](#supabase-client-setup)
3. [Authentication Integration](#authentication-integration)
4. [CRUD Operations](#crud-operations)
5. [RLS & Security](#rls--security)
6. [Query Optimization](#query-optimization)
7. [Common Patterns](#common-patterns)
8. [Error Handling](#error-handling)

## Overview

The Mess Management System uses Supabase PostgreSQL with Row Level Security (RLS) for data protection. All API endpoints must:

1. Authenticate users via Supabase Auth
2. Pass JWT tokens to database
3. Respect RLS policies automatically
4. Handle async/await properly
5. Implement proper error handling

## Supabase Client Setup

### Initialize Client

Create `backend/src/services/supabase.ts`:

```typescript
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Service client (for admin operations)
export const supabaseAdmin = createClient<Database>(
  supabaseUrl,
  supabaseKey,
  {
    db: { schema: 'public' }
  }
);

// User client (respects RLS - use when you have JWT)
export const createUserClient = (jwtToken: string) => {
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY!;
  const client = createClient<Database>(supabaseUrl, anonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${jwtToken}`
      }
    }
  });
  return client;
};

export const supabase = supabaseAdmin;
```

### TypeScript Types

Create `backend/src/types/database.ts` (auto-generated from Supabase):

```typescript
export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          name: string | null;
          phone: string | null;
          avatar_url: string | null;
          role: 'admin' | 'member';
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['users']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['users']['Row']>;
      };
      members: {
        Row: {
          id: string;
          user_id: string;
          join_date: string;
          leave_date: string | null;
          room_number: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['members']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['members']['Row']>;
      };
      meals: {
        Row: {
          id: string;
          member_id: string;
          meal_date: string;
          meal_type: 'breakfast' | 'lunch' | 'dinner';
          quantity: number;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['meals']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['meals']['Row']>;
      };
      // ... more tables
    };
    Enums: {
      user_role: 'admin' | 'member';
      meal_type: 'breakfast' | 'lunch' | 'dinner';
      // ... more enums
    };
  };
};
```

## Authentication Integration

### Verify JWT Token

```typescript
import { createUserClient } from './supabase';
import type { Request, Response, NextFunction } from 'express';

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'Missing token' });
    }

    const userClient = createUserClient(token);
    
    // Verify token by getting current user
    const { data: { user }, error } = await userClient.auth.getUser();
    
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Attach user to request
    req.user = user;
    req.userClient = userClient;
    
    next();
  } catch (error) {
    res.status(401).json({ error: 'Authentication failed' });
  }
};
```

### Login Endpoint

```typescript
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return res.status(401).json({ error: error.message });
    }

    res.json({
      user: data.user,
      session: data.session,
    });
  } catch (error) {
    res.status(500).json({ error: 'Login failed' });
  }
};
```

### Signup Endpoint

```typescript
export const signup = async (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body;

    // Create auth user
    const { data: authData, error: authError } = 
      await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: false,
      });

    if (authError) {
      return res.status(400).json({ error: authError.message });
    }

    // Create user record in database
    const { data: userData, error: dbError } = 
      await supabase
        .from('users')
        .insert({
          id: authData.user!.id,
          email,
          name,
          role: 'member',
        })
        .select()
        .single();

    if (dbError) {
      return res.status(400).json({ error: dbError.message });
    }

    res.json({ user: userData });
  } catch (error) {
    res.status(500).json({ error: 'Signup failed' });
  }
};
```

## CRUD Operations

### Create (INSERT)

```typescript
export const createMeal = async (
  memberId: string,
  data: MealCreateData,
  userClient: SupabaseClient
) => {
  const { data: meal, error } = await userClient
    .from('meals')
    .insert({
      member_id: memberId,
      meal_date: data.mealDate,
      meal_type: data.mealType,
      quantity: data.quantity,
      notes: data.notes,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create meal: ${error.message}`);
  
  return meal;
};

// Using in endpoint
app.post('/api/meals', authMiddleware, async (req, res) => {
  try {
    const meal = await createMeal(
      req.body.memberId,
      req.body,
      req.userClient
    );
    res.json(meal);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### Read (SELECT)

```typescript
// Get single meal
export const getMeal = async (id: string, userClient: SupabaseClient) => {
  const { data, error } = await userClient
    .from('meals')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw new Error(`Failed to get meal: ${error.message}`);
  return data;
};

// Get all meals with filters
export const getMeals = async (
  filters: {
    memberId?: string;
    mealDate?: string;
    mealType?: string;
    limit?: number;
    offset?: number;
  },
  userClient: SupabaseClient
) => {
  let query = userClient
    .from('meals')
    .select('*', { count: 'exact' });

  if (filters.memberId) {
    query = query.eq('member_id', filters.memberId);
  }
  if (filters.mealDate) {
    query = query.eq('meal_date', filters.mealDate);
  }
  if (filters.mealType) {
    query = query.eq('meal_type', filters.mealType);
  }

  query = query.order('meal_date', { ascending: false });
  
  if (filters.limit) {
    query = query.limit(filters.limit);
  }
  if (filters.offset) {
    query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);
  }

  const { data, error, count } = await query;

  if (error) throw new Error(`Failed to get meals: ${error.message}`);
  
  return { data, count };
};

// Using in endpoint
app.get('/api/meals', authMiddleware, async (req, res) => {
  try {
    const { data, count } = await getMeals(
      {
        memberId: req.query.memberId as string,
        mealDate: req.query.date as string,
        limit: 20,
        offset: parseInt(req.query.page || '0') * 20,
      },
      req.userClient
    );
    
    res.json({
      data,
      pagination: {
        total: count,
        page: parseInt(req.query.page || '0'),
        pageSize: 20,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### Update (UPDATE)

```typescript
export const updateMeal = async (
  id: string,
  data: Partial<MealRow>,
  userClient: SupabaseClient
) => {
  const { data: meal, error } = await userClient
    .from('meals')
    .update(data)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(`Failed to update meal: ${error.message}`);
  
  return meal;
};

// Using in endpoint
app.patch('/api/meals/:id', authMiddleware, async (req, res) => {
  try {
    const meal = await updateMeal(
      req.params.id,
      req.body,
      req.userClient
    );
    res.json(meal);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### Delete (UPDATE is_active = false for soft delete)

```typescript
export const deleteMeal = async (
  id: string,
  userClient: SupabaseClient
) => {
  // Soft delete - mark as inactive
  const { data: meal, error } = await userClient
    .from('meals')
    .update({ is_active: false })
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(`Failed to delete meal: ${error.message}`);
  
  return meal;
};

// Or hard delete for admin only
export const hardDeleteMeal = async (
  id: string,
  userClient: SupabaseClient
) => {
  const { error } = await userClient
    .from('meals')
    .delete()
    .eq('id', id);

  if (error) throw new Error(`Failed to delete meal: ${error.message}`);
};
```

## RLS & Security

### Understanding RLS

All queries automatically respect RLS policies. Users cannot bypass them:

```typescript
// User can only see their own meals (enforced by RLS)
const { data: meals } = await userClient
  .from('meals')
  .select('*');

// Returns only meals where current user is the member or admin
// RLS policy prevents access to other users' meals

// Admin can see all meals
const { data: allMeals } = await supabaseAdmin
  .from('meals')
  .select('*');
```

### Check User Role

```typescript
export const isAdmin = async (userId: string) => {
  const { data, error } = await supabase
    .from('users')
    .select('role')
    .eq('id', userId)
    .single();

  if (error) return false;
  return data?.role === 'admin';
};

// Use in endpoints
app.delete('/api/members/:id', authMiddleware, async (req, res) => {
  try {
    const isUserAdmin = await isAdmin(req.user!.id);
    
    if (!isUserAdmin) {
      return res.status(403).json({ error: 'Admin only' });
    }

    // Admin can delete member
    await deleteMember(req.params.id, req.userClient);
    res.json({ message: 'Member deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

## Query Optimization

### Use Indexes

Database has 60+ indexes for common queries:

```typescript
// Fast: indexed on meal_date, member_id
const { data } = await userClient
  .from('meals')
  .select('*')
  .eq('member_id', memberId)
  .eq('meal_date', '2024-01-01');

// Fast: indexed on user_id
const { data } = await userClient
  .from('members')
  .select('*')
  .eq('user_id', userId);

// Fast: indexed on payment_date
const { data } = await userClient
  .from('payments')
  .select('*')
  .gte('payment_date', startDate)
  .lte('payment_date', endDate);
```

### Pagination

Always paginate for large datasets:

```typescript
const PAGE_SIZE = 20;

export const getMealsPage = async (
  page: number,
  userClient: SupabaseClient
) => {
  const start = page * PAGE_SIZE;
  const end = start + PAGE_SIZE - 1;

  const { data, count, error } = await userClient
    .from('meals')
    .select('*', { count: 'exact' })
    .order('meal_date', { ascending: false })
    .range(start, end);

  if (error) throw error;

  return {
    data,
    page,
    pageSize: PAGE_SIZE,
    total: count || 0,
    totalPages: Math.ceil((count || 0) / PAGE_SIZE),
  };
};
```

### Limit Joins

```typescript
// Good: limit returned columns
const { data } = await userClient
  .from('meals')
  .select(`
    id,
    meal_date,
    member_id,
    members(user_id, name)
  `)
  .limit(20);

// Bad: fetching all columns
const { data } = await userClient
  .from('meals')
  .select('*, members(*)')
  .limit(20);
```

## Common Patterns

### Batch Operations

```typescript
export const createMealsForMonth = async (
  memberId: string,
  mealRecords: MealRecord[],
  userClient: SupabaseClient
) => {
  const { data, error } = await userClient
    .from('meals')
    .insert(
      mealRecords.map(record => ({
        member_id: memberId,
        meal_date: record.date,
        meal_type: record.type,
        quantity: record.quantity,
      }))
    )
    .select();

  if (error) throw error;
  return data;
};
```

### Transaction-like Operations

```typescript
export const createPaymentWithBillUpdate = async (
  billId: string,
  paymentAmount: number,
  userClient: SupabaseClient
) => {
  try {
    // Create payment
    const { data: payment } = await userClient
      .from('payments')
      .insert({
        bill_id: billId,
        amount: paymentAmount,
        payment_date: new Date().toISOString().split('T')[0],
      })
      .select()
      .single();

    // Update bill (due_amount updated automatically via GENERATED column)
    const { data: bill } = await userClient
      .from('monthly_bills')
      .update({ paid_amount: paymentAmount })
      .eq('id', billId)
      .select()
      .single();

    return { payment, bill };
  } catch (error) {
    throw new Error(`Payment creation failed: ${error.message}`);
  }
};
```

### Search Operations

```typescript
export const searchMembers = async (
  query: string,
  userClient: SupabaseClient
) => {
  const { data, error } = await userClient
    .from('members')
    .select(`
      id,
      users(name, email)
    `)
    .or(
      `users.name.ilike.%${query}%,` +
      `users.email.ilike.%${query}%`
    );

  if (error) throw error;
  return data;
};
```

## Error Handling

### Structured Error Handling

```typescript
export class DatabaseError extends Error {
  constructor(
    public code: string,
    public status: number,
    message: string
  ) {
    super(message);
    this.name = 'DatabaseError';
  }
}

export const handleSupabaseError = (error: any): DatabaseError => {
  if (error.code === 'PGRST116') {
    return new DatabaseError('NOT_FOUND', 404, 'Record not found');
  }
  if (error.code === 'PGRST204') {
    return new DatabaseError('NO_ROWS', 204, 'No rows returned');
  }
  if (error.code === 'PGRST301') {
    return new DatabaseError('FORBIDDEN', 403, error.message);
  }
  if (error.message?.includes('duplicate key')) {
    return new DatabaseError('DUPLICATE', 400, 'Record already exists');
  }
  
  return new DatabaseError(
    error.code || 'UNKNOWN',
    500,
    error.message || 'Database error'
  );
};

// Use in endpoints
app.post('/api/meals', authMiddleware, async (req, res) => {
  try {
    const meal = await createMeal(
      req.body.memberId,
      req.body,
      req.userClient
    );
    res.json(meal);
  } catch (error: any) {
    const dbError = handleSupabaseError(error);
    res.status(dbError.status).json({
      error: dbError.message,
      code: dbError.code,
    });
  }
});
```

### Logging

```typescript
import pino from 'pino';

const logger = pino();

export const createMealWithLogging = async (
  memberId: string,
  data: MealCreateData,
  userClient: SupabaseClient,
  userId: string
) => {
  const startTime = Date.now();
  
  try {
    logger.info({
      action: 'CREATE_MEAL',
      memberId,
      userId,
    });

    const meal = await createMeal(memberId, data, userClient);

    logger.info({
      action: 'CREATE_MEAL_SUCCESS',
      mealId: meal.id,
      duration: Date.now() - startTime,
    });

    return meal;
  } catch (error) {
    logger.error({
      action: 'CREATE_MEAL_FAILED',
      error: error.message,
      memberId,
      userId,
      duration: Date.now() - startTime,
    });
    throw error;
  }
};
```

## Next Steps

1. Set up Supabase client in your backend
2. Implement authentication endpoints
3. Create database service layer
4. Add TypeScript types for all tables
5. Implement error handling
6. Set up logging
7. Write tests for database operations
8. Deploy to production

## Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Project Database Schema](./DATABASE_SCHEMA.md)
