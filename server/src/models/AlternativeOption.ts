import mongoose, { Schema, Document } from 'mongoose';
import { ActivityCategory, Currency } from '../types/index.js';

export interface IAlternativeOption extends Document {
  category: ActivityCategory;
  destination: string;
  name: string;
  provider: string;
  costMinor: number;
  currency: Currency;
  tier: 'BUDGET' | 'STANDARD' | 'PREMIUM';
  rating: number;
  safetyCertified: boolean;
  distanceKmFromCenter: number;
  latitude?: number;
  longitude?: number;
  confidence?: 'VERIFIED' | 'USER_PROVIDED' | 'ESTIMATED' | 'STALE';
  source?: string;
  description: string;
  amenities: string[];
  cancellationTerms: string;
  createdAt: Date;
  updatedAt: Date;
}

const AlternativeOptionSchema = new Schema<IAlternativeOption>(
  {
    category: {
      type: String,
      required: true,
      enum: ['ACCOMMODATION', 'TRANSPORT', 'ACTIVITY', 'FOOD_DINING', 'SHOPPING', 'MISC'],
      index: true,
    },
    destination: { type: String, required: true, trim: true, index: true },
    name: { type: String, required: true, trim: true },
    provider: { type: String, required: true, trim: true },
    costMinor: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'INR', uppercase: true, trim: true },
    tier: {
      type: String,
      default: 'STANDARD',
      enum: ['BUDGET', 'STANDARD', 'PREMIUM'],
    },
    rating: { type: Number, default: 4.5, min: 1, max: 5 },
    safetyCertified: { type: Boolean, default: true },
    distanceKmFromCenter: { type: Number, default: 1.0 },
    latitude: { type: Number, default: null },
    longitude: { type: Number, default: null },
    confidence: {
      type: String,
      default: 'VERIFIED',
      enum: ['VERIFIED', 'USER_PROVIDED', 'ESTIMATED', 'STALE'],
    },
    source: { type: String, default: 'TripGuard Verified Catalog' },
    description: { type: String, default: '' },
    amenities: { type: [String], default: [] },
    cancellationTerms: { type: String, default: 'Free cancellation up to 48 hours' },
  },
  { timestamps: true }
);

export const AlternativeOption = mongoose.model<IAlternativeOption>('AlternativeOption', AlternativeOptionSchema);

