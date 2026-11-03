import mongoose from 'mongoose';
import { env } from './env.js';

let inMemoryServer: any = null;

export async function connectDB(): Promise<typeof mongoose> {
  const uri = env.MONGODB_URI;

  if (uri) {
    try {
      console.log(`[Database] Attempting connection to MongoDB at: ${uri}`);
      const conn = await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 3000,
      });
      console.log(`[Database] Successfully connected to MongoDB at ${conn.connection.host}`);
      return conn;
    } catch (err: any) {
      console.warn(`[Database] External MongoDB connection failed (${err.message}). Falling back to embedded in-memory MongoDB.`);
    }
  }

  try {
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    inMemoryServer = await MongoMemoryServer.create();
    const memUri = inMemoryServer.getUri();
    console.log(`[Database] Starting embedded in-memory MongoDB instance at ${memUri}`);
    const conn = await mongoose.connect(memUri);
    console.log('[Database] Connected to embedded in-memory MongoDB successfully.');
    return conn;
  } catch (err: any) {
    console.error('[Database] Critical: Failed to start embedded MongoDB:', err.message);
    throw err;
  }
}

export async function disconnectDB(): Promise<void> {
  await mongoose.disconnect();
  if (inMemoryServer) {
    await inMemoryServer.stop();
  }
}

