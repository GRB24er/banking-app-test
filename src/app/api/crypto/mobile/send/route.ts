import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import CryptoWallet from '@/models/CryptoWallet';
import CryptoTransaction from '@/models/CryptoTransaction';
import { getCryptoPrice, NETWORK_OPTIONS } from '@/lib/cryptoPrices';
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
    console.log('[Crypto Send] POST');

    const decoded = await verifyToken(request);
    if (!decoded) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { cryptoCurrency, amount, walletAddress, network } = body;

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

    const user = await User.findById(decoded.userId);
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    // Get wallet
    const wallet = await CryptoWallet.findOne({ userId: decoded.userId });
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
    const networkFee = cryptoSymbol === 'BTC' ? 0.0001 : 
                       cryptoSymbol === 'ETH' ? 0.002 : 
                       0.001;
    
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
    const transaction = await CryptoTransaction.create({
      userId: decoded.userId,
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
      message: 'Crypto transfer initiated. Pending admin approval.',
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

// Get send history
export async function GET(request: NextRequest) {
  try {
    const decoded = await verifyToken(request);
    if (!decoded) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const transactions = await CryptoTransaction.find({
      userId: decoded.userId,
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
