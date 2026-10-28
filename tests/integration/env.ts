// Vitest setup: load .env.local so tests can reach the local Supabase.
try {
  process.loadEnvFile('.env.local');
} catch {
  /* env may already be set */
}
