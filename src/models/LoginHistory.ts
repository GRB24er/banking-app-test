import mongoose, { Document, Model, Schema } from 'mongoose';

export interface ILoginHistory extends Document {
  userId: mongoose.Types.ObjectId;
  email: string;
  status: 'success' | 'failed';
  ipAddress: string;
  location: string;
  device: string;
  browser: string;
  os: string;
  userAgent: string;
  failureReason?: string;
  isNewDevice: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const LoginHistorySchema: Schema<ILoginHistory> = new mongoose.Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    email: {
      type: String,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['success', 'failed'],
      required: true,
      index: true,
    },
    ipAddress: {
      type: String,
      default: 'Unknown',
    },
    location: {
      type: String,
      default: 'Unknown',
    },
    device: {
      type: String,
      default: 'Unknown',
    },
    browser: {
      type: String,
      default: 'Unknown',
    },
    os: {
      type: String,
      default: 'Unknown',
    },
    userAgent: {
      type: String,
      default: '',
    },
    failureReason: {
      type: String,
    },
    isNewDevice: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

LoginHistorySchema.index({ userId: 1, createdAt: -1 });
LoginHistorySchema.index({ email: 1, createdAt: -1 });

const LoginHistory: Model<ILoginHistory> =
  mongoose.models.LoginHistory || mongoose.model<ILoginHistory>('LoginHistory', LoginHistorySchema);

export default LoginHistory;
