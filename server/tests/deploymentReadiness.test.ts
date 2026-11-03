import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import cors from 'cors';
import { app } from '../src/app.js';
import { env, parseEnv, envSchema } from '../src/config/env.js';
import { connectDB, disconnectDB } from '../src/config/db.js';

describe('TripGuard Production & Vercel Deployment Readiness Suite', () => {
  // 1. Express App Standalone Importability
  it('Criterion 6: Express app can be imported as a standalone module without listening on a persistent socket', () => {
    expect(app).toBeDefined();
    expect(typeof app).toBe('function');
    expect(typeof (app as any).use).toBe('function');
    expect(typeof (app as any).listen).toBe('function');
  });

  // 2. API Health Endpoint Verification
  it('Criterion 8: API health endpoint returns healthy status and service metadata', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
    expect(res.body.service).toBe('TripGuard Adaptive Intelligence API');
    expect(res.body.version).toBe('1.0.0');
    expect(res.body.timestamp).toBeDefined();
  });

  // 3. Strict Production Environment Schema Validation
  describe('Criteria 1 & 2: Production Environment Enforcement', () => {
    const baseValidProd = {
      NODE_ENV: 'production',
      PORT: '5000',
      JWT_SECRET: 'production_super_strong_secret_key_9999_verified',
      MONGODB_URI: 'mongodb+srv://produser:ProdPass123!@cluster0.mongodb.net/tripguard_prod',
      CORS_ORIGIN: 'https://tripguard.vercel.app',
    };

    it('Criterion 1: Production refuses to start without a secure JWT_SECRET', () => {
      // Missing JWT_SECRET
      expect(() => {
        parseEnv({
          ...baseValidProd,
          JWT_SECRET: '',
        });
      }).toThrow();

      // Development fallback JWT key rejected in production
      expect(() => {
        parseEnv({
          ...baseValidProd,
          JWT_SECRET: 'tripguard_super_secret_development_jwt_key_2026_secured',
        });
      }).toThrow();

      // Short JWT key (< 16 chars) rejected in production
      expect(() => {
        parseEnv({
          ...baseValidProd,
          JWT_SECRET: 'short_key_123',
        });
      }).toThrow();
    });

    it('Criterion 2: Production refuses to start without valid MONGODB_URI', () => {
      // Missing MONGODB_URI
      expect(() => {
        parseEnv({
          ...baseValidProd,
          MONGODB_URI: '',
        });
      }).toThrow();

      // Invalid URI protocol
      expect(() => {
        parseEnv({
          ...baseValidProd,
          MONGODB_URI: 'postgres://localhost:5432/tripguard',
        });
      }).toThrow();
    });

    it('validates legitimate production configuration successfully', () => {
      const parsed = parseEnv(baseValidProd);
      expect(parsed.NODE_ENV).toBe('production');
      expect(parsed.JWT_SECRET).toBe('production_super_strong_secret_key_9999_verified');
      expect(parsed.MONGODB_URI).toBe('mongodb+srv://produser:ProdPass123!@cluster0.mongodb.net/tripguard_prod');
      expect(parsed.CORS_ORIGIN).toBe('https://tripguard.vercel.app');
    });
  });

  // 4. In-Memory Database Guard
  describe('Criterion 3: Production In-Memory Database Guard', () => {
    it('throws explicit fatal error in production when MONGODB_URI is absent and refuses in-memory fallback', async () => {
      const originalNodeEnv = process.env.NODE_ENV;
      const originalMongoUri = process.env.MONGODB_URI;

      try {
        process.env.NODE_ENV = 'production';
        process.env.MONGODB_URI = '';

        // Ensure disconnected state
        await disconnectDB();

        // Attempting connectDB in production without MONGODB_URI must reject
        await expect(connectDB()).rejects.toThrow(
          /MONGODB_URI environment variable is required in production/
        );
      } finally {
        process.env.NODE_ENV = originalNodeEnv;
        if (originalMongoUri) {
          process.env.MONGODB_URI = originalMongoUri;
        } else {
          delete process.env.MONGODB_URI;
        }
        await disconnectDB();
      }
    });
  });

  // 5. Database Connection Caching & Reuse
  describe('Criterion 7: Serverless Database Connection Reuse', () => {
    it('reuses cached mongoose connection on warm subsequent invocations', async () => {
      // Connect first time
      const conn1 = await connectDB();
      expect(conn1).toBeDefined();

      // Connect second time (should resolve immediately from cache)
      const conn2 = await connectDB();
      expect(conn2).toBe(conn1);
    });
  });

  // 6. CORS Policy Enforcement
  describe('Criteria 4 & 5: CORS Security Enforcement', () => {
    it('Criterion 5: Development allows localhost and local network origins', async () => {
      const res = await request(app)
        .get('/api/health')
        .set('Origin', 'http://localhost:5173');

      expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    });

    it('Criterion 4: Production CORS rejects unapproved external origins and restricts preview domains', async () => {
      // 1. Authorized TripGuard preview domain matching pattern is accepted
      const previewRes = await request(app)
        .get('/api/health')
        .set('Origin', 'https://tripguard-pr-42.vercel.app');
      expect(previewRes.headers['access-control-allow-origin']).toBe('https://tripguard-pr-42.vercel.app');

      // 2. Arbitrary external attacker Vercel domain is rejected
      const evilVercelRes = await request(app)
        .get('/api/health')
        .set('Origin', 'https://evil-attacker.vercel.app');
      expect(evilVercelRes.status).toBe(500);
      expect(evilVercelRes.headers['access-control-allow-origin']).toBeUndefined();

      // 3. Arbitrary external phishing domain is rejected
      const unapprovedRes = await request(app)
        .get('/api/health')
        .set('Origin', 'https://malicious-phishing-site.com');
      expect(unapprovedRes.status).toBe(500);
      expect(unapprovedRes.headers['access-control-allow-origin']).toBeUndefined();
    });
  });
});
