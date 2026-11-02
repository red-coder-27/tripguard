import mongoose, { Schema, Document } from 'mongoose';
import { Currency } from '../types/index.js';

export interface ITrip extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  destination: string;
  startDate: Date;
  endDate: Date;
  travelersCount: number;
  totalBudgetMinor: number;
  emergencyReserveMinor: number;
  currency: Currency;
  status: 'PLANNING' | 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';
  currentVersion: number;
  preferences: {
    primaryInterests: string[];
    travelPace: 'RELAXED' | 'BALANCED' | 'PACKED';
    accommodationPreference: 'BUDGET' | 'BOUTIQUE' | 'LUXURY';
  };
  createdAt: Date;
  updatedAt: Date;
}

const TripSchema = new Schema<ITrip>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true },
    destination: { type: String, required: true, trim: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    travelersCount: { type: Number, default: 1, min: 1 },
    totalBudgetMinor: { type: Number, required: true, min: 0 },
    emergencyReserveMinor: { type: Number, default: 0, min: 0 },
    currency: { type: String, default: 'INR', enum: ['INR', 'USD', 'EUR', 'GBP'] },
    status: {
      type: String,
      default: 'ACTIVE',
      enum: ['PLANNING', 'ACTIVE', 'COMPLETED', 'ARCHIVED'],
      index: true,
    },
    currentVersion: { type: Number, default: 1 },
    preferences: {
      primaryInterests: { type: [String], default: [] },
      travelPace: { type: String, default: 'BALANCED', enum: ['RELAXED', 'BALANCED', 'PACKED'] },
      accommodationPreference: {
        type: String,
        default: 'BOUTIQUE',
        enum: ['BUDGET', 'BOUTIQUE', 'LUXURY'],
      },
    },
  },
  { timestamps: true }
);

export const Trip = mongoose.model<ITrip>('Trip', TripSchema);
