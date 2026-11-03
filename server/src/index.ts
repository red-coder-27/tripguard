import { app } from './app.js';
import { env } from './config/env.js';
import { connectDB } from './config/db.js';
import { seedDatabase } from './seed/seedData.js';
import { Trip } from './models/Trip.js';

const PORT = env.PORT;

async function startServer() {
  try {
    await connectDB();

    // Auto-seed demo data ONLY in non-production environments when database is empty
    if (env.NODE_ENV !== 'production' && env.NODE_ENV !== 'test') {
      const tripCount = await Trip.countDocuments();
      if (tripCount === 0) {
        console.log('[TripGuard Server] Non-production database empty - initializing demo seed data...');
        await seedDatabase();
      }
    }

    app.listen(PORT, () => {
      console.log(`[TripGuard Server] Running on http://localhost:${PORT}`);
      console.log(`[TripGuard Server] Health check: http://localhost:${PORT}/api/health`);
      console.log(`[TripGuard Server] Environment: ${env.NODE_ENV}`);
    });
  } catch (err: any) {
    console.error('[TripGuard Server] Fatal startup failure:', err.message);
    process.exit(1);
  }
}

startServer();
