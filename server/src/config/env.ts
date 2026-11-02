import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

// Load root or server .env
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

const envSchema = z.object({
  PORT: z.string().default('5000').transform(Number),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  JWT_SECRET: z.string().default('tripguard_super_secret_development_jwt_key_2026_secured'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  MONGODB_URI: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  SEED_DEMO_USER_EMAIL: z.string().default('demo@tripguard.ai'),
  SEED_DEMO_USER_PASSWORD: z.string().default('TripGuard2026!'),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('Invalid environment variables:', parsedEnv.error.format());
  throw new Error('Invalid environment configuration');
}

export const env = parsedEnv.data;
