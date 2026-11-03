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
  baseCurrency: z.string().length(3).regex(/^[A-Za-z]{3}$/).transform((v) => v.toUpperCase()).default('INR'),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

function generateAuthToken(user: { _id: any; email: string; name: string }): string {
  let expiresIn = env.JWT_EXPIRES_IN;
  if (typeof expiresIn === 'string') {
    expiresIn = expiresIn.trim().replace(/^["']+|["']+$/g, '').trim() || '7d';
  }
  return jwt.sign(
    { id: user._id.toString(), email: user.email, name: user.name },
    env.JWT_SECRET,
    { expiresIn: expiresIn as any }
  );
}

// Register
router.post('/register', validateBody(registerSchema), async (req: Request, res: Response) => {
  try {
    const { name, email, password, baseCurrency } = req.body;

    const normalizedEmail = email.toLowerCase().trim();
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      res.status(409).json({ success: false, error: 'A user with this email address already exists.' });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      baseCurrency,
    });

    const token = generateAuthToken(user);

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
    if (err.code === 11000) {
      res.status(409).json({ success: false, error: 'A user with this email address already exists.' });
      return;
    }
    console.error('[Auth Register Error]:', err.name, err.message);
    res.status(500).json({ success: false, error: 'Account registration failed. Please try again.' });
  }
});

// Login
router.post('/login', validateBody(loginSchema), async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      res.status(401).json({ success: false, error: 'Invalid email or password.' });
      return;
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      res.status(401).json({ success: false, error: 'Invalid email or password.' });
      return;
    }

    const token = generateAuthToken(user);

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
    console.error('[Auth Login Error]:', err.name, err.message);
    res.status(500).json({ success: false, error: 'Authentication failed due to an internal server error.' });
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

// Change Password
const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters'),
});

router.post('/change-password', authenticate, validateBody(changePasswordSchema), async (req: AuthRequest, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user!.id);
    if (!user) {
      res.status(404).json({ success: false, error: 'User not found.' });
      return;
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      res.status(400).json({ success: false, error: 'Current password does not match.' });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    user.passwordHash = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.json({ success: true, message: 'Password updated successfully.' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;

