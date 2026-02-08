import mongoose, { Schema, Document } from 'mongoose';

export interface ICryptoBalance {
  currency: string;
  symbol: string;
  balance: number;
  lockedBalance: number; // Amount pending in transfers
}

export interface ICryptoWallet extends Document {
  userId: mongoose.Types.ObjectId;
  balances: ICryptoBalance[];
  createdAt: Date;
  updatedAt: Date;
}

const CryptoBalanceSchema = new Schema({
  currency: { type: String, required: true }, // Bitcoin, Ethereum, etc.
  symbol: { type: String, required: true },   // BTC, ETH, USDT, etc.
  balance: { type: Number, default: 0 },
  lockedBalance: { type: Number, default: 0 },
});

const CryptoWalletSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  balances: [CryptoBalanceSchema],
}, { timestamps: true });

// Initialize with supported cryptocurrencies
CryptoWalletSchema.pre('save', function(next) {
  if (this.isNew && this.balances.length === 0) {
    this.balances = [
      { currency: 'Bitcoin', symbol: 'BTC', balance: 0, lockedBalance: 0 },
      { currency: 'Ethereum', symbol: 'ETH', balance: 0, lockedBalance: 0 },
      { currency: 'Tether', symbol: 'USDT', balance: 0, lockedBalance: 0 },
      { currency: 'USD Coin', symbol: 'USDC', balance: 0, lockedBalance: 0 },
      { currency: 'Binance Coin', symbol: 'BNB', balance: 0, lockedBalance: 0 },
      { currency: 'Ripple', symbol: 'XRP', balance: 0, lockedBalance: 0 },
      { currency: 'Solana', symbol: 'SOL', balance: 0, lockedBalance: 0 },
      { currency: 'Cardano', symbol: 'ADA', balance: 0, lockedBalance: 0 },
    ];
  }
  next();
});

export default mongoose.models.CryptoWallet || mongoose.model<ICryptoWallet>('CryptoWallet', CryptoWalletSchema);
