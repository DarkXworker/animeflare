const { createClient } = require('@supabase/supabase-js');
const logger = require('./logger');

// ── Admin client (service role — bypasses RLS) ────────
// Used for all server-side DB operations
let adminClient = null;

function getAdminClient() {
  if (adminClient) return adminClient;

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }

  adminClient = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );

  logger.info('Supabase admin client initialized');
  return adminClient;
}

// ── Auth client (anon key — for verifying user JWTs) ──
let anonClient = null;

function getAnonClient() {
  if (anonClient) return anonClient;

  anonClient = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
  return anonClient;
}

// ── Helper: verify Supabase JWT from request ──────────
async function verifySupabaseToken(token) {
  const client = getAnonClient();
  const { data: { user }, error } = await client.auth.getUser(token);
  if (error || !user) return null;
  return user;
}

// ── DB shorthand helpers ───────────────────────────────
function db() {
  return getAdminClient();
}

module.exports = { getAdminClient, getAnonClient, verifySupabaseToken, db };
