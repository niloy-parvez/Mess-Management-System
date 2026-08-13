#!/usr/bin/env node

/**
 * Database Migration Runner
 * Mess Management System v1.1.0
 * 
 * This utility helps manage database migrations for the Mess Management System.
 * 
 * Usage:
 *   node db-migrate.js <command> [options]
 * 
 * Commands:
 *   up              Apply all pending migrations
 *   down            Rollback last migration
 *   create          Create new migration file
 *   list            List all migrations
 *   reset           Reset database (DESTRUCTIVE)
 *   status          Check migration status
 *   verify          Verify database schema
 */

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');
const { Client } = require('pg');

// Load environment variables from backend .env if present
dotenv.config({ path: path.resolve(__dirname, '../backend/.env') });

// Configuration
const MIGRATIONS_DIR = path.join(__dirname, 'migrations');
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DATABASE_URL =
  process.env.DATABASE_URL ||
  process.env.DB_URL ||
  process.env.PG_DATABASE_URL ||
  process.env.SUPABASE_DB_URL ||
  process.env.SUPABASE_DATABASE_URL;

// Initialize Supabase client when Supabase credentials are available
const supabase = SUPABASE_URL && SUPABASE_KEY ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;

// Helper functions
async function executeSqlWithPg(sql) {
  const client = new Client({ connectionString: DATABASE_URL });
  try {
    await client.connect();
    await client.query(sql);
    await client.end();
    return true;
  } catch (error) {
    await client.end().catch(() => {});
    throw error;
  }
}

async function executePgQuery(query, params = []) {
  const client = new Client({ connectionString: DATABASE_URL });
  try {
    await client.connect();
    const result = await client.query(query, params);
    await client.end();
    return result;
  } catch (error) {
    await client.end().catch(() => {});
    throw error;
  }
}

async function runMigration(filename) {
  try {
    const filepath = path.join(MIGRATIONS_DIR, filename);
    const sql = fs.readFileSync(filepath, 'utf-8');
    
    console.log(`▶ Running migration: ${filename}`);

    if (DATABASE_URL) {
      await executeSqlWithPg(sql);
    } else if (supabase) {
      const { data, error } = await supabase.rpc('exec_sql', { sql });
      if (error) {
        throw error;
      }
    } else {
      throw new Error(
        'Database configuration is missing. Set DATABASE_URL or provide SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.'
      );
    }
    
    console.log(`✓ Migration completed: ${filename}`);
    
    // Log migration
    await logMigration(filename, 'up', true);
    return true;
  } catch (error) {
    console.error(`✗ Error running migration: ${error.message}`);
    await logMigration(filename, 'up', false, error.message);
    return false;
  }
}

async function logMigration(name, direction, success, error = null) {
  const payload = {
    name,
    direction,
    success,
    error_message: error,
    executed_at: new Date().toISOString(),
  };

  try {
    if (supabase) {
      const { error: logError } = await supabase.from('migration_logs').insert(payload);
      if (logError) {
        throw logError;
      }
      return;
    }

    if (DATABASE_URL) {
      const client = new Client({ connectionString: DATABASE_URL });
      await client.connect();
      await client.query(
        'INSERT INTO public.migration_logs(name, direction, success, error_message, executed_at) VALUES($1, $2, $3, $4, $5)',
        [payload.name, payload.direction, payload.success, payload.error_message, payload.executed_at]
      );
      await client.end();
      return;
    }

    console.warn('Skipping migration log: no database client available.');
  } catch (e) {
    console.error('Error logging migration:', e.message || e);
  }
}

async function getMigrationStatus() {
  try {
    const files = fs.readdirSync(MIGRATIONS_DIR)
      .filter(f => f.endsWith('.sql'))
      .sort();

    let executed = new Set();

    if (supabase) {
      const { data: logs, error } = await supabase
        .from('migration_logs')
        .select('name, direction')
        .eq('direction', 'up')
        .eq('success', true);
      if (error) {
        const message = String(error.message || error).toLowerCase();
        if (message.includes("could not find the table 'public.migration_logs'") || message.includes('pgrst205')) {
          executed = new Set();
        } else {
          throw error;
        }
      } else {
        executed = new Set(logs?.map((l) => l.name) || []);
      }
    } else if (DATABASE_URL) {
      const result = await executePgQuery(
        'SELECT name FROM public.migration_logs WHERE direction = $1 AND success = TRUE',
        ['up']
      );
      executed = new Set(result.rows.map((row) => row.name));
    }

    console.log('\n📊 Migration Status:\n');
    console.log('Migration File'.padEnd(30) + 'Status');
    console.log('-'.repeat(50));

    files.forEach((file) => {
      const status = executed.has(file) ? '✓ Executed' : '○ Pending';
      console.log(file.padEnd(30) + status);
    });

    console.log('\n');
  } catch (error) {
    console.error('Error getting migration status:', error.message);
  }
}

