require('dotenv').config();

const app    = require('./app');
const logger = require('./config/logger');
const { getAdminClient } = require('./config/supabase');

const PORT = process.env.PORT || 4000;

async function start() {
  try {
    // Test Supabase connection
    const sb = getAdminClient();
    const { error } = await sb.from('profiles').select('id').limit(1);
    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows, which is fine
      throw new Error(`Supabase connection failed: ${error.message}`);
    }
    logger.info('✅ Supabase connected');

    // Start server
    app.listen(PORT, '0.0.0.0', () => {
      logger.info(`🚀 AnimeX backend running on port ${PORT}`);
      logger.info(`   Env: ${process.env.NODE_ENV}`);
      logger.info(`   CORS: ${[process.env.FRONTEND_URL, process.env.FRONTEND_URL_DEV].filter(Boolean).join(', ')}`);
    });
  } catch (err) {
    logger.error({ err }, '❌ Failed to start server');
    process.exit(1);
  }
}

process.on('unhandledRejection', (reason) => {
  logger.error({ reason }, 'Unhandled promise rejection');
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM received — shutting down gracefully');
  process.exit(0);
});

start();
