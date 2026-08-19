import mongoose, { Document, Schema } from 'mongoose';

export interface IBusRoute extends Document {
  route_number: string;
  route_description: string;
  operator: 'BEST' | 'TMT' | 'NMMT' | 'KDMT' | 'VVMT' | 'MBMT' | 'KMT' | 'UMT';
  url: string;
  stops: string[];
  createdAt: Date;
  updatedAt: Date;
}

const BusRouteSchema: Schema = new Schema(
  {
    route_number: {
      type: String,
      default: '',
      index: true
    },
    route_description: {
      type: String,
      default: ''
    },
    operator: {
      type: String,
      required: true,
      enum: ['BEST', 'TMT', 'NMMT', 'KDMT', 'VVMT', 'MBMT', 'KMT', 'UMT'],
      index: true
    },
    url: {
      type: String,
      default: ''
    },
    stops: {
      type: [String],
      required: true,
      default: []
    }
  },
  {
    timestamps: true
  }
);

// Compound index to search for routes by operator and route number
BusRouteSchema.index({ operator: 1, route_number: 1 });
// Index to quickly search for routes that contain a specific stop name
BusRouteSchema.index({ stops: 1 });

export default mongoose.model<IBusRoute>('BusRoute', BusRouteSchema);
