import mongoose, { Schema, Document } from 'mongoose';

export type PackingCategory =
  | 'ESSENTIALS'
  | 'CLOTHING'
  | 'ELECTRONICS'
  | 'TOILETRIES'
  | 'HEALTH'
  | 'WEATHER_SPECIFIC';

export interface IPackingItem extends Document {
  tripId: mongoose.Types.ObjectId;
  name: string;
  category: PackingCategory;
  isPacked: boolean;
  quantity: number;
  isRecommendedByWeather?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PackingItemSchema = new Schema<IPackingItem>(
  {
    tripId: { type: Schema.Types.ObjectId, ref: 'Trip', required: true, index: true },
    name: { type: String, required: true, trim: true },
    category: {
      type: String,
      required: true,
      enum: ['ESSENTIALS', 'CLOTHING', 'ELECTRONICS', 'TOILETRIES', 'HEALTH', 'WEATHER_SPECIFIC'],
      default: 'ESSENTIALS',
    },
    isPacked: { type: Boolean, default: false },
    quantity: { type: Number, default: 1, min: 1 },
    isRecommendedByWeather: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const PackingItem = mongoose.model<IPackingItem>('PackingItem', PackingItemSchema);
