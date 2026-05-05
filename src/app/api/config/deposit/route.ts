// src/app/api/config/deposit/route.ts
// Serves deposit configuration from environment variables.
// Crypto wallet addresses and bank details are NEVER exposed in frontend code.
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json({
    bankDetails: {
      bankName: process.env.BANK_NAME || 'ZentriBank Capital',
      accountName: process.env.BANK_ACCOUNT_NAME || 'ZentriBank Capital LLC',
      accountNumber: process.env.BANK_ACCOUNT_NUMBER || '8934567821',
      routingNumber: process.env.BANK_ROUTING_NUMBER || '021000021',
      swiftCode: process.env.BANK_SWIFT_CODE || 'ZBNKUS33',
      bankAddress: process.env.BANK_ADDRESS || '100 Wall Street, New York, NY 10005',
    },
    cryptoWallets: {
      BTC: process.env.CRYPTO_WALLET_BTC || '',
      ETH: process.env.CRYPTO_WALLET_ETH || '',
      USDT: process.env.CRYPTO_WALLET_USDT || '',
      USDC: process.env.CRYPTO_WALLET_USDC || '',
    },
  });
}
