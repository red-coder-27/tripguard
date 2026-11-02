import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { User } from '../models/User.js';
import { env } from '../config/env.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';

const router = Router();

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  baseCurrency: z.enum(['INR', 'USD', 'EUR', 'GBP']).default('INR'),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

// Register
router.post('/register', validateBody(registerSchema), async (req: Request, res: Response) => {
  try {
    const { name, email, password, baseCurrency } = req.body;

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      res.status(409).json({ success: false, error: 'A user with this email address already exists.' });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      passwordHash,
      baseCurrency,
    });

    const token = jwt.sign(
      { id: user._id.toString(), email: user.email, name: user.name },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRES_IN as any }
    );

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        baseCurrency: user.baseCurrency,
        emergencyReservePercentage: user.emergencyReservePercentage,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Login
router.post('/login', validateBody(loginSchema), async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      res.status(401).json({ success: false, error: 'Invalid email or password.' });
      return;
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      res.status(401).json({ success: false, error: 'Invalid email or password.' });
      return;
    }

    const token = jwt.sign(
      { id: user._id.toString(), email: user.email, name: user.name },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRES_IN as any }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        baseCurrency: user.baseCurrency,
        emergencyReservePercentage: user.emergencyReservePercentage,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Current User Profile
router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.user!.id).select('-passwordHash');
    if (!user) {
      res.status(404).json({ success: false, error: 'User not found.' });
      return;
    }
    res.json({ success: true, user });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Update profile / currency / settings
router.put('/settings', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { name, baseCurrency, emergencyReservePercentage } = req.body;
    const user = await User.findById(req.user!.id);
    if (!user) {
      res.status(404).json({ success: false, error: 'User not found.' });
      return;
    }

    if (name) user.name = name;
    if (baseCurrency) user.baseCurrency = baseCurrency;
    if (typeof emergencyReservePercentage === 'number') {
      user.emergencyReservePercentage = emergencyReservePercentage;
    }

    await user.save();
    res.json({ success: true, user });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
