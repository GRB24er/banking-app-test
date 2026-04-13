// src/app/api/cron/ach-settlement/route.ts
// ACH Settlement Simulation - Advances external transfer statuses over time
// Initiated → Processing (after 1 day) → Settled/Completed (after 2-3 days)
import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Transaction from '@/models/Transaction';
import User from '@/models/User';

function isCreditType(type: string): boolean {
  return ['deposit', 'transfer-in', 'interest', 'adjustment-credit'].includes(type);
}

function isDebitType(type: string): boolean {
  return ['withdraw', 'transfer-out', 'fee', 'adjustment-debit'].includes(type);
}

function getBalanceField(accountType: string): string {
  if (accountType === 'savings') return 'savingsBalance';
  if (accountType === 'investment') return 'investmentBalance';
  return 'checkingBalance';
}

export async function POST(req: NextRequest) {
  try {
    // Verify cron secret in production
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const now = new Date();
    let processedCount = 0;
    let settledCount = 0;
    let errors: string[] = [];

    // STEP 1: Move "initiated" → "processing" (after 1 day)
    // Find external transfers that have been in "initiated" status for > 24 hours
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const initiatedTransfers = await Transaction.find({
      status: 'initiated',
      origin: { $in: ['external_transfer', 'wire_transfer', 'international_transfer'] },
      createdAt: { $lte: oneDayAgo },
    });

    for (const tx of initiatedTransfers) {
      try {
        tx.status = 'processing';
        tx.metadata = {
          ...tx.metadata,
          achStatus: 'processing',
          achProcessingStartedAt: now.toISOString(),
        };
        await tx.save();
        processedCount++;
      } catch (err: any) {
        errors.push(`Failed to process ${tx._id}: ${err.message}`);
      }
    }

    // STEP 2: Move "processing" → "completed" (after 2 more days = 3 total)
    // Find external transfers that have been in "processing" for > 48 hours
    const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);
    const processingTransfers = await Transaction.find({
      status: 'processing',
      origin: { $in: ['external_transfer', 'wire_transfer', 'international_transfer'] },
      'metadata.achProcessingStartedAt': { $exists: true },
    });

    for (const tx of processingTransfers) {
      try {
        const processingStart = new Date(tx.metadata?.achProcessingStartedAt);
        if (processingStart > twoDaysAgo) {
          continue; // Not old enough yet
        }

        // For wire transfers, settle faster (same day if express)
        const transferSpeed = tx.metadata?.transferSpeed;
        if (tx.origin === 'wire_transfer' && transferSpeed === 'wire') {
          // Wires settle in processing for just 1 day
          const oneDayAfterProcessing = new Date(processingStart.getTime() + 24 * 60 * 60 * 1000);
          if (now < oneDayAfterProcessing) continue;
        }

        // Settle the transaction - deduct from user balance
        const user = await User.findById(tx.userId);
        if (!user) {
          errors.push(`User not found for tx ${tx._id}`);
          continue;
        }

        const balanceField = getBalanceField(tx.accountType);
        const currentBalance = (user as any)[balanceField] || 0;

        if (isDebitType(tx.type) && currentBalance < tx.amount) {
          // Insufficient funds at settlement time - reject
          tx.status = 'rejected';
          tx.metadata = {
            ...tx.metadata,
            achStatus: 'returned',
            achReturnReason: 'Insufficient funds at settlement',
            achSettledAt: now.toISOString(),
          };
          await tx.save();
          errors.push(`Insufficient funds for tx ${tx._id} - ACH returned`);
          continue;
        }

        // Update balance
        if (isDebitType(tx.type)) {
          (user as any)[balanceField] = currentBalance - tx.amount;
        } else if (isCreditType(tx.type)) {
          (user as any)[balanceField] = currentBalance + tx.amount;
        }
        await user.save();

        // Mark as completed
        tx.status = 'completed';
        tx.posted = true;
        tx.postedAt = now;
        tx.metadata = {
          ...tx.metadata,
          achStatus: 'settled',
          achSettledAt: now.toISOString(),
        };
        await tx.save();
        settledCount++;
      } catch (err: any) {
        errors.push(`Failed to settle ${tx._id}: ${err.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      processed: processedCount,
      settled: settledCount,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    console.error('ACH Settlement cron error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'ACH settlement failed' },
      { status: 500 }
    );
  }
}
