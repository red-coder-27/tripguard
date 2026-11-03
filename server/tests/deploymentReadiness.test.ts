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

    it('sanitizes quotes and whitespace from JWT_EXPIRES_IN and JWT_SECRET', () => {
      const parsedWithQuotes = parseEnv({
        ...baseValidProd,
        JWT_SECRET: '"production_super_strong_secret_key_9999_verified"',
        JWT_EXPIRES_IN: '"7d"',
      });
      expect(parsedWithQuotes.JWT_SECRET).toBe('production_super_strong_secret_key_9999_verified');
      expect(parsedWithQuotes.JWT_EXPIRES_IN).toBe('7d');

      const parsedWithSingleQuotes = parseEnv({
        ...baseValidProd,
        JWT_EXPIRES_IN: "'24h'",
      });
      expect(parsedWithSingleQuotes.JWT_EXPIRES_IN).toBe('24h');

      const parsedWithEmptyString = parseEnv({
        ...baseValidProd,
        JWT_EXPIRES_IN: '  ',
      });
      expect(parsedWithEmptyString.JWT_EXPIRES_IN).toBe('7d');
    });
  });

  // 4. In-Memory Database Guard
  describe('Criterion 3: Production In-Memory Database Guard', () => {
    it('throws explicit fatal error in production when MONGODB_URI is absent and refuses in-memory fallback', async () => {
      const originalNodeEnv = process.env.NODE_ENV;
      try {
        process.env.NODE_ENV = 'production';
        // Pass whitespace/empty uriOverride to test production validation without tearing down parallel test DB
        await expect(connectDB(' ')).rejects.toThrow(
          /MONGODB_URI environment variable is required in production/
        );
      } finally {
        process.env.NODE_ENV = originalNodeEnv;
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

  // 7. Vercel Multi-Service Project Architecture & Configuration Verification
  describe('Vercel Multi-Service Project Configuration (vercel.json & Service Boundaries)', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const fs = require('fs');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const path = require('path');

    const vercelConfigPath = path.resolve(process.cwd(), '../vercel.json');
    const vercelConfig = JSON.parse(
      fs.existsSync(vercelConfigPath)
        ? fs.readFileSync(vercelConfigPath, 'utf8')
        : fs.readFileSync(path.resolve(process.cwd(), 'vercel.json'), 'utf8')
    );

    it('uses the standard "services" key and strictly avoids legacy "experimentalServices"', () => {
      expect(vercelConfig.services).toBeDefined();
      expect(typeof vercelConfig.services).toBe('object');
      expect(vercelConfig.experimentalServices).toBeUndefined();
    });

    it('correctly configures the frontend service with client root, vite framework, and SPA fallback', () => {
      const frontend = vercelConfig.services.frontend;
      expect(frontend).toBeDefined();
      expect(frontend.root).toBe('client/');
      expect(frontend.framework).toBe('vite');
      expect(Array.isArray(frontend.rewrites)).toBe(true);
      expect(frontend.rewrites[0].destination).toBe('/index.html');
    });

    it('correctly configures the backend service with server root, express framework, and src/app.ts entrypoint', () => {
      const backend = vercelConfig.services.backend;
      expect(backend).toBeDefined();
      expect(backend.root).toBe('server/');
      expect(backend.framework).toBe('express');
      expect(backend.entrypoint).toBe('src/app.ts');
    });

    it('routes /api and /api/* to the backend service before forwarding catch-all traffic to the frontend', () => {
      const rewrites = vercelConfig.rewrites;
      expect(Array.isArray(rewrites)).toBe(true);
      expect(rewrites.length).toBeGreaterThanOrEqual(3);

      // Rule 1: /api/(.*) -> backend
      expect(rewrites[0].source).toBe('/api/(.*)');
      expect(rewrites[0].destination).toEqual({ service: 'backend' });

      // Rule 2: /api -> backend
      expect(rewrites[1].source).toBe('/api');
      expect(rewrites[1].destination).toEqual({ service: 'backend' });

      // Rule 3: Catch-all /(.*) -> frontend
      const lastRewrite = rewrites[rewrites.length - 1];
      expect(lastRewrite.source).toBe('/(.*)');
      expect(lastRewrite.destination).toEqual({ service: 'frontend' });
    });

    it('respects Vercel rule that top-level build and output configuration is delegated to services', () => {
      expect(vercelConfig.buildCommand).toBeUndefined();
      expect(vercelConfig.outputDirectory).toBeUndefined();
    });

    it('verifies server/package.json main points to dist/index.js without starting open persistent socket', () => {
      const serverPkgPath = path.resolve(process.cwd(), 'package.json');
      const serverPkg = JSON.parse(
        fs.existsSync(serverPkgPath)
          ? fs.readFileSync(serverPkgPath, 'utf8')
          : fs.readFileSync(path.resolve(process.cwd(), 'server/package.json'), 'utf8')
      );
      expect(serverPkg.main).toBe('dist/index.js');
    });

    it('confirms legacy root api/index.ts has been removed in favor of multi-service backend', () => {
      const legacyApiDir = path.resolve(process.cwd(), '../api');
      const localApiDir = path.resolve(process.cwd(), 'api');
      const exists = fs.existsSync(legacyApiDir) || (process.cwd().endsWith('tripguard') && fs.existsSync(localApiDir));
      expect(exists).toBe(false);
    });
  });

  // 8. Express Trust Proxy & Serverless Forwarded Headers Suite
  describe('Criterion 9: Express Trust Proxy & Serverless Proxy Integrity', () => {
    it('configures Express trust proxy setting to 1 for Vercel edge reverse proxy architecture', () => {
      const trustProxy = (app as any).get('trust proxy');
      expect(trustProxy).toBe(1);
    });

    it('resolves real client IP and avoids ERR_ERL_UNEXPECTED_X_FORWARDED_FOR with single proxy header', async () => {
      const res = await request(app)
        .get('/api/health')
        .set('X-Forwarded-For', '203.0.113.195');

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('healthy');
      expect(res.body.proxy).toBeDefined();
      expect(res.body.proxy.ip).toBe('203.0.113.195');
    });

    it('prevents client IP spoofing by trusting only the 1st hop from the reverse proxy', async () => {
      // Attacker attempts to spoof 198.51.100.1; Vercel appends real client IP 203.0.113.50
      const res = await request(app)
        .get('/api/health')
        .set('X-Forwarded-For', '198.51.100.1, 203.0.113.50');

      expect(res.status).toBe(200);
      expect(res.body.proxy.ip).toBe('203.0.113.50');
      expect(res.body.proxy.ip).not.toBe('198.51.100.1');
    });

    it('accurately identifies secure protocol when forwarded by Vercel edge TLS termination', async () => {
      const res = await request(app)
        .get('/api/health')
        .set('X-Forwarded-Proto', 'https')
        .set('X-Forwarded-For', '203.0.113.195');

      expect(res.status).toBe(200);
      expect(res.body.proxy.protocol).toBe('https');
      expect(res.body.proxy.secure).toBe(true);
    });

    it('preserves rate limiting headers and operates without error when proxy headers are present', async () => {
      const res = await request(app)
        .get('/api/health')
        .set('X-Forwarded-For', '192.0.2.77');

      expect(res.status).toBe(200);
      expect(res.headers['ratelimit-limit']).toBeDefined();
      expect(res.headers['ratelimit-remaining']).toBeDefined();
      expect(Number(res.headers['ratelimit-limit'])).toBe(1000);
    });

    it('handles direct requests without proxy headers gracefully', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.proxy).toBeDefined();
      expect(['127.0.0.1', '::1', '::ffff:127.0.0.1']).toContain(res.body.proxy.ip);
    });
  });

  // 9. Production Authentication Resilience & Error Classification Suite
  describe('Criterion 10: Production Authentication Resilience & Error Classification', () => {
    it('returns 401 Unauthorized instead of 500 when logging in with non-existent email', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'nonexistent.traveler.999@tripguard.ai', password: 'AnyPassword123!' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Invalid email or password.');
    });

    it('returns 401 Unauthorized instead of 500 when logging in with incorrect password', async () => {
      // Register temporary user
      const testEmail = `auth.test.${Date.now()}@tripguard.ai`;
      await request(app)
        .post('/api/v1/auth/register')
        .send({ name: 'Auth Tester', email: testEmail, password: 'CorrectPassword123!' });

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: testEmail, password: 'WrongPassword999!' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Invalid email or password.');
    });

    it('returns 409 Conflict instead of 500 when registering an existing email address', async () => {
      const testEmail = `dup.test.${Date.now()}@tripguard.ai`;
      // First registration
      const firstRes = await request(app)
        .post('/api/v1/auth/register')
        .send({ name: 'Dup User', email: testEmail, password: 'ValidPassword123!' });
      expect(firstRes.status).toBe(201);

      // Duplicate registration attempt
      const dupRes = await request(app)
        .post('/api/v1/auth/register')
        .send({ name: 'Dup User 2', email: testEmail, password: 'ValidPassword123!' });
      expect(dupRes.status).toBe(409);
      expect(dupRes.body.success).toBe(false);
      expect(dupRes.body.error).toContain('already exists');
    });

    it('safely handles missing or corrupted passwordHash on user model without throwing 500', async () => {
      const { User } = await import('../src/models/User.js');
      const testEmail = `corrupt.hash.${Date.now()}@tripguard.ai`;
      
      // Directly create document with empty passwordHash
      const corruptedUser = new User({
        name: 'Corrupted User',
        email: testEmail,
        passwordHash: '',
      });
      
      const isMatch = await corruptedUser.comparePassword('AnyPassword123!');
      expect(isMatch).toBe(false);
    });
  });
});
