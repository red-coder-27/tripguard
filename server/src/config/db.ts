import mongoose from 'mongoose';
import { env } from './env.js';

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

// Global cached connection for serverless function warm execution reuse
declare global {
  // eslint-disable-next-line no-var
  var __mongooseCache: MongooseCache | undefined;
}

let cached: MongooseCache = global.__mongooseCache || { conn: null, promise: null };
if (!global.__mongooseCache) {
  global.__mongooseCache = cached;
}

let inMemoryServer: any = null;

export async function connectDB(uriOverride?: string): Promise<typeof mongoose> {
  // 1. If connection is already open and ready, return it immediately
  if (mongoose.connection.readyState === 1 && cached.conn && !uriOverride) {
    return cached.conn;
  }

  const isProduction = process.env.NODE_ENV === 'production' || env.NODE_ENV === 'production';
  const uri =
    uriOverride ??
    (process.env.NODE_ENV === 'production'
      ? process.env.MONGODB_URI
      : process.env.MONGODB_URI ?? env.MONGODB_URI);

  // 2. Strict production enforcement
  if (isProduction) {
    if (!uri || uri.trim().length === 0) {
      const errMsg = '[Database] Critical: MONGODB_URI environment variable is required in production.';
      console.error(errMsg);
      throw new Error(errMsg);
    }

    if (!cached.promise) {
      const sanitizedHost = uri.includes('@') ? uri.split('@')[1].split('/')[0] : 'configured-cluster';
      console.log(`[Database] Connecting to production MongoDB Atlas at: ${sanitizedHost}`);

      cached.promise = mongoose
        .connect(uri, {
          serverSelectionTimeoutMS: 5000,
          maxPoolSize: 10,
        })
        .then((m) => {
          console.log(`[Database] Successfully established persistent connection to MongoDB Atlas (${m.connection.host})`);
          cached.conn = m;
          return m;
        })
        .catch((err) => {
          cached.promise = null;
          console.error(`[Database] Fatal: Failed to connect to MongoDB Atlas in production: ${err.message}`);
          throw err;
        });
    }

    return cached.promise;
  }

  // 3. Non-production: Attempt configured URI first
  if (uri && env.NODE_ENV !== 'test') {
    try {
      if (!cached.promise) {
        const sanitizedHost = uri.includes('@') ? uri.split('@')[1].split('/')[0] : 'configured-cluster';
        console.log(`[Database] Attempting connection to MongoDB Atlas at: ${sanitizedHost}`);
        cached.promise = mongoose
          .connect(uri, {
            serverSelectionTimeoutMS: 3000,
            maxPoolSize: 10,
          })
          .then((m) => {
            console.log(`[Database] Successfully connected to MongoDB Atlas at ${m.connection.host}`);
            cached.conn = m;
            return m;
          });
      }
      return await cached.promise;
    } catch (err: any) {
      cached.promise = null;
      console.warn(`[Database] MongoDB Atlas connection failed (${err.message}). Falling back to embedded in-memory MongoDB.`);
    }
  }

  // 4. Non-production / Test fallback: mongodb-memory-server
  try {
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    if (!inMemoryServer) {
      inMemoryServer = await MongoMemoryServer.create();
    }
    const memUri = inMemoryServer.getUri();
    console.log(`[Database] Connected to embedded in-memory MongoDB instance.`);
    const conn = await mongoose.connect(memUri);
    cached.conn = conn;
    return conn;
  } catch (err: any) {
    console.error('[Database] Critical: Failed to start embedded MongoDB:', err.message);
    throw err;
  }
}

export async function disconnectDB(): Promise<void> {
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    cached.conn = null;
    cached.promise = null;
    if (inMemoryServer) {
      await inMemoryServer.stop();
      inMemoryServer = null;
    }
  } catch (err) {
    // Ignore teardown errors
  }
}
