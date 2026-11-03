import mongoose, { Schema, Document } from 'mongoose';

export type DocumentCategory = 'FLIGHT' | 'HOTEL' | 'INSURANCE' | 'VISA' | 'PASS' | 'OTHER';

export interface ITravelDocument extends Document {
  tripId: mongoose.Types.ObjectId;
  title: string;
  category: DocumentCategory;
  fileName: string;
  fileSize: string;
  fileType: string;
  bookingRef?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const TravelDocumentSchema = new Schema<ITravelDocument>(
  {
    tripId: { type: Schema.Types.ObjectId, ref: 'Trip', required: true, index: true },
    title: { type: String, required: true, trim: true },
    category: {
      type: String,
      required: true,
      enum: ['FLIGHT', 'HOTEL', 'INSURANCE', 'VISA', 'PASS', 'OTHER'],
      default: 'OTHER',
    },
    fileName: { type: String, required: true },
    fileSize: { type: String, default: '142 KB' },
    fileType: { type: String, default: 'application/pdf' },
    bookingRef: { type: String, default: '' },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

export const TravelDocument = mongoose.model<ITravelDocument>('TravelDocument', TravelDocumentSchema);

