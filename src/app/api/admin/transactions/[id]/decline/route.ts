// src/app/api/admin/transactions/[id]/reject/route.ts
import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import Transaction from '@/models/Transaction';
import { sendTransactionRejectionEmail } from '@/lib/mail';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    
    // Get the transaction ID from params
    const { id: transactionId } = await params;
    const body = await req.json();
    
    const { 
      reason,
      adminNotes,
      adminId 
    } = body;
    
    // Find the transaction to reject
    const transaction = await Transaction.findById(transactionId);
    
    if (!transaction) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      );
    }
    
    // Check if already processed
    if (transaction.status !== 'pending') {
      return NextResponse.json(
        { error: `Transaction already ${transaction.status}` },
        { status: 400 }
      );
    }
    
    // Find the user for this transaction
    const user = await User.findById(transaction.userId);
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found for this transaction' },
        { status: 404 }
      );
    }
    
    // Update transaction to rejected
    transaction.status = 'rejected';
    transaction.rejectedBy = adminId || 'admin';
    transaction.rejectedAt = new Date();
    transaction.rejectionReason = reason || 'Administrative review';
    transaction.adminNotes = adminNotes;
    await transaction.save();
    
    // Send rejection email
    if (user.email) {
      try {
        await sendTransactionRejectionEmail(user.email, {
          name: user.name,
          transaction: transaction,
          declineReason: reason || adminNotes || 'Administrative review',
        });
      } catch (emailError) {
        console.error('Failed to send rejection email:', emailError);
        // Continue even if email fails
      }
    }
    
    return NextResponse.json({
      success: true,
      message: 'Transaction rejected successfully',
      transaction: {
        _id: transaction._id,
        status: 'rejected',
        rejectedAt: transaction.rejectedAt,
        rejectionReason: transaction.rejectionReason,
        type: transaction.type,
        amount: transaction.amount
      }
    });
    
  } catch (error: any) {
    console.error('Rejection error:', error);
    return NextResponse.json(
      { error: 'Failed to reject transaction', details: error.message },
      { status: 500 }
    );
  }
}

// GET endpoint to check if transaction can be rejected
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    
    const { id: transactionId } = await params;
    
    const transaction = await Transaction.findById(transactionId)
      .populate('userId', 'name email accountNumber');
    
    if (!transaction) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      canReject: transaction.status === 'pending',
      transaction: {
        _id: transaction._id,
        status: transaction.status,
        amount: transaction.amount,
        type: transaction.type,
        date: transaction.date,
        user: transaction.userId
      }
    });
    
  } catch (error) {
    console.error('Error fetching transaction:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transaction details' },
      { status: 500 }
    );
  }
}