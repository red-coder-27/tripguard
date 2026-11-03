import { app } from '../server/src/app.js';
import { connectDB } from '../server/src/config/db.js';

/**
 * Vercel Serverless Function entry point.
 * Ensures the persistent MongoDB connection is warm before delegating
 * incoming requests to the TripGuard Express application.
 */
export default async function handler(req: any, res: any) {
  try {
    await connectDB();
    return app(req, res);
  } catch (err: any) {
    console.error('[Vercel Serverless Function] Unhandled entry point error:', err);
    return res.status(500).json({
      success: false,
      error: 'Server initialization failure. Check database connection and environment configuration.',
    });
  }
}

