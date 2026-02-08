import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import CryptoWallet from '@/models/CryptoWallet';
import CryptoTransaction from '@/models/CryptoTransaction';
import { getCryptoPrice, convertUsdToCrypto, SUPPORTED_CRYPTOS } from '@/lib/cryptoPrices';
import { sendTransactionEmail } from '@/lib/mail';

export async function POST(request: NextRequest) {
  try {
    console.log('[Crypto Convert] POST');

    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
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

    const user = await User.findOne({ email: session.user.email });
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
    let wallet = await CryptoWallet.findOne({ userId: user._id });
    if (!wallet) {
      wallet = await CryptoWallet.create({ userId: user._id });
    }

    // Deduct USD from bank account
    await User.findByIdAndUpdate(user._id, {
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
    await CryptoTransaction.create({
      userId: user._id,
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
    const updatedUser = await User.findById(user._id);

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
    });

  } catch (error: any) {
    console.error('[Crypto Convert] Error:', error);
    return NextResponse.json({ success: false, error: 'Conversion failed' }, { status: 500 });
  }
}