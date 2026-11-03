import mongoose, { Schema, Document } from 'mongoose';

export type MemberRole = 'LEAD_ORGANIZER' | 'CO_TRAVELER' | 'VIEWER';

export interface ITripMember extends Document {
  tripId: mongoose.Types.ObjectId;
  name: string;
  email: string;
  role: MemberRole;
  sharePercentage: number; // e.g. 50%
  contributedAmountMinor: number; // what they have paid so far in minor units
  createdAt: Date;
  updatedAt: Date;
}

const TripMemberSchema = new Schema<ITripMember>(
  {
    tripId: { type: Schema.Types.ObjectId, ref: 'Trip', required: true, index: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    role: {
      type: String,
      required: true,
      enum: ['LEAD_ORGANIZER', 'CO_TRAVELER', 'VIEWER'],
      default: 'CO_TRAVELER',
    },
    sharePercentage: { type: Number, required: true, default: 50, min: 0, max: 100 },
    contributedAmountMinor: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

export const TripMember = mongoose.model<ITripMember>('TripMember', TripMemberSchema);
