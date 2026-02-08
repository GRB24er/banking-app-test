import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import CryptoWallet from '@/models/CryptoWallet';
import CryptoTransaction from '@/models/CryptoTransaction';
import { getCryptoPrice, convertUsdToCrypto, SUPPORTED_CRYPTOS } from '@/lib/cryptoPrices';
import { sendTransactionEmail } from '@/lib/mail';

const AUTH_SECRET = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || '308d98ab1034136b95e1f7b43f6afde185e5892d09bbe9d1e2b68e1db9c1acae';

async function verifyToken(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  try {
    const token = authHeader.split(' ')[1];
    return jwt.verify(token, AUTH_SECRET) as { userId: string; email: string };
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('[Crypto Convert] POST');

    const decoded = await verifyToken(request);
    if (!decoded) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { fromAccount = 'checking', toCrypto, usdAmount } = body;

    // Validation
    if (!toCrypto || !SUPPORTED_CRYPTOS.includes(toCrypto.toUpperCase())) {
      return NextResponse.json({ success: false, error: 'Unsupported cryptocurrency' }, { status: 400 });
    }

    const amount = typeof usdAmount === 'string' 
      ? parseFloat(usdAmount.replace(/[^0-9.-]/g, '')) 
      : Number(usdAmount);

    if (isNaN(amount) || amount <= 0) {
      return NextResponse.json({ success: false, error: 'Invalid amount' }, { status: 400 });
    }

    if (amount < 10) {
      return NextResponse.json({ success: false, error: 'Minimum conversion is $10' }, { status: 400 });
    }

    await connectDB();

    const user = await User.findById(decoded.userId);
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    // Check balance
    const balanceField = fromAccount === 'savings' ? 'savingsBalance' : 
                         fromAccount === 'investment' ? 'investmentBalance' : 'checkingBalance';
    const currentBalance = Number((user as any)[balanceField] || 0);

    // Calculate fee (1% conversion fee)
    const conversionFee = amount * 0.01;
    const totalDebit = amount + conversionFee;

    if (totalDebit > currentBalance) {
      return NextResponse.json({ 
        success: false, 
        error: 'Insufficient funds',
        available: currentBalance,
        required: totalDebit
      }, { status: 400 });
    }

    // Get crypto price and calculate amount
    const cryptoPrice = await getCryptoPrice(toCrypto);
    const cryptoAmount = convertUsdToCrypto(amount, cryptoPrice);

    // Generate reference
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    const reference = `CONV-${timestamp}-${random}`;

    // Get or create crypto wallet
    let wallet = await CryptoWallet.findOne({ userId: decoded.userId });
    if (!wallet) {
      wallet = await CryptoWallet.create({ userId: decoded.userId });
    }

    // Deduct USD from bank account
    await User.findByIdAndUpdate(decoded.userId, {
      $inc: { [balanceField]: -totalDebit }
    });

    // Add crypto to wallet
    const cryptoSymbol = toCrypto.toUpperCase();
    const balanceIndex = wallet.balances.findIndex((b: any) => b.symbol === cryptoSymbol);
    
    if (balanceIndex >= 0) {
      wallet.balances[balanceIndex].balance += cryptoAmount;
    } else {
      wallet.balances.push({
        currency: cryptoSymbol,
        symbol: cryptoSymbol,
        balance: cryptoAmount,
        lockedBalance: 0,
      });
    }
    await wallet.save();

    // Create transaction record
    const transaction = await CryptoTransaction.create({
      userId: decoded.userId,
      type: 'conversion',
      status: 'completed',
      fromCurrency: 'USD',
      toCurrency: cryptoSymbol,
      fromAmount: amount,
      toAmount: cryptoAmount,
      exchangeRate: cryptoPrice,
      fee: conversionFee,
      reference,
      description: `Converted $${amount.toFixed(2)} to ${cryptoAmount.toFixed(8)} ${cryptoSymbol}`,
      metadata: {
        fromAccount,
        cryptoPrice,
      }
    });

    // Send email notification
    try {
      await sendTransactionEmail(user.email, {
        name: user.name || 'Customer',
        transaction: {
          type: 'Crypto Conversion',
          amount: amount,
          description: `Converted to ${cryptoAmount.toFixed(8)} ${cryptoSymbol}`,
          reference,
          status: 'Completed',
        },
        subject: 'Crypto Conversion Completed'
      });
    } catch (emailError) {
      console.error('[Crypto Convert] Email failed:', emailError);
    }

    console.log('[Crypto Convert] Success:', reference);

    // Get updated balances
    const updatedUser = await User.findById(decoded.userId);
    const updatedWallet = await CryptoWallet.findOne({ userId: decoded.userId });

    return NextResponse.json({
      success: true,
      message: `Successfully converted $${amount.toFixed(2)} to ${cryptoAmount.toFixed(8)} ${cryptoSymbol}`,
      reference,
      conversion: {
        fromCurrency: 'USD',
        fromAmount: amount,
        toCurrency: cryptoSymbol,
        toAmount: cryptoAmount,
        exchangeRate: cryptoPrice,
        fee: conversionFee,
        totalDebited: totalDebit,
        status: 'completed',
        date: new Date().toISOString(),
      },
      balances: {
        checking: updatedUser?.checkingBalance || 0,
        savings: updatedUser?.savingsBalance || 0,
        investment: updatedUser?.investmentBalance || 0,
      },
      cryptoBalance: updatedWallet?.balances.find((b: any) => b.symbol === cryptoSymbol),
    });

  } catch (error: any) {
    console.error('[Crypto Convert] Error:', error);
    return NextResponse.json({ success: false, error: 'Conversion failed' }, { status: 500 });
  }
}
