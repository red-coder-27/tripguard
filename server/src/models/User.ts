import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';
import { Currency } from '../types/index.js';

export interface IUser extends Document {
  name: string;
  email: string;
  passwordHash: string;
  baseCurrency: Currency;
  emergencyReservePercentage: number;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidate: string): Promise<boolean>;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, required: true },
    baseCurrency: { type: String, default: 'INR', uppercase: true, trim: true },
    emergencyReservePercentage: { type: Number, default: 10, min: 0, max: 50 },
  },
  { timestamps: true }
);

UserSchema.methods.comparePassword = async function (candidate: string): Promise<boolean> {
  return bcrypt.compare(candidate, this.passwordHash);
};

export const User = mongoose.model<IUser>('User', UserSchema);

