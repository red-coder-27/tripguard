import app from './app.js';
import { env } from './config/env.js';
import { connectDB } from './config/db.js';
import { Trip } from './models/Trip.js';
import { seedDatabase } from './seed/seedData.js';

async function bootstrap() {
  try {
    await connectDB();

    // Check if database is empty; if so, automatically seed the demonstration scenario
    const tripCount = await Trip.countDocuments();
    if (tripCount === 0) {
      console.log('[Bootstrap] No existing trips found. Running automated seed for demo scenario...');
      await seedDatabase();
    }

    app.listen(env.PORT, () => {
      console.log(`[TripGuard Server] Running on http://localhost:${env.PORT}`);
      console.log(`[TripGuard Server] Health check: http://localhost:${env.PORT}/api/health`);
    });
  } catch (err: any) {
    console.error('[Bootstrap] Failed to start TripGuard server:', err.message);
    process.exit(1);
  }
}

bootstrap();

