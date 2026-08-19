import { Schema, model, Document } from 'mongoose';

export interface IUser extends Document {
  name: string;
  role: 'controller' | 'driver' | 'commuter';
  email?: string;
  phone?: string;
  employeeId?: string;
  password?: string;
  createdAt: Date;
}

const UserSchema = new Schema<IUser>({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
  },
  role: {
    type: String,
    enum: ['controller', 'driver', 'commuter'],
    required: [true, 'Role is required'],
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    unique: true,
    sparse: true, // Allow multiple nulls / undefined for users without email
  },
  phone: {
    type: String,
    trim: true,
    unique: true,
    sparse: true, // Allow multiple nulls / undefined for users without phone
  },
  employeeId: {
    type: String,
    trim: true,
    unique: true,
    sparse: true, // Allow multiple nulls / undefined for non-drivers
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default model<IUser>('User', UserSchema);
