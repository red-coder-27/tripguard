import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

// Load root or server .env
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

const DEV_DEFAULT_JWT = 'tripguard_super_secret_development_jwt_key_2026_secured';

export const envSchema = z
  .object({
    PORT: z.string().default('5000').transform(Number),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    JWT_SECRET: z.string().default(DEV_DEFAULT_JWT),
    JWT_EXPIRES_IN: z.string().default('7d'),
    CORS_ORIGIN: z.string().default('http://localhost:5173'),
    MONGODB_URI: z.string().optional(),
    GEMINI_API_KEY: z.string().optional(),
    GEMINI_MODEL: z.string().default('gemini-2.5-flash'),
    GEOAPIFY_API_KEY: z.string().optional(),
    OPENWEATHER_API_KEY: z.string().optional(),
    MAPTILER_API_KEY: z.string().optional().or(z.string().optional().default('')),
    SEED_DEMO_USER_EMAIL: z.string().default('demo@tripguard.ai'),
    SEED_DEMO_USER_PASSWORD: z.string().default('TripGuard2026!'),
    ALLOW_VERCEL_PREVIEWS: z.string().default('true'),
    TRUST_PROXY: z.string().default('1'),
  })
  .superRefine((data, ctx) => {
    if (data.NODE_ENV === 'production') {
      // 1. JWT Secret strictness
      if (
        !data.JWT_SECRET ||
        data.JWT_SECRET === DEV_DEFAULT_JWT ||
        data.JWT_SECRET.toLowerCase().includes('development') ||
        data.JWT_SECRET.toLowerCase().includes('dev_key') ||
        data.JWT_SECRET.length < 16
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            'Production requires a secure, non-default JWT_SECRET with at least 16 characters. Development fallback keys are strictly prohibited in production.',
          path: ['JWT_SECRET'],
        });
      }

      // 2. MongoDB URI strictness
      if (!data.MONGODB_URI || data.MONGODB_URI.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Production requires a valid MONGODB_URI pointing to MongoDB Atlas.',
          path: ['MONGODB_URI'],
        });
      } else if (
        !data.MONGODB_URI.startsWith('mongodb://') &&
        !data.MONGODB_URI.startsWith('mongodb+srv://')
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'MONGODB_URI must start with mongodb:// or mongodb+srv://.',
          path: ['MONGODB_URI'],
        });
      }

      // 3. CORS Origin strictness
      if (!data.CORS_ORIGIN || data.CORS_ORIGIN.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Production requires a non-empty CORS_ORIGIN defining allowed production frontend origins.',
          path: ['CORS_ORIGIN'],
        });
      }
    }
  });

export function parseEnv(customEnv?: Record<string, string | undefined>) {
  const result = envSchema.safeParse(customEnv || process.env);
  if (!result.success) {
    console.error('Invalid environment variables:', result.error.format());
    throw new Error('Invalid environment configuration');
  }
  return result.data;
}

export const env = parseEnv();
