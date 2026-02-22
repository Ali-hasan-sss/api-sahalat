/**
 * Server entry point.
 * Connects to DB and starts HTTP server.
 */

import app from './app.js';
import { config } from './config/index.js';
import { prisma } from './utils/prisma.js';

const PORT = config.PORT;

async function main() {
  try {
    await prisma.$connect();
    console.log('✅ Database connected');
  } catch (e) {
    console.error('❌ Database connection failed:', e);
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});