async function verifySchema() {
  try {
    console.log('\n🔍 Verifying database schema:\n');

    if (supabase) {
      const { data: tables } = await supabase.rpc('get_tables');
      console.log(`✓ Tables: ${tables?.length || 0}`);

      const { data: indexes } = await supabase.rpc('get_indexes');
      console.log(`✓ Indexes: ${indexes?.length || 0}`);

      const { data: functions } = await supabase.rpc('get_functions');
      console.log(`✓ Functions: ${functions?.length || 0}`);

      const { data: triggers } = await supabase.rpc('get_triggers');
      console.log(`✓ Triggers: ${triggers?.length || 0}`);

      const { data: policies } = await supabase.rpc('get_rls_policies');
      console.log(`✓ RLS Policies: ${policies?.length || 0}`);
    } else if (DATABASE_URL) {
      const tables = await executePgQuery(
        `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`
      );
      console.log(`✓ Tables: ${tables.rowCount}`);

      const indexes = await executePgQuery(
        `SELECT indexname FROM pg_indexes WHERE schemaname = 'public'`
      );
      console.log(`✓ Indexes: ${indexes.rowCount}`);

      const functions = await executePgQuery(
        `SELECT proname FROM pg_proc WHERE pronamespace = 'public'::regnamespace`
      );
      console.log(`✓ Functions: ${functions.rowCount}`);

      const triggers = await executePgQuery(
        `SELECT tgname FROM pg_trigger WHERE tgnamespace = 'public'::regnamespace AND NOT tgisinternal`
      );
      console.log(`✓ Triggers: ${triggers.rowCount}`);

      const policies = await executePgQuery(
        `SELECT polname FROM pg_policy WHERE polschema = 'public'`);
      console.log(`✓ RLS Policies: ${policies.rowCount}`);
    } else {
      throw new Error('No available database connection for schema verification.');
    }

    console.log('\n✓ Schema verification complete!\n');
  } catch (error) {
    console.error('Error verifying schema:', error.message);
  }
}

async function listMigrations() {
  try {
    const files = fs.readdirSync(MIGRATIONS_DIR)
      .filter(f => f.endsWith('.sql'))
      .sort();
    
    console.log('\n📁 Available Migrations:\n');
    files.forEach((file, index) => {
      console.log(`${index + 1}. ${file}`);
    });
    console.log('\n');
  } catch (error) {
    console.error('Error listing migrations:', error.message);
  }
}

async function createMigration(name) {
  try {
    const timestamp = new Date().toISOString().replace(/[:-]/g, '').split('.')[0];
    const filename = `${timestamp}_${name}.sql`;
    const filepath = path.join(MIGRATIONS_DIR, filename);
    
    const template = `-- ============================================================================
-- Migration: ${name}
-- Created: ${new Date().toISOString()}
-- ============================================================================

-- Add your SQL statements below:

-- ============================================================================
-- End of migration
-- ============================================================================
`;
    
    fs.writeFileSync(filepath, template);
    console.log(`✓ Migration created: ${filename}`);
  } catch (error) {
    console.error('Error creating migration:', error.message);
  }
}

async function applyAllMigrations() {
  try {
    const files = fs.readdirSync(MIGRATIONS_DIR)
      .filter(f => f.endsWith('.sql'))
      .sort();
    
    console.log(`\n⏳ Applying ${files.length} migrations...\n`);
    
    let success = 0;
    let failed = 0;
    
    for (const file of files) {
      const result = await runMigration(file);
      result ? success++ : failed++;
    }
    
    console.log(`\n📊 Results: ${success} succeeded, ${failed} failed\n`);
    
    if (failed === 0) {
      console.log('✓ All migrations applied successfully!\n');
    }
  } catch (error) {
    console.error('Error applying migrations:', error.message);
  }
}

async function resetDatabase() {
  try {
    console.log('\n⚠️  WARNING: This will drop all tables and reset the database!');
    console.log('This action cannot be undone.\n');
    
    // In production, you would prompt for confirmation here
    // For now, we'll just show the warning
    console.log('To reset the database, use: supabase db reset\n');
  } catch (error) {
    console.error('Error resetting database:', error.message);
  }
}

// Main command handler
async function main() {
  const command = process.argv[2];
  const args = process.argv.slice(3);
  
  switch (command) {
    case 'up':
      await applyAllMigrations();
      break;
    case 'list':
      await listMigrations();
      break;
    case 'create':
      if (!args[0]) {
        console.error('Error: Migration name required');
        console.log('Usage: node db-migrate.js create <name>');
        process.exit(1);
      }
      await createMigration(args[0]);
      break;
    case 'status':
      await getMigrationStatus();
      break;
    case 'verify':
      await verifySchema();
      break;
    case 'reset':
      await resetDatabase();
      break;
    default:
      console.log(`
Database Migration Tool - Mess Management System v1.1.0

Usage: node db-migrate.js <command> [options]

Commands:
  up          Apply all pending migrations
  down        Rollback last migration (not yet implemented)
  create      Create new migration file
  list        List all available migrations
  status      Check migration execution status
  verify      Verify database schema and tables
  reset       Reset database (DESTRUCTIVE)

Examples:
  node db-migrate.js up
  node db-migrate.js create add_new_table
  node db-migrate.js status
  node db-migrate.js verify

Environment Variables Required:
  SUPABASE_URL              Your Supabase project URL
  SUPABASE_SERVICE_ROLE_KEY Your Supabase service role key

For more information, see INSTALLATION_GUIDE.md
      `);
      break;
  }
}

// Error handling
process.on('unhandledRejection', (error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});

// Run
main().catch(console.error);
