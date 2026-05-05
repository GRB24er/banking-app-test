// File: src/models/User.ts
import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';

function secureNumericId(length: number): string {
  const hex = randomBytes(8).toString('hex');
  const num = BigInt('0x' + hex).toString();
  return num.replace(/\D/g, '').slice(0, length).padStart(length, '1');
}

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: 'user' | 'admin';
  verified: boolean;
  checkingBalance: number;
  savingsBalance: number;
  investmentBalance: number;
  accountNumber?: string;
  routingNumber?: string;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const UserSchema = new Schema<IUser>({
  name: { type: String, required: true, trim: true, maxlength: 50 },
  email: {
    type: String, required: true, unique: true, lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Invalid email address'],
  },
  password: { type: String, required: true, minlength: 8, select: false },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  verified: { type: Boolean, default: false },
  checkingBalance: { type: Number, default: 0 },
  savingsBalance: { type: Number, default: 0 },
  investmentBalance: { type: Number, default: 0 },
  accountNumber: { type: String, required: false, unique: true, sparse: true },
  routingNumber: { type: String, required: false },
}, {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: (_doc, ret) => {
      ret.id = ret._id.toString();
      ret._id = ret._id.toString() as any;
      delete (ret as any).password;
      delete (ret as any).__v;
      return ret;
    },
  },
});

UserSchema.pre<IUser>('save', async function (next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err as Error);
  }
});

UserSchema.pre<IUser>('save', function (next) {
  if (!this.accountNumber) {
    this.accountNumber = 'ZB' + secureNumericId(10);
  }
  if (!this.routingNumber) {
    this.routingNumber = '021000021';
  }
  next();
});

UserSchema.methods.comparePassword = function (candidate: string) {
  return bcrypt.compare(candidate, this.password);
};

const User = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
export default User;
