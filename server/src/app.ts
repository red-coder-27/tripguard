import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { env } from './config/env.js';
import { connectDB } from './config/db.js';
import { errorHandler } from './middleware/errorHandler.js';

import authRoutes from './routes/auth.routes.js';
import tripRoutes from './routes/trip.routes.js';
import itineraryRoutes from './routes/itinerary.routes.js';
import expenseRoutes from './routes/expense.routes.js';
import bookingRoutes from './routes/booking.routes.js';
import forecastRoutes from './routes/forecast.routes.js';
import recoveryRoutes from './routes/recovery.routes.js';
import ledgerRoutes from './routes/ledger.routes.js';
import simulatorRoutes from './routes/simulator.routes.js';
import analyticsRoutes from './routes/analytics.routes.js';
import copilotRoutes from './routes/copilot.routes.js';
import geospatialRoutes from './routes/geospatial.routes.js';
import disruptionRoutes from './routes/disruption.routes.js';
import travelerToolsRoutes from './routes/travelerTools.routes.js';
import integrationDiagnosticsRoutes from './routes/integrationDiagnostics.routes.js';

const app = express();

// Security Headers
app.use(helmet());

// CORS configuration
const allowedOrigins = env.CORS_ORIGIN.split(',').map((o) => o.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile clients, server-to-server, curl)
      if (!origin) return callback(null, true);

      // In development or test, allow any localhost or 127.0.0.1 port
      if (env.NODE_ENV !== 'production') {
        if (
          origin.startsWith('http://localhost') ||
          origin.startsWith('http://127.0.0.1') ||
          allowedOrigins.includes(origin)
        ) {
          return callback(null, true);
        }
      }

      // Check explicit allowed origins
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      // Allow Vercel preview URLs if enabled (strictly restricted to TripGuard deployments)
      if (
        env.ALLOW_VERCEL_PREVIEWS === 'true' &&
        /^https:\/\/tripguard(-[a-zA-Z0-9]+)*\.vercel\.app$/.test(origin)
      ) {
        return callback(null, true);
      }

      // Reject unauthorized origins explicitly
      return callback(new Error('CORS origin unauthorized by TripGuard security policy'));
    },
    credentials: true,
  })
);

// Serverless-safe Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Max 1000 requests per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Body Parsing
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'TripGuard Adaptive Intelligence API',
    version: '1.0.0',
    environment: env.NODE_ENV,
  });
});

// Database Connection Middleware for Serverless Service Execution
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err: any) {
    console.error('[TripGuard Server] Database connection error in request pipeline:', err.message);
    res.status(500).json({
      success: false,
      error: 'Database connection failed. Please verify MongoDB cluster connectivity.',
    });
  }
});

// REST API Route Mounts
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/trips', tripRoutes);
app.use('/api/v1/itineraries', itineraryRoutes);
app.use('/api/v1/expenses', expenseRoutes);
app.use('/api/v1/bookings', bookingRoutes);
app.use('/api/v1/forecast', forecastRoutes);
app.use('/api/v1/recovery', recoveryRoutes);
app.use('/api/v1/ledger', ledgerRoutes);
app.use('/api/v1/simulator', simulatorRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/copilot', copilotRoutes);
app.use('/api/v1/geo', geospatialRoutes);
app.use('/api/v1/disruptions', disruptionRoutes);
app.use('/api/v1/traveler-tools', travelerToolsRoutes);
app.use('/api', integrationDiagnosticsRoutes);

// Centralized Error Handling
app.use(errorHandler);

export { app };
export default app;
