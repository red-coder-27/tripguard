import mongoose, { Schema, Document } from 'mongoose';
import { BookingCategory, BookingStatus, Currency } from '../types/index.js';

export interface IBooking extends Document {
  tripId: mongoose.Types.ObjectId;
  itineraryItemId?: mongoose.Types.ObjectId;
  category: BookingCategory;
  provider: string;
  bookingReference: string;
  totalCostMinor: number;
  paidAmountMinor: number;
  outstandingAmountMinor: number;
  currency: Currency;
  travelDate: Date;
  status: BookingStatus;
  cancellationPolicy: {
    isRefundable: boolean;
    freeCancellationDeadline?: Date;
    cancellationFeeMinor: number;
    refundableAmountMinor: number;
    policyNotes: string;
  };
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

const BookingSchema = new Schema<IBooking>(
  {
    tripId: { type: Schema.Types.ObjectId, ref: 'Trip', required: true, index: true },
    itineraryItemId: { type: Schema.Types.ObjectId, ref: 'ItineraryItem', default: null },
    category: {
      type: String,
      required: true,
      enum: ['ACCOMMODATION', 'TRANSPORT', 'ACTIVITY', 'RESTAURANT', 'OTHER'],
      index: true,
    },
    provider: { type: String, required: true, trim: true },
    bookingReference: { type: String, default: '', trim: true },
    totalCostMinor: { type: Number, required: true, min: 0 },
    paidAmountMinor: { type: Number, default: 0, min: 0 },
    outstandingAmountMinor: { type: Number, default: 0, min: 0 },
    currency: { type: String, default: 'INR', enum: ['INR', 'USD', 'EUR', 'GBP'] },
    travelDate: { type: Date, required: true },
    status: {
      type: String,
      default: 'CONFIRMED',
      enum: ['CONFIRMED', 'PENDING', 'CANCELLED', 'MODIFIED', 'MODIFICATION_PENDING_USER_ACTION'],
      index: true,
    },
    cancellationPolicy: {
      isRefundable: { type: Boolean, default: true },
      freeCancellationDeadline: { type: Date },
      cancellationFeeMinor: { type: Number, default: 0, min: 0 },
      refundableAmountMinor: { type: Number, default: 0, min: 0 },
      policyNotes: { type: String, default: '' },
    },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

// Pre-save hook to ensure outstanding amount is mathematically accurate
BookingSchema.pre('save', function (next) {
  this.outstandingAmountMinor = Math.max(0, this.totalCostMinor - this.paidAmountMinor);
  next();
});

export const Booking = mongoose.model<IBooking>('Booking', BookingSchema);
