import mongoose, { Schema, Document } from 'mongoose';

export interface IAuditEvent extends Document {
  tripId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  eventType: 
    | 'TRIP_CREATED'
    | 'TRIP_UPDATED'
    | 'EXPENSE_RECORDED'
    | 'BOOKING_CREATED'
    | 'BOOKING_UPDATED'
    | 'RECOVERY_GENERATED'
    | 'RECOVERY_APPROVED'
    | 'RECOVERY_REJECTED'
    | 'ITINERARY_VERSIONED';
  metadata: Record<string, any>;
  timestamp: Date;
}

const AuditEventSchema = new Schema<IAuditEvent>(
  {
    tripId: { type: Schema.Types.ObjectId, ref: 'Trip', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    eventType: {
      type: String,
      required: true,
      enum: [
        'TRIP_CREATED',
        'TRIP_UPDATED',
        'EXPENSE_RECORDED',
        'BOOKING_CREATED',
        'BOOKING_UPDATED',
        'RECOVERY_GENERATED',
        'RECOVERY_APPROVED',
        'RECOVERY_REJECTED',
        'ITINERARY_VERSIONED',
      ],
      index: true,
    },
    metadata: { type: Schema.Types.Mixed, default: {} },
    timestamp: { type: Date, default: Date.now, index: true },
  },
  { timestamps: false }
);

export const AuditEvent = mongoose.model<IAuditEvent>('AuditEvent', AuditEventSchema);
