// src/app/api/admin/transactions/[id]/approve/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import Transaction from '@/models/Transaction';
import mongoose from 'mongoose';
import { postPendingTransfer } from '@/lib/transferEngine';
import { audit, actorContext } from '@/lib/audit';

// Credit types - ADD money
const CREDIT_TYPES = ['deposit', 'transfer-in', 'interest', 'adjustment-credit'];

// Debit types - REMOVE money  
const DEBIT_TYPES = ['withdraw', 'withdrawal', 'transfer-out', 'fee', 'adjustment-debit', 'payment', 'charge', 'purchase'];

function isCredit(type: string): boolean {
  return CREDIT_TYPES.includes(type);
}

function isDebit(type: string): boolean {
  return DEBIT_TYPES.includes(type);
}

function getBalanceField(accountType: string): string {
  if (accountType === 'savings') return 'savingsBalance';
  if (accountType === 'investment') return 'investmentBalance';
  return 'checkingBalance';
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log('═══════════════════════════════════════');
  console.log('[APPROVE] Starting approval process');
  console.log('═══════════════════════════════════════');

  try {
    const { id } = params;
    
    console.log('[APPROVE] Transaction ID:', id);

    // Validate transaction ID
    if (!id) {
      console.log('[APPROVE] ❌ No transaction ID provided');
      return NextResponse.json(
        { error: 'Transaction ID is required' },
        { status: 400 }
      );
    }

    // Check if valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      console.log('[APPROVE] ❌ Invalid transaction ID format');
      return NextResponse.json(
        { error: 'Invalid transaction ID format' },
        { status: 400 }
      );
    }

    await connectDB();
    console.log('[APPROVE] Database connected');

    // Find the transaction
    const transaction = await Transaction.findById(id);
    
    if (!transaction) {
      console.log('[APPROVE] ❌ Transaction not found');
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      );
    }

    console.log('[APPROVE] Found transaction:', {
      id: transaction._id,
      type: transaction.type,
      amount: transaction.amount,
      status: transaction.status,
      accountType: transaction.accountType,
      userId: transaction.userId
    });

    // Check if already approved/completed
    if (transaction.status === 'approved' || transaction.status === 'completed') {
      console.log('[APPROVE] ⚠️ Transaction already approved');
      return NextResponse.json(
        { error: 'Transaction is already approved', status: transaction.status },
        { status: 400 }
      );
    }

    // Find the user
    const user = await User.findById(transaction.userId);
    
    if (!user) {
      console.log('[APPROVE] ❌ User not found for transaction');
      return NextResponse.json(
        { error: 'User not found for this transaction' },
        { status: 404 }
      );
    }

    console.log('[APPROVE] Found user:', user.name, user.email);

    // ─── new-flow path ───────────────────────────────────────────────
    // Transactions created by the gated transfer routes carry both
    // amountMinor (bigint-safe) and transactionGroup. Commit them via
    // the ledger so balances are derived from the journal — never from
    // a possibly-stale `transaction.amount` Number field.
    if (transaction.amountMinor && transaction.transactionGroup && !transaction.ledgerPosted) {
      const session = await getServerSession(authOptions);
      const approverId = String((session as any)?.user?.id ?? (req.headers.get('x-actor-id') ?? user._id));
      const ctx = actorContext(req);

      try {
        await postPendingTransfer(String(transaction._id), approverId);
      } catch (err: any) {
        console.error('[APPROVE] ledger post failed:', err?.message);
        return NextResponse.json({ error: 'Ledger commit failed', detail: err?.message }, { status: 500 });
      }

      await audit({
        actor: { kind: 'admin', id: approverId, email: (session as any)?.user?.email },
        action: 'transaction.approve',
        target: { kind: 'transaction', id: String(transaction._id), reference: transaction.reference },
        outcome: 'success',
        metadata: { amount: transaction.amount, currency: transaction.currency, accountType: transaction.accountType },
        ...ctx,
      });

      const fresh = await User.findById(user._id).select({ checkingBalance: 1, savingsBalance: 1, investmentBalance: 1 }).lean() as any;
      const field = getBalanceField(transaction.accountType || 'checking');
      return NextResponse.json({
        success: true,
        ledgerPosted: true,
        message: `Transaction approved and posted to the ledger.`,
        transaction: {
          _id: transaction._id,
          reference: transaction.reference,
          type: transaction.type,
          amount: transaction.amount,
          status: 'approved',
          accountType: transaction.accountType,
        },
        balance: { field, current: Number(fresh?.[field] ?? 0) },
      });
    }

    // ─── legacy path ─────────────────────────────────────────────────
    // Older transactions without amountMinor/transactionGroup get the
    // original direct-balance-update treatment so nothing in the
    // existing system breaks.
    const balanceField = getBalanceField(transaction.accountType || 'checking');
    const currentBalance = Number(user[balanceField]) || 0;
    const txAmount = Math.abs(Number(transaction.amount));

    console.log('[APPROVE] Balance field:', balanceField);
    console.log('[APPROVE] Current balance:', currentBalance);
    console.log('[APPROVE] Transaction amount:', txAmount);

    // Calculate new balance
    let newBalance = currentBalance;
    
    if (isCredit(transaction.type)) {
      newBalance = currentBalance + txAmount;
      console.log('[APPROVE] CREDIT:', currentBalance, '+', txAmount, '=', newBalance);
    } else if (isDebit(transaction.type)) {
      newBalance = currentBalance - txAmount;
      console.log('[APPROVE] DEBIT:', currentBalance, '-', txAmount, '=', newBalance);
    } else {
      // Default to credit if type not recognized
      newBalance = currentBalance + txAmount;
      console.log('[APPROVE] DEFAULT CREDIT:', currentBalance, '+', txAmount, '=', newBalance);
    }

    // Update user balance
    const userUpdateResult = await User.updateOne(
      { _id: user._id },
      { 
        $set: { 
          [balanceField]: newBalance 
        } 
      }
    );

    console.log('[APPROVE] User balance update result:', userUpdateResult);

    // Update transaction status
    const txUpdateResult = await Transaction.updateOne(
      { _id: transaction._id },
      {
        $set: {
          status: 'approved',
          posted: true,
          postedAt: new Date(),
          approvedAt: new Date()
        }
      }
    );

    console.log('[APPROVE] Transaction update result:', txUpdateResult);

    // Verify the updates
    const verifiedUser = await User.findById(user._id);
    const verifiedTx = await Transaction.findById(transaction._id);

    console.log('[APPROVE] ✅ Verified user balance:', verifiedUser[balanceField]);
    console.log('[APPROVE] ✅ Verified transaction status:', verifiedTx.status);

    console.log('═══════════════════════════════════════');
    console.log('[APPROVE] ✅ APPROVAL COMPLETE');
    console.log('[APPROVE] User:', user.name);
    console.log('[APPROVE] Type:', transaction.type);
    console.log('[APPROVE] Amount:', txAmount);
    console.log('[APPROVE] Balance:', currentBalance, '→', newBalance);
    console.log('═══════════════════════════════════════');

    return NextResponse.json({
      success: true,
      message: `Transaction approved. ${isCredit(transaction.type) ? 'Credited' : 'Debited'} $${txAmount.toLocaleString()} ${isCredit(transaction.type) ? 'to' : 'from'} ${user.name}'s ${transaction.accountType} account.`,
      transaction: {
        _id: transaction._id,
        reference: transaction.reference,
        type: transaction.type,
        amount: txAmount,
        status: 'approved',
        accountType: transaction.accountType
      },
      balance: {
        field: balanceField,
        previous: currentBalance,
        current: newBalance,
        change: isCredit(transaction.type) ? txAmount : -txAmount
      }
    });

  } catch (error: any) {
    console.error('═══════════════════════════════════════');
    console.error('[APPROVE] ❌ ERROR:', error.message);
    console.error('[APPROVE] Stack:', error.stack);
    console.error('═══════════════════════════════════════');

    return NextResponse.json(
      { error: 'Failed to approve transaction', details: error.message },
      { status: 500 }
    );
  }
}