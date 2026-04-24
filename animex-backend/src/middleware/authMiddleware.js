const { verifySupabaseToken, db } = require('../config/supabase');
const logger = require('../config/logger');

// ── Verify Supabase auth token ─────────────────────────
// Token comes from: Authorization: Bearer <supabase_access_token>
async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const token = authHeader.split(' ')[1];
    const user  = await verifySupabaseToken(token);

    if (!user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Fetch profile from Supabase (plan, role, banned status)
    const { data: profile, error } = await db()
      .from('profiles')
      .select('id, username, role, plan, plan_expiry, is_banned, ban_reason')
      .eq('id', user.id)
      .single();

    if (error || !profile) {
      return res.status(401).json({ error: 'Profile not found' });
    }

    if (profile.is_banned) {
      return res.status(403).json({ error: 'Account banned', reason: profile.ban_reason });
    }

    // Auto-downgrade expired plans
    if (profile.plan !== 'free' && profile.plan_expiry) {
      if (new Date(profile.plan_expiry) < new Date()) {
        await db().from('profiles').update({ plan: 'free' }).eq('id', user.id);
        profile.plan = 'free';
      }
    }

    req.user    = user;      // Supabase user (id, email)
    req.profile = profile;   // Our profile (plan, role, etc.)
    next();
  } catch (err) {
    logger.error({ err }, 'Auth middleware error');
    return res.status(500).json({ error: 'Server error' });
  }
}

// ── Optional auth — doesn't block unauthenticated ─────
async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) return next();

    const token = authHeader.split(' ')[1];
    const user  = await verifySupabaseToken(token);
    if (!user) return next();

    const { data: profile } = await db()
      .from('profiles')
      .select('id, username, role, plan, plan_expiry, is_banned')
      .eq('id', user.id)
      .single();

    if (profile && !profile.is_banned) {
      req.user    = user;
      req.profile = profile;
    }
    next();
  } catch {
    next();
  }
}

// ── Admin only ─────────────────────────────────────────
function adminOnly(req, res, next) {
  if (!req.profile || req.profile.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

module.exports = { authMiddleware, optionalAuth, adminOnly };
