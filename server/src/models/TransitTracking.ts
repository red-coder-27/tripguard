import mongoose, { Schema, Document } from 'mongoose';

export interface ITransitTracking extends Document {
  tripId: mongoose.Types.ObjectId;
  type: 'FLIGHT' | 'TRAIN' | 'BUS';
  carrier: string;
  code: string;
  departureCity: string;
  arrivalCity: string;
  departureTime: string;
  arrivalTime: string;
  status: 'ON_TIME' | 'DELAYED' | 'CANCELLED' | 'BOARDING' | 'ARRIVED';
  delayMinutes: number;
  terminal?: string;
  gate?: string;
  seat?: string;
  trackingMode: 'MANUAL_VERIFIED' | 'ESTIMATED';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const TransitTrackingSchema = new Schema<ITransitTracking>(
  {
    tripId: { type: Schema.Types.ObjectId, ref: 'Trip', required: true, index: true },
    type: { type: String, enum: ['FLIGHT', 'TRAIN', 'BUS'], default: 'FLIGHT' },
    carrier: { type: String, required: true, trim: true },
    code: { type: String, required: true, trim: true },
    departureCity: { type: String, required: true, trim: true },
    arrivalCity: { type: String, required: true, trim: true },
    departureTime: { type: String, required: true },
    arrivalTime: { type: String, required: true },
    status: {
      type: String,
      enum: ['ON_TIME', 'DELAYED', 'CANCELLED', 'BOARDING', 'ARRIVED'],
      default: 'ON_TIME',
    },
    delayMinutes: { type: Number, default: 0 },
    terminal: { type: String, default: '' },
    gate: { type: String, default: '' },
    seat: { type: String, default: '' },
    trackingMode: { type: String, default: 'MANUAL_VERIFIED' },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

export const TransitTracking = mongoose.model<ITransitTracking>('TransitTracking', TransitTrackingSchema);

