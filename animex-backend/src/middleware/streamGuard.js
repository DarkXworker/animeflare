const { getActiveStreamCount, MAX_STREAMS } = require('../config/redis');

async function streamGuard(req, res, next) {
  try {
    const count = await getActiveStreamCount(req.user.id);
    if (count >= MAX_STREAMS) {
      return res.status(429).json({
        error: 'Maximum concurrent streams reached',
        code: 'MAX_STREAMS',
        message: `You are already streaming on ${MAX_STREAMS} devices. Stop one to continue.`,
        activeStreams: count,
      });
    }
    next();
  } catch {
    next(); // Don't block on Redis failure
  }
}

module.exports = { streamGuard };
