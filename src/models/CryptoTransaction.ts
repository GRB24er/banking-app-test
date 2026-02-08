import mongoose, { Schema, Document } from 'mongoose';

export interface ICryptoTransaction extends Document {
  userId: mongoose.Types.ObjectId;
  type: 'conversion' | 'send' | 'receive';
  status: 'processing' | 'pending_approval' | 'approved' | 'rejected' | 'completed' | 'failed';
  
  // For conversions
  fromCurrency?: string;      // USD or crypto symbol
  toCurrency?: string;        // crypto symbol or USD
  fromAmount?: number;
  toAmount?: number;
  exchangeRate?: number;
  
  // For sends/receives
  cryptoCurrency?: string;
  cryptoAmount?: number;
  walletAddress?: string;
  network?: string;           // ERC20, TRC20, BEP20, etc.
  txHash?: string;
  
  // Common
  fee: number;
  reference: string;
  description: string;
  
  // Admin approval
  approvedBy?: mongoose.Types.ObjectId;
  approvedAt?: Date;
  rejectionReason?: string;
  
  // Metadata
  metadata?: Record<string, any>;
  
  createdAt: Date;
  updatedAt: Date;
}

const CryptoTransactionSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['conversion', 'send', 'receive'], required: true },
  status: { 
    type: String, 
    enum: ['processing', 'pending_approval', 'approved', 'rejected', 'completed', 'failed'],
    default: 'processing'
  },
  
  // Conversion fields
  fromCurrency: String,
  toCurrency: String,
  fromAmount: Number,
  toAmount: Number,
  exchangeRate: Number,
  
  // Send/Receive fields
  cryptoCurrency: String,
  cryptoAmount: Number,
  walletAddress: String,
  network: String,
  txHash: String,
  
  // Common
  fee: { type: Number, default: 0 },
  reference: { type: String, required: true, unique: true },
  description: String,
  
  // Admin
  approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  approvedAt: Date,
  rejectionReason: String,
  
  metadata: Schema.Types.Mixed,
}, { timestamps: true });

CryptoTransactionSchema.index({ userId: 1, createdAt: -1 });
CryptoTransactionSchema.index({ reference: 1 });
CryptoTransactionSchema.index({ status: 1 });

export default mongoose.models.CryptoTransaction || mongoose.model<ICryptoTransaction>('CryptoTransaction', CryptoTransactionSchema);
