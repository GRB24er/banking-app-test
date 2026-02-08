import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import CryptoWallet from '@/models/CryptoWallet';
import CryptoTransaction from '@/models/CryptoTransaction';
import { sendTransactionEmail } from '@/lib/mail';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    // Check if user is admin
    const adminUser = await User.findOne({ email: session.user.email });
    if (!adminUser?.isAdmin) {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
    }

    const { transactionId, action, rejectionReason, txHash } = await request.json();

    if (!transactionId || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ success: false, error: 'Invalid request' }, { status: 400 });
    }

    const transaction = await CryptoTransaction.findById(transactionId);
    if (!transaction) {
      return NextResponse.json({ success: false, error: 'Transaction not found' }, { status: 404 });
    }

    if (transaction.status !== 'pending_approval') {
      return NextResponse.json({ success: false, error: 'Transaction already processed' }, { status: 400 });
    }

    const user = await User.findById(transaction.userId);
    const wallet = await CryptoWallet.findOne({ userId: transaction.userId });

    if (!user || !wallet) {
      return NextResponse.json({ success: false, error: 'User or wallet not found' }, { status: 404 });
    }

    if (action === 'approve') {
      // Deduct from locked balance and actual balance
      const balanceIndex = wallet.balances.findIndex((b: any) => b.symbol === transaction.cryptoCurrency);
      
      if (balanceIndex >= 0) {
        const totalAmount = transaction.cryptoAmount + transaction.fee;
        wallet.balances[balanceIndex].balance -= totalAmount;
        wallet.balances[balanceIndex].lockedBalance -= totalAmount;
        await wallet.save();
      }

      // Update transaction
      transaction.status = 'completed';
      transaction.approvedBy = adminUser._id;
      transaction.approvedAt = new Date();
      if (txHash) transaction.txHash = txHash;
      await transaction.save();

      // Send approval email
      try {
        await sendTransactionEmail(user.email, {
          name: user.name || 'Customer',
          transaction: {
            type: 'Crypto Transfer',
            amount: transaction.cryptoAmount,
            currency: transaction.cryptoCurrency,
            description: `Transfer to ${transaction.walletAddress?.slice(0, 12)}...`,
            reference: transaction.reference,
            status: 'Completed',
            txHash: txHash || 'Processing on blockchain',
          },
          subject: 'Crypto Transfer Approved and Completed'
        });
      } catch (emailError) {
        console.error('Email failed:', emailError);
      }

      return NextResponse.json({
        success: true,
        message: 'Transaction approved and completed',
        transaction: {
          id: transaction._id,
          status: 'completed',
          reference: transaction.reference,
        }
      });

    } else {
      // Reject - unlock the funds
      const balanceIndex = wallet.balances.findIndex((b: any) => b.symbol === transaction.cryptoCurrency);
      
      if (balanceIndex >= 0) {
        const totalAmount = transaction.cryptoAmount + transaction.fee;
        wallet.balances[balanceIndex].lockedBalance -= totalAmount;
        await wallet.save();
      }

      // Update transaction
      transaction.status = 'rejected';
      transaction.approvedBy = adminUser._id;
      transaction.approvedAt = new Date();
      transaction.rejectionReason = rejectionReason || 'Transaction rejected by admin';
      await transaction.save();

      // Send rejection email
      try {
        await sendTransactionEmail(user.email, {
          name: user.name || 'Customer',
          transaction: {
            type: 'Crypto Transfer',
            amount: transaction.cryptoAmount,
            currency: transaction.cryptoCurrency,
            description: `Transfer to ${transaction.walletAddress?.slice(0, 12)}...`,
            reference: transaction.reference,
            status: 'Rejected',
            reason: rejectionReason,
          },
          subject: 'Crypto Transfer Rejected'
        });
      } catch (emailError) {
        console.error('Email failed:', emailError);
      }

      return NextResponse.json({
        success: true,
        message: 'Transaction rejected. Funds have been unlocked.',
        transaction: {
          id: transaction._id,
          status: 'rejected',
          reference: transaction.reference,
        }
      });
    }

  } catch (error: any) {
    console.error('[Admin Crypto Approve] Error:', error);
    return NextResponse.json({ success: false, error: 'Failed to process request' }, { status: 500 });
  }
}
