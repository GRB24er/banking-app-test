import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import CryptoWallet from '@/models/CryptoWallet';
import CryptoTransaction from '@/models/CryptoTransaction';
import { getCryptoPrice, NETWORK_OPTIONS } from '@/lib/cryptoPrices';
import { sendTransactionEmail } from '@/lib/mail';

export async function POST(request: NextRequest) {
  try {
    console.log('[Crypto Send] POST');

    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { cryptoCurrency, amount, walletAddress, network, memo } = body;

    // Validation
    if (!cryptoCurrency) {
      return NextResponse.json({ success: false, error: 'Cryptocurrency is required' }, { status: 400 });
    }

    const cryptoSymbol = cryptoCurrency.toUpperCase();
    const networks = NETWORK_OPTIONS[cryptoSymbol];
    
    if (!networks) {
      return NextResponse.json({ success: false, error: 'Unsupported cryptocurrency' }, { status: 400 });
    }

    if (!walletAddress?.trim()) {
      return NextResponse.json({ success: false, error: 'Wallet address is required' }, { status: 400 });
    }

    if (!network || !networks.includes(network)) {
      return NextResponse.json({ success: false, error: 'Invalid network selected' }, { status: 400 });
    }

    const sendAmount = typeof amount === 'string' 
      ? parseFloat(amount.replace(/[^0-9.-]/g, '')) 
      : Number(amount);

    if (isNaN(sendAmount) || sendAmount <= 0) {
      return NextResponse.json({ success: false, error: 'Invalid amount' }, { status: 400 });
    }

    await connectDB();

    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    // Get wallet
    const wallet = await CryptoWallet.findOne({ userId: user._id });
    if (!wallet) {
      return NextResponse.json({ success: false, error: 'Crypto wallet not found' }, { status: 404 });
    }

    // Check balance
    const balanceEntry = wallet.balances.find((b: any) => b.symbol === cryptoSymbol);
    if (!balanceEntry) {
      return NextResponse.json({ success: false, error: `No ${cryptoSymbol} balance found` }, { status: 400 });
    }

    const availableBalance = balanceEntry.balance - balanceEntry.lockedBalance;
    
    // Calculate network fee
    const networkFees: Record<string, number> = {
      BTC: 0.0001, ETH: 0.002, USDT: 1, USDC: 1, BNB: 0.001, XRP: 0.1, SOL: 0.01, ADA: 0.5
    };
    const networkFee = networkFees[cryptoSymbol] || 0.001;
    const totalRequired = sendAmount + networkFee;

    if (totalRequired > availableBalance) {
      return NextResponse.json({ 
        success: false, 
        error: 'Insufficient crypto balance',
        available: availableBalance,
        required: totalRequired,
        networkFee,
      }, { status: 400 });
    }

    // Get current price for USD value
    const cryptoPrice = await getCryptoPrice(cryptoSymbol);
    const usdValue = sendAmount * cryptoPrice;

    // Generate reference
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    const reference = `CSND-${timestamp}-${random}`;

    // Lock the crypto amount (will be deducted after admin approval)
    const balanceIndex = wallet.balances.findIndex((b: any) => b.symbol === cryptoSymbol);
    wallet.balances[balanceIndex].lockedBalance += totalRequired;
    await wallet.save();

    // Create pending transaction
    await CryptoTransaction.create({
      userId: user._id,
      type: 'send',
      status: 'pending_approval',
      cryptoCurrency: cryptoSymbol,
      cryptoAmount: sendAmount,
      walletAddress: walletAddress.trim(),
      network,
      fee: networkFee,
      reference,
      description: `Send ${sendAmount} ${cryptoSymbol} to ${walletAddress.slice(0, 8)}...${walletAddress.slice(-6)}`,
      metadata: {
        usdValue,
        cryptoPrice,
        totalWithFee: totalRequired,
        memo: memo || null,
      }
    });

    // Send email notification to user
    try {
      await sendTransactionEmail(user.email, {
        name: user.name || 'Customer',
        transaction: {
          type: 'Crypto Transfer',
          amount: sendAmount,
          currency: cryptoSymbol,
          description: `Transfer to ${walletAddress.slice(0, 12)}...`,
          reference,
          status: 'Pending Approval',
          network,
        },
        subject: 'Crypto Transfer Initiated - Pending Approval'
      });
    } catch (emailError) {
      console.error('[Crypto Send] Email failed:', emailError);
    }

    console.log('[Crypto Send] Created pending transfer:', reference);

    return NextResponse.json({
      success: true,
      message: 'Crypto transfer submitted for approval',
      reference,
      transfer: {
        cryptoCurrency: cryptoSymbol,
        amount: sendAmount,
        networkFee,
        totalAmount: totalRequired,
        usdValue,
        walletAddress: `${walletAddress.slice(0, 12)}...${walletAddress.slice(-8)}`,
        network,
        status: 'pending_approval',
        date: new Date().toISOString(),
      },
    });

  } catch (error: any) {
    console.error('[Crypto Send] Error:', error);
    return NextResponse.json({ success: false, error: 'Transfer failed' }, { status: 500 });
  }
}

// GET - Get send history
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    const transactions = await CryptoTransaction.find({
      userId: user._id,
      type: 'send'
    }).sort({ createdAt: -1 }).limit(20);

    return NextResponse.json({
      success: true,
      transactions: transactions.map(t => ({
        id: t._id.toString(),
        reference: t.reference,
        cryptoCurrency: t.cryptoCurrency,
        amount: t.cryptoAmount,
        walletAddress: t.walletAddress,
        network: t.network,
        fee: t.fee,
        status: t.status,
        usdValue: t.metadata?.usdValue,
        date: t.createdAt,
      }))
    });

  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch transfers' }, { status: 500 });
  }
}
