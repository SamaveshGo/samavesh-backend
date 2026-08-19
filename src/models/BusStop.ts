import mongoose, { Document, Schema } from 'mongoose';

export interface IBusStop extends Document {
  name: string;
  lat: number;
  lng: number;
  geocoded: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const BusStopSchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    lat: {
      type: Number,
      default: 0
    },
    lng: {
      type: Number,
      default: 0
    },
    geocoded: {
      type: Boolean,
      default: false,
      index: true
    }
  },
  {
    timestamps: true
  }
);

export default mongoose.model<IBusStop>('BusStop', BusStopSchema);
