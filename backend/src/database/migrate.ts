import fs from 'fs';
import path from 'path';
import { Client } from 'pg';
import dotenv from 'dotenv';

// Load backend .env so SUPABASE keys are available when running from backend context
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function run() {
  const databaseUrl = process.env.DATABASE_URL;
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const migrationsDir = path.resolve(__dirname, '../../../database/migrations');
  if (!fs.existsSync(migrationsDir)) {
    console.error('Migrations directory not found at', migrationsDir);
    process.exit(3);
  }

  const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();
  if (files.length === 0) {
    console.log('No SQL migration files found.');
    return;
  }

  if (databaseUrl) {
    // Prefer direct DB connection for migrations
    const client = new Client({ connectionString: databaseUrl });
    await client.connect();

    try {
      for (const file of files) {
        const filePath = path.join(migrationsDir, file);
        console.log('\n=== Applying migration:', file, '===');
        const sql = fs.readFileSync(filePath, 'utf8');

        try {
          await client.query('BEGIN');
          await client.query(sql);
          await client.query('COMMIT');
          console.log('Applied:', file);
        } catch (err) {
          await client.query('ROLLBACK');
          console.error('Failed to apply migration', file, 'error:', err instanceof Error ? err.message : err);
          throw err;
        }
      }
    } finally {
      await client.end();
    }
  } else if (supabaseUrl && supabaseKey) {
    // Fallback to Supabase RPC exec_sql function
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, supabaseKey);

    for (const file of files) {
      const filePath = path.join(migrationsDir, file);
      console.log('\n=== Applying migration via Supabase RPC:', file, '===');
      const sql = fs.readFileSync(filePath, 'utf8');

      try {
        const { data, error } = await supabase.rpc('exec_sql', { sql });
        if (error) {
          console.error('Supabase exec_sql error for', file, error);
          throw error;
        }
        console.log('Applied via RPC:', file, data ? 'OK' : 'No response');
      } catch (err) {
        console.error('Failed to apply migration via Supabase RPC', file, err instanceof Error ? err.message : err);
        throw err;
      }
    }
  } else {
    console.error('No DATABASE_URL or SUPABASE_SERVICE_ROLE_KEY available. Set one of them in backend/.env to run migrations.');
    process.exit(2);
  }
}

run().catch(err => {
  console.error('Migration runner failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
