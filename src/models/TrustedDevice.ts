import mongoose, { Document, Model, Schema } from 'mongoose';

export interface ITrustedDevice extends Document {
  userId: mongoose.Types.ObjectId;
  deviceFingerprint: string;
  deviceName: string;
  browser: string;
  os: string;
  ipAddress: string;
  location: string;
  lastUsedAt: Date;
  trusted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const TrustedDeviceSchema: Schema<ITrustedDevice> = new mongoose.Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    deviceFingerprint: {
      type: String,
      required: true,
    },
    deviceName: {
      type: String,
      default: 'Unknown Device',
    },
    browser: {
      type: String,
      default: 'Unknown',
    },
    os: {
      type: String,
      default: 'Unknown',
    },
    ipAddress: {
      type: String,
      default: 'Unknown',
    },
    location: {
      type: String,
      default: 'Unknown',
    },
    lastUsedAt: {
      type: Date,
      default: () => new Date(),
    },
    trusted: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

TrustedDeviceSchema.index({ userId: 1, deviceFingerprint: 1 }, { unique: true });

const TrustedDevice: Model<ITrustedDevice> =
  mongoose.models.TrustedDevice || mongoose.model<ITrustedDevice>('TrustedDevice', TrustedDeviceSchema);

export default TrustedDevice;
