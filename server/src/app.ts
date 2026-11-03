import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { env } from './config/env.js';
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

const app = express();

// Security Headers
app.use(helmet());

// CORS configuration
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or dev tools)
      if (!origin) return callback(null, true);
      // Allow localhost or configured origin
      if (origin.startsWith('http://localhost') || origin === env.CORS_ORIGIN) {
        return callback(null, true);
      }
      return callback(null, true); // Dev-friendly permissive
    },
    credentials: true,
  })
);

// Rate Limiting
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
  });
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

// Centralized Error Handling
app.use(errorHandler);

export default app;

