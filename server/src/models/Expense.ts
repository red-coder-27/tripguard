import mongoose, { Schema, Document } from 'mongoose';
import { Currency, ExpenseCategory } from '../types/index.js';

export interface IExpense extends Document {
  tripId: mongoose.Types.ObjectId;
  itineraryItemId?: mongoose.Types.ObjectId;
  bookingId?: mongoose.Types.ObjectId;
  description: string;
  category: ExpenseCategory;
  amountMinor: number;
  currency: Currency;
  date: Date;
  paymentMethod: 'CREDIT_CARD' | 'DEBIT_CARD' | 'CASH' | 'UPI' | 'BANK_TRANSFER';
  paymentStatus: 'SETTLED' | 'PENDING' | 'REFUNDED';
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

const ExpenseSchema = new Schema<IExpense>(
  {
    tripId: { type: Schema.Types.ObjectId, ref: 'Trip', required: true, index: true },
    itineraryItemId: { type: Schema.Types.ObjectId, ref: 'ItineraryItem', default: null },
    bookingId: { type: Schema.Types.ObjectId, ref: 'Booking', default: null },
    description: { type: String, required: true, trim: true },
    category: {
      type: String,
      required: true,
      enum: ['ACCOMMODATION', 'TRANSPORT', 'ACTIVITY', 'FOOD_DINING', 'SHOPPING', 'MISC'],
      index: true,
    },
    amountMinor: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'INR', enum: ['INR', 'USD', 'EUR', 'GBP'] },
    date: { type: Date, default: Date.now },
    paymentMethod: {
      type: String,
      default: 'CREDIT_CARD',
      enum: ['CREDIT_CARD', 'DEBIT_CARD', 'CASH', 'UPI', 'BANK_TRANSFER'],
    },
    paymentStatus: {
      type: String,
      default: 'SETTLED',
      enum: ['SETTLED', 'PENDING', 'REFUNDED'],
      index: true,
    },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

export const Expense = mongoose.model<IExpense>('Expense', ExpenseSchema);

