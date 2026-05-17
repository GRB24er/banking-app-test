// src/app/api/transfers/wire/route.ts
// ALL TRANSFERS REQUIRE ADMIN APPROVAL
// Creates PENDING transactions - balances update ONLY when admin approves

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import Transaction from "@/models/Transaction";
import { sendTransactionEmail, sendAdminTransferNotification } from "@/lib/mail";
import { moneyGuard } from "@/lib/moneyGuard";
import { validateABA } from "@/lib/bankingCodes";

interface WireTransferRequest {
  fromAccount: 'checking' | 'savings' | 'investment';
  recipientName: string;
  recipientAccount: string;
  recipientBank: string;
  recipientRoutingNumber: string;
  recipientBankAddress: string;
  recipientBankCity?: string;
  amount: number | string;
  description?: string;
  wireType: 'domestic' | 'international';
  recipientAddress?: string;
  recipientCity?: string;
  recipientState?: string;
  recipientPostalCode?: string;
  recipientCountry?: string;
  purposeOfTransfer?: string;
  urgentTransfer?: boolean;
  // Country-aware bank identifiers
  swiftCode?: string;
  iban?: string;
  sortCode?: string;
  accountType?: string;
  // Country-specific identifiers (transit/institution, IFSC, CLABE, BSB, NUBAN, etc.)
  extraBankFields?: Record<string, string>;
}

