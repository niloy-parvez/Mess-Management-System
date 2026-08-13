# Deployment Guide

This guide covers deploying the frontend to Vercel and the backend to Render. It also explains how to run database migrations and seed data on Supabase.

## Frontend (Vercel)
1. Create a Vercel project and connect your GitHub repository.
2. Set environment variables in Vercel:
   - VITE_API_BASE_URL=https://api.yourdomain.com/api
   - VITE_SUPABASE_URL=your-supabase-url
   - VITE_SUPABASE_ANON_KEY=your-anon-key
3. Build & Output Settings: Vite defaults are fine; build command: `npm run build`, output directory: `dist` or `build` depending on framework.
4. Deploy. Vercel will build on each push to the main branch.

## Backend (Render)
1. Create a Web Service on Render and connect to repository.
2. Select Node environment. Set the start command to `npm run start` and build command `npm run build`.
3. Add environment variables:
   - SUPABASE_URL
   - SUPABASE_ANON_KEY
   - SUPABASE_SERVICE_ROLE_KEY (store securely)
   - JWT_SECRET
   - DATABASE_URL (if using an external Postgres)
4. After deployment, run migrations using a one-off deploy hook or run `npm run migrate` on the server (requires service_role key).

## Database (Supabase)
1. Create a Supabase project.
2. In SQL editor, run migrations in order: `001_create_schema.sql`, `002_enable_rls.sql`, `003_seed_data.sql`.
   - Use service_role key when running seeds that reference `auth.users`.
3. Create Storage buckets as documented in database/SUPABASE_SETUP.md.

## CI/CD (GitHub Actions)
- The repository includes `.github/workflows/ci-cd.yml` which builds and tests frontend and backend, and deploys to Vercel and Render on `main` branch. Provide the following secrets in GitHub:
  - VERCEL_TOKEN
  - VERCEL_ORG_ID
  - VERCEL_PROJECT_ID
  - RENDER_API_KEY
  - RENDER_SERVICE_ID

## Running Migrations
- Use the provided migration runner `backend/src/database/migrate.ts` or run SQL files via the Supabase SQL editor.

## Notes & Security
- Never store `SUPABASE_SERVICE_ROLE_KEY` or `JWT_SECRET` in source control or client-side code.
- Ensure RLS policies are enabled and tested with real tokens.
- After deployment, rotate service keys if they were used during setup.

If assistance is needed to configure any of the above providers, provide access details or request step-by-step help.
