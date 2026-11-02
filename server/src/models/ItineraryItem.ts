import mongoose, { Schema, Document } from 'mongoose';
import { ActivityCategory, ActivityPriority } from '../types/index.js';

export interface IItineraryItem extends Document {
  tripId: mongoose.Types.ObjectId;
  dayNumber: number;
  date: Date;
  title: string;
  description: string;
  category: ActivityCategory;
  startTime: string; // e.g. "09:30"
  endTime: string;   // e.g. "12:00"
  location: string;
  estimatedCostMinor: number;
  priority: ActivityPriority;
  isLocked: boolean;
  bookingId?: mongoose.Types.ObjectId;
  version: number;
  isRemoved: boolean;
  replacedByItemId?: mongoose.Types.ObjectId;
  alternativeUsedId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ItineraryItemSchema = new Schema<IItineraryItem>(
  {
    tripId: { type: Schema.Types.ObjectId, ref: 'Trip', required: true, index: true },
    dayNumber: { type: Number, required: true, min: 1 },
    date: { type: Date, required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    category: {
      type: String,
      required: true,
      enum: ['ACCOMMODATION', 'TRANSPORT', 'ACTIVITY', 'FOOD_DINING', 'SHOPPING', 'MISC'],
    },
    startTime: { type: String, default: '10:00' },
    endTime: { type: String, default: '12:00' },
    location: { type: String, default: '' },
    estimatedCostMinor: { type: Number, required: true, min: 0 },
    priority: {
      type: String,
      default: 'FLEXIBLE',
      enum: ['MUST_DO', 'FLEXIBLE', 'OPTIONAL'],
      index: true,
    },
    isLocked: { type: Boolean, default: false },
    bookingId: { type: Schema.Types.ObjectId, ref: 'Booking', default: null },
    version: { type: Number, default: 1, index: true },
    isRemoved: { type: Boolean, default: false },
    replacedByItemId: { type: Schema.Types.ObjectId, ref: 'ItineraryItem', default: null },
    alternativeUsedId: { type: String, default: null },
  },
  { timestamps: true }
);

export const ItineraryItem = mongoose.model<IItineraryItem>('ItineraryItem', ItineraryItemSchema);