export async function POST(request: NextRequest) {
  try {
    console.log('🏦 Wire transfer initiated');
    
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: "Unauthorized - Please login" },
        { status: 401 }
      );
    }

    const body: WireTransferRequest = await request.json();
    console.log('📥 Wire transfer request:', {
      fromAccount: body.fromAccount,
      recipientName: body.recipientName,
      amount: body.amount,
      wireType: body.wireType,
      urgentTransfer: body.urgentTransfer,
      userEmail: session.user.email
    });
    
    const {
      fromAccount,
      recipientName,
      recipientAccount,
      recipientBank,
      recipientRoutingNumber,
      recipientBankAddress,
      recipientBankCity,
      recipientAddress,
      recipientCity,
      recipientState,
      recipientPostalCode,
      recipientCountry,
      amount,
      description,
      wireType,
      purposeOfTransfer,
      urgentTransfer = false,
      swiftCode = '',
      iban = '',
      sortCode = '',
      accountType = '',
      extraBankFields = {},
    } = body;

    // Validation — country-aware
    const missingFields = [];
    const ACCOUNT_EQUIVALENTS = ['clabe', 'nuban', 'cbu', 'nzAccountFormatted', 'rib', 'cci'];
    const hasAccountEquivalent = Object.entries(extraBankFields || {}).some(
      ([k, v]) => ACCOUNT_EQUIVALENTS.includes(k) && String(v || '').trim().length > 0
    );
    const hasIban = !!iban && String(iban).trim().length > 0;
    const isDomesticUS = wireType === 'domestic';

    if (!fromAccount) missingFields.push('fromAccount');
    if (!recipientName?.trim()) missingFields.push('recipientName');
    if (!recipientBank?.trim()) missingFields.push('recipientBank');
    if (!recipientBankAddress?.trim()) missingFields.push('recipientBankAddress');
    if (!amount) missingFields.push('amount');
    if (!recipientAddress?.trim()) missingFields.push('recipientAddress');
    if (!purposeOfTransfer?.trim()) missingFields.push('purposeOfTransfer');

    // Account number required only when nothing else identifies the account
    if (!recipientAccount?.trim() && !hasIban && !hasAccountEquivalent) {
      missingFields.push('recipientAccount');
    }
    // Routing number only required for US domestic
    if (isDomesticUS && !recipientRoutingNumber?.trim()) {
      missingFields.push('recipientRoutingNumber');
    }
    // SWIFT required for everything except US domestic
    if (!isDomesticUS && !swiftCode?.trim()) {
      missingFields.push('swiftCode');
    }

    if (missingFields.length > 0) {
      return NextResponse.json(
        { 
          success: false,
          error: `Missing required fields: ${missingFields.join(', ')}`,
          missingFields 
        },
        { status: 400 }
      );
    }

    const transferAmount = Math.abs(
      typeof amount === 'string' 
        ? parseFloat(amount.replace(/[^0-9.-]/g, '')) 
        : Number(amount)
    );

    if (isNaN(transferAmount) || transferAmount <= 0) {
      return NextResponse.json(
        { success: false, error: "Invalid amount" },
        { status: 400 }
      );
    }

    // Wire transfer limits
    if (transferAmount < 100) {
      return NextResponse.json(
        { success: false, error: "Minimum wire transfer amount is $100.00" },
        { status: 400 }
      );
    }

    if (transferAmount > 250000) {
      return NextResponse.json(
        { success: false, error: "Wire transfers over $250,000 require additional approval. Please contact support." },
        { status: 400 }
      );
    }

    // Calculate fees
    let wireFee = wireType === 'international' ? 45 : 30;
    if (urgentTransfer) wireFee += 25;

    const totalAmount = transferAmount + wireFee;
    const estimatedCompletion = urgentTransfer ? 'Same business day (urgent)' : 'Same business day';

    console.log('💸 Wire transfer details:', {
      transferAmount,
      wireFee,
      totalAmount,
      wireType,
      urgentTransfer,
      estimatedCompletion
    });

    await connectDB();
    console.log('🗄️ Database connected');

    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json(
        { success: false, error: "User account not found" },
        { status: 404 }
      );
    }

    // Domestic wires use ABA routing; checksum it before we go further.
    if (wireType === 'domestic' && recipientRoutingNumber) {
      const aba = validateABA(recipientRoutingNumber);
      if (!aba.valid) {
        return NextResponse.json({ success: false, error: aba.reason }, { status: 400 });
      }
    }

    const guard = await moneyGuard({
      req: request,
      userId: String(user._id),
      email: user.email,
      scope: "POST /api/transfers/wire",
      body,
      kycAction: wireType === "international" ? "transfer.wire.international" : "transfer.wire.domestic",
      amount: totalAmount,
      fromAccount,
      recipientName,
      recipientCountry,
      recipientBankCountry: recipientCountry,
    });
    if (!guard.ok) return guard.replay;

    console.log('👤 User found:', user._id);

    const balanceFieldMap: { [key: string]: string } = {
      'checking': 'checkingBalance',
      'savings': 'savingsBalance',
      'investment': 'investmentBalance'
    };

    const fromBalanceField = balanceFieldMap[fromAccount];
    const currentBalance = Number((user as any)[fromBalanceField] || 0);
    
    console.log('💰 Current balance check:', {
      account: fromAccount,
      currentBalance,
      requiredAmount: totalAmount,
      hasSufficientFunds: currentBalance >= totalAmount
    });
    
    // Check sufficient funds (validation only - NOT deducting)
    if (totalAmount > currentBalance) {
      return NextResponse.json(
        { 
          success: false,
          error: "Insufficient funds for wire transfer",
          details: {
            available: currentBalance,
            transferAmount,
            wireFee,
            totalRequired: totalAmount,
            shortfall: totalAmount - currentBalance
          }
        },
        { status: 400 }
      );
    }

    // Generate reference
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    const wireRef = `WIRE-${timestamp}-${random}`;
    
    console.log('🔖 Generated wire reference:', wireRef);

    // =====================================================
    // CREATE PENDING TRANSACTION - NO BALANCE CHANGE YET
    // Admin will approve, then balance updates
    // =====================================================

    const wireTransaction = await Transaction.create({
      userId: user._id,
      type: 'transfer-out',
      currency: 'USD',
      amount: transferAmount,
      description: description?.trim() || `${wireType === 'international' ? 'International' : 'Domestic'} wire transfer to ${recipientName}`,
      status: 'pending', // PENDING - awaits admin approval
      accountType: fromAccount,
      posted: false, // NOT posted
      postedAt: null,
      reference: wireRef,
      channel: 'online',
      origin: 'wire_transfer',
      date: new Date(),
      metadata: {
        wireType,
        recipientName,
        recipientAccount: recipientAccount ? recipientAccount.slice(-4) : '',
        recipientBank,
        recipientRoutingNumber: recipientRoutingNumber ? recipientRoutingNumber.slice(-4) : '',
        recipientBankAddress,
        recipientBankCity: recipientBankCity || '',
        recipientAddress,
        recipientCity: recipientCity || '',
        recipientState: recipientState || '',
        recipientPostalCode: recipientPostalCode || '',
        recipientCountry: recipientCountry || (isDomesticUS ? 'US' : ''),
        purposeOfTransfer,
        urgentTransfer,
        wireFee,
        totalAmount,
        estimatedCompletion,
        // Country-aware identifiers
        swiftCode: swiftCode || '',
        iban: iban ? iban.slice(-4) : '',
        sortCode: sortCode || '',
        accountType: accountType || '',
        // Country-specific identifiers (transit/institution, IFSC, CLABE, BSB, NUBAN, etc.)
        extraBankFields: extraBankFields || {},
      }
    });

    console.log('💾 Wire transaction saved:', wireTransaction._id);

    // Create fee transaction (also pending)
    if (wireFee > 0) {
      await Transaction.create({
        userId: user._id,
        type: 'fee',
        currency: 'USD',
        amount: wireFee,
        description: `Wire transfer fee${urgentTransfer ? ' (urgent)' : ''}`,
        status: 'pending', // PENDING
        accountType: fromAccount,
        posted: false,
        postedAt: null,
        reference: `${wireRef}-FEE`,
        channel: 'online',
        origin: 'wire_transfer',
        date: new Date(),
        metadata: {
          linkedReference: wireRef,
          wireType,
          urgentTransfer
        }
      });
      console.log('💾 Fee transaction saved');
    }

    // =====================================================
    // DO NOT UPDATE BALANCE - Admin approval will do that
    // =====================================================

    console.log('✅ Wire transfer created (pending approval):', {
      reference: wireRef,
      status: 'pending',
      currentBalance // Balance unchanged
    });

    // Send notification email to customer
    try {
      await sendTransactionEmail(user.email, {
        name: user.name || 'Customer',
        transaction: wireTransaction,
        subject: 'Wire Transfer Initiated - Pending Approval'
      });
      console.log('📧 Customer notification email sent');
    } catch (emailError) {
      console.error('❌ Customer email failed:', emailError);
    }

    // Send admin notification with FULL transfer details (for third-party execution)
    try {
      await sendAdminTransferNotification({
        kind: 'wire',
        reference: wireRef,
        submittedAt: new Date(),
        customer: {
          name: user.name,
          email: user.email,
          userId: String(user._id),
        },
        amount: {
          value: transferAmount,
          currency: 'USD',
          fee: wireFee,
          total: totalAmount,
        },
        fromAccount,
        status: 'pending',
        details: {
          wireType,
          recipientCountry: recipientCountry || (isDomesticUS ? 'US' : ''),
          recipientName,
          recipientAddress,
          recipientCity: recipientCity || '',
          recipientState: recipientState || '',
          recipientPostalCode: recipientPostalCode || '',
          recipientBank,
          recipientBankAddress,
          recipientBankCity: recipientBankCity || '',
          // Bank identifiers — admin sees the FULL values, no masking
          recipientAccount,
          swiftCode: swiftCode || '',
          iban: iban || '',
          sortCode: sortCode || '',
          recipientRoutingNumber: recipientRoutingNumber || '',
          accountType: accountType || '',
          // Country-specific identifiers (transit/institution, IFSC, BSB, CLABE, NUBAN, etc.)
          ...(extraBankFields || {}),
          purposeOfTransfer,
          urgentTransfer,
          estimatedCompletion,
          description: description?.trim() || '',
        },
      });
      console.log('📧 Admin notification email sent');
    } catch (adminEmailError) {
      console.error('❌ Admin email failed:', adminEmailError);
    }

    return NextResponse.json({
      success: true,
      message: `${wireType === 'international' ? 'International' : 'Domestic'} wire transfer initiated. Awaiting admin approval.`,
      wireReference: wireRef,
      transfer: {
        type: 'wire',
        wireType,
        from: fromAccount,
        to: {
          name: recipientName,
          account: `****${recipientAccount.slice(-4)}`,
          bank: recipientBank,
          routingNumber: `****${recipientRoutingNumber.slice(-4)}`,
          address: recipientBankAddress
        },
        recipient: {
          name: recipientName,
          address: recipientAddress
        },
        amount: transferAmount,
        fee: wireFee,
        total: totalAmount,
        description: description || `${wireType === 'international' ? 'International' : 'Domestic'} Wire Transfer`,
        reference: wireRef,
        status: 'pending',
        estimatedCompletion,
        urgentTransfer,
        purposeOfTransfer,
        date: new Date().toISOString()
      },
      // Balance NOT changed yet
      currentBalance
    }, { status: 200 });

  } catch (error: any) {
    console.error('💥 Wire transfer error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: "An unexpected error occurred with wire transfer. Please try again.",
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

// GET - Fetch wire transfer history
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const wireType = searchParams.get('wireType');

    const query: any = {
      userId: user._id,
      type: 'transfer-out',
      origin: 'wire_transfer'
    };

    if (wireType) {
      query['metadata.wireType'] = wireType;
    }

    const wireTransfers = await Transaction.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    const wireHistory = wireTransfers.map((tx: any) => ({
      id: tx._id.toString(),
      reference: tx.reference,
      date: tx.date || tx.createdAt,
      amount: tx.amount,
      fee: tx.metadata?.wireFee || 0,
      total: tx.amount + (tx.metadata?.wireFee || 0),
      fromAccount: tx.accountType,
      wireType: tx.metadata?.wireType || 'domestic',
      recipient: {
        name: tx.metadata?.recipientName || 'Unknown',
        account: `****${tx.metadata?.recipientAccount || '****'}`,
        bank: tx.metadata?.recipientBank || 'Unknown Bank'
      },
      status: tx.status,
      urgentTransfer: tx.metadata?.urgentTransfer || false,
      description: tx.description,
      posted: tx.posted
    }));

    return NextResponse.json({
      success: true,
      wireTransfers: wireHistory,
      total: wireHistory.length,
      currentBalances: {
        checking: user.checkingBalance || 0,
        savings: user.savingsBalance || 0,
        investment: user.investmentBalance || 0
      }
    });

  } catch (error: any) {
    console.error('Get wire transfers error:', error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch wire transfer history" },
      { status: 500 }
    );
  }
}